<template>
  <q-page class="column">
    <div class="q-pa-sm" style="background: #f5f5f5; border-bottom: 1px solid #ddd;">
      <div class="row items-center q-gutter-sm">

        <!-- Connection Controls -->
        <q-btn-toggle
          v-model="connectionType"
          :options="[
            { label: 'Hierarchy', value: 'hierarchy' },
            { label: 'Reference', value: 'reference' }
          ]"
          size="xs"
          dense
          no-caps
        />
        <q-btn size="xs" color="secondary" label="Connect (C)" @click="connectSelectedNodes" :disable="selectedNodes.length !== 2" dense flat />

        <q-separator vertical />

        <!-- Layout Controls -->
        <div class="text-caption">Box: Ctrl+Shift</div>
        <q-toggle v-model="d3ForceEnabled" label="D3 Force" size="xs" dense />

        <q-separator vertical />

        <div class="text-caption">Wheel Zoom: {{ wheelZoomSensitivity }}%</div>
        <q-slider v-model="wheelZoomSensitivity" :min="5" :max="80" :step="5" dense style="width: 100px;" @update:model-value="(val) => val !== null && updateZoomSensitivity(val)" />
        <q-toggle v-model="scalingObjects" label="Scale Objects" dense size="xs" @update:model-value="updateScalingObjects" />

        <q-separator vertical />

        <div class="text-caption">Selected: {{ selectedNodes.length }}</div>
        <q-btn size="xs" color="info" label="Log Hierarchy" @click="logHierarchy" dense flat />
      </div>
    </div>

    <div class="graph-container">
      <v-network-graph
        ref="graphRef"
        :nodes="nodes"
        :edges="edges"
        :configs="configs"
        v-model:layouts="layouts"
        v-model:selected-nodes="selectedNodes"
        v-model:zoom-level="graphZoomLevel"
        :event-handlers="eventHandlers"
      >
        <!-- Custom node rendering to ensure text is properly layered with node shapes -->
        <template #override-node="{ nodeId, scale }">
          <!-- Special rendering for center cross marker -->
          <g v-if="nodeId === centerCrossNodeId">
            <line x1="-10" y1="0" x2="10" y2="0" stroke="#4dabf7" stroke-width="2" />
            <line x1="0" y1="-10" x2="0" y2="10" stroke="#4dabf7" stroke-width="2" />
          </g>
          <!-- Normal node rendering -->
          <g v-else>
            <rect
              :width="120 * scale"
              :height="40 * scale"
              :x="-60 * scale"
              :y="-20 * scale"
              :rx="8 * scale"
              :fill="getNodeColor(nodeId)"
              :stroke="getNodeStrokeColor(nodeId)"
              :stroke-width="getNodeStrokeWidth(nodeId) * scale"
            />
            <text
              text-anchor="middle"
              dominant-baseline="central"
              :font-size="14 * scale"
              fill="#263238"
              pointer-events="none"
            >
              {{ nodes[nodeId]?.name }}
            </text>
          </g>
        </template>
      </v-network-graph>
    </div>

    <!-- Context Menu -->
    <div
      v-if="contextMenuVisible"
      class="context-menu"
      :style="{ left: contextMenuX + 'px', top: contextMenuY + 'px' }"
      @click.stop
    >
      <q-list dense style="min-width: 180px; background: white; border: 1px solid #ddd; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
        <q-item clickable @click="addChildNode">
          <q-item-section avatar>
            <q-icon name="subdirectory_arrow_right" size="xs" />
          </q-item-section>
          <q-item-section>Add Child</q-item-section>
        </q-item>

        <q-item clickable @click="addSiblingNode">
          <q-item-section avatar>
            <q-icon name="more_horiz" size="xs" />
          </q-item-section>
          <q-item-section>Add Sibling</q-item-section>
        </q-item>

        <q-item clickable @click="addParentNode">
          <q-item-section avatar>
            <q-icon name="north" size="xs" />
          </q-item-section>
          <q-item-section>Add Parent</q-item-section>
        </q-item>

        <q-separator />

        <q-item clickable @click="deleteContextNode">
          <q-item-section avatar>
            <q-icon name="delete" size="xs" color="negative" />
          </q-item-section>
          <q-item-section>Delete</q-item-section>
        </q-item>
      </q-list>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import * as vNG from 'v-network-graph'
import { ForceLayout } from 'v-network-graph/lib/force-layout'
import { useDagreService } from 'src/services/dagreService'

const $q = useQuasar()
const dagreService = useDagreService()

// Graph ref
const graphRef = ref<vNG.VNetworkGraphInstance>()

// svg-pan-zoom instance (for zoom sensitivity control)
interface SvgPanZoomInstance {
  setZoomScaleSensitivity: (sensitivity: number) => void
}
let svgPanZoomInstance: SvgPanZoomInstance | null = null

// Node interface with parent-child tracking
interface MindMapNode {
  name: string
  parentId: string | null  // null for root nodes
  order: number            // Sibling order (0, 1, 2, ...)
  zIndex?: number          // For z-order management
}

// Edge interface with type tracking
interface MindMapEdge extends vNG.Edge {
  type: 'hierarchy' | 'reference'  // hierarchy = parent-child, reference = just a link
}

// Data
const nodes = ref<Record<string, MindMapNode>>({
  'node-1': { name: 'Root', parentId: null, order: 0 },
  'node-2': { name: 'Child 1', parentId: 'node-1', order: 0 },
  'node-3': { name: 'Child 2', parentId: 'node-1', order: 1 },
})

const edges = ref<Record<string, MindMapEdge>>({
  'edge-1': { source: 'node-1', target: 'node-2', type: 'hierarchy' },
  'edge-2': { source: 'node-1', target: 'node-3', type: 'hierarchy' },
})

const layouts = ref<vNG.Layouts>({
  nodes: {
    'node-1': { x: 0, y: 0 },
    'node-2': { x: 150, y: 100 },
    'node-3': { x: 150, y: -100 },
  },
})

// Selection
const selectedNodes = ref<string[]>([])

// UI State
const d3ForceEnabled = ref(false)
const connectionType = ref<'hierarchy' | 'reference'>('hierarchy')  // Current connection type for C key

// Context menu state
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuNodeId = ref<string | null>(null)

// Box selection state (Ctrl+Shift hold)
const isCtrlShiftPressed = ref(false)
const graphZoomLevel = ref(1) // For v-network-graph binding (0.1-2.0)
const wheelZoomSensitivity = ref(20) // Mouse wheel zoom step percentage (5-80%)
const scalingObjects = ref(false) // Toggle for scaling objects with zoom (default: false)

// Node counter
let nodeCounter = 3

// Force layout instance
let forceLayout: ForceLayout | null = null

// Generation-based coloring state
const generationColoringEnabled = ref(false)

// Center cross visibility state
const showCenterCross = ref(false)

// Center cross marker node ID
const centerCrossNodeId = 'center-cross-marker'

// Configs
const configs = reactive(
  vNG.defineConfigs({
    view: {
      scalingObjects: scalingObjects.value, // Nodes scale with zoom (controlled by toggle)
      boxSelectionEnabled: false, // Disable box selection to avoid rect rendering issues
      onSvgPanZoomInitialized: (instance: SvgPanZoomInstance) => {
        svgPanZoomInstance = instance
        // Set initial zoom sensitivity (default is 0.2 which is 20%)
        updateZoomSensitivity(wheelZoomSensitivity.value)
      },
    },
    node: {
      selectable: true,
      normal: {
        type: 'rect',
        width: 120,
        height: 40,
        borderRadius: 8,
        color: '#ffffff', // Pure white background - completely opaque
        strokeWidth: 2,
        strokeColor: '#4dabf7',
        strokeDasharray: '0', // Solid stroke
      },
      hover: {
        type: 'rect',
        width: 120,
        height: 40,
        borderRadius: 8,
        color: '#e1f5fe', // Very light blue background - completely opaque
        strokeWidth: 2,
        strokeColor: '#2196f3',
        strokeDasharray: '0', // Solid stroke
      },
      selected: {
        type: 'rect',
        width: 120,
        height: 40,
        borderRadius: 8,
        color: '#b3e5fc', // Light blue background - completely opaque
        strokeWidth: 3,
        strokeColor: '#1976d2',
        strokeDasharray: '0', // Solid stroke
      },
      label: {
        visible: false, // We'll render labels in the custom template to ensure proper z-order
      },
      draggable: true,
      zOrder: {
        enabled: true,
        zIndex: (node: vNG.Node) => {
          const mindMapNode = node as unknown as MindMapNode;
          return mindMapNode.zIndex || 0;
        },
        bringToFrontOnHover: true,
        bringToFrontOnSelected: true,
      },
    },
    edge: {
      normal: {
        // Style based on edge type
        color: (edge) => {
          const e = edge as MindMapEdge
          return e.type === 'hierarchy' ? '#4dabf7' : '#aaa'
        },
        width: (edge) => {
          const e = edge as MindMapEdge
          return e.type === 'hierarchy' ? 3 : 1
        },
        dasharray: (edge) => {
          const e = edge as MindMapEdge
          return e.type === 'reference' ? '4' : '0'
        },
      },
      marker: {
        target: {
          type: 'arrow',
          width: 4,
          height: 4,
        },
      },
    },
  })
)

// Event handlers
const eventHandlers: vNG.EventHandlers = {
  'view:click': ({ event }) => {
    // Only add node if Ctrl key is pressed
    if (event.ctrlKey || event.metaKey) {
      addNodeAtPosition(event)
    }
  },
  'view:mode': (mode) => {
    // Observe mode change events - not needed anymore with Ctrl+Shift hold
    console.log('view:mode', mode)
  },
  'node:click': ({ node, event }) => {
    // Alt+Click - Select node and all descendants
    if (event.altKey) {
      event.preventDefault()
      event.stopPropagation()
      selectNodeWithDescendants(node)
      return false
    }
  },
  'node:contextmenu': ({ node, event }) => {
    // Show context menu on right-click
    event.preventDefault()
    event.stopPropagation()
    contextMenuNodeId.value = node
    contextMenuX.value = event.clientX
    contextMenuY.value = event.clientY
    contextMenuVisible.value = true
  },
}

// Helper function to calculate node generation
function calculateNodeGeneration(nodeId: string): number {
  let generation = 0
  let currentNodeId = nodeId
  
  // Traverse up the hierarchy to find the generation
  while (true) {
    const node = nodes.value[currentNodeId]
    if (!node || node.parentId === null) {
      break
    }
    currentNodeId = node.parentId
    generation++
  }
  
  return generation
}

// Helper functions for custom node rendering
function getNodeColor(nodeId: string): string {
  const node = nodes.value[nodeId]
  if (!node) return '#ffffff'
  
  // Check if this node is selected
  const isSelected = selectedNodes.value.includes(nodeId)
  
  if (generationColoringEnabled.value) {
    // Use generation-based coloring
    const generation = calculateNodeGeneration(nodeId)
    
    // Define a color palette for different generations
    const generationColors = [
      '#FFCDD2', // Generation 0 (root) - light red
      '#C8E6C9', // Generation 1 - light green
      '#BBDEFB', // Generation 2 - light blue
      '#FFF9C4', // Generation 3 - light yellow
      '#F8BBD0', // Generation 4 - light pink
      '#E1BEE7', // Generation 5 - light purple
      '#C5CAE9', // Generation 6 - light indigo
      '#B2EBF2', // Generation 7 - light cyan
    ]
    
    // Use modulo to cycle through colors for deeper generations
    const colorIndex = generation % generationColors.length
    return generationColors[colorIndex] || '#ffffff'
  } else if (isSelected) {
    return '#b3e5fc' // Selected color
  } else {
    return '#ffffff' // Normal color
  }
}

function getNodeStrokeColor(nodeId: string): string {
  const node = nodes.value[nodeId]
  if (!node) return '#4dabf7'

  const isSelected = selectedNodes.value.includes(nodeId)

  if (isSelected) {
    return '#1976d2' // Selected stroke color
  } else {
    return '#4dabf7' // Normal stroke color
  }
}

function getNodeStrokeWidth(nodeId: string): number {
  const node = nodes.value[nodeId]
  if (!node) return 2

  const isSelected = selectedNodes.value.includes(nodeId)

  if (isSelected) {
    return 3 // Selected stroke width
  } else {
    return 2 // Normal stroke width
  }
}

// Functions
function updateZoomSensitivity(value: number) {
  if (svgPanZoomInstance) {
    // Convert percentage to decimal (20% -> 0.2)
    const sensitivity = value / 100
    svgPanZoomInstance.setZoomScaleSensitivity(sensitivity)
  }
}

function updateScalingObjects(value: boolean) {
  // Update the configs to enable/disable scaling objects
  configs.view = configs.view || {}
  configs.view.scalingObjects = value

  $q.notify({
    type: 'info',
    message: `Scaling objects: ${value ? 'Enabled' : 'Disabled'}`,
    timeout: 1000,
  })
}

// Context menu functions
function addChildNode() {
  if (!contextMenuNodeId.value || !graphRef.value) return

  const parentId = contextMenuNodeId.value
  const parentPos = layouts.value.nodes[parentId]
  if (!parentPos) return

  // Check if the current node has a parent (grandparent of the new child)
  const currentNode = nodes.value[parentId]
  let newNodePosition = { x: parentPos.x, y: parentPos.y + 80 }

  if (currentNode && currentNode.parentId) {
    // Node has a parent - calculate relative position (degree) from parent
    const grandparentId = currentNode.parentId
    const grandparentPos = layouts.value.nodes[grandparentId]

    if (grandparentPos) {
      // Calculate the relative position (degree) between grandparent and parent
      const relativeX = parentPos.x - grandparentPos.x
      const relativeY = parentPos.y - grandparentPos.y

      // Position new child at same relative position from parent
      newNodePosition = {
        x: parentPos.x + relativeX,
        y: parentPos.y + relativeY
      }
    }
  }

  // Create new node at calculated position
  const newId = `node-${++nodeCounter}`
  nodes.value[newId] = {
    name: `Node ${nodeCounter}`,
    parentId: parentId,
    order: Object.values(nodes.value).filter(n => n.parentId === parentId).length,
    zIndex: 1000 // Start with higher z-index for new nodes
  }
  layouts.value.nodes[newId] = newNodePosition

  // Create hierarchy edge
  const edgeId = `edge-${parentId}-${newId}`
  edges.value[edgeId] = { source: parentId, target: newId, type: 'hierarchy' }

  contextMenuVisible.value = false

  $q.notify({
    type: 'positive',
    message: 'Child node added',
    timeout: 1000,
  })
}

function addSiblingNode() {
  if (!contextMenuNodeId.value || !graphRef.value) return

  const siblingId = contextMenuNodeId.value
  const sibling = nodes.value[siblingId]
  const siblingPos = layouts.value.nodes[siblingId]
  if (!sibling || !siblingPos) return

  // Create new node next to sibling
  const newId = `node-${++nodeCounter}`
  nodes.value[newId] = {
    name: `Node ${nodeCounter}`,
    parentId: sibling.parentId,
    order: Object.values(nodes.value).filter(n => n.parentId === sibling.parentId).length,
    zIndex: 1000 // Start with higher z-index for new nodes
  }
  layouts.value.nodes[newId] = { x: siblingPos.x + 150, y: siblingPos.y }

  // Create hierarchy edge if there's a parent
  if (sibling.parentId) {
    const edgeId = `edge-${sibling.parentId}-${newId}`
    edges.value[edgeId] = { source: sibling.parentId, target: newId, type: 'hierarchy' }
  }

  contextMenuVisible.value = false

  $q.notify({
    type: 'positive',
    message: 'Sibling node added',
    timeout: 1000,
  })
}

function addParentNode() {
  if (!contextMenuNodeId.value || !graphRef.value) return

  const childId = contextMenuNodeId.value
  const child = nodes.value[childId]
  const childPos = layouts.value.nodes[childId]
  if (!child || !childPos) return

  // Create new parent node above child
  const newId = `node-${++nodeCounter}`
  nodes.value[newId] = {
    name: `Node ${nodeCounter}`,
    parentId: child.parentId,  // New parent has same parent as child (becomes sibling)
    order: Object.values(nodes.value).filter(n => n.parentId === child.parentId).length,
    zIndex: 1000 // Start with higher z-index for new nodes
  }
  layouts.value.nodes[newId] = { x: childPos.x, y: childPos.y - 80 }

  // Remove old parent edge if exists
  if (child.parentId) {
    const oldEdgeId = Object.keys(edges.value).find(id => {
      const edge = edges.value[id]
      return edge && edge.type === 'hierarchy' && edge.source === child.parentId && edge.target === childId
    })
    if (oldEdgeId) {
      delete edges.value[oldEdgeId]
    }

    // Create edge from old parent to new parent
    const edgeId1 = `edge-${child.parentId}-${newId}`
    edges.value[edgeId1] = { source: child.parentId, target: newId, type: 'hierarchy' }
  }

  // Update child's parent
  child.parentId = newId
  child.order = 0

  // Create edge from new parent to child
  const edgeId2 = `edge-${newId}-${childId}`
  edges.value[edgeId2] = { source: newId, target: childId, type: 'hierarchy' }

  contextMenuVisible.value = false

  $q.notify({
    type: 'positive',
    message: 'Parent node added',
    timeout: 1000,
  })
}

function deleteContextNode() {
  if (!contextMenuNodeId.value) return

  const nodeId = contextMenuNodeId.value

  // Delete node
  delete nodes.value[nodeId]
  delete layouts.value.nodes[nodeId]

  // Delete all connected edges
  Object.keys(edges.value).forEach((edgeId) => {
    const edge = edges.value[edgeId]
    if (edge && (edge.source === nodeId || edge.target === nodeId)) {
      delete edges.value[edgeId]
    }
  })

  contextMenuVisible.value = false

  $q.notify({
    type: 'negative',
    message: 'Node deleted',
    timeout: 1000,
  })
}

function addNodeAtPosition(event: MouseEvent) {
  if (!graphRef.value) return

  // Get canvas position from mouse event
  const svgPoint = graphRef.value.translateFromDomToSvgCoordinates({ x: event.offsetX, y: event.offsetY })

  const newId = `node-${++nodeCounter}`

  // New nodes are created as root nodes (no parent)
  // You can modify this to set a parent based on your logic
  nodes.value[newId] = {
    name: `Node ${nodeCounter}`,
    parentId: null,  // Root node
    order: Object.values(nodes.value).filter(n => n.parentId === null).length,  // Order among root siblings
    zIndex: 1000 // Start with higher z-index for new nodes
  }
  layouts.value.nodes[newId] = { x: svgPoint.x, y: svgPoint.y }

  $q.notify({
    type: 'positive',
    message: `Added ${nodes.value[newId].name}`,
    timeout: 1000,
  })
}

function deleteSelectedNodes() {
  if (selectedNodes.value.length === 0) {
    $q.notify({
      type: 'warning',
      message: 'No nodes selected',
      timeout: 1000,
    })
    return
  }

  const count = selectedNodes.value.length

  // Delete nodes
  selectedNodes.value.forEach((nodeId) => {
    delete nodes.value[nodeId]
    delete layouts.value.nodes[nodeId]
  })

  // Delete edges connected to deleted nodes
  Object.keys(edges.value).forEach((edgeId) => {
    const edge = edges.value[edgeId]
    if (edge && (selectedNodes.value.includes(edge.source) || selectedNodes.value.includes(edge.target))) {
      delete edges.value[edgeId]
    }
  })

  // Clear selection
  selectedNodes.value = []

  $q.notify({
    type: 'positive',
    message: `Deleted ${count} node(s)`,
    timeout: 1000,
  })
}

// Helper: Check if adding edge would create circular reference
function wouldCreateCircularReference(sourceId: string, targetId: string): boolean {
  // BFS to check if there's a path from target to source
  const visited = new Set<string>()
  const queue = [targetId]

  while (queue.length > 0) {
    const currentId = queue.shift()!
    if (currentId === sourceId) return true
    if (visited.has(currentId)) continue
    visited.add(currentId)

    // Find all hierarchy edges where current node is the source
    Object.values(edges.value).forEach(edge => {
      if (edge.type === 'hierarchy' && edge.source === currentId) {
        queue.push(edge.target)
      }
    })
  }

  return false
}

// Helper: Get all descendants of a node (recursive)
function getDescendants(nodeId: string): string[] {
  const descendants: string[] = []
  const queue = [nodeId]
  const visited = new Set<string>()

  while (queue.length > 0) {
    const currentId = queue.shift()!
    if (visited.has(currentId)) continue
    visited.add(currentId)

    // Find all hierarchy edges where current node is the source
    Object.values(edges.value).forEach(edge => {
      if (edge.type === 'hierarchy' && edge.source === currentId) {
        descendants.push(edge.target)
        queue.push(edge.target)
      }
    })
  }

  return descendants
}

function selectNodeWithDescendants(nodeId: string) {
  // Get all descendants
  const descendants = getDescendants(nodeId)

  // Select the node and all its descendants
  const allNodes = [nodeId, ...descendants]

  // Use setTimeout to ensure this happens after v-network-graph's default handler
  setTimeout(() => {
    selectedNodes.value = allNodes

    // Debug: log what we're selecting
    console.log('Selecting nodes:', allNodes)
    console.log('selectedNodes.value after timeout:', selectedNodes.value)

    $q.notify({
      type: 'info',
      message: `Selected ${allNodes.length} node${allNodes.length > 1 ? 's' : ''}`,
      timeout: 1000,
    })
  }, 0)
}

function connectSelectedNodes() {
  if (selectedNodes.value.length !== 2) return

  const sourceId = selectedNodes.value[0]
  const targetId = selectedNodes.value[1]

  if (!sourceId || !targetId) return

  const edgeId = `edge-${sourceId}-${targetId}`

  if (edges.value[edgeId]) {
    $q.notify({
      type: 'warning',
      message: 'Connection already exists',
      timeout: 1000,
    })
    return
  }

  const isHierarchy = connectionType.value === 'hierarchy'

  // For hierarchy connections, check for circular references
  if (isHierarchy && wouldCreateCircularReference(sourceId, targetId)) {
    $q.notify({
      type: 'negative',
      message: 'Cannot create circular hierarchy!',
      timeout: 2000,
    })
    return
  }

  // Create edge
  edges.value[edgeId] = {
    source: sourceId,
    target: targetId,
    type: connectionType.value
  }

  // Update parent-child relationship only for hierarchy connections
  if (isHierarchy) {
    const targetNode = nodes.value[targetId]
    if (targetNode) {
      // Check if target already has a parent (reparenting)
      if (targetNode.parentId !== null && targetNode.parentId !== sourceId) {
        // Remove old hierarchy edge
        const oldEdgeId = Object.keys(edges.value).find(id => {
          const edge = edges.value[id]
          return edge && edge.type === 'hierarchy' && edge.source === targetNode.parentId && edge.target === targetId
        })
        if (oldEdgeId) {
          delete edges.value[oldEdgeId]
        }

        $q.notify({
          type: 'info',
          message: `Reparented from ${nodes.value[targetNode.parentId]?.name || 'unknown'}`,
          timeout: 1500,
        })
      }

      // Get current siblings of the new parent
      const siblings = Object.values(nodes.value).filter(n => n.parentId === sourceId)

      targetNode.parentId = sourceId
      targetNode.order = siblings.length  // Add as last child
    }
  }

  $q.notify({
    type: 'positive',
    message: `Connected (${connectionType.value})`,
    timeout: 1000,
  })
}


function logHierarchy() {
  console.log('=== Node Hierarchy ===')

  // Get root nodes
  const rootNodes = Object.entries(nodes.value)
    .filter(([, node]) => node.parentId === null)
    .sort((a, b) => a[1].order - b[1].order)

  // Recursive function to print tree
  function printNode(nodeId: string, indent: string = '') {
    const node = nodes.value[nodeId]
    if (!node) return

    console.log(`${indent}${node.name} (id: ${nodeId}, order: ${node.order})`)

    // Get children
    const children = Object.entries(nodes.value)
      .filter(([, n]) => n.parentId === nodeId)
      .sort((a, b) => a[1].order - b[1].order)

    children.forEach(([childId]) => {
      printNode(childId, indent + '  ')
    })
  }

  // Print all root nodes and their descendants
  rootNodes.forEach(([nodeId]) => {
    printNode(nodeId)
  })

  console.log('=== End Hierarchy ===')

  $q.notify({
    type: 'info',
    message: 'Hierarchy logged to console',
    timeout: 1000,
  })
}

// Watch D3 Force
watch(d3ForceEnabled, (enabled) => {
  if (!graphRef.value) return

  if (enabled) {
    // Always create a fresh force layout instance to avoid stale state
    forceLayout = new ForceLayout({
      positionFixedByDrag: true,
      positionFixedByClickWithAltKey: true,
    })

    configs.view = configs.view || {}
    configs.view.layoutHandler = forceLayout

    $q.notify({
      type: 'positive',
      message: 'D3 Force enabled',
      timeout: 1000,
    })
  } else {
    // Stop force layout
    if (forceLayout && 'stop' in forceLayout && typeof forceLayout.stop === 'function') {
      forceLayout.stop()
    }

    // Replace with SimpleLayout to prevent any residual force interference
    configs.view = configs.view || {}
    configs.view.layoutHandler = new vNG.SimpleLayout()

    // Destroy the force layout instance to clear all internal state
    forceLayout = null

    $q.notify({
      type: 'info',
      message: 'D3 Force disabled',
      timeout: 1000,
    })
  }
})

// Keyboard shortcuts
function handleKeyDown(event: KeyboardEvent) {
  // Ctrl+Shift - Enter box selection mode
  if ((event.ctrlKey || event.metaKey) && event.shiftKey) {
    if (!isCtrlShiftPressed.value && graphRef.value) {
      isCtrlShiftPressed.value = true
      graphRef.value.startBoxSelection({
        stop: 'click',
        type: 'append',
      })
    }
  }

  // H key - Set connection type to Hierarchy
  if (event.key === 'h' || event.key === 'H') {
    if (!event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault()
      connectionType.value = 'hierarchy'
      $q.notify({
        type: 'info',
        message: 'Connection type: Hierarchy',
        timeout: 800,
      })
    }
  }

  // R key - Set connection type to Reference
  if (event.key === 'r' || event.key === 'R') {
    if (!event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault()
      connectionType.value = 'reference'
      $q.notify({
        type: 'info',
        message: 'Connection type: Reference',
        timeout: 800,
      })
    }
  }

  // Delete key - Delete selected nodes
  if (event.key === 'Delete' || event.key === 'Backspace') {
    if (selectedNodes.value.length > 0) {
      event.preventDefault()
      deleteSelectedNodes()
    }
  }

  // C key - Connect selected nodes
  if (event.key === 'c' || event.key === 'C') {
    if (!event.ctrlKey && !event.metaKey && selectedNodes.value.length === 2) {
      event.preventDefault()
      connectSelectedNodes()
    }
  }
}

function handleKeyUp(event: KeyboardEvent) {
  // Exit box selection mode when Ctrl or Shift is released
  if (isCtrlShiftPressed.value && (!event.ctrlKey && !event.metaKey || !event.shiftKey)) {
    isCtrlShiftPressed.value = false
    if (graphRef.value) {
      graphRef.value.stopBoxSelection()
    }
  }
}

// Close context menu on click outside
function handleClickOutside() {
  contextMenuVisible.value = false
}

// Handle generation coloring toggle from the test controls
function handleGenerationColoringToggle(event: CustomEvent) {
  const detail = event.detail
  if (!detail || typeof detail.enabled !== 'boolean') return
  
  generationColoringEnabled.value = detail.enabled
  
  console.log('Generation coloring enabled:', detail.enabled)
  
  $q.notify({
    type: 'info',
    message: `Generation coloring ${detail.enabled ? 'enabled' : 'disabled'}`,
    timeout: 1000,
  })
}

// Handle center cross toggle from the test controls
function handleCenterCrossToggle(event: CustomEvent) {
  const detail = event.detail
  if (!detail || typeof detail.enabled !== 'boolean') return
  
  showCenterCross.value = detail.enabled
  
  if (detail.enabled) {
    // Add center cross marker node at (0,0)
    nodes.value[centerCrossNodeId] = {
      name: '+',
      parentId: null,
      order: 0,
      zIndex: 10000
    }
    layouts.value.nodes[centerCrossNodeId] = { x: 0, y: 0 }
  } else {
    // Remove center cross marker node
    delete nodes.value[centerCrossNodeId]
    delete layouts.value.nodes[centerCrossNodeId]
  }
  
  console.log('Center cross visibility set to:', detail.enabled)
  
  $q.notify({
    type: 'info',
    message: `Center cross ${detail.enabled ? 'shown' : 'hidden'}`,
    timeout: 1000,
  })
}

// Handle dagre layout requests from the test controls
function handleDagreLayoutRequest(event: CustomEvent) {
  const detail = event.detail
  if (!detail || !detail.config) return
  
  console.log('Received dagre layout request:', detail)
  
  // Get layout type from config
  const layoutType = detail.config.type
  
  if (detail.target === 'selected-node') {
    // Apply to currently selected node
    if (selectedNodes.value.length === 1) {
      const selectedNodeId = selectedNodes.value[0]
      if (selectedNodeId) {
        let success = false
        let message = ''
        
        switch (layoutType) {
          case 'tree':
            success = dagreService.applyDagreToSelected(
              nodes.value,
              edges.value,
              layouts.value,
              selectedNodeId,
              detail.config.dagreParams || detail.params
            )
            message = success ? `Applied tree layout to selected node` : 'Failed to apply tree layout'
            break
            
          case 'circular':
            success = dagreService.applyCircularToSelected(
              nodes.value,
              edges.value,
              layouts.value,
              selectedNodeId,
              detail.config.circularParams || detail.params
            )
            message = success ? `Applied circular layout to selected node` : 'Failed to apply circular layout'
            break
            
          case 'mindmap':
            // For mindmap layout, use dagre with mindmap parameters
            success = dagreService.applyDagreToSelected(
              nodes.value,
              edges.value,
              layouts.value,
              selectedNodeId,
              detail.config.mindmapParams || detail.params
            )
            message = success ? `Applied mindmap layout to selected node` : 'Failed to apply mindmap layout'
            break
            
          default:
            // Fallback to tree layout
            success = dagreService.applyDagreToSelected(
              nodes.value,
              edges.value,
              layouts.value,
              selectedNodeId,
              detail.params
            )
            message = success ? `Applied default layout to selected node` : 'Failed to apply layout'
        }
        
        if (success) {
          $q.notify({
            type: 'positive',
            message,
            timeout: 1000,
          })
        } else {
          $q.notify({
            type: 'negative',
            message,
            timeout: 2000,
          })
        }
      }
    } else {
      $q.notify({
        type: 'warning',
        message: 'Please select exactly one node for layout',
        timeout: 1500,
      })
    }
  } else if (detail.target === 'entire-graph') {
    let success = false
    let message = ''
    
    if (layoutType === 'circular') {
      // Apply circular layout to entire graph
      const centerX = 0
      const centerY = 0
      success = dagreService.applyCircularToEntireGraph(
        nodes.value,
        edges.value,
        layouts.value,
        centerX,
        centerY,
        detail.config.circularParams || detail.params
      )
      message = success ? `Applied circular layout to entire graph` : 'Failed to apply circular layout'
    } else {
      // For tree and mindmap layouts, apply to each root node
      const rootNodes = Object.values(nodes.value).filter(node => node.parentId === null)
      
      if (rootNodes.length === 0) {
        $q.notify({
          type: 'warning',
          message: 'No root nodes found',
          timeout: 1500,
        })
        return
      }
      
      let appliedCount = 0
      rootNodes.forEach(rootNode => {
        const rootId = Object.keys(nodes.value).find(key => nodes.value[key] === rootNode)
        if (rootId) {
          const nodeSuccess = dagreService.applyDagreToSelected(
            nodes.value,
            edges.value,
            layouts.value,
            rootId,
            detail.config.dagreParams || detail.config.mindmapParams || detail.params
          )
          if (nodeSuccess) appliedCount++
        }
      })
      
      success = appliedCount > 0
      message = `Applied ${layoutType} layout to ${appliedCount} root node(s)`
    }
    
    if (success) {
      $q.notify({
        type: 'positive',
        message,
        timeout: 1500,
      })
    } else {
      $q.notify({
        type: 'negative',
        message: `Failed to apply ${layoutType} layout`,
        timeout: 2000,
      })
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  window.addEventListener('click', handleClickOutside)
  
  // Setup event listener for generation coloring toggle
  window.addEventListener('generation-coloring-toggle', handleGenerationColoringToggle as EventListener)
  
  // Setup event listener for center cross toggle
  window.addEventListener('center-cross-toggle', handleCenterCrossToggle as EventListener)
  
  // Setup event listener for dagre layout requests
  window.addEventListener('dagre-layout-request', handleDagreLayoutRequest as EventListener)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  window.removeEventListener('click', handleClickOutside)
  window.removeEventListener('generation-coloring-toggle', handleGenerationColoringToggle as EventListener)
  window.removeEventListener('center-cross-toggle', handleCenterCrossToggle as EventListener)
  window.removeEventListener('dagre-layout-request', handleDagreLayoutRequest as EventListener)
})
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

.context-menu {
  position: fixed;
  z-index: 9999;
}
</style>
