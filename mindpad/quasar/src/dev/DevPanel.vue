<template>
  <div class="dev-panel">
    <div class="text-h6 q-mb-md">
      <q-icon name="code" class="q-mr-sm" />
      Dev Tools
    </div>

    <!-- APP Section (Subscription Level Selector) -->
      <div class="q-mb-md">
        <div class="text-subtitle2 q-mb-xs">APP</div>
        <q-btn-toggle
          v-model="currentPlan"
          toggle-color="primary"
          :options="[
            { label: 'Free', value: 'free' },
            { label: 'Basic', value: 'basic' },
            { label: 'Pro', value: 'pro' },
            { label: 'Enterprise', value: 'enterprise' }
          ]"
          @update:model-value="setSubscriptionPlan"
          class="full-width"
          size="sm"
          no-caps
          unelevated
        />
      </div>

      <q-separator class="q-my-md" />

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
import { ref, watch } from 'vue'
import { useUnifiedDocumentStore } from 'src/core/stores/unifiedDocumentStore'
import { useAppStore } from 'src/core/stores/appStore'
import type { SubscriptionPlan } from 'src/core/types'
import MindmapDevTools from './MindMapDevTools.vue'
import WriterDevTools from './WriterDevTools.vue'

const unifiedStore = useUnifiedDocumentStore()
const appStore = useAppStore()

// Subscription level selector - use appStore state
const currentPlan = ref<SubscriptionPlan>(appStore.currentSubscriptionPlan)

// Watch for changes in appStore and update local ref
watch(() => appStore.currentSubscriptionPlan, (newPlan) => {
  currentPlan.value = newPlan
}, { immediate: true })

function setSubscriptionPlan(plan: SubscriptionPlan) {
  appStore.setSubscriptionPlan(plan)
}

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
    documentName: activeDoc.metadata?.name || 'mindpad',
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

