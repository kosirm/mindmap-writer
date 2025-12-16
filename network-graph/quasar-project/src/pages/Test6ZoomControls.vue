<template>
  <q-page class="column">
    <div class="q-pa-md">
      <h5 class="q-my-sm">Test 6: Zoom/Fit Controls</h5>
      <p class="text-caption">Test zoom controls and fit-to-content functionality</p>
      <div class="q-mt-sm row q-gutter-sm">
        <q-btn color="primary" icon="zoom_in" label="Zoom In" @click="zoomIn" size="sm" />
        <q-btn color="primary" icon="zoom_out" label="Zoom Out" @click="zoomOut" size="sm" />
        <q-btn color="secondary" icon="fit_screen" label="Fit to Content" @click="fitToContent" size="sm" />
        <q-btn color="secondary" icon="center_focus_strong" label="Pan to Center" @click="panToCenter" size="sm" />
        <div class="q-ml-md self-center">
          <strong>Zoom:</strong> {{ (zoomLevel * 100).toFixed(0) }}%
        </div>
      </div>
    </div>

    <div class="graph-container">
      <v-network-graph
        ref="graphRef"
        :nodes="nodes"
        :edges="edges"
        :layouts="layouts"
        :configs="configs"
        v-model:zoom-level="zoomLevel"
      />

      <!-- Floating zoom controls -->
      <div class="zoom-controls">
        <q-btn round dense color="primary" icon="add" @click="zoomIn" size="sm" class="q-mb-xs" />
        <q-btn round dense color="primary" icon="remove" @click="zoomOut" size="sm" class="q-mb-xs" />
        <q-btn round dense color="secondary" icon="fit_screen" @click="fitToContent" size="sm" />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import * as vNG from 'v-network-graph'

const graphRef = ref()
const zoomLevel = ref(1)

// Define nodes
const nodes = ref<vNG.Nodes>({})
const edges = ref<vNG.Edges>({})
const layouts = ref<vNG.Layouts>({ nodes: {} })

// Configuration
const configs = vNG.defineConfigs({
  view: {
    autoPanAndZoomOnLoad: 'fit-content',
    minZoomLevel: 0.1,
    maxZoomLevel: 8,
    zoomEnabled: true,
    panEnabled: true,
  },
  node: {
    draggable: true,
    normal: {
      type: 'circle',
      radius: 20,
      color: '#4dabf7',
    },
    hover: {
      color: '#339af0',
    },
    label: {
      visible: true,
      fontSize: 11,
    },
  },
  edge: {
    normal: {
      color: '#adb5bd',
      width: 2,
    },
  },
})

// Zoom controls
function zoomIn() {
  if (graphRef.value) {
    graphRef.value.zoomIn()
  }
}

function zoomOut() {
  if (graphRef.value) {
    graphRef.value.zoomOut()
  }
}

function fitToContent() {
  if (graphRef.value) {
    graphRef.value.fitToContents({ margin: 50 })
  }
}

function panToCenter() {
  if (graphRef.value) {
    graphRef.value.panToCenter()
  }
}

// Generate sample graph
function generateGraph() {
  const newNodes: vNG.Nodes = {}
  const newEdges: vNG.Edges = {}
  const newLayouts: { [key: string]: { x: number; y: number } } = {}

  // Create a scattered layout
  newNodes['center'] = { name: 'Center' }
  newLayouts['center'] = { x: 0, y: 0 }

  // Create nodes in different areas
  const areas = [
    { x: -400, y: -300, count: 5 },
    { x: 400, y: -300, count: 5 },
    { x: -400, y: 300, count: 5 },
    { x: 400, y: 300, count: 5 },
  ]

  let nodeId = 1
  areas.forEach((area) => {
    for (let i = 0; i < area.count; i++) {
      const id = `n${nodeId}`
      newNodes[id] = { name: `Node ${nodeId}` }
      newLayouts[id] = {
        x: area.x + (Math.random() - 0.5) * 100,
        y: area.y + (Math.random() - 0.5) * 100,
      }

      // Connect to center or previous node
      if (i === 0) {
        newEdges[`e-center-${id}`] = { source: 'center', target: id }
      } else {
        newEdges[`e-${nodeId - 1}-${nodeId}`] = { source: `n${nodeId - 1}`, target: id }
      }

      nodeId++
    }
  })

  nodes.value = newNodes
  edges.value = newEdges
  layouts.value = { nodes: newLayouts }
}

generateGraph()
</script>

<style scoped>
.q-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.graph-container {
  position: relative;
  flex: 1;
  width: 100%;
  border: 1px solid #e0e0e0;
  min-height: 0;
}

.zoom-controls {
  position: absolute;
  top: 16px;
  left: 16px;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 4px;
  padding: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
</style>

