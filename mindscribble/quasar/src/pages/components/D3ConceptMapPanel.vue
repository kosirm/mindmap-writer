<template>
  <div class="d3-conceptmap-panel">
    <D3ConceptMapView />

    <!-- Shield overlay to block pointer events during dockview drag -->
    <div v-if="isDraggingPanel" class="drag-shield"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, inject, type Ref } from 'vue'
import D3ConceptMapView from 'src/features/canvas/components/D3ConceptMapView.vue'
import { useDocumentStore } from 'src/core/stores/documentStore'

defineOptions({
  name: 'D3ConceptMapPanelComponent'
})

const documentStore = useDocumentStore()

// Inject the drag state from FilePanel
const isDraggingPanel = inject<Ref<boolean>>('isDraggingPanel')

onMounted(() => {
  // Ensure the document store is set to d3-concept-map view when this panel is active
  if (documentStore.activeView !== 'd3-concept-map') {
    documentStore.switchView('d3-concept-map', 'd3-concept-map')
  }
})

// Watch for active view changes and update if needed
watch(() => documentStore.activeView, (newView) => {
  if (newView !== 'd3-concept-map') {
    // If the active view changed away from d3-concept-map, we might want to switch back
    // when this panel becomes active again
  }
})
</script>

<style scoped lang="scss">
.d3-conceptmap-panel {
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: #1e1e1e;
  position: relative;
}

// Shield overlay to block pointer events during dockview drag
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
