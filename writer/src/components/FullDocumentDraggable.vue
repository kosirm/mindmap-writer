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
      @click="handleClick"
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
        <div
          v-if="!isInferredTitle"
          ref="titleRef"
          class="node-title"
          contenteditable="true"
          @blur="handleTitleBlur"
          @keydown.enter.prevent="handleTitleEnter"
          v-html="displayTitle"
        ></div>

        <!-- Content (always shown for inferred titles, conditionally for manual titles) -->
        <div
          v-if="isInferredTitle || hasContent || isEditingContent"
          ref="contentRef"
          class="node-body"
          contenteditable="true"
          @blur="handleContentBlur"
          @focus="isEditingContent = true"
          v-html="node.content"
        ></div>
      </div>
    </div>

    <!-- Children slot for recursive nesting -->
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDraggable } from '@vue-dnd-kit/core';
import type { MindmapNode } from 'src/stores/mindmap';
import { inferTitle } from 'src/stores/mindmap';
import { useViewSync } from 'src/composables/useViewSync';

const props = defineProps<{
  node: MindmapNode;
  index: number;
  source: MindmapNode[];
  depth: number;
}>();

const isHovered = ref(false);
const isEditingContent = ref(false);
const isHighlighted = ref(false);
const titleRef = ref<HTMLElement | null>(null);
const contentRef = ref<HTMLElement | null>(null);

// Initialize view sync for Full Document view
const viewSync = useViewSync('full-document');

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

  // Return inferred title
  if (props.node.inferredTitle) {
    return props.node.inferredTitle;
  }

  // Fallback: infer from content
  return inferTitle(props.node.content);
});

// Check if node has content
const hasContent = computed(() => {
  return props.node.content && props.node.content.trim() !== '';
});

// Title editing handlers
function handleTitleBlur(event: FocusEvent) {
  const target = event.target as HTMLElement;
  const newTitle = target.innerHTML;

  if (newTitle !== displayTitle.value) {
    // Update the node title in the store
    const node = props.source[props.index];
    if (node) {
      node.title = newTitle;
      node.updatedAt = new Date();

      // Clear inferred title when user sets explicit title
      if (newTitle.trim() !== '') {
        delete node.inferredTitle;
      }
    }
  }
}

// Mouse event handlers for hover and click
function handleMouseEnter() {
  isHovered.value = true;
}

function handleMouseLeave() {
  isHovered.value = false;
}

function handleClick(event: MouseEvent) {
  // Don't trigger if clicking on contenteditable elements
  const target = event.target as HTMLElement;
  if (target.contentEditable === 'true') {
    return;
  }

  // Emit selection event to other views
  viewSync.selectNode(props.node.id, true);
}

// Listen to selection events from other views
viewSync.onNodeSelected((event) => {
  // Ignore events from full-document itself
  if (event.source === 'full-document') return;

  // Highlight this node if it matches the selected node
  isHighlighted.value = event.nodeId === props.node.id;

  // Scroll into view if requested
  if (isHighlighted.value && event.scrollIntoView && elementRef.value) {
    elementRef.value.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
});

function handleTitleEnter() {
  // Show content editor and focus it
  isEditingContent.value = true;

  // Wait for next tick for the content div to be rendered
  setTimeout(() => {
    if (contentRef.value) {
      contentRef.value.focus();
      // Place cursor at the end if there's content
      if (hasContent.value) {
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(contentRef.value);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }, 0);
}

// Content editing handlers
function handleContentBlur(event: FocusEvent) {
  const target = event.target as HTMLElement;
  const newContent = target.innerHTML;

  if (newContent !== props.node.content) {
    // Update the node content in the store
    const node = props.source[props.index];
    if (node) {
      node.content = newContent;
      node.updatedAt = new Date();

      // Update inferred title if title is empty
      if (!node.title || node.title.trim() === '') {
        node.inferredTitle = inferTitle(newContent);
      }
    }
  }

  // Hide content editor if content is empty
  if (!newContent || newContent.trim() === '') {
    isEditingContent.value = false;
  }
}
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
}

.node-title {
  font-weight: 600;
  font-size: 1.1em;
  color: #333;
  margin-bottom: 4px;
  outline: none;
  cursor: text;

  &:focus {
    background-color: rgba(25, 118, 210, 0.05);
    border-radius: 2px;
  }

  &:empty:before {
    content: 'Untitled';
    color: #999;
    font-style: italic;
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

  &:focus {
    background-color: rgba(25, 118, 210, 0.05);
    border-radius: 2px;
  }

  &:empty:before {
    content: 'Add content...';
    color: #999;
    font-style: italic;
  }

  // Preserve formatting from Tiptap
  :deep(p) {
    margin: 4px 0;
  }

  :deep(strong) {
    font-weight: 700;
  }

  :deep(em) {
    font-style: italic;
  }
}
</style>
