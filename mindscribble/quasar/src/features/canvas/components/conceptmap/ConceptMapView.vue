<template>
  <div class="conceptmap-canvas">
    <VueFlow
      :nodes="vueFlowNodes"
      :edges="[]"
      :min-zoom="0.05"
      :max-zoom="3"
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
    >
      <Background />
      <MiniMap pannable zoomable v-if="showMinimap" />

      <template #node-concept="{ data, id }">
        <ConceptNode :data="data" :node-id="id" :is-parent="hasChildren(id)" />
      </template>
    </VueFlow>

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
import { ref, computed, onMounted, watch } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import type { Node, NodeMouseEvent, NodeDragEvent } from '@vue-flow/core'
import ConceptNode from './ConceptNode.vue'
import type { NodeData, ContextMenuState } from '../mindmap/types'

// Store & Events
import { useDocumentStore } from 'src/core/stores/documentStore'
import { useViewEvents } from 'src/core/events'

// Composables
import { useConceptMapLayout } from '../../composables/conceptmap/useConceptMapLayout'
import { useConceptMapCollision } from '../../composables/conceptmap/useConceptMapCollision'

// ============================================================
// STATE & SETUP
// ============================================================
const { viewport, fitView, findNode, updateNodeInternals, setNodes } = useVueFlow()
const documentStore = useDocumentStore()
const { onStoreEvent, source } = useViewEvents('concept-map')

// Local node state (converted from store)
const nodes = ref<NodeData[]>([])

// VueFlow nodes (managed by VueFlow via v-model)
const vueFlowNodes = ref<Node[]>([])

// UI state
const showMinimap = ref(true)
const showZoomIndicator = ref(true)
const contextMenu = ref<ContextMenuState>({ visible: false, x: 0, y: 0, nodeId: null })
const isUpdatingSelectionFromStore = ref(false)

// Layout constants
const PADDING = 20
const HEADER_HEIGHT = 30
const MIN_NODE_WIDTH = 150
const MIN_NODE_HEIGHT = 60

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

// ============================================================
// COMPOSABLES
// ============================================================
const { initializeLayout, isInitialized } = useConceptMapLayout(nodes, getDirectChildren)
const { resolveOverlapsForNode, adjustParentSize } = useConceptMapCollision(nodes, getDirectChildren, calculateParentSize)

// ============================================================
// COMPUTED
// ============================================================
const zoomPercent = computed(() => Math.round(viewport.value.zoom * 100))

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
  nodes.value = storeNodes.map(sn => ({
    id: sn.id,
    label: sn.data.content || sn.data.title,
    parentId: sn.data.parentId,
    x: sn.views.conceptMap?.position?.x ?? 0,
    y: sn.views.conceptMap?.position?.y ?? 0,
    width: MIN_NODE_WIDTH,
    height: MIN_NODE_HEIGHT,
    conceptMapPosition: sn.views.conceptMap?.position ?? null,
    conceptMapSize: sn.views.conceptMap?.size ?? null
  }))
  // Rebuild VueFlow nodes after syncing from store
  buildVueFlowNodes()
}

function syncToStore() {
  for (const node of nodes.value) {
    // Update the views.conceptMap data
    const storeNode = documentStore.nodes.find(n => n.id === node.id)
    if (storeNode) {
      storeNode.views.conceptMap = {
        position: node.conceptMapPosition ?? null,
        size: node.conceptMapSize ?? null
      }
    }
  }
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
  const storeNode = documentStore.addNode(parentNode.id, 'New Node', '', conceptPos, source)

  // Set conceptMap view data on the store node
  storeNode.views.conceptMap = { position: conceptPos, size: conceptSize }

  // Create local node with store ID
  const newNode: NodeData = {
    id: storeNode.id,
    label: 'New Node',
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
  const storeNode = documentStore.addNode(targetNode.parentId, 'New Node', '', conceptPos, source)

  // Set conceptMap view data on the store node
  storeNode.views.conceptMap = { position: conceptPos, size: conceptSize }

  // Create local node with store ID
  const newNode: NodeData = {
    id: storeNode.id,
    label: 'New Node',
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
onMounted(() => {
  syncFromStore()
  if (nodes.value.length > 0 && !isInitialized()) {
    initializeLayout()
    buildVueFlowNodes()
    syncToStore()
  }
  void fitView({ padding: 0.2, duration: 300 })
})

// Watch store for changes from other views
watch(() => documentStore.nodes, () => {
  syncFromStore()
  if (!isInitialized() && nodes.value.length > 0) {
    initializeLayout()
    buildVueFlowNodes()
    syncToStore()
  }
}, { deep: true })

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
</style>
