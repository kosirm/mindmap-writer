/**
 * Unified Document Store - Single source of truth for all document operations
 *
 * Unified store manages:
 * - Multiple documents with file panel mapping
 * - Active document concept
 * - Document instances and layouts
 * - Dirty state tracking
 * - Event emission for view synchronization
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { eventBus, type Events, type EventSource } from '../events'
import type {
  MindscribbleDocument,
  Position,
  NodeData,
  MasterMapDocument,
  ViewType,
  MindscribbleNode
} from '../types'
import type { DriveFileMetadata } from '../services/googleDriveService'
import { useDevSettingsStore } from '../../dev/devSettingsStore'
import { PROP } from '../constants/propertyNames'
import type { PropertyName } from '../constants/propertyNames'
import { generateId, generateTimestamp } from '../utils/idGenerator'
import {
  serializeNode,
  deserializeNode,
  serializeDocument,
  deserializeDocument
} from '../utils/propertySerialization'

/**
 * Document instance with its associated state
 */
export interface DocumentInstance {
  /** Unique file panel ID (e.g., 'file-1') */
  filePanelId: string

  /** Document data */
  document: MindscribbleDocument

  /** Google Drive file metadata (null for unsaved documents) */
  driveFile: DriveFileMetadata | null

  /** Child dockview layout state (saved with document) */
  childLayoutState: unknown

  /** Whether document has unsaved changes */
  isDirty: boolean

  /** Last modified timestamp */
  lastModified: Date
}

/**
 * Dockview layout data type
 */
export type DockviewLayoutData = Record<string, unknown>

/**
 * Document instance with its associated state
 */

export const useUnifiedDocumentStore = defineStore('documents', () => {
  // ============================================================
  // STATE (Combined from both stores)
  // ============================================================

  /** All documents by ID */
  const documents = ref<Map<string, MindscribbleDocument>>(new Map())

  // Dev settings store for selectNavigate feature
  const devSettings = useDevSettingsStore()

  /** Document instances (file panels)*/
  const documentInstances = ref<Map<string, DocumentInstance>>(new Map())

  /** Active document ID - from DocumentStore */
  const activeDocumentId = ref<string | null>(null)

  /** Document layouts - from PanelStore integration */
  const layouts = ref<Map<string, DockviewLayoutData>>(new Map())

  /** Dirty state tracking */
  const dirtyDocuments = ref<Set<string>>(new Set())

  /** Master map documents */
  const masterMapDocuments = ref<Map<string, MasterMapDocument>>(new Map())

  /** Revision counter to force reactivity updates */
  const documentRevision = ref(0)

  // ============================================================
  // COMPUTED PROPERTIES (Preserve existing patterns)
  // ============================================================

  /** Active document - preserves DocumentStore pattern */
  const activeDocument = computed(() => {
    // Access revision counter to force reactivity
    void documentRevision.value
    if (!activeDocumentId.value) return null
    return documents.value.get(activeDocumentId.value) ?? null
  })

  /** All documents */
  const allDocuments = computed(() => Array.from(documents.value.values()))

  const hasUnsavedChanges = computed(() => dirtyDocuments.value.size > 0)

  /** Check if active document is dirty - preserves DocumentStore pattern */
  const isActiveDocumentDirty = computed(() => {
    if (!activeDocumentId.value) return false
    return dirtyDocuments.value.has(activeDocumentId.value)
  })

  // ============================================================
  // CORE METHODS
  // ============================================================

  // ============================================================
  // DOCUMENT MANAGEMENT METHODS
  // ============================================================

  /**
   * Add a new document to the unified store
   */
  function addDocument(document: MindscribbleDocument) {
    updateDocument(document.metadata.id, document)

    // If this is the first document, set it as active
    if (documents.value.size === 1) {
      setActiveDocument(document.metadata.id)
    }

    // Mark document as dirty when added
    markDirty(document.metadata.id)
  }

  /**
   * Remove a document from the unified store
   */
  function removeDocument(documentId: string) {
    documents.value.delete(documentId)

    // If we removed the active document, set active to another document
    if (activeDocumentId.value === documentId) {
      const remaining = Array.from(documents.value.keys())
      setActiveDocument(remaining[0] || null)
    }

  }

  /**
   * Set the active document
   */
  function setActiveDocument(documentId: string | null) {
    activeDocumentId.value = documentId
  }

  /**
   * Mark a document as dirty (has unsaved changes)
   */
  function markDirty(documentId: string) {
    dirtyDocuments.value.add(documentId)
  }

  /**
   * Mark a document as clean (saved)
   */
  function markClean(documentId: string) {
    dirtyDocuments.value.delete(documentId)
  }

  /**
   * Check if a document is dirty
   */
  function isDirty(documentId: string): boolean {
    return dirtyDocuments.value.has(documentId)
  }

  /**
   * Get document by ID
   */
  function getDocumentById(documentId: string): MindscribbleDocument | null {
    return documents.value.get(documentId) ?? null
  }

  /**
   * Convert active document to MindscribbleDocument format using new property names
   */
  function toDocument(): MindscribbleDocument | null {
    if (!activeDocumentId.value) {
      return null
    }

    const doc = documents.value.get(activeDocumentId.value)
    if (!doc) {
      return null
    }

    // Serialize the document using new property names
    const serializedDoc = serializeDocument(doc)

    // Update metadata before returning
    serializedDoc[PROP.MAP_MODIFIED] = generateTimestamp()
    serializedDoc[PROP.MAP_SEARCHABLE_TEXT] = doc.nodes.map((n) => `${n.data.title} ${n.data.content}`).join(' ')
    serializedDoc[PROP.MAP_NODE_COUNT] = doc.nodes.length
    serializedDoc[PROP.MAP_EDGE_COUNT] = doc.edges.length

    // Convert back to standard format
    return deserializeDocument(serializedDoc) as unknown as MindscribbleDocument
  }

  /**
   * Create a new empty document using new property names
   */
  function createEmptyDocument(name = 'Untitled'): MindscribbleDocument {
    const documentId = generateId()
    const now = generateTimestamp()

    // Create document using new property naming system
    const serializedDocument: Partial<Record<PropertyName, unknown>> = {
      [PROP.MAP_VERSION]: '1.0',
      [PROP.MAP_ID]: documentId,
      [PROP.MAP_NAME]: name,
      [PROP.MAP_DESCRIPTION]: '',
      [PROP.MAP_CREATED]: now,
      [PROP.MAP_MODIFIED]: now,
      [PROP.MAP_TAGS]: [],
      [PROP.MAP_SEARCHABLE_TEXT]: '',
      [PROP.MAP_NODE_COUNT]: 0,
      [PROP.MAP_EDGE_COUNT]: 0,
      [PROP.MAP_MAX_DEPTH]: 0,
      [PROP.LAYOUT_ACTIVE_VIEW]: 'mindmap',
      [PROP.LAYOUT_ORIENTATION]: 'anticlockwise',
      [PROP.LAYOUT_LOD_ENABLED]: true,
      [PROP.LAYOUT_LOD_THRESHOLDS]: [10, 30, 50, 70, 90],
      [PROP.LAYOUT_H_SPACING]: 50,
      [PROP.LAYOUT_V_SPACING]: 20
    }

    // Convert back to standard format for compatibility
    return deserializeDocument({
      ...serializedDocument,
      nodes: [],
      edges: [],
      interMapLinks: []
    }) as unknown as MindscribbleDocument
  }

  /**
   * Update document metadata
   */
  function updateDocumentMetadata(documentId: string, metadataUpdates: Partial<MindscribbleDocument['metadata']>) {
    const doc = documents.value.get(documentId)
    if (doc) {
      // Create a new metadata object to ensure proper reactivity and timestamp update
      const updatedMetadata = {
        ...doc.metadata,
        ...metadataUpdates,
        modified: generateTimestamp()
      }

      // Create a new document object to trigger reactivity
      const updatedDoc: MindscribbleDocument = {
        ...doc,
        metadata: updatedMetadata
      }

      updateDocument(documentId, updatedDoc)
    }
  }

  /**
   * Update document layout settings
   */
  function updateDocumentLayoutSettings(documentId: string, layoutUpdates: Partial<MindscribbleDocument['layout']>) {
    const doc = documents.value.get(documentId)
    if (doc) {
      Object.assign(doc.layout, layoutUpdates)
      markDirty(documentId)
    }
  }

  // ============================================================
  // NODE OPERATIONS
  // ============================================================

  /**
   * Generate a unique node ID
   */
  function generateNodeId(): string {
    return generateId()
  }

  /**
   * Update a document in the store and increment revision counter
   * This ensures Vue's reactivity system detects the change
   */
  function updateDocument(docId: string, updatedDoc: MindscribbleDocument) {
    documents.value.set(docId, updatedDoc)
    documentRevision.value++
    // Mark document as dirty when updated
    markDirty(docId)
  }

  /**
   * Get node by ID from active document
   */
  function getNodeById(nodeId: string): MindscribbleNode | undefined {
    if (!activeDocumentId.value) return undefined
    const doc = documents.value.get(activeDocumentId.value)
    return doc?.nodes.find((n) => n.id === nodeId)
  }

  /**
   * Get child nodes of a parent
   */
  function getChildNodes(parentId: string): MindscribbleNode[] {
    if (!activeDocumentId.value) return []
    const doc = documents.value.get(activeDocumentId.value)
    if (!doc) return []
    return doc.nodes
      .filter((n) => n.data.parentId === parentId)
      .sort((a, b) => a.data.order - b.data.order)
  }

  /**
   * Get all descendants of a node
   */
  function getAllDescendants(nodeId: string): MindscribbleNode[] {
    const descendants: MindscribbleNode[] = []
    const children = getChildNodes(nodeId)
    for (const child of children) {
      descendants.push(child)
      descendants.push(...getAllDescendants(child.id))
    }
    return descendants
  }

  /**
   * Get root nodes from active document
   */
  function getRootNodes(): MindscribbleNode[] {
    if (!activeDocumentId.value) return []
    const doc = documents.value.get(activeDocumentId.value)
    if (!doc) return []
    return doc.nodes
      .filter((n) => n.data.parentId === null)
      .sort((a, b) => a.data.order - b.data.order)
  }

  /**
   * Add a new node to the active document using new property names
   */
  function addNode(
    parentId: string | null,
    title: string,
    content = '',
    position?: Position,
    source: EventSource = 'store'
  ): MindscribbleNode | null {
    if (!activeDocumentId.value) return null
    const doc = documents.value.get(activeDocumentId.value)
    if (!doc) return null

    const siblings = parentId ? getChildNodes(parentId) : getRootNodes()
    const order = siblings.length
    const now = generateTimestamp()

    // Create node using new property naming system
    const serializedNode: Partial<Record<PropertyName, unknown>> = {
      [PROP.NODE_ID]: generateNodeId(),
      [PROP.NODE_TYPE]: 'custom',
      [PROP.NODE_POSITION_X]: position?.x || 0,
      [PROP.NODE_POSITION_Y]: position?.y || 0,
      [PROP.NODE_PARENT_ID]: parentId,
      [PROP.NODE_ORDER]: order,
      [PROP.NODE_TITLE]: title,
      [PROP.NODE_CONTENT]: content,
      [PROP.NODE_CREATED]: now,
      [PROP.NODE_MODIFIED]: now
    }

    // Convert to standard format
    const newNode = deserializeNode(serializedNode) as unknown as MindscribbleNode

    // Create a new document object to trigger reactivity
    const updatedDoc = {
      ...doc,
      nodes: [...doc.nodes, newNode],
      metadata: {
        ...doc.metadata,
        modified: generateTimestamp(),
        nodeCount: doc.nodes.length + 1
      }
    }
    updateDocument(activeDocumentId.value, updatedDoc)
    markDirty(activeDocumentId.value)

    // Emit event
    eventBus.emit('store:node-created', {
      nodeId: newNode.id,
      parentId,
      position: newNode.position,
      source
    })

    return newNode
  }

  /**
   * Update node data using new property names
   */
  function updateNode(
    nodeId: string,
    updates: Partial<NodeData>,
    source: EventSource = 'store'
  ) {
    if (!activeDocumentId.value) return
    const doc = documents.value.get(activeDocumentId.value)
    if (!doc) return

    const nodeIndex = doc.nodes.findIndex((n) => n.id === nodeId)
    if (nodeIndex !== -1) {
      const node = doc.nodes[nodeIndex]
      if (!node) return

      // Serialize the node to get current state
      const serializedNode = serializeNode(node)

      // Apply updates using new property names
      if (updates.title) serializedNode[PROP.NODE_TITLE] = updates.title
      if (updates.content) serializedNode[PROP.NODE_CONTENT] = updates.content
      if (updates.parentId) serializedNode[PROP.NODE_PARENT_ID] = updates.parentId
      if (updates.order) serializedNode[PROP.NODE_ORDER] = updates.order
      if (updates.color) serializedNode[PROP.NODE_COLOR] = updates.color
      if (updates.icon) serializedNode[PROP.NODE_ICON] = updates.icon
      if (updates.side) serializedNode[PROP.NODE_VIEW_SIDE] = updates.side

      // Always update modified timestamp
      serializedNode[PROP.NODE_MODIFIED] = generateTimestamp()

      // Convert back to standard format
      const updatedNode = deserializeNode(serializedNode) as unknown as MindscribbleNode

      // Create new nodes array with updated node
      const updatedNodes = [...doc.nodes]
      updatedNodes[nodeIndex] = updatedNode

      // Create new document object to trigger reactivity
      const updatedDoc: MindscribbleDocument = {
        ...doc,
        nodes: updatedNodes,
        metadata: {
          ...doc.metadata,
          modified: generateTimestamp()
        }
      }
      updateDocument(activeDocumentId.value, updatedDoc)
      markDirty(activeDocumentId.value)

      // Emit event
      eventBus.emit('store:node-updated', {
        nodeId,
        changes: updates as { title?: string; content?: string; [key: string]: unknown },
        source
      })
    }
  }

  /**
   * Update node position
   */
  function updateNodePosition(
    nodeId: string,
    position: Position,
    source: EventSource = 'store'
  ) {
    if (!activeDocumentId.value) return
    const doc = documents.value.get(activeDocumentId.value)
    if (!doc) return

    const node = doc.nodes.find((n) => n.id === nodeId)
    if (!node) return

    const previousPosition = { ...node.position }
    node.position = { ...position }
    doc.metadata.modified = generateTimestamp()
    markDirty(activeDocumentId.value)

    // Emit event
    eventBus.emit('store:node-moved', {
      nodeId,
      position,
      previousPosition,
      source
    })
  }

  /**
   * Delete a node and optionally its children
   */
  function deleteNode(
    nodeId: string,
    deleteChildren = true,
    source: EventSource = 'store'
  ) {
    if (!activeDocumentId.value) return
    const doc = documents.value.get(activeDocumentId.value)
    if (!doc) return

    const node = doc.nodes.find((n) => n.id === nodeId)
    if (!node) return

    // Get all nodes to delete
    const nodesToDelete = deleteChildren
      ? [nodeId, ...getAllDescendants(nodeId).map((n) => n.id)]
      : [nodeId]

    // Create updated nodes array
    let updatedNodes = [...doc.nodes]

    // If not deleting children, reparent them
    if (!deleteChildren) {
      const children = getChildNodes(nodeId)
      updatedNodes = updatedNodes.map(n => {
        if (children.some(c => c.id === n.id)) {
          return {
            ...n,
            data: {
              ...n.data,
              parentId: node.data.parentId
            }
          }
        }
        return n
      })
    }

    // Remove nodes
    updatedNodes = updatedNodes.filter((n) => !nodesToDelete.includes(n.id))

    // Remove edges involving deleted nodes
    const updatedEdges = doc.edges.filter(
      (e) => !nodesToDelete.includes(e.source) && !nodesToDelete.includes(e.target)
    )

    // Create new document object to trigger reactivity
    const updatedDoc: MindscribbleDocument = {
      ...doc,
      nodes: updatedNodes,
      edges: updatedEdges,
      metadata: {
        ...doc.metadata,
        modified: generateTimestamp(),
        nodeCount: updatedNodes.length,
        edgeCount: updatedEdges.length
      }
    }
    updateDocument(activeDocumentId.value, updatedDoc)
    markDirty(activeDocumentId.value)

    // Emit event
    eventBus.emit('store:node-deleted', {
      nodeId,
      deletedIds: nodesToDelete,
      source
    })
  }

  /**
   * Move a node to a new parent
   */
  function moveNode(
    nodeId: string,
    newParentId: string | null,
    newOrder?: number,
    source: EventSource = 'store'
  ) {
    if (!activeDocumentId.value) return
    const doc = documents.value.get(activeDocumentId.value)
    if (!doc) return

    const node = doc.nodes.find((n) => n.id === nodeId)
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

    // Create updated nodes array
    const updatedNodes = doc.nodes.map(n => ({ ...n, data: { ...n.data } }))
    const updatedNode = updatedNodes.find(n => n.id === nodeId)!

    // Reorder old siblings
    if (oldParentId !== newParentId) {
      const oldSiblings = updatedNodes.filter(n =>
        n.data.parentId === oldParentId && n.id !== nodeId
      )
      oldSiblings.forEach((s, i) => {
        s.data.order = i
      })
    }

    // Update parent
    updatedNode.data.parentId = newParentId

    // Insert at new position
    const newSiblings = updatedNodes.filter(n =>
      n.data.parentId === newParentId && n.id !== nodeId
    )
    const targetOrder = newOrder ?? newSiblings.length

    newSiblings.forEach((s, i) => {
      s.data.order = i >= targetOrder ? i + 1 : i
    })
    updatedNode.data.order = targetOrder

    // Create new document object to trigger reactivity
    const updatedDoc: MindscribbleDocument = {
      ...doc,
      nodes: updatedNodes,
      metadata: {
        ...doc.metadata,
        modified: generateTimestamp()
      }
    }
    updateDocument(activeDocumentId.value, updatedDoc)
    markDirty(activeDocumentId.value)

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
   */
  function reorderSiblings(
    parentId: string | null,
    newOrders: Map<string, number>,
    source: EventSource = 'store'
  ) {
    if (!activeDocumentId.value) return
    const doc = documents.value.get(activeDocumentId.value)
    if (!doc) return

    let anyChanged = false

    // Create updated nodes array
    const updatedNodes = doc.nodes.map(n => {
      const newOrder = newOrders.get(n.id)
      if (newOrder !== undefined && n.data.order !== newOrder) {
        anyChanged = true
        return {
          ...n,
          data: {
            ...n.data,
            order: newOrder,
            modified: generateTimestamp()
          }
        }
      }
      return n
    })

    if (anyChanged) {
      // Create new document object to trigger reactivity
      const updatedDoc: MindscribbleDocument = {
        ...doc,
        nodes: updatedNodes,
        metadata: {
          ...doc.metadata,
          modified: generateTimestamp()
        }
      }
      updateDocument(activeDocumentId.value, updatedDoc)
      markDirty(activeDocumentId.value)

      // Emit siblings-reordered event
      eventBus.emit('store:siblings-reordered', {
        parentId,
        newOrders,
        source
      })
    }
  }

  // ============================================================
  // SELECTION OPERATIONS
  // ============================================================

  /** Selected node IDs for active document */
  const selectedNodeIds = ref<string[]>([])

  /**
   * Select a single node
   */
  function selectNode(
    nodeId: string | null,
    source: EventSource = 'store',
    scrollIntoView = true
  ) {
    if (nodeId === null) {
      selectedNodeIds.value = []
      scrollIntoView = false
    } else {
      selectedNodeIds.value = [nodeId]
    }

    // Check if selectNavigate is enabled in dev settings
    // When selectNavigate is ON: always scroll into view (ignore scrollIntoView parameter)
    // When selectNavigate is OFF: only scroll into view when scrollIntoView is true (explicit clicks)
    const shouldScrollIntoView = devSettings.selectNavigate || scrollIntoView

    eventBus.emit('store:node-selected', { nodeId, source, scrollIntoView: shouldScrollIntoView })
  }

  /**
   * Select multiple nodes
   */
  function selectNodes(nodeIds: string[], source: EventSource = 'store') {
    selectedNodeIds.value = [...nodeIds]
    eventBus.emit('store:nodes-selected', { nodeIds, source })
  }

  /**
   * Clear selection
   */
  function clearSelection(source: EventSource = 'store') {
    selectedNodeIds.value = []
    eventBus.emit('store:node-selected', { nodeId: null, source, scrollIntoView: false })
  }

  /**
   * Add a node to the current selection (multi-select)
   */
  function addToSelection(nodeId: string, source: EventSource = 'store') {
    if (!selectedNodeIds.value.includes(nodeId)) {
      selectedNodeIds.value = [...selectedNodeIds.value, nodeId]
      eventBus.emit('store:nodes-selected', { nodeIds: selectedNodeIds.value, source })
    }
  }

  /**
   * Remove a node from the current selection
   */
  function removeFromSelection(nodeId: string, source: EventSource = 'store') {
    selectedNodeIds.value = selectedNodeIds.value.filter((id) => id !== nodeId)
    eventBus.emit('store:nodes-selected', { nodeIds: selectedNodeIds.value, source })
  }

  // ============================================================
  // NODE EXPANSION OPERATIONS (for Outline view)
  // ============================================================

  /**
   * Expand a node in outline view
   */
  function expandNode(nodeId: string, source: EventSource = 'store') {
    if (!activeDocumentId.value) return
    const doc = documents.value.get(activeDocumentId.value)
    if (!doc) return

    const nodeIndex = doc.nodes.findIndex((n) => n.id === nodeId)
    if (nodeIndex !== -1) {
      const node = doc.nodes[nodeIndex]
      if (!node) return

      const updatedNode: MindscribbleNode = {
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data,
        views: {
          ...node.views,
          outline: {
            ...node.views.outline,
            expanded: true
          }
        }
      }

      const updatedNodes = [...doc.nodes]
      updatedNodes[nodeIndex] = updatedNode

      const updatedDoc: MindscribbleDocument = {
        ...doc,
        nodes: updatedNodes
      }
      updateDocument(activeDocumentId.value, updatedDoc)
      markDirty(activeDocumentId.value)

      eventBus.emit('store:node-expanded', { nodeId, source })
    }
  }

  /**
   * Collapse a node in outline view
   */
  function collapseNode(nodeId: string, source: EventSource = 'store') {
    if (!activeDocumentId.value) return
    const doc = documents.value.get(activeDocumentId.value)
    if (!doc) return

    const nodeIndex = doc.nodes.findIndex((n) => n.id === nodeId)
    if (nodeIndex !== -1) {
      const node = doc.nodes[nodeIndex]
      if (!node) return

      const updatedNode: MindscribbleNode = {
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data,
        views: {
          ...node.views,
          outline: {
            ...node.views.outline,
            expanded: false
          }
        }
      }

      const updatedNodes = [...doc.nodes]
      updatedNodes[nodeIndex] = updatedNode

      const updatedDoc: MindscribbleDocument = {
        ...doc,
        nodes: updatedNodes
      }
      updateDocument(activeDocumentId.value, updatedDoc)
      markDirty(activeDocumentId.value)

      eventBus.emit('store:node-collapsed', { nodeId, source })
    }
  }

  /**
   * Toggle node expansion
   */
  function toggleNodeExpansion(nodeId: string, source: EventSource = 'store') {
    if (!activeDocumentId.value) return
    const doc = documents.value.get(activeDocumentId.value)
    if (!doc) return

    const node = doc.nodes.find((n) => n.id === nodeId)
    if (!node) return

    const isExpanded = node.views.outline?.expanded ?? true
    if (isExpanded) {
      collapseNode(nodeId, source)
    } else {
      expandNode(nodeId, source)
    }
  }

  /**
   * Check if node is expanded
   */
  function isNodeExpanded(nodeId: string): boolean {
    if (!activeDocumentId.value) return true
    const doc = documents.value.get(activeDocumentId.value)
    if (!doc) return true

    const node = doc.nodes.find((n) => n.id === nodeId)
    if (!node) return true

    return node?.views.outline?.expanded ?? true
  }

  // ============================================================
  // SIDE MANAGEMENT (for Mindmap view)
  // ============================================================

  /**
   * Set the side for a root node (immediate child of document root)
   */
  function setNodeSide(nodeId: string, side: 'left' | 'right' | null, source: EventSource = 'store') {
    if (!activeDocumentId.value) return
    const doc = documents.value.get(activeDocumentId.value)
    if (!doc) return

    const nodeIndex = doc.nodes.findIndex((n) => n.id === nodeId)
    if (nodeIndex === -1) return

    const node = doc.nodes[nodeIndex]
    if (!node) return

    // Check if this is an immediate child of a root node (depth 1 in mindmap)
    const parent = node.data.parentId ? doc.nodes.find((n) => n.id === node.data.parentId) : null
    const isDepth1 = parent && parent.data.parentId === null

    if (isDepth1) {
      // Create updated node
      const updatedNode: MindscribbleNode = {
        id: node.id,
        type: node.type,
        position: node.position,
        data: {
          ...node.data,
          side
        },
        views: {
          ...node.views,
          mindmap: {
            ...node.views.mindmap,
            side
          }
        }
      }

      const updatedNodes = [...doc.nodes]
      updatedNodes[nodeIndex] = updatedNode

      // Create new document object to trigger reactivity
      const updatedDoc: MindscribbleDocument = {
        ...doc,
        nodes: updatedNodes,
        metadata: {
          ...doc.metadata,
          modified: generateTimestamp()
        }
      }
      updateDocument(activeDocumentId.value, updatedDoc)
      markDirty(activeDocumentId.value)

      // Emit event
      eventBus.emit('store:node-side-changed', { nodeId, newSide: side, source })

    }
  }

  /**
   * Toggle node side (left ↔ right)
   */
  function toggleNodeSide(nodeId: string, source: EventSource = 'store') {
    if (!activeDocumentId.value) return
    const doc = documents.value.get(activeDocumentId.value)
    if (!doc) return

    const node = doc.nodes.find((n) => n.id === nodeId)
    if (!node) return

    // Check if this is an immediate child of a root node (depth 1 in mindmap)
    const parent = node.data.parentId ? doc.nodes.find((n) => n.id === node.data.parentId) : null
    const isDepth1 = parent && parent.data.parentId === null

    if (isDepth1) {
      const newSide = node.data.side === 'left' ? 'right' : 'left'
      setNodeSide(nodeId, newSide, source)
    }
  }

  /**
   * Get all root nodes with their sides
   */
  function getRootNodesWithSides() {
    if (!activeDocumentId.value) return []
    const doc = documents.value.get(activeDocumentId.value)
    if (!doc) return []

    const rootNodes = doc.nodes.filter((n) => !n.data.parentId)
    return rootNodes.map(rootNode => ({
      id: rootNode.id,
      title: rootNode.data.title,
      children: doc.nodes
        .filter((n) => n.data.parentId === rootNode.id)
        .map(child => ({
          id: child.id,
          title: child.data.title,
          side: child.data.side || child.views.mindmap?.side || null
        }))
    }))
  }

  // ============================================================
  // EVENT FORWARDING
  // ============================================================

  /**
   * Emit event through unified store with source tracking
   */
  function emitEvent(eventName: keyof Events, data: Record<string, unknown>) {
    // Add source tracking
    const payload = { ...data, source: 'store' as const }

    // Emit through unified store
    eventBus.emit(eventName, payload as Events[keyof Events])


        }
  /**
   * Forward node creation event
   */
  function emitNodeCreated(nodeId: string, parentId: string | null, position: Position) {
    emitEvent('store:node-created', { nodeId, parentId, position, source: 'store' })
  }

  /**
   * Forward node updated event
   */
  function emitNodeUpdated(nodeId: string, changes: Partial<NodeData>) {
    emitEvent('store:node-updated', { nodeId, changes, source: 'store' })
  }

  /**
   * Forward node moved event
   */
  function emitNodeMoved(nodeId: string, position: Position, previousPosition: Position) {
    emitEvent('store:node-moved', { nodeId, position, previousPosition, source: 'store' })
  }

  /**
   * Forward node deleted event
   */
  function emitNodeDeleted(nodeId: string, deletedIds: string[]) {
    emitEvent('store:node-deleted', { nodeId, deletedIds, source: 'store' })
  }

  /**
   * Forward node selected event
   */
  function emitNodeSelected(nodeId: string | null, scrollIntoView = true) {
    emitEvent('store:node-selected', { nodeId, source: 'store', scrollIntoView })
  }

  /**
   * Forward nodes selected event
   */
  function emitNodesSelected(nodeIds: string[]) {
    emitEvent('store:nodes-selected', { nodeIds, source: 'store' })
  }

  /**
   * Forward view changed event
   */
  function emitViewChanged(previousView: ViewType, newView: ViewType, positionsLoaded: boolean) {
    emitEvent('store:view-changed', { previousView, newView, positionsLoaded, source: 'store' })
  }

  /**
   * Forward document loaded event
   */
  function emitNodeLoaded(documentId: string, documentName: string) {
    emitEvent('store:document-loaded', { documentId, documentName, source: 'store' })
  }

  /**
   * Forward document cleared event
   */
  function emitDocumentCleared() {
    emitEvent('store:document-cleared', { source: 'store' })
  }

  // ============================================================
  // LAYOUT MANAGEMENT METHODS
  // ============================================================

  /**
   * Save layout for a document
   */
  function saveLayout(documentId: string, layoutData: DockviewLayoutData) {
    layouts.value.set(documentId, layoutData)
  }

  /**
   * Get layout for a document
   */
  function getLayout(documentId: string): Record<string, unknown> | null {
    return layouts.value.get(documentId) ?? null
  }

  /**
   * Remove layout for a document
   */
  function removeLayout(documentId: string) {
    layouts.value.delete(documentId)
  }

  /**
   * Clear all layouts
   */
  function clearAllLayouts() {
    layouts.value.clear()
  }

  // ============================================================
  // MASTER MAP METHODS
  // ============================================================

  /**
   * Add a document to the master map
   */
  function addToMasterMap(documentId: string, masterMapData: MasterMapDocument) {
    masterMapDocuments.value.set(documentId, masterMapData)
  }

  /**
   * Remove a document from the master map
   */
  function removeFromMasterMap(documentId: string) {
    masterMapDocuments.value.delete(documentId)
  }

  /**
   * Update master map position for a document
   */
  function updateMasterMapPosition(documentId: string, position: {x: number, y: number}) {
    const mapDoc = masterMapDocuments.value.get(documentId)
    if (mapDoc) {
      // Create a new object with updated position and timestamp
      const updatedMapDoc: MasterMapDocument = {
        ...mapDoc,
        metadata: {
          ...mapDoc.metadata,
          modified: generateTimestamp()
        },
        visualization: {
          nodePositions: {
            ...mapDoc.visualization?.nodePositions,
            [documentId]: position
          },
          expandedMaps: mapDoc.visualization?.expandedMaps || [],
          zoom: mapDoc.visualization?.zoom || 1,
          panX: mapDoc.visualization?.panX || 0,
          panY: mapDoc.visualization?.panY || 0
        }
      }
      masterMapDocuments.value.set(documentId, updatedMapDoc)
    }
  }

  /**
   * Get master map document by ID
   */
  function getMasterMapDocument(documentId: string): MasterMapDocument | null {
    return masterMapDocuments.value.get(documentId) ?? null
  }

  /**
   * Get all master map documents
   */
  function getAllMasterMapDocuments(): MasterMapDocument[] {
    return Array.from(masterMapDocuments.value.values())
  }

  /**
   * Clear all master map documents
   */
  function clearMasterMap() {
    masterMapDocuments.value.clear()
  }

  // ============================================================
  // DOCUMENT INSTANCE MANAGEMENT (Multi-document support)
  // ============================================================

  /**
   * Create a new document instance for a file panel
   * This combines document storage with file panel management
   */
  function createDocument(
    filePanelId: string,
    document: MindscribbleDocument,
    driveFile: DriveFileMetadata | null = null,
    childLayoutState: unknown = null
  ): DocumentInstance {
    const documentId = document.metadata.id

    // Add document to documents map
    addDocument(document)

    // Create document instance
    const instance: DocumentInstance = {
      filePanelId,
      document,
      driveFile,
      childLayoutState,
      isDirty: false,
      lastModified: new Date()
    }

    // Store instance
    documentInstances.value.set(filePanelId, instance)

    // Set as active document
    setActiveDocument(documentId)

    return instance
  }

  /**
   * Get document instance by file panel ID
   */
  function getDocumentInstance(filePanelId: string): DocumentInstance | null {
    return documentInstances.value.get(filePanelId) ?? null
  }

  /**
   * Update document instance
   */
  function updateDocumentInstance(filePanelId: string, updates: Partial<DocumentInstance>) {
    const instance = documentInstances.value.get(filePanelId)
    if (instance) {
      const updated = { ...instance, ...updates }
      documentInstances.value.set(filePanelId, updated)
    }
  }

  /**
   * Remove document instance
   */
  function removeDocumentInstance(filePanelId: string) {
    const instance = documentInstances.value.get(filePanelId)
    if (instance) {
      const documentId = instance.document.metadata.id
      documentInstances.value.delete(filePanelId)

      // If no more instances reference this document, remove it
      const hasOtherInstances = Array.from(documentInstances.value.values())
        .some(inst => inst.document.metadata.id === documentId)

      if (!hasOtherInstances) {
        removeDocument(documentId)
      }

    }
  }

  /**
   * Set active file panel (switches active document)
   */
  function setActiveFilePanel(filePanelId: string) {
    const instance = documentInstances.value.get(filePanelId)
    if (instance) {
      const documentId = instance.document.metadata.id
      setActiveDocument(documentId)
    }
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  return {
    // State access
    documents,
    documentInstances,
    activeDocumentId,
    layouts,
    dirtyDocuments,
    masterMapDocuments,

    // Computed
    activeDocument,
    allDocuments,
    hasUnsavedChanges,
    isActiveDocumentDirty,

    // Document management
    addDocument,
    removeDocument,
    setActiveDocument,
    markDirty,
    markClean,
    isDirty,
    getDocumentById,
    toDocument,
    createEmptyDocument,
    updateDocumentMetadata,
    updateDocumentLayoutSettings,

    // Document instance management (multi-document support)
    createDocument,
    getDocumentInstance,
    updateDocumentInstance,
    removeDocumentInstance,
    setActiveFilePanel,

    // Layout management
    saveLayout,
    getLayout,
    removeLayout,
    clearAllLayouts,

    // Master map methods
    addToMasterMap,
    removeFromMasterMap,
    updateMasterMapPosition,
    getMasterMapDocument,
    getAllMasterMapDocuments,
    clearMasterMap,

    // Node operations
    generateNodeId,
    getNodeById,
    getChildNodes,
    getAllDescendants,
    getRootNodes,
    addNode,
    updateNode,
    updateNodePosition,
    deleteNode,
    moveNode,
    reorderSiblings,
    updateDocument,
    documentRevision,

    // Selection operations
    selectedNodeIds,
    selectNode,
    selectNodes,
    clearSelection,
    addToSelection,
    removeFromSelection,

    // Node expansion operations
    expandNode,
    collapseNode,
    toggleNodeExpansion,
    isNodeExpanded,

    // Side management operations
    setNodeSide,
    toggleNodeSide,
    getRootNodesWithSides,

    // Event forwarding
    emitEvent,
    emitNodeCreated,
    emitNodeUpdated,
    emitNodeMoved,
    emitNodeDeleted,
    emitNodeSelected,
    emitNodesSelected,
    emitViewChanged,
    emitNodeLoaded,
    emitDocumentCleared
  }
})
