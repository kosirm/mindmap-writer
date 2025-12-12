<template>
  <div class="writer-panel">
    <WriterView />

    <!-- Shield overlay to block pointer events during dockview drag -->
    <div v-if="isDraggingPanel" class="drag-shield"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, inject, type Ref } from 'vue'
import WriterView from 'src/features/writer/components/WriterView.vue'
import { useDocumentStore } from 'src/core/stores/documentStore'

defineOptions({
  name: 'WriterPanelComponent'
})

// console.log('🔍🔍🔍 WriterPanel.vue script setup running')

const documentStore = useDocumentStore()

// Inject the drag state from FilePanel
const isDraggingPanel = inject<Ref<boolean>>('isDraggingPanel')

onMounted(() => {
  // console.log('🔍🔍🔍 WriterPanel.vue mounted!')
  // Ensure the document store is set to writer view when this panel is active
  if (documentStore.activeView !== 'writer') {
    documentStore.switchView('writer', 'writer')
  }
})

// Watch for active view changes
watch(() => documentStore.activeView, (newView) => {
  if (newView !== 'writer') {
    // If the active view changed away from writer, we might want to switch back
    // when this panel becomes active again
  }
})
</script>

<style scoped lang="scss">
.writer-panel {
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
