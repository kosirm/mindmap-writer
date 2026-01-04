import { boot } from 'quasar/wrappers'
import { initializeSyncStrategy } from '../core/services/syncStrategy'
import { UIStateService } from '../core/services/uiStateService'
import * as fileSystemService from '../core/services/fileSystemService'
import { useUnifiedDocumentStore } from '../core/stores/unifiedDocumentStore'
import { useVaultStore } from '../core/stores/vaultStore'
import { db } from '../core/services/indexedDBService'

// Extend Window interface for debugging purposes
declare global {
  interface Window {
    __SYNC_STRATEGY__?: unknown
  }
}

/**
 * Migration: Fix missing fileId on existing files
 * This matches file system items to documents by name
 */
async function fixMissingFileIds() {
  console.log('🔧 [Boot] Checking for files with missing fileId...')

  try {
    // First, check what documents exist
    const allDocuments = await db.documents.toArray()
    console.log('🔧 [Boot] Documents in DB:', allDocuments.length)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const docInfo = allDocuments.map((d: any) => ({
      id: d.m?.i || d.metadata?.id || 'unknown',
      name: d.m?.n || d.metadata?.name || 'unknown'
    }))
    console.log('🔧 [Boot] Documents:', docInfo)

    // Get all file system items
    const allItems = await db.fileSystem.toArray()
    const files = allItems.filter(item => item.type === 'file')

    let fixedCount = 0

    for (const file of files) {
      if (!file.fileId) {
        console.log(`🔧 [Boot] Checking file: ${file.name} (${file.id})`)

        // Try to find document by file system item ID first
        let document = await db.documents.get(file.id)

        if (!document) {
          // Document ID doesn't match file system item ID
          // Try to find by name (case-insensitive)
          console.log(`🔧 [Boot] Document not found with ID ${file.id}, searching by name...`)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const matchingDoc = allDocuments.find((d: any) => {
            const docName = d.m?.n || d.metadata?.name
            return docName && docName.toLowerCase() === file.name.toLowerCase()
          })

          if (matchingDoc) {
            document = matchingDoc
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const docId = (matchingDoc as any).m?.i || (matchingDoc as any).metadata?.id
            console.log(`🔧 [Boot] Found matching document by name: ${docId}`)
          }
        }

        if (document) {
          // Get the document ID (could be in short or long format)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const documentId = (document as any).m?.i || (document as any).metadata?.id

          // Update the file system item with the correct fileId
          file.fileId = documentId
          await db.fileSystem.put(file)
          fixedCount++
          console.log(`🔧 [Boot] Fixed fileId for: ${file.name} -> ${documentId}`)
        } else {
          console.warn(`⚠️ [Boot] No document found for file: ${file.name} (${file.id})`)
        }
      }
    }

    if (fixedCount > 0) {
      console.log(`✅ [Boot] Fixed ${fixedCount} files with missing fileId`)
    } else {
      console.log('✅ [Boot] All files have valid fileId')
    }
  } catch (error) {
    console.error('❌ [Boot] Failed to fix missing fileIds:', error)
  }
}

export default boot(async ({ app }) => {
  // console.log('🔄 [Boot] Initializing sync strategy...')

  try {
    // Initialize sync strategy
    const syncStrategy = initializeSyncStrategy()

    // Log which strategy is being used
    const status = await syncStrategy.getStatus()
    console.log(`🔄 [Boot] Using sync strategy: ${status.strategy}`)

    // Initialize UIStateService
    const uiStateService = new UIStateService()

    // MIGRATION: Fix missing fileId on existing files
    await fixMissingFileIds()

    // IMPORTANT: Load vault structure BEFORE restoring UI state
    // This ensures files can be found when restoring
    const vaultStore = useVaultStore()
    console.log('🔄 [Boot] Loading vault structure...')
    await vaultStore.loadAllVaults()
    if (vaultStore.activeVault) {
      await vaultStore.loadVaultStructure()
      console.log('🔄 [Boot] Vault structure loaded:', vaultStore.vaultStructure.length, 'items')

      // Debug: Check fileId on all files
      const files = vaultStore.vaultStructure.filter(item => item.type === 'file')
      console.log('🔄 [Boot] Files in vault:', files.map(f => ({ id: f.id, name: f.name, fileId: f.fileId })))
    }

    // Restore UI state (open files and layouts)
    const documentStore = useUnifiedDocumentStore()
    await documentStore.restoreUIState()
    // console.log('🔄 [Boot] UI state restored')

    // Make services available globally
    app.config.globalProperties.$syncStrategy = syncStrategy
    app.config.globalProperties.$uiStateService = uiStateService
    app.config.globalProperties.$fileSystemService = fileSystemService
    app.config.globalProperties.$unifiedDocumentStore = documentStore

    // Expose to window for debugging
    if (import.meta.env.DEV) {
      window.__SYNC_STRATEGY__ = syncStrategy
    }

    // console.log('🔄 [Boot] Sync Strategy Service initialized successfully')
  } catch (error) {
    console.error('🔄 [Boot] Failed to initialize sync strategy:', error)
  }
})
