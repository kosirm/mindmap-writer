/**
 * Store Synchronizer - Dual-write system for store migration
 *
 * This module provides synchronization between the legacy stores (DocumentStore
 * and MultiDocumentStore) and the new UnifiedDocumentStore during the migration
 * period. It implements a dual-write system to ensure data consistency.
 */

import { useUnifiedDocumentStore } from './unifiedDocumentStore'
import { useDocumentStore } from './documentStore'
import { useMultiDocumentStore } from './multiDocumentStore'
import type { MindscribbleDocument } from '../types'

const MIGRATION_MODE = import.meta.env.DEV

function logMigrationOperation(operation: string, data: Record<string, unknown> = {}) {
  if (MIGRATION_MODE) {
    console.log(`[StoreSynchronizer] ${operation}`, data)
  }
}

export function useStoreSynchronizer() {
  const unifiedStore = useUnifiedDocumentStore()
  const documentStore = useDocumentStore()
  const multiDocumentStore = useMultiDocumentStore()

  // ============================================================
  // SYNCHRONIZATION METHODS
  // ============================================================

  /**
   * Synchronize from legacy stores to unified store
   */
  function syncFromLegacyStores() {
    // Sync active document
    const activeDoc = documentStore.toDocument()
    if (activeDoc.metadata.id) {
      unifiedStore.documents.set(activeDoc.metadata.id, activeDoc)
      unifiedStore.activeDocumentId = activeDoc.metadata.id
    }

    // Sync multi-document state
    const allDocs = multiDocumentStore.allDocuments
    for (const docInstance of allDocs) {
      unifiedStore.documents.set(docInstance.document.metadata.id, docInstance.document)
      unifiedStore.documentInstances.set(docInstance.filePanelId, {
        filePanelId: docInstance.filePanelId,
        document: docInstance.document,
        driveFile: docInstance.driveFile,
        childLayoutState: docInstance.childLayoutState,
        isDirty: docInstance.isDirty,
        lastModified: docInstance.lastModified
      })
    }

    logMigrationOperation('syncFromLegacyStores', {
      activeDocId: activeDoc.metadata.id,
      totalDocs: allDocs.length
    })
  }

  /**
   * Dual-write: Update both legacy and unified stores
   */
  function dualWriteDocumentUpdate(updates: Partial<MindscribbleDocument>) {
    if (!unifiedStore.activeDocumentId) return

    // Update unified store
    const doc = unifiedStore.documents.get(unifiedStore.activeDocumentId)
    if (doc) {
      Object.assign(doc, updates)
      unifiedStore.markDirty(unifiedStore.activeDocumentId)
    }

    // Update legacy document store
    const currentDoc = documentStore.toDocument()
    const updatedDoc = { ...currentDoc, ...updates }
    documentStore.fromDocument(updatedDoc, 'store')

    // Update legacy multi-document store
    const activeInstance = multiDocumentStore.activeDocument
    if (activeInstance) {
      multiDocumentStore.updateDocument(activeInstance.filePanelId, updatedDoc)
    }

    logMigrationOperation('dualWriteDocumentUpdate', { updates })
  }

  /**
   * Add a document to both stores (dual-write)
   */
  function dualWriteAddDocument(document: MindscribbleDocument) {
    // Add to unified store
    unifiedStore.addDocument(document)

    // Add to legacy document store if it's the active document
    if (unifiedStore.activeDocumentId === document.metadata.id) {
      documentStore.fromDocument(document, 'store')
    }

    // Add to legacy multi-document store
    const filePanelId = `file-${document.metadata.id}`
    multiDocumentStore.createDocument(filePanelId, document)

    logMigrationOperation('dualWriteAddDocument', {
      documentId: document.metadata.id,
      filePanelId
    })
  }

  /**
   * Remove a document from both stores (dual-write)
   */
  function dualWriteRemoveDocument(documentId: string) {
    // Remove from unified store
    unifiedStore.removeDocument(documentId)

    // Remove from legacy stores
    const instances = multiDocumentStore.allDocuments
    for (const instance of instances) {
      if (instance.document.metadata.id === documentId) {
        multiDocumentStore.removeDocument(instance.filePanelId)
        break
      }
    }

    logMigrationOperation('dualWriteRemoveDocument', { documentId })
  }

  // ============================================================
  // CONSISTENCY CHECKS
  // ============================================================

  function checkConsistency() {
    if (!MIGRATION_MODE) return

    // Check active document consistency
    const unifiedActive = unifiedStore.activeDocument
    const legacyActive = documentStore.toDocument()

    if (unifiedActive && legacyActive) {
      const nodesMatch = unifiedActive.nodes.length === legacyActive.nodes.length
      const edgesMatch = unifiedActive.edges.length === legacyActive.edges.length

      if (!nodesMatch || !edgesMatch) {
        console.warn('[Consistency Check] Document data mismatch:', {
          nodesMatch,
          edgesMatch,
          unifiedNodes: unifiedActive.nodes.length,
          legacyNodes: legacyActive.nodes.length
        })
      }
    }
  }

  return {
    syncFromLegacyStores,
    dualWriteDocumentUpdate,
    dualWriteAddDocument,
    dualWriteRemoveDocument,
    checkConsistency
  }
}
