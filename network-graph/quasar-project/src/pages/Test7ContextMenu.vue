<template>
  <q-page class="column">
    <div class="q-pa-md">
      <h5 class="q-my-sm">Test 7: Context Menu</h5>
      <p class="text-caption">Right-click on nodes or canvas to open context menu</p>
      <div class="q-mt-sm">
        <q-chip color="primary" text-color="white" size="sm">
          Last action: {{ lastAction }}
        </q-chip>
      </div>
    </div>

    <div class="graph-container">
      <v-network-graph
        :nodes="nodes"
        :edges="edges"
        :layouts="layouts"
        :configs="configs"
        :event-handlers="eventHandlers"
      />

      <!-- Node Context Menu -->
      <q-menu
        v-model="nodeMenuVisible"
        :target="nodeMenuTarget"
        context-menu
      >
        <q-list style="min-width: 200px">
          <q-item clickable v-close-popup @click="editNode">
            <q-item-section avatar>
              <q-icon name="edit" />
            </q-item-section>
            <q-item-section>Edit Node</q-item-section>
          </q-item>
          <q-item clickable v-close-popup @click="addChildNode">
            <q-item-section avatar>
              <q-icon name="add_circle" />
            </q-item-section>
            <q-item-section>Add Child</q-item-section>
          </q-item>
          <q-separator />
          <q-item clickable v-close-popup @click="deleteNode">
            <q-item-section avatar>
              <q-icon name="delete" color="negative" />
            </q-item-section>
            <q-item-section>Delete Node</q-item-section>
          </q-item>
        </q-list>
      </q-menu>

      <!-- Canvas Context Menu -->
      <q-menu
        v-model="canvasMenuVisible"
        :target="canvasMenuTarget"
        context-menu
      >
        <q-list style="min-width: 200px">
          <q-item clickable v-close-popup @click="addNodeAtPosition">
            <q-item-section avatar>
              <q-icon name="add" />
            </q-item-section>
            <q-item-section>Add Node Here</q-item-section>
          </q-item>
          <q-item clickable v-close-popup @click="fitToContent">
            <q-item-section avatar>
              <q-icon name="fit_screen" />
            </q-item-section>
            <q-item-section>Fit to Content</q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import * as vNG from 'v-network-graph'
import { useQuasar } from 'quasar'

const $q = useQuasar()

// Context menu state
const nodeMenuVisible = ref(false)
const nodeMenuTarget = ref<HTMLElement | undefined>(undefined)
const canvasMenuVisible = ref(false)
const canvasMenuTarget = ref<HTMLElement | undefined>(undefined)
const selectedNodeId = ref<string | null>(null)
const contextMenuPosition = ref({ x: 0, y: 0 })
const lastAction = ref('None')

// Define nodes
const nodes = ref<vNG.Nodes>({})
const edges = ref<vNG.Edges>({})
const layouts = ref<vNG.Layouts>({ nodes: {} })
let nodeCounter = 0

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

// Event handlers
const eventHandlers: vNG.EventHandlers = {
  'node:contextmenu': ({ node, event }) => {
    event.preventDefault()
    selectedNodeId.value = node
    nodeMenuTarget.value = event.target as HTMLElement
    nodeMenuVisible.value = true
    lastAction.value = `Context menu on ${nodes.value[node]?.name || node}`
  },
  'view:contextmenu': ({ event }) => {
    event.preventDefault()
    contextMenuPosition.value = { x: event.clientX, y: event.clientY }
    canvasMenuTarget.value = event.target as HTMLElement
    canvasMenuVisible.value = true
    lastAction.value = 'Context menu on canvas'
  },
}

// Context menu actions
function editNode() {
  if (selectedNodeId.value) {
    const nodeName = nodes.value[selectedNodeId.value]?.name || selectedNodeId.value
    lastAction.value = `Edit ${nodeName}`
    $q.notify({
      type: 'info',
      message: `Editing ${nodeName}`,
      timeout: 1000,
    })
  }
}

function addChildNode() {
  if (selectedNodeId.value) {
    const parentId = selectedNodeId.value
    const parentPos = layouts.value.nodes[parentId]

    if (!parentPos) return

    const newId = `node-${++nodeCounter}`

    nodes.value[newId] = { name: `Node ${nodeCounter}` }
    layouts.value.nodes[newId] = {
      x: parentPos.x + 150,
      y: parentPos.y + 100,
    }
    edges.value[`edge-${parentId}-${newId}`] = {
      source: parentId,
      target: newId,
    }

    lastAction.value = `Added child to ${nodes.value[parentId]?.name || parentId}`
  }
}

function deleteNode() {
  if (selectedNodeId.value) {
    const nodeId = selectedNodeId.value
    lastAction.value = `Deleted ${nodes.value[nodeId]?.name || nodeId}`

    // Delete edges connected to this node
    Object.keys(edges.value).forEach(edgeId => {
      const edge = edges.value[edgeId]
      if (edge && (edge.source === nodeId || edge.target === nodeId)) {
        delete edges.value[edgeId]
      }
    })

    // Delete node
    delete nodes.value[nodeId]
    delete layouts.value.nodes[nodeId]
  }
}

function addNodeAtPosition() {
  const newId = `node-${++nodeCounter}`
  nodes.value[newId] = { name: `Node ${nodeCounter}` }
  layouts.value.nodes[newId] = {
    x: Math.random() * 400 - 200,
    y: Math.random() * 300 - 150,
  }
  lastAction.value = `Added ${nodes.value[newId].name}`
}

function fitToContent() {
  lastAction.value = 'Fit to content'
}

// Generate initial graph
function generateGraph() {
  const newNodes: vNG.Nodes = {}
  const newEdges: vNG.Edges = {}
  const newLayouts: { [key: string]: { x: number; y: number } } = {}

  for (let i = 0; i <= 5; i++) {
    const id = `node-${i}`
    newNodes[id] = { name: `Node ${i}` }
    newLayouts[id] = {
      x: (i % 3) * 200 - 200,
      y: Math.floor(i / 3) * 150,
    }
    nodeCounter = i

    if (i > 0) {
      newEdges[`edge-${i}`] = {
        source: `node-${Math.floor((i - 1) / 2)}`,
        target: id,
      }
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
</style>

