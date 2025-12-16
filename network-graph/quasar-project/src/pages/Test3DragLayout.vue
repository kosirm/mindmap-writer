<template>
  <q-page class="column">
    <div class="q-pa-md">
      <h5 class="q-my-sm">Test 3: Drag with Custom Layout</h5>
      <p class="text-caption">Test node dragging - positions update reactively</p>
      <div class="q-mt-sm">
        <q-btn color="primary" label="Reset Layout" @click="resetLayout" size="sm" />
        <q-btn color="secondary" label="Random Layout" @click="randomLayout" size="sm" class="q-ml-sm" />
      </div>
    </div>

    <div class="graph-container">
      <v-network-graph
        :nodes="nodes"
        :edges="edges"
        :configs="configs"
        v-model:layouts="layouts"
      >
        <template #override-node="{ nodeId, scale }">
          <rect
            :x="-30 * scale"
            :y="-20 * scale"
            :width="60 * scale"
            :height="40 * scale"
            :rx="8 * scale"
            fill="white"
            stroke="#4dabf7"
            :stroke-width="1 * scale"
          />
          <text
            text-anchor="middle"
            dominant-baseline="central"
            :font-size="11 * scale"
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

// Store initial layout for reset
const initialLayouts = ref<{ [key: string]: { x: number; y: number } }>({})

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
      type: 'rect',
      width: 60,
      height: 40,
      borderRadius: 8,
      color: '#ffffff',
      strokeWidth: 1,
      strokeColor: '#4dabf7',
    },
    hover: {
      strokeColor: '#339af0',
      strokeWidth: 2,
    },
    label: {
      visible: false,
    },
  },
  edge: {
    normal: {
      color: '#adb5bd',
      width: 2,
    },
  },
})

// Generate nodes
function generateNodes() {
  const newNodes: vNG.Nodes = {}
  const newEdges: vNG.Edges = {}
  const newLayouts: { [key: string]: { x: number; y: number } } = {}

  // Create a simple tree
  newNodes['n1'] = { name: 'Node 1' }
  newLayouts['n1'] = { x: 0, y: 0 }

  newNodes['n2'] = { name: 'Node 2' }
  newLayouts['n2'] = { x: -150, y: 100 }
  newEdges['e1-2'] = { source: 'n1', target: 'n2' }

  newNodes['n3'] = { name: 'Node 3' }
  newLayouts['n3'] = { x: 150, y: 100 }
  newEdges['e1-3'] = { source: 'n1', target: 'n3' }

  newNodes['n4'] = { name: 'Node 4' }
  newLayouts['n4'] = { x: -250, y: 200 }
  newEdges['e2-4'] = { source: 'n2', target: 'n4' }

  newNodes['n5'] = { name: 'Node 5' }
  newLayouts['n5'] = { x: -50, y: 200 }
  newEdges['e2-5'] = { source: 'n2', target: 'n5' }

  newNodes['n6'] = { name: 'Node 6' }
  newLayouts['n6'] = { x: 50, y: 200 }
  newEdges['e3-6'] = { source: 'n3', target: 'n6' }

  newNodes['n7'] = { name: 'Node 7' }
  newLayouts['n7'] = { x: 250, y: 200 }
  newEdges['e3-7'] = { source: 'n3', target: 'n7' }

  nodes.value = newNodes
  edges.value = newEdges
  layouts.value = { nodes: newLayouts }
  initialLayouts.value = JSON.parse(JSON.stringify(newLayouts))
}

function resetLayout() {
  layouts.value = { nodes: JSON.parse(JSON.stringify(initialLayouts.value)) }
}

function randomLayout() {
  const newLayouts: { [key: string]: { x: number; y: number } } = {}
  Object.keys(nodes.value).forEach(nodeId => {
    newLayouts[nodeId] = {
      x: Math.random() * 600 - 300,
      y: Math.random() * 400 - 200,
    }
  })
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

