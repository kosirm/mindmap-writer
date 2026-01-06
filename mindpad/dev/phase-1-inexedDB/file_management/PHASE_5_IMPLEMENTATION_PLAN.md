# Phase 5 Implementation Plan: Partial Sync Strategy with UI State Persistence

## 🎯 Overview

This document outlines the detailed implementation plan for Phase 5, focusing on:
1. **UI State Persistence** - Save and restore open files and dockview layouts
2. **Change Tracking System** - Track file modifications, renames, moves, and deletions
3. **Partial Sync Implementation** - Sync only changed items to Google Drive
4. **Background Sync** - Automatic sync every 5 minutes

## 📋 Key Components

### 1. UI State Persistence

#### New IndexedDB Tables
- `uiState` - Stores open files and active file
- `fileLayouts` - Stores dockview layouts per file

#### UIStateService
- `saveOpenFiles(fileIds, activeFileId)` - Save currently open files
- `getOpenFiles()` - Retrieve files to open on app start
- `saveFileLayout(fileId, layout)` - Save dockview layout for a file
- `getFileLayout(fileId)` - Retrieve layout for a file
- `clearUIState()` - Clear UI state when switching vaults

### 2. Change Tracking System

#### ChangeTracker Interface
```typescript
interface ChangeTracker {
  modifiedFiles: Set<string>  // File IDs with content changes
  renamedItems: Map<string, string>  // Item ID -> new name
  movedItems: Map<string, string | null>  // Item ID -> new parent ID
  deletedItems: Set<string>  // Item IDs that were deleted
}
```

### 3. Sync Strategy

#### Strategy Selection
- **Development**: DirectAsyncStrategy (no HTTPS required)
- **Production with HTTPS**: ServiceWorkerStrategy
- **Fallback**: PollingStrategy

#### DirectAsyncStrategy Features
- Auto-sync every 5 minutes
- Partial sync only (changed items)
- Handles deletions, renames, moves, and content updates
- Updates .repository.json after sync
- Clears change tracker on success

## 🚀 Implementation Steps

### Step 1: Update IndexedDB Schema

**File**: `src/core/services/indexedDBService.ts`

```typescript
// Add to schema
export interface UIState {
  id: string // 'ui-state'
  openFiles: string[] // Array of file IDs that are open
  activeFileId: string | null // Currently active file
  lastUpdated: number
}

export interface FileLayout {
  fileId: string // Primary key
  layout: unknown // Dockview layout JSON
  lastUpdated: number
}

// Update MindPadDB class
class MindPadDB extends Dexie {
  // ... existing tables
  uiState!: Table<UIState, string>
  fileLayouts!: Table<FileLayout, string>

  constructor() {
    super('MindPadDB')

    // ... existing versions

    // Version 6 - Add UI state persistence
    this.version(6).stores({
      // ... existing stores
      uiState: 'id',
      fileLayouts: 'fileId'
    })
  }
}
```

### Step 2: Create UIStateService

**File**: `src/core/services/uiStateService.ts`

```typescript
import { db } from './indexedDBService'
import type { UIState, FileLayout } from './indexedDBService'

export class UIStateService {
  static async saveOpenFiles(fileIds: string[], activeFileId: string | null): Promise<void> {
    const uiState: UIState = {
      id: 'ui-state',
      openFiles: fileIds,
      activeFileId,
      lastUpdated: Date.now()
    }
    await db.uiState.put(uiState)
    console.log('💾 [UIState] Saved open files:', fileIds)
  }

  static async getOpenFiles(): Promise<{ fileIds: string[], activeFileId: string | null }> {
    const uiState = await db.uiState.get('ui-state')
    if (!uiState) {
      return { fileIds: [], activeFileId: null }
    }
    return { fileIds: uiState.openFiles, activeFileId: uiState.activeFileId }
  }

  static async saveFileLayout(fileId: string, layout: unknown): Promise<void> {
    const fileLayout: FileLayout = {
      fileId,
      layout,
      lastUpdated: Date.now()
    }
    await db.fileLayouts.put(fileLayout)
    console.log('💾 [UIState] Saved layout for file:', fileId)
  }

  static async getFileLayout(fileId: string): Promise<unknown | null> {
    const fileLayout = await db.fileLayouts.get(fileId)
    return fileLayout?.layout || null
  }

  static async clearUIState(): Promise<void> {
    await db.uiState.clear()
    await db.fileLayouts.clear()
    console.log('🗑️ [UIState] Cleared UI state')
  }
}
```

### Step 3: Create Sync Strategy Service

**File**: `src/core/services/syncStrategy.ts`

```typescript
import { DirectAsyncStrategy } from './strategies/DirectAsyncStrategy'
import { ServiceWorkerStrategy } from './strategies/ServiceWorkerStrategy'
import { PollingStrategy } from './strategies/PollingStrategy'
import type { SyncStrategy } from './strategies/types'

export interface SyncStatus {
  strategy: 'direct' | 'service-worker' | 'polling'
  isOnline: boolean
  isSyncing: boolean
  lastSyncTime: number | null
  pendingChanges: number
}

export interface SyncResult {
  success: boolean
  syncedFiles?: number
  syncedFolders?: number
  renamedItems?: number
  movedItems?: number
  errors?: string[]
}

export interface ChangeTracker {
  modifiedFiles: Set<string>
  renamedItems: Map<string, string>
  movedItems: Map<string, string | null>
  deletedItems: Set<string>
}

let syncStrategyInstance: SyncStrategy | null = null
let changeTracker: ChangeTracker = {
  modifiedFiles: new Set(),
  renamedItems: new Map(),
  movedItems: new Map(),
  deletedItems: new Set()
}

export function initializeSyncStrategy(): SyncStrategy {
  if (syncStrategyInstance) {
    return syncStrategyInstance
  }

  // Choose strategy based on environment
  if (import.meta.env.DEV) {
    console.log('🔄 [Sync] Using Direct Async strategy (Development mode)')
    syncStrategyInstance = new DirectAsyncStrategy()
  } else if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
    console.log('🔄 [Sync] Using Service Worker strategy (Production with HTTPS)')
    syncStrategyInstance = new ServiceWorkerStrategy()
  } else {
    console.log('🔄 [Sync] Using Polling strategy (Fallback)')
    syncStrategyInstance = new PollingStrategy()
  }

  return syncStrategyInstance
}

export function getSyncStrategyInstance(): SyncStrategy {
  if (!syncStrategyInstance) {
    throw new Error('Sync strategy not initialized. Call initializeSyncStrategy() first.')
  }
  return syncStrategyInstance
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
```

### Step 4: Create DirectAsyncStrategy

**File**: `src/core/services/strategies/DirectAsyncStrategy.ts`

```typescript
import type { SyncStrategy, SyncStatus, SyncResult } from './types'
import { db } from '../indexedDBService'
import { googleDriveService } from '../googleDriveService'
import { getChangeTracker, clearChangeTracker } from '../syncStrategy'

export class DirectAsyncStrategy implements SyncStrategy {
  private isSyncing = false
  private lastSyncTime: number | null = null
  private syncInterval: number | null = null

  constructor() {
    // Auto-sync every 5 minutes in development
    this.syncInterval = window.setInterval(() => {
      void this.syncAll()
    }, 5 * 60 * 1000) as unknown as number
  }

  async getStatus(): Promise<SyncStatus> {
    return {
      strategy: 'direct',
      isOnline: navigator.onLine,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      pendingChanges: await this.getPendingChangesCount()
    }
  }

  async syncVault(vaultId: string): Promise<SyncResult> {
    try {
      this.isSyncing = true
      console.log('🔄 [Sync] Starting partial sync for vault:', vaultId)

      // Get vault metadata
      const vault = await db.vaultMetadata.get(vaultId)
      if (!vault || !vault.folderId) {
        throw new Error('Vault not found or not initialized on Google Drive')
      }

      const changeTracker = getChangeTracker()
      const errors: string[] = []
      let syncedFiles = 0
      let renamedItems = 0
      let movedItems = 0

      // 1. Handle deleted items
      for (const itemId of changeTracker.deletedItems) {
        try {
          await googleDriveService.deleteFile(itemId)
          console.log('🗑️ [Sync] Deleted file on Drive:', itemId)
        } catch (error) {
          console.error(`Failed to delete file ${itemId}:`, error)
          errors.push(`Delete ${itemId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      // 2. Handle renamed items
      for (const [itemId, newName] of changeTracker.renamedItems) {
        try {
          const item = await db.fileSystem.get(itemId)
          if (item && item.driveFileId) {
            await googleDriveService.renameFile(item.driveFileId, newName)
            console.log('✏️ [Sync] Renamed file on Drive:', itemId, '->', newName)
            renamedItems++
          }
        } catch (error) {
          console.error(`Failed to rename file ${itemId}:`, error)
          errors.push(`Rename ${itemId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      // 3. Handle moved items
      for (const [itemId, newParentId] of changeTracker.movedItems) {
        try {
          const item = await db.fileSystem.get(itemId)
          if (item && item.driveFileId) {
            const newParent = newParentId ? await db.fileSystem.get(newParentId) : null
            const newParentDriveId = newParent?.driveFileId || vault.folderId
            await googleDriveService.moveFile(item.driveFileId, newParentDriveId)
            console.log('📁 [Sync] Moved file on Drive:', itemId, '->', newParentId)
            movedItems++
          }
        } catch (error) {
          console.error(`Failed to move file ${itemId}:`, error)
          errors.push(`Move ${itemId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      // 4. Handle modified files
      for (const fileId of changeTracker.modifiedFiles) {
        try {
          const item = await db.fileSystem.get(fileId)
          if (item && item.type === 'file' && item.fileId) {
            const document = await db.documents.get(item.fileId)
            if (document) {
              await googleDriveService.updateFileContent(item.driveFileId!, document)
              console.log('💾 [Sync] Updated file content on Drive:', fileId)
              syncedFiles++
            }
          }
        } catch (error) {
          console.error(`Failed to sync file ${fileId}:`, error)
          errors.push(`Sync ${fileId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      // 5. Update .repository.json file
      try {
        await this.updateRepositoryFile(vaultId, vault.folderId)
        console.log('📄 [Sync] Updated .repository.json')
      } catch (error) {
        console.error('Failed to update .repository.json:', error)
        errors.push('Failed to update .repository.json')
      }

      // Clear change tracker after successful sync
      clearChangeTracker()

      this.lastSyncTime = Date.now()

      return {
        success: errors.length === 0,
        syncedFiles,
        renamedItems,
        movedItems,
        errors: errors.length > 0 ? errors : undefined
      }

    } catch (error) {
      console.error('Direct sync failed:', error)
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    } finally {
      this.isSyncing = false
    }
  }

  async syncAll(): Promise<SyncResult> {
    try {
      this.isSyncing = true

      // Get active vault
      const vaultsIndex = await db.vaultsIndex.get('vaults')
      if (!vaultsIndex || vaultsIndex.vaults.length === 0) {
        return { success: false, errors: ['No vaults found'] }
      }

      // Find active vault
      const activeVault = vaultsIndex.vaults.find(v => v.isActive)
      if (!activeVault) {
        return { success: false, errors: ['No active vault'] }
      }

      // Sync only the active vault
      return await this.syncVault(activeVault.id)

    } catch (error) {
      console.error('Direct sync all failed:', error)
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    } finally {
      this.isSyncing = false
    }
  }

  private async updateRepositoryFile(vaultId: string, vaultFolderId: string): Promise<void> {
    // Implementation to update .repository.json with current vault structure
  }

  private async getPendingChangesCount(): Promise<number> {
    const changeTracker = getChangeTracker()
    return (
      changeTracker.modifiedFiles.size +
      changeTracker.renamedItems.size +
      changeTracker.movedItems.size +
      changeTracker.deletedItems.size
    )
  }

  cleanup() {
    if (this.syncInterval) {
      window.clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }
}
```

### Step 5: Update File System Service

**File**: `src/core/services/fileSystemService.ts`

Add change tracking to all operations:

```typescript
import { getChangeTracker } from './syncStrategy'

// Update createFile to track new files
export async function createFile(vaultId: string, parentId: string | null, name: string, content: MindpadDocument): Promise<FileSystemItem> {
  // ... existing code ...

  // Track as modified for sync
  const changeTracker = getChangeTracker()
  changeTracker.modifiedFiles.add(newFile.id)

  return newFile
}

// Update renameItem to track renames
export async function renameItem(itemId: string, newName: string): Promise<void> {
  // ... existing code ...

  // Track rename for sync
  const changeTracker = getChangeTracker()
  changeTracker.renamedItems.set(itemId, newName)
}

// Update moveItem to track moves
export async function moveItem(itemId: string, newParentId: string | null): Promise<void> {
  // ... existing code ...

  // Track move for sync
  const changeTracker = getChangeTracker()
  changeTracker.movedItems.set(itemId, newParentId)
}

// Update deleteItem to track deletions
export async function deleteItem(itemId: string): Promise<void> {
  // ... existing code ...

  // Track deletion for sync
  const changeTracker = getChangeTracker()
  changeTracker.deletedItems.add(itemId)
}

// Update updateFileContent to track content changes
export async function updateFileContent(fileId: string, content: MindpadDocument): Promise<void> {
  // ... existing code ...

  // Track as modified for sync
  const changeTracker = getChangeTracker()
  changeTracker.modifiedFiles.add(fileId)
}
```

### Step 6: Update Unified Document Store

**File**: `src/core/stores/unifiedDocumentStore.ts`

```typescript
import { UIStateService } from '../services/uiStateService'

// Add watcher to save open files when they change
watch(
  () => openDocuments.value.map(d => d.id),
  async (fileIds) => {
    await UIStateService.saveOpenFiles(fileIds, activeDocumentId.value)
  },
  { deep: true }
)

// Add function to save dockview layout
async function saveDockviewLayout(fileId: string, layout: unknown) {
  await UIStateService.saveFileLayout(fileId, layout)
}

// Add function to restore UI state on app start
async function restoreUIState() {
  const { fileIds, activeFileId } = await UIStateService.getOpenFiles()

  console.log('🔄 [UnifiedDocumentStore] Restoring UI state:', fileIds)

  // Load each file from IndexedDB
  for (const fileId of fileIds) {
    const item = await fileSystemService.getItem(fileId)
    if (item && item.type === 'file') {
      const document = await fileSystemService.getFileContent(item.fileId!)
      if (document) {
        // Load document into store
        await loadDocument(document, item.name)

        // Restore dockview layout
        const layout = await UIStateService.getFileLayout(fileId)
        if (layout) {
          // Apply layout to dockview
          applyDockviewLayout(fileId, layout)
        }
      }
    }
  }

  // Set active file
  if (activeFileId) {
    activeDocumentId.value = activeFileId
  }
}
```

### Step 7: Create Boot File

**File**: `src/boot/sync.ts`

```typescript
import { boot } from 'quasar/wrappers'
import { initializeSyncStrategy } from 'src/core/services/syncStrategy'
import { useUnifiedDocumentStore } from 'src/core/stores/unifiedDocumentStore'

export default boot(async () => {
  console.log('🔄 [Boot] Initializing sync strategy...')

  try {
    const syncStrategy = initializeSyncStrategy()

    // Log which strategy is being used
    const status = await syncStrategy.getStatus()
    console.log(`🔄 [Boot] Using sync strategy: ${status.strategy}`)

    // Restore UI state (open files and layouts)
    const documentStore = useUnifiedDocumentStore()
    await documentStore.restoreUIState()
    console.log('🔄 [Boot] UI state restored')

    // Expose to window for debugging
    if (import.meta.env.DEV) {
      window.__SYNC_STRATEGY__ = syncStrategy
    }

  } catch (error) {
    console.error('🔄 [Boot] Failed to initialize sync strategy:', error)
  }
})
```

### Step 8: Update quasar.config.ts

**File**: `quasar.config.ts`

```typescript
// Add sync to boot files
boot: [
  'indexedDB',
  'google-api',
  'sync', // Add this - must be after indexedDB
  // ... other boot files
]
```

## 🧪 Testing Plan

### UI State Persistence Tests
1. **Save and restore open files**
   - Open multiple files
   - Reload app
   - Verify same files are open

2. **Save and restore dockview layouts**
   - Arrange dockview layout for a file
   - Reload app
   - Verify layout is restored

3. **Clear UI state on vault switch**
   - Open files in vault 1
   - Switch to vault 2
   - Verify no files from vault 1 are open

### Change Tracking Tests
1. **Track file modifications**
   - Modify a file
   - Check change tracker contains file ID

2. **Track renames**
   - Rename a file
   - Check change tracker contains rename entry

3. **Track moves**
   - Move a file to different folder
   - Check change tracker contains move entry

4. **Track deletions**
   - Delete a file
   - Check change tracker contains deletion entry

### Partial Sync Tests
1. **Sync modified files**
   - Modify a file
   - Trigger sync
   - Verify file is synced to Google Drive

2. **Sync renamed files**
   - Rename a file
   - Trigger sync
   - Verify file is renamed on Google Drive

3. **Sync moved files**
   - Move a file
   - Trigger sync
   - Verify file is moved on Google Drive

4. **Sync deleted files**
   - Delete a file
   - Trigger sync
   - Verify file is deleted from Google Drive

5. **Background sync**
   - Make changes
   - Wait for auto-sync (5 minutes)
   - Verify changes are synced

## ✅ Success Criteria

- [ ] UI state is saved and restored correctly
- [ ] Change tracker captures all file operations
- [ ] Partial sync only syncs changed items
- [ ] Background sync works automatically
- [ ] .repository.json is updated after sync
- [ ] Change tracker is cleared after successful sync

## 📋 Files to Create/Modify

### New Files
- `src/core/services/uiStateService.ts`
- `src/core/services/syncStrategy.ts`
- `src/core/services/strategies/DirectAsyncStrategy.ts`
- `src/core/services/strategies/ServiceWorkerStrategy.ts`
- `src/core/services/strategies/PollingStrategy.ts`
- `src/core/services/strategies/types.ts`
- `src/boot/sync.ts`

### Modified Files
- `src/core/services/indexedDBService.ts` (add uiState and fileLayouts tables)
- `src/core/services/fileSystemService.ts` (add change tracking)
- `src/core/stores/unifiedDocumentStore.ts` (add UI state persistence)
- `quasar.config.ts` (add sync boot file)

## 🎯 Benefits

- ✅ **Efficient sync** - Only changed files are synced
- ✅ **UI persistence** - App reopens exactly as you left it
- ✅ **Background sync** - Automatic sync every 5 minutes
- ✅ **Change tracking** - All operations are tracked for sync
- ✅ **Dockview layouts** - Each file remembers its layout
- ✅ **Works in development** - No HTTPS required for DirectAsyncStrategy