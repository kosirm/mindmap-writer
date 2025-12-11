<template>
  <div class="outline-panel">
    <OutlineView />
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import OutlineView from 'src/features/tree/components/OutlineView.vue'
import { useDocumentStore } from 'src/core/stores/documentStore'

defineOptions({
  name: 'OutlinePanelComponent'
})

const documentStore = useDocumentStore()

onMounted(() => {
  // Ensure the document store is set to outline view when this panel is active
  if (documentStore.activeView !== 'outline') {
    documentStore.switchView('outline', 'outline')
  }
})

// Watch for active view changes
watch(() => documentStore.activeView, (newView) => {
  if (newView !== 'outline') {
    // If the active view changed away from outline, we might want to switch back
    // when this panel becomes active again
  }
})
</script>

<style scoped lang="scss">
.outline-panel {
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: #1e1e1e;
}
</style>
