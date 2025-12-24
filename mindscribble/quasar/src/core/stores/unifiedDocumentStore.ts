/**
 * Unified Document Store - Single source of truth for all document operations
 *
 * This store consolidates DocumentStore and MultiDocumentStore into a single
 * unified store that manages:
 * - Multiple documents with file panel mapping
 * - Active document concept
 * - Document instances and layouts
 * - Dirty state tracking
 * - Event emission for view synchronization
 *
 * Migration Strategy: Hybrid approach with dual-write system
 * - Phase 1: Read-only access to legacy stores
 * - Phase 2: Dual-write to both legacy and unified stores
 * - Phase 3: Full migration to unified store only
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { eventBus, type Events } from '../events'
import type {
  MindscribbleDocument,
  Position,
  NodeData,
  MasterMapDocument,
  ViewType
} from '../types'
import type { DriveFileMetadata } from '../services/googleDriveService'
import { useDocumentStore, useMultiDocumentStore } from './index'

const MIGRATION_MODE = import.meta.env.DEV

/**
 * Document instance with its associated state
 * (from MultiDocumentStore)
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
 * (from MultiDocumentStore)
 */

export const useUnifiedDocumentStore = defineStore('documents', () => {
  // ============================================================
  // STATE (Combined from both stores)
  // ============================================================

  /** All documents by ID */
  const documents = ref<Map<string, MindscribbleDocument>>(new Map())

  /** Document instances (file panels) - from MultiDocumentStore */
  const documentInstances = ref<Map<string, DocumentInstance>>(new Map())

  /** Active document ID - from DocumentStore */
  const activeDocumentId = ref<string | null>(null)

  /** Document layouts - from PanelStore integration */
  const layouts = ref<Map<string, DockviewLayoutData>>(new Map())

  /** Dirty state tracking */
  const dirtyDocuments = ref<Set<string>>(new Set())

  /** Master map documents */
  const masterMapDocuments = ref<Map<string, MasterMapDocument>>(new Map())

  // ============================================================
  // COMPUTED PROPERTIES (Preserve existing patterns)
  // ============================================================

  /** Active document - preserves DocumentStore pattern */
  const activeDocument = computed(() => {
    if (!activeDocumentId.value) return null
    return documents.value.get(activeDocumentId.value) ?? null
  })

  /** All documents - preserves MultiDocumentStore pattern */
  const allDocuments = computed(() => Array.from(documents.value.values()))

  const hasUnsavedChanges = computed(() => dirtyDocuments.value.size > 0)

  // ============================================================
  // MIGRATION MODE LOGGING
  // ============================================================

  function logMigrationOperation(operation: string, data: Record<string, unknown> = {}) {
    if (MIGRATION_MODE) {
      console.log(`[UnifiedStore] ${operation}`, {
        documentId: activeDocumentId.value,
        ...data
      })
    }
  }

  // ============================================================
  // CORE METHODS (Phase 1: Read-only access to existing stores)
  // ============================================================

  /**
   * Get document from existing DocumentStore (read-only)
   */
  function getActiveDocumentFromLegacy() {
    const documentStore = useDocumentStore()
    const doc = documentStore.toDocument()
    logMigrationOperation('getActiveDocumentFromLegacy', {
      documentId: doc.metadata.id,
      nodeCount: doc.nodes.length,
      edgeCount: doc.edges.length
    })
    return doc
  }

  /**
   * Get documents from existing MultiDocumentStore (read-only)
   */
  function getAllDocumentsFromLegacy() {
    const multiDocumentStore = useMultiDocumentStore()
    const docs = multiDocumentStore.allDocuments
    logMigrationOperation('getAllDocumentsFromLegacy', {
      documentCount: docs.length
    })
    return docs
  }

  // ============================================================
  // DOCUMENT MANAGEMENT METHODS (Phase 2)
  // ============================================================

  /**
   * Add a new document to the unified store
   */
  function addDocument(document: MindscribbleDocument) {
    documents.value.set(document.metadata.id, document)

    // If this is the first document, set it as active
    if (documents.value.size === 1) {
      setActiveDocument(document.metadata.id)
    }

    logMigrationOperation('addDocument', {
      documentId: document.metadata.id,
      documentName: document.metadata.name
    })
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

    logMigrationOperation('removeDocument', { documentId })
  }

  /**
   * Set the active document
   */
  function setActiveDocument(documentId: string | null) {
    const previousId = activeDocumentId.value
    activeDocumentId.value = documentId

    logMigrationOperation('setActiveDocument', {
      previousDocumentId: previousId,
      newDocumentId: documentId
    })
  }

  /**
   * Mark a document as dirty (has unsaved changes)
   */
  function markDirty(documentId: string) {
    dirtyDocuments.value.add(documentId)
    logMigrationOperation('markDirty', { documentId })
  }

  /**
   * Mark a document as clean (saved)
   */
  function markClean(documentId: string) {
    dirtyDocuments.value.delete(documentId)
    logMigrationOperation('markClean', { documentId })
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
   * Create a new empty document
   */
  function createEmptyDocument(name = 'Untitled'): MindscribbleDocument {
    const documentId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`

    const newDocument: MindscribbleDocument = {
      version: '1.0',
      metadata: {
        id: documentId,
        name,
        description: '',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        tags: [],
        searchableText: '',
        nodeCount: 0,
        edgeCount: 0,
        maxDepth: 0
      },
      nodes: [],
      edges: [],
      interMapLinks: [],
      layout: {
        activeView: 'mindmap',
        orientationMode: 'anticlockwise',
        lodEnabled: true,
        lodThresholds: [10, 30, 50, 70, 90],
        horizontalSpacing: 50,
        verticalSpacing: 20
      }
    }

    return newDocument
  }

  /**
   * Update document metadata
   */
  function updateDocumentMetadata(documentId: string, metadataUpdates: Partial<MindscribbleDocument['metadata']>) {
    const doc = documents.value.get(documentId)
    if (doc) {
      Object.assign(doc.metadata, metadataUpdates, {
        modified: new Date().toISOString()
      })
      markDirty(documentId)
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
  // EVENT FORWARDING (Phase 3: Dual-write system)
  // ============================================================

  /**
   * Emit event through unified store with source tracking
   */
  function emitEvent(eventName: keyof Events, data: Record<string, unknown>) {
    // Add source tracking
    const payload = { ...data, source: 'store' as const }

    // Emit through unified store
    eventBus.emit(eventName, payload as Events[keyof Events])

    // Log in migration mode
    logMigrationOperation('emitEvent', { eventName, data })
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
  function emitDocumentLoaded(documentId: string, documentName: string) {
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
    logMigrationOperation('saveLayout', { documentId })
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
    logMigrationOperation('removeLayout', { documentId })
  }

  /**
   * Clear all layouts
   */
  function clearAllLayouts() {
    layouts.value.clear()
    logMigrationOperation('clearAllLayouts', {})
  }

  // ============================================================
  // MASTER MAP METHODS (Phase 4: Future integration)
  // ============================================================

  /**
   * Add a document to the master map
   */
  function addToMasterMap(documentId: string, masterMapData: MasterMapDocument) {
    masterMapDocuments.value.set(documentId, masterMapData)
    logMigrationOperation('addToMasterMap', { documentId })
  }

  /**
   * Remove a document from the master map
   */
  function removeFromMasterMap(documentId: string) {
    masterMapDocuments.value.delete(documentId)
    logMigrationOperation('removeFromMasterMap', { documentId })
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
          modified: new Date().toISOString()
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
      logMigrationOperation('updateMasterMapPosition', { documentId, position })
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
    logMigrationOperation('clearMasterMap', {})
  }

  // ============================================================
  // PUBLIC API (Phase 1)
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

    // Migration utilities
    getActiveDocumentFromLegacy,
    getAllDocumentsFromLegacy,

    // Document management
    addDocument,
    removeDocument,
    setActiveDocument,
    markDirty,
    markClean,
    isDirty,
    getDocumentById,
    createEmptyDocument,
    updateDocumentMetadata,
    updateDocumentLayoutSettings,

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

    // Event forwarding
    emitEvent,
    emitNodeCreated,
    emitNodeUpdated,
    emitNodeMoved,
    emitNodeDeleted,
    emitNodeSelected,
    emitNodesSelected,
    emitViewChanged,
    emitDocumentLoaded,
    emitDocumentCleared
  }
})
