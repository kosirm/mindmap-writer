<template>
  <FullDocumentDroppable :source="source">
    <TransitionGroup name="list">
      <FullDocumentDraggable
        v-for="(node, index) in source"
        :key="node.id"
        :node="node"
        :index="index"
        :source="source"
        :depth="depth"
      >
        <!-- Recursively render children -->
        <FullDocumentTree
          v-if="node.children && node.children.length > 0 && !node.metadata.collapsed"
          :source="node.children"
          :depth="depth + 1"
        />
      </FullDocumentDraggable>
    </TransitionGroup>
  </FullDocumentDroppable>
</template>

<script setup lang="ts">
import type { MindmapNode } from 'src/stores/mindmap';
import FullDocumentDraggable from './FullDocumentDraggable.vue';
import FullDocumentDroppable from './FullDocumentDroppable.vue';

defineProps<{
  source: MindmapNode[];
  depth: number;
}>();
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

