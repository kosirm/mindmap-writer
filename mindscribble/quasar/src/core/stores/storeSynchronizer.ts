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
   * Dual-write: Add a document to both stores
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
   * Dual-write: Remove a document from both stores
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

  /**
   * Dual-write: Update document metadata in both stores
   */
  function dualWriteUpdateDocumentMetadata(documentId: string, metadataUpdates: Partial<MindscribbleDocument['metadata']>) {
    // Update unified store
    unifiedStore.updateDocumentMetadata(documentId, metadataUpdates)

    // Update legacy stores
    const instances = multiDocumentStore.allDocuments
    for (const instance of instances) {
      if (instance.document.metadata.id === documentId) {
        const updatedDoc = { ...instance.document, metadata: { ...instance.document.metadata, ...metadataUpdates } }
        multiDocumentStore.updateDocument(instance.filePanelId, updatedDoc)
        break
      }
    }

    // Update legacy document store if it's the active document
    if (unifiedStore.activeDocumentId === documentId) {
      const currentDoc = documentStore.toDocument()
      const updatedDoc = { ...currentDoc, metadata: { ...currentDoc.metadata, ...metadataUpdates } }
      documentStore.fromDocument(updatedDoc, 'store')
    }

    logMigrationOperation('dualWriteUpdateDocumentMetadata', { documentId, metadataUpdates })
  }

  /**
   * Dual-write: Update document layout settings in both stores
   */
  function dualWriteUpdateDocumentLayoutSettings(documentId: string, layoutUpdates: Partial<MindscribbleDocument['layout']>) {
    // Update unified store
    unifiedStore.updateDocumentLayoutSettings(documentId, layoutUpdates)

    // Update legacy stores
    const instances = multiDocumentStore.allDocuments
    for (const instance of instances) {
      if (instance.document.metadata.id === documentId) {
        const updatedDoc = { ...instance.document, layout: { ...instance.document.layout, ...layoutUpdates } }
        multiDocumentStore.updateDocument(instance.filePanelId, updatedDoc)
        break
      }
    }

    // Update legacy document store if it's the active document
    if (unifiedStore.activeDocumentId === documentId) {
      const currentDoc = documentStore.toDocument()
      const updatedDoc = { ...currentDoc, layout: { ...currentDoc.layout, ...layoutUpdates } }
      documentStore.fromDocument(updatedDoc, 'store')
    }

    logMigrationOperation('dualWriteUpdateDocumentLayoutSettings', { documentId, layoutUpdates })
  }

  // ============================================================
  // CONSISTENCY CHECKS
  // ============================================================

  function checkConsistency() {
    if (!MIGRATION_MODE) return

    console.log('[StoreSynchronizer] Running comprehensive consistency check...')

    // Check active document consistency
    const unifiedActive = unifiedStore.activeDocument
    const legacyActive = documentStore.toDocument()

    if (unifiedActive && legacyActive) {
      const nodesMatch = unifiedActive.nodes.length === legacyActive.nodes.length
      const edgesMatch = unifiedActive.edges.length === legacyActive.edges.length
      const metadataMatch = unifiedActive.metadata.id === legacyActive.metadata.id
      const nameMatch = unifiedActive.metadata.name === legacyActive.metadata.name

      if (!nodesMatch || !edgesMatch || !metadataMatch || !nameMatch) {
        console.warn('[Consistency Check] Document data mismatch:', {
          nodesMatch,
          edgesMatch,
          metadataMatch,
          nameMatch,
          unifiedNodes: unifiedActive.nodes.length,
          legacyNodes: legacyActive.nodes.length,
          unifiedId: unifiedActive.metadata.id,
          legacyId: legacyActive.metadata.id
        })
      } else {
        console.log('[Consistency Check] ✅ Active document data consistent')
      }
    }

    // Check multi-document consistency
    const unifiedDocs = unifiedStore.allDocuments
    const multiDocs = multiDocumentStore.allDocuments

    if (unifiedDocs.length !== multiDocs.length) {
      console.warn('[Consistency Check] Document count mismatch:', {
        unifiedCount: unifiedDocs.length,
        multiCount: multiDocs.length
      })
    } else {
      console.log('[Consistency Check] ✅ Document counts match')
    }

    // Check that all multi-docs exist in unified store
    for (const multiDoc of multiDocs) {
      const existsInUnified = unifiedDocs.some(doc => doc.metadata.id === multiDoc.document.metadata.id)
      if (!existsInUnified) {
        console.warn('[Consistency Check] Multi-doc not found in unified store:', {
          docId: multiDoc.document.metadata.id,
          docName: multiDoc.document.metadata.name
        })
      }
    }

    // Check dirty state consistency
    const unifiedDirtyCount = unifiedStore.dirtyDocuments.size
    const multiDirtyCount = multiDocs.filter(doc => doc.isDirty).length

    if (unifiedDirtyCount !== multiDirtyCount) {
      console.warn('[Consistency Check] Dirty state mismatch:', {
        unifiedDirtyCount,
        multiDirtyCount
      })
    } else {
      console.log('[Consistency Check] ✅ Dirty state consistent')
    }

    console.log('[StoreSynchronizer] Consistency check completed')
  }

  return {
    syncFromLegacyStores,
    dualWriteDocumentUpdate,
    dualWriteAddDocument,
    dualWriteRemoveDocument,
    dualWriteUpdateDocumentMetadata,
    dualWriteUpdateDocumentLayoutSettings,
    checkConsistency
  }
}
