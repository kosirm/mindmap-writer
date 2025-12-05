<template>
  <div class="dev-panel">
    <div class="text-h6 q-mb-md">
      <q-icon name="code" class="q-mr-sm" />
      Dev Tools
    </div>

    <q-banner dense class="bg-orange-2 text-orange-10 q-mb-md" rounded>
      <template v-slot:avatar>
        <q-icon name="warning" />
      </template>
      Development mode only
    </q-banner>

    <!-- View-specific sections -->
    <q-expansion-item
      default-opened
      icon="account_tree"
      label="MindMap"
      header-class="text-primary"
    >
      <MindMapDevTools />
    </q-expansion-item>

    <q-expansion-item
      default-opened
      icon="hub"
      label="ConceptMap"
      header-class="text-primary"
    >
      <ConceptMapDevTools />
    </q-expansion-item>

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
import { useDocumentStore } from 'src/core/stores/documentStore'
import MindMapDevTools from './MindMapDevTools.vue'
import ConceptMapDevTools from './ConceptMapDevTools.vue'

const documentStore = useDocumentStore()

function logStoreState() {
  console.log('[DevPanel] Document Store State:')
  console.log('  Nodes:', documentStore.nodes)
  console.log('  Selected:', documentStore.selectedNodeIds)
  console.log('  Dirty:', documentStore.isDirty)
}

function exportJson() {
  const data = {
    documentName: documentStore.documentName,
    nodes: documentStore.nodes
  }
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${documentStore.documentName || 'mindscribble'}-export.json`
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
}
</style>

