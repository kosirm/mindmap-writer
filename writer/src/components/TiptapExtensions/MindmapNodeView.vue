<template>
  <node-view-wrapper
    class="mindmap-node-wrapper"
    :class="{
      'is-inferred-title': node.attrs.isInferredTitle,
      'is-hovered': isHovered,
      'is-dragging': isDragging
    }"
    :style="{ paddingLeft: `${indentSize}px` }"
    :data-node-id="node.attrs.nodeId"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <div class="mindmap-node-content">
      <!-- Drag handle -->
      <div
        v-if="editor.isEditable"
        class="drag-handle"
        contenteditable="false"
        draggable="true"
        data-drag-handle
        @dragstart="handleDragStart"
        @dragend="handleDragEnd"
      >
        <q-icon name="drag_indicator" size="sm" />
      </div>

      <!-- Node content (title + content paragraphs) -->
      <node-view-content class="node-content-area" />
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3';

const props = defineProps(nodeViewProps);

const isHovered = ref(false);
const isDragging = ref(false);

// Calculate indentation based on depth
// Default: 30px per level (will be configurable later)
const INDENT_SIZE_PER_LEVEL = 30;
const indentSize = computed(() => {
  const depth = props.node.attrs.depth || 0;
  return depth * INDENT_SIZE_PER_LEVEL;
});

// Handle drag start
const handleDragStart = (event: DragEvent) => {
  isDragging.value = true;

  // Set drag data
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-mindmap-node-id', props.node.attrs.nodeId);
  }
};

// Handle drag end
const handleDragEnd = () => {
  isDragging.value = false;
};
</script>

<style scoped lang="scss">
.mindmap-node-wrapper {
  position: relative;
  margin: 4px 0;
  transition: all 0.2s ease;

  // Subtle border on hover to show node boundaries
  &.is-hovered {
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    background-color: rgba(0, 0, 0, 0.01);
  }

  // Visual distinction for inferred titles
  &.is-inferred-title.is-hovered {
    border-color: #f0c674;
    background-color: rgba(240, 198, 116, 0.05);
  }

  // Dragging state
  &.is-dragging {
    opacity: 0.5;
    border: 2px dashed #1976d2;
    background-color: rgba(25, 118, 210, 0.05);
  }
}

.mindmap-node-content {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 4px 8px;
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

  &:hover {
    color: #1976d2;
    background-color: rgba(25, 118, 210, 0.1);
  }

  &:active {
    cursor: grabbing;
  }

  .mindmap-node-wrapper:hover & {
    opacity: 1;
  }

  .mindmap-node-wrapper.is-dragging & {
    cursor: grabbing;
    opacity: 1;
  }
}

.node-content-area {
  flex: 1;
  min-width: 0; // Allow content to shrink

  // Remove default paragraph margins for tighter layout
  :deep(p) {
    margin: 2px 0;
  }

  // Style the first paragraph as title (bold)
  :deep(p:first-child) {
    font-weight: 600;
    color: #333;
  }

  // Style subsequent paragraphs as content
  :deep(p:not(:first-child)) {
    font-weight: 400;
    color: #666;
    font-size: 0.95em;
  }
}
</style>

