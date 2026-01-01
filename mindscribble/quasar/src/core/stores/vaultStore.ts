/**
 * VaultStore - Centralized vault management store
 *
 * Manages:
 * - Vault metadata and active vault state
 * - Vault structure (files and folders)
 * - Item selection and operations
 * - Event emission for vault changes
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { eventBus, type EventSource } from '../events'
import type { VaultMetadata, FileSystemItem } from '../services/indexedDBService'
import type { MindpadDocument } from '../types'
import { VaultMetadataService } from '../services/vaultMetadataService'
import * as fileSystemService from '../services/fileSystemService'
import { db } from '../services/indexedDBService'
import { GoogleDriveInitializationService } from '../services/googleDriveInitialization'

export const useVaultStore = defineStore('vaults', () => {
  // ============================================================
  // STATE
  // ============================================================

  /** All vaults */
  const vaults = ref<VaultMetadata[]>([])

  /** Active vault */
  const activeVault = ref<VaultMetadata | null>(null)

  /** Vault structure (hierarchical) */
  const vaultStructure = ref<FileSystemItem[]>([])

  /** Selected file ID (only files can be selected, not folders) */
  const selectedFileId = ref<string | null>(null)

  /** Loading state */
  const isLoading = ref<boolean>(false)

  /** Error state */
  const error = ref<string | null>(null)

  /** Revision counter for reactivity */
  const vaultRevision = ref<number>(0)

  // ============================================================
  // COMPUTED PROPERTIES
  // ============================================================

  /** Check if any vaults exist */
  const hasVaults = computed(() => vaults.value.length > 0)

  /** Check if active vault exists */
  const hasActiveVault = computed(() => activeVault.value !== null)

  /** Get root files (files in root of vault) */
  const rootFiles = computed(() => {
    return vaultStructure.value.filter(item =>
      item.type === 'file' && !item.parentId
    )
  })

  /** Get root folders (folders in root of vault) */
  const rootFolders = computed(() => {
    return vaultStructure.value.filter(item =>
      item.type === 'folder' && !item.parentId
    )
  })

  /** Get all files in vault */
  const allFiles = computed(() => {
    return vaultStructure.value.filter(item => item.type === 'file')
  })

  /** Get all folders in vault */
  const allFolders = computed(() => {
    return vaultStructure.value.filter(item => item.type === 'folder')
  })

  /** Check if vault has any items */
  const hasItems = computed(() => vaultStructure.value.length > 0)

  // ============================================================
  // VAULT OPERATIONS
  // ============================================================

  /**
   * Load all vaults metadata from .vaults index
   */
  async function loadAllVaults(source: EventSource = 'store') {
    try {
      isLoading.value = true
      error.value = null

      console.log('🗄️ [VaultStore] Loading all vaults from vaultsIndex...')
      const vaultsIndex = await VaultMetadataService.getVaultsIndex()
      vaults.value = vaultsIndex.vaults
      console.log('🗄️ [VaultStore] Loaded', vaults.value.length, 'vaults:', vaults.value.map(v => v.name))

      // Load active vault if not already loaded
      if (!activeVault.value && vaultsIndex.vaults.length > 0) {
        // For Phase 7: Use first vault as default
        // In Phase 8: Load last used vault from preferences
        const firstVault = vaultsIndex.vaults[0]
        if (firstVault?.id) {
          console.log('🗄️ [VaultStore] No active vault, activating first vault:', firstVault.name)
          await activateVault(firstVault.id, source)
        }
      } else if (activeVault.value) {
        console.log('🗄️ [VaultStore] Active vault already set:', activeVault.value.name)
      }

      vaultRevision.value++
      return vaultsIndex.vaults
    } catch (err) {
      console.error('🗄️ [VaultStore] Failed to load vaults:', err)
      error.value = err instanceof Error ? err.message : 'Failed to load vaults'
      eventBus.emit('vault:error', { error: err as Error, operation: 'loadAllVaults', source, vaultId: null })
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Load vault structure for active vault
   */
  async function loadVaultStructure() {
    if (!activeVault.value) return

    try {
      isLoading.value = true
      error.value = null

      const structure = await fileSystemService.getVaultStructure(activeVault.value.id)
      vaultStructure.value = structure

      vaultRevision.value++

      eventBus.emit('vault:structure-refreshed', {
        source: 'store',
        vaultId: activeVault.value.id,
        fullStructure: true
      })
    } catch (err) {
      error.value = `Failed to load vault structure: ${err instanceof Error ? err.message : String(err)}`
      eventBus.emit('vault:error', {
        source: 'store',
        vaultId: activeVault.value.id,
        error: err instanceof Error ? err : new Error(String(err)),
        operation: 'loadVaultStructure'
      })
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Clear current vault data from IndexedDB
   */
  async function clearCurrentVaultData() {
    // Clear file system
    await db.fileSystem.clear()
    // Clear documents
    await db.documents.clear()
    // Clear any other vault-specific data
  }

  /**
   * Activate vault - REPLACES current vault in IndexedDB with selected vault
   */
  async function activateVault(vaultId: string, source: EventSource = 'store') {
    try {
      isLoading.value = true
      error.value = null

      // For Phase 7: We get vault metadata from .vaults index
      // In Phase 8: We will download the actual vault content from Google Drive
      const vaultsIndex = await VaultMetadataService.getVaultsIndex()
      const vaultMetadata = vaultsIndex.vaults.find(v => v.id === vaultId)

      if (!vaultMetadata) {
        throw new Error(`Vault ${vaultId} not found in vaults index`)
      }

      // Only clear vault data if we're switching to a DIFFERENT vault
      // This prevents data loss when reloading the same vault
      const isVaultSwitch = activeVault.value && activeVault.value.id !== vaultId
      if (isVaultSwitch) {
        console.log('🗄️ [VaultStore] Switching vaults, clearing current vault data')
        await clearCurrentVaultData()
      } else {
        console.log('🗄️ [VaultStore] Activating same vault, keeping existing data')
      }

      // Set as active vault (for Phase 7, we create empty structure)
      activeVault.value = vaultMetadata

      // Only clear structure if we're switching vaults
      if (isVaultSwitch) {
        vaultStructure.value = [] // Empty structure, will be populated when files are created
      }

      // Set active vault in metadata service
      await VaultMetadataService.setActiveVault(vaultId)

      // Emit events
      eventBus.emit('vault:activated', { vaultId, vaultName: vaultMetadata.name, vaultMetadata, source })
      eventBus.emit('vault:loaded', { vaultId, vaultName: vaultMetadata.name, vaultMetadata, source })

      vaultRevision.value++
      return vaultMetadata
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to activate vault'
      eventBus.emit('vault:error', { error: err as Error, operation: 'activateVault', source, vaultId: vaultId })
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Create a new vault - REPLACES current vault in IndexedDB
   */
  async function createNewVault(name: string, description: string = '', source: EventSource = 'store') {
    try {
      isLoading.value = true
      error.value = null

      // Generate unique vault name if needed
      const uniqueName = await VaultMetadataService.generateUniqueVaultName(name)

      // Create new vault metadata
      const newVault: VaultMetadata = {
        id: `vault-${Date.now()}`,
        name: uniqueName,
        description,
        created: Date.now(),
        modified: Date.now(),
        folderId: '',
        repositoryFileId: '',
        fileCount: 0,
        folderCount: 0,
        size: 0,
        isActive: true
      }

      // Add to vaults index
      await VaultMetadataService.addVaultToIndex(newVault)

      // Clear current vault data from IndexedDB
      await clearCurrentVaultData()

      // Set as active vault
      activeVault.value = newVault
      vaultStructure.value = [] // Empty structure for new vault

      // Update local state
      await loadAllVaults(source)

      // Update .vaults index on Google Drive
      await GoogleDriveInitializationService.updateVaultsIndex()

      // Emit events
      eventBus.emit('vault:created', { vaultId: newVault.id, vaultName: newVault.name, vaultMetadata: newVault, source })
      eventBus.emit('vault:activated', { vaultId: newVault.id, vaultName: newVault.name, vaultMetadata: newVault, source })

      vaultRevision.value++
      return newVault
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create vault'
      eventBus.emit('vault:error', { error: err as Error, operation: 'createNewVault', source, vaultId: null })
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Delete a vault - removes from vaults index but doesn't delete actual vault data
   * (Actual vault deletion will be implemented in Phase 8 with Google Drive integration)
   */
  async function deleteExistingVault(vaultId: string, source: EventSource = 'store') {
    try {
      isLoading.value = true
      error.value = null

      // Remove from vaults index
      await VaultMetadataService.removeVaultFromIndex(vaultId)

      // If this was the active vault, we need to handle it
      if (activeVault.value?.id === vaultId) {
        // Clear active vault
        activeVault.value = null
        vaultStructure.value = []

        // If there are other vaults, activate the first one
        const vaultsIndex = await VaultMetadataService.getVaultsIndex()
        if (vaultsIndex.vaults.length > 0) {
          const firstVault = vaultsIndex.vaults[0]
          if (firstVault?.id) {
            await activateVault(firstVault.id, source)
          }
        }
      }

      // Update local state
      await loadAllVaults(source)

      vaultRevision.value++

      // Update .vaults index on Google Drive
      await GoogleDriveInitializationService.updateVaultsIndex()

      // Emit event
      eventBus.emit('vault:deleted', { vaultId, source })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete vault'
      eventBus.emit('vault:error', { error: err as Error, operation: 'deleteExistingVault', source, vaultId: vaultId })
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Rename an existing vault
   */
  async function renameExistingVault(vaultId: string, newName: string) {
    try {
      isLoading.value = true
      error.value = null

      // Get old name BEFORE renaming
      const index = vaults.value.findIndex(v => v.id === vaultId)
      const oldName = index !== -1 ? vaults.value[index]?.name || '' : ''

      const updatedVault = await VaultMetadataService.updateVaultMetadata(vaultId, { name: newName })

      // Update local state
      if (index !== -1) {
        vaults.value[index] = updatedVault

        // Update active vault if needed
        if (activeVault.value?.id === vaultId) {
          activeVault.value = updatedVault
        }
      }

      vaultRevision.value++

      // Update .vaults index on Google Drive
      await GoogleDriveInitializationService.updateVaultsIndex()

      eventBus.emit('vault:item-renamed', {
        source: 'store',
        vaultId: vaultId,
        itemId: vaultId,
        oldName: oldName,
        newName: newName,
        itemType: 'file' as const
      })
    } catch (err) {
      error.value = `Failed to rename vault: ${err instanceof Error ? err.message : String(err)}`
      eventBus.emit('vault:error', {
        source: 'store',
        vaultId: vaultId,
        error: err instanceof Error ? err : new Error(String(err)),
        operation: 'renameExistingVault'
      })
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // ============================================================
  // FILE/FOLDER OPERATIONS
  // ============================================================

  /**
   * Create a new file
   */
  async function createNewFile(
    parentId: string | null = null,
    name: string,
    content: MindpadDocument
  ) {
    if (!activeVault.value) {
      throw new Error('No active vault')
    }

    try {
      isLoading.value = true
      error.value = null

      const file = await fileSystemService.createFile(
        activeVault.value.id,
        parentId,
        name,
        content
      )

      // Add to local structure
      vaultStructure.value = [...vaultStructure.value, file]

      vaultRevision.value++

      eventBus.emit('vault:file-created', {
        source: 'store',
        vaultId: activeVault.value.id,
        fileId: file.id,
        fileName: file.name,
        parentId: file.parentId
      })

      return file
    } catch (err) {
      error.value = `Failed to create file: ${err instanceof Error ? err.message : String(err)}`
      eventBus.emit('vault:error', {
        source: 'store',
        vaultId: activeVault.value.id,
        error: err instanceof Error ? err : new Error(String(err)),
        operation: 'createNewFile'
      })
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Create a new folder
   */
  async function createNewFolder(
    parentId: string | null = null,
    name: string
  ) {
    if (!activeVault.value) {
      throw new Error('No active vault')
    }

    try {
      isLoading.value = true
      error.value = null

      const folder = await fileSystemService.createFolder(
        activeVault.value.id,
        parentId,
        name
      )

      // Add to local structure
      vaultStructure.value = [...vaultStructure.value, folder]

      vaultRevision.value++

      eventBus.emit('vault:folder-created', {
        source: 'store',
        vaultId: activeVault.value.id,
        folderId: folder.id,
        folderName: folder.name,
        parentId: folder.parentId
      })

      return folder
    } catch (err) {
      error.value = `Failed to create folder: ${err instanceof Error ? err.message : String(err)}`
      eventBus.emit('vault:error', {
        source: 'store',
        vaultId: activeVault.value.id,
        error: err instanceof Error ? err : new Error(String(err)),
        operation: 'createNewFolder'
      })
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Rename an existing item
   */
  async function renameExistingItem(
    itemId: string,
    newName: string,
    source: EventSource = 'store'
  ) {
    if (!activeVault.value) {
      throw new Error('No active vault')
    }

    try {
      isLoading.value = true
      error.value = null

      // Get old name BEFORE renaming
      const index = vaultStructure.value.findIndex(i => i.id === itemId)
      const oldName = index !== -1 ? vaultStructure.value[index]?.name || '' : ''

      const item = await fileSystemService.renameItem(itemId, newName)

      // Update local structure
      if (index !== -1) {
        vaultStructure.value[index] = item
      }

      vaultRevision.value++

      eventBus.emit('vault:item-renamed', {
        source: source,
        vaultId: activeVault.value.id,
        itemId: item.id,
        oldName: oldName,
        newName: item.name,
        itemType: item.type
      })

      return item
    } catch (err) {
      error.value = `Failed to rename item: ${err instanceof Error ? err.message : String(err)}`
      eventBus.emit('vault:error', {
        source: source,
        vaultId: activeVault.value.id,
        error: err instanceof Error ? err : new Error(String(err)),
        operation: 'renameExistingItem'
      })
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Delete an existing item
   */
  async function deleteExistingItem(itemId: string, source: EventSource = 'store') {
    if (!activeVault.value) {
      throw new Error('No active vault')
    }

    try {
      isLoading.value = true
      error.value = null

      // Get the item first to determine its type
      const itemToDelete = vaultStructure.value.find(i => i.id === itemId)
      const itemType: 'file' | 'folder' = itemToDelete?.type || 'file'

      // Delete the item
      await fileSystemService.deleteItem(itemId)

      // Remove from local structure
      vaultStructure.value = vaultStructure.value.filter(i => i.id !== itemId)

      // Clear selection if deleted item was selected
      if (selectedFileId.value === itemId) {
        selectedFileId.value = null
      }

      vaultRevision.value++

      eventBus.emit('vault:item-deleted', {
        source: source,
        vaultId: activeVault.value.id,
        itemId: itemId,
        itemType: itemType,
        deletedIds: [itemId]
      })
    } catch (err) {
      error.value = `Failed to delete item: ${err instanceof Error ? err.message : String(err)}`
      eventBus.emit('vault:error', {
        source: 'store',
        vaultId: activeVault.value.id,
        error: err instanceof Error ? err : new Error(String(err)),
        operation: 'deleteExistingItem'
      })
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Move an existing item
   */
  async function moveExistingItem(
    itemId: string,
    newParentId: string | null,
    newSortOrder?: number,
    source: EventSource = 'store'
  ) {
    if (!activeVault.value) {
      throw new Error('No active vault')
    }

    try {
      isLoading.value = true
      error.value = null

      // Get the item first to preserve its data
      const oldItem = vaultStructure.value.find(i => i.id === itemId)
      const oldParentId = oldItem?.parentId || null

      // Move the item
      await fileSystemService.moveItem(itemId, newParentId, newSortOrder)

      // Update local structure
      const index = vaultStructure.value.findIndex(i => i.id === itemId)
      if (index !== -1) {
        const existingItem = vaultStructure.value[index]!
        vaultStructure.value[index] = {
          ...existingItem,
          parentId: newParentId,
          sortOrder: newSortOrder ?? existingItem.sortOrder,
          modified: Date.now()
        }
      }

      vaultRevision.value++

      eventBus.emit('vault:item-moved', {
        source: source,
        vaultId: activeVault.value.id,
        itemId: itemId,
        oldParentId: oldParentId,
        newParentId: newParentId,
        newOrder: newSortOrder ?? 0
      })
    } catch (err) {
      error.value = `Failed to move item: ${err instanceof Error ? err.message : String(err)}`
      eventBus.emit('vault:error', {
        source: 'store',
        vaultId: activeVault.value.id,
        error: err instanceof Error ? err : new Error(String(err)),
        operation: 'moveExistingItem'
      })
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // ============================================================
  // SELECTION OPERATIONS
  // ============================================================

  // ============================================================
  // SELECTION OPERATIONS
  // ============================================================

  /**
   * Select a file (only files can be selected, not folders)
   */
  function selectFile(
    fileId: string | null,
    source: EventSource = 'store'
  ) {
    if (!activeVault.value) return

    // If fileId is provided, verify it's a file
    if (fileId) {
      const item = vaultStructure.value.find(i => i.id === fileId)
      if (!item || item.type !== 'file') {
        console.warn(`Cannot select ${fileId}: not a file`)
        return
      }
    }

    selectedFileId.value = fileId

    // Emit event for other components to react
    eventBus.emit('vault:file-selected', {
      source,
      vaultId: activeVault.value.id,
      fileId,
      fileName: fileId ? vaultStructure.value.find(i => i.id === fileId)?.name : undefined
    })
  }

  /**
   * Check if a file is selected
   */
  function isFileSelected(fileId: string): boolean {
    return selectedFileId.value === fileId
  }

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  /**
   * Get all descendant IDs for an item
   */
  function getDescendantIds(itemId: string): string[] {
    const descendants: string[] = []
    const item = vaultStructure.value.find(i => i.id === itemId)

    if (item && item.type === 'folder') {
      const children = vaultStructure.value.filter(i => i.parentId === itemId)
      for (const child of children) {
        descendants.push(child.id)
        descendants.push(...getDescendantIds(child.id))
      }
    }

    return descendants
  }

  /**
   * Find item in structure
   */
  function findItem(itemId: string): FileSystemItem | null {
    return vaultStructure.value.find(i => i.id === itemId) || null
  }

  /**
   * Check if item exists
   */
  function checkItemExists(itemId: string): boolean {
    return vaultStructure.value.some(i => i.id === itemId)
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  return {
    // State
    vaults,
    activeVault,
    vaultStructure,
    selectedFileId,
    isLoading,
    error,
    vaultRevision,

    // Computed properties
    hasVaults,
    hasActiveVault,
    rootFiles,
    rootFolders,
    allFiles,
    allFolders,
    hasItems,

    // Vault operations
    loadAllVaults,
    loadVaultStructure,
    activateVault,
    createNewVault,
    deleteExistingVault,
    renameExistingVault,

    // File/folder operations
    createNewFile,
    createNewFolder,
    renameExistingItem,
    deleteExistingItem,
    moveExistingItem,

    // Selection operations
    selectFile,
    isFileSelected,

    // Helper functions
    getDescendantIds,
    findItem,
    checkItemExists
  }
})
