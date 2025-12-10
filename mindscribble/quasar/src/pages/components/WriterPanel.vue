<template>
  <div class="writer-panel">
    <WriterView />
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import WriterView from 'src/features/writer/components/WriterView.vue'
import { useDocumentStore } from 'src/core/stores/documentStore'

defineOptions({
  name: 'WriterPanelComponent'
})

const documentStore = useDocumentStore()

onMounted(() => {
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
  padding: 8px;
  background-color: #1e1e1e;
}
</style>
