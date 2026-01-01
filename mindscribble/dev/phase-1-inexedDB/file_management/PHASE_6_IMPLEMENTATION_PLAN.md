# Phase 6 Implementation Plan: First-Time Initialization and Google Drive Sync

## 🎯 Overview

This document outlines the detailed implementation plan for Phase 6, focusing on:
1. **First-Time Initialization** - Create default vault and initialize Google Drive structure
2. **Google Drive Integration** - Sync vault structure and files to Google Drive
3. **OAuth Token Management** - Handle authentication and token refresh
4. **Offline Support** - Work offline with graceful degradation

## 📋 Key Components

### 1. Google Drive Structure

```
MindPad/                    (App folder)
├── .vaults                      (Index of all vaults)
├── .lock                        (Lock file for concurrent access)
├── Vault 1/                     (Vault folder)
│   ├── .repository.json         (Vault structure snapshot for sync)
│   ├── file1.json               (File - uses .json extension)
│   ├── folder1/                 (Folder)
│   │   ├── file2.json
│   │   └── file3.json
│   └── ...
├── Vault 2/                     (Another vault)
│   ├── .repository.json
│   └── file4.json
└── ...
```

### 2. New Services

#### GoogleAuthService
- `refreshTokenIfNeeded()` - Refresh OAuth token before expiry
- `startTokenRefreshTimer()` - Start background token refresh timer
- `stopTokenRefreshTimer()` - Stop token refresh timer
- `ensureAuthenticated()` - Check authentication status

#### GoogleDriveInitializationService
- `initializeFirstTime()` - Main initialization method
- `createAppFolder()` - Create MindPad app folder
- `createLockFile()` - Create .lock file for concurrent access
- `createVaultsIndexFile()` - Create/update .vaults index file
- `initializeVaultOnDrive()` - Initialize vault structure on Google Drive
- `updateVaultsIndex()` - Update .vaults index when vaults change

### 3. IndexedDB Schema Updates

#### FileSystemItem Interface Update
```typescript
export interface FileSystemItem {
  id: string;
  vaultId: string;
  parentId: string | null;
  name: string;
  type: FileSystemItemType;
  created: number;
  modified: number;
  sortOrder: number;
  size?: number;
  fileId?: string;
  children?: string[];
  driveFileId?: string; // NEW: Google Drive file/folder ID
}
```

## 🚀 Implementation Steps

### Step 1: Create GoogleAuthService

**File**: `src/core/services/googleAuthService.ts`

```typescript
/**
 * Google OAuth Authentication Service
 * Handles token management and authentication state
 */

export class GoogleAuthService {
  private static tokenRefreshTimer: number | null = null
  private static isRefreshing = false

  /**
   * Refresh OAuth token if needed (5 minutes before expiry)
   */
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

  /**
   * Start automatic token refresh timer (every 50 minutes)
   */
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

  /**
   * Stop token refresh timer
   */
  static stopTokenRefreshTimer(): void {
    if (this.tokenRefreshTimer) {
      window.clearInterval(this.tokenRefreshTimer)
      this.tokenRefreshTimer = null
    }
  }

  /**
   * Check if user is authenticated
   */
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

### Step 2: Create GoogleDriveInitializationService

**File**: `src/core/services/googleDriveInitialization.ts`

```typescript
/**
 * Google Drive Initialization Service
 * Handles first-time setup and Google Drive structure creation
 */

import { db } from './indexedDBService'
import { GoogleAuthService } from './googleAuthService'
import { googleDriveService } from './googleDriveService'

export class GoogleDriveInitializationService {
  private static MINDPAD_FOLDER_NAME = 'MindPad'
  private static VAULTS_INDEX_FILE_NAME = '.vaults'
  private static LOCK_FILE_NAME = '.lock'
  private static REPOSITORY_FILE_NAME = '.repository.json'
  private static FILE_EXTENSION = '.json'

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

      // 1. Create MindPad app folder on Google Drive
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
   * Create Mindpad app folder on Google Drive
   */
  private static async createAppFolder(): Promise<{ id: string, name: string }> {
    // Check if folder already exists
    const existingFolder = await googleDriveService.findFolder(this.MINDPAD_FOLDER_NAME)
    if (existingFolder) {
      console.log('📁 [GoogleDriveInit] App folder already exists')
      return existingFolder
    }

    // Create new folder
    const folder = await googleDriveService.createFolder(this.MINDPAD_FOLDER_NAME, null)
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
    console.log('🗄️ [GoogleDriveInit] Initializing vault on Drive:', vault.name)

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

          // Use .json extension instead of .mindpad
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
      const appFolder = await googleDriveService.findFolder(this.MINDPAD_FOLDER_NAME)
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

### Step 3: Update IndexedDB Schema

**File**: `src/core/services/indexedDBService.ts`

Add `driveFileId` field to FileSystemItem interface and ensure it's included in the schema:

```typescript
// Update FileSystemItem interface
export interface FileSystemItem {
  id: string;
  vaultId: string;
  parentId: string | null;
  name: string;
  type: FileSystemItemType;
  created: number;
  modified: number;
  sortOrder: number;
  size?: number;
  fileId?: string;
  children?: string[];
  driveFileId?: string; // NEW: Google Drive file/folder ID
}

// Update schema in MindPadDB class
this.version(8).stores({
  documents: 'metadata.id, metadata.modified, metadata.vaultId',
  nodes: 'id, mapId, vaultId, modified',
  settings: 'id',
  errorLogs: 'id, timestamp',
  providerMetadata: 'id, documentId, providerId, lastSyncedAt, syncStatus',
  repositories: 'repositoryId, lastUpdated',
  centralIndex: 'id',
  vaultMetadata: 'id, folderId, isActive',
  vaultsIndex: 'id',
  fileSystem: 'id, vaultId, parentId, type, name, sortOrder, driveFileId', // Updated
  uiState: 'id',
  fileLayouts: 'fileId'
}).upgrade(async (tx) => {
  console.log('🗄️ [IndexedDB] Version 8: Adding driveFileId field to fileSystem')
  
  // Add driveFileId field to existing items (initially null)
  const fileSystemTable = tx.table('fileSystem')
  const allItems = await fileSystemTable.toArray()
  
  for (const item of allItems) {
    if (!item.driveFileId) {
      await fileSystemTable.update(item.id, { driveFileId: null })
    }
  }
  
  console.log('🗄️ [IndexedDB] Added driveFileId field to', allItems.length, 'items')
})
```

### Step 4: Update IndexedDB Boot File

**File**: `src/boot/indexedDB.ts`

```typescript
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

### Step 5: Update Vault Store

**File**: `src/core/stores/vaultStore.ts`

```typescript
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

### Step 6: Update GoogleDriveService

**File**: `src/core/services/googleDriveService.ts`

Add helper methods needed for initialization:

```typescript
// Add to googleDriveService

/**
 * Find folder by name in root
 */
async function findFolder(name: string): Promise<{ id: string, name: string } | null> {
  try {
    const response = await gapi.client.drive.files.list({
      q: `mimeType='application/vnd.google-apps.folder' and name='${name}' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    })

    const files = response.result.files || []
    return files.length > 0 ? { id: files[0].id, name: files[0].name } : null

  } catch (error) {
    console.error('Failed to find folder:', error)
    return null
  }
}

/**
 * Find file in specific folder
 */
async function findFileInFolder(folderId: string, fileName: string): Promise<{ id: string, name: string } | null> {
  try {
    const response = await gapi.client.drive.files.list({
      q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    })

    const files = response.result.files || []
    return files.length > 0 ? { id: files[0].id, name: files[0].name } : null

  } catch (error) {
    console.error('Failed to find file in folder:', error)
    return null
  }
}

/**
 * Create folder in parent
 */
async function createFolder(name: string, parentId: string | null): Promise<{ id: string, name: string }> {
  try {
    const fileMetadata = {
      name: name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : []
    }

    const response = await gapi.client.drive.files.create({
      resource: fileMetadata,
      fields: 'id, name'
    })

    return { id: response.result.id, name: response.result.name }

  } catch (error) {
    console.error('Failed to create folder:', error)
    throw new Error('Failed to create folder')
  }
}

/**
 * Create file in parent
 */
async function createFile(parentId: string, fileName: string, content: any): Promise<{ id: string, name: string }> {
  try {
    const fileMetadata = {
      name: fileName,
      parents: [parentId]
    }

    const media = {
      mimeType: 'application/json',
      body: JSON.stringify(content, null, 2)
    }

    const response = await gapi.client.drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, name'
    })

    return { id: response.result.id, name: response.result.name }

  } catch (error) {
    console.error('Failed to create file:', error)
    throw new Error('Failed to create file')
  }
}

/**
 * Update file content
 */
async function updateFileContent(fileId: string, content: any): Promise<void> {
  try {
    const media = {
      mimeType: 'application/json',
      body: JSON.stringify(content, null, 2)
    }

    await gapi.client.drive.files.update({
      fileId: fileId,
      media: media
    })

  } catch (error) {
    console.error('Failed to update file content:', error)
    throw new Error('Failed to update file content')
  }
}
```

## 🧪 Testing Plan

### First-Time Initialization Tests
1. **First-time app launch**
   - Launch app with clean IndexedDB
   - Verify default vault "My Vault" is created
   - Verify vault is marked as active

2. **Google Drive initialization**
   - Authenticate with Google
   - Verify MindPad folder is created
   - Verify .vaults file is created
   - Verify .lock file is created
   - Verify default vault folder is created

3. **Offline initialization**
   - Launch app without authentication
   - Verify default vault is created in IndexedDB
   - Verify no errors occur

### Vault Index Management Tests
1. **Create new vault**
   - Create new vault
   - Verify .vaults file is updated on Google Drive
   - Verify new vault appears in index

2. **Rename vault**
   - Rename existing vault
   - Verify .vaults file is updated
   - Verify vault name is updated in index

3. **Delete vault**
   - Delete vault
   - Verify .vaults file is updated
   - Verify vault is removed from index

### OAuth Token Management Tests
1. **Token refresh**
   - Verify token refresh timer starts on initialization
   - Verify token is refreshed before expiry

2. **Offline handling**
   - Work offline
   - Verify no authentication errors occur
   - Verify sync happens when back online

## ✅ Success Criteria

- [ ] First-time app launch creates default vault automatically
- [ ] Google Drive folder structure is created correctly
- [ ] .vaults index file is created and maintained
- [ ] .lock file is created for concurrent access control
- [ ] Vault structure is synced to Google Drive with proper .repository.json files
- [ ] OAuth token refresh works automatically
- [ ] Offline mode works without errors
- [ ] Vault index is updated when vaults are created, renamed, or deleted

## 📋 Files to Create/Modify

### New Files
- `src/core/services/googleAuthService.ts`
- `src/core/services/googleDriveInitialization.ts`

### Modified Files
- `src/core/services/indexedDBService.ts` (add driveFileId field)
- `src/core/services/googleDriveService.ts` (add helper methods)
- `src/boot/indexedDB.ts` (add first-time setup)
- `src/core/stores/vaultStore.ts` (sync index on changes)

## 🎯 Benefits

- ✅ **Zero-config first use** - Default vault created automatically
- ✅ **Seamless sync** - Vault structure synced to Google Drive
- ✅ **Index file** - .vaults file tracks all vaults
- ✅ **Lock file** - .lock file for concurrent access control
- ✅ **Repository files** - .repository.json per vault for efficient sync
- ✅ **Standard format** - Uses .json extension instead of .mindpad
- ✅ **OAuth management** - Automatic token refresh
- ✅ **Offline support** - Works without internet
- ✅ **Partial sync ready** - Drive IDs and timestamps enable efficient sync

## 🎯 Implementation Priority

This phase should be implemented after Phase 5 (Sync Strategy) is complete, as it builds upon the sync infrastructure and adds the Google Drive integration layer.