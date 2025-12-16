<template>
  <q-page class="column">
    <div class="q-pa-md">
      <h5 class="q-my-sm">Test 5: Custom Minimap</h5>
      <p class="text-caption">Custom minimap overlay using absolute positioning</p>
      <div class="q-mt-sm">
        <q-toggle v-model="showMinimap" label="Show Minimap" />
      </div>
    </div>

    <div class="graph-container">
      <v-network-graph
        ref="graphRef"
        :nodes="nodes"
        :edges="edges"
        :configs="configs"
        v-model:layouts="layouts"
        :event-handlers="eventHandlers"
      />

      <!-- Custom Minimap Overlay -->
      <div v-if="showMinimap" class="minimap-overlay">
        <svg :width="minimapWidth" :height="minimapHeight" class="minimap-svg">
          <!-- Background -->
          <rect :width="minimapWidth" :height="minimapHeight" fill="#f8f9fa" stroke="#dee2e6" stroke-width="1" />

          <!-- Edges -->
          <line
            v-for="(edge, edgeId) in edges"
            :key="edgeId"
            :x1="getMinimapX(layouts.nodes[edge.source]?.x || 0)"
            :y1="getMinimapY(layouts.nodes[edge.source]?.y || 0)"
            :x2="getMinimapX(layouts.nodes[edge.target]?.x || 0)"
            :y2="getMinimapY(layouts.nodes[edge.target]?.y || 0)"
            stroke="#dee2e6"
            stroke-width="1"
          />

          <!-- Nodes -->
          <circle
            v-for="(node, nodeId) in nodes"
            :key="nodeId"
            :cx="getMinimapX(layouts.nodes[nodeId]?.x || 0)"
            :cy="getMinimapY(layouts.nodes[nodeId]?.y || 0)"
            r="2"
            fill="#4dabf7"
          />

          <!-- Viewport indicator -->
          <rect
            :x="viewportRect.x"
            :y="viewportRect.y"
            :width="viewportRect.width"
            :height="viewportRect.height"
            fill="rgba(77, 171, 247, 0.2)"
            stroke="#4dabf7"
            stroke-width="1"
          />
        </svg>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import * as vNG from 'v-network-graph'

const graphRef = ref()
const showMinimap = ref(true)

// Minimap dimensions
const minimapWidth = 200
const minimapHeight = 150

// Define nodes
const nodes = ref<vNG.Nodes>({})
const edges = ref<vNG.Edges>({})
const layouts = ref<vNG.Layouts>({ nodes: {} })

// Viewport tracking
const viewBox = ref({ top: 0, bottom: 0, left: 0, right: 0 })

// Configuration
const configs = vNG.defineConfigs({
  view: {
    autoPanAndZoomOnLoad: 'fit-content',
    minZoomLevel: 0.1,
    maxZoomLevel: 8,
  },
  node: {
    draggable: true,
    normal: {
      type: 'circle',
      radius: 16,
      color: '#4dabf7',
    },
    label: { visible: true, fontSize: 10 },
  },
  edge: {
    normal: { color: '#adb5bd', width: 2 },
  },
})

// Event handlers
const eventHandlers: vNG.EventHandlers = {
  'view:pan': updateViewport,
  'view:zoom': updateViewport,
}

function updateViewport() {
  if (graphRef.value) {
    viewBox.value = graphRef.value.getViewBox()
  }
}

// Calculate bounds of all nodes
const graphBounds = computed(() => {
  let minX = Infinity, maxX = -Infinity
  let minY = Infinity, maxY = -Infinity

  Object.values(layouts.value.nodes).forEach((pos) => {
    minX = Math.min(minX, pos.x)
    maxX = Math.max(maxX, pos.x)
    minY = Math.min(minY, pos.y)
    maxY = Math.max(maxY, pos.y)
  })

  const padding = 50
  return {
    minX: minX - padding,
    maxX: maxX + padding,
    minY: minY - padding,
    maxY: maxY + padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  }
})

// Convert graph coordinates to minimap coordinates
function getMinimapX(x: number): number {
  const bounds = graphBounds.value
  return ((x - bounds.minX) / bounds.width) * minimapWidth
}

function getMinimapY(y: number): number {
  const bounds = graphBounds.value
  return ((y - bounds.minY) / bounds.height) * minimapHeight
}

// Viewport rectangle in minimap coordinates
const viewportRect = computed(() => {
  const bounds = graphBounds.value
  const vb = viewBox.value

  return {
    x: ((vb.left - bounds.minX) / bounds.width) * minimapWidth,
    y: ((vb.top - bounds.minY) / bounds.height) * minimapHeight,
    width: ((vb.right - vb.left) / bounds.width) * minimapWidth,
    height: ((vb.bottom - vb.top) / bounds.height) * minimapHeight,
  }
})

// Generate sample graph
function generateGraph() {
  const newNodes: vNG.Nodes = {}
  const newEdges: vNG.Edges = {}
  const newLayouts: { [key: string]: { x: number; y: number } } = {}

  for (let i = 0; i < 30; i++) {
    const id = `n${i}`
    newNodes[id] = { name: `N${i}` }
    newLayouts[id] = {
      x: Math.cos(i * 0.5) * (100 + i * 20),
      y: Math.sin(i * 0.5) * (100 + i * 20),
    }

    if (i > 0) {
      newEdges[`e${i}`] = { source: `n${Math.floor(i / 3)}`, target: id }
    }
  }

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

.minimap-overlay {
  position: absolute;
  bottom: 16px;
  right: 16px;
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  pointer-events: none;
}

.minimap-svg {
  display: block;
}
</style>

