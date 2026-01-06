/**
 * Vault Metadata Service
 *
 * Manages the .vaults index file that contains metadata about all available vaults.
 * This service handles the vaultsIndex table in IndexedDB which represents the
 * .vaults file from Google Drive.
 *
 * Key Responsibilities:
 * - Manage vaults index (create, read, update, delete)
 * - Add/remove vaults from index
 * - Handle vault metadata operations
 * - Emit events for vault index changes
 */

import { db, type VaultsIndex, type VaultMetadata } from './indexedDBService'
import { eventBus } from '../events'

export class VaultMetadataService {

  /**
   * Get the vaults index from IndexedDB
   * Creates default index if it doesn't exist
   */
  static async getVaultsIndex(): Promise<VaultsIndex> {
    try {
      const index = await db.vaultsIndex.get('vaults')
      if (!index) {
        // Create default empty index
        const defaultIndex: VaultsIndex = {
          id: 'vaults',
          version: '1.0',
          lastUpdated: Date.now(),
          vaults: []
        }
        await db.vaultsIndex.put(defaultIndex)
        return defaultIndex
      }
      return index
    } catch (error) {
      console.error('🗄️ [VaultMetadataService] Failed to get vaults index:', error)
      throw new Error('Failed to get vaults index')
    }
  }

  /**
   * Update the vaults index in IndexedDB
   */
  static async updateVaultsIndex(index: VaultsIndex): Promise<void> {
    try {
      index.lastUpdated = Date.now()
      await db.vaultsIndex.put(index)

      // Emit event for vaults index update
      eventBus.emit('vaults:index-updated', { index })

      console.log('🗄️ [VaultMetadataService] Vaults index updated:', index.vaults.length, 'vaults')
    } catch (error) {
      console.error('🗄️ [VaultMetadataService] Failed to update vaults index:', error)
      throw new Error('Failed to update vaults index')
    }
  }

  /**
   * Add a vault to the vaults index
   * If vault already exists, it will be updated
   */
  static async addVaultToIndex(vault: VaultMetadata): Promise<void> {
    try {
      const index = await this.getVaultsIndex()

      // Check if vault already exists
      const existingIndex = index.vaults.findIndex(v => v.id === vault.id)

      if (existingIndex !== -1) {
        // Update existing vault
        index.vaults[existingIndex] = { ...vault }
        console.log('🗄️ [VaultMetadataService] Updated existing vault in index:', vault.name)
      } else {
        // Add new vault
        index.vaults.push({ ...vault })
        console.log('🗄️ [VaultMetadataService] Added new vault to index:', vault.name)
      }

      await this.updateVaultsIndex(index)
    } catch (error) {
      console.error('🗄️ [VaultMetadataService] Failed to add vault to index:', error)
      throw new Error('Failed to add vault to index')
    }
  }

  /**
   * Remove a vault from the vaults index
   */
  static async removeVaultFromIndex(vaultId: string): Promise<void> {
    try {
      const index = await this.getVaultsIndex()

      // Find vault to remove
      const vaultToRemove = index.vaults.find(v => v.id === vaultId)
      if (vaultToRemove) {
        console.log('🗄️ [VaultMetadataService] Removing vault from index:', vaultToRemove.name)
      }

      // Remove vault from index
      index.vaults = index.vaults.filter(v => v.id !== vaultId)

      await this.updateVaultsIndex(index)
    } catch (error) {
      console.error('🗄️ [VaultMetadataService] Failed to remove vault from index:', error)
      throw new Error('Failed to remove vault from index')
    }
  }

  /**
   * Get a specific vault from the vaults index
   */
  static async getVaultFromIndex(vaultId: string): Promise<VaultMetadata | null> {
    try {
      const index = await this.getVaultsIndex()
      const vault = index.vaults.find(v => v.id === vaultId) || null
      return vault
    } catch (error) {
      console.error('🗄️ [VaultMetadataService] Failed to get vault from index:', error)
      throw new Error('Failed to get vault from index')
    }
  }

  /**
   * Get all vaults from the vaults index
   */
  static async getAllVaults(): Promise<VaultMetadata[]> {
    try {
      const index = await this.getVaultsIndex()
      return index.vaults
    } catch (error) {
      console.error('🗄️ [VaultMetadataService] Failed to get all vaults:', error)
      throw new Error('Failed to get all vaults')
    }
  }

  /**
   * Clear all vaults from the vaults index
   * Use with caution!
   */
  static async clearVaultsIndex(): Promise<void> {
    try {
      const defaultIndex: VaultsIndex = {
        id: 'vaults',
        version: '1.0',
        lastUpdated: Date.now(),
        vaults: []
      }
      await db.vaultsIndex.put(defaultIndex)

      eventBus.emit('vaults:index-cleared', {})

      console.log('🗄️ [VaultMetadataService] Vaults index cleared')
    } catch (error) {
      console.error('🗄️ [VaultMetadataService] Failed to clear vaults index:', error)
      throw new Error('Failed to clear vaults index')
    }
  }

  /**
   * Initialize vaults index with default data
   * Useful for testing and first-time setup
   */
  static async initializeWithDefaultVaults(): Promise<VaultMetadata> {
   try {
     const defaultVault: VaultMetadata = {
       id: `vault-${Date.now()}`,
       name: 'My First Vault',
       description: 'Default vault created during initialization',
       created: Date.now(),
       modified: Date.now(),
       folderId: '', // Will be populated when synced to Google Drive
       repositoryFileId: '', // Will be populated when synced to Google Drive
       fileCount: 0,
       folderCount: 0,
       size: 0,
       isActive: true
     }

     const index: VaultsIndex = {
       id: 'vaults',
       version: '1.0',
       lastUpdated: Date.now(),
       vaults: [defaultVault]
     }

     await db.vaultsIndex.put(index)

     console.log('🗄️ [VaultMetadataService] Initialized with default vault:', defaultVault.name)

     return defaultVault
   } catch (error) {
     console.error('🗄️ [VaultMetadataService] Failed to initialize with default vaults:', error)
     throw new Error('Failed to initialize with default vaults')
   }
 }

  /**
   * Check if a vault with the given name already exists
   */
  static async vaultNameExists(name: string): Promise<boolean> {
    try {
      const index = await this.getVaultsIndex()
      return index.vaults.some(v => v.name.toLowerCase() === name.toLowerCase())
    } catch (error) {
      console.error('🗄️ [VaultMetadataService] Failed to check vault name existence:', error)
      throw new Error('Failed to check vault name existence')
    }
  }

  /**
   * Generate a unique vault name by appending a number if needed
   */
  static async generateUniqueVaultName(baseName: string): Promise<string> {
    try {
      let uniqueName = baseName
      let counter = 1

      while (await this.vaultNameExists(uniqueName)) {
        uniqueName = `${baseName} ${counter}`
        counter++
      }

      return uniqueName
    } catch (error) {
      console.error('🗄️ [VaultMetadataService] Failed to generate unique vault name:', error)
      throw new Error('Failed to generate unique vault name')
    }
  }

  /**
   * Create a new vault metadata object
   */
  static createVaultMetadata(
    name: string,
    description: string = '',
    options: Partial<VaultMetadata> = {}
  ): VaultMetadata {
    return {
      id: `vault-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      name,
      description,
      created: Date.now(),
      modified: Date.now(),
      folderId: '',
      repositoryFileId: '',
      fileCount: 0,
      folderCount: 0,
      size: 0,
      isActive: false,
      ...options
    }
  }

  /**
   * Update vault metadata in the index
   */
  static async updateVaultMetadata(
   vaultId: string,
   updates: Partial<VaultMetadata>
 ): Promise<VaultMetadata> {
   try {
     const index = await this.getVaultsIndex()
     const vaultIndex = index.vaults.findIndex(v => v.id === vaultId)

     if (vaultIndex === -1) {
       throw new Error(`Vault ${vaultId} not found in index`)
     }

     // Update vault metadata
     const existingVault = index.vaults[vaultIndex]
     const updatedVault = {
       ...existingVault,
       ...updates,
       modified: Date.now()
     } as VaultMetadata
     index.vaults[vaultIndex] = updatedVault

     await this.updateVaultsIndex(index)

     return updatedVault
   } catch (error) {
     console.error('🗄️ [VaultMetadataService] Failed to update vault metadata:', error)
     throw new Error('Failed to update vault metadata')
   }
 }

  /**
   * Set active vault in the index
   * Only one vault can be active at a time
   */
  static async setActiveVault(vaultId: string): Promise<void> {
    try {
      const index = await this.getVaultsIndex()

      // Deactivate all vaults first
      index.vaults.forEach(vault => {
        vault.isActive = false
      })

      // Activate the selected vault
      const vault = index.vaults.find(v => v.id === vaultId)
      if (vault) {
        vault.isActive = true
        vault.modified = Date.now()
      }

      await this.updateVaultsIndex(index)

      console.log('🗄️ [VaultMetadataService] Active vault set:', vault?.name || vaultId)
    } catch (error) {
      console.error('🗄️ [VaultMetadataService] Failed to set active vault:', error)
      throw new Error('Failed to set active vault')
    }
  }

  /**
   * Get the currently active vault from the index
   */
  static async getActiveVault(): Promise<VaultMetadata | null> {
    try {
      const index = await this.getVaultsIndex()
      const activeVault = index.vaults.find(v => v.isActive) || null
      return activeVault
    } catch (error) {
      console.error('🗄️ [VaultMetadataService] Failed to get active vault:', error)
      throw new Error('Failed to get active vault')
    }
  }

  /**
   * Get vault count from the index
   */
  static async getVaultCount(): Promise<number> {
    try {
      const index = await this.getVaultsIndex()
      return index.vaults.length
    } catch (error) {
      console.error('🗄️ [VaultMetadataService] Failed to get vault count:', error)
      throw new Error('Failed to get vault count')
    }
  }

  /**
   * Check if any vaults exist in the index
   */
  static async hasVaults(): Promise<boolean> {
    try {
      const count = await this.getVaultCount()
      return count > 0
    } catch (error) {
      console.error('🗄️ [VaultMetadataService] Failed to check if vaults exist:', error)
      throw new Error('Failed to check if vaults exist')
    }
  }

  /**
   * Export vaults index for backup
   */
  static async exportVaultsIndex(): Promise<VaultsIndex> {
    try {
      const index = await this.getVaultsIndex()
      // Create a clean copy without internal fields
      const exportIndex: VaultsIndex = {
        id: index.id,
        version: index.version,
        lastUpdated: index.lastUpdated,
        vaults: index.vaults.map(vault => ({
          id: vault.id,
          name: vault.name,
          description: vault.description || '',
          created: vault.created,
          modified: vault.modified,
          folderId: vault.folderId,
          repositoryFileId: vault.repositoryFileId,
          fileCount: vault.fileCount,
          folderCount: vault.folderCount,
          size: vault.size,
          isActive: vault.isActive || false
        }))
      }
      return exportIndex
    } catch (error) {
      console.error('🗄️ [VaultMetadataService] Failed to export vaults index:', error)
      throw new Error('Failed to export vaults index')
    }
  }

  /**
   * Import vaults index from backup
   */
  static async importVaultsIndex(index: VaultsIndex): Promise<void> {
    try {
      // Validate index
      if (!index || !index.vaults || !Array.isArray(index.vaults)) {
        throw new Error('Invalid vaults index format')
      }

      // Ensure proper format
      const validatedIndex: VaultsIndex = {
        id: 'vaults',
        version: index.version || '1.0',
        lastUpdated: Date.now(),
        vaults: index.vaults.map(vault => ({
          id: vault.id || `vault-${Date.now()}`,
          name: vault.name || 'Unnamed Vault',
          description: vault.description || '',
          created: vault.created || Date.now(),
          modified: vault.modified || Date.now(),
          folderId: vault.folderId || '',
          repositoryFileId: vault.repositoryFileId || '',
          fileCount: vault.fileCount || 0,
          folderCount: vault.folderCount || 0,
          size: vault.size || 0,
          isActive: vault.isActive || false
        }))
      }

      await this.updateVaultsIndex(validatedIndex)

      console.log('🗄️ [VaultMetadataService] Vaults index imported:', validatedIndex.vaults.length, 'vaults')
    } catch (error) {
      console.error('🗄️ [VaultMetadataService] Failed to import vaults index:', error)
      throw new Error('Failed to import vaults index')
    }
  }

  /**
   * Get vault statistics from the index
   */
  static async getVaultStatistics(): Promise<{
    totalVaults: number
    totalFiles: number
    totalFolders: number
    totalSize: number
    activeVaults: number
  }> {
    try {
      const index = await this.getVaultsIndex()

      return index.vaults.reduce((stats, vault) => {
        return {
          totalVaults: index.vaults.length,
          totalFiles: stats.totalFiles + (vault.fileCount || 0),
          totalFolders: stats.totalFolders + (vault.folderCount || 0),
          totalSize: stats.totalSize + (vault.size || 0),
          activeVaults: stats.activeVaults + (vault.isActive ? 1 : 0)
        }
      }, {
        totalVaults: 0,
        totalFiles: 0,
        totalFolders: 0,
        totalSize: 0,
        activeVaults: 0
      })
    } catch (error) {
      console.error('🗄️ [VaultMetadataService] Failed to get vault statistics:', error)
      throw new Error('Failed to get vault statistics')
    }
  }
}

// Export types for external use
export type { VaultsIndex, VaultMetadata } from './indexedDBService'
