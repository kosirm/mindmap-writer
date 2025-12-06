<template>
  <div class="conceptmap-canvas">
    <VueFlow
      :nodes="vueFlowNodes"
      :edges="visibleEdges"
      :min-zoom="0.05"
      :max-zoom="3"
      :only-render-visible-elements="true"
      :selection-key-code="null"
      :multi-selection-key-code="'Shift'"
      :select-nodes-on-drag="true"
      :connect-on-click="false"
      :default-edge-options="{ type: 'straight' }"
      :is-valid-connection="isValidConnection"
      @node-drag-start="onNodeDragStart"
      @node-drag="onNodeDrag"
      @node-drag-stop="onNodeDragStop"
      @node-context-menu="onNodeContextMenu"
      @node-click="onNodeClick"
      @selection-change="onSelectionChange"
      @pane-click="onPaneClick"
      @connect="onConnect"
      @connect-start="onConnectStart"
      @connect-end="onConnectEnd"
    >
      <Background />
      <MiniMap pannable zoomable v-if="showMinimap" />

      <template #node-concept="{ data, id }">
        <ConceptNode :data="data" :node-id="id" :is-parent="hasChildren(id)" />
      </template>
    </VueFlow>

    <!-- SVG Overlay for canvas center indicator -->
    <svg class="canvas-overlay" v-if="showCanvasCenter">
      <g :style="{ transform: viewportTransform }">
        <line x1="-20" y1="0" x2="20" y2="0" stroke="#ff6b6b" stroke-width="2" />
        <line x1="0" y1="-20" x2="0" y2="20" stroke="#ff6b6b" stroke-width="2" />
        <circle cx="0" cy="0" r="3" fill="#ff6b6b" />
      </g>
    </svg>

    <!-- Context Menu -->
    <div v-if="contextMenu.visible" class="context-menu" :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }">
      <div class="context-menu-item" @click="addChildNode">
        <q-icon name="add" size="16px" class="q-mr-sm" />Add Child
      </div>
      <div class="context-menu-item" @click="addSiblingNode">
        <q-icon name="add_box" size="16px" class="q-mr-sm" />Add Sibling
      </div>
      <q-separator class="q-my-xs" />
      <div v-if="contextMenu.nodeId && !isRootNode(contextMenu.nodeId)" class="context-menu-item" @click="detachFromParent">
        <q-icon name="link_off" size="16px" class="q-mr-sm" />Detach from Parent
      </div>
      <div class="context-menu-item context-menu-item-danger" @click="deleteSelectedNode">
        <q-icon name="delete" size="16px" class="q-mr-sm" />Delete
      </div>
    </div>

    <!-- Zoom Indicator -->
    <div v-if="showZoomIndicator" class="zoom-indicator">{{ zoomPercent }}%</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import type { Node, Edge, NodeMouseEvent, NodeDragEvent } from '@vue-flow/core'
import ConceptNode from './ConceptNode.vue'
import type { NodeData, ContextMenuState } from '../mindmap/types'

// Store & Events
import { useDocumentStore } from 'src/core/stores/documentStore'
import { useViewEvents } from 'src/core/events'
import { useDevSettingsStore } from 'src/dev/devSettingsStore'
import { storeToRefs } from 'pinia'

// Composables
import { useConceptMapLayout } from '../../composables/conceptmap/useConceptMapLayout'
import { useConceptMapCollision } from '../../composables/conceptmap/useConceptMapCollision'
import { useReferenceEdges } from '../../composables/useReferenceEdges'

// ============================================================
// STATE & SETUP
// ============================================================
const { viewport, fitView, setViewport, findNode, updateNodeInternals, setNodes } = useVueFlow()
const documentStore = useDocumentStore()
const devSettings = useDevSettingsStore()
const { referenceEdgeType } = storeToRefs(devSettings)
const { onStoreEvent, source } = useViewEvents('concept-map')

// Local node state (converted from store)
const nodes = ref<NodeData[]>([])

// Local edge state (for reference edges)
const edges = ref<Edge[]>([])

// VueFlow nodes (managed by VueFlow via v-model)
const vueFlowNodes = ref<Node[]>([])

// Reference edges composable - for creating non-hierarchical connections
const {
  onConnectStart: onReferenceConnectStart,
  onConnectEnd: onReferenceConnectEnd,
  onConnect: onReferenceConnect,
  setupKeyboardListeners: setupReferenceKeyboardListeners,
  cleanupKeyboardListeners: cleanupReferenceKeyboardListeners
} = useReferenceEdges(edges, 'conceptmap')

// UI state
const showMinimap = ref(true)
const showZoomIndicator = ref(true)
const contextMenu = ref<ContextMenuState>({ visible: false, x: 0, y: 0, nodeId: null })
const isUpdatingSelectionFromStore = ref(false)

// Layout constants - consistent across ConceptMapView and useConceptMapLayout
// Matching mindmap node sizes: min-width: 100px, min-height: 30px
const PADDING = 20
const HEADER_HEIGHT = 30
const MIN_NODE_WIDTH = 100
const MIN_NODE_HEIGHT = 30

// ============================================================
// HELPER FUNCTIONS
// ============================================================
function hasChildren(nodeId: string): boolean {
  return nodes.value.some(n => n.parentId === nodeId)
}

function getDirectChildren(nodeId: string): NodeData[] {
  return nodes.value.filter(n => n.parentId === nodeId)
}

function isRootNode(nodeId: string | null): boolean {
  if (!nodeId) return false
  const node = nodes.value.find(n => n.id === nodeId)
  return node?.parentId === null
}

function calculateParentSize(nodeId: string): { width: number; height: number } {
  const children = getDirectChildren(nodeId).filter(c => c.conceptMapPosition != null)
  if (children.length === 0) return { width: MIN_NODE_WIDTH, height: MIN_NODE_HEIGHT }

  let maxRight = 0, maxBottom = 0
  for (const child of children) {
    const pos = child.conceptMapPosition!
    const size = hasChildren(child.id) ? calculateParentSize(child.id)
      : (child.conceptMapSize ?? { width: MIN_NODE_WIDTH, height: MIN_NODE_HEIGHT })
    maxRight = Math.max(maxRight, pos.x + size.width)
    maxBottom = Math.max(maxBottom, pos.y + size.height)
  }
  return { width: Math.max(MIN_NODE_WIDTH, maxRight + PADDING), height: Math.max(MIN_NODE_HEIGHT, maxBottom + PADDING) }
}

/**
 * Calculate optimal handles for an edge based on relative positions of source and target nodes.
 * Returns the best handles to connect the nodes based on their positions.
 */
function getOptimalHandles(sourceId: string, targetId: string): { sourceHandle: string, targetHandle: string } {
  const sourceNode = nodes.value.find(n => n.id === sourceId)
  const targetNode = nodes.value.find(n => n.id === targetId)

  if (!sourceNode || !targetNode) {
    return { sourceHandle: 'right-source', targetHandle: 'left-target' }
  }

  // Get concept map positions (use x,y as fallback)
  const sourcePos = sourceNode.conceptMapPosition ?? { x: sourceNode.x, y: sourceNode.y }
  const targetPos = targetNode.conceptMapPosition ?? { x: targetNode.x, y: targetNode.y }

  // Get sizes
  const sourceSize = sourceNode.conceptMapSize ?? { width: MIN_NODE_WIDTH, height: MIN_NODE_HEIGHT }
  const targetSize = targetNode.conceptMapSize ?? { width: MIN_NODE_WIDTH, height: MIN_NODE_HEIGHT }

  // Calculate centers
  const sourceCenterX = sourcePos.x + sourceSize.width / 2
  const sourceCenterY = sourcePos.y + sourceSize.height / 2
  const targetCenterX = targetPos.x + targetSize.width / 2
  const targetCenterY = targetPos.y + targetSize.height / 2

  const dx = targetCenterX - sourceCenterX
  const dy = targetCenterY - sourceCenterY

  // Determine primary direction based on which delta is larger
  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal connection is primary
    if (dx > 0) {
      // Target is to the right of source
      return { sourceHandle: 'right-source', targetHandle: 'left-target' }
    } else {
      // Target is to the left of source
      return { sourceHandle: 'left-source', targetHandle: 'right-target' }
    }
  } else {
    // Vertical connection is primary
    if (dy > 0) {
      // Target is below source
      return { sourceHandle: 'bottom-source', targetHandle: 'top-target' }
    } else {
      // Target is above source
      return { sourceHandle: 'top-source', targetHandle: 'bottom-target' }
    }
  }
}

// ============================================================
// COMPOSABLES
// ============================================================
const { initializeLayout, getNodesNeedingLayout, getBottomUpOrder } = useConceptMapLayout(nodes, getDirectChildren)
const { resolveOverlapsForNode, adjustParentSize, resolveSiblingOverlaps } = useConceptMapCollision(nodes, getDirectChildren, calculateParentSize)

// ============================================================
// COMPUTED
// ============================================================
const zoomPercent = computed(() => Math.round(viewport.value.zoom * 100))
const viewportTransform = computed(() => `translate(${viewport.value.x}px, ${viewport.value.y}px) scale(${viewport.value.zoom})`)
const showCanvasCenter = computed(() => devSettings.showConceptMapCanvasCenter)

// Visible edges with dynamic edge type from settings
const visibleEdges = computed(() => {
  return edges.value.map(edge => ({
    ...edge,
    type: referenceEdgeType.value
  }))
})

// Topological sort for VueFlow (parents before children)
function getTopologicalOrder(): NodeData[] {
  const result: NodeData[] = []
  const visited = new Set<string>()

  function visit(node: NodeData) {
    if (visited.has(node.id)) return
    if (node.parentId) {
      const parent = nodes.value.find(n => n.id === node.parentId)
      if (parent) visit(parent)
    }
    visited.add(node.id)
    result.push(node)
  }

  nodes.value.forEach(visit)
  return result
}

// Build VueFlow nodes from local state and update via setNodes
function buildVueFlowNodes() {
  const sorted = getTopologicalOrder()

  const newNodes: Node[] = sorted.map(node => {
    const isParent = hasChildren(node.id)
    const pos = node.conceptMapPosition ?? { x: 0, y: 0 }
    const size = isParent
      ? (node.conceptMapSize ?? calculateParentSize(node.id))
      : (node.conceptMapSize ?? { width: MIN_NODE_WIDTH, height: MIN_NODE_HEIGHT })

    if (isParent) {
      console.log(`[buildVueFlowNodes] Parent ${node.id}: ${size.width}x${size.height}`)
    }

    const vfNode: Node = {
      id: node.id,
      type: 'concept',
      position: { x: pos.x, y: pos.y },
      data: { label: node.label, isParent },
      width: size.width,
      height: size.height,
      style: {
        width: `${size.width}px`,
        height: `${size.height}px`
      }
    }

    if (node.parentId) {
      vfNode.parentNode = node.parentId
      // No expandParent - we handle sizing manually
    }

    return vfNode
  })

  // Update local ref
  vueFlowNodes.value = newNodes
  // Force VueFlow to recognize the new nodes
  setNodes(newNodes)
}



// ============================================================
// STORE SYNC
// ============================================================
function syncFromStore() {
  const storeNodes = documentStore.nodes
  console.log('=== ConceptMap syncFromStore: Processing store nodes ===')

  nodes.value = storeNodes.map(sn => {
    const conceptMapPos = sn.views.conceptMap?.position
    const conceptMapSize = sn.views.conceptMap?.size
    console.log(`  Node "${sn.data.content || sn.data.title}" (${sn.id}):`)
    console.log(`    views.conceptMap:`, JSON.stringify(sn.views.conceptMap))
    console.log(`    conceptMapPosition will be:`, conceptMapPos ? JSON.stringify(conceptMapPos) : 'null')

    return {
      id: sn.id,
      label: sn.data.content || sn.data.title,
      parentId: sn.data.parentId,
      x: conceptMapPos?.x ?? 0,
      y: conceptMapPos?.y ?? 0,
      width: MIN_NODE_WIDTH,
      height: MIN_NODE_HEIGHT,
      conceptMapPosition: conceptMapPos ?? null,
      conceptMapSize: conceptMapSize ?? null
    }
  })

  // Load reference edges from store and recalculate optimal handles based on concept map positions
  const storeEdges = documentStore.edges
  edges.value = storeEdges
    .filter(e => e.data?.edgeType === 'reference')
    .map(e => {
      // Recalculate optimal handles based on current concept map node positions
      const { sourceHandle, targetHandle } = getOptimalHandles(e.source, e.target)
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle,
        targetHandle,
        type: 'straight' as const,
        class: 'edge-reference',
        data: { edgeType: 'reference' }
      }
    })
  console.log(`=== ConceptMap syncFromStore: Loaded ${edges.value.length} reference edges with recalculated handles ===`)

  // Rebuild VueFlow nodes after syncing from store
  buildVueFlowNodes()
}

function syncToStore() {
  console.log('=== ConceptMap syncToStore: Saving to store ===')
  const syncedNodeIds: string[] = []

  for (const node of nodes.value) {
    // Update the views.conceptMap data
    const storeNode = documentStore.nodes.find(n => n.id === node.id)
    if (storeNode) {
      console.log(`  Node "${node.label}" (${node.id}):`)
      console.log(`    saving position:`, JSON.stringify(node.conceptMapPosition))
      console.log(`    saving size:`, JSON.stringify(node.conceptMapSize))

      storeNode.views.conceptMap = {
        position: node.conceptMapPosition ?? null,
        size: node.conceptMapSize ?? null
      }

      syncedNodeIds.push(node.id)
    }
  }

  console.log(`=== ConceptMap syncToStore: Complete (synced ${syncedNodeIds.length} nodes) ===`)
}

// ============================================================
// EVENT HANDLERS
// ============================================================
function closeContextMenu() {
  contextMenu.value.visible = false
}

function onPaneClick() {
  closeContextMenu()
  documentStore.clearSelection(source)
}

// Connection handlers for reference edges
function onConnectStart() {
  onReferenceConnectStart()
}

function onConnectEnd() {
  onReferenceConnectEnd()
}

function onConnect(params: { source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null }) {
  // Try to create a reference edge (only if C key was pressed)
  const created = onReferenceConnect(params)
  if (created) {
    console.log('Reference edge created via C+drag in concept map')
  }
}

// Connection validation - allow all connections (we handle validation in onConnect)
function isValidConnection() {
  // Always return true - we validate in onConnect based on C key state
  return true
}

function onNodeClick(event: NodeMouseEvent) {
  closeContextMenu()
  if (!event.event.shiftKey) {
    documentStore.selectNode(event.node.id, source, false)
  }
}

function onSelectionChange({ nodes: selectedNodes }: { nodes: Node[] }) {
  if (isUpdatingSelectionFromStore.value) return
  const selectedIds = selectedNodes.map(n => n.id)
  if (selectedIds.length === 0) {
    documentStore.clearSelection(source)
  } else if (selectedIds.length === 1) {
    documentStore.selectNode(selectedIds[0]!, source, false)
  } else {
    documentStore.selectNodes(selectedIds, source)
  }
}

function onNodeContextMenu(event: NodeMouseEvent) {
  if ('clientX' in event.event) {
    event.event.preventDefault()
    contextMenu.value = { visible: true, x: event.event.clientX, y: event.event.clientY, nodeId: event.node.id }
  }
}

// Drag handlers - simplified bottom-up approach
function onNodeDragStart() {
  // Nothing needed - VueFlow handles the drag
}

function onNodeDrag(event: NodeDragEvent) {
  // Just update local position during drag (no resizing)
  event.nodes.forEach(vfNode => {
    const node = nodes.value.find(n => n.id === vfNode.id)
    if (node) {
      node.conceptMapPosition = { x: vfNode.position.x, y: vfNode.position.y }
    }
  })
}

function onNodeDragStop(event: NodeDragEvent) {
  // 1. Update local positions from VueFlow
  event.nodes.forEach(vfNode => {
    const node = nodes.value.find(n => n.id === vfNode.id)
    if (node) {
      node.conceptMapPosition = { x: vfNode.position.x, y: vfNode.position.y }
    }
  })

  // 2. Resolve sibling overlaps (AABB) - this calls adjustParentSize which recalculates sizes
  event.nodes.forEach(vfNode => {
    const node = nodes.value.find(n => n.id === vfNode.id)
    if (node) {
      resolveOverlapsForNode(node.id)
    }
  })

  // 3. Collect all affected parent IDs (for updateNodeInternals)
  const affectedParentIds = new Set<string>()
  event.nodes.forEach(vfNode => {
    const node = nodes.value.find(n => n.id === vfNode.id)
    if (node?.parentId) {
      // Add direct parent
      affectedParentIds.add(node.parentId)
      // Add all ancestors
      let currentParentId = nodes.value.find(n => n.id === node.parentId)?.parentId
      while (currentParentId) {
        affectedParentIds.add(currentParentId)
        currentParentId = nodes.value.find(n => n.id === currentParentId)?.parentId
      }
    }
  })

  // 4. Rebuild VueFlow nodes with new sizes
  console.log('[onNodeDragStop] Rebuilding nodes...')
  buildVueFlowNodes()

  // 5. Force VueFlow to recognize dimension changes on affected parents
  if (affectedParentIds.size > 0) {
    console.log('[onNodeDragStop] Updating node internals for:', [...affectedParentIds])
    updateNodeInternals([...affectedParentIds])
  }

  // 6. Sync to store
  syncToStore()
}

// ============================================================
// NODE OPERATIONS
// ============================================================
function addChildNode() {
  if (!contextMenu.value.nodeId) return
  const parentNode = nodes.value.find(n => n.id === contextMenu.value.nodeId)
  if (!parentNode) return

  const siblings = getDirectChildren(parentNode.id)
  const yOffset = siblings.length * (MIN_NODE_HEIGHT + 10)
  const conceptPos = { x: PADDING, y: PADDING + HEADER_HEIGHT + yOffset }
  const conceptSize = { width: MIN_NODE_WIDTH, height: MIN_NODE_HEIGHT }

  // Add to store first to get the real ID
  const storeNode = documentStore.addNode(parentNode.id, 'Untitled', '', conceptPos, source)

  // Set conceptMap view data on the store node
  storeNode.views.conceptMap = { position: conceptPos, size: conceptSize }

  // Create local node with store ID
  const newNode: NodeData = {
    id: storeNode.id,
    label: 'Untitled',
    parentId: parentNode.id,
    x: conceptPos.x,
    y: conceptPos.y,
    width: MIN_NODE_WIDTH,
    height: MIN_NODE_HEIGHT,
    conceptMapPosition: conceptPos,
    conceptMapSize: conceptSize
  }

  nodes.value.push(newNode)

  // AABB collision resolution + parent resize (bottom-up)
  resolveOverlapsForNode(newNode.id)
  buildVueFlowNodes()
  updateNodeInternals([parentNode.id])
  syncToStore()
  closeContextMenu()
}

function addSiblingNode() {
  if (!contextMenu.value.nodeId) return
  const targetNode = nodes.value.find(n => n.id === contextMenu.value.nodeId)
  if (!targetNode) return

  const pos = targetNode.conceptMapPosition ?? { x: 0, y: 0 }
  const conceptPos = { x: pos.x, y: pos.y + MIN_NODE_HEIGHT + 10 }
  const conceptSize = { width: MIN_NODE_WIDTH, height: MIN_NODE_HEIGHT }

  // Add to store first to get the real ID
  const storeNode = documentStore.addNode(targetNode.parentId, 'Untitled', '', conceptPos, source)

  // Set conceptMap view data on the store node
  storeNode.views.conceptMap = { position: conceptPos, size: conceptSize }

  // Create local node with store ID
  const newNode: NodeData = {
    id: storeNode.id,
    label: 'Untitled',
    parentId: targetNode.parentId,
    x: conceptPos.x,
    y: conceptPos.y,
    width: MIN_NODE_WIDTH,
    height: MIN_NODE_HEIGHT,
    conceptMapPosition: conceptPos,
    conceptMapSize: conceptSize
  }

  nodes.value.push(newNode)

  // AABB collision resolution + parent resize (bottom-up)
  resolveOverlapsForNode(newNode.id)
  buildVueFlowNodes()
  if (targetNode.parentId) {
    updateNodeInternals([targetNode.parentId])
  }
  syncToStore()
  closeContextMenu()
}

function detachFromParent() {
  if (!contextMenu.value.nodeId) return
  const node = nodes.value.find(n => n.id === contextMenu.value.nodeId)
  if (!node || !node.parentId) return

  const oldParentId = node.parentId
  node.parentId = null
  // Position as new root
  const roots = nodes.value.filter(n => n.parentId === null && n.id !== node.id)
  const rightmost = roots.reduce((max, r) => {
    const pos = r.conceptMapPosition ?? { x: 0, y: 0 }
    const size = calculateParentSize(r.id)
    return Math.max(max, pos.x + size.width)
  }, 0)
  node.conceptMapPosition = { x: rightmost + 50, y: 0 }

  if (oldParentId) adjustParentSize(oldParentId)
  // Update parentId in store's node.data
  documentStore.updateNode(node.id, { parentId: null }, source)
  syncToStore()
  buildVueFlowNodes()
  closeContextMenu()
}

function deleteSelectedNode() {
  if (!contextMenu.value.nodeId) return
  const nodeId = contextMenu.value.nodeId
  const parentId = nodes.value.find(n => n.id === nodeId)?.parentId

  // Remove from local state
  function getAllDescendants(id: string): string[] {
    const children = getDirectChildren(id)
    return [id, ...children.flatMap(c => getAllDescendants(c.id))]
  }
  const idsToDelete = getAllDescendants(nodeId)
  nodes.value = nodes.value.filter(n => !idsToDelete.includes(n.id))
  if (parentId) adjustParentSize(parentId)

  // Delete from store (deleteChildren=true by default, so just delete the root)
  documentStore.deleteNode(nodeId, true, source)
  buildVueFlowNodes()
  closeContextMenu()
}

// ============================================================
// SELECTION SYNC FROM STORE
// ============================================================
function updateVueFlowSelection(selectedIds: string[]) {
  isUpdatingSelectionFromStore.value = true
  vueFlowNodes.value.forEach(node => {
    const shouldBeSelected = selectedIds.includes(node.id)
    const vfNode = findNode(node.id)
    if (vfNode && vfNode.selected !== shouldBeSelected) {
      vfNode.selected = shouldBeSelected
    }
  })
  isUpdatingSelectionFromStore.value = false
}

onStoreEvent('store:node-selected', ({ nodeId }) => {
  updateVueFlowSelection(nodeId ? [nodeId] : [])
})

onStoreEvent('store:nodes-selected', ({ nodeIds }) => {
  updateVueFlowSelection(nodeIds)
})

// ============================================================
// LIFECYCLE
// ============================================================

/**
 * Recalculate all parent sizes (bottom-up) and resolve overlaps.
 * Called when switching to concept map view - nodes may have gained/lost children in mindmap.
 *
 * Order is important:
 * 1. First resolve sibling overlaps (push siblings away from enlarged nodes)
 * 2. Then resize parents to fit all children (including pushed siblings)
 */
function recalculateAllParentSizesAndResolveOverlaps(): void {
  console.log('ConceptMapView: Resolving overlaps and recalculating parent sizes...')
  const bottomUpOrder = getBottomUpOrder()

  // Process bottom-up: for each level, first resolve sibling overlaps, then adjust parent size
  for (const node of bottomUpOrder) {
    const children = getDirectChildren(node.id)
    if (children.length > 0) {
      // First: resolve sibling overlaps among this node's children
      resolveSiblingOverlaps(node.id)
      // Then: adjust this node's size to fit all children (including pushed ones)
      adjustParentSize(node.id)
    }
  }

  // Finally: resolve root-level sibling overlaps
  resolveSiblingOverlaps(null)

  console.log('ConceptMapView: Overlaps resolved and parent sizes recalculated')
}

onMounted(async () => {
  console.log('ConceptMapView mounted')

  // Setup keyboard listeners for reference edge creation (C key)
  setupReferenceKeyboardListeners()

  syncFromStore()

  if (nodes.value.length > 0) {
    // Check if any nodes need layout (not whether the view is "initialized")
    const nodesNeedingLayout = getNodesNeedingLayout()
    console.log(`ConceptMapView: ${nodesNeedingLayout.length} nodes need layout out of ${nodes.value.length} total`)

    if (nodesNeedingLayout.length > 0) {
      console.log('ConceptMapView: Running initializeLayout for nodes without positions...')
      initializeLayout()
    }

    // ALWAYS recalculate parent sizes - nodes may have gained/lost children in mindmap view
    recalculateAllParentSizesAndResolveOverlaps()
    buildVueFlowNodes()
    syncToStore()
  }

  // Center the viewport on canvas origin (0,0)
  await nextTick()
  const vueFlowContainer = document.querySelector('.vue-flow')
  if (vueFlowContainer) {
    const rect = vueFlowContainer.getBoundingClientRect()
    void setViewport({ x: rect.width / 2, y: rect.height / 2, zoom: 1 }, { duration: 0 })
  }
})

onUnmounted(() => {
  // Cleanup keyboard listeners for reference edge creation
  cleanupReferenceKeyboardListeners()
})

// Listen for node creation events from OTHER views (not concept-map)
// The onStoreEvent automatically ignores events where source === 'concept-map'
onStoreEvent('store:node-created', ({ nodeId }) => {
  console.log(`ConceptMapView: Node created from another view: ${nodeId}, syncing...`)

  // Re-sync from store to get the new node
  syncFromStore()

  // The new node needs layout since it doesn't have conceptMapPosition
  const nodesNeedingLayout = getNodesNeedingLayout()
  if (nodesNeedingLayout.length > 0 && nodes.value.length > 0) {
    console.log(`ConceptMapView: ${nodesNeedingLayout.length} nodes need layout after node creation`)
    initializeLayout()
    recalculateAllParentSizesAndResolveOverlaps()
    buildVueFlowNodes()
    syncToStore()
  }
})

// Listen for node updates from other views
onStoreEvent('store:node-updated', ({ nodeId }) => {
  console.log(`ConceptMapView: Node updated from another view: ${nodeId}, syncing...`)
  syncFromStore()
  buildVueFlowNodes()
})

// Listen for node reparenting from other views
onStoreEvent('store:node-reparented', ({ nodeId }) => {
  console.log(`ConceptMapView: Node reparented from another view: ${nodeId}, syncing...`)
  syncFromStore()

  // Reparenting may require layout recalculation
  recalculateAllParentSizesAndResolveOverlaps()
  buildVueFlowNodes()
  syncToStore()
})

// Listen for node deletion from other views
onStoreEvent('store:node-deleted', () => {
  console.log('ConceptMapView: Node deleted from another view, syncing...')
  syncFromStore()
  recalculateAllParentSizesAndResolveOverlaps()
  buildVueFlowNodes()
})

// Listen for reference edge creation from other views
onStoreEvent('store:edge-created', ({ edgeId, sourceId, targetId, edgeType }) => {
  if (edgeType !== 'reference') return
  console.log(`ConceptMapView: Reference edge created from another view: ${edgeId}`)

  // Calculate optimal handles for the new edge based on concept map positions
  const { sourceHandle, targetHandle } = getOptimalHandles(sourceId, targetId)

  // Add to local edges
  const newEdge: Edge = {
    id: edgeId,
    source: sourceId,
    target: targetId,
    sourceHandle,
    targetHandle,
    type: 'straight',
    class: 'edge-reference',
    data: { edgeType: 'reference' }
  }
  edges.value = [...edges.value, newEdge]
  buildVueFlowNodes()
})

// Listen for reference edge deletion from other views
onStoreEvent('store:edge-deleted', ({ edgeId }) => {
  console.log(`ConceptMapView: Edge deleted from another view: ${edgeId}`)
  edges.value = edges.value.filter(e => e.id !== edgeId)
  buildVueFlowNodes()
})

// Expose for parent
defineExpose({ showMinimap, showZoomIndicator, fitView: () => fitView({ padding: 0.2, duration: 300 }) })
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

/* Canvas center overlay */
.canvas-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
}

/* Selected node highlight */
.conceptmap-canvas :deep(.vue-flow__node.selected .concept-node) {
  box-shadow: 0 0 0 2px #1976d2, 0 4px 8px rgba(25, 118, 210, 0.3);
}

.zoom-indicator {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(255, 255, 255, 0.9);
  padding: 8px 12px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  font-size: 14px;
  z-index: 10;
}

.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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

/* Dark mode */
.body--dark .zoom-indicator {
  background: rgba(30, 30, 30, 0.9);
  color: #fff;
}

.body--dark .context-menu {
  background: #1e1e1e;
  border-color: #444;
}

.body--dark .context-menu-item:hover {
  background: #333;
}

.body--dark .context-menu-item-danger:hover {
  background: #3a2020;
}

/* Reference edge styling - dashed line with different color */
/* Ensure edges are rendered above nodes (parent boxes) - VueFlow sets selected nodes to z-index: 1000 */
:deep(.vue-flow__edges) {
  z-index: 1001 !important;
}

:deep(.vue-flow__edge.edge-reference) path {
  stroke: #9775fa;
  stroke-dasharray: 5 3;
  stroke-width: 2;
}

:deep(.vue-flow__edge.edge-reference:hover) path {
  stroke: #7950f2;
  stroke-width: 3;
}

/* Dark mode reference edge */
.body--dark :deep(.vue-flow__edge.edge-reference) path {
  stroke: #b197fc;
}

.body--dark :deep(.vue-flow__edge.edge-reference:hover) path {
  stroke: #9775fa;
}
</style>
