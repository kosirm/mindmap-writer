<template>
  <q-page class="column">
    <div class="q-pa-md">
      <h5 class="q-my-sm">Test 1: Basic Rendering (50 nodes)</h5>
      <p class="text-caption">Testing basic v-network-graph functionality with 50 nodes</p>
    </div>

    <div class="graph-container">
      <v-network-graph
        :nodes="nodes"
        :edges="edges"
        :layouts="layouts"
        :configs="configs"
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
      radius: 16,
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

// Generate 50 nodes in a tree structure
function generateNodes() {
  const nodeCount = 50
  const newNodes: vNG.Nodes = {}
  const newEdges: vNG.Edges = {}
  const newLayouts: { [key: string]: { x: number; y: number } } = {}

  // Create root node
  newNodes['node-0'] = { name: 'Root' }
  newLayouts['node-0'] = { x: 0, y: 0 }

  // Create child nodes in a tree structure
  let nodeId = 1
  const levels = 4 // 4 levels deep
  const childrenPerNode = 3

  function createChildren(parentId: string, level: number, parentX: number, parentY: number) {
    if (level >= levels || nodeId >= nodeCount) return

    const levelSpacing = 200
    const horizontalSpacing = 300 / Math.pow(2, level)

    for (let i = 0; i < childrenPerNode && nodeId < nodeCount; i++) {
      const childId = `node-${nodeId}`
      newNodes[childId] = { name: `Node ${nodeId}` }

      // Position children horizontally spread
      const offsetX = (i - (childrenPerNode - 1) / 2) * horizontalSpacing
      newLayouts[childId] = {
        x: parentX + offsetX,
        y: parentY + levelSpacing,
      }

      // Create edge from parent to child
      newEdges[`edge-${parentId}-${childId}`] = {
        source: parentId,
        target: childId,
      }

      nodeId++

      // Recursively create children
      createChildren(childId, level + 1, parentX + offsetX, parentY + levelSpacing)
    }
  }

  createChildren('node-0', 0, 0, 0)

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

