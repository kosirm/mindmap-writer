/**
 * IndexedDB Boot File
 * Initializes the IndexedDB database on app startup
 */

import { boot } from 'quasar/wrappers'
import { db } from '../core/services/indexedDBService'
import { useAppStore } from '../core/stores/appStore'
import { GoogleDriveInitializationService } from '../core/services/googleDriveInitialization'

/**
 * Initialize IndexedDB database
 */
export default boot(async () => {
  console.log('🗄️ [IndexedDB Boot] Initializing IndexedDB database...')

  try {
    // Open the database connection
    await db.open()
    console.log('🗄️ [IndexedDB Boot] Database opened successfully, version:', db.verno)

    // Debug: Check fileSystem table
    const fileSystemCount = await db.fileSystem.count()
    console.log('🗄️ [IndexedDB Boot] fileSystem table has', fileSystemCount, 'items')

    // Check if this is first-time use
    const vaultsIndex = await db.vaultsIndex.get('vaults')

    if (!vaultsIndex || vaultsIndex.vaults.length === 0) {
      console.log('🗄️ [IndexedDB Boot] First-time use, creating default vault...')

      // Create default vault
      const defaultVault = {
        id: 'default-vault',
        name: 'My Vault',
        description: 'Default vault created on first use',
        created: Date.now(),
        modified: Date.now(),
        isActive: true,
        folderId: '', // Will be set when synced to Google Drive
        repositoryFileId: '', // Will be set when synced to Google Drive
        fileCount: 0,
        folderCount: 0,
        size: 0
      }

      // Create vaults index
      const newVaultsIndex = {
        id: 'vaults',
        version: '1.0',
        lastUpdated: Date.now(),
        vaults: [defaultVault]
      }

      await db.vaultsIndex.add(newVaultsIndex)
      await db.vaultMetadata.add(defaultVault)

      console.log('✅ [IndexedDB Boot] Default vault created')

      // Initialize Google Drive (if authenticated)
      await GoogleDriveInitializationService.initializeFirstTime()
    } else {
      console.log('🗄️ [IndexedDB Boot] Existing vaults found:', vaultsIndex.vaults.length)
    }

    // Get the app store and set IndexedDB initialization status
    const appStore = useAppStore()
    appStore.setIndexedDBInitialized(true)

    console.log('🗄️ [IndexedDB Boot] IndexedDB initialization complete')

  } catch (error) {
    console.error('🗄️ [IndexedDB Boot] Failed to initialize IndexedDB:', error)

    // Get the app store and set initialization error
    const appStore = useAppStore()
    appStore.setIndexedDBInitialized(false)
    appStore.setIndexedDBError(error instanceof Error ? error.message : 'Unknown error')

    // Don't throw to avoid breaking the app - IndexedDB is optional for now
  }
})
