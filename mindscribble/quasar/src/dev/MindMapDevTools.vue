<template>
  <div class="dev-tools-section">
    <div class="text-subtitle1 q-mb-sm">
      <q-icon name="account_tree" class="q-mr-sm" />
      MindMap
    </div>

    <!-- Orientation -->
    <div class="text-caption q-mb-xs">Orientation</div>
    <q-btn-group spread class="q-mb-sm">
      <q-btn
        v-for="mode in orientationStore.orientations"
        :key="mode"
        :icon="orientationStore.orientationIcons[mode]"
        :color="orientationStore.orientation === mode ? 'primary' : undefined"
        :outline="orientationStore.orientation !== mode"
        size="sm"
        @click="orientationStore.setOrientation(mode)"
      >
        <q-tooltip>{{ orientationStore.orientationLabels[mode] }}</q-tooltip>
      </q-btn>
    </q-btn-group>
    <div class="text-caption text-grey q-mb-sm">
      Current: {{ orientationStore.currentLabel }}
    </div>

    <q-separator class="q-my-sm" />

    <!-- Basic Actions -->
    <q-btn
      outline
      size="sm"
      label="Add Root Node"
      icon="add"
      class="full-width q-mb-xs"
      @click="addRootNode"
    />
    <q-btn
      outline
      size="sm"
      label="Generate Test Data (10)"
      icon="data_object"
      class="full-width q-mb-xs"
      @click="generateTestData(10)"
    />
    <q-btn
      outline
      size="sm"
      label="Clear All Nodes"
      icon="delete_sweep"
      color="negative"
      class="full-width q-mb-sm"
      @click="clearAllNodes"
    />

    <q-separator class="q-my-sm" />

    <!-- Stress Test -->
    <div class="text-caption q-mb-xs">Stress Test</div>
    <div class="row q-gutter-xs q-mb-sm">
      <q-btn size="xs" outline label="50" @click="generateTestData(50)" />
      <q-btn size="xs" outline label="100" @click="generateTestData(100)" />
      <q-btn size="xs" outline label="500" @click="generateTestData(500)" />
      <q-btn size="xs" outline label="1K" @click="generateTestData(1000)" />
    </div>

    <q-separator class="q-my-sm" />

    <!-- Stats -->
    <div class="text-caption">
      <div>Total Nodes: {{ stats.totalNodes }}</div>
      <div>Root Nodes: {{ stats.rootNodes }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDocumentStore } from 'src/core/stores/documentStore'
import { useOrientationStore } from 'src/core/stores/orientationStore'

const documentStore = useDocumentStore()
const orientationStore = useOrientationStore()

const stats = computed(() => ({
  totalNodes: documentStore.nodes.length,
  rootNodes: documentStore.nodes.filter(n => n.data.parentId === null).length
}))

function addRootNode() {
  documentStore.addNode(null, 'New Root', '', { x: 0, y: 0 })
}

function generateTestData(count: number) {
  // Generate hierarchical test data
  const rootCount = Math.max(1, Math.floor(count / 10))

  for (let i = 0; i < rootCount; i++) {
    const root = documentStore.addNode(null, `Root ${i + 1}`, '', { x: i * 300, y: 0 })
    const childCount = Math.floor((count - rootCount) / rootCount / 2)

    for (let j = 0; j < childCount; j++) {
      const child = documentStore.addNode(root.id, `Child ${j + 1}`, '', { x: 0, y: 0 })

      // Add some grandchildren
      const grandchildCount = Math.floor(childCount / 3)
      for (let k = 0; k < grandchildCount; k++) {
        documentStore.addNode(child.id, `Grandchild ${k + 1}`, '', { x: 0, y: 0 })
      }
    }
  }
}

function clearAllNodes() {
  // Get all root nodes and delete them (cascade deletes children)
  const rootIds = documentStore.nodes
    .filter(n => n.data.parentId === null)
    .map(n => n.id)

  rootIds.forEach(id => documentStore.deleteNode(id, true))
}
</script>

<style scoped>
.dev-tools-section {
  padding: 8px 0;
}
</style>

