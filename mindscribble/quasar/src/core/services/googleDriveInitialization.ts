/**
 * Google Drive Initialization Service
 * Handles first-time setup and Google Drive structure creation
 */

import { db } from './indexedDBService'
import { GoogleAuthService } from './googleAuthService'
import * as googleDriveService from './googleDriveService'

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
      await googleDriveService.createDriveFile(appFolderId, this.LOCK_FILE_NAME, lockContent)
      console.log('🔒 [GoogleDriveInit] Created .lock file')
    }
  }

  /**
   * Create Mindpad app folder on Google Drive
   */
  private static async createAppFolder(): Promise<{ id: string, name: string }> {
    // Check if folder already exists
    const existingFolder = await googleDriveService.findDriveFolder(this.MINDPAD_FOLDER_NAME)
    if (existingFolder) {
      console.log('📁 [GoogleDriveInit] App folder already exists')
      return existingFolder
    }

    // Create new folder
    const folder = await googleDriveService.createDriveFolder(this.MINDPAD_FOLDER_NAME, null)
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
      await googleDriveService.updateDriveFileContent(existingFile.id, indexContent)
      console.log('📄 [GoogleDriveInit] Updated .vaults index file')
    } else {
      // Create new file
      await googleDriveService.createDriveFile(appFolderId, this.VAULTS_INDEX_FILE_NAME, indexContent)
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
    const vaultFolder = await googleDriveService.createDriveFolder(vault.name, appFolderId)

    // 2. Update vault metadata with Drive folder ID
    await db.vaultMetadata.update(vault.id, { folderId: vaultFolder.id })

    // 3. Get all files and folders in this vault
    const fileSystemItems = await db.fileSystem.where('vaultId').equals(vault.id).toArray()

    // 4. Build repository structure for .repository.json
    const repositoryStructure: Record<string, {
      id: string;
      name: string;
      type: string;
      parentId: string | null;
      driveFileId?: string;
      fileId?: string;
      created: number;
      modified: number;
      size?: number;
    }> = {}

    // 5. Sync all files and folders
    for (const item of fileSystemItems) {
      if (item.type === 'folder') {
        // Create folder on Drive
        const parentDriveId = item.parentId
          ? (await db.fileSystem.get(item.parentId))?.driveFileId || vaultFolder.id
          : vaultFolder.id
        const driveFolder = await googleDriveService.createDriveFolder(item.name, parentDriveId)

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
          const driveFile = await googleDriveService.createDriveFile(parentDriveId, fileName, document)

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

    await googleDriveService.createDriveFile(
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
      const appFolder = await googleDriveService.findDriveFolder(this.MINDPAD_FOLDER_NAME)
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
