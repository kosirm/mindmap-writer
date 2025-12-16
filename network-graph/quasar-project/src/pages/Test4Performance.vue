<template>
  <q-page class="column">
    <div class="q-pa-md">
      <h5 class="q-my-sm">Test 4: Performance Test (500 nodes)</h5>
      <p class="text-caption">Measure FPS during drag operations with 500 nodes</p>
      <div class="q-mt-sm row q-gutter-sm items-center">
        <q-btn color="primary" label="Generate 500 Nodes" @click="generate500Nodes" size="sm" />
        <q-btn color="secondary" label="Clear" @click="clearNodes" size="sm" />
        <div class="q-ml-md">
          <strong>FPS:</strong> {{ currentFPS.toFixed(1) }}
          <span class="q-ml-md"><strong>Nodes:</strong> {{ Object.keys(nodes).length }}</span>
          <span class="q-ml-md"><strong>Edges:</strong> {{ Object.keys(edges).length }}</span>
        </div>
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
import * as vNG from 'v-network-graph'

// Define nodes
const nodes = ref<vNG.Nodes>({})

// Define edges
const edges = ref<vNG.Edges>({})

// Define layouts (positions)
const layouts = ref<vNG.Layouts>({
  nodes: {}
})

// FPS tracking
const currentFPS = ref(60)
let lastFrameTime = performance.now()
let frameCount = 0
let fpsInterval: number | null = null

// Configuration
const configs = vNG.defineConfigs({
  view: {
    autoPanAndZoomOnLoad: 'fit-content',
    minZoomLevel: 0.05,
    maxZoomLevel: 4,
  },
  node: {
    draggable: true,
    normal: {
      type: 'circle',
      radius: 8,
      color: '#4dabf7',
    },
    hover: {
      color: '#339af0',
    },
    label: {
      visible: false,
    },
  },
  edge: {
    normal: {
      color: '#dee2e6',
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

// Generate 500 nodes
function generate500Nodes() {
  const nodeCount = 500
  const newNodes: vNG.Nodes = {}
  const newEdges: vNG.Edges = {}
  const newLayouts: { [key: string]: { x: number; y: number } } = {}

  // Create root
  newNodes['node-0'] = { name: 'Root' }
  newLayouts['node-0'] = { x: 0, y: 0 }

  // Create tree structure
  let nodeId = 1
  const levels = 6
  const childrenPerNode = 4

  function createChildren(parentId: string, level: number, parentX: number, parentY: number, angle: number, spread: number) {
    if (level >= levels || nodeId >= nodeCount) return

    const radius = 150 + level * 100
    const angleStep = spread / childrenPerNode

    for (let i = 0; i < childrenPerNode && nodeId < nodeCount; i++) {
      const childId = `node-${nodeId}`
      newNodes[childId] = { name: `N${nodeId}` }

      const childAngle = angle - spread / 2 + angleStep * i + angleStep / 2
      const x = parentX + radius * Math.cos(childAngle)
      const y = parentY + radius * Math.sin(childAngle)

      newLayouts[childId] = { x, y }
      newEdges[`edge-${parentId}-${childId}`] = {
        source: parentId,
        target: childId,
      }

      nodeId++
      createChildren(childId, level + 1, x, y, childAngle, spread / 2)
    }
  }

  createChildren('node-0', 0, 0, 0, 0, Math.PI * 2)

  nodes.value = newNodes
  edges.value = newEdges
  layouts.value = { nodes: newLayouts }
}

function clearNodes() {
  nodes.value = {}
  edges.value = {}
  layouts.value = { nodes: {} }
  currentFPS.value = 60
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

