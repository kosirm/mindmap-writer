<template>
  <div class="dev-tools-section">
    <div class="text-subtitle1 q-mb-sm">
      <q-icon name="hub" class="q-mr-sm" />
      ConceptMap
    </div>

    <!-- Layout Actions -->
    <q-btn
      outline
      size="sm"
      label="Apply Auto Layout"
      icon="auto_fix_high"
      class="full-width q-mb-xs"
      @click="applyAutoLayout"
    />
    <q-btn
      outline
      size="sm"
      label="Reset All Positions"
      icon="restart_alt"
      class="full-width q-mb-xs"
      @click="resetPositions"
    />

    <q-separator class="q-my-sm" />

    <!-- Debug Toggles -->
    <div class="text-caption q-mb-xs">Debug</div>
    <q-toggle
      v-model="showBoundingBoxes"
      size="sm"
      label="Show Bounding Boxes"
      class="q-mb-xs"
    />
    <q-toggle
      v-model="showCanvasCenter"
      size="sm"
      label="Show Canvas Center"
      class="q-mb-xs"
    />
    <q-toggle
      v-model="logCollisions"
      size="sm"
      label="Log Collisions"
      class="q-mb-xs"
    />

    <q-separator class="q-my-sm" />

    <!-- Info -->
    <div class="text-caption">
      <div>Nodes with positions: {{ stats.nodesWithPositions }}</div>
      <div>Nodes without positions: {{ stats.nodesWithoutPositions }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDocumentStore } from 'src/core/stores/documentStore'
import { useDevSettingsStore } from './devSettingsStore'
import { storeToRefs } from 'pinia'

const documentStore = useDocumentStore()
const devSettings = useDevSettingsStore()

const { showConceptMapCanvasCenter: showCanvasCenter } = storeToRefs(devSettings)

const showBoundingBoxes = ref(false)
const logCollisions = ref(true)

const stats = computed(() => {
  const withPos = documentStore.nodes.filter(n => n.views.conceptMap?.position).length
  return {
    nodesWithPositions: withPos,
    nodesWithoutPositions: documentStore.nodes.length - withPos
  }
})

function applyAutoLayout() {
  // TODO: Emit event or call layout composable
  console.log('[ConceptMapDevTools] Apply auto layout - TODO')
}

function resetPositions() {
  // Clear all conceptMap positions
  documentStore.nodes.forEach(node => {
    node.views.conceptMap = { position: null, size: null }
  })
  console.log('[ConceptMapDevTools] Reset all positions')
}
</script>

<style scoped>
.dev-tools-section {
  padding: 8px 0;
}
</style>

