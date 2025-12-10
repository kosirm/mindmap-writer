<template>
  <div class="mindmap-panel">
    <MindmapView />
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import MindmapView from 'src/features/canvas/components/MindmapView.vue'
import { useDocumentStore } from 'src/core/stores/documentStore'

defineOptions({
  name: 'MindmapPanelComponent'
})

const documentStore = useDocumentStore()

onMounted(() => {
  // Ensure the document store is set to mindmap view when this panel is active
  if (documentStore.activeView !== 'mindmap') {
    documentStore.switchView('mindmap', 'mindmap')
  }
})

// Watch for active view changes and update if needed
watch(() => documentStore.activeView, (newView) => {
  if (newView !== 'mindmap') {
    // If the active view changed away from mindmap, we might want to switch back
    // when this panel becomes active again
  }
})
</script>

<style scoped lang="scss">
.mindmap-panel {
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: 8px;
  background-color: #1e1e1e;
}
</style>
