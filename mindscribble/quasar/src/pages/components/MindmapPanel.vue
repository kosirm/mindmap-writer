<template>
  <div class="mindmap-panel">
    <MindmapView />

    <!-- Shield overlay to block pointer events during dockview drag -->
    <div v-if="isDraggingPanel" class="drag-shield"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, inject, type Ref } from 'vue'
import MindmapView from 'src/features/canvas/components/MindmapView.vue'
import { useDocumentStore } from 'src/core/stores/documentStore'

defineOptions({
  name: 'MindmapPanelComponent'
})

const documentStore = useDocumentStore()
const isDraggingPanel = inject<Ref<boolean>>('isDraggingPanel')

onMounted(() => {
  // Ensure the document store is set to mindmap view when this panel is active
  if (documentStore.activeView !== 'mindmap') {
    documentStore.switchView('mindmap', 'mindmap')
  }
})

// Watch for active view changes
watch(() => documentStore.activeView, (newView) => {
  if (newView !== 'mindmap') {
    // Handle view changes if needed
  }
})
</script>

<style scoped lang="scss">
.mindmap-panel {
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
