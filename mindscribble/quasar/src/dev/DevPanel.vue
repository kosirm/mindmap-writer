<template>
  <div class="dev-panel">
    <div class="text-h6 q-mb-md">
      <q-icon name="code" class="q-mr-sm" />
      Dev Tools
    </div>

    <!-- View-specific sections -->
    <q-expansion-item
      default-opened
      icon="graph_1"
      label="Mindmap"
      header-class="text-primary"
    >
      <MindmapDevTools />
    </q-expansion-item>

    <q-separator class="q-my-md" />

    <!-- Store Mode Toggle -->
    <q-expansion-item
      icon="storage"
      label="Store Mode"
      header-class="text-accent"
      default-opened
    >
      <q-card flat bordered class="q-pa-md">
        <div class="text-caption text-grey-7 q-mb-sm">
          {{ modeDescription }}
        </div>

        <q-option-group
          v-model="storeMode"
          :options="storeModeOptions"
          color="primary"
          @update:model-value="handleStoreModeChange"
        />

        <q-separator class="q-my-md" />

        <div class="text-caption text-grey-7 q-mb-sm">
          <strong>Mode Descriptions:</strong>
        </div>
        <div class="text-caption q-mb-xs">
          <strong>Legacy:</strong> Uses DocumentStore + MultiDocumentStore (old system)
        </div>
        <div class="text-caption q-mb-xs">
          <strong>Unified:</strong> Uses UnifiedDocumentStore only (new system)
        </div>
        <div class="text-caption">
          <strong>Dual-Write:</strong> Uses both with synchronization (migration mode)
        </div>

        <q-banner v-if="isUnifiedMode" class="bg-positive text-white q-mt-md" rounded>
          <template v-slot:avatar>
            <q-icon name="check_circle" />
          </template>
          Testing unified store independently!
        </q-banner>

        <q-banner v-if="isLegacyMode" class="bg-warning text-white q-mt-md" rounded>
          <template v-slot:avatar>
            <q-icon name="warning" />
          </template>
          Using legacy stores (will be deprecated)
        </q-banner>
      </q-card>
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
import { useUnifiedDocumentStore } from 'src/core/stores/unifiedDocumentStore'
import { useStoreMode } from 'src/composables/useStoreMode'
import { useQuasar } from 'quasar'
import MindmapDevTools from './MindMapDevTools.vue'

const documentStore = useDocumentStore()
const unifiedStore = useUnifiedDocumentStore()
const { storeMode, setStoreMode, isLegacyMode, isUnifiedMode, modeDescription } = useStoreMode()
const $q = useQuasar()

// Store mode options
const storeModeOptions = [
  { label: 'Legacy Stores', value: 'legacy' },
  { label: 'Unified Store', value: 'unified' },
  { label: 'Dual-Write Mode', value: 'dual-write' }
]

function handleStoreModeChange(newMode: 'legacy' | 'unified' | 'dual-write') {
  setStoreMode(newMode)

  $q.notify({
    message: `Switched to ${newMode} mode`,
    caption: modeDescription.value,
    color: 'primary',
    icon: 'storage',
    position: 'top',
    timeout: 3000
  })
}

function logStoreState() {
  console.log('[DevPanel] Store State:')
  console.log('  Current Mode:', storeMode.value)

  if (isLegacyMode.value || storeMode.value === 'dual-write') {
    console.log('  [Legacy] Document Store:')
    console.log('    Nodes:', documentStore.nodes)
    console.log('    Selected:', documentStore.selectedNodeIds)
    console.log('    Dirty:', documentStore.isDirty)
  }

  if (isUnifiedMode.value || storeMode.value === 'dual-write') {
    console.log('  [Unified] Document Store:')
    console.log('    Active Document ID:', unifiedStore.activeDocumentId)
    console.log('    Active Document:', unifiedStore.activeDocument)
    console.log('    All Documents:', unifiedStore.allDocuments)
    console.log('    Dirty Documents:', Array.from(unifiedStore.dirtyDocuments))
  }
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
  padding-right:16px
}
</style>

