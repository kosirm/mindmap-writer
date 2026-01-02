import { boot } from 'quasar/wrappers'
import { initializeSyncStrategy } from '../core/services/syncStrategy'
import { UIStateService } from '../core/services/uiStateService'
import * as fileSystemService from '../core/services/fileSystemService'
import { useUnifiedDocumentStore } from '../core/stores/unifiedDocumentStore'

// Extend Window interface for debugging purposes
declare global {
  interface Window {
    __SYNC_STRATEGY__?: unknown
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
