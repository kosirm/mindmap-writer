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

### Phase 5: Partial Sync Strategy with UI State Persistence

**Objective**: Implement intelligent partial sync that only updates changed files/folders, and persist UI state (open files, dockview layouts).

**Key Requirements**:
- ✅ **Partial sync only** - Update only changed files/folders, not entire vault
- ✅ **Track changes** - Monitor file/folder renames, moves, content updates
- ✅ **Background sync** - Use web worker when available, fallback to async
- ✅ **UI state persistence** - Store open files and dockview layouts per file
- ✅ **Restore UI on reload** - Load open files and layouts when app starts

**Implementation**:

#### 1. Add UI State to IndexedDB Schema

```typescript
// src/core/services/indexedDBService.ts

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

// Update MindScribbleDB class
class MindScribbleDB extends Dexie {
  // ... existing tables
  uiState!: Table<UIState, string>
  fileLayouts!: Table<FileLayout, string>

  constructor() {
    super('MindScribbleDB')

    // ... existing versions

    // Version 6 - Add UI state persistence
    this.version(6).stores({
      documents: 'metadata.id, metadata.modified, metadata.vaultId',
      nodes: 'id, mapId, vaultId, modified',
      settings: 'id',
      errorLogs: 'id, timestamp',
      providerMetadata: 'id, documentId, providerId, lastSyncedAt, syncStatus',
      repositories: 'repositoryId, lastUpdated',
      centralIndex: 'id',
      vaultMetadata: 'id, folderId, isActive',
      vaultsIndex: 'id',
      fileSystem: 'id, vaultId, parentId, type, name, sortOrder',
      uiState: 'id', // NEW
      fileLayouts: 'fileId' // NEW
    })
  }
}
```

#### 2. Create UI State Service

```typescript
// src/core/services/uiStateService.ts
import { db } from './indexedDBService'
import type { UIState, FileLayout } from './indexedDBService'

export class UIStateService {
  /**
   * Save which files are currently open
   */
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

  /**
   * Get which files should be open on app start
   */
  static async getOpenFiles(): Promise<{ fileIds: string[], activeFileId: string | null }> {
    const uiState = await db.uiState.get('ui-state')
    if (!uiState) {
      return { fileIds: [], activeFileId: null }
    }
    return { fileIds: uiState.openFiles, activeFileId: uiState.activeFileId }
  }

  /**
   * Save dockview layout for a specific file
   */
  static async saveFileLayout(fileId: string, layout: unknown): Promise<void> {
    const fileLayout: FileLayout = {
      fileId,
      layout,
      lastUpdated: Date.now()
    }
    await db.fileLayouts.put(fileLayout)
    console.log('💾 [UIState] Saved layout for file:', fileId)
  }

  /**
   * Get dockview layout for a specific file
   */
  static async getFileLayout(fileId: string): Promise<unknown | null> {
    const fileLayout = await db.fileLayouts.get(fileId)
    return fileLayout?.layout || null
  }

  /**
   * Clear UI state (when switching vaults)
   */
  static async clearUIState(): Promise<void> {
    await db.uiState.clear()
    await db.fileLayouts.clear()
    console.log('🗑️ [UIState] Cleared UI state')
  }
}
```

#### 3. Create Sync Strategy Service with Change Tracking

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
  renamedItems?: number
  movedItems?: number
  errors?: string[]
}

export interface ChangeTracker {
  modifiedFiles: Set<string> // File IDs with content changes
  renamedItems: Map<string, string> // Item ID -> new name
  movedItems: Map<string, string | null> // Item ID -> new parent ID
  deletedItems: Set<string> // Item IDs that were deleted
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

#### 4. Create Direct Async Strategy with Partial Sync

```typescript
// src/core/services/strategies/DirectAsyncStrategy.ts
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

  /**
   * Partial sync - only sync changed items
   */
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

      // 3. Handle moved items (folder structure changes)
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

      // 4. Handle modified files (content changes)
      for (const fileId of changeTracker.modifiedFiles) {
        try {
          const item = await db.fileSystem.get(fileId)
          if (item && item.type === 'file' && item.fileId) {
            const document = await db.documents.get(item.fileId)
            if (document) {
              // Sync content to Google Drive
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

      // 5. Update .repository.json file with latest structure
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

      // Get active vault (only one vault in IndexedDB at a time)
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

  /**
   * Update .repository.json file with current vault structure
   * This allows efficient sync by comparing timestamps
   */
  private async updateRepositoryFile(vaultId: string, vaultFolderId: string): Promise<void> {
    // Get all files and folders in vault
    const fileSystemItems = await db.fileSystem.where('vaultId').equals(vaultId).toArray()

    // Build repository structure
    const repositoryStructure: Record<string, any> = {}

    for (const item of fileSystemItems) {
      if (item.type === 'folder') {
        repositoryStructure[item.id] = {
          id: item.id,
          name: item.name,
          type: 'folder',
          parentId: item.parentId,
          driveFileId: item.driveFileId,
          created: item.created,
          modified: item.modified
        }
      } else if (item.type === 'file') {
        const document = await db.documents.get(item.fileId!)
        repositoryStructure[item.id] = {
          id: item.id,
          name: item.name,
          type: 'file',
          parentId: item.parentId,
          driveFileId: item.driveFileId,
          fileId: item.fileId,
          created: item.created,
          modified: item.modified,
          size: document ? JSON.stringify(document).length : 0
        }
      }
    }

    // Get vault metadata
    const vault = await db.vaultMetadata.get(vaultId)

    // Create repository content
    const repositoryContent = {
      version: '1.0',
      vaultId: vaultId,
      vaultName: vault?.name || 'Unknown',
      lastSynced: Date.now(),
      structure: repositoryStructure
    }

    // Find .repository.json file in vault folder
    const repositoryFile = await googleDriveService.findFileInFolder(vaultFolderId, '.repository.json')

    if (repositoryFile) {
      // Update existing file
      await googleDriveService.updateFileContent(repositoryFile.id, repositoryContent)
    } else {
      // Create new file
      await googleDriveService.createFile(vaultFolderId, '.repository.json', repositoryContent)
    }
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

#### 5. Update File System Service to Track Changes

```typescript
// src/core/services/fileSystemService.ts
import { getChangeTracker } from './syncStrategy'

// Update createFile to track new files
export async function createFile(vaultId: string, parentId: string | null, name: string, content: MindscribbleDocument): Promise<FileSystemItem> {
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
export async function updateFileContent(fileId: string, content: MindscribbleDocument): Promise<void> {
  // ... existing code ...

  // Track as modified for sync
  const changeTracker = getChangeTracker()
  changeTracker.modifiedFiles.add(fileId)
}
```

#### 6. Update Unified Document Store to Save UI State

```typescript
// src/core/stores/unifiedDocumentStore.ts
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
          // Apply layout to dockview (implementation depends on dockview API)
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

// Export for use in app initialization
return {
  // ... existing exports
  saveDockviewLayout,
  restoreUIState
}
```

#### 7. Create Boot File

```typescript
// src/boot/sync.ts
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

#### 8. Update quasar.config.ts

```typescript
// Add sync to boot files
boot: [
  'indexedDB',
  'google-api',
  'sync', // Add this - must be after indexedDB
  // ... other boot files
]
```

**Files to Create/Modify**:
- `src/core/services/indexedDBService.ts` (update - add uiState and fileLayouts tables)
- `src/core/services/uiStateService.ts` (new)
- `src/core/services/syncStrategy.ts` (new)
- `src/core/services/strategies/DirectAsyncStrategy.ts` (new)
- `src/core/services/strategies/ServiceWorkerStrategy.ts` (new)
- `src/core/services/strategies/PollingStrategy.ts` (new)
- `src/core/services/strategies/types.ts` (new)
- `src/core/services/fileSystemService.ts` (update - add change tracking)
- `src/core/stores/unifiedDocumentStore.ts` (update - add UI state persistence)
- `src/boot/sync.ts` (new)
- `quasar.config.ts` (update)

**Benefits**:
- ✅ **Partial sync only** - Only changed files/folders are synced
- ✅ **Change tracking** - All operations (rename, move, delete, update) are tracked
- ✅ **UI state persistence** - Open files and layouts are saved
- ✅ **Seamless restore** - App reopens with same files and layouts
- ✅ **Background sync** - Automatic sync every 5 minutes
- ✅ **Works in development** - No HTTPS required

### Phase 6: First-Time Initialization and Google Drive Sync

**Objective**: Handle first-time app usage, create default vault, initialize Google Drive structure with proper repository files.

**Google Drive Structure**:
```
MindScribble/                    (App folder)
├── .vaults                      (Index of all vaults)
├── .lock                        (Lock file for concurrent access)
├── Vault 1/                     (Vault folder)
│   ├── .repository.json         (Vault structure snapshot for sync)
│   ├── file1.json               (File - changed from .mindscribble)
│   ├── folder1/                 (Folder)
│   │   ├── file2.json
│   │   └── file3.json
│   └── ...
├── Vault 2/                     (Another vault)
│   ├── .repository.json
│   └── file4.json
└── ...
```

**Key Requirements**:
- ✅ **First-time setup** - Create default vault "My Vault" on first app launch
- ✅ **Google Drive folder** - Create "MindScribble" app folder on Google Drive
- ✅ **Vaults index file** - Create and maintain `.vaults` index file
- ✅ **Lock file** - Create `.lock` file for concurrent access control
- ✅ **Repository files** - Create `.repository.json` per vault for efficient sync
- ✅ **File extension** - Use `.json` instead of `.mindscribble`
- ✅ **Vault sync** - Sync vault structure and files to Google Drive
- ✅ **OAuth management** - Handle token refresh automatically
- ✅ **Offline support** - Work offline, sync when online

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

#### 2. Create Google Drive Initialization Service

```typescript
// src/core/services/googleDriveInitialization.ts
import { db } from './indexedDBService'
import { GoogleAuthService } from './googleAuthService'
import { googleDriveService } from './googleDriveService'

export class GoogleDriveInitializationService {
  private static MINDSCRIBBLE_FOLDER_NAME = 'MindScribble'
  private static VAULTS_INDEX_FILE_NAME = '.vaults'
  private static LOCK_FILE_NAME = '.lock'
  private static REPOSITORY_FILE_NAME = '.repository.json'
  private static FILE_EXTENSION = '.json' // Changed from .mindscribble

  /**
   * Initialize Google Drive on first-time use
   * Creates app folder, .vaults index, .lock file, and syncs default vault
   */
  static async initializeFirstTime(): Promise<void> {
    try {
      console.log('🗄️ [GoogleDriveInit] First-time initialization...')

      // Ensure authentication
      const isAuthenticated = await GoogleAuthService.ensureAuthenticated()
      if (!isAuthenticated) {
        console.log('🗄️ [GoogleDriveInit] User not authenticated, working offline')
        return
      }

      // Start token refresh timer
      GoogleAuthService.startTokenRefreshTimer()

      // 1. Create MindScribble app folder on Google Drive
      const appFolder = await this.createAppFolder()
      console.log('📁 [GoogleDriveInit] App folder created:', appFolder.id)

      // 2. Create .lock file for concurrent access control
      await this.createLockFile(appFolder.id)
      console.log('🔒 [GoogleDriveInit] Lock file created')

      // 3. Get vaults from IndexedDB
      const vaultsIndex = await db.vaultsIndex.get('vaults')
      if (!vaultsIndex || vaultsIndex.vaults.length === 0) {
        console.log('🗄️ [GoogleDriveInit] No vaults in IndexedDB')
        return
      }

      // 4. Create .vaults index file on Google Drive
      await this.createVaultsIndexFile(appFolder.id, vaultsIndex.vaults)
      console.log('📄 [GoogleDriveInit] .vaults index file created')

      // 5. Initialize each vault on Google Drive
      for (const vault of vaultsIndex.vaults) {
        await this.initializeVaultOnDrive(vault, appFolder.id)
      }

      console.log('✅ [GoogleDriveInit] First-time initialization complete')

    } catch (error) {
      console.error('❌ [GoogleDriveInit] First-time initialization failed:', error)
      // Don't throw - allow offline usage
    }
  }

  /**
   * Create .lock file for concurrent access control
   */
  private static async createLockFile(appFolderId: string): Promise<void> {
    const lockContent = {
      version: '1.0',
      created: Date.now(),
      lastAccessed: Date.now(),
      lockedBy: null // null = unlocked
    }

    // Check if .lock file already exists
    const existingFile = await googleDriveService.findFileInFolder(appFolderId, this.LOCK_FILE_NAME)

    if (!existingFile) {
      await googleDriveService.createFile(appFolderId, this.LOCK_FILE_NAME, lockContent)
      console.log('🔒 [GoogleDriveInit] Created .lock file')
    }
  }

  /**
   * Create Mindscribble app folder on Google Drive
   */
  private static async createAppFolder(): Promise<{ id: string, name: string }> {
    // Check if folder already exists
    const existingFolder = await googleDriveService.findFolder(this.MINDSCRIBBLE_FOLDER_NAME)
    if (existingFolder) {
      console.log('📁 [GoogleDriveInit] App folder already exists')
      return existingFolder
    }

    // Create new folder
    const folder = await googleDriveService.createFolder(this.MINDSCRIBBLE_FOLDER_NAME, null)
    return folder
  }

  /**
   * Create .vaults index file on Google Drive
   */
  private static async createVaultsIndexFile(
    appFolderId: string,
    vaults: Array<{ id: string, name: string, description?: string, created: number, modified: number }>
  ): Promise<void> {
    const indexContent = {
      version: '1.0',
      lastUpdated: Date.now(),
      vaults: vaults.map(v => ({
        id: v.id,
        name: v.name,
        description: v.description || '',
        created: v.created,
        modified: v.modified
      }))
    }

    // Check if .vaults file already exists
    const existingFile = await googleDriveService.findFileInFolder(appFolderId, this.VAULTS_INDEX_FILE_NAME)

    if (existingFile) {
      // Update existing file
      await googleDriveService.updateFileContent(existingFile.id, indexContent)
      console.log('📄 [GoogleDriveInit] Updated .vaults index file')
    } else {
      // Create new file
      await googleDriveService.createFile(appFolderId, this.VAULTS_INDEX_FILE_NAME, indexContent)
      console.log('📄 [GoogleDriveInit] Created .vaults index file')
    }
  }

  /**
   * Initialize a vault on Google Drive
   */
  private static async initializeVaultOnDrive(
    vault: { id: string, name: string },
    appFolderId: string
  ): Promise<void> {
    console.log('� [GoogleDriveInit] Initializing vault on Drive:', vault.name)

    // 1. Create vault folder
    const vaultFolder = await googleDriveService.createFolder(vault.name, appFolderId)

    // 2. Update vault metadata with Drive folder ID
    await db.vaultMetadata.update(vault.id, { folderId: vaultFolder.id })

    // 3. Get all files and folders in this vault
    const fileSystemItems = await db.fileSystem.where('vaultId').equals(vault.id).toArray()

    // 4. Build repository structure for .repository.json
    const repositoryStructure: Record<string, any> = {}

    // 5. Sync all files and folders
    for (const item of fileSystemItems) {
      if (item.type === 'folder') {
        // Create folder on Drive
        const parentDriveId = item.parentId
          ? (await db.fileSystem.get(item.parentId))?.driveFileId || vaultFolder.id
          : vaultFolder.id
        const driveFolder = await googleDriveService.createFolder(item.name, parentDriveId)

        // Store Drive folder ID
        await db.fileSystem.update(item.id, { driveFileId: driveFolder.id })

        // Add to repository structure
        repositoryStructure[item.id] = {
          id: item.id,
          name: item.name,
          type: 'folder',
          parentId: item.parentId,
          driveFileId: driveFolder.id,
          created: item.created,
          modified: item.modified
        }

      } else if (item.type === 'file' && item.fileId) {
        // Create file on Drive with .json extension
        const document = await db.documents.get(item.fileId)
        if (document) {
          const parentDriveId = item.parentId
            ? (await db.fileSystem.get(item.parentId))?.driveFileId || vaultFolder.id
            : vaultFolder.id

          // Use .json extension instead of .mindscribble
          const fileName = item.name.endsWith('.json') ? item.name : `${item.name}.json`
          const driveFile = await googleDriveService.createFile(parentDriveId, fileName, document)

          // Store Drive file ID
          await db.fileSystem.update(item.id, { driveFileId: driveFile.id })

          // Add to repository structure
          repositoryStructure[item.id] = {
            id: item.id,
            name: item.name,
            type: 'file',
            parentId: item.parentId,
            driveFileId: driveFile.id,
            fileId: item.fileId,
            created: item.created,
            modified: item.modified,
            size: JSON.stringify(document).length
          }
        }
      }
    }

    // 6. Create .repository.json file
    const repositoryContent = {
      version: '1.0',
      vaultId: vault.id,
      vaultName: vault.name,
      lastSynced: Date.now(),
      structure: repositoryStructure
    }

    await googleDriveService.createFile(
      vaultFolder.id,
      this.REPOSITORY_FILE_NAME,
      repositoryContent
    )
    console.log('📄 [GoogleDriveInit] Created .repository.json for vault:', vault.name)

    console.log('✅ [GoogleDriveInit] Vault initialized on Drive:', vault.name)
  }

  /**
   * Update .vaults index file when vaults change
   */
  static async updateVaultsIndex(): Promise<void> {
    try {
      const isAuthenticated = await GoogleAuthService.ensureAuthenticated()
      if (!isAuthenticated) {
        console.log('🗄️ [GoogleDriveInit] Not authenticated, skipping index update')
        return
      }

      // Get app folder
      const appFolder = await googleDriveService.findFolder(this.MINDSCRIBBLE_FOLDER_NAME)
      if (!appFolder) {
        console.log('🗄️ [GoogleDriveInit] App folder not found, skipping index update')
        return
      }

      // Get vaults from IndexedDB
      const vaultsIndex = await db.vaultsIndex.get('vaults')
      if (!vaultsIndex) {
        return
      }

      // Update .vaults file
      await this.createVaultsIndexFile(appFolder.id, vaultsIndex.vaults)
      console.log('✅ [GoogleDriveInit] .vaults index updated')

    } catch (error) {
      console.error('❌ [GoogleDriveInit] Failed to update vaults index:', error)
    }
  }
}
```

#### 3. Update IndexedDB Boot to Handle First-Time Setup

```typescript
// src/boot/indexedDB.ts
import { boot } from 'quasar/wrappers'
import { db } from '../core/services/indexedDBService'
import { useAppStore } from '../core/stores/appStore'
import { GoogleDriveInitializationService } from '../core/services/googleDriveInitialization'

export default boot(async () => {
  console.log('🗄️ [IndexedDB Boot] Initializing IndexedDB database...')

  try {
    // Open the database connection
    await db.open()
    console.log('🗄️ [IndexedDB Boot] Database opened successfully, version:', db.verno)

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
  }
})
```

#### 4. Update Vault Store to Sync Index on Changes

```typescript
// src/core/stores/vaultStore.ts
import { GoogleDriveInitializationService } from '../services/googleDriveInitialization'

// Update createNewVault to sync index
async function createNewVault(name: string, description?: string) {
  // ... existing code ...

  // Update .vaults index on Google Drive
  await GoogleDriveInitializationService.updateVaultsIndex()

  return newVault
}

// Update renameExistingVault to sync index
async function renameExistingVault(vaultId: string, newName: string) {
  // ... existing code ...

  // Update .vaults index on Google Drive
  await GoogleDriveInitializationService.updateVaultsIndex()
}

// Update deleteExistingVault to sync index
async function deleteExistingVault(vaultId: string) {
  // ... existing code ...

  // Update .vaults index on Google Drive
  await GoogleDriveInitializationService.updateVaultsIndex()
}
```

**Files to Create/Modify**:
- `src/core/services/googleAuthService.ts` (new)
- `src/core/services/googleDriveInitialization.ts` (new)
- `src/core/services/googleDriveService.ts` (update - add helper methods)
- `src/core/services/indexedDBService.ts` (update - add driveFileId to FileSystemItem)
- `src/boot/indexedDB.ts` (update - add first-time setup)
- `src/core/stores/vaultStore.ts` (update - sync index on changes)

**Testing**:
- ✅ First-time app launch creates default vault
- ✅ Google Drive folder creation works
- ✅ .vaults index file is created and updated
- ✅ Vault structure is synced to Google Drive
- ✅ OAuth token refresh works automatically
- ✅ Offline mode works (no errors when offline)

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