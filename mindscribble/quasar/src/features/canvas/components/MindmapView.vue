<template>
  <div class="mindmap-canvas">
    <VueFlow
      ref="vueFlowRef"
      :key="documentStore.currentDocumentId || 'default'"
      :nodes="vueFlowNodes"
      :edges="visibleEdges"
      :min-zoom="0.05"
      :max-zoom="maxZoom"
      :only-render-visible-elements="true"
      :select-nodes-on-drag="false"
      :connect-on-click="false"
      :default-edge-options="{ type: 'straight' }"
      :delete-key-code="['Backspace', 'Delete']"
      :is-valid-connection="isValidConnection"
      @node-drag-start="onNodeDragStart"
      @node-drag="onNodeDrag"
      @node-drag-stop="onNodeDragStop"
      @node-context-menu="onNodeContextMenu"
      @node-click="onNodeClick"
      @selection-change="onSelectionChange"
      @pane-click="onPaneClick"
      @pane-mousemove="onPaneMouseMove"
      @connect="onConnect"
      @connect-start="onConnectStart"
      @connect-end="onConnectEnd"
      @nodes-change="onNodesChange"
      @selection-start="onSelectionStart"
      @selection-end="onSelectionEnd"
    >
      <Background />
      <MiniMap pannable zoomable v-if="showMinimap" />
      <Controls position="top-left" />

      <template #node-custom="{ data, id }">
        <CustomNode
          :id="id"
          :data="data"
          @toggle-collapse="toggleCollapse(id)"
          @toggle-collapse-left="toggleCollapseLeft(id)"
          @toggle-collapse-right="toggleCollapseRight(id)"
        />
      </template>

      <template #node-lod-badge="{ data }">
        <LodBadgeNode :data="data" />
      </template>
    </VueFlow>

    <!-- SVG Overlay for bounding boxes -->
    <svg class="canvas-overlay" v-if="showBoundingBoxes || showCanvasCenter">
      <g :style="{ transform: viewportTransform }">
        <g v-if="showCanvasCenter">
          <line x1="-20" y1="0" x2="20" y2="0" stroke="#ff6b6b" stroke-width="2" />
          <line x1="0" y1="-20" x2="0" y2="20" stroke="#ff6b6b" stroke-width="2" />
          <circle cx="0" cy="0" r="3" fill="#ff6b6b" />
        </g>
        <g v-if="showBoundingBoxes">
          <rect
            v-for="bound in boundingBoxes"
            :key="bound.nodeId"
            :x="bound.x"
            :y="bound.y"
            :width="bound.width"
            :height="bound.height"
            fill="none"
            :stroke="getNodeDepth(bound.nodeId) === 0 ? '#ff6b6b' : '#4dabf7'"
            stroke-width="2"
            stroke-dasharray="5,5"
            opacity="0.5"
          />
        </g>
      </g>
    </svg>

    <!-- Context Menu -->
    <div v-if="contextMenu.visible" class="context-menu" :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }">
      <template v-if="isRootNode(contextMenu.nodeId)">
        <div class="context-menu-item" @click="addChildLeft">Add Child Left</div>
        <div class="context-menu-item" @click="addChildRight">Add Child Right</div>
      </template>
      <template v-else>
        <div class="context-menu-item" @click="addChild">Add Child</div>
        <div class="context-menu-item context-menu-item-danger" @click="detachNode">Detach from Parent</div>
      </template>
      <div class="context-menu-item" @click="addSibling">Add Sibling</div>
    </div>

    <!-- Zoom Indicator -->
    <div v-if="showZoomIndicator" class="zoom-indicator">
      <div class="zoom-value">{{ zoomPercent }}%</div>
      <div class="zoom-level" v-if="lodEnabled">LOD: {{ currentLodLevel }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import { Controls } from '@vue-flow/controls'
import type { Node, Edge, NodeMouseEvent, NodeChange } from '@vue-flow/core'
import CustomNode from './mindmap/CustomNode.vue'
import LodBadgeNode from './mindmap/LodBadgeNode.vue'
import type { NodeData, ContextMenuState, BoundingRect } from './mindmap/types'
import { calculateBoundingRect, resolveAllOverlaps, resolveOverlapsBottomUpLOD, setLayoutSpacing, getAllDescendants } from './mindmap/layout'

// Import composables
import { useNodeTree } from '../composables/mindmap/useNodeTree'
import { useLOD } from '../composables/mindmap/useLOD'
import { useEdgeManagement } from '../composables/mindmap/useEdgeManagement'
import { useNodeOperations } from '../composables/mindmap/useNodeOperations'
import { useVueFlowSync } from '../composables/mindmap/useVueFlowSync'
import { useNodeDrag } from '../composables/mindmap/useNodeDrag'
import { useMindmapGenerator } from '../composables/mindmap/useMindmapGenerator'
import { useMindmapLayout } from '../composables/mindmap/useMindmapLayout'
import { useSiblingReorder } from '../composables/mindmap/useSiblingReorder'
import { useExternalSiblingPositioning } from '../composables/mindmap/useExternalSiblingPositioning'
import { useReferenceEdges } from '../composables/useReferenceEdges'

// Store & Events for selection sync
import { useDocumentStore } from 'src/core/stores/documentStore'
import { useOrientationStore } from 'src/core/stores/orientationStore'
import { useContextStore } from 'src/core/stores/contextStore'
import { useDevSettingsStore } from 'src/dev/devSettingsStore'
import { useViewEvents, eventBus } from 'src/core/events'
import { calculateOrientationTransition, getTransitionOperations, type OrientationMode } from '../composables/mindmap/useOrientationSort'
import { activeEditingNodeId, destroyActiveEditor } from '../composables/useCanvasNodeEditor'

// VueFlow instance
const { viewport, fitView, setViewport, findNode, updateNodeInternals, setNodes } = useVueFlow()

// Dev settings store (for bounding boxes, spacing, etc.)
const devSettings = useDevSettingsStore()

// Context store (for panel focus management)
const contextStore = useContextStore()

// Core state
const nodes = ref<NodeData[]>([])
const edges = ref<Edge[]>([])
const nodeCounter = ref(1)

// UI state
const showBoundingBoxes = computed(() => devSettings.showBoundingBoxes)
const showMinimap = ref(true)
const showCanvasCenter = computed(() => devSettings.showCanvasCenter)
const showZoomIndicator = ref(true)
const horizontalSpacing = computed(() => devSettings.horizontalSpacing)
const verticalSpacing = computed(() => devSettings.verticalSpacing)

const contextMenu = ref<ContextMenuState>({ visible: false, x: 0, y: 0, nodeId: null })

// Composables initialization
const { getDirectChildren, getChildrenSide, getNodeDepth, getRootNode, isRootNode, isNodeOnLeftOfRoot } = useNodeTree(nodes)

const { lodEnabled, lodThresholds, maxTreeDepth, currentLodLevel, getVisibleNodesForLOD, calculateHiddenChildrenBounds } = useLOD(nodes, viewport, getNodeDepth)

const maxZoom = computed(() => {
  if (lodThresholds.value.length === 0) return 2.0
  const lastThreshold = lodThresholds.value[lodThresholds.value.length - 1]
  if (lastThreshold === undefined) return 2.0
  return Math.min(Math.max((lastThreshold + 20) / 100, 3.0), 5.0)
})

const potentialParentRef = ref<string | null>(null)

const { vueFlowNodes, updateNodeDimensionsFromDOM, syncToVueFlow, syncFromVueFlow } = useVueFlowSync(
  nodes, edges, viewport, lodEnabled, potentialParentRef, getVisibleNodesForLOD,
  calculateHiddenChildrenBounds, getDirectChildren, getChildrenSide, getNodeDepth, currentLodLevel
)

const { hierarchyEdgeType, referenceEdgeType, edgeTypeOptions, visibleEdges, updateEdgesForBranch, updateAllEdgeHandles, updateReferenceEdgeHandles, createEdge } = useEdgeManagement(
  nodes, edges, vueFlowNodes, getRootNode, isNodeOnLeftOfRoot
)

const { closeContextMenu, toggleCollapse, toggleCollapseLeft, toggleCollapseRight, addRootNode, addChildLeft, addChildRight, addChild, addSibling, detachNode, reparentNode } = useNodeOperations(
  nodes, edges, contextMenu, nodeCounter, viewport, getDirectChildren, getRootNode, getAllDescendants,
  createEdge, updateEdgesForBranch, syncToVueFlow, updateNodeDimensionsFromDOM, resolveAllOverlaps,
  'mindmap' // Event source for store operations
)

// Canvas center for orientation calculations (root nodes reference point)
const canvasCenter = ref({ x: 0, y: 0 })

// Sibling reorder composable - updates store order when nodes are dragged
const { updateSiblingOrderIfChanged } = useSiblingReorder(nodes, canvasCenter)

// External sibling positioning - handles position updates when changes come from Writer
const { swapPositionsOnReorder, calculateInsertPosition } = useExternalSiblingPositioning(nodes, canvasCenter)

const { potentialParent, onPaneMouseMove, onNodeDragStart, onNodeDrag, onNodeDragStop } = useNodeDrag(
  nodes, viewport, getRootNode, getAllDescendants, getVisibleNodesForLOD, updateEdgesForBranch,
  reparentNode, syncToVueFlow, syncFromVueFlow, resolveAllOverlaps, resolveOverlapsBottomUpLOD,
  updateNodeInternals,
  // Callback to update sibling order after drag
  (draggedNodeId: string) => updateSiblingOrderIfChanged(draggedNodeId, 'mindmap'),
  // Callback to save positions to store after drag and update reference edge handles
  () => {
    updateReferenceEdgeHandles()
    syncToStore()
  }
)

watch(potentialParent, (newVal) => { potentialParentRef.value = newVal })

const { algorithm, generatorNodeCount, lastPerformance, generateNodeTree, clearAllNodes, generateAndLayoutMindmap } = useMindmapGenerator(
  nodes, edges, nodeCounter, viewport, verticalSpacing, vueFlowNodes, createEdge, syncToVueFlow,
  updateNodeDimensionsFromDOM, resolveAllOverlaps, () => { void fitView({ duration: 300, padding: 0.2 }) }
)

const { initializeLayout: initializeMindmapLayout } = useMindmapLayout(nodes, getDirectChildren, getRootNode)

// Reference edges composable - for creating non-hierarchical connections
const {
  onConnectStart: onReferenceConnectStart,
  onConnectEnd: onReferenceConnectEnd,
  onConnect: onReferenceConnect,
  setupKeyboardListeners: setupReferenceKeyboardListeners,
  cleanupKeyboardListeners: cleanupReferenceKeyboardListeners
} = useReferenceEdges(edges, 'mindmap')

// Store & Events for selection
const documentStore = useDocumentStore()
const orientationStore = useOrientationStore()
const { onStoreEvent, source } = useViewEvents('mindmap')

// Flag to prevent circular selection updates
const isUpdatingSelectionFromStore = ref(false)
// Flag to prevent circular store sync
const isSyncingFromStore = ref(false)

// ============================================================
// STORE SYNC
// ============================================================

/**
 * Sync nodes FROM documentStore TO local state
 * Maps MindscribbleNode → local NodeData format
 */
function syncFromStore() {
  isSyncingFromStore.value = true

  const storeNodes = documentStore.nodes
  // console.log('=== MindmapView syncFromStore: Processing store nodes ===', storeNodes.length)

  const localNodes: NodeData[] = storeNodes.map(sn => {
    const mindmapPos = sn.views.mindmap?.position
    // console.log(`  Node "${sn.data.title}" (${sn.id}):`)
    // console.log(`    views.mindmap:`, JSON.stringify(sn.views.mindmap))
    // console.log(`    mindmapPosition will be:`, mindmapPos ? JSON.stringify(mindmapPos) : 'null')

    return {
      id: sn.id,
      label: sn.data.title,
      parentId: sn.data.parentId,
      order: sn.data.order, // Include order for consistent child sorting

      // Active position - use mindmap position if available, else store position
      x: mindmapPos?.x ?? sn.position.x,
      y: mindmapPos?.y ?? sn.position.y,

      // Dimensions
      width: 150, // Default, will be updated from DOM
      height: 50,

      // Mindmap view-specific position (null means needs layout)
      mindmapPosition: mindmapPos ?? null,

      // Collapse state from view data
      collapsed: sn.views.mindmap?.collapsed ?? false,
      collapsedLeft: sn.views.mindmap?.collapsedLeft ?? false,
      collapsedRight: sn.views.mindmap?.collapsedRight ?? false,

      // Layout flags
      isDirty: sn.views.mindmap?.isDirty ?? true,
      lastCalculatedZoom: sn.views.mindmap?.lastCalculatedZoom ?? viewport.value.zoom
    }
  })

  // Update local nodes
  nodes.value = localNodes
  // console.log('=== syncFromStore: Complete ===')

  // Rebuild edges from parent-child relationships
  rebuildEdgesFromHierarchy()

  // Sync to VueFlow
  syncToVueFlow()
  setNodes(vueFlowNodes.value)

  isSyncingFromStore.value = false
}

/**
 * Sync nodes FROM local state TO documentStore
 * Updates mindmap view-specific data
 */
function syncToStore() {
  // console.log('=== syncToStore: Saving to store ===')
  const syncedNodeIds: string[] = []

  for (const node of nodes.value) {
    const storeNode = documentStore.nodes.find(n => n.id === node.id)
    if (storeNode) {
      // ALWAYS use current x,y position - this is the source of truth after dragging
      // Update local mindmapPosition to match current x,y
      node.mindmapPosition = { x: node.x, y: node.y }

      const positionToSave = { x: node.x, y: node.y }
      // console.log(`  Node "${node.label}" (${node.id}):`)
      // console.log(`    saving position: (${positionToSave.x}, ${positionToSave.y})`)

      // Update mindmap view data (use defaults for optional properties to satisfy exactOptionalPropertyTypes)
      storeNode.views.mindmap = {
        position: positionToSave,
        collapsed: node.collapsed ?? false,
        collapsedLeft: node.collapsedLeft ?? false,
        collapsedRight: node.collapsedRight ?? false,
        isDirty: node.isDirty ?? false,
        lastCalculatedZoom: node.lastCalculatedZoom ?? viewport.value.zoom
      }

      // Also update the active position
      storeNode.position = { x: node.x, y: node.y }

      syncedNodeIds.push(node.id)
    }
  }

  // console.log(`=== syncToStore: Complete (synced ${syncedNodeIds.length} nodes) ===`)
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

  // Calculate centers
  const sourceCenterX = sourceNode.x + sourceNode.width / 2
  const sourceCenterY = sourceNode.y + sourceNode.height / 2
  const targetCenterX = targetNode.x + targetNode.width / 2
  const targetCenterY = targetNode.y + targetNode.height / 2

  const dx = targetCenterX - sourceCenterX
  const dy = targetCenterY - sourceCenterY

  // Determine primary direction based on which delta is larger
  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal connection is primary
    if (dx > 0) {
      return { sourceHandle: 'right-source', targetHandle: 'left-target' }
    } else {
      return { sourceHandle: 'left-source', targetHandle: 'right-target' }
    }
  } else {
    // Vertical connection is primary
    if (dy > 0) {
      return { sourceHandle: 'bottom-source', targetHandle: 'top-target' }
    } else {
      return { sourceHandle: 'top-source', targetHandle: 'bottom-target' }
    }
  }
}

/**
 * Rebuild edges based on parent-child hierarchy
 */
function rebuildEdgesFromHierarchy() {
  const hierarchyEdges: Edge[] = []

  for (const node of nodes.value) {
    if (node.parentId) {
      const parent = nodes.value.find(n => n.id === node.parentId)
      if (parent) {
        // Use optimal handles based on node positions (4-way: top, right, bottom, left)
        const { sourceHandle, targetHandle } = getOptimalHandles(parent.id, node.id)

        hierarchyEdges.push({
          id: `e-${parent.id}-${node.id}`,
          source: parent.id,
          sourceHandle,
          target: node.id,
          targetHandle,
          type: 'straight'
        })
      }
    }
  }

  // Load reference edges from store and recalculate optimal handles based on mindmap positions
  const storeEdges = documentStore.edges
  const referenceEdges: Edge[] = storeEdges
    .filter(e => e.data?.edgeType === 'reference')
    .map(e => {
      // Recalculate optimal handles based on current mindmap node positions
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

  // console.log(`rebuildEdgesFromHierarchy: ${hierarchyEdges.length} hierarchy edges, ${referenceEdges.length} reference edges`)

  // Combine hierarchy and reference edges
  edges.value = [...hierarchyEdges, ...referenceEdges]
}

// Computed
const viewportTransform = computed(() => `translate(${viewport.value.x}px, ${viewport.value.y}px) scale(${viewport.value.zoom})`)
// Include spacing as dependency so bounding boxes update when spacing changes
const boundingBoxes = computed<BoundingRect[]>(() => {
  // Reference spacing values to make them reactive dependencies
  void horizontalSpacing.value
  void verticalSpacing.value
  return showBoundingBoxes.value ? nodes.value.map(node => calculateBoundingRect(node, nodes.value)) : []
})
const rootNodes = computed(() => nodes.value.filter(n => n.parentId === null))
const renderedNodeCount = computed(() => vueFlowNodes.value.filter(n => (n as Node & { computed?: { visible?: boolean } }).computed?.visible !== false).length)
const zoomPercent = computed(() => Math.round(viewport.value.zoom * 100))

// Event handlers
function onNodeContextMenu(event: NodeMouseEvent) {
  if ('clientX' in event.event) {
    event.event.preventDefault()
    contextMenu.value = { visible: true, x: event.event.clientX, y: event.event.clientY, nodeId: event.node.id }
  }
}

// Selection handlers
function onNodeClick(event: NodeMouseEvent) {
  // Set context to center panel when interacting with canvas
  contextStore.setContext('center')

  // Single node click - select it (unless shift is held for multi-select)
  if (!event.event.shiftKey) {
    if (event.event.ctrlKey || event.event.metaKey) {
      // Ctrl+click: Select and navigate
      documentStore.selectNavigateNode(event.node.id, source)
    } else {
      // Regular click: Select without navigation
      documentStore.selectNode(event.node.id, source, false)
    }
  }
}

function onSelectionChange({ nodes: selectedNodes }: { nodes: Node[] }) {
  // Prevent circular updates
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

function onPaneClick() {
  // Set context to center panel when clicking on canvas
  contextStore.setContext('center')

  closeContextMenu()
  documentStore.clearSelection(source)
  // Clear dragging state when click ends
  contextStore.setDragging(false)
}

/**
 * Handle selection box start (shift+drag on pane)
 * Set dragging state to prevent text selection in other panels
 */
function onSelectionStart() {
  contextStore.setDragging(true)
  // Prevent text selection in other panels during canvas selection
  document.body.classList.add('canvas-selecting')
}

/**
 * Handle selection box end
 */
function onSelectionEnd() {
  contextStore.setDragging(false)
  // Re-enable text selection in other panels
  document.body.classList.remove('canvas-selecting')
}

/**
 * Handle VueFlow node changes (including delete via Backspace/Delete keys)
 * VueFlow automatically applies other changes, we only intercept deletions to sync to store
 */
function onNodesChange(changes: NodeChange[]) {
  // Find remove changes
  const removeChanges = changes.filter(c => c.type === 'remove')

  // Handle deletions - sync to store
  if (removeChanges.length > 0) {
    // console.log(`MindmapView: Deleting ${removeChanges.length} node(s) via keyboard`)

    for (const change of removeChanges) {
      if (change.type === 'remove') {
        const nodeId = change.id

        // Get all descendants to remove from local state
        const nodeToDelete = nodes.value.find(n => n.id === nodeId)
        if (nodeToDelete) {
          const idsToDelete = [nodeId, ...getAllDescendants(nodeId, nodes.value).map(n => n.id)]

          // Remove from local state
          nodes.value = nodes.value.filter(n => !idsToDelete.includes(n.id))
          edges.value = edges.value.filter(e => !idsToDelete.includes(e.source) && !idsToDelete.includes(e.target))

          // Delete from store (deleteChildren=true, so just delete the root)
          documentStore.deleteNode(nodeId, true, source)
        }
      }
    }

    // Rebuild edges and sync to VueFlow
    rebuildEdgesFromHierarchy()
    syncToVueFlow()
    setNodes(vueFlowNodes.value)
  }
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
    // console.log('Reference edge created via C+drag')
  }
}

// Connection validation - allow all connections (we handle validation in onConnect)
function isValidConnection() {
  // Always return true - we validate in onConnect based on C key state
  return true
}

// Helper to update VueFlow selection state
function updateVueFlowSelection(selectedIds: string[]) {
  isUpdatingSelectionFromStore.value = true

  // Update selection via findNode (returns GraphNode with all properties)
  vueFlowNodes.value.forEach(node => {
    const shouldBeSelected = selectedIds.includes(node.id)
    const vfNode = findNode(node.id)
    if (vfNode && vfNode.selected !== shouldBeSelected) {
      vfNode.selected = shouldBeSelected
    }
  })

  isUpdatingSelectionFromStore.value = false
}

// Listen to selection changes from other views
onStoreEvent('store:node-selected', ({ nodeId, scrollIntoView }) => {
  updateVueFlowSelection(nodeId ? [nodeId] : [])

  // TODO: scrollIntoView - pan viewport to center on selected node
  if (scrollIntoView && nodeId) {
    // Could implement viewport panning here
  }
})

onStoreEvent('store:nodes-selected', ({ nodeIds }) => {
  updateVueFlowSelection(nodeIds)
})

// Listen to select-navigate events from other views
onStoreEvent('store:select-navigate', ({ nodeId }) => {
  updateVueFlowSelection(nodeId ? [nodeId] : [])

  // Navigate to the node by fitting view to center on it
  if (nodeId) {
    void fitView({
      nodes: [nodeId],
      duration: 300,
      padding: 0.2
    })
  }
})

// Expose methods and state to parent
defineExpose({
  nodes, edges, viewport, showBoundingBoxes, showMinimap, showCanvasCenter, showZoomIndicator, lodEnabled,
  horizontalSpacing, verticalSpacing, maxTreeDepth, currentLodLevel, zoomPercent, rootNodes, renderedNodeCount,
  algorithm, generatorNodeCount, lastPerformance, hierarchyEdgeType, referenceEdgeType, edgeTypeOptions,
  addRootNode, generateNodeTree, clearAllNodes, generateAndLayoutMindmap, syncToVueFlow, resolveAllOverlaps: () => { resolveAllOverlaps(nodes.value); syncToVueFlow() },
  fitView: () => fitView({ padding: 0.2, duration: 300 }),
  setSpacing: (h: number, v: number) => { devSettings.setSpacing(h, v); resolveAllOverlaps(nodes.value); syncToVueFlow() },
  initializeMindmapLayout,
  updateAllEdgeHandles,
  syncFromStore,
  syncToStore
})

// ============================================================
// LIFECYCLE & WATCHERS
// ============================================================

// Watch for spacing changes from dev settings
watch([horizontalSpacing, verticalSpacing], ([h, v]) => {
  setLayoutSpacing(h, v)
  // Recompute bounding boxes with new spacing - no need to resolve overlaps
  // since we just want to see the visualization change
})

// Watch for document ID changes (e.g., when loading a new file from Google Drive)
// This handles the case where VueFlow's :key changes and remounts the internal component
// We need to sync after VueFlow has remounted with the new key
watch(
  () => documentStore.currentDocumentId,
  async (newId, oldId) => {
    if (newId && newId !== oldId) {
      // console.log('MindmapView: Document ID changed, syncing after VueFlow remount...')
      // Wait for Vue to complete the reactivity cycle and VueFlow to remount
      await nextTick()
      await nextTick() // Double nextTick to ensure VueFlow has fully remounted

      // Sync from store to get the new document data
      syncFromStore()

      // Initialize layout for nodes that need it
      if (nodes.value.length > 0) {
        const nodesNeedingLayout = nodes.value.filter(n => n.mindmapPosition === null)
        if (nodesNeedingLayout.length > 0) {
          // console.log(`MindmapView: ${nodesNeedingLayout.length} nodes need layout after document change`)
          initializeMindmapLayout()
          syncToStore()
        }
      }

      syncToVueFlow()
      setNodes(vueFlowNodes.value)
      rebuildEdgesFromHierarchy()
      updateAllEdgeHandles()

      // Center viewport on nodes after loading
      setTimeout(() => {
        if (vueFlowNodes.value.length > 0) {
          void fitView({ padding: 0.2, duration: 300 })
        }
      }, 100)

      // console.log('MindmapView: Document ID change sync complete, nodes:', nodes.value.length)
    }
  }
)

/**
 * Handle F2 key to start editing selected node
 */
function handleKeyDown(e: KeyboardEvent) {
  // F2 - Start editing selected node
  if (e.key === 'F2') {
    const selectedNodeId = documentStore.selectedNodeIds[0]
    if (selectedNodeId && !activeEditingNodeId.value) {
      e.preventDefault()
      eventBus.emit('canvas:edit-node', { nodeId: selectedNodeId })
    }
  }

  // Escape - Stop editing (handled by node component, but also clear here)
  if (e.key === 'Escape' && activeEditingNodeId.value) {
    destroyActiveEditor()
  }
}

// Handler for "Add Root Node" command
function onCommandAddRootNode() {
  void addRootNode().then(() => {
    syncToStore()
    syncToVueFlow()
  })
}

/**
 * Reconcile visual positions with store order.
 * When mindmap opens after order changes were made in another view (e.g., Writer),
 * the visual positions may not match the store order. This function detects the mismatch
 * and applies position swaps using the same logic as store:siblings-reordered event.
 *
 * @returns true if any positions were updated
 */
function reconcilePositionsWithStoreOrder(): boolean {
  const orientation = orientationStore.orientation
  let anyChanges = false

  // Group nodes by parent
  const parentIds = new Set<string | null>([null]) // Include null for root nodes
  for (const node of nodes.value) {
    if (node.parentId) parentIds.add(node.parentId)
  }

  for (const parentId of parentIds) {
    // Get siblings for this parent
    const siblings = nodes.value.filter(n => n.parentId === parentId)
    if (siblings.length <= 1) continue

    // Only check nodes that already have positions (mindmapPosition !== null)
    const positionedSiblings = siblings.filter(n => n.mindmapPosition !== null)
    if (positionedSiblings.length <= 1) continue

    // Build newOrders map from the store order
    const newOrders = new Map<string, number>()
    for (const sibling of positionedSiblings) {
      newOrders.set(sibling.id, sibling.order)
    }

    // Use swapPositionsOnReorder to calculate position updates
    const positionUpdates = swapPositionsOnReorder(parentId, newOrders, orientation)

    if (positionUpdates.length > 0) {
      // console.log(`Reconciling positions for parent ${parentId ?? 'ROOT'}: ${positionUpdates.length} nodes need repositioning`)
      anyChanges = true

      // Apply position updates
      for (const update of positionUpdates) {
        const node = nodes.value.find(n => n.id === update.nodeId)
        if (node) {
          // console.log(`  Moving ${node.label} to (${update.newX.toFixed(0)}, ${update.newY.toFixed(0)})`)
          node.x = update.newX
          node.y = update.newY
          // Update mindmapPosition as well
          node.mindmapPosition = { x: update.newX, y: update.newY }
        }
      }
    }
  }

  return anyChanges
}

onMounted(async () => {
  setLayoutSpacing(horizontalSpacing.value, verticalSpacing.value)
  // console.log('MindmapView mounted')

  // Setup keyboard listeners for reference edge creation (C key)
  setupReferenceKeyboardListeners()

  // Setup F2 keyboard listener for node editing
  window.addEventListener('keydown', handleKeyDown)

  // Listen for "Add Root Node" command from command palette / toolbar
  window.addEventListener('command:node.add.root', onCommandAddRootNode)

  // Sync from store to get existing nodes
  syncFromStore()
  // console.log('After syncFromStore, nodes:', nodes.value.length)

  // DEBUG: Log positions after syncFromStore
  // console.log('=== Node positions after syncFromStore ===')
  // nodes.value.forEach(n => console.log(`  ${n.label}: x=${n.x}, y=${n.y}, mindmapPos=${JSON.stringify(n.mindmapPosition)}`))

  // Track if we need to resolve overlaps (only for newly laid out nodes)
  let needsOverlapResolution = false

  // Don't auto-create initial node - let user add root node via toolbar/command
  // This ensures consistent behavior with ConceptMapView and proper file loading
  if (nodes.value.length > 0) {
    // Check if ANY node needs layout (nodes without mindmapPosition)
    const nodesNeedingLayout = nodes.value.filter(n => n.mindmapPosition === null)
    if (nodesNeedingLayout.length > 0) {
      // console.log(`${nodesNeedingLayout.length} nodes need mindmap layout, initializing...`)
      // initializeMindmapLayout only layouts nodes with mindmapPosition === null
      // It preserves existing positions for nodes that already have mindmapPosition
      initializeMindmapLayout()
      syncToStore()
      needsOverlapResolution = true
    } else {
      // console.log('All nodes already have mindmap positions, preserving layout')

      // Reconcile positions with store order - handles case where order was changed
      // in another view (e.g., Writer) while mindmap was closed
      const positionsReconciled = reconcilePositionsWithStoreOrder()
      if (positionsReconciled) {
        // console.log('Positions reconciled with store order, resolving overlaps...')
        needsOverlapResolution = true
        syncToStore() // Save reconciled positions back to store
      }
    }
  } else {
    // console.log('No nodes in store, waiting for user to add root node')
  }

  // Sync to VueFlow and measure dimensions
  syncToVueFlow()
  setNodes(vueFlowNodes.value)
  await nextTick()
  await updateNodeDimensionsFromDOM()

  // DEBUG: Log positions after syncToVueFlow
  // console.log('=== Node positions after syncToVueFlow ===')
  // nodes.value.forEach(n => console.log(`  ${n.label}: x=${n.x}, y=${n.y}`))

  // ONLY resolve overlaps if new nodes were laid out
  // This preserves user's manual adjustments for existing nodes
  if (needsOverlapResolution) {
    // console.log('Resolving overlaps for newly laid out nodes...')
    resolveAllOverlaps(nodes.value)
    syncToVueFlow()
    setNodes(vueFlowNodes.value)
  }

  // Update edge handles based on node positions (important after view switch)
  updateAllEdgeHandles()

  // DEBUG: Log final positions
  // console.log('=== Final node positions after all processing ===')
  // nodes.value.forEach(n => console.log(`  ${n.label}: x=${n.x}, y=${n.y}`))

  // Center view on the node after it's rendered
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

  // Cleanup F2 keyboard listener
  window.removeEventListener('keydown', handleKeyDown)

  // Cleanup command listener
  window.removeEventListener('command:node.add.root', onCommandAddRootNode)

  // Cleanup document-loaded listener
  eventBus.off('store:document-loaded')

  // Cleanup any active editor
  if (activeEditingNodeId.value) {
    destroyActiveEditor()
  }
})

// Listen for node creation events from OTHER views (not mindmap)
// The onStoreEvent automatically ignores events where source === 'mindmap'
onStoreEvent('store:node-created', ({ nodeId, parentId }) => {
  // console.log(`Node created from another view: ${nodeId}, parent: ${parentId ?? 'ROOT'}, syncing to mindmap...`)

  // Get the store node to access order information
  const storeNode = documentStore.getNodeById(nodeId)
  if (!storeNode) {
    console.warn(`Could not find newly created node ${nodeId} in store`)
    return
  }

  // Re-sync from store to get the new node
  syncFromStore()

  // The new node needs layout since it doesn't have mindmapPosition
  const newNode = nodes.value.find(n => n.id === nodeId)
  if (newNode && newNode.mindmapPosition === null) {
    const orientation = orientationStore.orientation

    // Get siblings sorted by store order (including the new node)
    const siblings = parentId
      ? documentStore.getChildNodes(parentId)
      : documentStore.rootNodes

    const newNodeOrder = storeNode.data.order
    const siblingCount = siblings.length

    // Find previous and next siblings based on store order
    let prevSibling: NodeData | null = null
    let nextSibling: NodeData | null = null

    if (newNodeOrder > 0) {
      const prevStoreNode = siblings.find(s => s.data.order === newNodeOrder - 1)
      if (prevStoreNode) {
        prevSibling = nodes.value.find(n => n.id === prevStoreNode.id) ?? null
      }
    }

    if (newNodeOrder < siblingCount - 1) {
      const nextStoreNode = siblings.find(s => s.data.order === newNodeOrder + 1)
      if (nextStoreNode) {
        nextSibling = nodes.value.find(n => n.id === nextStoreNode.id) ?? null
      }
    }

    // Calculate position based on sibling context
    const position = calculateInsertPosition(
      parentId,
      prevSibling,
      nextSibling,
      newNode.width,
      newNode.height,
      orientation
    )

    console.log(`  Positioning new node at (${position.x.toFixed(0)}, ${position.y.toFixed(0)})`)
    newNode.x = position.x
    newNode.y = position.y

    // After positioning, resolve overlaps and update edges
    syncToVueFlow()
    setNodes(vueFlowNodes.value)
    setTimeout(() => {
      void (async () => {
        await updateNodeDimensionsFromDOM()
        const visibleNodes = getVisibleNodesForLOD()
        resolveOverlapsBottomUpLOD([nodeId], visibleNodes, nodes.value)
        rebuildEdgesFromHierarchy()
        updateAllEdgeHandles()
        syncToVueFlow()
        syncToStore()
      })()
    }, 50)
  }
})

// Listen for node updates from other views
onStoreEvent('store:node-updated', ({ nodeId }) => {
  console.log(`Node updated from another view: ${nodeId}, syncing to mindmap...`)
  syncFromStore()
  syncToVueFlow()
  setNodes(vueFlowNodes.value)
})

// Listen for node reparenting from other views
onStoreEvent('store:node-reparented', ({ nodeId }) => {
  console.log(`Node reparented from another view: ${nodeId}, syncing to mindmap...`)
  syncFromStore()

  // Rebuild edges after reparenting and update handles based on positions
  rebuildEdgesFromHierarchy()
  updateAllEdgeHandles()
  syncToVueFlow()
  setNodes(vueFlowNodes.value)
})

// Listen for node deletion from other views
onStoreEvent('store:node-deleted', () => {
  console.log('Node deleted from another view, syncing to mindmap...')
  syncFromStore()
  rebuildEdgesFromHierarchy()
  syncToVueFlow()
  setNodes(vueFlowNodes.value)
})

// Listen for sibling reorder from other views (e.g., Writer)
onStoreEvent('store:siblings-reordered', ({ parentId, newOrders }) => {
  console.log(`Siblings reordered for parent ${parentId ?? 'ROOT'} from another view`)

  // Update local order property to match store
  for (const [nodeId, order] of newOrders) {
    const node = nodes.value.find(n => n.id === nodeId)
    if (node) {
      node.order = order
    }
  }

  // Swap positions to match the new order
  const orientation = orientationStore.orientation
  const positionUpdates = swapPositionsOnReorder(parentId, newOrders, orientation)

  // Apply position updates to local nodes
  for (const update of positionUpdates) {
    const node = nodes.value.find(n => n.id === update.nodeId)
    if (node) {
      console.log(`  Moving ${node.label} to (${update.newX.toFixed(0)}, ${update.newY.toFixed(0)})`)
      node.x = update.newX
      node.y = update.newY
    }
  }

  // Resolve any overlaps after position swaps
  if (positionUpdates.length > 0) {
    const affectedNodeIds = positionUpdates.map(u => u.nodeId)
    const visibleNodes = getVisibleNodesForLOD()
    resolveOverlapsBottomUpLOD(affectedNodeIds, visibleNodes, nodes.value)
  }

  // Rebuild edges and sync
  rebuildEdgesFromHierarchy()
  syncToVueFlow()
  setNodes(vueFlowNodes.value)
  syncToStore()
})

// Listen for reference edge creation from other views
onStoreEvent('store:edge-created', ({ edgeId, sourceId, targetId, edgeType }) => {
  if (edgeType !== 'reference') return
  console.log(`MindmapView: Reference edge created from another view: ${edgeId}`)

  // Calculate optimal handles for the new edge based on mindmap positions
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
  syncToVueFlow()
  setNodes(vueFlowNodes.value)
})

// Listen for reference edge deletion from other views
onStoreEvent('store:edge-deleted', ({ edgeId }) => {
  console.log(`MindmapView: Edge deleted from another view: ${edgeId}`)
  edges.value = edges.value.filter(e => e.id !== edgeId)
  syncToVueFlow()
  setNodes(vueFlowNodes.value)
})

// Listen for view changes to sync when switching back to mindmap
onStoreEvent('store:view-changed', ({ newView }) => {
  if (newView === 'mindmap') {
    console.log('MindmapView: Switched to mindmap view, syncing from store...')
    syncFromStore()
    syncToVueFlow()
    setNodes(vueFlowNodes.value)
  }
})

// Listen for document loaded (e.g., from Google Drive)
// Note: Using eventBus directly because document-loaded doesn't have a "source" view
eventBus.on('store:document-loaded', () => {
  console.log('MindmapView: Document loaded, re-syncing from store...')
  syncFromStore()

  // Initialize layout for nodes that need it
  if (nodes.value.length > 0) {
    const nodesNeedingLayout = nodes.value.filter(n => n.mindmapPosition === null)
    if (nodesNeedingLayout.length > 0) {
      console.log(`MindmapView: ${nodesNeedingLayout.length} nodes need layout after document load`)
      initializeMindmapLayout()
      syncToStore()
    }
  }

  syncToVueFlow()
  setNodes(vueFlowNodes.value)
  rebuildEdgesFromHierarchy()
  updateAllEdgeHandles()

  // Center viewport on nodes after loading
  setTimeout(() => {
    if (vueFlowNodes.value.length > 0) {
      void fitView({ padding: 0.2, duration: 300 })
    }
  }, 100)

  console.log('MindmapView: Document loaded sync complete, nodes:', nodes.value.length, 'vueFlowNodes:', vueFlowNodes.value.length)
})

// ============================================================
// ORIENTATION TRANSITIONS
// ============================================================

/**
 * Apply position swaps when orientation changes
 * Groups children by parent and applies transition to each group
 */
function applyOrientationTransition(fromOrientation: OrientationMode, toOrientation: OrientationMode) {
  console.log(`Orientation transition: ${fromOrientation} → ${toOrientation}`)

  // Canvas center (root reference point)
  const canvasCenter = { x: 0, y: 0 }

  // Collect all updates
  const allUpdates: Array<{ nodeId: string; newX: number; newY: number }> = []

  // Determine what operations we need
  const ops = getTransitionOperations(fromOrientation, toOrientation)
  console.log(`Operations needed: ${ops.join(', ') || 'none'}`)

  // STEP 1: If swap-sides is needed, mirror ALL nodes across root X
  if (ops.includes('swap-sides')) {
    console.log('Mirroring all nodes across root X axis')
    for (const node of nodes.value) {
      // Calculate node center
      const nodeCenterX = node.x + node.width / 2
      // Mirror across X=0: newCenterX = -nodeCenterX
      const newCenterX = -nodeCenterX
      // Convert back to top-left position
      const newX = newCenterX - node.width / 2

      node.x = newX
      node.mindmapPosition = { x: newX, y: node.y }
      allUpdates.push({ nodeId: node.id, newX: newX, newY: node.y })
    }
  }

  // STEP 2: Apply reverse operations level by level
  const reverseOps = ops.filter(op => op === 'reverse-left' || op === 'reverse-right')
  if (reverseOps.length > 0) {
    console.log(`Applying reverse operations: ${reverseOps.join(', ')}`)

    // Process each level for reverse operations
    const processLevelRecursively = (parentIds: (string | null)[]) => {
      if (parentIds.length === 0) return

      const nextLevelParentIds: string[] = []

      for (const parentId of parentIds) {
        const children = nodes.value.filter(n => n.parentId === parentId)
        if (children.length === 0) continue

        const parent = parentId ? nodes.value.find(n => n.id === parentId) ?? null : null

        // Calculate reverse operations for this level's children
        const updates = calculateOrientationTransition(
          children,
          parent,
          canvasCenter,
          fromOrientation,
          toOrientation,
          true // skipMirror - only do reverse operations
        )

        // Apply updates
        for (const update of updates) {
          const node = nodes.value.find(n => n.id === update.nodeId)
          if (node) {
            node.x = update.newX
            node.y = update.newY
            node.mindmapPosition = { x: update.newX, y: update.newY }
            allUpdates.push(update)
          }
        }

        // Queue children for next level processing
        for (const child of children) {
          nextLevelParentIds.push(child.id)
        }
      }

      // Process next level
      if (nextLevelParentIds.length > 0) {
        processLevelRecursively(nextLevelParentIds)
      }
    }

    processLevelRecursively([null])
  }

  // Final sync
  if (allUpdates.length > 0) {
    console.log(`Applied ${allUpdates.length} position updates`)

    // Update edges to reflect new positions
    updateAllEdgeHandles()

    // Sync to VueFlow
    syncToVueFlow()
    setNodes(vueFlowNodes.value)

    // Sync to store
    syncToStore()
  }
}

// Watch for orientation changes
watch(
  () => orientationStore.orientation,
  (newOrientation, oldOrientation) => {
    if (newOrientation !== oldOrientation && nodes.value.length > 0) {
      applyOrientationTransition(oldOrientation, newOrientation)
    }
  }
)
</script>

<style scoped>
.mindmap-canvas {
  width: 100%;
  height: 100%;
  flex: 1;
  min-height: 0;
  position: relative;
  display: flex;
  flex-direction: column;
  background-color: var(--vf-background-color, #ffffff);
}

.mindmap-canvas :deep(.vue-flow) {
  flex: 1;
  min-height: 0;
}

/* VueFlow background pattern styling */
.mindmap-canvas :deep(.vue-flow__background) {
  background-color: var(--vf-background-color, #ffffff);
}

.mindmap-canvas :deep(.vue-flow__background svg) {
  color: var(--vf-background-pattern-color, #e0e0e0);
}

.canvas-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
}

.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  z-index: 1000;
  min-width: 150px;

  .body--dark & {
    background: #2d3748;
    border-color: #4a5568;
    box-shadow: 0 2px 10px rgba(0,0,0,0.5);
  }
}

.context-menu-item {
  padding: 8px 16px;
  cursor: pointer;
  color: #1d1d1d;

  .body--dark & {
    color: #e2e8f0;
  }
}

.context-menu-item:hover {
  background: #f0f0f0;

  .body--dark & {
    background: #4a5568;
  }
}

.context-menu-item-danger {
  color: #dc3545;

  .body--dark & {
    color: #fc8181;
  }
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
  color: #1d1d1d;

  .body--dark & {
    background: rgba(45, 55, 72, 0.9);
    color: #e2e8f0;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  }
}

/* Selected node styling - VueFlow adds .selected class to wrapper */
:deep(.vue-flow__node.selected) .custom-node {
  background: #e7f5ff !important;
  border-color: #228be6 !important;
  border-width: 2px !important;
  box-shadow: 0 0 0 3px rgba(34, 139, 230, 0.25) !important;
}

:deep(.vue-flow__node.selected) .custom-node .node-content {
  color: #1864ab !important;
}

/* Dark mode selected node styling */
.body--dark :deep(.vue-flow__node.selected) .custom-node {
  background: #1a365d !important;
  border-color: #4dabf7 !important;
  box-shadow: 0 0 0 3px rgba(77, 171, 247, 0.3) !important;
}

.body--dark :deep(.vue-flow__node.selected) .custom-node .node-content {
  color: #90cdf4 !important;
}

/* Reference edge styling - dashed line with different color */
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

