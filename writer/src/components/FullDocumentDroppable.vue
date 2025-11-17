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
import { computed } from 'vue';
import { useDroppable, DnDOperations } from '@vue-dnd-kit/core';
import type { MindmapNode } from 'src/stores/mindmap';

const props = defineProps<{
  source: MindmapNode[];
}>();

// Using computed to ensure reactivity with nested structures
const { elementRef, isOvered } = useDroppable({
  data: computed(() => ({
    source: props.source,
  })),
  events: {
    onDrop: DnDOperations.applyTransfer,
  },
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

