/**
 * Sync Strategy Abstraction Layer
 *
 * Provides different sync implementations based on environment:
 * - Development: Direct async functions (no service worker)
 * - Production: Service worker with background sync
 */

// Extend ServiceWorkerRegistration to include sync property
interface ServiceWorkerRegistrationWithSync extends ServiceWorkerRegistration {
  sync?: SyncManager
}

interface SyncManager {
  register(tag: string): Promise<void>
  getTags(): Promise<string[]>
}

// NEW: Change tracker for Phase 5
export interface ChangeTracker {
  modifiedFiles: Set<string> // File IDs with content changes
  renamedItems: Map<string, string> // Item ID -> new name
  movedItems: Map<string, string | null> // Item ID -> new parent ID
  deletedItems: Set<string> // Item IDs that were deleted
}

export interface SyncResult {
  success: boolean
  syncedFiles: number
  errors: string[]
  timestamp: number
}

export interface SyncStrategy {
  initialize(): void | Promise<void>
  syncVault(vaultId: string): Promise<SyncResult>
  syncFile(vaultId: string, fileId: string): Promise<SyncResult>
  syncAll(): Promise<SyncResult>
  isAvailable(): boolean
  getStatus(): SyncStatus | Promise<SyncStatus>
}

export interface SyncStatus {
  isOnline: boolean
  isSyncing: boolean
  lastSyncTime: number | null
  pendingChanges: number
  strategy: 'service-worker' | 'direct' | 'polling'
}

// NEW: Global change tracker for Phase 5
let changeTracker: ChangeTracker = {
  modifiedFiles: new Set(),
  renamedItems: new Map(),
  movedItems: new Map(),
  deletedItems: new Set()
}

export function getChangeTracker(): ChangeTracker {
  return changeTracker
}

export function clearChangeTracker(): void {
  changeTracker = {
    modifiedFiles: new Set(),
    renamedItems: new Map(),
    movedItems: new Map(),
    deletedItems: new Set()
  }
}

/**
 * Factory function to get the appropriate sync strategy
 */
export function getSyncStrategy(): SyncStrategy {
  // Check if we're in development mode
  const isDevelopment = import.meta.env.DEV

  // Check if service worker is available
  const hasServiceWorker = 'serviceWorker' in navigator

  // Check if we're on HTTPS (required for service worker)
  const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost'

  // Decision logic
  if (!isDevelopment && hasServiceWorker && isSecure) {
    console.log('🔄 [Sync] Using Service Worker strategy')
    return new ServiceWorkerSyncStrategy()
  } else if (isDevelopment) {
    console.log('🔄 [Sync] Using Direct Async strategy (Development mode)')
    return new DirectAsyncSyncStrategy()
  } else {
    console.log('🔄 [Sync] Using Polling strategy (Fallback)')
    return new PollingSyncStrategy()
  }
}

/**
 * Direct Async Sync Strategy (for development)
 * Executes sync operations directly without service worker
 */
class DirectAsyncSyncStrategy implements SyncStrategy {
  private isSyncing = false
  private lastSyncTime: number | null = null
  private syncInterval: number | null = null

  initialize(): void {
    // console.log('🔄 [DirectSync] Initialized')

    // Start auto-sync every 5 minutes in development
    this.startAutoSync()
  }

  async syncVault(vaultId: string): Promise<SyncResult> {
    // console.log(`🔄 [DirectSync] Syncing vault: ${vaultId}`)

    if (this.isSyncing) {
      return {
        success: false,
        syncedFiles: 0,
        errors: ['Sync already in progress'],
        timestamp: Date.now()
      }
    }

    this.isSyncing = true

    try {
      // NEW: Implement partial sync using change tracker
      const changeTracker = getChangeTracker()
      const totalChanges = (
        changeTracker.modifiedFiles.size +
        changeTracker.renamedItems.size +
        changeTracker.movedItems.size +
        changeTracker.deletedItems.size
      )

      if (totalChanges === 0) {
        // console.log('🔄 [DirectSync] No changes to sync')
        return {
          success: true,
          syncedFiles: 0,
          errors: [],
          timestamp: Date.now()
        }
      }

      // console.log(`🔄 [DirectSync] Found ${totalChanges} changes to sync`)

      // Import sync service dynamically to avoid circular dependencies
      const { GoogleDriveSyncService } = await import('./googleDriveSyncService')

      const result = await GoogleDriveSyncService.syncVault(vaultId)

      // NEW: Clear change tracker after successful sync
      clearChangeTracker()

      this.lastSyncTime = Date.now()

      return {
        success: true,
        syncedFiles: result.syncedFiles || 0,
        errors: [],
        timestamp: this.lastSyncTime
      }
    } catch (error) {
      console.error('🔄 [DirectSync] Sync failed:', error)
      return {
        success: false,
        syncedFiles: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        timestamp: Date.now()
      }
    } finally {
      this.isSyncing = false
    }
  }

  async syncFile(vaultId: string, fileId: string): Promise<SyncResult> {
    // console.log(`🔄 [DirectSync] Syncing file: ${fileId} in vault: ${vaultId}`)

    try {
      const { GoogleDriveSyncService } = await import('./googleDriveSyncService')

      await GoogleDriveSyncService.syncFile(vaultId, fileId)

      return {
        success: true,
        syncedFiles: 1,
        errors: [],
        timestamp: Date.now()
      }
    } catch (error) {
      return {
        success: false,
        syncedFiles: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        timestamp: Date.now()
      }
    }
  }

  async syncAll(): Promise<SyncResult> {
    // console.log('🔄 [DirectSync] Syncing all vaults')

    try {
      const { GoogleDriveSyncService } = await import('./googleDriveSyncService')

      const result = await GoogleDriveSyncService.syncAllVaults()

      this.lastSyncTime = Date.now()

      return {
        success: true,
        syncedFiles: result.syncedFiles || 0,
        errors: [],
        timestamp: this.lastSyncTime
      }
    } catch (error) {
      return {
        success: false,
        syncedFiles: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        timestamp: Date.now()
      }
    }
  }

  isAvailable(): boolean {
    return true // Always available in development
  }

  getStatus(): SyncStatus {
    // NEW: Calculate pending changes from change tracker
    const changeTracker = getChangeTracker()
    const pendingChanges = (
      changeTracker.modifiedFiles.size +
      changeTracker.renamedItems.size +
      changeTracker.movedItems.size +
      changeTracker.deletedItems.size
    )

    return {
      isOnline: navigator.onLine,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      pendingChanges, // NEW: Real pending changes count
      strategy: 'direct'
    }
  }

  private startAutoSync(): void {
    // Auto-sync every 5 minutes
    this.syncInterval = window.setInterval(() => {
      if (!this.isSyncing && navigator.onLine) {
        void this.syncAll()
      }
    }, 5 * 60 * 1000)
  }

  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }
  }
}

/**
 * Service Worker Sync Strategy (for production)
 * Uses Background Sync API for reliable syncing
 */
class ServiceWorkerSyncStrategy implements SyncStrategy {
  private registration: ServiceWorkerRegistrationWithSync | null = null
  private lastSyncTime: number | null = null

  async initialize(): Promise<void> {
    console.log('🔄 [ServiceWorkerSync] Initializing')

    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported')
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register('/service-worker.js') as ServiceWorkerRegistrationWithSync
      console.log('🔄 [ServiceWorkerSync] Service worker registered')

      // Listen for sync events
      this.setupSyncListeners()
    } catch (error) {
      console.error('🔄 [ServiceWorkerSync] Registration failed:', error)
      throw error
    }
  }

  async syncVault(vaultId: string): Promise<SyncResult> {
    console.log(`🔄 [ServiceWorkerSync] Requesting sync for vault: ${vaultId}`)

    if (!this.registration || !this.registration.sync) {
      throw new Error('Background Sync not available')
    }

    try {
      // Register a sync event
      await this.registration.sync.register(`sync-vault-${vaultId}`)

      return {
        success: true,
        syncedFiles: 0, // Will be updated by service worker
        errors: [],
        timestamp: Date.now()
      }
    } catch (error) {
      console.error('🔄 [ServiceWorkerSync] Sync registration failed:', error)
      return {
        success: false,
        syncedFiles: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        timestamp: Date.now()
      }
    }
  }

  async syncFile(vaultId: string, fileId: string): Promise<SyncResult> {
    console.log(`🔄 [ServiceWorkerSync] Requesting sync for file: ${fileId}`)

    if (!this.registration || !this.registration.sync) {
      throw new Error('Background Sync not available')
    }

    try {
      await this.registration.sync.register(`sync-file-${vaultId}-${fileId}`)

      return {
        success: true,
        syncedFiles: 1,
        errors: [],
        timestamp: Date.now()
      }
    } catch (error) {
      return {
        success: false,
        syncedFiles: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        timestamp: Date.now()
      }
    }
  }

  async syncAll(): Promise<SyncResult> {
    console.log('🔄 [ServiceWorkerSync] Requesting sync for all vaults')

    if (!this.registration || !this.registration.sync) {
      throw new Error('Background Sync not available')
    }

    try {
      await this.registration.sync.register('sync-all-vaults')

      return {
        success: true,
        syncedFiles: 0,
        errors: [],
        timestamp: Date.now()
      }
    } catch (error) {
      return {
        success: false,
        syncedFiles: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        timestamp: Date.now()
      }
    }
  }

  isAvailable(): boolean {
    return !!(this.registration && this.registration.sync)
  }

  getStatus(): SyncStatus {
    return {
      isOnline: navigator.onLine,
      isSyncing: false, // TODO: Track from service worker messages
      lastSyncTime: this.lastSyncTime,
      pendingChanges: 0, // TODO: Get from service worker
      strategy: 'service-worker'
    }
  }

  private setupSyncListeners(): void {
    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'SYNC_COMPLETE') {
        console.log('🔄 [ServiceWorkerSync] Sync completed:', event.data)
        this.lastSyncTime = Date.now()
      }
    })
  }
}

/**
 * Polling Sync Strategy (fallback)
 * Uses periodic polling when service worker is not available
 */
class PollingSyncStrategy implements SyncStrategy {
  private isSyncing = false
  private lastSyncTime: number | null = null
  private pollInterval: number | null = null

  initialize(): void {
    console.log('🔄 [PollingSync] Initialized')

    // Start polling every 10 minutes
    this.startPolling()
  }

  async syncVault(vaultId: string): Promise<SyncResult> {
    console.log(`🔄 [PollingSync] Syncing vault: ${vaultId}`)

    if (this.isSyncing) {
      return {
        success: false,
        syncedFiles: 0,
        errors: ['Sync already in progress'],
        timestamp: Date.now()
      }
    }

    this.isSyncing = true

    try {
      const { GoogleDriveSyncService } = await import('./googleDriveSyncService')

      const result = await GoogleDriveSyncService.syncVault(vaultId)

      this.lastSyncTime = Date.now()

      return {
        success: true,
        syncedFiles: result.syncedFiles || 0,
        errors: [],
        timestamp: this.lastSyncTime
      }
    } catch (error) {
      return {
        success: false,
        syncedFiles: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        timestamp: Date.now()
      }
    } finally {
      this.isSyncing = false
    }
  }

  async syncFile(vaultId: string, fileId: string): Promise<SyncResult> {
    console.log(`🔄 [PollingSync] Syncing file: ${fileId}`)

    try {
      const { GoogleDriveSyncService } = await import('./googleDriveSyncService')

      await GoogleDriveSyncService.syncFile(vaultId, fileId)

      return {
        success: true,
        syncedFiles: 1,
        errors: [],
        timestamp: Date.now()
      }
    } catch (error) {
      return {
        success: false,
        syncedFiles: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        timestamp: Date.now()
      }
    }
  }

  async syncAll(): Promise<SyncResult> {
    console.log('🔄 [PollingSync] Syncing all vaults')

    try {
      const { GoogleDriveSyncService } = await import('./googleDriveSyncService')

      const result = await GoogleDriveSyncService.syncAllVaults()

      this.lastSyncTime = Date.now()

      return {
        success: true,
        syncedFiles: result.syncedFiles || 0,
        errors: [],
        timestamp: this.lastSyncTime
      }
    } catch (error) {
      return {
        success: false,
        syncedFiles: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        timestamp: Date.now()
      }
    }
  }

  isAvailable(): boolean {
    return true
  }

  getStatus(): SyncStatus {
    return {
      isOnline: navigator.onLine,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      pendingChanges: 0,
      strategy: 'polling'
    }
  }

  private startPolling(): void {
    // Poll every 10 minutes
    this.pollInterval = window.setInterval(() => {
      if (!this.isSyncing && navigator.onLine) {
        void this.syncAll()
      }
    }, 10 * 60 * 1000)
  }

  destroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
    }
  }
}

// Export singleton instance
let syncStrategyInstance: SyncStrategy | null = null

export function initializeSyncStrategy(): SyncStrategy {
  if (!syncStrategyInstance) {
    syncStrategyInstance = getSyncStrategy()
    void syncStrategyInstance.initialize()
  }
  return syncStrategyInstance
}

export function getSyncStrategyInstance(): SyncStrategy {
  if (!syncStrategyInstance) {
    throw new Error('Sync strategy not initialized. Call initializeSyncStrategy() first.')
  }
  return syncStrategyInstance
}

