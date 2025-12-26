<template>
  <div class="dev-panel">
    <div class="text-h6 q-mb-md">
      <q-icon name="code" class="q-mr-sm" />
      Dev Tools
    </div>

    <!-- View-specific sections -->
    <q-expansion-item
      default-closed
      icon="graph_1"
      label="Mindmap"
      header-class="text-primary"
    >
      <MindmapDevTools />
    </q-expansion-item>

    <q-expansion-item
      default-opened
      icon="edit"
      label="Writer"
      header-class="text-primary"
    >
      <WriterDevTools />
    </q-expansion-item>

    <q-separator class="q-my-md" />

    <q-separator class="q-my-md" />

    <!-- Global Actions -->
    <div class="text-subtitle2 q-mb-sm">Global</div>
    <q-btn
      outline
      size="sm"
      label="Log Store State"
      icon="terminal"
      class="full-width q-mb-xs"
      @click="logStoreState"
    />
    <q-btn
      outline
      size="sm"
      label="Export JSON"
      icon="download"
      class="full-width q-mb-xs"
      @click="exportJson"
    />
    <q-btn
      outline
      size="sm"
      label="Clear Local Storage"
      icon="delete_forever"
      color="negative"
      class="full-width q-mb-xs"
      @click="clearLocalStorage"
    />
  </div>
</template>

<script setup lang="ts">
import { useUnifiedDocumentStore } from 'src/core/stores/unifiedDocumentStore'
import MindmapDevTools from './MindMapDevTools.vue'
import WriterDevTools from './WriterDevTools.vue'

const unifiedStore = useUnifiedDocumentStore()

function logStoreState() {
  console.log('[DevPanel] Store State:')
  console.log('  [Unified] Document Store:')
  console.log('    Active Document ID:', unifiedStore.activeDocumentId)
  console.log('    Active Document:', unifiedStore.activeDocument)
  console.log('    All Documents:', unifiedStore.allDocuments)
  console.log('    Dirty Documents:', Array.from(unifiedStore.dirtyDocuments))
}

function exportJson() {
  const activeDoc = unifiedStore.activeDocument
  if (!activeDoc) {
    console.warn('No active document to export')
    return
  }

  const data = {
    documentName: activeDoc.metadata?.name || 'mindscribble',
    nodes: activeDoc.nodes
  }
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${data.documentName}-export.json`
  a.click()
  URL.revokeObjectURL(url)
}

function clearLocalStorage() {
  if (confirm('Clear all local storage? This will reset the app.')) {
    localStorage.clear()
    window.location.reload()
  }
}
</script>

<style scoped>
.dev-panel {
  padding: 8px;
  padding-right:16px
}
</style>

