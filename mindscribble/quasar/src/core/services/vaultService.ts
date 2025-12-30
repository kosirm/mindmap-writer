/**
 * Vault Service
 * Handles vault operations including creation, opening, deletion, and switching
 */

import { db } from './indexedDBService'
import type { VaultMetadata } from './indexedDBService'

/**
 * Get all vaults from the central index
 */
export async function getAllVaults(): Promise<VaultMetadata[]> {
  try {
    const centralIndex = await db.centralIndex.get('central')
    if (!centralIndex) {
      return []
    }
    return Object.values(centralIndex.vaults)
  } catch (error) {
    console.error('Failed to get all vaults:', error)
    throw new Error('Failed to retrieve vaults')
  }
}

/**
 * Get a specific vault by ID
 */
export async function getVault(vaultId: string): Promise<VaultMetadata | null> {
  try {
    const vault = await db.vaultMetadata.get(vaultId)
    return vault || null
  } catch (error) {
    console.error(`Failed to get vault ${vaultId}:`, error)
    throw new Error(`Failed to retrieve vault ${vaultId}`)
  }
}

/**
 * Create a new vault
 */
export async function createVault(name: string, description: string = ''): Promise<VaultMetadata> {
  try {
    // Get current central index
    let centralIndex = await db.centralIndex.get('central')

    if (!centralIndex) {
      // Create new central index if it doesn't exist
      centralIndex = {
        id: 'central',
        version: '1.0',
        lastUpdated: Date.now(),
        vaults: {}
      }
    }

    // Generate new vault ID
    const vaultId = `vault-${Date.now()}`

    // Create new vault metadata
    const newVault: VaultMetadata = {
      id: vaultId,
      name,
      description,
      created: Date.now(),
      modified: Date.now(),
      folderId: '',
      repositoryFileId: '',
      fileCount: 0,
      folderCount: 0,
      size: 0,
      isActive: false // New vaults are not active by default
    }

    // Add to central index
    centralIndex.vaults[vaultId] = newVault
    centralIndex.lastUpdated = Date.now()

    // Store both central index and vault metadata
    await db.centralIndex.put(centralIndex)
    await db.vaultMetadata.add(newVault)

    return newVault
  } catch (error) {
    console.error('Failed to create vault:', error)
    throw new Error('Failed to create vault')
  }
}

/**
 * Delete a vault
 */
export async function deleteVault(vaultId: string): Promise<void> {
  try {
    // Get current central index
    const centralIndex = await db.centralIndex.get('central')

    if (!centralIndex || !centralIndex.vaults[vaultId]) {
      throw new Error(`Vault ${vaultId} not found`)
    }

    // Remove vault from central index
    delete centralIndex.vaults[vaultId]
    centralIndex.lastUpdated = Date.now()

    // Update central index
    await db.centralIndex.put(centralIndex)

    // Delete vault metadata
    await db.vaultMetadata.delete(vaultId)

    // TODO: In future phases, we'll need to handle cleanup of actual files
    // associated with this vault
  } catch (error) {
    console.error(`Failed to delete vault ${vaultId}:`, error)
    throw new Error(`Failed to delete vault ${vaultId}`)
  }
}

/**
 * Set the active vault
 */
export async function setActiveVault(vaultId: string): Promise<void> {
  try {
    // Get current central index
    const centralIndex = await db.centralIndex.get('central')

    if (!centralIndex || !centralIndex.vaults[vaultId]) {
      throw new Error(`Vault ${vaultId} not found`)
    }

    // Deactivate all vaults first
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
  } catch (error) {
    console.error(`Failed to set active vault ${vaultId}:`, error)
    throw new Error(`Failed to set active vault ${vaultId}`)
  }
}

/**
 * Get the active vault
 */
export async function getActiveVault(): Promise<VaultMetadata | null> {
  try {
    const centralIndex = await db.centralIndex.get('central')

    if (!centralIndex) {
      return null
    }

    // Find the active vault
    const activeVaults = Object.values(centralIndex.vaults).filter(vault => vault.isActive)

    if (activeVaults.length === 0) {
      // If no active vault, return the first one or null
      const allVaults = Object.values(centralIndex.vaults)
      const firstVault = allVaults.length > 0 ? allVaults[0] : null
      return firstVault ?? null
    }

    const firstActiveVault = activeVaults.length > 0 ? activeVaults[0] : null
    return firstActiveVault ?? null
  } catch (error) {
    console.error('Failed to get active vault:', error)
    throw new Error('Failed to retrieve active vault')
  }
}

/**
 * Update vault metadata
 */
export async function updateVaultMetadata(vaultId: string, updates: Partial<VaultMetadata>): Promise<VaultMetadata> {
  try {
    // Get current central index
    const centralIndex = await db.centralIndex.get('central')

    if (!centralIndex || !centralIndex.vaults[vaultId]) {
      throw new Error(`Vault ${vaultId} not found`)
    }

    // Update vault metadata
    const updatedVault = { ...centralIndex.vaults[vaultId], ...updates, modified: Date.now() }
    centralIndex.vaults[vaultId] = updatedVault
    centralIndex.lastUpdated = Date.now()

    // Update both central index and vault metadata
    await db.centralIndex.put(centralIndex)
    await db.vaultMetadata.put(updatedVault)

    return updatedVault
  } catch (error) {
    console.error(`Failed to update vault ${vaultId}:`, error)
    throw new Error(`Failed to update vault ${vaultId}`)
  }
}

/**
 * Rename a vault
 */
export async function renameVault(vaultId: string, newName: string): Promise<VaultMetadata> {
  return updateVaultMetadata(vaultId, { name: newName })
}

/**
 * Update vault description
 */
export async function updateVaultDescription(vaultId: string, newDescription: string): Promise<VaultMetadata> {
  return updateVaultMetadata(vaultId, { description: newDescription })
}

/**
 * Increment file count for a vault
 */
export async function incrementVaultFileCount(vaultId: string): Promise<void> {
  try {
    const vault = await getVault(vaultId)
    if (!vault) {
      throw new Error(`Vault ${vaultId} not found`)
    }

    await updateVaultMetadata(vaultId, { fileCount: vault.fileCount + 1 })
  } catch (error) {
    console.error(`Failed to increment file count for vault ${vaultId}:`, error)
    throw new Error(`Failed to increment file count for vault ${vaultId}`)
  }
}

/**
 * Decrement file count for a vault
 */
export async function decrementVaultFileCount(vaultId: string): Promise<void> {
  try {
    const vault = await getVault(vaultId)
    if (!vault) {
      throw new Error(`Vault ${vaultId} not found`)
    }

    const newCount = Math.max(0, vault.fileCount - 1)
    await updateVaultMetadata(vaultId, { fileCount: newCount })
  } catch (error) {
    console.error(`Failed to decrement file count for vault ${vaultId}:`, error)
    throw new Error(`Failed to decrement file count for vault ${vaultId}`)
  }
}
