<template>
  <q-page class="column">
    <div class="q-pa-sm" style="background: #f5f5f5; border-bottom: 1px solid #ddd;">
      <div class="row items-center q-gutter-sm">
        <div class="text-subtitle2 q-mr-sm">ConceptMap Box Test</div>
        <q-separator vertical />

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

        <!-- Dagre for Selected Node -->
        <div class="text-caption">Dagre Selected:</div>
        <q-btn size="xs" icon="arrow_upward" @click="applyDagreToSelected('TB')" :disable="selectedNodes.length !== 1" dense flat title="Top to Bottom" />
        <q-btn size="xs" icon="arrow_downward" @click="applyDagreToSelected('BT')" :disable="selectedNodes.length !== 1" dense flat title="Bottom to Top" />
        <q-btn size="xs" icon="arrow_forward" @click="applyDagreToSelected('LR')" :disable="selectedNodes.length !== 1" dense flat title="Left to Right" />
        <q-btn size="xs" icon="arrow_back" @click="applyDagreToSelected('RL')" :disable="selectedNodes.length !== 1" dense flat title="Right to Left" />

        <q-separator vertical />

        <div class="text-caption">Wheel Zoom: {{ wheelZoomSensitivity }}%</div>
        <q-slider v-model="wheelZoomSensitivity" :min="5" :max="80" :step="5" dense style="width: 100px;" @update:model-value="(val) => val !== null && updateZoomSensitivity(val)" />
        <q-toggle v-model="scalingObjects" label="Scale Objects" dense size="xs" @update:model-value="updateScalingObjects" />

        <q-separator vertical />

        <div class="text-caption">Box Padding: {{ boxPadding }}px</div>
        <q-slider v-model="boxPadding" :min="0" :max="50" :step="5" dense style="width: 100px;" />

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
        :layers="layers"
      >
        <!-- Custom node rendering to ensure text is properly layered with node shapes -->
        <template #override-node="{ nodeId, scale }">
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
        </template>

        <!-- Parent node boxes layer -->
        <template #parent-boxes="{ scale }">
          <rect
            v-for="(box, index) in parentBoxes"
            :key="index"
            :x="box.x"
            :y="box.y"
            :width="box.width"
            :height="box.height"
            :rx="12"
            fill="none"
            stroke="#4dabf7"
            :stroke-width="2"
            stroke-dasharray="5, 5"
            style="pointer-events: none"
            :transform="`scale(${scale})`"
          />
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

        <q-item clickable @click="addParentNodeWithBox">
          <q-item-section avatar>
            <q-icon name="dashboard" size="xs" />
          </q-item-section>
          <q-item-section>Add Parent with Box</q-item-section>
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
// @ts-expect-error - dagre doesn't have proper TypeScript types
import dagre from 'dagre/dist/dagre.min.js'

const $q = useQuasar()

// Graph ref
const graphRef = ref<vNG.VNetworkGraphInstance>()

// Layers configuration for parent node boxes
const layers = {
  'parent-boxes': 'base',
}

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

// Parent boxes for concept map (calculated based on children positions)
interface ParentBox {
  parentId: string
  x: number
  y: number
  width: number
  height: number
}

const parentBoxes = ref<ParentBox[]>([])

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
const scalingObjects = ref(true) // Toggle for scaling objects with zoom (default: true for concept map)
const boxPadding = ref(20) // Inter-box padding in pixels (0-50px)

// Node counter
let nodeCounter = 3

// Force layout instance
let forceLayout: ForceLayout | null = null

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
        // Hide hierarchy edges, only show reference edges
        color: (edge) => {
          const e = edge as MindMapEdge
          return e.type === 'hierarchy' ? 'transparent' : '#aaa'
        },
        width: (edge) => {
          const e = edge as MindMapEdge
          return e.type === 'hierarchy' ? 0 : 1
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
  'view:mode': () => {
    // Observe mode change events - not needed anymore with Ctrl+Shift hold
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

// Helper functions for custom node rendering
function isParentNode(nodeId: string): boolean {
  const node = nodes.value[nodeId]
  if (!node) return false

  // Check if this node has any children
  return Object.values(nodes.value).some(childNode => childNode.parentId === nodeId)
}

function getNodeColor(nodeId: string): string {
  const node = nodes.value[nodeId]
  if (!node) return '#ffffff'

  // Check if this node is selected
  const isSelected = selectedNodes.value.includes(nodeId)
  const isParent = isParentNode(nodeId)
  // Note: Hover state is handled by z-order, not by color change

  if (isSelected) {
    return '#b3e5fc' // Selected color
  } else if (isParent) {
    return '#e3f2fd' // Light blue for parent nodes
  } else {
    return '#ffffff' // Normal color for child nodes
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

// Parent box calculation function - bottom-up approach
function calculateParentBoxes() {
  const boxes: ParentBox[] = []
  const padding = boxPadding.value  // Inter-box padding (adjustable via slider)

  // Helper function to get the depth of a node
  function getNodeDepth(nodeId: string): number {
    let depth = 0
    let currentId = nodeId
    while (true) {
      const node = nodes.value[currentId]
      if (!node || !node.parentId) break
      depth++
      currentId = node.parentId
    }
    return depth
  }

  // Get all nodes with children and sort by depth (deepest first)
  const nodesWithChildren = Object.entries(nodes.value)
    .filter(([nodeId, node]) => {
      if (!node) return false
      // Check if this node has any children
      return Object.values(nodes.value).some(childNode => childNode.parentId === nodeId)
    })
    .map(([nodeId]) => nodeId)
    .sort((a, b) => getNodeDepth(b) - getNodeDepth(a)) // Deepest first

  // Process nodes from deepest to shallowest
  nodesWithChildren.forEach((nodeId) => {
    const node = nodes.value[nodeId]
    if (!node) return

    // Get all direct children of this node
    const children = Object.entries(nodes.value)
      .filter(([, childNode]) => childNode.parentId === nodeId)
      .map(([childId]) => childId)

    if (children.length === 0) return

    // Get positions of parent and children
    const parentPos = layouts.value.nodes[nodeId]
    if (!parentPos) return

    const childPositions = children
      .map(childId => layouts.value.nodes[childId])
      .filter(pos => pos !== undefined) as { x: number, y: number }[]

    if (childPositions.length === 0) return

    // Calculate bounding box that contains parent and all children
    // Track node center positions separately from box edge positions
    const nodeCenterPositions = [parentPos, ...childPositions]
    const boxEdgePositions: { x: number, y: number }[] = []

    // For nested boxes, include child box boundaries directly
    // The child box already has its own padding, so we just use its outer edges
    children.forEach(childId => {
      const childBox = boxes.find(box => box.parentId === childId)
      if (childBox) {
        // Use the child box outer edges directly (no adjustment needed)
        // This preserves the inter-box spacing
        const boxCorners = [
          { x: childBox.x, y: childBox.y },
          { x: childBox.x + childBox.width, y: childBox.y },
          { x: childBox.x, y: childBox.y + childBox.height },
          { x: childBox.x + childBox.width, y: childBox.y + childBox.height }
        ]

        boxEdgePositions.push(...boxCorners)
      }
    })

    // Calculate node dimensions
    const nodeWidth = 120  // Default node width from configs
    const nodeHeight = 40  // Default node height from configs
    const halfNodeWidth = nodeWidth / 2
    const halfNodeHeight = nodeHeight / 2

    // Convert node center positions to edge positions by adding node dimensions
    const nodeEdgePositions = nodeCenterPositions.flatMap(pos => [
      { x: pos.x - halfNodeWidth, y: pos.y - halfNodeHeight }, // top-left
      { x: pos.x + halfNodeWidth, y: pos.y - halfNodeHeight }, // top-right
      { x: pos.x - halfNodeWidth, y: pos.y + halfNodeHeight }, // bottom-left
      { x: pos.x + halfNodeWidth, y: pos.y + halfNodeHeight }, // bottom-right
    ])

    // Combine all edge positions (both from nodes and nested boxes)
    const allEdgePositions = [...nodeEdgePositions, ...boxEdgePositions]

    const minX = Math.min(...allEdgePositions.map(p => p.x))
    const maxX = Math.max(...allEdgePositions.map(p => p.x))
    const minY = Math.min(...allEdgePositions.map(p => p.y))
    const maxY = Math.max(...allEdgePositions.map(p => p.y))

    const box: ParentBox = {
      parentId: nodeId,
      x: minX - padding,
      y: minY - padding,
      width: (maxX - minX) + padding * 2,
      height: (maxY - minY) + padding * 2,
    }

    // Ensure minimum size (should be at least slightly larger than a single node)
    const minWidth = nodeWidth + padding * 2
    const minHeight = nodeHeight + padding * 2

    if (box.width < minWidth) {
      const centerX = box.x + box.width / 2
      box.x = centerX - minWidth / 2
      box.width = minWidth
    }

    if (box.height < minHeight) {
      const centerY = box.y + box.height / 2
      box.y = centerY - minHeight / 2
      box.height = minHeight
    }

    boxes.push(box)
  })

  parentBoxes.value = boxes
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

  // Update parent boxes immediately
  calculateParentBoxes()

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

  // Update parent boxes immediately
  calculateParentBoxes()

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

function addParentNodeWithBox() {
  if (!contextMenuNodeId.value || !graphRef.value) return

  const childId = contextMenuNodeId.value
  const child = nodes.value[childId]
  const childPos = layouts.value.nodes[childId]
  if (!child || !childPos) return

  // Create new parent node above child
  const newId = `node-${++nodeCounter}`
  nodes.value[newId] = {
    name: `Group ${nodeCounter}`,
    parentId: child.parentId,  // New parent has same parent as child (becomes sibling)
    order: Object.values(nodes.value).filter(n => n.parentId === child.parentId).length,
    zIndex: 1000 // Start with higher z-index for new nodes
  }
  layouts.value.nodes[newId] = { x: childPos.x, y: childPos.y - 120 }

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

  // Update parent boxes immediately
  calculateParentBoxes()

  contextMenuVisible.value = false

  $q.notify({
    type: 'positive',
    message: 'Parent node with box added',
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

  // Update parent boxes immediately after deletion
  calculateParentBoxes()

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

  // Update parent boxes after deletion
  calculateParentBoxes()

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

  // Update parent boxes immediately when hierarchy changes
  calculateParentBoxes()

  $q.notify({
    type: 'positive',
    message: `Connected (${connectionType.value})`,
    timeout: 1000,
  })
}

function applyDagreToSelected(direction: 'TB' | 'BT' | 'LR' | 'RL') {
  if (selectedNodes.value.length !== 1) return

  const rootId = selectedNodes.value[0]
  if (!rootId) return

  const descendants = getDescendants(rootId)
  const subgraphNodes = [rootId, ...descendants]

  if (subgraphNodes.length === 1) {
    $q.notify({
      type: 'warning',
      message: 'Selected node has no children',
      timeout: 1000,
    })
    return
  }

  // Create dagre graph for subgraph
  const g = new dagre.graphlib.Graph()
  g.setGraph({
    rankdir: direction,
    nodesep: 50,
    edgesep: 10,
    ranksep: 100,
  })
  g.setDefaultEdgeLabel(() => ({}))

  // Add nodes to dagre
  subgraphNodes.forEach(nodeId => {
    g.setNode(nodeId, { width: 120, height: 40 })
  })

  // Add only hierarchy edges within the subgraph
  Object.entries(edges.value).forEach(([, edge]) => {
    if (edge.type === 'hierarchy' &&
        subgraphNodes.includes(edge.source) &&
        subgraphNodes.includes(edge.target)) {
      g.setEdge(edge.source, edge.target)
    }
  })

  // Run dagre layout
  dagre.layout(g)

  // Get the root node's current position to use as anchor
  const rootPos = layouts.value.nodes[rootId]
  if (!rootPos) return

  const rootDagrePos = g.node(rootId)
  const offsetX = rootPos.x - rootDagrePos.x
  const offsetY = rootPos.y - rootDagrePos.y

  // Update positions for subgraph nodes (offset to keep root in place)
  subgraphNodes.forEach(nodeId => {
    const dagreNode = g.node(nodeId)
    layouts.value.nodes[nodeId] = {
      x: dagreNode.x + offsetX,
      y: dagreNode.y + offsetY,
    }
  })

  $q.notify({
    type: 'positive',
    message: `Applied ${direction} layout to ${subgraphNodes.length} nodes`,
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

// Watch for changes in layouts and nodes to update parent boxes
watch([layouts, nodes], () => {
  calculateParentBoxes()
}, { deep: true })

// Watch for changes in box padding to update parent boxes
watch(boxPadding, () => {
  calculateParentBoxes()
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

onMounted(() => {
  calculateParentBoxes()
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  window.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  window.removeEventListener('click', handleClickOutside)
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

