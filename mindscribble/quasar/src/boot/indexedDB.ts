/**
 * IndexedDB Boot File
 * Initializes the IndexedDB database on app startup
 */

import { boot } from 'quasar/wrappers'
import { db } from '../core/services/indexedDBService'
import { useAppStore } from '../core/stores/appStore'

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

    // Check if this is a new installation or migration
    const centralIndex = await db.centralIndex.get('central')

    if (!centralIndex) {
      console.log('🗄️ [IndexedDB Boot] No central index found, creating default vault...')

      // Create default central index with initial vault
      const defaultCentralIndex = {
        id: 'central',
        version: '1.0',
        lastUpdated: Date.now(),
        vaults: {
          'default-vault': {
            id: 'default-vault',
            name: 'My Vault',
            description: 'Default vault created during initialization',
            created: Date.now(),
            modified: Date.now(),
            folderId: '',
            repositoryFileId: '',
            fileCount: 0,
            folderCount: 0,
            size: 0,
            isActive: true
          }
        }
      }

      // Store default central index
      await db.centralIndex.add(defaultCentralIndex)

      // Store default vault metadata
      await db.vaultMetadata.add(defaultCentralIndex.vaults['default-vault'])

      console.log('🗄️ [IndexedDB Boot] Default vault created successfully')
    } else {
      console.log('🗄️ [IndexedDB Boot] Existing central index found, using existing vaults')
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
