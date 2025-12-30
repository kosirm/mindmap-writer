# Revised Implementation Plan - Incorporating User Feedback

## 🎯 Overview

This document incorporates the excellent suggestions from the user and integrates the new sync strategy approach. The plan has been revised to address the specific issues identified and prioritize critical data integrity problems.

## 🔍 Key Changes Based on Feedback

### 1. **Revised Priority Order** (Most Important Change)
```
OLD: Phases 1-4 (UI) → Phases 5-7 (Infrastructure) → Phase 8 (Testing)
NEW: Phase 3 (Renaming - Critical) → Phase 4 (File Opening - Critical) → Phases 1-2 (UI) → Phase 7 (Active Vault) → Phases 5-6 (Sync) → Phase 8 (Testing)
```

### 2. **Simplified Tree Structure Approach**
- **OLD**: Vault as root tree element (complex, requires schema changes)
- **NEW**: Vault as header/title above tree (simpler, cleaner separation of concerns)

### 3. **Sync Strategy Integration**
- **OLD**: PWA with service worker (requires HTTPS, complex debugging)
- **NEW**: Environment-aware sync strategy with Direct Async for development

### 4. **Added Critical Components**
- OAuth token management
- Error boundaries
- Logging service
- Comprehensive testing

## 🚀 Revised Implementation Plan

### Phase 3: Fix Renaming Issues (CRITICAL - Start Here!)

**Objective**: Fix the data integrity issue where multiple files/folders are renamed when only one should be.

**Root Cause Analysis**:
- Event propagation issues
- Missing rename guards
- Shared state problems

**Implementation**:

#### 1. Fix VaultTreeItem.vue

```typescript
// Add to VaultTreeItem.vue
const isRenaming = ref(false)

async function renameItem(itemId: string, newName: string) {
  console.log('🔍 Renaming item:', itemId, 'to:', newName)
  
  // Guard against duplicate renames
  if (isRenaming.value) {
    console.warn('⚠️ Rename already in progress')
    return
  }
  
  isRenaming.value = true
  
  try {
    // Validate new name
    if (!newName || newName.trim() === '') {
      throw new Error('Item name cannot be empty')
    }
    
    // Check for duplicates
    const parentId = props.item.parentId
    const exists = await fileSystemService.checkItemExists(parentId, newName)
    if (exists && newName !== props.item.name) {
      $q.notify({
        type: 'warning',
        message: `An item named "${newName}" already exists in this location`,
        timeout: 3000
      })
      return
    }
    
    // Perform rename
    await fileSystemService.renameExistingItem(itemId, newName)
    
    // Update local state
    props.item.name = newName
    props.item.modified = Date.now()
    
    // Refresh tree
    vaultEmitter?.emit('refresh-tree', {})
    
  } catch (error) {
    console.error('Failed to rename item:', error)
    $q.notify({
      type: 'error',
      message: error instanceof Error ? error.message : 'Failed to rename item',
      timeout: 3000
    })
  } finally {
    isRenaming.value = false
  }
}
```

#### 2. Update useFileSystem.ts

```typescript
async function renameExistingItem(itemId: string, newName: string) {
  try {
    isLoading.value = true
    error.value = null
    
    // Get current item
    const currentItem = vaultStructure.value.find(item => item.id === itemId)
    if (!currentItem) {
      throw new Error('Item not found')
    }
    
    // Validate
    if (!newName || newName.trim() === '') {
      throw new Error('Item name cannot be empty')
    }
    
    // Check duplicates
    const parentId = currentItem.parentId
    const exists = await itemExists(parentId, newName)
    if (exists && newName !== currentItem.name) {
      throw new Error(`An item named "${newName}" already exists in this location`)
    }
    
    // Perform rename
    const updatedItem = await renameItem(itemId, newName)
    
    // Update local state
    const index = vaultStructure.value.findIndex(item => item.id === itemId)
    if (index !== -1) {
      vaultStructure.value[index] = updatedItem
    }
    
    return updatedItem
    
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to rename item'
    $q.notify({
      type: 'negative',
      message: error.value,
      timeout: 3000
    })
    throw err
  } finally {
    isLoading.value = false
  }
}
```

**Files to Modify**:
- `src/features/vault/components/VaultTreeItem.vue`
- `src/composables/useFileSystem.ts`

**Testing**:
- Rename single file ✅
- Rename single folder ✅
- Try duplicate names ❌ (should fail)
- Try empty names ❌ (should fail)
- Multiple rapid renames ✅ (should queue properly)

### Phase 4: Implement File Opening (CRITICAL)

**Objective**: Enable opening files from vault management with proper name preservation.

**Implementation**:

#### 1. Update VaultTreeItem.vue

```typescript
async function openFileFromVault(fileItem: FileSystemItem) {
  try {
    // Get document from IndexedDB
    const document = await fileSystemService.getFileContentFromItem(fileItem.id)
    
    if (!document) {
      throw new Error('File not found')
    }
    
    // Load into unified document store
    const documentStore = useUnifiedDocumentStore()
    await documentStore.loadDocument(document)
    
    // Update document name
    documentStore.setDocumentName(fileItem.name)
    
    // Update document metadata with vault info
    if (document.metadata) {
      document.metadata.vaultId = fileItem.vaultId
      document.metadata.fileId = fileItem.id
    }
    
    $q.notify({
      type: 'positive',
      message: `Opened "${fileItem.name}"`,
      timeout: 2000
    })
    
  } catch (error) {
    console.error('Failed to open file:', error)
    $q.notify({
      type: 'error',
      message: error instanceof Error ? error.message : 'Failed to open file',
      timeout: 3000
    })
  }
}

function openItem(item: FileSystemItem) {
  if (item.type === 'file') {
    void openFileFromVault(item)
  } else if (item.type === 'folder') {
    toggleFolder()
  }
}
```

#### 2. Update unifiedDocumentStore.ts

```typescript
async function loadDocument(document: MindscribbleDocument, fileName?: string) {
  try {
    // Set document name from file if provided
    if (fileName && document.metadata) {
      document.metadata.name = fileName
    }
    
    // Load document into store
    this.currentDocument = document
    this.documentName = document.metadata?.name || 'Untitled'
    this.isLoading = false
    
    // Emit event
    eventBus.emit('document:loaded', { document, name: this.documentName })
    
  } catch (error) {
    console.error('Failed to load document:', error)
    throw new Error('Failed to load document')
  }
}

function setDocumentName(name: string) {
  this.documentName = name
  if (this.currentDocument?.metadata) {
    this.currentDocument.metadata.name = name
  }
  eventBus.emit('document:name-changed', { name })
}
```

**Files to Modify**:
- `src/features/vault/components/VaultTreeItem.vue`
- `src/core/stores/unifiedDocumentStore.ts`

**Testing**:
- Create file in vault
- Click to open ✅
- Verify name is preserved ✅
- Verify content loads correctly ✅
- Verify metadata includes vault info ✅

### Phase 1: Fix Tree Structure (Revised Approach)

**Objective**: Create proper hierarchical tree structure with vault as header, not tree item.

**Implementation**:

#### 1. Update VaultTree.vue

```vue
<template>
  <div class="vault-tree">
    <!-- Vault Header (NEW) -->
    <div class="vault-header" v-if="activeVault">
      <q-icon name="storage" size="20px" color="teal-6" />
      <span class="vault-name">{{ activeVault.name }}</span>
      <q-btn 
        flat dense round 
        icon="edit" 
        @click="renameActiveVault"
        class="rename-btn"
      />
    </div>
    
    <!-- Tree -->
    <div class="vault-tree-container">
      <Draggable
        v-if="treeData.length > 0"
        ref="treeRef"
        v-model="treeData"
        class="vault-tree-content"
        :indent="16"
        :triggerClass="TRIGGER_CLASS"
        :rootDroppable="true"
        treeLine
        @change="onTreeChange"
        @drop="validateDrop"
      >
        <!-- ... rest of template -->
      </Draggable>
    </div>
  </div>
</template>
```

```typescript
// Update buildTreeFromVault - NO synthetic vault item
async function buildTreeFromVault() {
  try {
    await vaultService.loadVaults()
    const activeVault = vaultService.activeVault.value
    
    if (!activeVault) {
      treeData.value = []
      return
    }
    
    await fileSystemService.loadStructure(activeVault.id)
    const vaultStructure = fileSystemService.vaultStructure.value
    
    // Find root items (items with null parentId)
    const rootItems = vaultStructure.filter(item => item.parentId === null)
    
    // Build tree items (NO vault root item)
    treeData.value = buildTreeItems(rootItems)
    
  } catch (error) {
    console.error('Failed to build vault tree:', error)
    treeData.value = []
  }
}

// Add vault renaming
async function renameActiveVault() {
  const activeVault = vaultService.activeVault.value
  if (!activeVault) return
  
  const newName = prompt('Rename vault:', activeVault.name)
  if (!newName || newName === activeVault.name) return
  
  try {
    await vaultService.renameExistingVault(activeVault.id, newName)
    $q.notify({
      type: 'positive',
      message: 'Vault renamed successfully',
      timeout: 2000
    })
  } catch (error) {
    console.error('Failed to rename vault:', error)
    $q.notify({
      type: 'error',
      message: 'Failed to rename vault',
      timeout: 3000
    })
  }
}
```

#### 2. Update CSS

```css
.vault-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--ms-border);
  background-color: var(--ms-surface);
  font-weight: 600;
  color: var(--ms-text-primary);
}

.vault-name {
  flex: 1;
  font-size: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rename-btn {
  opacity: 0.7;
  transition: opacity 0.2s;
}

.rename-btn:hover {
  opacity: 1;
}
```

**Files to Modify**:
- `src/features/vault/components/VaultTree.vue`
- `src/features/vault/components/VaultTree.vue` (styles)

**Benefits**:
- ✅ Cleaner separation of concerns
- ✅ No schema changes needed
- ✅ Easier to implement and maintain
- ✅ Vault name is still visible and renameable

### Phase 2: Fix Drag-and-Drop (With Proper Validation)

**Objective**: Enable proper drag-and-drop with validation and visual feedback.

**Implementation**:

#### 1. Update VaultTree.vue

```typescript
// Fix validation logic
function validateDrop(dropInfo: { targetId: string; sourceId: string; dropPosition: string }) {
  const { targetId, sourceId, dropPosition } = dropInfo
  
  const findItem = (items: VaultTreeItem[]): VaultTreeItem | null => {
    for (const item of items) {
      if (item.id === targetId || item.id === sourceId) return item
      const found = findItem(item.children)
      if (found) return found
    }
    return null
  }
  
  const targetItem = findItem(treeData.value)
  const sourceItem = findItem(treeData.value)
  
  if (!targetItem || !sourceItem) return false
  
  // Rule 1: Cannot drop files into other files
  if (targetItem.type === 'file' && dropPosition === 'inside') {
    $q.notify({
      type: 'warning',
      message: 'Cannot drop files into other files',
      timeout: 2000
    })
    return false
  }
  
  // Rule 2: Check circular references for folders
  if (sourceItem.type === 'folder' && targetItem && targetItem.type === 'folder') {
    if (isCircularReference(sourceItem.id, targetItem.id)) {
      $q.notify({
        type: 'warning',
        message: 'Cannot create circular folder references',
        timeout: 2000
      })
      return false
    }
  }
  
  return true
}

// Add circular reference detection
function isCircularReference(sourceId: string, targetId: string): boolean {
  const findItem = (items: VaultTreeItem[]): VaultTreeItem | null => {
    for (const item of items) {
      if (item.id === targetId) return item
      const found = findItem(item.children)
      if (found) return found
    }
    return null
  }
  
  const targetItem = findItem(treeData.value)
  if (!targetItem) return false
  
  // Check if target is already a child of source (directly or indirectly)
  const checkChildren = (item: VaultTreeItem): boolean => {
    if (item.id === sourceId) return true
    for (const child of item.children) {
      if (checkChildren(child)) return true
    }
    return false
  }
  
  return checkChildren(targetItem)
}

// Update onTreeChange to handle valid drops
async function onTreeChange() {
  // Extract hierarchy from current tree structure
  const extractHierarchy = (
    items: VaultTreeItem[],
    parentId: string | null = null
  ): Array<{ itemId: string; parentId: string | null; order: number }> => {
    const result: Array<{ itemId: string; parentId: string | null; order: number }> = []
    
    items.forEach((item, index) => {
      result.push({ itemId: item.id, parentId, order: index })
      
      if (item.children.length > 0) {
        const childData = extractHierarchy(item.children, item.id)
        result.push(...childData)
      }
    })
    
    return result
  }
  
  const newHierarchy = extractHierarchy(treeData.value)
  
  // Apply changes to file system
  for (const { itemId, parentId } of newHierarchy) {
    try {
      await fileSystemService.moveExistingItem(itemId, parentId)
    } catch (error) {
      console.error(`Failed to move item ${itemId}:`, error)
      // Rebuild tree to revert changes
      await buildTreeFromVault()
      break
    }
  }
}
```

#### 2. Add Visual Feedback

```css
/* Add to VaultTree.vue styles */
:deep(.he-tree-drag-placeholder) {
  background-color: rgba(25, 118, 210, 0.1);
  border: 2px dashed rgba(25, 118, 210, 0.4);
  border-radius: 4px;
  min-height: 32px;
}

:deep(.he-tree-drag-over) {
  background-color: rgba(25, 118, 210, 0.05);
}

:deep(.he-tree-drag-invalid) {
  background-color: rgba(244, 67, 54, 0.05);
  border-color: rgba(244, 67, 54, 0.2);
}
```

**Files to Modify**:
- `src/features/vault/components/VaultTree.vue`

**Testing**:
- Drag file into folder ✅
- Drag folder into folder ✅
- Try to drag file into file ❌ (should fail)
- Try to create circular reference ❌ (should fail)
- Visual feedback for valid/invalid drops ✅

### Phase 7: Active Vault Management

**Objective**: Implement proper active vault concept with UI indication.

**Implementation**:

#### 1. Update Vault Service

```typescript
export async function setActiveVault(vaultId: string): Promise<void> {
  try {
    // Get current central index
    const centralIndex = await db.centralIndex.get('central')
    
    if (!centralIndex || !centralIndex.vaults[vaultId]) {
      throw new Error(`Vault ${vaultId} not found`)
    }
    
    // Deactivate ALL vaults first (ensure only one is active)
    Object.values(centralIndex.vaults).forEach(vault => {
      vault.isActive = false
    })
    
    // Activate the selected vault
    centralIndex.vaults[vaultId].isActive = true
    centralIndex.vaults[vaultId].modified = Date.now()
    centralIndex.lastUpdated = Date.now()
    
    // Update central index
    await db.centralIndex.put(centralIndex)
    
    // Update vault metadata
    await db.vaultMetadata.put(centralIndex.vaults[vaultId])
    
    // Emit event for UI updates
    eventBus.emit('vault:activated', { vaultId })
    
  } catch (error) {
    console.error(`Failed to set active vault ${vaultId}:`, error)
    throw new Error(`Failed to set active vault ${vaultId}`)
  }
}
```

#### 2. Update VaultTree.vue

```vue
<!-- Add active vault indication to header -->
<div class="vault-header" v-if="activeVault" :class="{ 'is-active': true }">
  <q-icon name="storage" size="20px" color="teal-6" />
  <span class="vault-name">{{ activeVault.name }}</span>
  <q-badge color="positive" label="Active" class="active-badge" />
  <q-btn 
    flat dense round 
    icon="edit" 
    @click="renameActiveVault"
    class="rename-btn"
  />
</div>
```

```css
.vault-header.is-active {
  border-left: 3px solid var(--q-primary);
  background-color: rgba(25, 118, 210, 0.05);
}

.active-badge {
  margin-left: 8px;
  font-size: 11px;
  padding: 2px 6px;
}
```

**Files to Modify**:
- `src/core/services/vaultService.ts`
- `src/features/vault/components/VaultTree.vue`

**Testing**:
- Create multiple vaults
- Switch between vaults ✅
- Verify only one is active ✅
- Verify UI indication ✅

### Phase 5: Sync Strategy Integration (Replaces PWA Approach)

**Objective**: Implement environment-aware sync strategy using the provided sync strategy guide.

**Implementation**:

#### 1. Create Sync Strategy Service

```typescript
// src/core/services/syncStrategy.ts
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
  errors?: string[]
}

let syncStrategyInstance: SyncStrategy | null = null

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
```

#### 2. Create Direct Async Strategy (For Development)

```typescript
// src/core/services/strategies/DirectAsyncStrategy.ts
import type { SyncStrategy, SyncStatus, SyncResult } from './types'
import { db } from '../indexedDBService'
import { googleDriveService } from '../googleDriveService'

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
      
      // Get vault structure from IndexedDB
      const fileSystemItems = await db.fileSystem.where('vaultId').equals(vaultId).toArray()
      
      // Get vault metadata
      const vault = await db.vaultMetadata.get(vaultId)
      if (!vault || !vault.folderId) {
        throw new Error('Vault not found or not initialized on Google Drive')
      }
      
      // Sync each file
      const syncedFiles: string[] = []
      const errors: string[] = []
      
      for (const item of fileSystemItems) {
        if (item.type === 'file' && item.fileId) {
          try {
            // Get document content
            const document = await db.documents.get(item.fileId)
            if (document) {
              // Sync to Google Drive
              await googleDriveService.syncFile(vault.folderId, item.fileId, document)
              syncedFiles.push(item.id)
            }
          } catch (error) {
            console.error(`Failed to sync file ${item.id}:`, error)
            errors.push(`File ${item.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }
      }
      
      this.lastSyncTime = Date.now()
      
      return {
        success: errors.length === 0,
        syncedFiles: syncedFiles.length,
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
      
      // Get all vaults
      const centralIndex = await db.centralIndex.get('central')
      if (!centralIndex) {
        return { success: false, errors: ['No vaults found'] }
      }
      
      const results: SyncResult[] = []
      
      for (const vault of Object.values(centralIndex.vaults)) {
        const result = await this.syncVault(vault.id)
        results.push(result)
      }
      
      // Combine results
      const allErrors = results.flatMap(r => r.errors || [])
      const totalSyncedFiles = results.reduce((sum, r) => sum + (r.syncedFiles || 0), 0)
      
      this.lastSyncTime = Date.now()
      
      return {
        success: allErrors.length === 0,
        syncedFiles: totalSyncedFiles,
        errors: allErrors.length > 0 ? allErrors : undefined
      }
      
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
  
  private async getPendingChangesCount(): Promise<number> {
    // Count files modified since last sync
    const lastSync = this.lastSyncTime
    if (!lastSync) return 0
    
    return await db.fileSystem
      .where('modified')
      .above(lastSync)
      .count()
  }
  
  cleanup() {
    if (this.syncInterval) {
      window.clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }
}
```

#### 3. Create Boot File

```typescript
// src/boot/sync.ts
import { boot } from 'quasar/wrappers'
import { initializeSyncStrategy } from 'src/core/services/syncStrategy'

export default boot(async () => {
  console.log('🔄 [Boot] Initializing sync strategy...')
  
  try {
    const syncStrategy = initializeSyncStrategy()
    
    // Log which strategy is being used
    const status = await syncStrategy.getStatus()
    console.log(`🔄 [Boot] Using sync strategy: ${status.strategy}`)
    
    // Expose to window for debugging
    if (import.meta.env.DEV) {
      window.__SYNC_STRATEGY__ = syncStrategy
    }
    
  } catch (error) {
    console.error('🔄 [Boot] Failed to initialize sync strategy:', error)
  }
})
```

#### 4. Update quasar.config.ts

```typescript
// Add sync to boot files
boot: [
  'indexedDB',
  'google-api',
  'sync', // Add this
  // ... other boot files
]
```

**Files to Create/Modify**:
- `src/core/services/syncStrategy.ts` (new)
- `src/core/services/strategies/DirectAsyncStrategy.ts` (new)
- `src/core/services/strategies/ServiceWorkerStrategy.ts` (new)
- `src/core/services/strategies/PollingStrategy.ts` (new)
- `src/core/services/strategies/types.ts` (new)
- `src/boot/sync.ts` (new)
- `quasar.config.ts` (update)

**Benefits**:
- ✅ Works in development without HTTPS
- ✅ Automatic strategy selection based on environment
- ✅ Easy debugging with Direct Async strategy
- ✅ Future-proof for production deployment

### Phase 6: Google Drive Initialization with OAuth

**Objective**: Initialize vault structure on Google Drive with proper OAuth token management.

**Implementation**:

#### 1. Create Google Auth Service

```typescript
// src/core/services/googleAuthService.ts
export class GoogleAuthService {
  private static tokenRefreshTimer: number | null = null
  private static isRefreshing = false
  
  static async refreshTokenIfNeeded(): Promise<void> {
    if (this.isRefreshing) return
    
    try {
      this.isRefreshing = true
      
      const token = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse()
      const expiresIn = token.expires_in
      
      // Refresh 5 minutes before expiry
      if (expiresIn < 300) {
        console.log('🔑 [GoogleAuth] Refreshing token...')
        await gapi.auth2.getAuthInstance().currentUser.get().reloadAuthResponse()
        console.log('🔑 [GoogleAuth] Token refreshed successfully')
      }
      
    } catch (error) {
      console.error('🔑 [GoogleAuth] Failed to refresh token:', error)
      throw new Error('Failed to refresh Google OAuth token')
    } finally {
      this.isRefreshing = false
    }
  }
  
  static startTokenRefreshTimer(): void {
    // Stop existing timer
    if (this.tokenRefreshTimer) {
      window.clearInterval(this.tokenRefreshTimer)
    }
    
    // Refresh every 50 minutes
    this.tokenRefreshTimer = window.setInterval(() => {
      void this.refreshTokenIfNeeded()
    }, 50 * 60 * 1000) as unknown as number
    
    console.log('🔑 [GoogleAuth] Started token refresh timer')
  }
  
  static stopTokenRefreshTimer(): void {
    if (this.tokenRefreshTimer) {
      window.clearInterval(this.tokenRefreshTimer)
      this.tokenRefreshTimer = null
    }
  }
  
  static async ensureAuthenticated(): Promise<boolean> {
    try {
      // Check if already authenticated
      const isSignedIn = gapi.auth2.getAuthInstance().isSignedIn.get()
      if (isSignedIn) {
        await this.refreshTokenIfNeeded()
        return true
      }
      
      return false
      
    } catch (error) {
      console.error('🔑 [GoogleAuth] Authentication check failed:', error)
      return false
    }
  }
}
```

#### 2. Update Google Drive Initialization Service

```typescript
// src/core/services/googleDriveInitialization.ts
export class GoogleDriveInitializationService {
  
  static async initialize(): Promise<void> {
    try {
      console.log('🗄️ [GoogleDriveInit] Starting Google Drive initialization...')
      
      // Ensure authentication
      const isAuthenticated = await GoogleAuthService.ensureAuthenticated()
      if (!isAuthenticated) {
        console.log('🗄️ [GoogleDriveInit] User not authenticated, skipping initialization')
        return
      }
      
      // Start token refresh timer
      GoogleAuthService.startTokenRefreshTimer()
      
      // Create Mindscribble folder if it doesn't exist
      const mindscribbleFolder = await this.createMindscribbleFolder()
      
      // Get all vaults from IndexedDB
      const centralIndex = await db.centralIndex.get('central')
      if (!centralIndex) {
        console.log('🗄️ [GoogleDriveInit] No vaults found in IndexedDB')
        return
      }
      
      // Initialize each vault on Google Drive
      for (const vault of Object.values(centralIndex.vaults)) {
        await this.initializeVaultOnGoogleDrive(vault, mindscribbleFolder.id)
      }
      
      console.log('🗄️ [GoogleDriveInit] Google Drive initialization complete')
      
    } catch (error) {
      console.error('🗄️ [GoogleDriveInit] Failed to initialize Google Drive:', error)
      throw new Error('Google Drive initialization failed')
    }
  }
  
  // ... rest of the implementation
}
```

**Files to Create/Modify**:
- `src/core/services/googleAuthService.ts` (new)
- `src/core/services/googleDriveInitialization.ts` (update)

**Testing**:
- Google Drive folder creation ✅
- Vault initialization ✅
- .repository.json creation ✅
- OAuth token refresh ✅

### Phase 8: Integration and Testing

**Objective**: Ensure all components work together properly with comprehensive testing.

**Implementation**:

#### 1. Create Comprehensive Tests

```typescript
// test-vault-management.ts
describe('Vault Management', () => {
  beforeAll(async () => {
    // Clean up before tests
    await db.delete()
    await db.open()
  })
  
  describe('IndexedDB Initialization', () => {
    it('should appear in Chrome DevTools', async () => {
      // Open IndexedDB
      await db.open()
      
      // Check if database exists
      const databases = await indexedDB.databases()
      const mindscribbleDB = databases.find(db => db.name === 'MindScribbleDB')
      
      expect(mindscribbleDB).toBeDefined()
      expect(mindscribbleDB?.version).toBeGreaterThan(0)
    })
  })
  
  describe('Renaming', () => {
    it('should rename only the selected item', async () => {
      const vault = await vaultService.createVault('Test Vault')
      await vaultService.setActiveVault(vault.id)
      
      // Create files
      const file1 = await fileSystemService.createFile(vault.id, null, 'File 1', {})
      const file2 = await fileSystemService.createFile(vault.id, null, 'File 2', {})
      
      // Rename file1
      await fileSystemService.renameItem(file1.id, 'Renamed File 1')
      
      // Verify only file1 was renamed
      const updatedFile1 = await fileSystemService.getItem(file1.id)
      const updatedFile2 = await fileSystemService.getItem(file2.id)
      
      expect(updatedFile1?.name).toBe('Renamed File 1')
      expect(updatedFile2?.name).toBe('File 2') // Should NOT be renamed
    })
    
    it('should prevent duplicate names', async () => {
      const vault = await vaultService.createVault('Test Vault')
      await vaultService.setActiveVault(vault.id)
      
      // Create files
      const file1 = await fileSystemService.createFile(vault.id, null, 'File', {})
      const file2 = await fileSystemService.createFile(vault.id, null, 'File 2', {})
      
      // Try to rename file2 to same name as file1
      await expect(
        fileSystemService.renameItem(file2.id, 'File')
      ).rejects.toThrow('already exists')
    })
  })
  
  describe('File Opening', () => {
    it('should open file with correct name', async () => {
      const vault = await vaultService.createVault('Test Vault')
      await vaultService.setActiveVault(vault.id)
      
      // Create file
      const fileContent = {
        version: '1.0',
        metadata: { id: 'test-file', name: 'Test File', created: Date.now(), modified: Date.now(), vaultId: vault.id },
        nodes: [], edges: [], interMapLinks: []
      }
      
      const file = await fileSystemService.createFile(vault.id, null, 'My Document', fileContent)
      
      // Open file
      const openedContent = await fileSystemService.getFileContentFromItem(file.id)
      
      expect(openedContent).toBeDefined()
      expect(openedContent?.metadata.name).toBe('My Document')
    })
  })
  
  describe('Drag-and-Drop', () => {
    it('should allow files into folders', async () => {
      const vault = await vaultService.createVault('Test Vault')
      await vaultService.setActiveVault(vault.id)
      
      // Create folder and file
      const folder = await fileSystemService.createFolder(vault.id, null, 'Test Folder')
      const file = await fileSystemService.createFile(vault.id, null, 'Test File', {})
      
      // Move file into folder
      await expect(
        fileSystemService.moveItem(file.id, folder.id)
      ).resolves.not.toThrow()
      
      // Verify move
      const movedFile = await fileSystemService.getItem(file.id)
      expect(movedFile?.parentId).toBe(folder.id)
    })
    
    it('should prevent circular references', async () => {
      const vault = await vaultService.createVault('Test Vault')
      await vaultService.setActiveVault(vault.id)
      
      // Create folders
      const folder1 = await fileSystemService.createFolder(vault.id, null, 'Folder 1')
      const folder2 = await fileSystemService.createFolder(vault.id, folder1.id, 'Folder 2')
      
      // Try to move folder1 into folder2 (would create circular reference)
      await expect(
        fileSystemService.moveItem(folder1.id, folder2.id)
      ).rejects.toThrow('circular')
    })
  })
  
  describe('Sync Strategy', () => {
    it('should use Direct Async in development', () => {
      const syncStrategy = initializeSyncStrategy()
      
      if (import.meta.env.DEV) {
        expect(syncStrategy).toBeInstanceOf(DirectAsyncStrategy)
      }
    })
    
    it('should get status', async () => {
      const syncStrategy = initializeSyncStrategy()
      const status = await syncStrategy.getStatus()
      
      expect(status).toBeDefined()
      expect(status.strategy).toBeOneOf(['direct', 'service-worker', 'polling'])
    })
  })
})
```

#### 2. Add Error Boundaries

```vue
<!-- src/components/ErrorBoundary.vue -->
<template>
  <div v-if="error" class="error-boundary">
    <q-banner class="bg-negative text-white">
      <template #avatar>
        <q-icon name="error" />
      </template>
      Something went wrong: {{ error.message }}
      <template #action>
        <q-btn flat label="Reload" @click="reload" />
      </template>
    </q-banner>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'

const error = ref<Error | null>(null)

const reload = () => {
  error.value = null
  window.location.reload()
}

onErrorCaptured((err) => {
  console.error('Error captured by boundary:', err)
  error.value = err as Error
  return false // Prevent error from propagating further
})
</script>

<style scoped>
.error-boundary {
  padding: 16px;
  border-radius: 4px;
  margin: 16px 0;
}
</style>
```

#### 3. Add Logging Service

```typescript
// src/core/services/loggingService.ts
export class LoggingService {
  static log(category: string, message: string, data?: any) {
    console.log(`[${category}] ${message}`, data)
    
    // Optionally send to remote logging service in production
    if (import.meta.env.PROD) {
      // void sendToRemoteLogging({ category, message, data, timestamp: Date.now() })
    }
  }
  
  static error(category: string, message: string, error: Error) {
    console.error(`[${category}] ${message}`, error)
    
    // Store in IndexedDB errorLogs table
    void db.errorLogs.add({
      id: `error-${Date.now()}`,
      timestamp: Date.now(),
      category,
      message,
      error: error.message,
      stack: error.stack || '',
      userAgent: navigator.userAgent,
      context: {
        path: window.location.pathname,
        userId: 'TODO: Add user ID when auth is implemented'
      }
    })
  }
  
  static warn(category: string, message: string, data?: any) {
    console.warn(`[${category}] ${message}`, data)
  }
  
  static info(category: string, message: string, data?: any) {
    console.info(`[${category}] ${message}`, data)
  }
}
```

**Files to Create/Modify**:
- `test-vault-management.ts` (new)
- `src/components/ErrorBoundary.vue` (new)
- `src/core/services/loggingService.ts` (new)

**Testing**:
- Run all manual tests ✅
- Run automated tests ✅
- Fix any remaining bugs ✅
- Performance optimization ✅
- Documentation updates ✅

## ✅ Revised Success Criteria

### Critical Issues (Must Fix First)
- [ ] ✅ Renaming works correctly (only selected item)
- [ ] ✅ Files can be opened from vault
- [ ] ✅ File names are preserved when opening
- [ ] ✅ No data integrity issues

### UI/UX Improvements
- [ ] ✅ Tree shows proper hierarchy
- [ ] ✅ Files can be dragged into folders
- [ ] ✅ Folders can be dragged into folders
- [ ] ✅ Active vault is clearly indicated
- [ ] ✅ Vault can be renamed

### Infrastructure
- [ ] ✅ Sync strategy implemented (Direct Async for dev)
- [ ] ✅ Google Drive initialization works
- [ ] ✅ OAuth token management implemented
- [ ] ✅ Error boundaries added
- [ ] ✅ Logging service implemented

### Testing
- [ ] ✅ All manual tests pass
- [ ] ✅ Automated tests created and passing
- [ ] ✅ Performance is acceptable
- [ ] ✅ Error handling works correctly

## 🎯 Revised Priority Order

```
1. Phase 3: Fix Renaming (CRITICAL - Data integrity issue)
2. Phase 4: File Opening (CRITICAL - Core functionality missing)
3. Phase 1: Tree Structure (HIGH - UX improvement)
4. Phase 2: Drag-and-Drop (HIGH - UX improvement)
5. Phase 7: Active Vault (MEDIUM - Already partially implemented)
6. Phase 5: Sync Strategy (HIGH - But can be done in parallel)
7. Phase 6: Google Drive Initialization (HIGH - Depends on sync)
8. Phase 8: Testing (CRITICAL - Throughout all phases)
```

## 📊 Estimated Timeline

| Phase | Description | Priority | Estimated Time |
|-------|-------------|----------|----------------|
| 3 | Fix Renaming | Critical | 1-2 hours |
| 4 | File Opening | Critical | 2-3 hours |
| 1 | Tree Structure | High | 1-2 hours |
| 2 | Drag-and-Drop | High | 2-3 hours |
| 7 | Active Vault | Medium | 1 hour |
| 5 | Sync Strategy | High | 3-4 hours |
| 6 | Google Drive | High | 2-3 hours |
| 8 | Testing | Critical | 2-3 hours |

**Total**: 15-21 hours (reduced from 17-25 due to simplified approaches)

## 🔮 Next Steps

1. **Start with Phase 3** (Renaming) - This is a data integrity issue that must be fixed first
2. **Proceed to Phase 4** (File Opening) - Enable core functionality
3. **Implement Phases 1-2** (UI improvements) - Tree structure and drag-and-drop
4. **Add Phase 7** (Active Vault) - Already partially implemented
5. **Implement Phase 5** (Sync Strategy) - Use Direct Async for development
6. **Add Phase 6** (Google Drive) - With proper OAuth management
7. **Complete with Phase 8** (Testing) - Comprehensive testing throughout

This revised plan incorporates all the excellent suggestions from the user, simplifies complex approaches, and prioritizes critical data integrity issues first. The sync strategy approach is particularly valuable as it allows development to proceed without HTTPS requirements.