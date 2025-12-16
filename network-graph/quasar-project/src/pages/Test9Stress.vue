<template>
  <q-page class="column">
    <div class="q-pa-md">
      <h5 class="q-my-sm">Test 9: Stress Test</h5>
      <p class="text-caption text-negative">⚠️ Stress test - test incrementally to find performance limits</p>
      <div class="q-mt-sm row q-gutter-sm items-center">
        <q-btn color="primary" label="100 Nodes" @click="() => generateNodes(100)" size="sm" :loading="generating" />
        <q-btn color="orange" label="500 Nodes" @click="() => generateNodes(500)" size="sm" :loading="generating" />
        <q-btn color="negative" label="1000 Nodes" @click="() => generateNodes(1000)" size="sm" :loading="generating" />
        <q-btn color="secondary" label="Clear" @click="clearNodes" size="sm" />
        <div class="q-ml-md">
          <strong>FPS:</strong> {{ currentFPS.toFixed(1) }}
          <span class="q-ml-md"><strong>Nodes:</strong> {{ Object.keys(nodes).length }}</span>
          <span class="q-ml-md"><strong>Edges:</strong> {{ Object.keys(edges).length }}</span>
        </div>
      </div>
      <div class="q-mt-sm">
        <q-linear-progress v-if="generating" :value="progress" color="negative" />
      </div>
    </div>

    <div class="graph-container">
      <v-network-graph
        :nodes="nodes"
        :edges="edges"
        :configs="configs"
        v-model:layouts="layouts"
        :event-handlers="eventHandlers"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import * as vNG from 'v-network-graph'

const $q = useQuasar()

// Define nodes
const nodes = ref<vNG.Nodes>({})
const edges = ref<vNG.Edges>({})
const layouts = ref<vNG.Layouts>({ nodes: {} })

// Generation state
const generating = ref(false)
const progress = ref(0)

// FPS tracking
const currentFPS = ref(60)
let lastFrameTime = performance.now()
let frameCount = 0
let fpsInterval: number | null = null

// Configuration
const configs = vNG.defineConfigs({
  view: {
    autoPanAndZoomOnLoad: 'fit-content',
    minZoomLevel: 0.01,
    maxZoomLevel: 4,
  },
  node: {
    draggable: true,
    normal: {
      type: 'circle',
      radius: 6,
      color: '#4dabf7',
    },
    hover: {
      color: '#ff6b6b',
      radius: 8,
    },
    label: {
      visible: false,
    },
  },
  edge: {
    normal: {
      color: '#e9ecef',
      width: 1,
    },
  },
})

// Event handlers for FPS measurement
const eventHandlers: vNG.EventHandlers = {
  'node:dragstart': () => {
    startFPSMeasurement()
  },
  'node:dragend': () => {
    stopFPSMeasurement()
  },
}

function startFPSMeasurement() {
  lastFrameTime = performance.now()
  frameCount = 0

  function measureFrame() {
    const now = performance.now()
    frameCount++

    const elapsed = now - lastFrameTime
    if (elapsed >= 1000) {
      currentFPS.value = (frameCount / elapsed) * 1000
      frameCount = 0
      lastFrameTime = now
    }

    fpsInterval = requestAnimationFrame(measureFrame)
  }

  fpsInterval = requestAnimationFrame(measureFrame)
}

function stopFPSMeasurement() {
  if (fpsInterval !== null) {
    cancelAnimationFrame(fpsInterval)
    fpsInterval = null
  }
}

// Generate nodes in small batches to avoid blocking UI
async function generateNodes(nodeCount: number) {
  generating.value = true
  progress.value = 0

  // Clear existing nodes first
  nodes.value = {}
  edges.value = {}
  layouts.value = { nodes: {} }

  const batchSize = 20 // Add 20 nodes at a time
  const cols = Math.ceil(Math.sqrt(nodeCount))
  const spacing = 150

  // Create root
  nodes.value['node-0'] = { name: 'Root' }
  layouts.value.nodes['node-0'] = { x: 0, y: 0 }

  // Generate nodes in small batches
  for (let i = 1; i <= nodeCount; i++) {
    const id = `node-${i}`

    // Add node
    nodes.value[id] = { name: `N${i}` }

    // Grid layout
    const row = Math.floor(i / cols)
    const col = i % cols
    layouts.value.nodes[id] = {
      x: col * spacing - (cols * spacing) / 2,
      y: row * spacing - (Math.ceil(nodeCount / cols) * spacing) / 2,
    }

    // Connect to previous node (creates a chain)
    const prevId = i === 1 ? 'node-0' : `node-${i - 1}`
    edges.value[`edge-${prevId}-${id}`] = {
      source: prevId,
      target: id,
    }

    // Update progress
    progress.value = i / nodeCount

    // Yield to browser every batchSize nodes
    if (i % batchSize === 0) {
      await new Promise(resolve => setTimeout(resolve, 0))
    }
  }

  generating.value = false
  progress.value = 1

  $q.notify({
    type: 'positive',
    message: `Generated ${nodeCount} nodes successfully!`,
    timeout: 2000,
  })
}

function clearNodes() {
  nodes.value = {}
  edges.value = {}
  layouts.value = { nodes: {} }
  currentFPS.value = 60
  progress.value = 0
}
</script>

<style scoped>
.q-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.graph-container {
  flex: 1;
  width: 100%;
  border: 1px solid #e0e0e0;
  min-height: 0;
}
</style>

