/**
 * Document Store - Single source of truth for document data
 *
 * This store manages:
 * - Document nodes and edges
 * - View-specific positions (mindmap, concept map, etc.)
 * - Inter-map links
 * - Selection state
 * - Document metadata
 *
 * Event Emission Pattern:
 * - All state-changing methods accept an optional `source` parameter
 * - After state change, the store emits an event via eventBus
 * - Views use useViewEvents() to listen, automatically ignoring their own events
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  MindscribbleNode,
  MindscribbleEdge,
  InterMapLink,
  OrientationMode,
  ViewType,
  Position,
  NodeData,
  MindscribbleDocument
} from '../types'
import { eventBus, type EventSource } from '../events'

export const useDocumentStore = defineStore('document', () => {
  // ============================================================
  // DOCUMENT DATA
  // ============================================================

  const nodes = ref<MindscribbleNode[]>([])
  const edges = ref<MindscribbleEdge[]>([])
  const interMapLinks = ref<InterMapLink[]>([])

  // ============================================================
  // DOCUMENT METADATA
  // ============================================================

  const currentDocumentId = ref<string | null>(null)
  const documentName = ref('Untitled')
  const documentDescription = ref('')
  const documentTags = ref<string[]>([])
  const documentCreated = ref<string>(new Date().toISOString())
  const documentModified = ref<string>(new Date().toISOString())

  // ============================================================
  // LAYOUT SETTINGS
  // ============================================================

  const activeView = ref<ViewType>('mindmap')
  const orientationMode = ref<OrientationMode>('anticlockwise')
  const lodEnabled = ref(true)
  const lodThresholds = ref<number[]>([10, 30, 50, 70, 90])
  const horizontalSpacing = ref(50)
  const verticalSpacing = ref(20)

  // ============================================================
  // SELECTION STATE
  // ============================================================

  const selectedNodeIds = ref<string[]>([])

  // ============================================================
  // DIRTY STATE
  // ============================================================

  const isDirty = ref(false)

  // ============================================================
  // COMPUTED PROPERTIES
  // ============================================================

  const selectedNodes = computed(() =>
    nodes.value.filter((n) => selectedNodeIds.value.includes(n.id))
  )

  const rootNodes = computed(() =>
    nodes.value
      .filter((n) => n.data.parentId === null)
      .sort((a, b) => a.data.order - b.data.order)
  )

  const nodeCount = computed(() => nodes.value.length)

  const maxDepth = computed(() => {
    function getDepth(nodeId: string, depth: number): number {
      const children = nodes.value.filter((n) => n.data.parentId === nodeId)
      if (children.length === 0) return depth
      return Math.max(...children.map((c) => getDepth(c.id, depth + 1)))
    }
    const roots = nodes.value.filter((n) => n.data.parentId === null)
    if (roots.length === 0) return 0
    return Math.max(...roots.map((r) => getDepth(r.id, 1)))
  })

  // ============================================================
  // SELECTION ACTIONS
  // ============================================================

  function selectNode(
    nodeId: string | null,
    source: EventSource = 'store',
    scrollIntoView = true
  ) {
    if (nodeId === null) {
      selectedNodeIds.value = []
    } else {
      selectedNodeIds.value = [nodeId]
    }

    eventBus.emit('store:node-selected', { nodeId, source, scrollIntoView })
  }

  function selectNodes(nodeIds: string[], source: EventSource = 'store') {
    selectedNodeIds.value = nodeIds

    eventBus.emit('store:nodes-selected', { nodeIds, source })
  }

  function addToSelection(nodeId: string, source: EventSource = 'store') {
    if (!selectedNodeIds.value.includes(nodeId)) {
      selectedNodeIds.value.push(nodeId)
    }

    eventBus.emit('store:nodes-selected', { nodeIds: selectedNodeIds.value, source })
  }

  function removeFromSelection(nodeId: string, source: EventSource = 'store') {
    selectedNodeIds.value = selectedNodeIds.value.filter((id) => id !== nodeId)

    eventBus.emit('store:nodes-selected', { nodeIds: selectedNodeIds.value, source })
  }

  function clearSelection(source: EventSource = 'store') {
    selectedNodeIds.value = []

    eventBus.emit('store:node-selected', { nodeId: null, source })
  }

  function selectNavigateNode(
    nodeId: string | null,
    source: EventSource = 'store'
  ) {
    if (nodeId === null) {
      selectedNodeIds.value = []
    } else {
      selectedNodeIds.value = [nodeId]
    }

    eventBus.emit('store:select-navigate', { nodeId, source, scrollIntoView: true })
  }

  // ============================================================
  // NODE QUERY ACTIONS
  // ============================================================

  function getNodeById(nodeId: string): MindscribbleNode | undefined {
    return nodes.value.find((n) => n.id === nodeId)
  }

  function getChildNodes(parentId: string): MindscribbleNode[] {
    return nodes.value
      .filter((n) => n.data.parentId === parentId)
      .sort((a, b) => a.data.order - b.data.order)
  }

  function getAllDescendants(nodeId: string): MindscribbleNode[] {
    const descendants: MindscribbleNode[] = []
    const children = getChildNodes(nodeId)
    for (const child of children) {
      descendants.push(child)
      descendants.push(...getAllDescendants(child.id))
    }
    return descendants
  }

  function getNodePath(nodeId: string): MindscribbleNode[] {
    const path: MindscribbleNode[] = []
    let current = getNodeById(nodeId)
    while (current) {
      path.unshift(current)
      current = current.data.parentId ? getNodeById(current.data.parentId) : undefined
    }
    return path
  }

  // ============================================================
  // VIEW SWITCHING ACTIONS
  // ============================================================

  /**
   * Save current active positions to the specified view's storage
   */
  function saveViewPositions(viewType: ViewType) {
    for (const node of nodes.value) {
      const position: Position = { x: node.position.x, y: node.position.y }

      if (viewType === 'mindmap') {
        if (!node.views.mindmap) node.views.mindmap = { position: null }
        node.views.mindmap.position = position
      } else if (viewType === 'concept-map') {
        if (!node.views.conceptMap) node.views.conceptMap = { position: null }
        node.views.conceptMap.position = position
      }
      // Add more views as needed
    }
  }

  /**
   * Load positions from the specified view's storage to active positions
   * Returns true if positions were loaded, false if view needs initialization
   */
  function loadViewPositions(viewType: ViewType): boolean {
    let hasPositions = false

    for (const node of nodes.value) {
      let viewPosition: Position | null = null

      if (viewType === 'mindmap') {
        viewPosition = node.views.mindmap?.position ?? null
      } else if (viewType === 'concept-map') {
        viewPosition = node.views.conceptMap?.position ?? null
      }

      if (viewPosition) {
        node.position = { x: viewPosition.x, y: viewPosition.y }
        hasPositions = true
      }
    }

    return hasPositions
  }

  /**
   * Switch to a different view
   * 1. Save current positions to current view
   * 2. Load positions from target view (or return false if needs initialization)
   */
  function switchView(targetView: ViewType, source: EventSource = 'store'): boolean {
    // Save current view positions
    saveViewPositions(activeView.value)

    // Update active view
    const previousView = activeView.value
    activeView.value = targetView

    // Load target view positions
    const loaded = loadViewPositions(targetView)

    // Emit event
    eventBus.emit('store:view-changed', {
      previousView,
      newView: targetView,
      positionsLoaded: loaded,
      source
    })

    return loaded
  }

  // ============================================================
  // NODE CRUD ACTIONS
  // ============================================================

  function generateNodeId(): string {
    return `node-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  function addNode(
    parentId: string | null,
    title: string,
    content = '',
    position?: Position,
    source: EventSource = 'store'
  ): MindscribbleNode {
    const siblings = parentId ? getChildNodes(parentId) : rootNodes.value
    const order = siblings.length

    const newNode: MindscribbleNode = {
      id: generateNodeId(),
      type: 'custom',
      position: position ?? { x: 0, y: 0 },
      data: {
        parentId,
        order,
        title,
        content,
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      },
      views: {}
    }

    nodes.value.push(newNode)
    markDirty()

    // Emit event
    eventBus.emit('store:node-created', {
      nodeId: newNode.id,
      parentId,
      position: newNode.position,
      source
    })

    return newNode
  }

  function updateNode(
    nodeId: string,
    updates: Partial<NodeData>,
    source: EventSource = 'store'
  ) {
    const node = getNodeById(nodeId)
    if (node) {
      Object.assign(node.data, updates, { modified: new Date().toISOString() })
      markDirty()

      // Emit event with changes
      eventBus.emit('store:node-updated', {
        nodeId,
        changes: updates as { title?: string; content?: string; [key: string]: unknown },
        source
      })
    }
  }

  function updateNodePosition(
    nodeId: string,
    position: Position,
    source: EventSource = 'store'
  ) {
    const node = getNodeById(nodeId)
    if (node) {
      const previousPosition = { ...node.position }
      node.position = { ...position }
      markDirty()

      // Emit event
      eventBus.emit('store:node-moved', {
        nodeId,
        position,
        previousPosition,
        source
      })
    }
  }

  function deleteNode(
    nodeId: string,
    deleteChildren = true,
    source: EventSource = 'store'
  ) {
    const node = getNodeById(nodeId)
    if (!node) return

    // Get all nodes to delete
    const nodesToDelete = deleteChildren
      ? [nodeId, ...getAllDescendants(nodeId).map((n) => n.id)]
      : [nodeId]

    // If not deleting children, reparent them
    if (!deleteChildren) {
      const children = getChildNodes(nodeId)
      for (const child of children) {
        child.data.parentId = node.data.parentId
      }
    }

    // Remove nodes
    nodes.value = nodes.value.filter((n) => !nodesToDelete.includes(n.id))

    // Remove edges involving deleted nodes
    edges.value = edges.value.filter(
      (e) => !nodesToDelete.includes(e.source) && !nodesToDelete.includes(e.target)
    )

    // Remove inter-map links from deleted nodes
    interMapLinks.value = interMapLinks.value.filter(
      (l) => !nodesToDelete.includes(l.sourceNodeId)
    )

    // Update selection
    selectedNodeIds.value = selectedNodeIds.value.filter((id) => !nodesToDelete.includes(id))

    // Reorder siblings
    const siblings = node.data.parentId ? getChildNodes(node.data.parentId) : rootNodes.value
    siblings.forEach((s, i) => {
      s.data.order = i
    })

    markDirty()

    // Emit event
    eventBus.emit('store:node-deleted', {
      nodeId,
      deletedIds: nodesToDelete,
      source
    })
  }

  function moveNode(
    nodeId: string,
    newParentId: string | null,
    newOrder?: number,
    source: EventSource = 'store'
  ) {
    const node = getNodeById(nodeId)
    if (!node) return

    // Prevent moving to own descendant
    if (newParentId) {
      const descendants = getAllDescendants(nodeId)
      if (descendants.some((d) => d.id === newParentId)) {
        console.warn('Cannot move node to its own descendant')
        return
      }
    }

    const oldParentId = node.data.parentId

    // Reorder old siblings
    if (oldParentId !== newParentId) {
      const oldSiblings = oldParentId ? getChildNodes(oldParentId) : rootNodes.value
      oldSiblings
        .filter((s) => s.id !== nodeId)
        .forEach((s, i) => {
          s.data.order = i
        })
    }

    // Update parent
    node.data.parentId = newParentId

    // Insert at new position
    const newSiblings = newParentId ? getChildNodes(newParentId) : rootNodes.value
    const targetOrder = newOrder ?? newSiblings.length

    newSiblings
      .filter((s) => s.id !== nodeId)
      .forEach((s, i) => {
        s.data.order = i >= targetOrder ? i + 1 : i
      })
    node.data.order = targetOrder

    markDirty()

    // Emit event
    eventBus.emit('store:node-reparented', {
      nodeId,
      oldParentId,
      newParentId,
      newOrder: targetOrder,
      source
    })
  }

  /**
   * Reorder siblings - update order values for multiple nodes at once
   * Used when nodes are reordered within the same parent
   */
  function reorderSiblings(
    parentId: string | null,
    newOrders: Map<string, number>,
    source: EventSource = 'store'
  ) {
    let anyChanged = false

    // Update order for each node
    newOrders.forEach((newOrder, nodeId) => {
      const node = getNodeById(nodeId)
      if (node && node.data.order !== newOrder) {
        node.data.order = newOrder
        node.data.modified = new Date().toISOString()
        anyChanged = true
      }
    })

    if (anyChanged) {
      markDirty()

      // Emit siblings-reordered event
      eventBus.emit('store:siblings-reordered', {
        parentId,
        newOrders,
        source
      })
    }
  }

  // ============================================================
  // EDGE ACTIONS
  // ============================================================

  function addEdge(
    sourceId: string,
    targetId: string,
    edgeType: 'hierarchy' | 'reference' = 'hierarchy',
    source: EventSource = 'store'
  ): MindscribbleEdge | null {
    // Check if edge already exists
    const exists = edges.value.some(
      (e) => e.source === sourceId && e.target === targetId
    )
    if (exists) return null

    const newEdge: MindscribbleEdge = {
      id: `edge-${sourceId}-${targetId}`,
      source: sourceId,
      target: targetId,
      type: 'straight',
      class: `edge-${edgeType}`,
      data: { edgeType }
    }

    edges.value.push(newEdge)
    markDirty()

    // Emit event for edge creation
    eventBus.emit('store:edge-created', {
      edgeId: newEdge.id,
      sourceId,
      targetId,
      edgeType,
      source
    })

    return newEdge
  }

  function removeEdge(edgeId: string, source: EventSource = 'store') {
    edges.value = edges.value.filter((e) => e.id !== edgeId)
    markDirty()

    // Emit event for edge deletion
    eventBus.emit('store:edge-deleted', {
      edgeId,
      source
    })
  }

  // ============================================================
  // INTER-MAP LINK ACTIONS
  // ============================================================

  function addInterMapLink(
    sourceNodeId: string,
    targetMapId: string,
    targetNodeId?: string,
    label?: string
  ): InterMapLink {
    const newLink: InterMapLink = {
      id: `link-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      sourceNodeId,
      targetMapId,
      created: new Date().toISOString()
    }

    // Only add optional properties if they have values
    if (targetNodeId !== undefined) {
      newLink.targetNodeId = targetNodeId
    }
    if (label !== undefined) {
      newLink.label = label
    }

    interMapLinks.value.push(newLink)
    markDirty()

    return newLink
  }

  function removeInterMapLink(linkId: string) {
    interMapLinks.value = interMapLinks.value.filter((l) => l.id !== linkId)
    markDirty()
  }

  function getLinksFromNode(nodeId: string): InterMapLink[] {
    return interMapLinks.value.filter((l) => l.sourceNodeId === nodeId)
  }

  // ============================================================
  // DIRTY STATE ACTIONS
  // ============================================================

  function markDirty() {
    isDirty.value = true
    documentModified.value = new Date().toISOString()
  }

  function markClean() {
    isDirty.value = false
  }

  // ============================================================
  // DOCUMENT SERIALIZATION
  // ============================================================

  function toDocument(): MindscribbleDocument {
    return {
      version: '1.0',
      metadata: {
        id: currentDocumentId.value ?? `doc-${Date.now()}`,
        name: documentName.value,
        description: documentDescription.value,
        created: documentCreated.value,
        modified: documentModified.value,
        tags: [...documentTags.value],
        searchableText: nodes.value.map((n) => `${n.data.title} ${n.data.content}`).join(' '),
        nodeCount: nodes.value.length,
        edgeCount: edges.value.length,
        maxDepth: maxDepth.value
      },
      nodes: [...nodes.value],
      edges: [...edges.value],
      interMapLinks: [...interMapLinks.value],
      layout: {
        activeView: activeView.value,
        orientationMode: orientationMode.value,
        lodEnabled: lodEnabled.value,
        lodThresholds: [...lodThresholds.value],
        horizontalSpacing: horizontalSpacing.value,
        verticalSpacing: verticalSpacing.value
      }
    }
  }

  function fromDocument(doc: MindscribbleDocument, source: EventSource = 'store') {
    // Metadata
    currentDocumentId.value = doc.metadata.id
    documentName.value = doc.metadata.name
    documentDescription.value = doc.metadata.description ?? ''
    documentCreated.value = doc.metadata.created
    documentModified.value = doc.metadata.modified
    documentTags.value = [...doc.metadata.tags]

    // Data
    nodes.value = [...doc.nodes]
    edges.value = [...doc.edges]
    interMapLinks.value = [...doc.interMapLinks]

    // Layout
    activeView.value = doc.layout.activeView
    orientationMode.value = doc.layout.orientationMode
    lodEnabled.value = doc.layout.lodEnabled
    lodThresholds.value = [...doc.layout.lodThresholds]
    horizontalSpacing.value = doc.layout.horizontalSpacing
    verticalSpacing.value = doc.layout.verticalSpacing

    // Clear selection and dirty state
    selectedNodeIds.value = []
    isDirty.value = false

    // Emit event
    eventBus.emit('store:document-loaded', {
      documentId: doc.metadata.id,
      documentName: doc.metadata.name,
      source
    })
  }

  function clearDocument(source: EventSource = 'store') {
    nodes.value = []
    edges.value = []
    interMapLinks.value = []
    selectedNodeIds.value = []
    currentDocumentId.value = null
    documentName.value = 'Untitled'
    documentDescription.value = ''
    documentTags.value = []
    documentCreated.value = new Date().toISOString()
    documentModified.value = new Date().toISOString()
    activeView.value = 'mindmap'
    isDirty.value = false

    // Emit event
    eventBus.emit('store:document-cleared', { source })
  }

  // ============================================================
  // SIDE MANAGEMENT ACTIONS (for vue3-mindmap)
  // ============================================================

  /**
   * Set the side for a root node (immediate child of document root)
   */
  function setNodeSide(nodeId: string, side: 'left' | 'right' | null, source: EventSource = 'store') {
    const node = getNodeById(nodeId)
    if (node && node.data.parentId === null) { // Only allow for root nodes
      // Update the node's side attribute
      node.data.side = side

      // Also update view-specific data
      if (!node.views.vue3mindmap) {
        node.views.vue3mindmap = {}
      }
      node.views.vue3mindmap.side = side

      // Mark as dirty for auto-save
      markDirty()

      // Emit event
      eventBus.emit('store:node-side-changed', { nodeId, newSide: side, source })
    }
  }

  /**
   * Toggle node side (left ↔ right)
   */
  function toggleNodeSide(nodeId: string, source: EventSource = 'store') {
    const node = getNodeById(nodeId)
    if (node && node.data.parentId === null) {
      const newSide = node.data.side === 'left' ? 'right' : 'left'
      setNodeSide(nodeId, newSide, source)
    }
  }

  /**
   * Get all root nodes with their sides
   */
  function getRootNodesWithSides() {
    return rootNodes.value.map(rootNode => ({
      node: rootNode,
      side: rootNode.data.side || rootNode.views.vue3mindmap?.side || null
    }))
  }

  // ============================================================
  // RETURN PUBLIC API
  // ============================================================

  return {
    // State
    nodes,
    edges,
    interMapLinks,
    currentDocumentId,
    documentName,
    documentDescription,
    documentTags,
    documentCreated,
    documentModified,
    activeView,
    orientationMode,
    lodEnabled,
    lodThresholds,
    horizontalSpacing,
    verticalSpacing,
    selectedNodeIds,
    isDirty,

    // Computed
    selectedNodes,
    rootNodes,
    nodeCount,
    maxDepth,

    // Selection Actions
    selectNode,
    selectNodes,
    addToSelection,
    removeFromSelection,
    clearSelection,
    selectNavigateNode,

    // Node Query Actions
    getNodeById,
    getChildNodes,
    getAllDescendants,
    getNodePath,

    // View Switching Actions
    saveViewPositions,
    loadViewPositions,
    switchView,

    // Node CRUD Actions
    addNode,
    updateNode,
    updateNodePosition,
    deleteNode,
    moveNode,
    reorderSiblings,

    // Side Management Actions
    setNodeSide,
    toggleNodeSide,
    getRootNodesWithSides,

    // Edge Actions
    addEdge,
    removeEdge,

    // Inter-Map Link Actions
    addInterMapLink,
    removeInterMapLink,
    getLinksFromNode,

    // Dirty State Actions
    markDirty,
    markClean,

    // Document Actions
    toDocument,
    fromDocument,
    clearDocument
  }
})

