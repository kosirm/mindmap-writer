/**
 * Google Drive Sync Service
 * Handles syncing between IndexedDB and Google Drive
 */

import { db } from './indexedDBService'
import {
  getOrCreateAppFolder,
  createMindmapFile,
  updateMindmapFile,
  createDriveFolder
} from './googleDriveService'

export interface SyncVaultResult {
  syncedFiles: number
  errors: string[]
}

export class GoogleDriveSyncService {
  /**
   * Sync a specific vault to Google Drive
   */
  static async syncVault(vaultId: string): Promise<SyncVaultResult> {
    console.log(`🔄 [GoogleDriveSync] Syncing vault: ${vaultId}`)

    try {
      // Get vault metadata
      const vault = await db.vaultMetadata.get(vaultId)
      if (!vault) {
        throw new Error(`Vault ${vaultId} not found`)
      }

      // Get all files in vault
      const files = await db.fileSystem
        .where('vaultId')
        .equals(vaultId)
        .and(item => item.type === 'file')
        .toArray()

      console.log(`🔄 [GoogleDriveSync] Found ${files.length} files to sync`)

      let syncedFiles = 0
      const errors: string[] = []

      // Sync each file
      for (const file of files) {
        try {
          await this.syncFile(vaultId, file.id)
          syncedFiles++
        } catch (error) {
          console.error(`🔄 [GoogleDriveSync] Failed to sync file ${file.id}:`, error)
          errors.push(`Failed to sync ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      console.log(`🔄 [GoogleDriveSync] Synced ${syncedFiles}/${files.length} files`)

      return {
        syncedFiles,
        errors
      }
    } catch (error) {
      console.error(`🔄 [GoogleDriveSync] Vault sync failed:`, error)
      throw error
    }
  }

  /**
   * Sync a specific file to Google Drive
   */
  static async syncFile(vaultId: string, fileId: string): Promise<void> {
    console.log(`🔄 [GoogleDriveSync] Syncing file: ${fileId}`)

    try {
      // Get file system item
      const fileItem = await db.fileSystem.get(fileId)
      if (!fileItem || fileItem.type !== 'file') {
        throw new Error(`File ${fileId} not found`)
      }

      // Get document content
      const document = await db.documents.get(fileItem.fileId || fileId)
      if (!document) {
        throw new Error(`Document content not found for file ${fileId}`)
      }

      // Get vault metadata
      const vault = await db.vaultMetadata.get(vaultId)
      if (!vault) {
        throw new Error(`Vault ${vaultId} not found`)
      }

      // Get or create the vault folder on Google Drive
      let vaultFolderId = vault.folderId
      if (!vaultFolderId) {
        // Create vault folder under MindPad folder
        const appFolderId = await getOrCreateAppFolder()
        const vaultFolder = await createDriveFolder(vault.name, appFolderId)
        vaultFolderId = vaultFolder.id

        // Update vault metadata with folder ID
        vault.folderId = vaultFolderId
        await db.vaultMetadata.put(vault)
      }

      // Prepare file name
      const fileName = fileItem.name.endsWith('.mindpad') ? fileItem.name : `${fileItem.name}.mindpad`

      // Check if we already have a Drive file ID stored
      if (fileItem.driveFileId) {
        // Update existing file
        console.log(`🔄 [GoogleDriveSync] Updating existing file: ${fileName}`)
        try {
          await updateMindmapFile(fileItem.driveFileId, document, fileName)
        } catch (error) {
          // If update fails (file might have been deleted), create new file
          console.warn(`⚠️ [GoogleDriveSync] Update failed, creating new file:`, error)
          const createdFile = await createMindmapFile(vaultFolderId, fileName, document)
          fileItem.driveFileId = createdFile.id
          await db.fileSystem.put(fileItem)
        }
      } else {
        // Create new file
        console.log(`🔄 [GoogleDriveSync] Creating new file: ${fileName}`)
        const createdFile = await createMindmapFile(vaultFolderId, fileName, document)

        // Store the Google Drive file ID in the file system item
        fileItem.driveFileId = createdFile.id
        await db.fileSystem.put(fileItem)
      }

      console.log(`✅ [GoogleDriveSync] Successfully synced file: ${fileName}`)

    } catch (error) {
      console.error(`🔄 [GoogleDriveSync] File sync failed:`, error)
      throw error
    }
  }

  /**
   * Sync all vaults to Google Drive
   */
  static async syncAllVaults(): Promise<SyncVaultResult> {
    console.log('🔄 [GoogleDriveSync] Syncing all vaults')

    try {
      // Get all vaults
      const vaults = await db.vaultMetadata.toArray()

      let totalSyncedFiles = 0
      const allErrors: string[] = []

      // Sync each vault
      for (const vault of vaults) {
        try {
          const result = await this.syncVault(vault.id)
          totalSyncedFiles += result.syncedFiles
          allErrors.push(...result.errors)
        } catch (error) {
          console.error(`🔄 [GoogleDriveSync] Failed to sync vault ${vault.id}:`, error)
          allErrors.push(`Failed to sync vault ${vault.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      console.log(`🔄 [GoogleDriveSync] Total synced files: ${totalSyncedFiles}`)

      return {
        syncedFiles: totalSyncedFiles,
        errors: allErrors
      }
    } catch (error) {
      console.error('🔄 [GoogleDriveSync] All vaults sync failed:', error)
      throw error
    }
  }

  /**
   * Check if Google Drive is authenticated
   */
  static isAuthenticated(): Promise<boolean> {
    // TODO: Implement actual Google Drive authentication check
    return Promise.resolve(false)
  }

  /**
   * Initialize Google Drive sync
   */
  static initialize(): Promise<void> {
    console.log('🔄 [GoogleDriveSync] Initializing')

    // TODO: Implement Google Drive initialization
    // - Check authentication
    // - Create Mindpad folder if needed
    // - Initialize vault structure
    return Promise.resolve()
  }
}

