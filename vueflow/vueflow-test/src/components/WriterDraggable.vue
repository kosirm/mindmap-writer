<template>
  <div
    ref="elementRef"
    class="draggable"
    :class="{
      'is-dragging': isDragging,
      'is-overed': isOvered,
      'has-placeholder': isOvered && !isDragging,
    }"
    :style="{ paddingLeft: `${indentSize}px` }"
  >
    <div
      class="node-wrapper"
      :class="{
        'is-hovered': isHovered,
        'is-selected': isSelected
      }"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
      @click="handleWrapperClick"
    >
      <!-- Drag handle -->
      <button
        class="drag-handle"
        aria-label="Drag handle"
        @pointerdown="(e: PointerEvent) => { console.log('[WriterDraggable] Drag handle pointerdown', props.node.id); handleDragStart(e); }"
        @click="() => console.log('[WriterDraggable] Drag handle clicked', props.node.id)"
        tabindex="0"
      >
        <q-icon name="drag_indicator" size="sm" />
      </button>

      <!-- Node content -->
      <div class="node-content">
        <!-- Title -->
        <div class="title-wrapper">
          <!-- Static HTML (when not editing) -->
          <div
            v-if="!isTitleEditing"
            class="node-title"
            v-html="displayTitle"
            @click.stop="handleTitleClick"
          ></div>

          <!-- Tiptap Editor (when editing) -->
          <EditorContent
            v-else-if="titleEditor"
            :editor="titleEditor"
            class="node-title"
            @click.stop
          />
        </div>

        <!-- Content (always shown) -->
        <div class="content-wrapper">
          <!-- Static HTML (when not editing) -->
          <div
            v-if="!isContentEditing"
            class="node-body"
            v-html="displayContent"
            @click.stop="handleContentClick"
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
import { ref, computed, nextTick, onBeforeUnmount, watch, inject } from 'vue';
import { useDraggable } from '@vue-dnd-kit/core';
import { EditorContent, Editor } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { eventBus } from '../composables/useEventBus';
import { createKeyboardHandler } from '../composables/useWriterKeyboardHandlers';
import type { TreeItem } from './WriterTree.vue';
import type { useWriterNavigation } from '../composables/useWriterNavigation';

const props = defineProps<{
  node: TreeItem;
  index: number;
  source: TreeItem[];
  depth: number;
}>();

// Inject navigation from parent (WriterEditor)
const navigation = inject<ReturnType<typeof useWriterNavigation>>('writerNavigation');

// Indentation
const indentSize = computed(() => props.depth * 10);

// Hover state
const isHovered = ref(false);

// Selection state
const selectedNodeId = ref<string | null>(null);
const isSelected = computed(() => {
  return selectedNodeId.value === props.node.id;
});

// Listen for selection changes from other views
eventBus.on('writer:node-selected', ({ nodeId, scrollIntoView }) => {
  selectedNodeId.value = nodeId;

  // Scroll into view if requested and this is the selected node
  if (scrollIntoView && nodeId === props.node.id && elementRef.value) {
    elementRef.value.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }
});

// Display title
const displayTitle = computed(() => {
  return props.node.data.title || 'Untitled';
});

// Display content (with placeholder if empty)
const displayContent = computed(() => {
  const content = props.node.data.content;
  if (!content || content.trim() === '' || content === '<p></p>') {
    return '<p class="placeholder">Click to add content...</p>';
  }
  return content;
});

// Editing states
const isTitleEditing = ref(false);
const isContentEditing = ref(false);

// Tiptap editors (internal refs)
const titleEditorInstance = ref<Editor | null>(null);
const contentEditorInstance = ref<Editor | null>(null);

// Unwrap editor refs for template (EditorContent expects Editor, not Ref<Editor>)
const titleEditor = computed(() => titleEditorInstance.value as Editor | null);
const contentEditor = computed(() => contentEditorInstance.value as Editor | null);

// Draggable
const { elementRef, handleDragStart, isDragging, isOvered } = useDraggable({
  data: computed(() => ({
    source: props.source,
    index: props.index,
  })),
});

// Debug: Watch drag state
watch(isDragging, (newVal) => {
  console.log('[WriterDraggable] isDragging changed:', {
    nodeId: props.node.id,
    nodeTitle: props.node.data.title,
    isDragging: newVal,
  });
});

watch(isOvered, (newVal) => {
  console.log('[WriterDraggable] isOvered changed:', {
    nodeId: props.node.id,
    nodeTitle: props.node.data.title,
    isOvered: newVal,
  });
});

// Mouse handlers
function handleMouseEnter() {
  isHovered.value = true;
}

function handleMouseLeave() {
  isHovered.value = false;
}

function handleWrapperClick() {
  // Select node and notify other views
  eventBus.emit('writer:node-selected', { nodeId: props.node.id, scrollIntoView: false, source: 'writer' });
}

// Helper function to navigate to a specific field in another node
function navigateToField(nodeId: string, field: 'title' | 'content', cursorPosition: 'start' | 'end') {
  // First, select the target node (scrollIntoView: false to prevent jumping in Writer view)
  // The selection will still trigger scrolling in tree and centering in mindmap
  eventBus.emit('writer:node-selected', { nodeId, scrollIntoView: false, source: 'writer' });

  // Then, emit an event for the target node to open the appropriate field
  void nextTick(() => {
    eventBus.emit('writer:open-field', { nodeId, field, cursorPosition });
  });
}

// Title editing
function handleTitleClick() {
  openTitleEditor('end');
}

function openTitleEditor(cursorPosition: 'start' | 'end' = 'end') {
  if (isTitleEditing.value) return;

  // Select this node when starting to edit
  eventBus.emit('writer:node-selected', { nodeId: props.node.id, scrollIntoView: false, source: 'writer' });

  isTitleEditing.value = true;

  void nextTick(() => {
    createTitleEditor(cursorPosition);
  });
}

function createTitleEditor(cursorPosition: 'start' | 'end' = 'end') {
  if (titleEditorInstance.value) return;

  titleEditorInstance.value = new Editor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Placeholder.configure({
        placeholder: 'Node title...',
      }),
    ],
    content: displayTitle.value,
    autofocus: cursorPosition,
    editorProps: {
      handleKeyDown: createKeyboardHandler({
        onEnterKey: () => {
          // Enter in title always moves to content
          openContentEditor('start');
        },
        onRightArrowAtEnd: () => {
          // Right arrow at end of title always goes to content
          openContentEditor('start');
        },
        onLeftArrowAtStart: () => {
          // Left arrow at start of title goes to previous node's content
          if (navigation) {
            // Get the previous field in the flattened list
            const prevField = navigation.getPreviousField(props.node.id, 'title');
            if (prevField) {
              // If previous field is a title, we need to go to that node's content instead
              if (prevField.field === 'title') {
                // Navigate to content of the previous node
                navigateToField(prevField.nodeId, 'content', 'end');
              } else {
                // Previous field is already content, navigate to it
                navigateToField(prevField.nodeId, prevField.field, 'end');
              }
            }
          }
        },
        onUpArrowAtFirstLine: () => {
          // Up arrow at first line of title goes to previous node's content
          if (navigation) {
            // Get the previous field in the flattened list
            const prevField = navigation.getPreviousField(props.node.id, 'title');
            if (prevField) {
              // If previous field is a title, we need to go to that node's content instead
              if (prevField.field === 'title') {
                // Navigate to content of the previous node
                navigateToField(prevField.nodeId, 'content', 'end');
              } else {
                // Previous field is already content, navigate to it
                navigateToField(prevField.nodeId, prevField.field, 'end');
              }
            }
          }
        },
        onDownArrowAtLastLine: () => {
          // Down arrow at last line of title always goes to content
          openContentEditor('start');
        },
      }),
    },
    onUpdate: ({ editor }) => {
      // Emit update event (don't mutate props directly)
      const html = editor.getHTML();
      eventBus.emit('node:update', { nodeId: props.node.id, title: html });
    },
    onBlur: () => {
      destroyTitleEditor();
    },
  });
}

function destroyTitleEditor() {
  if (titleEditorInstance.value) {
    titleEditorInstance.value.destroy();
    titleEditorInstance.value = null;
  }
  isTitleEditing.value = false;
}

// Content editing
function handleContentClick() {
  openContentEditor('end');
}

function openContentEditor(cursorPosition: 'start' | 'end' = 'end') {
  if (isContentEditing.value) return;

  // Select this node when starting to edit
  eventBus.emit('writer:node-selected', { nodeId: props.node.id, scrollIntoView: false, source: 'writer' });

  isContentEditing.value = true;

  void nextTick(() => {
    createContentEditor(cursorPosition);
  });
}

function createContentEditor(cursorPosition: 'start' | 'end' = 'end') {
  if (contentEditorInstance.value) return;

  contentEditorInstance.value = new Editor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Node content...',
      }),
    ],
    content: props.node.data.content || '',
    autofocus: cursorPosition,
    editorProps: {
      handleKeyDown: createKeyboardHandler({
        onLeftArrowAtStart: () => {
          // Left arrow at start of content goes to title of same node
          openTitleEditor('end');
        },
        onRightArrowAtEnd: () => {
          // Right arrow at end of content goes to next node's title
          // Note: We use 'title' to find next field because content might be empty and not in flattened list
          if (navigation) {
            const nextField = navigation.getNextField(props.node.id, 'title');
            if (nextField) {
              navigateToField(nextField.nodeId, nextField.field, 'start');
            }
          }
        },
        onUpArrowAtFirstLine: () => {
          // Up arrow at first line of content goes to title of same node
          openTitleEditor('end');
        },
        onDownArrowAtLastLine: () => {
          // Down arrow at last line of content goes to next node's title
          // Note: We use 'title' to find next field because content might be empty and not in flattened list
          if (navigation) {
            const nextField = navigation.getNextField(props.node.id, 'title');
            if (nextField) {
              navigateToField(nextField.nodeId, nextField.field, 'start');
            }
          }
        },
      }),
    },
    onUpdate: ({ editor }) => {
      // Emit update event (don't mutate props directly)
      const html = editor.getHTML();
      eventBus.emit('node:update', { nodeId: props.node.id, content: html });
    },
    onBlur: () => {
      destroyContentEditor();
    },
  });
}

function destroyContentEditor() {
  if (contentEditorInstance.value) {
    contentEditorInstance.value.destroy();
    contentEditorInstance.value = null;
  }
  isContentEditing.value = false;
}

// Listen for field navigation events
eventBus.on('writer:open-field', (event) => {
  // Only handle events for this node
  if (event.nodeId === props.node.id) {
    if (event.field === 'title') {
      // Open title editor
      openTitleEditor(event.cursorPosition);
    } else {
      // Open content editor
      openContentEditor(event.cursorPosition);
    }
  }
});

// Cleanup on unmount
onBeforeUnmount(() => {
  destroyTitleEditor();
  destroyContentEditor();
});
</script>

<style scoped lang="scss">
.draggable {
  position: relative;
  transition: all 0.2s ease;

  &.is-dragging {
    opacity: 0.5;
  }

  &.is-overed {
    background-color: rgba(25, 118, 210, 0.05);
  }

  // Add space above when another item is being dragged over this one
  &.has-placeholder {
    margin-top: 40px;
    position: relative;

    &::before {
      content: '';
      position: absolute;
      top: -40px;
      left: 0;
      right: 0;
      height: 36px;
      background-color: rgba(25, 118, 210, 0.1);
      border: 2px dashed rgba(25, 118, 210, 0.4);
      border-radius: 4px;
      pointer-events: none;
    }
  }
}

.node-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid transparent;
  transition: all 0.2s ease;
  cursor: pointer;

  &.is-hovered {
    border-color: rgba(0, 0, 0, 0.12);
    background-color: rgba(0, 0, 0, 0.02);
  }

  &.is-selected {
    border-color: #1976d2;
    background-color: rgba(25, 118, 210, 0.08);
  }
}

.drag-handle {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  border: none;
  background: transparent;
  color: rgba(0, 0, 0, 0.38);
  border-radius: 4px;
  padding: 0;
  opacity: 0;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(0, 0, 0, 0.08);
    color: rgba(0, 0, 0, 0.6);
  }

  &:active {
    cursor: grabbing;
  }

  // Show drag handle when node is hovered or selected
  .node-wrapper.is-hovered &,
  .node-wrapper.is-selected & {
    opacity: 1;
  }
}

.node-content {
  flex: 1;
  min-width: 0;
}

.title-wrapper {
  margin-bottom: 4px;
}

.node-title {
  font-weight: 600;
  font-size: 14px;
  line-height: 1.4;
  color: rgba(0, 0, 0, 0.87);
  cursor: text;

  &:hover {
    background-color: rgba(0, 0, 0, 0.02);
  }

  :deep(p) {
    margin: 0;
  }
}

.content-wrapper {
  margin-top: 4px;
}

.node-body {
  font-size: 13px;
  line-height: 1.5;
  color: rgba(0, 0, 0, 0.6);
  cursor: text;

  &:hover {
    background-color: rgba(0, 0, 0, 0.02);
  }

  :deep(p) {
    margin: 0 0 8px 0;

    &:last-child {
      margin-bottom: 0;
    }

    &.placeholder {
      color: rgba(0, 0, 0, 0.38);
      font-style: italic;
    }
  }
}

// Tiptap editor styles - match the HTML display styling exactly
:deep(.ProseMirror) {
  outline: none;
  padding: 0;
  border: none;
  background-color: transparent;
  border-radius: 0;

  p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    float: left;
    color: rgba(0, 0, 0, 0.38);
    pointer-events: none;
    height: 0;
  }
}

// Match font styling for title editor
.node-title :deep(.ProseMirror) {
  font-weight: 600;
  font-size: 14px;
  line-height: 1.4;
  color: rgba(0, 0, 0, 0.87);
}

// Match font styling for content editor
.node-body :deep(.ProseMirror) {
  font-size: 13px;
  line-height: 1.5;
  color: rgba(0, 0, 0, 0.6);
}
</style>


