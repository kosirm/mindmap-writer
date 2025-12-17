<template>
  <q-page class="column">
    <div class="q-pa-sm" style="background: #f5f5f5; border-bottom: 1px solid #ddd;">
      <div class="row items-center q-gutter-sm">
        <div class="text-subtitle2 q-mr-sm">ConceptMap Box Test</div>
        <q-separator vertical />

        <!-- Connection Controls -->
        <q-btn size="xs" color="secondary" label="Connect (C)" @click="connectSelectedNodes" :disable="selectedNodes.length !== 2" dense flat />

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

        <q-separator vertical />

        <div class="text-caption">Box Padding: {{ boxPadding }}px</div>
        <q-slider v-model="boxPadding" :min="0" :max="50" :step="5" dense style="width: 100px;" />

        <q-separator vertical />

        <div class="text-caption">Selected: {{ selectedNodes.length }}</div>
        <div class="text-caption">Hovered: {{ hoveredElement?.type || 'none' }}</div>
        <q-btn size="xs" color="info" label="Log Hierarchy" @click="logHierarchy" dense flat />
      </div>
    </div>

    <div class="graph-container" ref="graphContainer" @mousemove="handleCanvasMouseMove">
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
            :stroke="getBoxStrokeColor(box.parentId)"
            :stroke-width="getBoxStrokeWidth(box.parentId)"
            stroke-dasharray="5, 5"
            style="pointer-events: none"
            :transform="`scale(${scale})`"
          />
        </template>
      </v-network-graph>
    </div>

    <!-- Node Context Menu -->
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

    <!-- Canvas Context Menu -->
    <div
      v-if="canvasContextMenuVisible"
      class="context-menu"
      :style="{ left: canvasContextMenuX + 'px', top: canvasContextMenuY + 'px' }"
      @click.stop
    >
      <q-list dense style="min-width: 150px; background: white; border: 1px solid #ddd; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
        <q-item clickable @click="addChildNodeAtCanvas">
          <q-item-section avatar>
            <q-icon name="subdirectory_arrow_right" size="xs" />
          </q-item-section>
          <q-item-section>Add Child</q-item-section>
        </q-item>

        <q-separator />

        <q-item clickable @click="zoomIn">
          <q-item-section avatar>
            <q-icon name="zoom_in" size="xs" />
          </q-item-section>
          <q-item-section>Zoom In</q-item-section>
        </q-item>

        <q-item clickable @click="zoomOut">
          <q-item-section avatar>
            <q-icon name="zoom_out" size="xs" />
          </q-item-section>
          <q-item-section>Zoom Out</q-item-section>
        </q-item>
      </q-list>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import * as vNG from 'v-network-graph'
// @ts-expect-error - dagre doesn't have proper TypeScript types
import dagre from 'dagre/dist/dagre.min.js'

const $q = useQuasar()

// Graph ref
const graphRef = ref<vNG.VNetworkGraphInstance>()
const graphContainer = ref<HTMLElement>()

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
  type: 'hierarchy' | 'reference'  // hierarchy = parent-child (hidden), reference = visible links
}

// v-network-graph drag event interface
interface NodeDragEvent {
  [nodeId: string]: {
    x: number
    y: number
  } | string | boolean | undefined
  node?: string
  ctrlKey?: boolean
  metaKey?: boolean
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

// Context menu state
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuNodeId = ref<string | null>(null)

// Canvas context menu state
const canvasContextMenuVisible = ref(false)
const canvasContextMenuX = ref(0)
const canvasContextMenuY = ref(0)
const canvasContextMenuPosition = ref<{ x: number, y: number } | null>(null) // Store mouse position for Add Child

// Box selection state (Shift hold)
const isShiftPressed = ref(false)
const isBoxSelecting = ref(false)
const graphZoomLevel = ref(1) // For v-network-graph binding (0.1-2.0)
const wheelZoomSensitivity = ref(20) // Mouse wheel zoom step percentage (5-80%)
const boxPadding = ref(20) // Inter-box padding in pixels (0-50px)
const isDragging = ref(false) // Track if a node is currently being dragged
const ctrlDraggedNodes = ref<Set<string>>(new Set()) // Track nodes being dragged with Ctrl key
const hoveredElement = ref<{ type: 'node' | 'box' | 'canvas', id?: string } | null>(null) // Track hovered element during drag

// Node counter
let nodeCounter = 3

const configs = reactive(
  vNG.defineConfigs({
    view: {
      scalingObjects: true, // Nodes always scale with zoom in concept map
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
      hover: {
        // Hide hierarchy edges on hover too
        color: (edge) => {
          const e = edge as MindMapEdge
          return e.type === 'hierarchy' ? 'transparent' : '#666'
        },
        width: (edge) => {
          const e = edge as MindMapEdge
          return e.type === 'hierarchy' ? 0 : 2
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
    // Only handle Ctrl+Click
    if (event.ctrlKey || event.metaKey) {
      // Check if this click is inside any parent box
      if (!graphRef.value) {
        addNodeAtPosition(event)
        return
      }

      // Get canvas position from mouse event
      const svgPoint = graphRef.value.translateFromDomToSvgCoordinates({ x: event.offsetX, y: event.offsetY })

      // Check if click is within any parent box (from deepest to shallowest to handle nesting)
      const clickedBox = findClickedParentBoxAtCoordinates(svgPoint)

      if (clickedBox) {
        addNodeToParentBox(clickedBox.parentId, event)
      } else {
        addNodeAtPosition(event)
      }
    }
  },
  'view:contextmenu': ({ event }) => {
    // Show canvas context menu on right-click (when not clicking on a node)
    event.preventDefault()
    event.stopPropagation()
    canvasContextMenuX.value = event.clientX
    canvasContextMenuY.value = event.clientY
    
    // Store mouse position in SVG coordinates for Add Child functionality
    if (graphRef.value) {
      const svgPoint = graphRef.value.translateFromDomToSvgCoordinates({ x: event.offsetX, y: event.offsetY })
      canvasContextMenuPosition.value = { x: svgPoint.x, y: svgPoint.y }
    }
    
    canvasContextMenuVisible.value = true
  },
  'node:select': (nodeIds: string[]) => {
    // Handle node selection (including box selection)
    if (nodeIds && nodeIds.length > 0 && isShiftPressed.value) {
      // During Shift+box selection, add nodes to current selection (append mode)
      const currentSelection = new Set(selectedNodes.value)
      nodeIds.forEach((nodeId: string) => currentSelection.add(nodeId))
      selectedNodes.value = Array.from(currentSelection)
    } else if (nodeIds && nodeIds.length > 0) {
      // Regular selection (replace current selection)
      selectedNodes.value = nodeIds
    }
  },
  'view:mode': () => {
    // Observe mode change events - not needed anymore with Ctrl+Shift hold
  },
  'node:click': ({ node, event }) => {
    // Ctrl+Click - Add/remove node to/from selection (replacing default Shift+Click behavior)
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey) {
      event.preventDefault()
      event.stopPropagation()

      // Get current selection
      const currentSelection = [...selectedNodes.value]

      // If node is already selected, remove it (toggle behavior)
      if (currentSelection.includes(node)) {
        const newSelection = currentSelection.filter(id => id !== node)
        selectedNodes.value = newSelection
      } else {
        // Add node to selection
        selectedNodes.value = [...currentSelection, node]
      }
      return false
    }

    // Alt+Click - Select node and all descendants
    if (event.altKey) {
      event.preventDefault()
      event.stopPropagation()
      selectNodeWithDescendants(node)
      return false
    }

    // Shift+Click - Prevent default Shift+click behavior to avoid interference
    // with our Shift+drag box selection
    if (event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault()
      event.stopPropagation()
      // Don't change selection on Shift+click, let Shift+drag handle box selection
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
  'node:pointerdown': ({ node, event }) => {
    // Store the node and Ctrl key state for potential drag detection
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).lastPointerDownNode = node
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).lastPointerDownCtrl = event.ctrlKey || event.metaKey
  },
  'node:dragstart': (event: NodeDragEvent) => {
    // Set dragging flag to prevent parent box recalculation during drag
    isDragging.value = true

    // Check if this drag was initiated with Ctrl key pressed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lastPointerDownNode = (window as any).lastPointerDownNode
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lastPointerDownCtrl = (window as any).lastPointerDownCtrl

    if (lastPointerDownCtrl && lastPointerDownNode) {
      // Get the dragged node ID from the event keys
      const draggedNodeId = Object.keys(event)[0] // First key is the node ID
      if (draggedNodeId && draggedNodeId === lastPointerDownNode) {
        // Check if the dragged node is part of current selection
        const isDraggedNodeSelected = selectedNodes.value.includes(draggedNodeId)

        if (isDraggedNodeSelected && selectedNodes.value.length > 1) {
          // If multiple nodes are selected and one is dragged, highlight ALL selected nodes
          selectedNodes.value.forEach(nodeId => {
            ctrlDraggedNodes.value.add(nodeId)
          })
        } else {
          // Single node drag or unselected node drag
          ctrlDraggedNodes.value.add(draggedNodeId)
        }
      }
    }

    // Clear the stored pointer down state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).lastPointerDownNode = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).lastPointerDownCtrl = false
  },
  'node:dragend': /* eslint-disable-line @typescript-eslint/no-unused-vars */ (event: NodeDragEvent) => {
    // Clear dragging flag and update parent boxes only after drag is complete
    isDragging.value = false
    hoveredElement.value = null // Clear hover state when drag ends

    // Clear Ctrl+dragged nodes when drag ends
    ctrlDraggedNodes.value.clear()

    calculateParentBoxes()
  },
  'node:pointerover': ({ node, event }: { node: string, event: PointerEvent }) => {
    // Handle hover on nodes during dragging
    if (isDragging.value && event && node) {
      event.preventDefault()
      event.stopPropagation()
      hoveredElement.value = { type: 'node', id: node }
      return false
    }
  },
  'node:pointerout': ({ node, event }: { node: string, event: PointerEvent }) => {
    // Handle when mouse leaves a node during dragging
    if (isDragging.value && event && node && hoveredElement.value?.type === 'node' && hoveredElement.value?.id === node) {
      event.preventDefault()
      event.stopPropagation()
      hoveredElement.value = null
      return false
    }
  },
  'node:pointermove': (eventData) => {
    // Handle continuous pointer movement over nodes during dragging
    // Note: node:pointermove has different event structure than pointerover/pointerout
    if (isDragging.value && eventData && typeof eventData === 'object') {
      // Try to extract node and event from the different possible structures
      const node = (eventData as { node?: string; [key: string]: unknown }).node || Object.keys(eventData)[0]
      const pointerEvent = (eventData as { event?: PointerEvent; [key: string]: unknown }).event

      if (node && pointerEvent) {
        pointerEvent.preventDefault()
        pointerEvent.stopPropagation()
        hoveredElement.value = { type: 'node', id: node }
        return false
      }
    }
  },
}

// Handle canvas mouse movement for box and canvas hover detection
function handleCanvasMouseMove(event: MouseEvent) {
  if (!isDragging.value || !graphRef.value) return

  // Get canvas position from mouse event
  const svgPoint = graphRef.value.translateFromDomToSvgCoordinates({ x: event.offsetX, y: event.offsetY })

  // Check if mouse is over any parent box
  const hoveredBox = findClickedParentBoxAtCoordinates(svgPoint)

  if (hoveredBox) {
    // Only update if we're not already hovering this box or if we're hovering a different box
    if (!hoveredElement.value ||
        hoveredElement.value.type !== 'box' ||
        hoveredElement.value.id !== hoveredBox.parentId) {
      hoveredElement.value = { type: 'box', id: hoveredBox.parentId }
    }
  } else {
    // Not over any box, we're over the canvas (empty space)
    if (!hoveredElement.value || hoveredElement.value.type !== 'canvas') {
      hoveredElement.value = { type: 'canvas' }
    }
  }
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
  const isCtrlDragged = ctrlDraggedNodes.value.has(nodeId)
  const isHoveredDuringDrag = isDragging.value && hoveredElement.value?.type === 'node' && hoveredElement.value?.id === nodeId

  // Hover during drag has highest priority (bright yellow)
  if (isHoveredDuringDrag) {
    return '#ffeb3b' // Bright yellow for hover during drag
  }
  // Ctrl+dragged nodes have high priority (green background)
  else if (isCtrlDragged) {
    return '#c8e6c9' // Light green for Ctrl+dragged nodes
  } else if (isSelected) {
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
  const isHoveredDuringDrag = isDragging.value && hoveredElement.value?.type === 'node' && hoveredElement.value?.id === nodeId

  if (isHoveredDuringDrag) {
    return '#ff9800' // Orange stroke for hover during drag
  } else if (isSelected) {
    return '#1976d2' // Selected stroke color
  } else {
    return '#4dabf7' // Normal stroke color
  }
}

function getNodeStrokeWidth(nodeId: string): number {
  const node = nodes.value[nodeId]
  if (!node) return 2

  const isSelected = selectedNodes.value.includes(nodeId)
  const isHoveredDuringDrag = isDragging.value && hoveredElement.value?.type === 'node' && hoveredElement.value?.id === nodeId

  if (isHoveredDuringDrag) {
    return 4 // Thicker stroke for hover during drag
  } else if (isSelected) {
    return 3 // Selected stroke width
  } else {
    return 2 // Normal stroke width
  }
}

// Helper functions for parent box rendering
function getBoxStrokeColor(parentId: string): string {
  const isHoveredDuringDrag = isDragging.value && hoveredElement.value?.type === 'box' && hoveredElement.value?.id === parentId

  if (isHoveredDuringDrag) {
    return '#ff9800' // Orange stroke for hover during drag
  } else {
    return '#4dabf7' // Normal stroke color
  }
}

function getBoxStrokeWidth(parentId: string): number {
  const isHoveredDuringDrag = isDragging.value && hoveredElement.value?.type === 'box' && hoveredElement.value?.id === parentId

  if (isHoveredDuringDrag) {
    return 4 // Thicker stroke for hover during drag
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

// Context menu functions
function addChildNode() {
  if (!contextMenuNodeId.value || !graphRef.value) return

  const parentId = contextMenuNodeId.value
  const parentPos = layouts.value.nodes[parentId]
  if (!parentPos) return

  // For concept map, position child node UNDER the parent (not based on mindmap logic)
  const newNodePosition = {
    x: parentPos.x,
    y: parentPos.y + 80
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

// Helper: Find if coordinates are inside any parent box
function findClickedParentBoxAtCoordinates(point: { x: number, y: number }): ParentBox | null {
  // Check if click is within any parent box (from deepest to shallowest to handle nesting)
  const sortedBoxes = [...parentBoxes.value].sort((a, b) => {
    // Sort by box area (smaller boxes first) to handle nesting properly
    const areaA = a.width * a.height
    const areaB = b.width * b.height
    return areaA - areaB
  })

  for (const box of sortedBoxes) {
    // Check if click is within this box
    if (point.x >= box.x && point.x <= box.x + box.width &&
        point.y >= box.y && point.y <= box.y + box.height) {
      return box
    }
  }

  return null
}

// Helper: Add node to a parent box (as child of the parent node)
function addNodeToParentBox(parentId: string, event: MouseEvent) {
  if (!graphRef.value) return

  // Get canvas position from mouse event
  const svgPoint = graphRef.value.translateFromDomToSvgCoordinates({ x: event.offsetX, y: event.offsetY })

  // Create new node as child of the parent box's node
  const newId = `node-${++nodeCounter}`
  nodes.value[newId] = {
    name: `Node ${nodeCounter}`,
    parentId: parentId,
    order: Object.values(nodes.value).filter(n => n.parentId === parentId).length,
    zIndex: 1000 // Start with higher z-index for new nodes
  }
  layouts.value.nodes[newId] = { x: svgPoint.x, y: svgPoint.y }

  // Create hierarchy edge
  const edgeId = `edge-${parentId}-${newId}`
  edges.value[edgeId] = { source: parentId, target: newId, type: 'hierarchy' }

  // Update parent boxes immediately
  calculateParentBoxes()

  $q.notify({
    type: 'positive',
    message: `Added child to ${nodes.value[parentId]?.name || 'parent'}`,
    timeout: 1000,
  })
}

// Canvas context menu functions
function addChildNodeAtCanvas() {
  // Add a root node at the position where context menu was opened
  const newId = `node-${++nodeCounter}`
  nodes.value[newId] = {
    name: `Node ${nodeCounter}`,
    parentId: null, // Root node
    order: Object.values(nodes.value).filter(n => n.parentId === null).length,
    zIndex: 1000
  }
  
  // Use stored mouse position, fallback to center if not available
  const position = canvasContextMenuPosition.value || { x: 0, y: 0 }
  layouts.value.nodes[newId] = { x: position.x, y: position.y }

  canvasContextMenuVisible.value = false
  canvasContextMenuPosition.value = null // Clear stored position

  $q.notify({
    type: 'positive',
    message: 'Child node added at cursor position',
    timeout: 1000,
  })
}

function zoomIn() {
  if (!graphRef.value) return
  const newZoom = Math.min(graphZoomLevel.value * 1.2, 2.0)
  graphZoomLevel.value = newZoom
  canvasContextMenuVisible.value = false
  canvasContextMenuPosition.value = null // Clear stored position

  $q.notify({
    type: 'info',
    message: `Zoomed in to ${Math.round(newZoom * 100)}%`,
    timeout: 800,
  })
}

function zoomOut() {
  if (!graphRef.value) return
  const newZoom = Math.max(graphZoomLevel.value / 1.2, 0.1)
  graphZoomLevel.value = newZoom
  canvasContextMenuVisible.value = false
  canvasContextMenuPosition.value = null // Clear stored position

  $q.notify({
    type: 'info',
    message: `Zoomed out to ${Math.round(newZoom * 100)}%`,
    timeout: 800,
  })
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

  // Only reference edges are supported in concept maps
  const isReference = true

  // For reference edges, no circular reference check needed
  if (isReference) {
    // Create reference edge
    edges.value[edgeId] = {
      source: sourceId,
      target: targetId,
      type: 'reference'
    }

    $q.notify({
      type: 'positive',
      message: 'Reference connection created',
      timeout: 1000,
    })
  }

  // Update parent boxes immediately when edges change
  calculateParentBoxes()
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

// Watch for changes in layouts and nodes to update parent boxes (but skip during drag for performance)
watch([layouts, nodes], () => {
  if (!isDragging.value) {
    calculateParentBoxes()
  }
}, { deep: true })

// Watch for changes in box padding to update parent boxes
watch(boxPadding, () => {
  calculateParentBoxes()
})

// Keyboard shortcuts
function handleKeyDown(event: KeyboardEvent) {
  // Shift - Enter box selection mode
  if (event.shiftKey && !isBoxSelecting.value) {
    if (!isShiftPressed.value && graphRef.value) {
      isShiftPressed.value = true
      isBoxSelecting.value = true
      graphRef.value.startBoxSelection({
        stop: 'click',
        type: 'append',
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
  // Exit box selection mode when Shift is released
  if (isShiftPressed.value && !event.shiftKey) {
    isShiftPressed.value = false
    isBoxSelecting.value = false
    if (graphRef.value) {
      graphRef.value.stopBoxSelection()
    }
  }
}

// Close context menu on click outside
function handleClickOutside() {
  contextMenuVisible.value = false
  canvasContextMenuVisible.value = false
  canvasContextMenuPosition.value = null // Clear stored position
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
