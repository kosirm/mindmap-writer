<template>
  <div
    ref="elementRef"
    class="draggable"
    :class="{
      'is-dragging': isDragging,
      'is-overed': isOvered,
      'is-inferred-title': isInferredTitle
    }"
    :style="{ paddingLeft: `${indentSize}px` }"
  >
    <div
      class="node-wrapper"
      :class="{
        'is-hovered': isHovered,
        'is-highlighted': isHighlighted
      }"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
      @click="handleWrapperClick"
    >
      <!-- Drag handle -->
      <button
        class="drag-handle"
        aria-label="Drag handle"
        @pointerdown="handleDragStart"
        tabindex="0"
      >
        <q-icon name="drag_indicator" size="sm" />
      </button>

      <!-- Node content -->
      <div class="node-content">
        <!-- Title (only for manual titles) -->
        <div v-if="!isInferredTitle" class="title-wrapper">
          <!-- Static HTML (when not editing) -->
          <div
            v-if="!isTitleEditing"
            class="node-title"
            v-html="displayTitle"
            @click.stop="() => handleTitleClick()"
          ></div>

          <!-- Tiptap Editor (when editing) -->
          <EditorContent
            v-else-if="titleEditor"
            :editor="titleEditor"
            class="node-title"
            @click.stop
          />
        </div>

        <!-- Content (always shown for inferred titles, conditionally for manual titles) -->
        <div v-if="isInferredTitle || hasContent || isContentEditing" class="content-wrapper">
          <!-- Static HTML (when not editing) -->
          <div
            v-if="!isContentEditing"
            class="node-body"
            v-html="node.content"
            @click.stop="() => handleContentClick()"
          ></div>

          <!-- Tiptap Editor (when editing) -->
          <EditorContent
            v-else-if="contentEditor"
            :editor="contentEditor"
            class="node-body"
            @click.stop
          />
        </div>
      </div>
    </div>

    <!-- Children slot for recursive nesting -->
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useDraggable } from '@vue-dnd-kit/core';
import { EditorContent, type Editor } from '@tiptap/vue-3';
import type { MindmapNode } from 'src/stores/mindmap';
import { inferTitle, useMindmapStore } from 'src/stores/mindmap';
import { useViewSync } from 'src/composables/useViewSync';
import {
  activeNodeId,
  activeTitleEditor,
  activeContentEditor,
  activeField,
  isFieldActive,
  destroyActiveEditors,
  createTitleEditor,
  createContentEditor,
  fieldNavigationBus,
} from 'src/composables/useFullDocumentEditor';
import { useDocumentNavigation } from 'src/composables/useDocumentNavigation';
import {
  extractInferredTitleText,
  extractInferredTitleLength,
  updateInferredTitleLength,
} from 'src/utils/inferredTitleUtils';

const props = defineProps<{
  node: MindmapNode;
  index: number;
  source: MindmapNode[];
  depth: number;
}>();

const store = useMindmapStore();
const isHovered = ref(false);
const isHighlighted = ref(false);

// Flag to prevent infinite loops when updating content from external sources
const isUpdatingFromExternal = ref(false);

// Initialize view sync for Full Document view
const viewSync = useViewSync('full-document');

// Initialize document navigation
const navigation = useDocumentNavigation();

// Check if this node's fields are currently being edited
const isTitleEditing = computed(() => isFieldActive(props.node.id, 'title'));
const isContentEditing = computed(() => isFieldActive(props.node.id, 'content'));

// Unwrap editor refs for template (EditorContent expects Editor, not Ref<Editor>)
const titleEditor = computed(() => activeTitleEditor.value as Editor | null);
const contentEditor = computed(() => activeContentEditor.value as Editor | null);

// Using computed for index and source ensures reactivity
// This is especially important when working with nested trees
const { elementRef, handleDragStart, isDragging, isOvered } = useDraggable({
  data: computed(() => ({
    source: props.source,
    index: props.index,
  })),
});

// Indentation based on depth
const INDENT_SIZE_PER_LEVEL = 5;
const indentSize = computed(() => props.depth * INDENT_SIZE_PER_LEVEL);

// Check if title is inferred
const isInferredTitle = computed(() => {
  return !props.node.title || props.node.title.trim() === '';
});

// Get display title
const displayTitle = computed(() => {
  if (props.node.title && props.node.title.trim() !== '') {
    return props.node.title;
  }

  // Extract inferred title from content HTML (single source of truth)
  const inferredText = extractInferredTitleText(props.node.content);

  if (inferredText) {
    // Wrap in paragraph tags to match expected HTML format
    return `<p><span>${inferredText}</span></p>`;
  }

  // Fallback: infer from content
  return inferTitle(props.node.content);
});

// Check if node has content
const hasContent = computed(() => {
  return props.node.content && props.node.content.trim() !== '';
});

// Mouse event handlers for hover
function handleMouseEnter() {
  isHovered.value = true;
}

function handleMouseLeave() {
  isHovered.value = false;
}

// Click on node wrapper (empty space) - just select the node
function handleWrapperClick(event: MouseEvent) {
  // Only handle clicks on the wrapper itself, not on children
  const target = event.target as HTMLElement;
  if (target.classList.contains('node-wrapper') || target.classList.contains('node-content')) {
    // Select this node (sync to other views)
    viewSync.selectNode(props.node.id, true);
    isHighlighted.value = true;
  }
}

// Helper function to clean up empty content
function cleanupEmptyContent() {
  const node = props.source[props.index];
  if (node) {
    // Check if content is empty (no text content)
    const tmp = document.createElement('div');
    tmp.innerHTML = node.content || '';
    const textContent = tmp.textContent || '';

    if (!textContent.trim()) {
      // Content is empty, remove it
      node.content = '';
      node.updatedAt = new Date();

      // If this is an inferred title node, we need to keep it as inferred
      // (no action needed, just clear content)
    }
  }
}

// Helper function to navigate to a specific field in another node
// This uses the event bus to trigger the appropriate editor
function navigateToField(nodeId: string, field: 'title' | 'content', cursorPosition: 'start' | 'end') {
  // First, select the target node (this will trigger the node to be highlighted)
  viewSync.selectNode(nodeId, true);

  // Then, emit an event for the target node to open the appropriate field
  // We'll use nextTick to ensure the node is rendered and ready
  void nextTick(() => {
    fieldNavigationBus.emit('open-field', { nodeId, field, cursorPosition });
  });
}

// Click on title text - select node + load Tiptap for title
function handleTitleClick() {
  console.log('[FullDocumentDraggable] Title clicked', props.node.id);

  // Select this node
  viewSync.selectNode(props.node.id, true);
  isHighlighted.value = true;

  // If another node was active, destroy its editors
  if (activeNodeId.value !== props.node.id) {
    destroyActiveEditors();
  }

  // If we're switching from content to title in the same node, destroy content editor
  if (activeNodeId.value === props.node.id && activeField.value === 'content') {
    if (activeContentEditor.value) {
      activeContentEditor.value.destroy();
      activeContentEditor.value = null;
    }
  }

  // Set this node as active
  activeNodeId.value = props.node.id;
  activeField.value = 'title';

  // Create Tiptap editor for title (always create if it doesn't exist)
  if (!activeTitleEditor.value) {
    activeTitleEditor.value = createTitleEditor(
      props.node.title || '',
      (html: string) => {
        // Update store on change
        const node = props.source[props.index];
        if (node) {
          node.title = html;
          node.updatedAt = new Date();

          // Clear inferred title when user sets explicit title
          if (html.trim() !== '') {
            delete node.inferredTitle;
          }
        }
      },
      {
        // Handle Enter key - move to content editor
        onEnterKey: () => {
          // Trigger content click to open content editor (cursor at end)
          handleContentClick(false);
        },
        // Handle Right arrow at end of title - navigate to next field
        onRightArrowAtEnd: () => {
          console.log('[FullDocumentDraggable] Right arrow at end of title', props.node.id);

          // Check if this node has actual text content (not just HTML tags)
          const hasContent = props.node.content && (() => {
            const tmp = document.createElement('div');
            tmp.innerHTML = props.node.content;
            const textContent = tmp.textContent || '';
            return textContent.trim() !== '';
          })();
          console.log('[FullDocumentDraggable] Has content:', hasContent, 'Content:', props.node.content);

          if (hasContent) {
            // Navigate to content of same node
            console.log('[FullDocumentDraggable] Navigating to content of same node');
            handleContentClick(true);
          } else {
            // Navigate to next field (skip empty content)
            console.log('[FullDocumentDraggable] Skipping empty content, navigating to next field');
            const nextField = navigation.getNextField(props.node.id, 'title');
            console.log('[FullDocumentDraggable] Next field:', nextField);
            if (nextField) {
              navigateToField(nextField.nodeId, nextField.field, 'start');
            }
          }
        },
        // Handle Left arrow at start of title - move to previous field
        onLeftArrowAtStart: () => {
          console.log('[FullDocumentDraggable] Left arrow at start of title', props.node.id);
          const prevField = navigation.getPreviousField(props.node.id, 'title');
          console.log('[FullDocumentDraggable] Previous field from title:', prevField);
          if (prevField) {
            // Navigate to previous field
            if (prevField.field === 'title') {
              // Find the node component and trigger title click
              navigateToField(prevField.nodeId, 'title', 'end');
            } else {
              // Navigate to content
              navigateToField(prevField.nodeId, 'content', 'end');
            }
          } else {
            console.log('[FullDocumentDraggable] No previous field found');
          }
        },
        // Handle Up arrow at first line of title - move to previous field
        onUpArrowAtFirstLine: () => {
          console.log('[FullDocumentDraggable] Up arrow at first line of title', props.node.id);
          const prevField = navigation.getPreviousField(props.node.id, 'title');
          console.log('[FullDocumentDraggable] Previous field from title:', prevField);
          if (prevField) {
            navigateToField(prevField.nodeId, prevField.field, 'end');
          } else {
            console.log('[FullDocumentDraggable] No previous field found');
          }
        },
        // Handle Down arrow at last line of title - move to next field
        onDownArrowAtLastLine: () => {
          console.log('[FullDocumentDraggable] Down arrow at last line of title', props.node.id);

          // Check if this node has content
          const hasContent = props.node.content && (() => {
            const tmp = document.createElement('div');
            tmp.innerHTML = props.node.content;
            const textContent = tmp.textContent || '';
            return textContent.trim() !== '';
          })();

          if (hasContent) {
            // Navigate to content of same node
            console.log('[FullDocumentDraggable] Navigating to content of same node');
            handleContentClick(true);
          } else {
            // Navigate to next field (skip empty content)
            console.log('[FullDocumentDraggable] Skipping empty content, navigating to next field');
            const nextField = navigation.getNextField(props.node.id, 'title');
            console.log('[FullDocumentDraggable] Next field:', nextField);
            if (nextField) {
              navigateToField(nextField.nodeId, nextField.field, 'start');
            }
          }
        }
      }
    );

    // Focus the editor after it's mounted
    void nextTick(() => {
      if (activeTitleEditor.value) {
        // If coming from content (left arrow), place cursor at end
        // Otherwise, place at end by default (normal click behavior)
        activeTitleEditor.value.commands.focus('end');
      }
    });
  }
}

// Click on content text - select node + load Tiptap for content
// cursorAtStart: if true, place cursor at start; if false/undefined, place at end
function handleContentClick(cursorAtStart = false) {
  console.log('[FullDocumentDraggable] Content clicked', {
    nodeId: props.node.id,
    currentContent: props.node.content,
    inferredCharCount: props.node.inferredCharCount,
    isInferredTitle: isInferredTitle.value
  });

  // Select this node
  viewSync.selectNode(props.node.id, true);
  isHighlighted.value = true;

  // If another node was active, destroy its editors
  if (activeNodeId.value !== props.node.id) {
    destroyActiveEditors();
  }

  // If we're switching from title to content in the same node, destroy title editor
  if (activeNodeId.value === props.node.id && activeField.value === 'title') {
    if (activeTitleEditor.value) {
      activeTitleEditor.value.destroy();
      activeTitleEditor.value = null;
    }
  }

  // Set this node as active
  activeNodeId.value = props.node.id;
  activeField.value = 'content';

  // Create Tiptap editor for content (always create if it doesn't exist)
  if (!activeContentEditor.value) {
    console.log('[FullDocumentDraggable] Creating new content editor', {
      nodeId: props.node.id,
      content: props.node.content,
      isInferredTitle: isInferredTitle.value
    });
    const onUpdate = (html: string) => {
      // Skip if we're updating from external source (to prevent infinite loops)
      if (isUpdatingFromExternal.value) {
        return;
      }

      // Update store on change
      const node = props.source[props.index];
      if (node) {
        // Just save the HTML as-is
        // The highlight is applied by the InferredTitleMark extension in real-time
        node.content = html;
        node.updatedAt = new Date();

        // For inferred title nodes, update the inferredCharCount cache
        if (isInferredTitle.value) {
          const highlightLength = extractInferredTitleLength(html);
          if (highlightLength !== null) {
            node.inferredCharCount = highlightLength;
          }
        }
      }
    };

    // For inferred title nodes, include the resize callback
    const options = isInferredTitle.value ? {
      onInferredTitleResize: (newLength: number) => {
        console.log('[FullDocumentDraggable] onInferredTitleResize called', { newLength, nodeId: props.node.id });

        const node = props.source[props.index];
        if (node && activeContentEditor.value) {
          // Get current HTML from editor
          const currentHtml = activeContentEditor.value.getHTML();

          console.log('[FullDocumentDraggable] Current HTML:', currentHtml);

          // Update the highlight length in the content HTML
          const updatedHtml = updateInferredTitleLength(currentHtml, newLength);

          console.log('[FullDocumentDraggable] Updated HTML:', updatedHtml);

          // Update BOTH the content HTML and the inferredCharCount cache
          node.content = updatedHtml;
          node.inferredCharCount = newLength;
          node.updatedAt = new Date();

          // DON'T call setContent here - the InferredTitleMark extension already updated the visual
          // Calling setContent would trigger onUpdate which might interfere
          // The editor already has the correct visual state from the resize operation

          // Trigger reactivity by updating the document
          if (store.currentDocument) {
            store.updateDocument(store.currentDocument);
          }

          console.log('[FullDocumentDraggable] Store updated with new length:', newLength);
        }
      },
      // Handle Left arrow at start of content - move to title or previous field
      onLeftArrowAtStart: () => {
        // Clean up empty content before moving
        cleanupEmptyContent();

        // Try to navigate to previous field
        const prevField = navigation.getPreviousField(props.node.id, 'content');
        if (prevField) {
          // Navigate to previous field
          navigateToField(prevField.nodeId, prevField.field, 'end');
        }
      },
      // Handle Right arrow at end of content - move to next field
      onRightArrowAtEnd: () => {
        console.log('[FullDocumentDraggable] Right arrow at end of content (inferred)', props.node.id);
        const nextField = navigation.getNextField(props.node.id, 'content');
        console.log('[FullDocumentDraggable] Next field from content:', nextField);
        if (nextField) {
          // Navigate to next field
          navigateToField(nextField.nodeId, nextField.field, 'start');
        } else {
          console.log('[FullDocumentDraggable] No next field found');
        }
      },
      // Handle Up arrow at first line of content - move to previous field
      onUpArrowAtFirstLine: () => {
        console.log('[FullDocumentDraggable] Up arrow at first line of content (inferred)', props.node.id);
        // Clean up empty content before moving
        cleanupEmptyContent();

        const prevField = navigation.getPreviousField(props.node.id, 'content');
        console.log('[FullDocumentDraggable] Previous field from content:', prevField);
        if (prevField) {
          navigateToField(prevField.nodeId, prevField.field, 'end');
        } else {
          console.log('[FullDocumentDraggable] No previous field found');
        }
      },
      // Handle Down arrow at last line of content - move to next field
      onDownArrowAtLastLine: () => {
        console.log('[FullDocumentDraggable] Down arrow at last line of content (inferred)', props.node.id);
        const nextField = navigation.getNextField(props.node.id, 'content');
        console.log('[FullDocumentDraggable] Next field from content:', nextField);
        if (nextField) {
          navigateToField(nextField.nodeId, nextField.field, 'start');
        } else {
          console.log('[FullDocumentDraggable] No next field found');
        }
      }
    } : {
      // For manual title nodes, still need arrow handlers
      onLeftArrowAtStart: () => {
        // Clean up empty content before moving
        cleanupEmptyContent();

        // Try to navigate to previous field
        const prevField = navigation.getPreviousField(props.node.id, 'content');
        if (prevField) {
          // Navigate to previous field
          navigateToField(prevField.nodeId, prevField.field, 'end');
        }
      },
      // Handle Right arrow at end of content - move to next field
      onRightArrowAtEnd: () => {
        console.log('[FullDocumentDraggable] Right arrow at end of content (manual)', props.node.id);
        const nextField = navigation.getNextField(props.node.id, 'content');
        console.log('[FullDocumentDraggable] Next field from content:', nextField);
        if (nextField) {
          // Navigate to next field
          navigateToField(nextField.nodeId, nextField.field, 'start');
        } else {
          console.log('[FullDocumentDraggable] No next field found');
        }
      },
      // Handle Up arrow at first line of content - move to previous field
      onUpArrowAtFirstLine: () => {
        console.log('[FullDocumentDraggable] Up arrow at first line of content (manual)', props.node.id);
        // Clean up empty content before moving
        cleanupEmptyContent();

        const prevField = navigation.getPreviousField(props.node.id, 'content');
        console.log('[FullDocumentDraggable] Previous field from content:', prevField);
        if (prevField) {
          navigateToField(prevField.nodeId, prevField.field, 'end');
        } else {
          console.log('[FullDocumentDraggable] No previous field found');
        }
      },
      // Handle Down arrow at last line of content - move to next field
      onDownArrowAtLastLine: () => {
        console.log('[FullDocumentDraggable] Down arrow at last line of content (manual)', props.node.id);
        const nextField = navigation.getNextField(props.node.id, 'content');
        console.log('[FullDocumentDraggable] Next field from content:', nextField);
        if (nextField) {
          navigateToField(nextField.nodeId, nextField.field, 'start');
        } else {
          console.log('[FullDocumentDraggable] No next field found');
        }
      }
    };

    activeContentEditor.value = createContentEditor(
      props.node.content || '',
      isInferredTitle.value,
      onUpdate,
      options
    );

    console.log('[FullDocumentDraggable] Content editor created', {
      nodeId: props.node.id,
      editorHTML: activeContentEditor.value?.getHTML(),
      isInferredTitle: isInferredTitle.value
    });

    // Focus the editor and apply highlight after it's mounted
    void nextTick(() => {
      if (activeContentEditor.value) {
        // For inferred title nodes, apply the highlight mark after editor is mounted
        if (isInferredTitle.value) {
          const highlightLength = extractInferredTitleLength(props.node.content);
          console.log('[FullDocumentDraggable] Applying initial highlight to new editor', {
            nodeId: props.node.id,
            content: props.node.content,
            highlightLength,
            inferredCharCount: props.node.inferredCharCount,
            editorHTML: activeContentEditor.value.getHTML()
          });

          if (highlightLength && highlightLength > 0) {
            activeContentEditor.value.commands.setInferredTitleMark(highlightLength);
            console.log('[FullDocumentDraggable] Initial highlight applied', {
              nodeId: props.node.id,
              highlightLength,
              editorHTMLAfter: activeContentEditor.value.getHTML()
            });
          } else {
            console.warn('[FullDocumentDraggable] No highlight length found in content', {
              nodeId: props.node.id,
              content: props.node.content
            });
          }
        }

        // Focus the editor
        const focusPosition = cursorAtStart ? 'start' : 'end';
        activeContentEditor.value.commands.focus(focusPosition);
      }
    });
  }
}

// Listen to selection events from other views
viewSync.onNodeSelected((event) => {
  // Highlight this node if it matches the selected node
  isHighlighted.value = event.nodeId === props.node.id;

  // Only scroll into view if the selection came from OTHER views (not full-document)
  // This prevents the annoying jump when clicking to edit within Full Document
  if (isHighlighted.value && event.scrollIntoView && event.source !== 'full-document' && elementRef.value) {
    elementRef.value.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
});

// Watch for active node changes to update highlight state and clean up empty content
watch(activeNodeId, (newActiveId, oldActiveId) => {
  // Update highlight state based on whether this is the active node
  // This ensures only one node is highlighted at a time
  if (newActiveId !== props.node.id) {
    isHighlighted.value = false;

    // If this node was previously active and we're switching away, clean up empty content
    if (oldActiveId === props.node.id) {
      cleanupEmptyContent();
    }
  }
});

// Listen for field navigation events
fieldNavigationBus.on('open-field', (event) => {
  // Only handle events for this node
  if (event.nodeId === props.node.id) {
    if (event.field === 'title') {
      // Open title editor
      handleTitleClick();
      // Position cursor after editor is created
      void nextTick(() => {
        if (activeTitleEditor.value) {
          activeTitleEditor.value.commands.focus(event.cursorPosition);
        }
      });
    } else {
      // Open content editor
      // The navigation system only includes content fields that have content,
      // so we can safely open the editor here
      const cursorAtStart = event.cursorPosition === 'start';
      handleContentClick(cursorAtStart);
    }
  }
});

// Watch for content changes from external sources (e.g., Content editor)
// This ensures the Full Document editor stays in sync when content is modified elsewhere
watch(() => props.node.content, (newContent, oldContent) => {
  console.log('[FullDocumentDraggable] Content watcher triggered', {
    nodeId: props.node.id,
    newContent,
    oldContent,
    contentChanged: newContent !== oldContent,
    isContentEditing: isContentEditing.value,
    activeContentEditor: !!activeContentEditor.value,
    activeNodeId: activeNodeId.value,
    activeField: activeField.value,
    isThisNodeActive: activeNodeId.value === props.node.id,
    isInferredTitle: isInferredTitle.value
  });

  // Only update if:
  // 1. This node's content editor is currently active
  // 2. Content actually changed
  // 3. Current editor HTML is different from new content (avoid unnecessary updates)
  if (isContentEditing.value && activeContentEditor.value && newContent !== oldContent) {
    const currentEditorHTML = activeContentEditor.value.getHTML();
    const newContentHTML = newContent || '';

    console.log('[FullDocumentDraggable] Comparing HTML', {
      nodeId: props.node.id,
      currentEditorHTML,
      newContentHTML,
      areEqual: currentEditorHTML === newContentHTML,
      currentHighlightLength: extractInferredTitleLength(currentEditorHTML),
      newHighlightLength: extractInferredTitleLength(newContentHTML)
    });

    if (currentEditorHTML !== newContentHTML) {
      console.log('[FullDocumentDraggable] Updating editor content from external change', {
        nodeId: props.node.id
      });

      // Set flag to prevent onUpdate from triggering (avoid infinite loop)
      isUpdatingFromExternal.value = true;

      // Update the editor content
      activeContentEditor.value.commands.setContent(newContentHTML);

      // For inferred title nodes, apply the highlight mark based on the updated content
      if (isInferredTitle.value) {
        const highlightLength = extractInferredTitleLength(newContentHTML);
        console.log('[FullDocumentDraggable] Checking highlight for inferred title', {
          nodeId: props.node.id,
          highlightLength,
          newContentHTML
        });

        if (highlightLength && highlightLength > 0) {
          console.log('[FullDocumentDraggable] Applying inferred title highlight from watcher', {
            nodeId: props.node.id,
            highlightLength
          });
          activeContentEditor.value.commands.setInferredTitleMark(highlightLength);
        } else {
          console.warn('[FullDocumentDraggable] No highlight length found in new content', {
            nodeId: props.node.id,
            newContentHTML
          });
        }
      }

      // Reset flag
      isUpdatingFromExternal.value = false;
    } else {
      console.log('[FullDocumentDraggable] HTML is the same, skipping update', {
        nodeId: props.node.id
      });
    }
  } else {
    console.log('[FullDocumentDraggable] Watcher conditions not met', {
      nodeId: props.node.id,
      isContentEditing: isContentEditing.value,
      hasActiveEditor: !!activeContentEditor.value,
      contentChanged: newContent !== oldContent
    });
  }
}, { deep: false });
</script>

<style scoped lang="scss">
.draggable {
  border-radius: 4px;
  transition: all 0.2s ease;

  &.is-dragging {
    opacity: 0.5;
  }

  &.is-overed {
    .node-wrapper {
      background-color: rgba(25, 118, 210, 0.1);
      border-color: #1976d2;
    }
  }
}

.node-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid transparent;
  transition: all 0.2s ease;

  &.is-hovered {
    border: 1px solid #e0e0e0;
    background-color: rgba(0, 0, 0, 0.01);

    .drag-handle {
      opacity: 1;
    }
  }

  &.is-highlighted {
    border: 1px solid #1976d2;
    background-color: rgba(25, 118, 210, 0.08);
  }

  // Special styling for inferred title nodes
  .draggable.is-inferred-title &.is-hovered {
    border-color: #f0c674;
    background-color: rgba(240, 198, 116, 0.05);
  }
}

.drag-handle {
  flex-shrink: 0;
  width: 24px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  opacity: 0;
  transition: all 0.2s ease;
  color: #999;
  border-radius: 4px;
  border: none;
  background: transparent;
  padding: 0;

  &:hover {
    color: #1976d2;
    background-color: rgba(25, 118, 210, 0.1);
  }

  &:active {
    cursor: grabbing;
  }
}

.node-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

// Wrapper divs for title and content
.title-wrapper,
.content-wrapper {
  width: 100%;
}

// Shared styles for both static HTML and Tiptap editor
.node-title {
  font-weight: 600;
  font-size: 1.1em;
  color: #333;
  outline: none;
  cursor: text;
  min-height: 1.5em;
  line-height: 1.5;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.15s;

  &:hover {
    background-color: rgba(0, 0, 0, 0.03);
  }

  &:empty:before {
    content: 'Enter title...';
    color: #999;
    font-style: italic;
  }

  // Remove default paragraph margins from static HTML (v-html)
  :deep(p) {
    margin: 0;
    line-height: 1.5;

    // Ensure empty paragraphs still take up space (for line breaks)
    min-height: 1.5em;
  }

  :deep(strong) {
    font-weight: 700;
  }

  :deep(em) {
    font-style: italic;
  }

  // Remove Tiptap's default styles to match static HTML
  :deep(.ProseMirror) {
    outline: none;
    padding: 0;
    min-height: 1.5em;

    p {
      margin: 0;
      line-height: 1.5;
    }

    strong {
      font-weight: 700;
    }

    em {
      font-style: italic;
    }
  }
}

.node-body {
  font-weight: 400;
  font-size: 0.95em;
  color: #666;
  line-height: 1.6;
  outline: none;
  cursor: text;
  min-height: 1.6em;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.15s;

  &:hover {
    background-color: rgba(0, 0, 0, 0.03);
  }

  &:empty:before {
    content: 'Add content...';
    color: #999;
    font-style: italic;
  }

  // Remove default paragraph margins from static HTML (v-html)
  :deep(p) {
    margin: 0;
    line-height: 1.6;

    // Ensure empty paragraphs still take up space (for line breaks)
    min-height: 1.6em;
  }

  :deep(strong) {
    font-weight: 700;
  }

  :deep(em) {
    font-style: italic;
  }

  :deep(br) {
    line-height: 1.6;
  }

  // Remove Tiptap's default styles to match static HTML
  :deep(.ProseMirror) {
    outline: none;
    padding: 0;
    min-height: 1.6em;

    p {
      margin: 0;
      line-height: 1.6;
    }

    strong {
      font-weight: 700;
    }

    em {
      font-style: italic;
    }
  }

  // Inferred title highlight styles (shared with TiptapEditor.vue)
  :deep(.inferred-title-highlight) {
    background-color: rgba(0, 0, 0, 0.04);
    border-bottom: 1px solid rgba(0, 0, 0, 0.15);
    padding: 2px 0;
    position: relative;
    cursor: text;
  }
}
</style>
