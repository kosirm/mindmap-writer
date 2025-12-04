<template>
  <div class="conceptmap-canvas">
    <VueFlow
      ref="vueFlowRef"
      :nodes="vueFlowNodes"
      :edges="vueFlowEdges"
      :min-zoom="0.05"
      :max-zoom="3"
      :only-render-visible-elements="true"
      @node-drag-start="onNodeDragStart"
      @node-drag="onNodeDrag"
      @node-drag-stop="onNodeDragStop"
      @node-context-menu="onNodeContextMenu"
      @pane-click="onPaneClick"
    >
      <Background />
      <MiniMap pannable zoomable v-if="showMinimap" />

      <template #node-concept="{ data, id }">
        <ConceptNode
          :data="data"
          :node-id="id"
          :is-parent="hasChildren(id)"
        />
      </template>
    </VueFlow>

    <!-- Context Menu -->
    <div v-if="contextMenu.visible" class="context-menu" :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }">
      <div class="context-menu-item" @click="createChildNode">
        <q-icon name="add" size="16px" class="q-mr-sm" />
        Add Child
      </div>
      <div class="context-menu-item" @click="createSiblingNode">
        <q-icon name="add_box" size="16px" class="q-mr-sm" />
        Add Sibling
      </div>
      <div class="context-menu-item" @click="createParentNode">
        <q-icon name="account_tree" size="16px" class="q-mr-sm" />
        Wrap in Parent
      </div>
      <q-separator class="q-my-xs" />
      <div v-if="!isRootNode(contextMenu.nodeId)" class="context-menu-item" @click="detachFromParent">
        <q-icon name="link_off" size="16px" class="q-mr-sm" />
        Detach from Parent
      </div>
      <div class="context-menu-item context-menu-item-danger" @click="deleteNode">
        <q-icon name="delete" size="16px" class="q-mr-sm" />
        Delete
      </div>
    </div>

    <!-- Zoom Indicator -->
    <div v-if="showZoomIndicator" class="zoom-indicator">
      <div class="zoom-value">{{ zoomPercent }}%</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import type { Node, Edge, NodeMouseEvent, NodeDragEvent } from '@vue-flow/core'
import ConceptNode from './ConceptNode.vue'
import type { NodeData, ContextMenuState } from '../mindmap/types'

// Import concept map composables
import { useConceptMapLayout } from '../../composables/conceptmap/useConceptMapLayout'
import { useConceptMapCollision } from '../../composables/conceptmap/useConceptMapCollision'

// Props - receive shared nodes from parent
const props = defineProps<{
  nodes: NodeData[]
  edges: Edge[]
}>()

const emit = defineEmits<{
  'update:nodes': [nodes: NodeData[]]
  'nodes-changed': []
  'create-edge': [source: string, target: string]
  'remove-edge': [source: string, target: string]
  'add-node': [node: NodeData]
  'delete-nodes': [nodeIds: string[]]
  'update-node': [nodeId: string, updates: Partial<NodeData>]
}>()

// VueFlow instance
const { viewport, fitView } = useVueFlow()

// UI state
const showMinimap = ref(true)
const showZoomIndicator = ref(true)

// Context menu state
const contextMenu = ref<ContextMenuState>({ visible: false, x: 0, y: 0, nodeId: null })

// Node counter for generating unique IDs
const nodeCounter = ref(100) // Start at 100 to avoid conflicts with mindmap nodes

// Constants for concept map layout
// NOTE: These should match the values in useConceptMapCollision.ts and useConceptMapLayout.ts
const PADDING = 20 // Padding inside parent nodes (consistent with collision composable)
const MIN_NODE_WIDTH = 150
const MIN_NODE_HEIGHT = 60

// Create a reactive ref wrapper for nodes (composables need Ref<NodeData[]>)
const nodesRef = ref<NodeData[]>([])
// Keep nodesRef synced with props.nodes
watch(() => props.nodes, (newNodes) => {
  nodesRef.value = newNodes
}, { immediate: true })

// ============================================================
// HELPER FUNCTIONS (defined before composables that depend on them)
// ============================================================

// Helper to check if a node has children
function hasChildren(nodeId: string): boolean {
  return props.nodes.some(n => n.parentId === nodeId)
}

// Get direct children of a node
function getDirectChildren(nodeId: string): NodeData[] {
  return props.nodes.filter(n => n.parentId === nodeId)
}

// Calculate parent node size based on children positions (recursive)
// Uses the same logic as adjustParentSize in collision composable for consistency
function calculateParentSize(nodeId: string): { width: number; height: number } {
  const children = getDirectChildren(nodeId)
  if (children.length === 0) {
    return { width: MIN_NODE_WIDTH, height: MIN_NODE_HEIGHT }
  }

  // Only consider initialized children
  const initializedChildren = children.filter(c => c.conceptMapPosition != null)
  if (initializedChildren.length === 0) {
    return { width: MIN_NODE_WIDTH, height: MIN_NODE_HEIGHT }
  }

  let maxRight = 0
  let maxBottom = 0

  for (const child of initializedChildren) {
    const childPos = child.conceptMapPosition!
    // For parent nodes, recursively get their size
    const childSize = hasChildren(child.id)
      ? calculateParentSize(child.id)
      : { width: child.conceptMapSize?.width ?? MIN_NODE_WIDTH, height: child.conceptMapSize?.height ?? MIN_NODE_HEIGHT }

    // Child position is relative to parent, so right/bottom edge is pos + size
    const rightEdge = childPos.x + childSize.width
    const bottomEdge = childPos.y + childSize.height

    if (rightEdge > maxRight) maxRight = rightEdge
    if (bottomEdge > maxBottom) maxBottom = bottomEdge
  }

  // Parent size: need to fit from 0 to maxRight/maxBottom plus padding
  return {
    width: Math.max(MIN_NODE_WIDTH, maxRight + PADDING),
    height: Math.max(MIN_NODE_HEIGHT, maxBottom + PADDING)
  }
}

// ============================================================
// COMPOSABLES
// ============================================================

// Initialize composables
const {
  recalculateLayout: recalculateConceptMapLayout,
  isInitialized: isConceptMapInitialized
} = useConceptMapLayout(
  nodesRef,
  getDirectChildren
)

const {
  resolveSiblingOverlaps,
  resolveOverlapsForNode
} = useConceptMapCollision(
  nodesRef,
  getDirectChildren,
  calculateParentSize // Pass calculateParentSize for accurate container sizes
)

// Computed
const zoomPercent = computed(() => Math.round(viewport.value.zoom * 100))

// Convert our NodeData to VueFlow nodes with nested structure
// IMPORTANT: VueFlow requires parent nodes to appear BEFORE their children in the array
const vueFlowNodes = computed<Node[]>(() => {
  const result: Node[] = []

  // Sort nodes: parents before children (topological sort by depth)
  const sortedNodes = [...props.nodes].sort((a, b) => {
    const depthA = getNodeDepth(a.id)
    const depthB = getNodeDepth(b.id)
    return depthA - depthB
  })

  // Debug: Log sorted order
  console.log('vueFlowNodes sorted order:', sortedNodes.map(n => `${n.id}(depth=${getNodeDepth(n.id)})`).join(' → '))

  for (const node of sortedNodes) {
    const pos = node.conceptMapPosition ?? { x: node.x, y: node.y }
    const isParent = hasChildren(node.id)

    // Use stored conceptMapSize if available, otherwise calculate dynamically
    // During initial layout, conceptMapSize is set by the layout composable
    // During drag operations, calculateParentSize provides dynamic sizing
    let sizeInfo: { width: number; height: number }
    if (node.conceptMapSize) {
      // Use the stored size (from layout calculation or previous state)
      sizeInfo = node.conceptMapSize
    } else if (isParent) {
      // No stored size, calculate dynamically (for backwards compatibility or drag operations)
      sizeInfo = calculateParentSize(node.id)
    } else {
      // Leaf node with no stored size
      sizeInfo = { width: MIN_NODE_WIDTH, height: MIN_NODE_HEIGHT }
    }

    const vfNode: Node = {
      id: node.id,
      type: 'concept',
      position: { x: pos.x, y: pos.y },
      data: {
        label: node.label,
        isParent,
        width: sizeInfo.width,
        height: sizeInfo.height
      },
      style: {
        width: `${sizeInfo.width}px`,
        height: `${sizeInfo.height}px`
      }
    }

    // Set parentNode for nested nodes (not root nodes)
    if (node.parentId) {
      vfNode.parentNode = node.parentId
      vfNode.expandParent = true // Allow child to expand parent
    }

    // Bring dragged nodes and their ancestors to front during drag operations
    // This ensures dragged nodes and expanding parents overlay other nodes
    if (dragElevatedNodeIds.value.has(node.id)) {
      vfNode.zIndex = 1000
    }

    result.push(vfNode)
  }

  return result
})

// Helper to get node depth (root = 0, child of root = 1, etc.)
function getNodeDepth(nodeId: string): number {
  let depth = 0
  let currentNode = props.nodes.find(n => n.id === nodeId)
  while (currentNode?.parentId) {
    depth++
    currentNode = props.nodes.find(n => n.id === currentNode!.parentId)
  }
  return depth
}

// In concept map, we don't show edges - parent-child relationships are represented by nesting
const vueFlowEdges = computed<Edge[]>(() => {
  // Return empty array - no edges in concept map view
  return []
})

// Drag tracking for direction-based resizing
// Track start positions for all selected nodes
const dragStartPositions = ref<Map<string, { x: number; y: number }>>(new Map())
// Track nodes that should be brought to front during drag (dragged nodes + their ancestors)
const dragElevatedNodeIds = ref<Set<string>>(new Set())

// Event handlers
function onNodeDragStart(event: NodeDragEvent) {
  // Store initial positions of all dragged nodes
  dragStartPositions.value.clear()
  dragElevatedNodeIds.value.clear()

  event.nodes.forEach(vfNode => {
    dragStartPositions.value.set(vfNode.id, { x: vfNode.position.x, y: vfNode.position.y })

    // Add the dragged node itself to elevated set
    dragElevatedNodeIds.value.add(vfNode.id)

    // Also add all ancestor parents (they expand when child is dragged)
    const nodeData = props.nodes.find(n => n.id === vfNode.id)
    if (nodeData?.parentId) {
      let currentParentId: string | null = nodeData.parentId
      while (currentParentId) {
        dragElevatedNodeIds.value.add(currentParentId)
        const parent = props.nodes.find(n => n.id === currentParentId)
        currentParentId = parent?.parentId ?? null
      }
    }
  })
}

function onNodeDrag(event: NodeDragEvent) {
  // Process all dragged nodes
  event.nodes.forEach(vfNode => {
    const nodeData = props.nodes.find(n => n.id === vfNode.id)
    const startPos = dragStartPositions.value.get(vfNode.id)
    if (!nodeData || !startPos) return

    const newX = vfNode.position.x
    const newY = vfNode.position.y

    // Calculate movement direction from start position
    const deltaX = newX - startPos.x
    const deltaY = newY - startPos.y

    // Update node position
    nodeData.conceptMapPosition = { x: newX, y: newY }

    // Handle parent resizing based on direction
    if (nodeData.parentId) {
      adjustParentBasedOnDirection(nodeData.parentId, nodeData.id, deltaX, deltaY)
    }

    // Update start position for next drag event
    dragStartPositions.value.set(vfNode.id, { x: newX, y: newY })
  })
}

// Adjust parent based on child movement direction
// originalDraggedId tracks the node the user is actually dragging (to avoid shifting it)
function adjustParentBasedOnDirection(
  parentId: string,
  movingChildId: string,
  deltaX: number,
  deltaY: number,
  originalDraggedId?: string
) {
  const parent = props.nodes.find(n => n.id === parentId)
  if (!parent) return

  // Track the original dragged node through recursion
  const draggedId = originalDraggedId ?? movingChildId

  const children = getDirectChildren(parentId)
  const initializedChildren = children.filter(c => c.conceptMapPosition != null)
  if (initializedChildren.length === 0) return

  const headerHeight = 30
  const minX = PADDING
  const minY = PADDING + headerHeight
  const parentPos = parent.conceptMapPosition ?? { x: 0, y: 0 }
  const parentSize = parent.conceptMapSize ?? { width: 200, height: 100 }

  let parentShiftX = 0
  let parentShiftY = 0

  // Calculate bounding box of all children
  let minChildX = Infinity
  let minChildY = Infinity
  let maxChildRight = 0
  let maxChildBottom = 0

  for (const child of initializedChildren) {
    const pos = child.conceptMapPosition!
    const size = hasChildren(child.id)
      ? (child.conceptMapSize ?? { width: MIN_NODE_WIDTH, height: MIN_NODE_HEIGHT })
      : { width: child.conceptMapSize?.width ?? MIN_NODE_WIDTH, height: child.conceptMapSize?.height ?? MIN_NODE_HEIGHT }

    if (pos.x < minChildX) minChildX = pos.x
    if (pos.y < minChildY) minChildY = pos.y
    if (pos.x + size.width > maxChildRight) maxChildRight = pos.x + size.width
    if (pos.y + size.height > maxChildBottom) maxChildBottom = pos.y + size.height
  }

  // Check LEFT boundary - expand if any child is out of bounds
  // Always check this regardless of delta direction to handle nested expansions
  if (minChildX < minX) {
    parentShiftX = minChildX - minX // negative value = expand left
  }
  // Only contract if moving right AND there's unused space
  else if (deltaX > 0 && minChildX > minX) {
    parentShiftX = minChildX - minX // positive value = contract left
  }

  // Check if we need to expand right
  if (deltaX > 0) {
    const neededWidth = maxChildRight + PADDING
    if (neededWidth > parentSize.width) {
      parent.conceptMapSize = {
        width: neededWidth,
        height: parentSize.height
      }
    }
  }

  // Check TOP boundary - expand if any child is out of bounds
  if (minChildY < minY) {
    parentShiftY = minChildY - minY // negative value = expand up
  }
  // Only contract if moving down AND there's unused space
  else if (deltaY > 0 && minChildY > minY) {
    parentShiftY = minChildY - minY // positive value = contract top
  }

  // Check if we need to expand bottom
  if (deltaY > 0) {
    const neededHeight = maxChildBottom + PADDING
    if (neededHeight > parentSize.height) {
      parent.conceptMapSize = {
        width: parent.conceptMapSize?.width ?? parentSize.width,
        height: neededHeight
      }
    }
  }

  // Apply shifts (for left/top expansion OR contraction)
  if (Math.abs(parentShiftX) > 0.5 || Math.abs(parentShiftY) > 0.5) {
    // Adjust parent size (subtract shift: negative shift = expand, positive shift = contract)
    parent.conceptMapSize = {
      width: (parent.conceptMapSize?.width ?? parentSize.width) - parentShiftX,
      height: (parent.conceptMapSize?.height ?? parentSize.height) - parentShiftY
    }

    // Move parent position
    parent.conceptMapPosition = {
      x: parentPos.x + parentShiftX,
      y: parentPos.y + parentShiftY
    }

    // Adjust all children to compensate EXCEPT the node being dragged by the user
    // (VueFlow manages the dragged node's position directly)
    for (const child of initializedChildren) {
      // Skip the originally dragged node - VueFlow is controlling its position
      if (child.id === draggedId) continue

      const pos = child.conceptMapPosition!
      child.conceptMapPosition = {
        x: pos.x - parentShiftX,
        y: pos.y - parentShiftY
      }
    }

    // Recursively handle grandparent - pass the original dragged ID
    if (parent.parentId) {
      adjustParentBasedOnDirection(parent.parentId, parentId, parentShiftX, parentShiftY, draggedId)
    }
  }
}

function onNodeDragStop(event: NodeDragEvent) {
  // Collect unique parent IDs to resolve overlaps at each level
  const affectedParentIds = new Set<string | null>()

  // Update final positions for all dragged nodes
  event.nodes.forEach(vfNode => {
    const nodeData = props.nodes.find(n => n.id === vfNode.id)
    if (nodeData) {
      nodeData.conceptMapPosition = { x: vfNode.position.x, y: vfNode.position.y }
      affectedParentIds.add(nodeData.parentId)
    }
  })

  // Recalculate parent sizes to fit children (bottom-up)
  affectedParentIds.forEach(parentId => {
    if (parentId) {
      recalculateParentSizeBottomUp(parentId)
    }
  })

  // Resolve overlaps for each affected parent level
  affectedParentIds.forEach(parentId => {
    resolveSiblingOverlaps(parentId)
  })

  // Also resolve overlaps for each dragged node (handles parent size changes)
  event.nodes.forEach(vfNode => {
    resolveOverlapsForNode(vfNode.id)
  })

  emit('nodes-changed')
  dragStartPositions.value.clear()
  dragElevatedNodeIds.value.clear() // Reset z-index elevation
}

// Recalculate parent size to fit all children (and propagate up)
// Also normalizes children positions if there's unused space on left/top
function recalculateParentSizeBottomUp(nodeId: string) {
  const node = props.nodes.find(n => n.id === nodeId)
  if (!node) return

  const children = getDirectChildren(nodeId)
  if (children.length === 0) return // Not a parent

  // Only consider initialized children
  const initializedChildren = children.filter(c => c.conceptMapPosition != null)
  if (initializedChildren.length === 0) return

  const headerHeight = 30
  const minAllowedX = PADDING
  const minAllowedY = PADDING + headerHeight

  // First pass: find bounding box of all children
  let minX = Infinity
  let minY = Infinity
  let maxRight = 0
  let maxBottom = 0

  for (const child of initializedChildren) {
    const childPos = child.conceptMapPosition!
    const childSize = hasChildren(child.id)
      ? (child.conceptMapSize ?? calculateParentSize(child.id))
      : { width: child.conceptMapSize?.width ?? MIN_NODE_WIDTH, height: child.conceptMapSize?.height ?? MIN_NODE_HEIGHT }

    if (childPos.x < minX) minX = childPos.x
    if (childPos.y < minY) minY = childPos.y

    const rightEdge = childPos.x + childSize.width
    const bottomEdge = childPos.y + childSize.height
    if (rightEdge > maxRight) maxRight = rightEdge
    if (bottomEdge > maxBottom) maxBottom = bottomEdge
  }

  // Calculate how much unused space there is on left/top
  // If children have been shifted right/down due to left/top expansion,
  // we need to shift them back and also adjust parent position
  const excessLeft = minX - minAllowedX
  const excessTop = minY - minAllowedY

  if (excessLeft > 0 || excessTop > 0) {
    const shiftX = excessLeft > 0 ? excessLeft : 0
    const shiftY = excessTop > 0 ? excessTop : 0

    // Shift all children back toward the minimum allowed position
    for (const child of initializedChildren) {
      const childPos = child.conceptMapPosition!
      child.conceptMapPosition = {
        x: childPos.x - shiftX,
        y: childPos.y - shiftY
      }
    }

    // Shift parent position in opposite direction to keep children in same absolute position
    const parentPos = node.conceptMapPosition ?? { x: 0, y: 0 }
    node.conceptMapPosition = {
      x: parentPos.x + shiftX,
      y: parentPos.y + shiftY
    }

    // Update bounds after shift
    maxRight -= shiftX
    maxBottom -= shiftY
  }

  // Update parent size: need to fit from 0 to maxRight/maxBottom plus padding
  node.conceptMapSize = {
    width: Math.max(MIN_NODE_WIDTH, maxRight + PADDING),
    height: Math.max(MIN_NODE_HEIGHT, maxBottom + PADDING)
  }

  // Propagate up to grandparent
  if (node.parentId) {
    recalculateParentSizeBottomUp(node.parentId)
  }
}

function onPaneClick() {
  closeContextMenu()
}

function onNodeContextMenu(event: NodeMouseEvent) {
  if ('clientX' in event.event) {
    event.event.preventDefault()
    contextMenu.value = { visible: true, x: event.event.clientX, y: event.event.clientY, nodeId: event.node.id }
  }
}

function closeContextMenu() {
  contextMenu.value = { visible: false, x: 0, y: 0, nodeId: null }
}

function isRootNode(nodeId: string | null): boolean {
  if (!nodeId) return false
  const node = props.nodes.find(n => n.id === nodeId)
  return node ? node.parentId === null : false
}

function getNode(nodeId: string): NodeData | undefined {
  return props.nodes.find(n => n.id === nodeId)
}

// Get all descendants of a node recursively
function getAllDescendants(nodeId: string): NodeData[] {
  const descendants: NodeData[] = []
  const children = getDirectChildren(nodeId)
  for (const child of children) {
    descendants.push(child)
    descendants.push(...getAllDescendants(child.id))
  }
  return descendants
}

// Create a new node
function createNode(label: string, parentId: string | null, x: number, y: number): NodeData {
  const id = `concept-${nodeCounter.value++}`
  const newNode: NodeData = {
    id,
    label,
    parentId,
    x: 0,
    y: 0,
    conceptMapPosition: { x, y },
    width: MIN_NODE_WIDTH,
    height: MIN_NODE_HEIGHT,
    conceptMapSize: { width: MIN_NODE_WIDTH, height: MIN_NODE_HEIGHT }
  }
  emit('add-node', newNode)
  return newNode
}

// Create child node inside current node
function createChildNode() {
  if (!contextMenu.value.nodeId) return
  const parentNode = getNode(contextMenu.value.nodeId)
  if (!parentNode) return

  // Calculate position inside parent
  const children = getDirectChildren(parentNode.id)
  const y = PADDING + 30 + children.length * 70 // Stack children vertically

  const newNode = createNode(`Child ${nodeCounter.value}`, parentNode.id, PADDING, y)

  // Create edge from parent to child
  emit('create-edge', parentNode.id, newNode.id)

  // Resolve overlaps after adding new child (parent may grow and overlap siblings)
  void nextTick(() => {
    resolveOverlapsForNode(newNode.id)
    // Also resolve parent's siblings since parent size changed
    if (parentNode.parentId !== null) {
      resolveSiblingOverlaps(parentNode.parentId)
    } else {
      resolveSiblingOverlaps(null) // Parent is root, resolve root siblings
    }
    emit('nodes-changed')
  })

  closeContextMenu()
}

// Create sibling node at same level
function createSiblingNode() {
  if (!contextMenu.value.nodeId) return
  const currentNode = getNode(contextMenu.value.nodeId)
  if (!currentNode) return

  const currentPos = currentNode.conceptMapPosition ?? { x: 0, y: 0 }

  // Position below current node
  const y = currentPos.y + (currentNode.conceptMapSize?.height ?? MIN_NODE_HEIGHT) + 20

  const newNode = createNode(`Sibling ${nodeCounter.value}`, currentNode.parentId, currentPos.x, y)

  // If has parent, create edge from parent to sibling
  if (currentNode.parentId) {
    emit('create-edge', currentNode.parentId, newNode.id)
  }

  // Resolve overlaps after adding new sibling
  void nextTick(() => {
    resolveOverlapsForNode(newNode.id)
    emit('nodes-changed')
  })

  closeContextMenu()
}

// Wrap current node in a new parent
function createParentNode() {
  if (!contextMenu.value.nodeId) return
  const currentNode = getNode(contextMenu.value.nodeId)
  if (!currentNode) return

  const currentPos = currentNode.conceptMapPosition ?? { x: 0, y: 0 }
  const oldParentId = currentNode.parentId

  // Create new parent at current node's position
  const newParent = createNode(`Parent ${nodeCounter.value}`, oldParentId, currentPos.x, currentPos.y)

  // Move current node inside new parent - emit update instead of mutating
  emit('update-node', currentNode.id, {
    parentId: newParent.id,
    conceptMapPosition: { x: PADDING, y: PADDING + 30 }
  })

  // Update edges: old parent -> new parent, new parent -> current node
  if (oldParentId) {
    emit('remove-edge', oldParentId, currentNode.id)
    emit('create-edge', oldParentId, newParent.id)
  }
  emit('create-edge', newParent.id, currentNode.id)

  // Resolve overlaps after wrapping in new parent
  void nextTick(() => {
    resolveOverlapsForNode(newParent.id)
    emit('nodes-changed')
  })

  closeContextMenu()
}

// Detach node from parent (make it a root)
function detachFromParent() {
  if (!contextMenu.value.nodeId) return
  const currentNode = getNode(contextMenu.value.nodeId)
  if (!currentNode || !currentNode.parentId) return

  const oldParentId = currentNode.parentId

  // Convert from relative to absolute position
  // For nested nodes, we need to calculate the absolute position
  let absoluteX = currentNode.conceptMapPosition?.x ?? 0
  let absoluteY = currentNode.conceptMapPosition?.y ?? 0

  // Walk up the parent chain to get absolute position
  let parent = getNode(oldParentId)
  while (parent) {
    const parentPos = parent.conceptMapPosition ?? { x: 0, y: 0 }
    absoluteX += parentPos.x
    absoluteY += parentPos.y
    parent = parent.parentId ? getNode(parent.parentId) : undefined
  }

  // Make it a root node - emit update instead of mutating
  emit('update-node', currentNode.id, {
    parentId: null,
    conceptMapPosition: { x: absoluteX + 50, y: absoluteY } // Offset slightly
  })

  // Remove edge from old parent
  emit('remove-edge', oldParentId, currentNode.id)

  // Resolve overlaps after detaching (now a root node, resolve root siblings)
  void nextTick(() => {
    resolveSiblingOverlaps(null)
    // Also resolve old parent's siblings since it may have shrunk
    const oldParent = getNode(oldParentId)
    if (oldParent) {
      resolveSiblingOverlaps(oldParent.parentId)
    }
    emit('nodes-changed')
  })

  closeContextMenu()
}

// Delete node and its descendants
function deleteNode() {
  if (!contextMenu.value.nodeId) return
  const nodeId = contextMenu.value.nodeId
  const node = getNode(nodeId)
  if (!node) return

  const parentId = node.parentId

  // Get all descendants to delete
  const descendants = getAllDescendants(nodeId)
  const nodesToDelete = [nodeId, ...descendants.map(d => d.id)]

  // Remove edges first
  if (parentId) {
    emit('remove-edge', parentId, nodeId)
  }

  // Emit delete event instead of mutating props
  emit('delete-nodes', nodesToDelete)

  // Resolve overlaps after deletion (parent may shrink, siblings may have room)
  void nextTick(() => {
    resolveSiblingOverlaps(parentId)
    emit('nodes-changed')
  })

  closeContextMenu()
}

/**
 * Initialize concept map layout - INCREMENTAL approach
 *
 * Key insight: Only initialize nodes that DON'T have conceptMapPosition yet.
 * This handles:
 * 1. First time: All nodes are new → calculate positions for all
 * 2. After edits in mindmap: Some nodes initialized, some new → only position new ones
 *
 * For NEW ROOT nodes: Place them continuing the grid pattern (right of existing, or new row)
 * For NEW CHILD nodes: Place them inside their parent at the next available position
 */
async function initializeLayout() {
  console.log('=== ConceptMapView: initializeLayout START (INCREMENTAL) ===')
  console.log('Total nodes:', props.nodes.length)

  // Debug: Show ALL node positions at start
  console.log('Node positions at START of initializeLayout:')
  for (const node of props.nodes) {
    console.log(`  ${node.id}: x=${node.x}, y=${node.y}, conceptMapPosition=${JSON.stringify(node.conceptMapPosition)}, conceptMapSize=${JSON.stringify(node.conceptMapSize)}`)
  }

  // Separate nodes into initialized vs uninitialized
  const initializedNodes = props.nodes.filter(n => n.conceptMapPosition != null)
  const uninitializedNodes = props.nodes.filter(n => n.conceptMapPosition == null)

  console.log(`Initialized: ${initializedNodes.length}, Uninitialized: ${uninitializedNodes.length}`)

  if (uninitializedNodes.length === 0) {
    console.log('All nodes already initialized, nothing to do')
    await nextTick()
    void fitView({ padding: 0.2, duration: 300 })
    return
  }

  // FIRST: Calculate sizes for ALL uninitialized nodes (bottom-up)
  // We need sizes before we can position them
  const uninitBottomUp = getBottomUpOrderFiltered(uninitializedNodes)
  for (const node of uninitBottomUp) {
    if (node.conceptMapSize == null) {
      calculateNodeSize(node)
    }
  }
  console.log('Sizes calculated for uninitialized nodes')

  // Find bounding box of existing initialized root nodes (for placing new roots)
  const existingRoots = initializedNodes.filter(n => n.parentId === null)
  const existingBounds = calculateBoundingBox(existingRoots)
  console.log('Existing roots bounding box:', existingBounds)

  // Grid layout settings for new roots
  const ROOTS_PER_ROW = 3
  const ROW_SPACING = PADDING * 4

  // Track position for new root nodes
  let newRootX = existingBounds.maxX + PADDING * 3
  let newRootY = existingBounds.minY
  let newRootsInCurrentRow = 0
  let currentRowMaxHeight = 0

  // Group uninitialized nodes by depth level
  const uninitByLevel = new Map<number, NodeData[]>()
  for (const node of uninitializedNodes) {
    const depth = getNodeDepth(node.id)
    if (!uninitByLevel.has(depth)) {
      uninitByLevel.set(depth, [])
    }
    uninitByLevel.get(depth)!.push(node)
  }

  const maxDepth = uninitByLevel.size > 0 ? Math.max(...uninitByLevel.keys()) : -1

  // SECOND: Process level by level (top-down) with DOM sync
  for (let level = 0; level <= maxDepth; level++) {
    const nodesAtLevel = uninitByLevel.get(level) ?? []
    if (nodesAtLevel.length === 0) continue

    console.log(`\n=== Processing Level ${level} (${nodesAtLevel.length} uninitialized nodes) ===`)

    for (const node of nodesAtLevel) {
      console.log(`  Checking node ${node.id}: parentId=${node.parentId}, conceptMapPosition=${JSON.stringify(node.conceptMapPosition)}`)
      // Skip if already has position (shouldn't happen, but safety check)
      if (node.conceptMapPosition != null) {
        console.log(`  ${node.id} already has position, skipping`)
        continue
      }

      if (node.parentId === null) {
        // NEW ROOT NODE - place in grid pattern
        const size = node.conceptMapSize ?? { width: MIN_NODE_WIDTH, height: MIN_NODE_HEIGHT }

        // Check if we need to start a new row
        // (either no existing roots, or we've filled ROOTS_PER_ROW in current extension)
        if (existingRoots.length === 0 && newRootsInCurrentRow >= ROOTS_PER_ROW) {
          // Start new row
          newRootX = 0
          newRootY += currentRowMaxHeight + ROW_SPACING
          newRootsInCurrentRow = 0
          currentRowMaxHeight = 0
        }

        node.conceptMapPosition = { x: newRootX, y: newRootY }
        console.log(`  NEW ROOT ${node.id}: pos=(${newRootX}, ${newRootY})`)

        newRootX += size.width + PADDING * 3
        currentRowMaxHeight = Math.max(currentRowMaxHeight, size.height)
        newRootsInCurrentRow++
      } else {
        // NEW CHILD NODE - place inside parent
        console.log(`  Processing child ${node.id} with parentId=${node.parentId}`)
        const parent = getNode(node.parentId)
        if (!parent) {
          console.warn(`  ${node.id}: Parent ${node.parentId} not found!`)
          continue
        }
        console.log(`  Found parent ${parent.id}, conceptMapPosition=${JSON.stringify(parent.conceptMapPosition)}`)

        // Ensure parent has position (should be initialized by now or in previous level)
        if (parent.conceptMapPosition == null) {
          console.warn(`  ${node.id}: Parent ${parent.id} not initialized yet! Skipping.`)
          continue
        }

        // Find position among siblings (both initialized and new)
        const siblings = getDirectChildren(parent.id)
        const siblingIndex = siblings.findIndex(s => s.id === node.id)
        console.log(`  Siblings: ${siblings.map(s => s.id).join(', ')}, this node index: ${siblingIndex}`)

        // Calculate Y position based on siblings above (whether initialized or not)
        let currentY = PADDING + 30 // Start below header
        for (let i = 0; i < siblingIndex; i++) {
          const sibling = siblings[i]
          if (sibling) {
            const sibSize = sibling.conceptMapSize ?? { width: MIN_NODE_WIDTH, height: MIN_NODE_HEIGHT }
            currentY += sibSize.height + PADDING / 2
          }
        }

        node.conceptMapPosition = { x: PADDING, y: currentY }
        console.log(`  NEW CHILD ${node.id}: relPos=(${PADDING}, ${currentY}) inside ${parent.id}`)

        // Recalculate parent size to accommodate new child
        recalculateParentSize(parent)
      }
    }

    // Emit update to trigger reactivity
    emit('nodes-changed')

    // Wait for Vue reactivity and DOM update
    await nextTick()

    // Wait for VueFlow to render (double RAF like mindmap generator)
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))

    // Run collision resolution for affected containers
    if (level === 0) {
      resolveSiblingOverlaps(null) // Root node overlaps
    }
    for (const node of nodesAtLevel) {
      if (node.parentId) {
        // Resolve overlaps among siblings in this parent
        resolveSiblingOverlaps(node.parentId)
      }
      if (hasChildren(node.id)) {
        resolveSiblingOverlaps(node.id)
      }
    }

    // Emit update again after collision resolution
    emit('nodes-changed')

    // Wait for render again
    await nextTick()
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))

    console.log(`Level ${level} complete`)
  }

  console.log('\n=== ConceptMapView: initializeLayout END ===')

  // Final fit view
  setTimeout(() => {
    void fitView({ padding: 0.2, duration: 300 })
  }, 100)
}

/**
 * Calculate node size (called during initialization)
 */
function calculateNodeSize(node: NodeData): void {
  const children = getDirectChildren(node.id)

  if (children.length === 0) {
    // Leaf node - use minimum size
    node.conceptMapSize = { width: MIN_NODE_WIDTH, height: MIN_NODE_HEIGHT }
    return
  }

  // Parent node - calculate size needed to fit all children
  let totalHeight = PADDING + 30 // Start after header
  let maxChildWidth = 0

  for (const child of children) {
    const childSize = child.conceptMapSize ?? { width: MIN_NODE_WIDTH, height: MIN_NODE_HEIGHT }
    maxChildWidth = Math.max(maxChildWidth, childSize.width)
    totalHeight += childSize.height + PADDING / 2
  }

  // Add bottom padding
  totalHeight += PADDING

  node.conceptMapSize = {
    width: maxChildWidth + PADDING * 2,
    height: totalHeight
  }
}

/**
 * Get nodes in bottom-up order (leaves first, then parents)
 * Filtered version: only includes nodes from the provided subset
 */
function getBottomUpOrderFiltered(nodeSubset: NodeData[]): NodeData[] {
  const subsetIds = new Set(nodeSubset.map(n => n.id))
  const result: NodeData[] = []
  const visited = new Set<string>()

  function visit(node: NodeData) {
    if (visited.has(node.id)) return
    visited.add(node.id)

    // First visit all children that are in the subset
    const children = getDirectChildren(node.id).filter(c => subsetIds.has(c.id))
    for (const child of children) {
      visit(child)
    }

    // Then add this node (only if in subset)
    if (subsetIds.has(node.id)) {
      result.push(node)
    }
  }

  // Start from root nodes in the subset, or from subset nodes whose parents are not in subset
  for (const node of nodeSubset) {
    if (node.parentId === null || !subsetIds.has(node.parentId)) {
      visit(node)
    }
  }

  return result
}

/**
 * Calculate bounding box of initialized root nodes
 */
function calculateBoundingBox(nodes: NodeData[]): { minX: number; minY: number; maxX: number; maxY: number } {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const node of nodes) {
    const pos = node.conceptMapPosition ?? { x: 0, y: 0 }
    const size = node.conceptMapSize ?? { width: MIN_NODE_WIDTH, height: MIN_NODE_HEIGHT }

    minX = Math.min(minX, pos.x)
    minY = Math.min(minY, pos.y)
    maxX = Math.max(maxX, pos.x + size.width)
    maxY = Math.max(maxY, pos.y + size.height)
  }

  return { minX, minY, maxX, maxY }
}

/**
 * Recalculate parent size to fit all children (after adding new child)
 */
function recalculateParentSize(parent: NodeData): void {
  const children = getDirectChildren(parent.id)
  if (children.length === 0) return

  let totalHeight = PADDING + 30 // Start after header
  let maxChildWidth = 0

  for (const child of children) {
    const childSize = child.conceptMapSize ?? { width: MIN_NODE_WIDTH, height: MIN_NODE_HEIGHT }
    maxChildWidth = Math.max(maxChildWidth, childSize.width)
    totalHeight += childSize.height + PADDING / 2
  }

  totalHeight += PADDING

  parent.conceptMapSize = {
    width: Math.max(parent.conceptMapSize?.width ?? 0, maxChildWidth + PADDING * 2),
    height: Math.max(parent.conceptMapSize?.height ?? 0, totalHeight)
  }
}

// Expose for parent component
defineExpose({
  showMinimap,
  showZoomIndicator,
  zoomPercent,
  fitView: () => fitView({ padding: 0.2, duration: 300 }),
  initializeLayout,
  recalculateLayout: recalculateConceptMapLayout,
  isInitialized: isConceptMapInitialized
})

onMounted(() => {
  // Initialize layout if needed (composable handles the "already initialized" check)
  if (props.nodes.length > 0) {
    void initializeLayout()
  }
})

// Watch for new nodes - only initialize if view is not yet initialized
// (new nodes added after initialization are positioned by the view's own logic)
watch(() => props.nodes.length, (newLength, oldLength) => {
  // Only auto-initialize if this is the first time we have nodes
  // and the view hasn't been initialized yet
  if (newLength > 0 && oldLength === 0 && !isConceptMapInitialized()) {
    void initializeLayout()
  }
})
</script>

<style scoped>
.conceptmap-canvas {
  width: 100%;
  height: 100%;
  flex: 1;
  min-height: 0;
  position: relative;
  display: flex;
  flex-direction: column;
}

.conceptmap-canvas :deep(.vue-flow) {
  flex: 1;
  min-height: 0;
}

.zoom-indicator {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(255,255,255,0.9);
  padding: 8px 12px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  font-size: 14px;
  z-index: 10;
}

.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 1000;
  min-width: 180px;
  padding: 4px 0;
}

.context-menu-item {
  padding: 10px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  font-size: 14px;
  transition: background-color 0.15s ease;
}

.context-menu-item:hover {
  background: #f5f5f5;
}

.context-menu-item-danger {
  color: #dc3545;
}

.context-menu-item-danger:hover {
  background: #fff5f5;
}
</style>

