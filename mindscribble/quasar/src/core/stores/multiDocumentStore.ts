/**
 * Multi-Document Store
 *
 * Manages multiple open documents in dockview file panels.
 * Maps file panel IDs to document instances and handles:
 * - Multiple document instances
 * - Active document tracking
 * - Document-to-panel mapping
 * - Child dockview layout state per document
 * - localStorage persistence for page reload
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MindscribbleDocument } from '../types'
import type { DriveFileMetadata } from '../services/googleDriveService'

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
 * Persisted state for localStorage (for page reload)
 */
export interface PersistedDocumentState {
  filePanelId: string
  driveFileId: string | null
  driveFileName: string | null
  childLayoutState: unknown
}

export const useMultiDocumentStore = defineStore('multiDocument', () => {
  // ============================================================
  // STATE
  // ============================================================

  /** Map of file panel ID to document instance */
  const documents = ref<Map<string, DocumentInstance>>(new Map())

  /** Currently active file panel ID */
  const activeFilePanelId = ref<string | null>(null)

  // ============================================================
  // COMPUTED
  // ============================================================

  /** Active document instance */
  const activeDocument = computed(() => {
    if (!activeFilePanelId.value) return null
    return documents.value.get(activeFilePanelId.value) ?? null
  })

  /** Number of open documents */
  const documentCount = computed(() => documents.value.size)

  /** List of all document instances */
  const allDocuments = computed(() => Array.from(documents.value.values()))

  /** Whether there are any unsaved changes across all documents */
  const hasUnsavedChanges = computed(() =>
    allDocuments.value.some(doc => doc.isDirty)
  )

  // ============================================================
  // ACTIONS
  // ============================================================

  /**
   * Create a new document instance for a file panel
   */
  function createDocument(
    filePanelId: string,
    document: MindscribbleDocument,
    driveFile: DriveFileMetadata | null = null,
    childLayoutState: unknown = null
  ): DocumentInstance {
    const instance: DocumentInstance = {
      filePanelId,
      document,
      driveFile,
      childLayoutState,
      isDirty: false,
      lastModified: new Date()
    }

    documents.value.set(filePanelId, instance)
    saveToLocalStorage()

    return instance
  }

  /**
   * Get document instance by file panel ID
   */
  function getDocument(filePanelId: string): DocumentInstance | null {
    return documents.value.get(filePanelId) ?? null
  }

  /**
   * Update document data
   */
  function updateDocument(
    filePanelId: string,
    document: MindscribbleDocument
  ): void {
    const instance = documents.value.get(filePanelId)
    if (instance) {
      instance.document = document
      instance.isDirty = true
      instance.lastModified = new Date()
      saveToLocalStorage()
    }
  }

  /**
   * Update child dockview layout state for a document
   */
  function updateChildLayout(
    filePanelId: string,
    layoutState: unknown
  ): void {
    const instance = documents.value.get(filePanelId)
    if (instance) {
      instance.childLayoutState = layoutState
      saveToLocalStorage()
    }
  }

  /**
   * Mark document as saved (clean)
   */
  function markDocumentClean(filePanelId: string): void {
    const instance = documents.value.get(filePanelId)
    if (instance) {
      instance.isDirty = false
      saveToLocalStorage()
    }
  }

  /**
   * Mark document as dirty (has unsaved changes)
   */
  function markDocumentDirty(filePanelId: string): void {
    const instance = documents.value.get(filePanelId)
    if (instance) {
      instance.isDirty = true
      instance.lastModified = new Date()
    }
  }

  /**
   * Update drive file metadata for a document
   */
  function updateDriveFile(
    filePanelId: string,
    driveFile: DriveFileMetadata
  ): void {
    const instance = documents.value.get(filePanelId)
    if (instance) {
      instance.driveFile = driveFile
      saveToLocalStorage()
    }
  }

  /**
   * Remove document instance (when file panel is closed)
   */
  function removeDocument(filePanelId: string): void {
    documents.value.delete(filePanelId)
    if (activeFilePanelId.value === filePanelId) {
      // Set active to another document if available
      const remaining = Array.from(documents.value.keys())
      activeFilePanelId.value = remaining.length > 0 ? remaining[0] ?? null : null
    }
    saveToLocalStorage()
  }

  /**
   * Set active file panel
   */
  function setActiveFilePanel(filePanelId: string | null): void {
    activeFilePanelId.value = filePanelId
  }

  /**
   * Clear all documents
   */
  function clearAll(): void {
    documents.value.clear()
    activeFilePanelId.value = null
    localStorage.removeItem('mindscribble-open-documents')
  }

  // ============================================================
  // PERSISTENCE
  // ============================================================

  /**
   * Save open documents to localStorage for page reload
   */
  function saveToLocalStorage(): void {
    const persisted: PersistedDocumentState[] = allDocuments.value.map(doc => ({
      filePanelId: doc.filePanelId,
      driveFileId: doc.driveFile?.id ?? null,
      driveFileName: doc.driveFile?.name ?? null,
      childLayoutState: doc.childLayoutState
    }))

    localStorage.setItem('mindscribble-open-documents', JSON.stringify(persisted))
  }

  /**
   * Load open documents from localStorage
   * Returns list of drive file IDs that need to be loaded
   */
  function loadFromLocalStorage(): string[] {
    const saved = localStorage.getItem('mindscribble-open-documents')
    if (!saved) return []

    try {
      const persisted: PersistedDocumentState[] = JSON.parse(saved)
      const fileIdsToLoad: string[] = []

      for (const state of persisted) {
        if (state.driveFileId) {
          fileIdsToLoad.push(state.driveFileId)
        }
      }

      return fileIdsToLoad
    } catch (error) {
      console.error('Failed to load persisted documents:', error)
      return []
    }
  }

  /**
   * Restore document instance after loading from Drive
   */
  function restoreDocument(
    filePanelId: string,
    document: MindscribbleDocument,
    driveFile: DriveFileMetadata,
    childLayoutState: unknown
  ): void {
    createDocument(filePanelId, document, driveFile, childLayoutState)
  }

  // ============================================================
  // RETURN PUBLIC API
  // ============================================================

  return {
    // State
    documents,
    activeFilePanelId,

    // Computed
    activeDocument,
    documentCount,
    allDocuments,
    hasUnsavedChanges,

    // Actions
    createDocument,
    getDocument,
    updateDocument,
    updateChildLayout,
    markDocumentClean,
    markDocumentDirty,
    updateDriveFile,
    removeDocument,
    setActiveFilePanel,
    clearAll,

    // Persistence
    saveToLocalStorage,
    loadFromLocalStorage,
    restoreDocument
  }
})


