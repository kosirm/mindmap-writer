# Technical Implementation Plan for Vault Management Fixes

## 🎯 Overview

This document provides detailed technical implementation steps for fixing the vault management system. It includes specific code changes, API modifications, and integration points.

## 🔧 Phase 1: Tree Structure Fix

### Problem
- Treeview displays all files and folders separately
- No root vault element
- Improper hierarchy representation

### Solution

#### 1. Modify VaultTree.vue

**Changes to `buildTreeFromVault()` function**:

```typescript
// Current implementation shows files and folders separately
const rootItems = vaultStructure.filter(item => item.parentId === null)
treeData.value = buildTreeItems(rootItems)

// New implementation: Create root vault element
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
    
    // Create root vault element
    const rootVaultItem: VaultTreeItem = {
      id: `vault-root-${activeVault.id}`,
      text: activeVault.name,
      item: {
        id: `vault-root-${activeVault.id}`,
        vaultId: activeVault.id,
        parentId: null,
        name: activeVault.name,
        type: 'vault', // NEW: Add vault type
        created: activeVault.created,
        modified: activeVault.modified
      },
      type: 'vault',
      children: [],
      stat: {
        children: { length: vaultStructure.length },
        open: true // Root vault always open
      }
    }
    
    // Find root items (items with null parentId)
    const rootItems = vaultStructure.filter(item => item.parentId === null)
    
    // Build children hierarchy
    rootVaultItem.children = buildTreeItems(rootItems)
    
    treeData.value = [rootVaultItem]
    
  } catch (error) {
    console.error('Failed to build vault tree:', error)
    treeData.value = []
  }
}
```

#### 2. Update VaultTreeItem Interface

```typescript
interface VaultTreeItem {
  id: string
  text: string
  item: FileSystemItem
  children: VaultTreeItem[]
  type: 'vault' | 'folder' | 'file' // Add 'vault' type
  stat: {
    children: { length: number }
    open: boolean
  }
}
```

#### 3. Update VaultTreeItem.vue

**Add vault icon and behavior**:

```vue
<!-- Icon based on item type -->
<div class="item-icon">
  <q-icon
    :name="item.type === 'file' ? 'description' : item.type === 'folder' ? 'folder' : 'storage'"
    size="18px"
    :color="item.type === 'file' ? 'blue-6' : item.type === 'folder' ? 'amber-8' : 'teal-6'"
  />
</div>
```

**Add vault-specific behavior**:

```typescript
// Prevent vault from being moved
function validateDrop(dropInfo: { targetId: string; sourceId: string; dropPosition: string }) {
  const { targetId, sourceId, dropPosition } = dropInfo
  
  // Find target and source items
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
  
  // Cannot drop files into other files
  if (targetItem.type === 'file' && dropPosition === 'inside') {
    $q.notify({
      type: 'warning',
      message: 'Cannot drop files into other files',
      timeout: 2000
    })
    return false
  }
  
  // Cannot drop vaults (they are root level only)
  if (sourceItem.type === 'vault') {
    $q.notify({
      type: 'warning',
      message: 'Vaults cannot be moved',
      timeout: 2000
    })
    return false
  }
  
  // Allow files and folders to be dropped into folders
  if (targetItem.type === 'folder' && dropPosition === 'inside') {
    return true
  }
  
  // Allow items to be dropped between other items
  if (dropPosition === 'before' || dropPosition === 'after') {
    return true
  }
  
  return false
}
```

## 🔧 Phase 2: Drag-and-Drop Fix

### Problem
- Files cannot be dragged into folders
- Folders cannot be dragged into folders
- No visual feedback for valid/invalid drops

### Solution

#### 1. Fix validateDrop() Logic

```typescript
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
  
  // Rule 2: Cannot drop vaults (they are root level only)
  if (sourceItem.type === 'vault') {
    $q.notify({
      type: 'warning',
      message: 'Vaults cannot be moved',
      timeout: 2000
    })
    return false
  }
  
  // Rule 3: Can drop files and folders into folders
  if (targetItem.type === 'folder' && dropPosition === 'inside') {
    return true
  }
  
  // Rule 4: Can drop folders into folders (but check for circular references)
  if (sourceItem.type === 'folder' && targetItem.type === 'folder' && dropPosition === 'inside') {
    if (isCircularReference(sourceItem.id, targetItem.id)) {
      $q.notify({
        type: 'warning',
        message: 'Cannot create circular folder references',
        timeout: 2000
      })
      return false
    }
    return true
  }
  
  // Rule 5: Can drop items between other items (before/after)
  if (dropPosition === 'before' || dropPosition === 'after') {
    return true
  }
  
  return false
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
```

#### 2. Add Visual Feedback

**Update CSS for drop indicators**:

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

## 🔧 Phase 3: Renaming Fix

### Problem
- Multiple files/folders are renamed when only one should be
- Event propagation issues

### Solution

#### 1. Fix VaultTreeItem.vue

**Update renameItem() function**:

```typescript
// Current implementation
async function renameItem(itemId: string, newName: string) {
  try {
    await fileSystemService.renameExistingItem(itemId, newName)
    vaultEmitter?.emit('refresh-tree', {})
  } catch (error) {
    console.error('Failed to rename item:', error)
  }
}

// Fixed implementation
async function renameItem(itemId: string, newName: string) {
  try {
    // Validate new name
    if (!newName || newName.trim() === '') {
      throw new Error('Item name cannot be empty')
    }
    
    // Check for duplicates in the same parent
    const currentItem = props.item
    const parentId = currentItem.parentId
    
    const exists = await fileSystemService.checkItemExists(parentId, newName)
    if (exists && newName !== currentItem.name) {
      $q.notify({
        type: 'warning',
        message: `An item named "${newName}" already exists in this location`,
        timeout: 3000
      })
      return
    }
    
    // Perform rename with transaction
    await fileSystemService.renameExistingItem(itemId, newName)
    
    // Update local state immediately
    if (props.item.name !== newName) {
      props.item.name = newName
      props.item.modified = Date.now()
    }
    
    // Refresh tree to ensure consistency
    vaultEmitter?.emit('refresh-tree', {})
    
  } catch (error) {
    console.error('Failed to rename item:', error)
    $q.notify({
      type: 'error',
      message: error instanceof Error ? error.message : 'Failed to rename item',
      timeout: 3000
    })
  }
}
```

#### 2. Update useFileSystem.ts

**Improve renameExistingItem()**:

```typescript
async function renameExistingItem(itemId: string, newName: string) {
  try {
    isLoading.value = true
    error.value = null
    
    // Get current item to validate
    const currentItem = vaultStructure.value.find(item => item.id === itemId)
    if (!currentItem) {
      throw new Error('Item not found')
    }
    
    // Validate new name
    if (!newName || newName.trim() === '') {
      throw new Error('Item name cannot be empty')
    }
    
    // Check for duplicates
    const parentId = currentItem.parentId
    const exists = await itemExists(parentId, newName)
    if (exists && newName !== currentItem.name) {
      throw new Error(`An item named "${newName}" already exists in this location`)
    }
    
    const updatedItem = await renameItem(itemId, newName)
    
    // Update local state
    const index = vaultStructure.value.findIndex(item => item.id === itemId)
    if (index !== -1) {
      vaultStructure.value[index] = updatedItem
    }
    
    $q.notify({
      type: 'positive',
      message: 'Item renamed successfully',
      timeout: 2000
    })
    
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

## 🔧 Phase 4: File Opening Implementation

### Problem
- Files cannot be opened from vault management
- File names not preserved when opening

### Solution

#### 1. Update VaultTreeItem.vue

**Implement openItem() properly**:

```typescript
function openItem(item: FileSystemItem) {
  if (item.type === 'file') {
    // Open file - integrate with document store
    void openFileFromVault(item)
  } else if (item.type === 'folder') {
    // Toggle folder expansion
    toggleFolder()
  }
}

async function openFileFromVault(fileItem: FileSystemItem) {
  try {
    // Get file content
    const content = await fileSystemService.getFileContentFromItem(fileItem.id)
    
    if (!content) {
      throw new Error('Failed to load file content')
    }
    
    // Load into unified document store
    const documentStore = useUnifiedDocumentStore()
    await documentStore.loadDocument(content, fileItem.name)
    
    // Notify success
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
```

#### 2. Update unifiedDocumentStore.ts

**Add vault-aware document loading**:

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
```

#### 3. Add File Opening Command

**Update fileCommands.ts**:

```typescript
// Add new command
export const openFileFromVault: CommandDefinition = {
  id: 'file.openFromVault',
  title: 'Open File from Vault',
  description: 'Open a file from the vault management',
  icon: 'folder_open',
  categories: ['file'],
  handler: async (context) => {
    const { fileId, fileName } = context
    if (!fileId) {
      throw new Error('File ID not provided')
    }
    
    const fileSystemService = useFileSystem()
    const documentStore = useUnifiedDocumentStore()
    
    const content = await fileSystemService.getFileContentById(fileId)
    if (!content) {
      throw new Error('File not found')
    }
    
    await documentStore.loadDocument(content, fileName)
    
    return { success: true, message: `Opened ${fileName || 'file'}` }
  }
}
```

## 🔧 Phase 5: PWA Upgrade

### Problem
- App is not PWA-enabled
- Cannot test service workers
- No offline capabilities

### Solution

#### 1. Update quasar.config.ts

```typescript
// Add PWA configuration
export default configure(function (ctx) {
  return {
    // ... existing config
    
    pwa: {
      workboxMode: 'generateSW',
      manifest: {
        name: 'MindScribble',
        short_name: 'MindScribble',
        description: 'Professional mindmapping application',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#1976d2',
        icons: [
          {
            src: 'icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png'
          },
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-256x256.png',
            sizes: '256x256',
            type: 'image/png'
          },
          {
            src: 'icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workboxOptions: {
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          }
        ]
      }
    }
  }
})
```

#### 2. Create Service Worker

**Create `src-pwa/custom-service-worker.js`**:

```javascript
import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { BackgroundSyncPlugin } from 'workbox-background-sync'
import { ExpirationPlugin } from 'workbox-expiration'

// Precache all assets
precacheAndRoute(self.__WB_MANIFEST)

// Cache API responses with background sync for offline support
const bgSyncPlugin = new BackgroundSyncPlugin('syncQueue', {
  maxRetentionTime: 24 * 60 // Retry for max 24 hours
})

// Cache IndexedDB operations
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      bgSyncPlugin,
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
      })
    ]
  }),
  'GET'
)

// Cache Google Drive API calls
registerRoute(
  ({ url }) => url.hostname === 'www.googleapis.com',
  new NetworkFirst({
    cacheName: 'google-drive-cache',
    plugins: [
      bgSyncPlugin,
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 7 * 24 * 60 * 60 // 7 days
      })
    ]
  }),
  'GET'
)

// Cache static assets
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'image-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
      })
    ]
  })
)

// Cache CSS and JS
registerRoute(
  ({ request }) => request.destination === 'script' || request.destination === 'style',
  new StaleWhileRevalidate({
    cacheName: 'asset-cache'
  })
)

// Listen for sync events from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SYNC_NOW') {
    // Trigger background sync
    void bgSyncPlugin.replayQueue()
  }
})

// Background sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'syncQueue') {
    event.waitUntil(bgSyncPlugin.replayQueue())
  }
})
```

#### 3. Update IndexedDB Boot File

**Add PWA-specific initialization**:

```typescript
export default boot(async () => {
  console.log('🗄️ [IndexedDB Boot] Initializing IndexedDB database...')
  
  try {
    // Check if we're running in PWA mode
    const isPWA = window.matchMedia('(display-mode: standalone)').matches
    console.log('🗄️ [IndexedDB Boot] PWA mode:', isPWA)
    
    // Open the database connection
    await db.open()
    
    // Register service worker if in PWA mode
    if (isPWA && 'serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')
        console.log('🗄️ [IndexedDB Boot] Service worker registered:', registration)
        
        // Listen for sync events
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data.type === 'SYNC_COMPLETE') {
            console.log('🗄️ [IndexedDB Boot] Sync completed:', event.data)
          }
        })
        
      } catch (swError) {
        console.warn('🗄️ [IndexedDB Boot] Service worker registration failed:', swError)
      }
    }
    
    // Rest of existing initialization...
    
  } catch (error) {
    console.error('🗄️ [IndexedDB Boot] Failed to initialize IndexedDB:', error)
  }
})
```

## 🔧 Phase 6: Google Drive Initialization

### Problem
- No vault initialization on Google Drive
- No .repository.json creation
- No sync infrastructure

### Solution

#### 1. Create Google Drive Initialization Service

**Create `src/core/services/googleDriveInitialization.ts`**:

```typescript
import { googleDriveService } from './googleDriveService'
import { db } from './indexedDBService'
import type { VaultMetadata } from './indexedDBService'

export class GoogleDriveInitializationService {
  
  /**
   * Initialize Google Drive structure for MindScribble
   */
  static async initialize(): Promise<void> {
    try {
      console.log('🗄️ [GoogleDriveInit] Starting Google Drive initialization...')
      
      // Check if user is authenticated
      const isAuthenticated = await googleDriveService.checkAuthentication()
      if (!isAuthenticated) {
        console.log('🗄️ [GoogleDriveInit] User not authenticated, skipping initialization')
        return
      }
      
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
  
  /**
   * Create Mindscribble folder on Google Drive
   */
  private static async createMindscribbleFolder(): Promise<{ id: string, name: string }> {
    try {
      // Check if folder already exists
      const existingFolder = await googleDriveService.findFolder('Mindscribble')
      if (existingFolder) {
        console.log('🗄️ [GoogleDriveInit] Mindscribble folder already exists')
        return existingFolder
      }
      
      // Create new folder
      const folder = await googleDriveService.createFolder('Mindscribble')
      console.log('🗄️ [GoogleDriveInit] Created Mindscribble folder:', folder.id)
      
      return folder
      
    } catch (error) {
      console.error('🗄️ [GoogleDriveInit] Failed to create Mindscribble folder:', error)
      throw new Error('Failed to create Mindscribble folder')
    }
  }
  
  /**
   * Initialize a vault on Google Drive
   */
  private static async initializeVaultOnGoogleDrive(vault: VaultMetadata, parentFolderId: string): Promise<void> {
    try {
      console.log(`🗄️ [GoogleDriveInit] Initializing vault "${vault.name}" on Google Drive`)
      
      // Skip if vault already has Google Drive IDs
      if (vault.folderId && vault.repositoryFileId) {
        console.log(`🗄️ [GoogleDriveInit] Vault "${vault.name}" already initialized on Google Drive`)
        return
      }
      
      // Create vault folder
      const vaultFolder = await googleDriveService.createFolder(vault.name, parentFolderId)
      
      // Create .repository.json file
      const repositoryContent = this.createRepositoryContent(vault)
      const repositoryFile = await googleDriveService.createFile(
        '.repository.json',
        vaultFolder.id,
        JSON.stringify(repositoryContent, null, 2),
        'application/json'
      )
      
      // Update vault metadata with Google Drive IDs
      const updatedVault: VaultMetadata = {
        ...vault,
        folderId: vaultFolder.id,
        repositoryFileId: repositoryFile.id
      }
      
      // Update in IndexedDB
      const centralIndex = await db.centralIndex.get('central')
      if (centralIndex) {
        centralIndex.vaults[vault.id] = updatedVault
        centralIndex.lastUpdated = Date.now()
        await db.centralIndex.put(centralIndex)
        await db.vaultMetadata.put(updatedVault)
      }
      
      console.log(`🗄️ [GoogleDriveInit] Vault "${vault.name}" initialized on Google Drive`)
      
    } catch (error) {
      console.error(`🗄️ [GoogleDriveInit] Failed to initialize vault "${vault.name}" on Google Drive:`, error)
      throw new Error(`Failed to initialize vault "${vault.name}" on Google Drive`)
    }
  }
  
  /**
   * Create repository content for .repository.json
   */
  private static createRepositoryContent(vault: VaultMetadata): object {
    return {
      repositoryId: vault.id,
      name: vault.name,
      version: '1.0',
      lastUpdated: Date.now(),
      files: {},
      folders: {},
      deletedFiles: [],
      deletedFolders: [],
      syncSettings: {
        conflictResolution: 'ask',
        lastSynced: null
      }
    }
  }
  
  /**
   * Sync vault structure to Google Drive
   */
  static async syncVaultStructure(vaultId: string): Promise<void> {
    try {
      console.log(`🗄️ [GoogleDriveInit] Syncing vault structure for ${vaultId}`)
      
      // Get vault metadata
      const vault = await db.vaultMetadata.get(vaultId)
      if (!vault || !vault.folderId) {
        throw new Error('Vault not found or not initialized on Google Drive')
      }
      
      // Get vault structure from IndexedDB
      const fileSystemItems = await db.fileSystem.where('vaultId').equals(vaultId).toArray()
      
      // Update .repository.json
      const repositoryFileId = vault.repositoryFileId
      if (!repositoryFileId) {
        throw new Error('Repository file not found')
      }
      
      // Get current repository content
      const repositoryFile = await googleDriveService.getFile(repositoryFileId)
      const repositoryContent = repositoryFile.content ? JSON.parse(repositoryFile.content) : 
        this.createRepositoryContent(vault)
      
      // Update repository with current file system structure
      repositoryContent.lastUpdated = Date.now()
      repositoryContent.files = {}
      repositoryContent.folders = {}
      
      // Build file and folder maps
      fileSystemItems.forEach(item => {
        if (item.type === 'file') {
          repositoryContent.files[item.id] = {
            id: item.id,
            path: this.buildItemPath(item, fileSystemItems),
            name: item.name,
            type: 'mindmap',
            timestamp: item.modified,
            size: item.size || 0
          }
        } else if (item.type === 'folder') {
          repositoryContent.folders[item.id] = {
            id: item.id,
            path: this.buildItemPath(item, fileSystemItems),
            name: item.name,
            timestamp: item.modified,
            parentId: item.parentId || null,
            fileIds: item.children?.filter(childId => {
              const child = fileSystemItems.find(i => i.id === childId)
              return child?.type === 'file'
            }) || [],
            folderIds: item.children?.filter(childId => {
              const child = fileSystemItems.find(i => i.id === childId)
              return child?.type === 'folder'
            }) || []
          }
        }
      })
      
      // Update repository file on Google Drive
      await googleDriveService.updateFile(
        repositoryFileId,
        JSON.stringify(repositoryContent, null, 2),
        'application/json'
      )
      
      console.log(`🗄️ [GoogleDriveInit] Vault structure synced for ${vaultId}`)
      
    } catch (error) {
      console.error(`🗄️ [GoogleDriveInit] Failed to sync vault structure for ${vaultId}:`, error)
      throw new Error(`Failed to sync vault structure for ${vaultId}`)
    }
  }
  
  /**
   * Build item path from root
   */
  private static buildItemPath(item: FileSystemItem, allItems: FileSystemItem[]): string {
    const pathParts: string[] = []
    let currentItem: FileSystemItem | undefined = item
    
    while (currentItem) {
      pathParts.unshift(currentItem.name)
      if (!currentItem.parentId) break
      currentItem = allItems.find(i => i.id === currentItem.parentId)
    }
    
    return pathParts.join('/')
  }
}
```

#### 2. Update Google Drive Service

**Add initialization methods to `googleDriveService.ts`**:

```typescript
/**
 * Find folder by name
 */
async function findFolder(folderName: string, parentId: string = 'root'): Promise<{ id: string, name: string } | null> {
  try {
    const response = await gapi.client.drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    })
    
    const files = response.result.files
    return files && files.length > 0 ? { id: files[0].id, name: files[0].name } : null
    
  } catch (error) {
    console.error(`Failed to find folder ${folderName}:`, error)
    return null
  }
}

/**
 * Create folder on Google Drive
 */
async function createFolder(folderName: string, parentId: string = 'root'): Promise<{ id: string, name: string }> {
  try {
    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId]
    }
    
    const response = await gapi.client.drive.files.create({
      resource: fileMetadata,
      fields: 'id, name'
    })
    
    return { id: response.result.id, name: response.result.name }
    
  } catch (error) {
    console.error(`Failed to create folder ${folderName}:`, error)
    throw new Error(`Failed to create folder ${folderName}`)
  }
}

/**
 * Create file on Google Drive
 */
async function createFile(name: string, parentId: string, content: string, mimeType: string): Promise<{ id: string, name: string }> {
  try {
    const fileMetadata = {
      name: name,
      parents: [parentId]
    }
    
    const response = await gapi.client.drive.files.create({
      resource: fileMetadata,
      media: {
        mimeType: mimeType,
        body: content
      },
      fields: 'id, name'
    })
    
    return { id: response.result.id, name: response.result.name }
    
  } catch (error) {
    console.error(`Failed to create file ${name}:`, error)
    throw new Error(`Failed to create file ${name}`)
  }
}
```

#### 3. Update Boot Process

**Modify `boot/google-api.ts`**:

```typescript
import { GoogleDriveInitializationService } from '../core/services/googleDriveInitialization'

export default boot(async () => {
  console.log('🗄️ [GoogleAPI Boot] Initializing Google API...')
  
  try {
    // Load Google API client
    await loadGoogleAPI()
    
    // Initialize Google Drive structure
    await GoogleDriveInitializationService.initialize()
    
    // Set up periodic sync
    setupPeriodicSync()
    
  } catch (error) {
    console.error('🗄️ [GoogleAPI Boot] Failed to initialize Google API:', error)
  }
})

function setupPeriodicSync() {
  // Sync every 5 minutes
  setInterval(async () => {
    try {
      await syncAllVaults()
    } catch (error) {
      console.error('🗄️ [GoogleAPI Sync] Periodic sync failed:', error)
    }
  }, 5 * 60 * 1000)
}

async function syncAllVaults() {
  try {
    const centralIndex = await db.centralIndex.get('central')
    if (!centralIndex) return
    
    for (const vault of Object.values(centralIndex.vaults)) {
      await GoogleDriveInitializationService.syncVaultStructure(vault.id)
    }
    
  } catch (error) {
    console.error('🗄️ [GoogleAPI Sync] Failed to sync all vaults:', error)
  }
}
```

## 🔧 Phase 7: Active Vault Management

### Problem
- No clear active vault concept
- Multiple vaults can be active simultaneously
- No UI indication of active vault

### Solution

#### 1. Update Vault Service

**Improve setActiveVault()**:

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

/**
 * Get active vault ID
 */
export async function getActiveVaultId(): Promise<string | null> {
  try {
    const centralIndex = await db.centralIndex.get('central')
    if (!centralIndex) return null
    
    const activeVaults = Object.values(centralIndex.vaults).filter(vault => vault.isActive)
    return activeVaults.length > 0 ? activeVaults[0].id : null
    
  } catch (error) {
    console.error('Failed to get active vault ID:', error)
    return null
  }
}
```

#### 2. Update VaultTree.vue

**Add active vault indication**:

```vue
<VaultTreeItem
  :item="node.item"
  :stat="stat"
  :trigger-class="TRIGGER_CLASS"
  :is-edit-mode="isEditMode"
  :is-active-vault="node.item.type === 'vault' && node.item.id === activeVaultId"
/>
```

**Update tree building**:

```typescript
// Add active vault ID tracking
const activeVaultId = ref<string | null>(null)

// Update buildTreeFromVault to track active vault
async function buildTreeFromVault() {
  try {
    await vaultService.loadVaults()
    const activeVault = vaultService.activeVault.value
    
    if (activeVault) {
      activeVaultId.value = activeVault.id
    }
    
    // ... rest of the function
    
  } catch (error) {
    console.error('Failed to build vault tree:', error)
    treeData.value = []
  }
}
```

#### 3. Update VaultTreeItem.vue

**Add active vault styling**:

```vue
<div
  class="vault-tree-item"
  :class="{
    'is-selected': isSelected,
    'is-hovered': isHovered,
    'is-active-vault': props.isActiveVault
  }"
>
  <!-- ... -->
</div>
```

```css
.vault-tree-item.is-active-vault {
  background-color: rgba(25, 118, 210, 0.1);
  border-left: 2px solid var(--q-primary);
  
  .item-title {
    font-weight: 600;
    color: var(--q-primary);
  }
}
```

## 🔧 Phase 8: Integration and Testing

### Integration Checklist

1. **Tree Structure**: ✅ Root vault with proper hierarchy
2. **Drag-and-Drop**: ✅ Files/folders can be moved properly
3. **Renaming**: ✅ Only selected item is renamed
4. **File Opening**: ✅ Files open with correct names
5. **PWA**: ✅ Service worker registered and working
6. **Google Drive Sync**: ✅ Initialization and periodic sync
7. **Active Vault**: ✅ Clear indication and management

### Testing Plan

#### Manual Testing

1. **Tree Structure Test**
   - Create vault, files, folders
   - Verify proper hierarchy in tree
   - Verify root vault is present and renameable

2. **Drag-and-Drop Test**
   - Drag file into folder ✅
   - Drag folder into folder ✅
   - Try to drag file into file ❌ (should fail)
   - Try to drag vault ❌ (should fail)
   - Create circular reference ❌ (should fail)

3. **Renaming Test**
   - Rename single file ✅
   - Rename single folder ✅
   - Rename vault ✅
   - Try duplicate names ❌ (should fail)
   - Try empty names ❌ (should fail)

4. **File Opening Test**
   - Create file in vault
   - Click to open ✅
   - Verify name is preserved ✅
   - Verify content loads correctly ✅

5. **PWA Test**
   - Install as PWA ✅
   - Test offline functionality ✅
   - Verify service worker registration ✅
   - Test background sync ✅

6. **Google Drive Test**
   - Initialize Google Drive structure ✅
   - Verify folder creation ✅
   - Verify .repository.json creation ✅
   - Test periodic sync ✅

7. **Active Vault Test**
   - Create multiple vaults
   - Switch between vaults ✅
   - Verify only one is active ✅
   - Verify UI indication ✅

#### Automated Testing

**Create test file `test-vault-management.ts`**:

```typescript
import { describe, it, expect, beforeAll } from 'vitest'
import { db } from '../src/core/services/indexedDBService'
import { vaultService } from '../src/core/services/vaultService'
import { fileSystemService } from '../src/core/services/fileSystemService'

describe('Vault Management', () => {
  beforeAll(async () => {
    // Clean up before tests
    await db.delete()
    await db.open()
  })
  
  it('should create and manage vaults', async () => {
    // Create vault
    const vault = await vaultService.createVault('Test Vault', 'Test description')
    expect(vault).toBeDefined()
    expect(vault.name).toBe('Test Vault')
    
    // Get all vaults
    const vaults = await vaultService.getAllVaults()
    expect(vaults.length).toBe(1)
    
    // Set active vault
    await vaultService.setActiveVault(vault.id)
    const activeVault = await vaultService.getActiveVault()
    expect(activeVault?.id).toBe(vault.id)
    
    // Rename vault
    const renamedVault = await vaultService.renameVault(vault.id, 'Renamed Vault')
    expect(renamedVault.name).toBe('Renamed Vault')
    
    // Delete vault
    await vaultService.deleteVault(vault.id)
    const remainingVaults = await vaultService.getAllVaults()
    expect(remainingVaults.length).toBe(0)
  })
  
  it('should manage files and folders', async () => {
    // Create vault
    const vault = await vaultService.createVault('File Test Vault')
    await vaultService.setActiveVault(vault.id)
    
    // Create folder
    const folder = await fileSystemService.createFolder(vault.id, null, 'Test Folder')
    expect(folder).toBeDefined()
    expect(folder.type).toBe('folder')
    
    // Create file
    const fileContent = {
      version: '1.0',
      metadata: {
        id: 'test-file',
        name: 'Test File',
        created: Date.now(),
        modified: Date.now(),
        vaultId: vault.id
      },
      nodes: [],
      edges: [],
      interMapLinks: []
    }
    
    const file = await fileSystemService.createFile(vault.id, null, 'Test File', fileContent)
    expect(file).toBeDefined()
    expect(file.type).toBe('file')
    
    // Move file into folder
    await fileSystemService.moveItem(file.id, folder.id)
    
    // Get vault structure
    const structure = await fileSystemService.getVaultStructure(vault.id)
    expect(structure.length).toBe(1) // Only folder at root
    expect(structure[0].children).toContain(file.id)
    
    // Rename file
    const renamedFile = await fileSystemService.renameItem(file.id, 'Renamed File')
    expect(renamedFile.name).toBe('Renamed File')
    
    // Delete file
    await fileSystemService.deleteItem(file.id)
    
    // Delete folder
    await fileSystemService.deleteItem(folder.id)
    
    // Clean up
    await vaultService.deleteVault(vault.id)
  })
  
  it('should handle drag-and-drop validation', async () => {
    const vault = await vaultService.createVault('DnD Test Vault')
    await vaultService.setActiveVault(vault.id)
    
    // Create files and folders
    const folder1 = await fileSystemService.createFolder(vault.id, null, 'Folder 1')
    const folder2 = await fileSystemService.createFolder(vault.id, null, 'Folder 2')
    const file1 = await fileSystemService.createFile(vault.id, null, 'File 1', {
      version: '1.0',
      metadata: { id: 'file1', name: 'File 1', created: Date.now(), modified: Date.now(), vaultId: vault.id },
      nodes: [], edges: [], interMapLinks: []
    })
    
    // Test valid moves
    await expect(fileSystemService.moveItem(file1.id, folder1.id)).resolves.not.toThrow()
    await expect(fileSystemService.moveItem(folder2.id, folder1.id)).resolves.not.toThrow()
    
    // Test invalid moves (would need to be tested at UI level)
    // Files cannot be moved into files (handled by UI validation)
    // Vaults cannot be moved (handled by UI validation)
    
    // Clean up
    await fileSystemService.deleteItem(folder1.id)
    await vaultService.deleteVault(vault.id)
  })
})
```

## ✅ Success Criteria Checklist

### UI/UX Success
- [ ] ✅ Tree shows proper hierarchy with root vault
- [ ] ✅ Files can be dragged into folders
- [ ] ✅ Folders can be dragged into folders
- [ ] ✅ Only selected item is renamed
- [ ] ✅ Root vault is renameable but not movable
- [ ] ✅ Files open properly with correct names
- [ ] ✅ Active vault is clearly indicated

### Backend Success
- [ ] ✅ App is PWA with service worker
- [ ] ✅ Google Drive initialization works
- [ ] ✅ Vault structure syncs to Google Drive
- [ ] ✅ Active vault concept implemented
- [ ] ✅ Background sync operational

### Integration Success
- [ ] ✅ All components work together
- [ ] ✅ No breaking changes to existing functionality
- [ ] ✅ Performance is acceptable
- [ ] ✅ Error handling is robust

## 🎯 Implementation Order

1. **Phase 1: Tree Structure Fix** (Critical - Users can't navigate properly)
2. **Phase 2: Drag-and-Drop Fix** (Critical - Users can't organize files)
3. **Phase 3: Renaming Fix** (Critical - Data integrity issue)
4. **Phase 4: File Opening** (Critical - Core functionality missing)
5. **Phase 5: PWA Upgrade** (High - Required for sync testing)
6. **Phase 6: Google Drive Sync** (High - Background sync infrastructure)
7. **Phase 7: Active Vault** (Medium - UX improvement)
8. **Phase 8: Testing** (Critical - Ensure everything works)

## 📊 Estimated Effort

| Phase | Complexity | Estimated Time |
|-------|------------|----------------|
| 1 | Medium | 2-3 hours |
| 2 | Medium | 2-3 hours |
| 3 | Low | 1-2 hours |
| 4 | Medium | 2-3 hours |
| 5 | High | 3-4 hours |
| 6 | High | 4-5 hours |
| 7 | Low | 1-2 hours |
| 8 | Medium | 2-3 hours |

**Total**: 17-25 hours

This technical implementation plan provides specific, actionable steps to fix all identified issues with the vault management system while maintaining the existing architecture and ensuring backward compatibility.