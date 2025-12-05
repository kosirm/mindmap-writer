<template>
  <div class="mindmap-canvas">
    <VueFlow
      ref="vueFlowRef"
      :nodes="vueFlowNodes"
      :edges="visibleEdges"
      :min-zoom="0.05"
      :max-zoom="maxZoom"
      :only-render-visible-elements="true"
      :selection-key-code="null"
      :multi-selection-key-code="'Shift'"
      :select-nodes-on-drag="true"
      @node-drag-start="onNodeDragStart"
      @node-drag="onNodeDrag"
      @node-drag-stop="onNodeDragStop"
      @node-context-menu="onNodeContextMenu"
      @node-click="onNodeClick"
      @selection-change="onSelectionChange"
      @pane-click="onPaneClick"
      @pane-mousemove="onPaneMouseMove"
    >
      <Background />
      <MiniMap pannable zoomable v-if="showMinimap" />

      <template #node-custom="{ data, id }">
        <CustomNode
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
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import type { Node, Edge, NodeMouseEvent } from '@vue-flow/core'
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

// Store & Events for selection sync
import { useDocumentStore } from 'src/core/stores/documentStore'
import { useOrientationStore } from 'src/core/stores/orientationStore'
import { useDevSettingsStore } from 'src/dev/devSettingsStore'
import { useViewEvents } from 'src/core/events'
import { calculateOrientationTransition, getTransitionOperations, type OrientationMode } from '../composables/mindmap/useOrientationSort'

// VueFlow instance
const { viewport, fitView, setViewport, findNode, updateNodeInternals } = useVueFlow()

// Dev settings store (for bounding boxes, spacing, etc.)
const devSettings = useDevSettingsStore()

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

const { edgeType, edgeTypeOptions, visibleEdges, updateEdgesForBranch, updateAllEdgeHandles, createEdge } = useEdgeManagement(
  nodes, edges, vueFlowNodes, getRootNode, isNodeOnLeftOfRoot
)

const { closeContextMenu, toggleCollapse, toggleCollapseLeft, toggleCollapseRight, addRootNode, addChildLeft, addChildRight, addChild, addSibling, detachNode, reparentNode } = useNodeOperations(
  nodes, edges, contextMenu, nodeCounter, viewport, getDirectChildren, getRootNode, getAllDescendants,
  createEdge, updateEdgesForBranch, syncToVueFlow, updateNodeDimensionsFromDOM, resolveAllOverlaps,
  'mindmap' // Event source for store operations
)

const { potentialParent, onPaneMouseMove, onNodeDragStart, onNodeDrag, onNodeDragStop } = useNodeDrag(
  nodes, viewport, getRootNode, getAllDescendants, getVisibleNodesForLOD, updateEdgesForBranch,
  reparentNode, syncToVueFlow, syncFromVueFlow, resolveAllOverlaps, resolveOverlapsBottomUpLOD,
  updateNodeInternals
)

watch(potentialParent, (newVal) => { potentialParentRef.value = newVal })

const { algorithm, generatorNodeCount, lastPerformance, generateNodeTree, clearAllNodes, generateAndLayoutMindmap } = useMindmapGenerator(
  nodes, edges, nodeCounter, viewport, verticalSpacing, vueFlowNodes, createEdge, syncToVueFlow,
  updateNodeDimensionsFromDOM, resolveAllOverlaps, () => { void fitView({ duration: 300, padding: 0.2 }) }
)

const { initializeLayout: initializeMindmapLayout } = useMindmapLayout(nodes, getDirectChildren, getRootNode)

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
  const localNodes: NodeData[] = storeNodes.map(sn => ({
    id: sn.id,
    label: sn.data.content || sn.data.title,
    parentId: sn.data.parentId,

    // Active position - use mindmap position if available, else store position
    x: sn.views.mindmap?.position?.x ?? sn.position.x,
    y: sn.views.mindmap?.position?.y ?? sn.position.y,

    // Dimensions
    width: 150, // Default, will be updated from DOM
    height: 50,

    // Mindmap view-specific position (null means needs layout)
    mindmapPosition: sn.views.mindmap?.position ?? null,

    // Collapse state from view data
    collapsed: sn.views.mindmap?.collapsed ?? false,
    collapsedLeft: sn.views.mindmap?.collapsedLeft ?? false,
    collapsedRight: sn.views.mindmap?.collapsedRight ?? false,

    // Layout flags
    isDirty: sn.views.mindmap?.isDirty ?? true,
    lastCalculatedZoom: sn.views.mindmap?.lastCalculatedZoom ?? viewport.value.zoom
  }))

  // Update local nodes
  nodes.value = localNodes

  // Rebuild edges from parent-child relationships
  rebuildEdgesFromHierarchy()

  // Sync to VueFlow
  syncToVueFlow()

  isSyncingFromStore.value = false
}

/**
 * Sync nodes FROM local state TO documentStore
 * Updates mindmap view-specific data
 */
function syncToStore() {
  for (const node of nodes.value) {
    const storeNode = documentStore.nodes.find(n => n.id === node.id)
    if (storeNode) {
      // Update mindmap view data (use defaults for optional properties to satisfy exactOptionalPropertyTypes)
      storeNode.views.mindmap = {
        position: node.mindmapPosition ?? (node.x !== 0 || node.y !== 0 ? { x: node.x, y: node.y } : null),
        collapsed: node.collapsed ?? false,
        collapsedLeft: node.collapsedLeft ?? false,
        collapsedRight: node.collapsedRight ?? false,
        isDirty: node.isDirty ?? false,
        lastCalculatedZoom: node.lastCalculatedZoom ?? viewport.value.zoom
      }

      // Also update the active position
      storeNode.position = { x: node.x, y: node.y }
    }
  }
}

/**
 * Rebuild edges based on parent-child hierarchy
 */
function rebuildEdgesFromHierarchy() {
  const newEdges: Edge[] = []

  for (const node of nodes.value) {
    if (node.parentId) {
      const parent = nodes.value.find(n => n.id === node.parentId)
      if (parent) {
        // Determine edge handles based on node position relative to parent
        const isLeft = node.x < parent.x
        const sourceHandle = isLeft ? 'left' : 'right'
        const targetHandle = isLeft ? 'right' : 'left'

        newEdges.push({
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

  edges.value = newEdges
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
  // Single node click - select it (unless shift is held for multi-select)
  if (!event.event.shiftKey) {
    documentStore.selectNode(event.node.id, source, false)
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
  closeContextMenu()
  documentStore.clearSelection(source)
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

// Expose methods and state to parent
defineExpose({
  nodes, edges, viewport, showBoundingBoxes, showMinimap, showCanvasCenter, showZoomIndicator, lodEnabled,
  horizontalSpacing, verticalSpacing, maxTreeDepth, currentLodLevel, zoomPercent, rootNodes, renderedNodeCount,
  algorithm, generatorNodeCount, lastPerformance, edgeType, edgeTypeOptions,
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

onMounted(async () => {
  setLayoutSpacing(horizontalSpacing.value, verticalSpacing.value)
  console.log('MindmapView mounted')

  // Sync from store to get existing nodes
  syncFromStore()
  console.log('After syncFromStore, nodes:', nodes.value.length)

  // If store is empty, create initial root node
  if (nodes.value.length === 0) {
    console.log('No nodes in store, creating initial root node...')
    await addRootNode()
    // Save the new node back to store
    syncToStore()
    console.log('Initial root node created, nodes:', nodes.value.length)
  } else {
    // Check if layout needs initialization (nodes without mindmapPosition)
    const needsLayout = nodes.value.some(n => n.mindmapPosition === null)
    if (needsLayout) {
      console.log('Some nodes need mindmap layout, initializing...')
      initializeMindmapLayout()
      syncToStore()
    }
  }

  // Sync to VueFlow and measure dimensions
  syncToVueFlow()
  await nextTick()
  await updateNodeDimensionsFromDOM()

  // Resolve any overlaps after layout initialization
  // This ensures nodes from other views don't overlap
  resolveAllOverlaps(nodes.value)
  syncToVueFlow()

  // Update edge handles based on node positions (important after view switch)
  updateAllEdgeHandles()

  // Center view on the node after it's rendered
  await nextTick()
  const vueFlowContainer = document.querySelector('.vue-flow')
  if (vueFlowContainer) {
    const rect = vueFlowContainer.getBoundingClientRect()
    void setViewport({ x: rect.width / 2, y: rect.height / 2, zoom: 1 }, { duration: 0 })
  }
})

// Listen for node creation events from OTHER views (not mindmap)
// The onStoreEvent automatically ignores events where source === 'mindmap'
onStoreEvent('store:node-created', ({ nodeId }) => {
  console.log(`Node created from another view: ${nodeId}, syncing to mindmap...`)

  // Re-sync from store to get the new node
  syncFromStore()

  // The new node needs layout since it doesn't have mindmapPosition
  const newNode = nodes.value.find(n => n.id === nodeId)
  if (newNode && newNode.mindmapPosition === null) {
    initializeMindmapLayout()
    syncToStore()

    // After layout, resolve overlaps and update edges
    syncToVueFlow()
    setTimeout(() => {
      void (async () => {
        await updateNodeDimensionsFromDOM()
        resolveAllOverlaps(nodes.value)
        updateAllEdgeHandles()
        syncToVueFlow()
      })()
    }, 50)
  }
})

// Listen for node updates from other views
onStoreEvent('store:node-updated', ({ nodeId }) => {
  console.log(`Node updated from another view: ${nodeId}, syncing to mindmap...`)
  syncFromStore()
  syncToVueFlow()
})

// Listen for node reparenting from other views
onStoreEvent('store:node-reparented', ({ nodeId }) => {
  console.log(`Node reparented from another view: ${nodeId}, syncing to mindmap...`)
  syncFromStore()

  // Rebuild edges after reparenting
  rebuildEdgesFromHierarchy()
  syncToVueFlow()
})

// Listen for node deletion from other views
onStoreEvent('store:node-deleted', () => {
  console.log('Node deleted from another view, syncing to mindmap...')
  syncFromStore()
  rebuildEdgesFromHierarchy()
  syncToVueFlow()
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
}

.mindmap-canvas :deep(.vue-flow) {
  flex: 1;
  min-height: 0;
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
}

.context-menu-item {
  padding: 8px 16px;
  cursor: pointer;
}

.context-menu-item:hover {
  background: #f0f0f0;
}

.context-menu-item-danger {
  color: #dc3545;
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
</style>

