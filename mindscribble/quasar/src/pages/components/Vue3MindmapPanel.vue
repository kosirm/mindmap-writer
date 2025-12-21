<template>
  <div class="vue3-mindmap-panel">
    <Vue3MindmapView />

    <!-- Shield overlay to block pointer events during dockview drag -->
    <div v-if="isDraggingPanel" class="drag-shield"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, inject, type Ref } from 'vue'
import Vue3MindmapView from 'src/features/canvas/components/Vue3MindmapView.vue'
import { useDocumentStore } from 'src/core/stores/documentStore'

defineOptions({
  name: 'Vue3MindmapPanelComponent'
})

const documentStore = useDocumentStore()
const isDraggingPanel = inject<Ref<boolean>>('isDraggingPanel')

onMounted(() => {
  // Ensure the document store is set to vue3-mindmap view when this panel is active
  if (documentStore.activeView !== 'vue3-mindmap') {
    documentStore.switchView('vue3-mindmap', 'vue3-mindmap')
  }
})

// Watch for active view changes
watch(() => documentStore.activeView, (newView) => {
  if (newView !== 'vue3-mindmap') {
    // Handle view changes if needed
  }
})
</script>

<style scoped lang="scss">
.vue3-mindmap-panel {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: transparent;
  position: relative;
}

.drag-shield {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: transparent;
  pointer-events: all;
  cursor: grabbing;
}
</style>
