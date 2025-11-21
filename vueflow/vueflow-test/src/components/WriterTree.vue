<template>
  <WriterDroppable :source="source" :parent-id="normalizedParentId">
    <TransitionGroup name="list">
      <WriterDraggable
        v-for="(node, index) in source"
        :key="node.id"
        :node="node"
        :index="index"
        :source="source"
        :depth="depth"
      >
        <!-- Recursively render children -->
        <WriterTree
          v-if="node.children && node.children.length > 0"
          :source="node.children"
          :depth="depth + 1"
          :parent-id="node.id"
        />
      </WriterDraggable>
    </TransitionGroup>
  </WriterDroppable>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import WriterDraggable from './WriterDraggable.vue';
import WriterDroppable from './WriterDroppable.vue';

// Simplified tree item structure for DnD
export interface TreeItem {
  id: string;
  data: {
    title: string;
    content: string;
    parentId?: string | null;
    order: number;
  };
  children?: TreeItem[];
}

const props = defineProps<{
  source: TreeItem[];
  depth: number;
  parentId?: string | null;  // The parent node ID (null for root level)
}>();

// Ensure parentId is always defined (either string or null, never undefined)
const normalizedParentId = computed(() => props.parentId ?? null);
</script>

<style scoped lang="scss">
.list-move {
  transition: all 0.3s ease;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
}

.list-leave-active {
  position: absolute;
}
</style>

