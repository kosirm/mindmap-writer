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
  MindscribbleDocument
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
  // PUBLIC API (Phase 1)
  // ============================================================

  return {
    // State access
    documents,
    documentInstances,
    activeDocumentId,
    layouts,
    dirtyDocuments,

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

    // Layout management
    saveLayout,
    getLayout,
    removeLayout,
    clearAllLayouts,

    // Event forwarding
    emitEvent
  }
})
