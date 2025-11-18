<template>
  <div class="tiptap-editor-container">
    <!-- Show "Select a node" message when in node mode but no node is selected -->
    <div v-if="editorMode === 'node' && !selectedNodeId" class="no-node-selected">
      <q-icon name="article" size="4em" color="grey-5" />
      <div class="text-h6 text-grey-6 q-mt-md">Select a node to start editing</div>
      <div class="text-caption text-grey-5 q-mt-sm">
        Click on a node in the mindmap or tree view to edit its content
      </div>
    </div>

    <!-- Show editor when in full mode or when a node is selected in node mode -->
    <template v-else-if="editor">
      <div class="editor-toolbar">
        <!-- Formatting buttons only -->
        <q-btn
          flat
          dense
          size="sm"
          icon="format_bold"
          :class="{ 'is-active': editor.isActive('bold') }"
          @click="editor.chain().focus().toggleBold().run()"
        >
          <q-tooltip>Bold</q-tooltip>
        </q-btn>
        <q-btn
          flat
          dense
          size="sm"
          icon="format_italic"
          :class="{ 'is-active': editor.isActive('italic') }"
          @click="editor.chain().focus().toggleItalic().run()"
        >
          <q-tooltip>Italic</q-tooltip>
        </q-btn>
        <q-separator vertical inset class="q-mx-sm" />
        <q-btn
          flat
          dense
          size="sm"
          icon="format_list_bulleted"
          :class="{ 'is-active': editor.isActive('bulletList') }"
          @click="editor.chain().focus().toggleBulletList().run()"
        >
          <q-tooltip>Bullet List</q-tooltip>
        </q-btn>
        <q-btn
          flat
          dense
          size="sm"
          icon="format_list_numbered"
          :class="{ 'is-active': editor.isActive('orderedList') }"
          @click="editor.chain().focus().toggleOrderedList().run()"
        >
          <q-tooltip>Numbered List</q-tooltip>
        </q-btn>
      </div>
      <editor-content :editor="editor" class="editor-content" />
    </template>
    <div v-else class="editor-loading">
      <q-spinner color="primary" size="3em" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed, nextTick } from 'vue';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import type { JSONContent } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import type { MindmapNode } from 'stores/mindmap';
import { getDisplayTitle, useMindmapStore } from 'stores/mindmap';
import { useViewSync, globalSelectedNodeId } from 'src/composables/useViewSync';
import { InferredTitleMark } from './TiptapExtensions/InferredTitleMark';
import { MindmapNodeExtension } from './TiptapExtensions/MindmapNodeExtension';
import {
  extractInferredTitleLength,
  updateInferredTitleLength,
} from 'src/utils/inferredTitleUtils';

interface Props {
  modelValue: MindmapNode | null;
  mode?: 'full' | 'node';
}

interface Emits {
  (e: 'update:modelValue', value: MindmapNode): void;
  (e: 'node-selected', nodeId: string): void;
  (e: 'update:node-content', nodeId: string, content: string): void;
  (e: 'update:mode', mode: 'full' | 'node'): void;
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'full'
});
const emit = defineEmits<Emits>();

const store = useMindmapStore();
const isUpdatingFromStore = ref(false);
const editorMode = computed({
  get: () => props.mode,
  set: (value) => emit('update:mode', value)
});
const selectedNodeId = ref<string | null>(null);
const selectedNode = ref<MindmapNode | null>(null);

// Event bus for cross-view synchronization
const viewSync = useViewSync('text');

// Handle resize of inferred title highlight (called on drag END only)
const handleInferredTitleResize = (newLength: number) => {
  console.log('[TiptapEditor] handleInferredTitleResize', {
    newLength,
    selectedNodeId: selectedNodeId.value,
    selectedNode: selectedNode.value
  });

  if (!selectedNode.value || !editor.value) return;

  // Get the current HTML content
  const htmlContent = editor.value.getHTML();

  // Update the highlight length in the content HTML (single source of truth)
  const updatedHtml = updateInferredTitleLength(htmlContent, newLength);

  console.log('[TiptapEditor] Updated inferred title highlight', {
    requestedLength: newLength,
    oldHtml: htmlContent,
    newHtml: updatedHtml
  });

  // Update BOTH the content HTML and the inferredCharCount cache
  selectedNode.value.content = updatedHtml;
  selectedNode.value.inferredCharCount = newLength;
  selectedNode.value.updatedAt = new Date();

  // Update the editor content to reflect the change
  isUpdatingFromStore.value = true;
  editor.value.commands.setContent(updatedHtml);
  isUpdatingFromStore.value = false;

  // Emit update to store
  if (props.modelValue) {
    emit('update:modelValue', props.modelValue);
  }

  // Trigger reactivity by updating the document in the store
  // This ensures the change is reflected in all views (Full Document, Mindmap, etc.)
  if (store.currentDocument) {
    store.updateDocument(store.currentDocument);
  }

  console.log('[TiptapEditor] Updated content with new highlight', {
    nodeId: selectedNode.value.id,
    newContent: selectedNode.value.content,
    newCharCount: selectedNode.value.inferredCharCount
  });
};

// Initialize Tiptap editor
const editor = useEditor({
  extensions: [
    StarterKit,
    Placeholder.configure({
      placeholder: 'Start writing your content here...',
    }),
    InferredTitleMark.configure({
      onResize: handleInferredTitleResize,
    }),
    MindmapNodeExtension, // Custom extension for Full Document mode
  ],
  content: '',
  editorProps: {
    attributes: {
      class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none',
    },
  },
  onUpdate: ({ editor }) => {
    if (isUpdatingFromStore.value) {
      console.log('[TiptapEditor] onUpdate: Skipping - isUpdatingFromStore is true');
      return;
    }

    // Check if we're currently resizing the inferred title mark (visual feedback only)
    if (editor.commands.isResizingInferredTitle()) {
      console.log('[TiptapEditor] onUpdate: Skipping - currently resizing inferred title');
      return;
    }

    if (editorMode.value === 'node' && selectedNodeId.value) {
      // In Node Content mode, emit the content update for the selected node
      const content = editor.getHTML();

      console.log('[TiptapEditor] onUpdate: Node mode - emitting update:node-content', {
        nodeId: selectedNodeId.value,
        htmlContent: content,
        textContent: editor.getText()
      });
      emit('update:node-content', selectedNodeId.value, content);

      // For inferred title nodes, apply highlight as user types
      if (selectedNode.value) {
        // Check if title has actual text content
        let titleHasContent = false;
        if (selectedNode.value.title && selectedNode.value.title.trim() !== '') {
          const tmp = document.createElement('div');
          tmp.innerHTML = selectedNode.value.title;
          const textContent = tmp.textContent || '';
          titleHasContent = textContent.trim() !== '';
        }

        if (!titleHasContent) {
          // Node has empty title - check if highlight already exists
          const currentHighlightLength = extractInferredTitleLength(content);

          console.log('[TiptapEditor] onUpdate: Checking inferred title highlight', {
            currentHighlightLength,
            contentHtml: content
          });

          // Only apply default 20-character highlight if no highlight exists yet
          if (!currentHighlightLength || currentHighlightLength === 0) {
            const plainText = editor.getText();
            const targetLength = Math.min(20, plainText.length);

            console.log('[TiptapEditor] onUpdate: No highlight found, applying default', {
              targetLength,
              plainText
            });

            if (targetLength > 0) {
              // Apply the default highlight mark
              isUpdatingFromStore.value = true;
              editor.commands.setInferredTitleMark(targetLength);
              isUpdatingFromStore.value = false;

              // Update the inferredCharCount cache
              selectedNode.value.inferredCharCount = targetLength;
            }
          } else {
            console.log('[TiptapEditor] onUpdate: Highlight already exists, preserving it', {
              currentHighlightLength
            });
            // Highlight already exists - preserve it (don't recalculate to 20)
          }
        }
      }
    } else if (editorMode.value === 'full') {
      // In Full Document mode, parse and update the entire tree
      // TODO: Parse editor content and update store
      console.log('[TiptapEditor] onUpdate: Full document updated:', editor.getHTML());
    }
  },
});

/**
 * Extract plain text from HTML string
 */
function htmlToText(html: string): string {
  if (!html || html.trim() === '') return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || '';
}

/**
 * Convert MindmapNode tree to Tiptap JSON format for Full Document mode
 * Each node becomes a MindmapNode block with title and content
 */
function convertNodeToTiptapJSON(node: MindmapNode, depth: number = 0): JSONContent[] {
  if (!node) return [];

  const result: JSONContent[] = [];

  // Check if title is inferred
  let titleHasContent = false;
  if (node.title && node.title.trim() !== '') {
    const textContent = htmlToText(node.title);
    titleHasContent = textContent.trim() !== '';
  }
  const isInferredTitle = !titleHasContent;

  // Get display title (explicit or inferred) and extract text
  const displayTitleHtml = getDisplayTitle(node);
  const displayTitle = htmlToText(displayTitleHtml);

  // Create title paragraph
  const titleParagraph: JSONContent = {
    type: 'paragraph',
    content: displayTitle ? [{ type: 'text', text: displayTitle }] : [],
  };

  // Parse content HTML to Tiptap JSON
  const contentParagraphs: JSONContent[] = [];
  if (node.content && node.content.trim() !== '') {
    // Extract text content from HTML
    const textContent = htmlToText(node.content);
    if (textContent.trim() !== '') {
      contentParagraphs.push({
        type: 'paragraph',
        content: [{ type: 'text', text: textContent }],
      });
    }
  }

  // Create the mindmap node block
  const mindmapNodeBlock: JSONContent = {
    type: 'mindmapNode',
    attrs: {
      nodeId: node.id,
      depth: depth,
      isInferredTitle: isInferredTitle,
    },
    content: [titleParagraph, ...contentParagraphs],
  };

  result.push(mindmapNodeBlock);

  // Recursively add children
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      result.push(...convertNodeToTiptapJSON(child, depth + 1));
    }
  }

  return result;
}

/**
 * Convert MindmapNode tree to Tiptap document JSON
 */
function convertNodeTreeToDocument(node: MindmapNode | null): JSONContent {
  if (!node) {
    return {
      type: 'doc',
      content: [],
    };
  }

  return {
    type: 'doc',
    content: convertNodeToTiptapJSON(node, 0),
  };
}

// Helper function to find node by ID
function findNodeById(node: MindmapNode | null, id: string): MindmapNode | null {
  if (!node) return null;
  if (node.id === id) return node;

  if (node.children) {
    for (const child of node.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }

  return null;
}

// Update inferred title highlight
function updateInferredTitleHighlight() {
  if (!editor.value) return;
  if (editorMode.value !== 'node') return;
  if (!selectedNodeId.value) return;

  // IMPORTANT: Always get the LATEST node from the store, not the cached selectedNode.value
  // This ensures we have the most up-to-date title and inferredTitle fields
  const currentNode = findNodeById(props.modelValue, selectedNodeId.value);
  if (!currentNode) return;

  // Check if title has actual text content (not just empty HTML tags)
  let titleHasContent = false;
  if (currentNode.title && currentNode.title.trim() !== '') {
    const tmp = document.createElement('div');
    tmp.innerHTML = currentNode.title;
    const textContent = tmp.textContent || '';
    titleHasContent = textContent.trim() !== '';
  }

  console.log('[TiptapEditor] updateInferredTitleHighlight START', {
    hasEditor: !!editor.value,
    mode: editorMode.value,
    hasSelectedNode: !!currentNode,
    selectedNodeId: currentNode.id,
    selectedNodeTitle: currentNode.title,
    titleHasContent,
    hasInferredTitle: !!currentNode.inferredTitle
  });

  // Set flag to prevent onUpdate from emitting changes
  isUpdatingFromStore.value = true;

  // Only highlight if node has no title content (inferred mode)
  if (titleHasContent) {
    // Node has explicit title - remove highlight
    console.log('[TiptapEditor] Node has explicit title, removing highlight');

    // Check editor state before removal
    const htmlBefore = editor.value.getHTML();
    console.log('[TiptapEditor] Editor HTML before unset:', htmlBefore);

    editor.value.commands.unsetInferredTitleMark();

    // Check editor state after removal
    const htmlAfter = editor.value.getHTML();
    console.log('[TiptapEditor] Editor HTML after unset:', htmlAfter);
    console.log('[TiptapEditor] HTML changed:', htmlBefore !== htmlAfter);

    isUpdatingFromStore.value = false;
    return;
  }

  // Get the HTML content from editor
  const htmlContent = editor.value.getHTML();

  // Extract the highlight length from the content HTML (single source of truth)
  let highlightLength = extractInferredTitleLength(htmlContent);

  if (highlightLength && highlightLength > 0) {
    console.log('[TiptapEditor] Found existing inferred title highlight in content', {
      htmlContent,
      highlightLength
    });

    // Apply the highlight mark based on the length from the content HTML
    editor.value.commands.setInferredTitleMark(highlightLength);
  } else {
    console.log('[TiptapEditor] No inferred title highlight found in content', {
      htmlContent
    });

    // No highlight exists yet - calculate default highlight length
    // Get plain text from content
    const plainText = editor.value.getText();

    // Highlight up to 20 characters (or less if content is shorter)
    highlightLength = Math.min(20, plainText.length);

    console.log('[TiptapEditor] Calculated default inferred title highlight', {
      plainText,
      highlightLength
    });

    // Apply the highlight mark
    if (highlightLength > 0) {
      editor.value.commands.setInferredTitleMark(highlightLength);
    } else {
      editor.value.commands.unsetInferredTitleMark();
    }
  }

  // Reset flag
  isUpdatingFromStore.value = false;

  console.log('[TiptapEditor] updateInferredTitleHighlight END');
}

// Watch for changes from store (Full Document mode)
watch(() => props.modelValue, (newValue) => {
  if (!editor.value || !newValue) return;
  if (editorMode.value !== 'full') return; // Only update in full mode

  isUpdatingFromStore.value = true;
  const docJSON = convertNodeTreeToDocument(newValue);
  editor.value.commands.setContent(docJSON);
  isUpdatingFromStore.value = false;
}, { deep: true });

// Watch for mode changes
watch(editorMode, (newMode, oldMode) => {
  console.log('[TiptapEditor] Mode changed', { oldMode, newMode });

  if (!editor.value) return;

  isUpdatingFromStore.value = true;

  if (newMode === 'full') {
    // Switch to Full Document mode
    console.log('[TiptapEditor] Switching to Full Document mode');
    const docJSON = convertNodeTreeToDocument(props.modelValue);
    editor.value.commands.setContent(docJSON);
    editor.value.setOptions({
      editorProps: {
        attributes: {
          class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none',
        },
      },
    });
  } else if (newMode === 'node') {
    // Switch to Node Content mode
    console.log('[TiptapEditor] Switching to Node Content mode', {
      hasSelectedNode: !!selectedNode.value,
      selectedNodeId: selectedNodeId.value,
      globalSelectedNodeId: globalSelectedNodeId.value,
      selectedNodeTitle: selectedNode.value?.title
    });

    // If no node is selected in Content editor, check the global selected node ID
    if (!selectedNodeId.value && globalSelectedNodeId.value && props.modelValue) {
      console.log('[TiptapEditor] No local node selected, using global selected node', {
        globalSelectedNodeId: globalSelectedNodeId.value
      });
      selectedNodeId.value = globalSelectedNodeId.value;
      selectedNode.value = findNodeById(props.modelValue, globalSelectedNodeId.value);
      console.log('[TiptapEditor] Adopted global selected node', {
        nodeId: selectedNodeId.value,
        found: !!selectedNode.value
      });
    }

    // If we have a selected node ID but no selectedNode ref, try to find it
    if (selectedNodeId.value && !selectedNode.value && props.modelValue) {
      selectedNode.value = findNodeById(props.modelValue, selectedNodeId.value);
      console.log('[TiptapEditor] Found node by ID during mode switch', {
        nodeId: selectedNodeId.value,
        found: !!selectedNode.value
      });
    }

    if (selectedNode.value) {
      console.log('[TiptapEditor] Loading selected node content', {
        nodeId: selectedNode.value.id,
        content: selectedNode.value.content
      });
      editor.value.commands.setContent(selectedNode.value.content || '');

      // Apply inferred title highlight if needed
      updateInferredTitleHighlight();
    } else {
      console.log('[TiptapEditor] No node selected, clearing editor');
      editor.value.commands.setContent('');
    }
    editor.value.setOptions({
      editorProps: {
        attributes: {
          class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none',
        },
      },
    });

    // Apply inferred title highlight
    updateInferredTitleHighlight();
  }

  isUpdatingFromStore.value = false;
  console.log('[TiptapEditor] Mode change complete');
});

// Listen to node selection events from other views
viewSync.onNodeSelected((event) => {
  console.log('[TiptapEditor] Node selection event received', {
    nodeId: event.nodeId,
    source: event.source,
    currentMode: editorMode.value,
    currentSelectedNodeId: selectedNodeId.value
  });

  selectedNodeId.value = event.nodeId;

  // Find the selected node in the tree
  selectedNode.value = findNodeById(props.modelValue, event.nodeId);

  console.log('[TiptapEditor] Node found in tree', {
    nodeId: event.nodeId,
    nodeFound: !!selectedNode.value,
    nodeContent: selectedNode.value?.content,
    editorMode: editorMode.value,
    hasEditor: !!editor.value
  });

  // If in Node Content mode, update the editor
  console.log('[TiptapEditor] Checking conditions for editor update', {
    editorModeValue: editorMode.value,
    editorModeIsNode: editorMode.value === 'node',
    hasEditor: !!editor.value,
    hasSelectedNode: !!selectedNode.value,
    allConditionsMet: editorMode.value === 'node' && !!editor.value && !!selectedNode.value
  });

  if (editorMode.value === 'node' && editor.value && selectedNode.value) {
    console.log('[TiptapEditor] Updating editor with node content', {
      nodeId: selectedNode.value.id,
      content: selectedNode.value.content
    });

    isUpdatingFromStore.value = true;
    editor.value.commands.setContent(selectedNode.value.content || '');
    isUpdatingFromStore.value = false;

    // Apply inferred title highlight
    updateInferredTitleHighlight();
  } else {
    console.log('[TiptapEditor] Not updating editor', {
      editorMode: editorMode.value,
      hasEditor: !!editor.value,
      hasSelectedNode: !!selectedNode.value,
      reason: !editorMode.value ? 'no mode' :
              editorMode.value !== 'node' ? 'not in node mode' :
              !editor.value ? 'no editor' :
              !selectedNode.value ? 'no selected node' : 'unknown'
    });
  }
});

// Watch for changes to the selected node's content (reactivity)
// Watch for changes to the selected node in the store
watch(() => {
  if (selectedNodeId.value && props.modelValue) {
    return findNodeById(props.modelValue, selectedNodeId.value);
  }
  return null;
}, (newNode) => {
  console.log('[TiptapEditor] Selected node watcher triggered', {
    newNodeId: newNode?.id,
    oldNodeId: selectedNode.value?.id
  });

  // Update the selectedNode ref to point to the latest version from the store
  if (newNode) {
    selectedNode.value = newNode;
  }
});

watch(() => {
  if (selectedNodeId.value && props.modelValue) {
    const node = findNodeById(props.modelValue, selectedNodeId.value);
    return node?.content;
  }
  return null;
}, (newContent, oldContent) => {
  console.log('[TiptapEditor] Content watcher triggered', {
    newContent,
    oldContent,
    mode: editorMode.value,
    selectedNodeId: selectedNodeId.value
  });

  // Only update if:
  // 1. We're in node mode
  // 2. Editor exists
  // 3. Content actually changed
  if (editorMode.value === 'node' && editor.value && newContent !== oldContent) {
    const currentEditorHTML = editor.value.getHTML();
    const newContentHTML = newContent || '';

    console.log('[TiptapEditor] Content watcher: comparing HTML', {
      currentEditorHTML,
      newContentHTML,
      areEqual: currentEditorHTML === newContentHTML,
      currentHighlightLength: extractInferredTitleLength(currentEditorHTML),
      newHighlightLength: extractInferredTitleLength(newContentHTML)
    });

    // Only update if the HTML is actually different
    if (currentEditorHTML !== newContentHTML) {
      console.log('[TiptapEditor] Content watcher: updating editor content from store');

      // Set flag to prevent onUpdate from triggering
      isUpdatingFromStore.value = true;

      // Update the editor content
      editor.value.commands.setContent(newContentHTML);

      // Extract highlight length from the new content HTML and apply it
      void nextTick(() => {
        const highlightLength = extractInferredTitleLength(newContentHTML);

        console.log('[TiptapEditor] Content watcher: applying highlight from new content', {
          highlightLength,
          newContentHTML
        });

        if (highlightLength && highlightLength > 0) {
          // Apply the highlight mark based on the length from the content HTML
          editor.value?.commands.setInferredTitleMark(highlightLength);
        } else {
          // No highlight in content - calculate default
          updateInferredTitleHighlight();
        }

        // Reset flag after highlight is applied
        isUpdatingFromStore.value = false;
      });
    } else {
      console.log('[TiptapEditor] Content watcher: HTML is the same, skipping update');
    }
  }
});

// Watch for changes to the selected node's title
// When title changes from empty to non-empty (or vice versa), update the highlight
watch(() => {
  if (selectedNodeId.value && props.modelValue) {
    const node = findNodeById(props.modelValue, selectedNodeId.value);
    return node?.title;
  }
  return null;
}, (newTitle, oldTitle) => {
  console.log('[TiptapEditor] Title watcher triggered', {
    newTitle,
    oldTitle,
    mode: editorMode.value,
    selectedNodeId: selectedNodeId.value
  });

  // Only update highlight if:
  // 1. We're in node mode
  // 2. Editor exists
  // 3. Title actually changed
  if (editorMode.value === 'node' && editor.value && newTitle !== oldTitle) {
    console.log('[TiptapEditor] Title changed, updating highlight');

    // Update inferred title highlight
    void nextTick(() => {
      updateInferredTitleHighlight();
    });
  }
});

// Initialize content on mount
onMounted(() => {
  console.log('[TiptapEditor] Component mounted', {
    mode: editorMode.value,
    selectedNodeId: selectedNodeId.value,
    globalSelectedNodeId: globalSelectedNodeId.value
  });

  if (editor.value && props.modelValue) {
    if (editorMode.value === 'full') {
      const docJSON = convertNodeTreeToDocument(props.modelValue);
      editor.value.commands.setContent(docJSON);
    } else {
      // In node mode, check if there's a global selected node
      if (!selectedNodeId.value && globalSelectedNodeId.value) {
        console.log('[TiptapEditor] onMounted: Adopting global selected node', {
          globalSelectedNodeId: globalSelectedNodeId.value
        });
        selectedNodeId.value = globalSelectedNodeId.value;
        selectedNode.value = findNodeById(props.modelValue, globalSelectedNodeId.value);

        if (selectedNode.value) {
          console.log('[TiptapEditor] onMounted: Loading selected node content', {
            nodeId: selectedNode.value.id,
            content: selectedNode.value.content
          });
          editor.value.commands.setContent(selectedNode.value.content || '');

          // Apply inferred title highlight from the content HTML
          // Use nextTick to ensure editor content is fully loaded
          void nextTick(() => {
            // Extract highlight length from the content HTML
            const highlightLength = extractInferredTitleLength(selectedNode.value?.content || '');

            console.log('[TiptapEditor] onMounted: Applying inferred title highlight', {
              nodeId: selectedNode.value?.id,
              highlightLength,
              contentHtml: selectedNode.value?.content
            });

            if (highlightLength && highlightLength > 0) {
              // Apply the highlight mark based on the length from the content HTML
              editor.value?.commands.setInferredTitleMark(highlightLength);
            } else {
              // No highlight in content - calculate default
              updateInferredTitleHighlight();
            }
          });

          // Emit selection event to sync with other views (mindmap, tree)
          // This ensures the node stays selected in mindmap when switching from Full Document
          console.log('[TiptapEditor] onMounted: Emitting selection event to sync with other views', {
            nodeId: selectedNode.value.id
          });
          viewSync.selectNode(selectedNode.value.id, false); // false = don't scroll
        }
      }
      // Otherwise, content is set by the selectedNode watcher when a node is selected
    }
  }

  // Debug: Add global event listeners to track all clicks
  console.log('[TiptapEditor] Adding global event listeners for debugging');

  document.addEventListener('mousedown', (e) => {
    console.log('[GLOBAL] mousedown event (capture phase)', {
      target: e.target,
      targetTagName: (e.target as Element)?.tagName,
      targetClasses: (e.target as Element)?.className,
      targetId: (e.target as Element)?.id,
      timestamp: Date.now()
    });
  }, true); // Capture phase

  document.addEventListener('mousedown', (e) => {
    console.log('[GLOBAL] mousedown event (bubble phase)', {
      target: e.target,
      targetTagName: (e.target as Element)?.tagName,
      targetClasses: (e.target as Element)?.className,
      targetId: (e.target as Element)?.id,
      timestamp: Date.now()
    });
  }, false); // Bubble phase

  document.addEventListener('click', (e) => {
    console.log('[GLOBAL] click event (capture phase)', {
      target: e.target,
      targetTagName: (e.target as Element)?.tagName,
      targetClasses: (e.target as Element)?.className,
      targetId: (e.target as Element)?.id,
      timestamp: Date.now()
    });
  }, true); // Capture phase

  document.addEventListener('click', (e) => {
    console.log('[GLOBAL] click event (bubble phase)', {
      target: e.target,
      targetTagName: (e.target as Element)?.tagName,
      targetClasses: (e.target as Element)?.className,
      targetId: (e.target as Element)?.id,
      timestamp: Date.now()
    });
  }, false); // Bubble phase
});

// Cleanup
onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.destroy();
  }
});
</script>

<style lang="scss" scoped>
.tiptap-editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
  border-left: 1px solid #e0e0e0;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid #e0e0e0;
  background: #f5f5f5;
  flex-shrink: 0;

  .is-active {
    background: rgba(0, 0, 0, 0.1);
  }
}

.editor-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.editor-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.no-node-selected {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  text-align: center;
}

:deep(.ProseMirror) {
  min-height: 100%;
  outline: none;

  p {
    margin: 0.5em 0;

    &.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      float: left;
      color: #adb5bd;
      pointer-events: none;
      height: 0;
    }
  }

  // Inferred title highlight
  .inferred-title-highlight {
    background-color: rgba(0, 0, 0, 0.04); // Light gray highlight
    border-bottom: 1px solid rgba(0, 0, 0, 0.15); // Gray underline
    padding: 2px 0;
    position: relative;
    cursor: text; // Default cursor for the text
  }
}
</style>

