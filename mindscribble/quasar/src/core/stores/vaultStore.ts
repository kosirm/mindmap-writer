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
import type { MindscribbleDocument } from '../types'
import * as vaultService from '../services/vaultService'
import * as fileSystemService from '../services/fileSystemService'

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
   * Load all vaults from database
   */
  async function loadAllVaults() {
    try {
      isLoading.value = true
      error.value = null

      const loadedVaults = await vaultService.getAllVaults()
      vaults.value = loadedVaults

      // Set active vault if available
      const active = await vaultService.getActiveVault()
      if (active) {
        activeVault.value = active
      } else if (loadedVaults.length > 0) {
        // Set first vault as active if no active vault
        await activateVault(loadedVaults[0]!.id)
      }

      vaultRevision.value++

      eventBus.emit('vault:loaded', {
        source: 'store',
        vaultId: active?.id || loadedVaults[0]?.id || '',
        vaultName: active?.name || loadedVaults[0]?.name || '',
        vaultMetadata: active || loadedVaults[0] || { id: '', name: '', created: 0, modified: 0, folderId: '', repositoryFileId: '', fileCount: 0, folderCount: 0, size: 0 }
      })
    } catch (err) {
      error.value = `Failed to load vaults: ${err instanceof Error ? err.message : String(err)}`
      eventBus.emit('vault:error', {
        source: 'store',
        vaultId: null,
        error: err instanceof Error ? err : new Error(String(err)),
        operation: 'loadAllVaults'
      })
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
   * Activate a vault
   */
  async function activateVault(vaultId: string) {
    try {
      isLoading.value = true
      error.value = null

      await vaultService.setActiveVault(vaultId)

      // Update local state
      const vault = vaults.value.find(v => v.id === vaultId)
      if (vault) {
        activeVault.value = vault

        // Load structure for new active vault
        await loadVaultStructure()

        eventBus.emit('vault:activated', {
          source: 'store',
          vaultId: vault.id,
          vaultName: vault.name,
          vaultMetadata: vault
        })
      }
    } catch (err) {
      error.value = `Failed to activate vault: ${err instanceof Error ? err.message : String(err)}`
      eventBus.emit('vault:error', {
        source: 'store',
        vaultId: vaultId,
        error: err instanceof Error ? err : new Error(String(err)),
        operation: 'activateVault'
      })
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Create a new vault
   */
  async function createNewVault(name: string, description: string = '') {
    try {
      isLoading.value = true
      error.value = null

      const newVault = await vaultService.createVault(name, description)

      // Add to local state
      vaults.value = [...vaults.value, newVault]

      // If this is the first vault, activate it
      if (vaults.value.length === 1) {
        await activateVault(newVault.id)
      }

      vaultRevision.value++

      eventBus.emit('vault:created', {
        source: 'store',
        vaultId: newVault.id,
        vaultName: newVault.name,
        vaultMetadata: newVault
      })

      return newVault
    } catch (err) {
      error.value = `Failed to create vault: ${err instanceof Error ? err.message : String(err)}`
      eventBus.emit('vault:error', {
        source: 'store',
        vaultId: null,
        error: err instanceof Error ? err : new Error(String(err)),
        operation: 'createNewVault'
      })
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Delete an existing vault
   */
  async function deleteExistingVault(vaultId: string) {
    try {
      isLoading.value = true
      error.value = null

      await vaultService.deleteVault(vaultId)

      // Remove from local state
      vaults.value = vaults.value.filter(v => v.id !== vaultId)

      // If we deleted the active vault, activate another one
      if (activeVault.value?.id === vaultId) {
        const remainingVaults = vaults.value
        if (remainingVaults.length > 0) {
          await activateVault(remainingVaults[0]!.id)
        } else {
          activeVault.value = null
          vaultStructure.value = []
        }
      }

      vaultRevision.value++

      eventBus.emit('vault:structure-refreshed', {
        source: 'store',
        vaultId: vaultId,
        fullStructure: false
      })
    } catch (err) {
      error.value = `Failed to delete vault: ${err instanceof Error ? err.message : String(err)}`
      eventBus.emit('vault:error', {
        source: 'store',
        vaultId: vaultId,
        error: err instanceof Error ? err : new Error(String(err)),
        operation: 'deleteExistingVault'
      })
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

      const updatedVault = await vaultService.renameVault(vaultId, newName)

      // Update local state
      if (index !== -1) {
        vaults.value[index] = updatedVault

        // Update active vault if needed
        if (activeVault.value?.id === vaultId) {
          activeVault.value = updatedVault
        }
      }

      vaultRevision.value++

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
    content: MindscribbleDocument
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
  async function deleteExistingItem(itemId: string) {
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
        source: 'store',
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
    newSortOrder?: number
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
        source: 'store',
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
