<template>
  <div
    ref="elementRef"
    class="droppable"
    :class="{ 'is-overed': isOvered }"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { useDroppable, DnDOperations, type IDnDStore } from '@vue-dnd-kit/core';
import { eventBus } from '../composables/useEventBus';
import type { TreeItem } from './WriterTree.vue';

const props = defineProps<{
  source: TreeItem[];
  parentId?: string | null;  // The parent node ID for this droppable area (null for root)
}>();

// Custom drop handler that updates hierarchy
function handleDrop(store: IDnDStore) {
  console.log('[WriterDroppable] handleDrop called', {
    parentId: props.parentId,
    draggingElements: store.draggingElements.value.size,
  });

  // Get the dragged element's data before applying transfer
  const draggedElements = Array.from(store.draggingElements.value.values());
  console.log('[WriterDroppable] draggedElements:', draggedElements);

  // Extract node IDs from dragged elements
  const draggedNodeIds: string[] = [];
  draggedElements.forEach((element) => {
    if (element.data && typeof element.data === 'object' && 'source' in element.data && 'index' in element.data) {
      const { source, index } = element.data as { source: TreeItem[]; index: number };
      const draggedNode = source[index];
      if (draggedNode) {
        draggedNodeIds.push(draggedNode.id);
      }
    }
  });

  // First, apply the transfer to update the array structure
  DnDOperations.applyTransfer(store);
  console.log('[WriterDroppable] applyTransfer completed');

  // After applyTransfer, the source array has been modified
  // Now we need to update the hierarchy based on the new structure
  const newParentId = props.parentId || null;

  // Emit event to rebuild hierarchy from the modified tree structure
  console.log('[WriterDroppable] Emitting writer:tree-restructured:', {
    draggedNodeIds,
    newParentId,
  });

  eventBus.emit('writer:tree-restructured', {
    draggedNodeIds,
    newParentId,
  });
}

// Using computed to ensure reactivity with nested structures
const { elementRef, isOvered } = useDroppable({
  data: computed(() => ({
    source: props.source,
  })),
  events: {
    onDrop: handleDrop,
  },
});

// Debug: Watch drop zone state
watch(isOvered, (newVal) => {
  console.log('[WriterDroppable] isOvered changed:', {
    parentId: props.parentId,
    isOvered: newVal,
    sourceLength: props.source.length,
  });
});
</script>

<style scoped lang="scss">
.droppable {
  padding: 8px;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: relative;
  min-height: 40px;
  transition: all 0.2s ease;

  &.is-overed {
    background-color: rgba(25, 118, 210, 0.05);
  }
}
</style>

