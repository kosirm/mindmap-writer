<template>
  <q-page class="column">
    <div class="q-pa-md">
      <h5 class="q-my-sm">Test 8: Collapse/Expand Simulation</h5>
      <p class="text-caption">Click nodes to collapse/expand their children</p>
      <div class="q-mt-sm row q-gutter-sm">
        <q-btn color="primary" label="Expand All" @click="expandAll" size="sm" />
        <q-btn color="secondary" label="Collapse All" @click="collapseAll" size="sm" />
        <div class="q-ml-md self-center">
          <strong>Visible Nodes:</strong> {{ Object.keys(visibleNodes).length }} / {{ Object.keys(allNodes).length }}
        </div>
      </div>
    </div>

    <div class="graph-container">
      <v-network-graph
        :nodes="visibleNodes"
        :edges="visibleEdges"
        :layouts="layouts"
        :configs="configs"
        :event-handlers="eventHandlers"
      >
        <template #override-node="{ nodeId, scale }">
          <circle
            :r="20 * scale"
            fill="white"
            stroke="#4dabf7"
            :stroke-width="2 * scale"
          />
          <text
            text-anchor="middle"
            dominant-baseline="central"
            :font-size="11 * scale"
            fill="#333"
          >
            {{ visibleNodes[nodeId]?.name }}
          </text>
          <!-- Collapse indicator -->
          <circle
            v-if="hasCollapsedChildren(nodeId)"
            :cx="15 * scale"
            :cy="-15 * scale"
            :r="8 * scale"
            fill="#ff6b6b"
            stroke="white"
            :stroke-width="1 * scale"
          />
          <text
            v-if="hasCollapsedChildren(nodeId)"
            :x="15 * scale"
            :y="-15 * scale"
            text-anchor="middle"
            dominant-baseline="central"
            :font-size="10 * scale"
            fill="white"
            font-weight="bold"
          >
            {{ getCollapsedChildCount(nodeId) }}
          </text>
        </template>
      </v-network-graph>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import * as vNG from 'v-network-graph'

// All nodes and edges (full graph)
const allNodes = ref<vNG.Nodes>({})
const allEdges = ref<vNG.Edges>({})
const layouts = ref<vNG.Layouts>({ nodes: {} })

// Collapsed state
const collapsedNodes = ref<Set<string>>(new Set())

// Node hierarchy
const nodeChildren = ref<Map<string, string[]>>(new Map())

// Visible nodes and edges (filtered based on collapse state)
const visibleNodes = computed(() => {
  const visible: vNG.Nodes = {}
  const hiddenNodes = new Set<string>()

  // Find all hidden nodes (descendants of collapsed nodes)
  function hideDescendants(nodeId: string) {
    const children = nodeChildren.value.get(nodeId) || []
    children.forEach(childId => {
      hiddenNodes.add(childId)
      hideDescendants(childId)
    })
  }

  collapsedNodes.value.forEach(nodeId => {
    hideDescendants(nodeId)
  })

  // Include only visible nodes
  Object.keys(allNodes.value).forEach(nodeId => {
    if (!hiddenNodes.has(nodeId)) {
      const node = allNodes.value[nodeId]
      if (node) {
        visible[nodeId] = node
      }
    }
  })

  return visible
})

const visibleEdges = computed(() => {
  const visible: vNG.Edges = {}
  const visibleNodeIds = new Set(Object.keys(visibleNodes.value))

  Object.keys(allEdges.value).forEach(edgeId => {
    const edge = allEdges.value[edgeId]
    if (edge && visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)) {
      visible[edgeId] = edge
    }
  })

  return visible
})

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
      radius: 20,
      color: '#ffffff',
      strokeWidth: 2,
      strokeColor: '#4dabf7',
    },
    hover: {
      strokeColor: '#339af0',
      strokeWidth: 3,
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

// Event handlers
const eventHandlers: vNG.EventHandlers = {
  'node:click': ({ node }) => {
    toggleCollapse(node)
  },
}

function toggleCollapse(nodeId: string) {
  if (collapsedNodes.value.has(nodeId)) {
    collapsedNodes.value.delete(nodeId)
  } else {
    collapsedNodes.value.add(nodeId)
  }
  // Trigger reactivity
  collapsedNodes.value = new Set(collapsedNodes.value)
}

function hasCollapsedChildren(nodeId: string): boolean {
  return collapsedNodes.value.has(nodeId) && (nodeChildren.value.get(nodeId)?.length || 0) > 0
}

function getCollapsedChildCount(nodeId: string): number {
  if (!collapsedNodes.value.has(nodeId)) return 0

  let count = 0
  function countDescendants(id: string) {
    const children = nodeChildren.value.get(id) || []
    count += children.length
    children.forEach(childId => countDescendants(childId))
  }
  countDescendants(nodeId)
  return count
}

function expandAll() {
  collapsedNodes.value.clear()
  collapsedNodes.value = new Set()
}

function collapseAll() {
  // Collapse all nodes that have children
  const toCollapse = new Set<string>()
  nodeChildren.value.forEach((children, nodeId) => {
    if (children.length > 0) {
      toCollapse.add(nodeId)
    }
  })
  collapsedNodes.value = toCollapse
}

// Generate tree structure
function generateTree() {
  const newNodes: vNG.Nodes = {}
  const newEdges: vNG.Edges = {}
  const newLayouts: { [key: string]: { x: number; y: number } } = {}
  const children = new Map<string, string[]>()

  // Create root
  newNodes['n0'] = { name: 'Root' }
  newLayouts['n0'] = { x: 0, y: 0 }
  children.set('n0', [])

  let nodeId = 1
  const levels = 4
  const childrenPerNode = 3

  function createChildren(parentId: string, level: number, parentX: number, parentY: number) {
    if (level >= levels) return

    const levelSpacing = 150
    const horizontalSpacing = 400 / Math.pow(2, level)
    const childIds: string[] = []

    for (let i = 0; i < childrenPerNode; i++) {
      const id = `n${nodeId}`
      newNodes[id] = { name: `N${nodeId}` }

      const offsetX = (i - (childrenPerNode - 1) / 2) * horizontalSpacing
      newLayouts[id] = {
        x: parentX + offsetX,
        y: parentY + levelSpacing,
      }

      newEdges[`e${parentId}-${id}`] = {
        source: parentId,
        target: id,
      }

      childIds.push(id)
      children.set(id, [])
      nodeId++

      createChildren(id, level + 1, parentX + offsetX, parentY + levelSpacing)
    }

    children.set(parentId, childIds)
  }

  createChildren('n0', 0, 0, 0)

  allNodes.value = newNodes
  allEdges.value = newEdges
  layouts.value = { nodes: newLayouts }
  nodeChildren.value = children
}

generateTree()
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

