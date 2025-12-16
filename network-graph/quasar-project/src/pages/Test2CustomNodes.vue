<template>
  <q-page class="column">
    <div class="q-pa-md">
      <h5 class="q-my-sm">Test 2: Custom SVG Nodes</h5>
      <p class="text-caption">Custom node rendering styled like MindScribble nodes</p>
    </div>

    <div class="graph-container">
      <v-network-graph
        :nodes="nodes"
        :edges="edges"
        :layouts="layouts"
        :configs="configs"
      >
        <!-- Custom node rendering using override-node slot -->
        <template #override-node="{ nodeId, scale, config }">
          <circle
            :r="config.radius * scale"
            fill="white"
            stroke="#4dabf7"
            :stroke-width="1 * scale"
          />
          <text
            text-anchor="middle"
            dominant-baseline="central"
            :font-size="12 * scale"
            fill="#333"
          >
            {{ nodes[nodeId]?.name }}
          </text>
        </template>
      </v-network-graph>
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

// Configuration
const configs = vNG.defineConfigs({
  view: {
    autoPanAndZoomOnLoad: 'fit-content',
    minZoomLevel: 0.1,
    maxZoomLevel: 8,
  },
  node: {
    normal: {
      type: 'circle',
      radius: 40,
      color: '#ffffff',
      strokeWidth: 1,
      strokeColor: '#4dabf7',
    },
    hover: {
      strokeColor: '#339af0',
      strokeWidth: 2,
    },
    label: {
      visible: false, // We'll render labels in the custom template
    },
  },
  edge: {
    normal: {
      color: '#adb5bd',
      width: 2,
    },
  },
})

// Generate nodes in a mindmap-like structure
function generateNodes() {
  const newNodes: vNG.Nodes = {}
  const newEdges: vNG.Edges = {}
  const newLayouts: { [key: string]: { x: number; y: number } } = {}

  // Create root node
  newNodes['root'] = { name: 'Root Idea' }
  newLayouts['root'] = { x: 0, y: 0 }

  // Create left branch
  const leftNodes = ['Concept A', 'Concept B', 'Concept C']
  leftNodes.forEach((name, i) => {
    const id = `left-${i}`
    newNodes[id] = { name }
    newLayouts[id] = { x: -250, y: (i - 1) * 150 }
    newEdges[`edge-root-${id}`] = { source: 'root', target: id }
  })

  // Create right branch
  const rightNodes = ['Idea 1', 'Idea 2', 'Idea 3']
  rightNodes.forEach((name, i) => {
    const id = `right-${i}`
    newNodes[id] = { name }
    newLayouts[id] = { x: 250, y: (i - 1) * 150 }
    newEdges[`edge-root-${id}`] = { source: 'root', target: id }
  })

  // Add some child nodes
  newNodes['left-0-child'] = { name: 'Detail A1' }
  newLayouts['left-0-child'] = { x: -450, y: -150 }
  newEdges['edge-left-0-child'] = { source: 'left-0', target: 'left-0-child' }

  newNodes['right-0-child'] = { name: 'Detail 1a' }
  newLayouts['right-0-child'] = { x: 450, y: -150 }
  newEdges['edge-right-0-child'] = { source: 'right-0', target: 'right-0-child' }

  nodes.value = newNodes
  edges.value = newEdges
  layouts.value = { nodes: newLayouts }
}

// Generate nodes on mount
generateNodes()
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

