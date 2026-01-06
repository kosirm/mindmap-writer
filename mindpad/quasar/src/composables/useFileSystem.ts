/**
 * Composable for file system operations with reactive state
 */

import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import {
  createFile,
  createFolder,
  deleteItem,
  renameItem,
  moveItem,
  getVaultStructure,
  getItem,
  getFileContent,
  updateFileContent,
  getAllFilesInVault,
  getAllFoldersInVault,
  itemExists,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getVaultStructureById // Used by external components via the composable
} from '../core/services/fileSystemService'
import type { MindpadDocument } from '../core/types'
import type { FileSystemItem } from '../core/services/indexedDBService'

export function useFileSystem() {
  const $q = useQuasar()

  // State
  const vaultStructure = ref<FileSystemItem[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Load vault structure
   */
  async function loadStructure(vaultId: string) {
    try {
      isLoading.value = true
      error.value = null

      const structure = await getVaultStructure(vaultId)
      vaultStructure.value = structure

      return structure
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load vault structure'
      $q.notify({
        type: 'negative',
        message: error.value
      })
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Create a new file
   */
  async function createNewFile(
    vaultId: string,
    parentId: string | null,
    name: string,
    content: MindpadDocument
  ) {
    try {
      isLoading.value = true
      error.value = null

      // Check if item with same name already exists
      const exists = await itemExists(parentId, name)
      if (exists) {
        throw new Error(`Item with name "${name}" already exists in this location`)
      }

      const newFile = await createFile(vaultId, parentId, name, content)

      // Refresh structure
      await loadStructure(vaultId)

      $q.notify({
        type: 'positive',
        message: `File "${name}" created successfully`
      })

      return newFile
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create file'
      $q.notify({
        type: 'negative',
        message: error.value
      })
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Create a new folder
   */
  async function createNewFolder(vaultId: string, parentId: string | null, name: string) {
    try {
      isLoading.value = true
      error.value = null

      // Check if item with same name already exists
      const exists = await itemExists(parentId, name)
      if (exists) {
        throw new Error(`Item with name "${name}" already exists in this location`)
      }

      const newFolder = await createFolder(vaultId, parentId, name)

      // Refresh structure
      await loadStructure(vaultId)

      $q.notify({
        type: 'positive',
        message: `Folder "${name}" created successfully`
      })

      return newFolder
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create folder'
      $q.notify({
        type: 'negative',
        message: error.value
      })
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Delete an item
   */
  async function deleteExistingItem(itemId: string) {
    try {
      isLoading.value = true
      error.value = null

      const item = await getItem(itemId)
      if (!item) {
        throw new Error('Item not found')
      }

      await deleteItem(itemId)

      // Refresh structure
      const vaultId = item.vaultId
      await loadStructure(vaultId)

      $q.notify({
        type: 'positive',
        message: `Item "${item.name}" deleted successfully`
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete item'
      $q.notify({
        type: 'negative',
        message: error.value
      })
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Rename an item
   */
  async function renameExistingItem(itemId: string, newName: string) {
    try {
      isLoading.value = true
      error.value = null

      console.log('🔍 Starting rename operation for item:', itemId, 'to:', newName)

      // Get current item directly from database instead of relying on vaultStructure
      const currentItem = await getItem(itemId)

      if (!currentItem) {
        console.error('❌ Item not found in database!')
        throw new Error('Item not found')
      }

      console.log('📋 Current item found:', currentItem)

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

      console.log('✅ Validation passed, calling renameItem function')

      // Perform rename
      const updatedItem = await renameItem(itemId, newName)

      console.log('📝 Rename completed, updated item:', updatedItem)

      // Refresh the entire vault structure to get the latest data from IndexedDB
      // This ensures we have the most up-to-date data after the rename operation
      await loadStructure(currentItem.vaultId)

      console.log('🔄 Vault structure reloaded')

      $q.notify({
        type: 'positive',
        message: 'Item renamed successfully'
      })

      return updatedItem
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to rename item'
      console.error('❌ Rename failed:', err)
      $q.notify({
        type: 'negative',
        message: error.value
      })
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Move an item
   */
  async function moveExistingItem(itemId: string, newParentId: string | null) {
    try {
      isLoading.value = true
      error.value = null

      await moveItem(itemId, newParentId)

      // Refresh structure
      const item = await getItem(itemId)
      if (item) {
        await loadStructure(item.vaultId)
      }

      $q.notify({
        type: 'positive',
        message: 'Item moved successfully'
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to move item'
      $q.notify({
        type: 'negative',
        message: error.value
      })
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get file content
   */
  async function getFileContentById(fileId: string): Promise<MindpadDocument | null> {
    try {
      return await getFileContent(fileId)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to get file content'
      throw err
    }
  }

  async function getFileContentFromItem(itemId: string): Promise<MindpadDocument | null> {
    try {
      return await getFileContentFromItem(itemId)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to get file content from item'
      throw err
    }
  }

  /**
   * Update file content
   */
  async function updateExistingFileContent(fileId: string, content: MindpadDocument) {
    try {
      isLoading.value = true
      error.value = null

      await updateFileContent(fileId, content)

      // Update local state
      const item = vaultStructure.value.find(i => i.id === fileId)
      if (item && item.type === 'file') {
        item.modified = Date.now()
        item.size = JSON.stringify(content).length
      }

      $q.notify({
        type: 'positive',
        message: 'File content updated successfully'
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update file content'
      $q.notify({
        type: 'negative',
        message: error.value
      })
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get all files in vault
   */
  async function getAllFiles(vaultId: string): Promise<FileSystemItem[]> {
    try {
      return await getAllFilesInVault(vaultId)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to get files'
      throw err
    }
  }

  /**
   * Get all folders in vault
   */
  async function getAllFolders(vaultId: string): Promise<FileSystemItem[]> {
    try {
      return await getAllFoldersInVault(vaultId)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to get folders'
      throw err
    }
  }

  /**
   * Check if item exists
   */
  async function checkItemExists(parentId: string | null, name: string): Promise<boolean> {
    try {
      return await itemExists(parentId, name)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to check item existence'
      throw err
    }
  }

  /**
   * Get vault structure by ID
   * @note This function is used by external components, not within this composable
   */
  async function getVaultStructureById(vaultId: string): Promise<FileSystemItem[]> {
    try {
      return await getVaultStructureById(vaultId)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to get vault structure'
      throw err
    }
  }

  /**
   * Find item in structure by ID
   */
  function findItemInStructure(itemId: string): FileSystemItem | null {
    const findItem = (items: FileSystemItem[]): FileSystemItem | null => {
      for (const item of items) {
        if (item.id === itemId) {
          return item
        }
        if (item.children && item.children.length > 0) {
          const children = item.children.map(childId => {
            return vaultStructure.value.find(i => i.id === childId) || null
          }).filter(Boolean) as FileSystemItem[]
          const found = findItem(children)
          if (found) return found
        }
      }
      return null
    }

    return findItem(vaultStructure.value)
  }

  // Computed properties
  const rootFiles = computed(() => {
    return vaultStructure.value.filter(item => item.parentId === null && item.type === 'file')
  })

  const rootFolders = computed(() => {
    return vaultStructure.value.filter(item => item.parentId === null && item.type === 'folder')
  })

  const hasItems = computed(() => vaultStructure.value.length > 0)

  return {
    // State
    vaultStructure,
    isLoading,
    error,

    // Computed
    rootFiles,
    rootFolders,
    hasItems,

    // Methods
    loadStructure,
    createNewFile,
    createNewFolder,
    deleteExistingItem,
    renameExistingItem,
    moveExistingItem,
    getFileContentById,
    getFileContentFromItem,
    updateExistingFileContent,
    getAllFiles,
    getAllFolders,
    checkItemExists,
    findItemInStructure,
    getVaultStructureById
  }
}
