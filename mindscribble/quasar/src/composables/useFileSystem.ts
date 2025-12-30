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
import type { MindscribbleDocument } from '../core/types'
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
    content: MindscribbleDocument
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

      const updatedItem = await renameItem(itemId, newName)

      // Update local state
      const updateItemInStructure = (items: FileSystemItem[]): boolean => {
        for (const item of items) {
          if (item.id === itemId) {
            item.name = newName
            item.modified = Date.now()
            return true
          }
          if (item.children && item.children.length > 0) {
            const children = item.children.map(childId => {
              const child = vaultStructure.value.find(i => i.id === childId)
              return child || null
            }).filter(Boolean) as FileSystemItem[]
            if (updateItemInStructure(children)) return true
          }
        }
        return false
      }

      updateItemInStructure(vaultStructure.value)

      $q.notify({
        type: 'positive',
        message: 'Item renamed successfully'
      })

      return updatedItem
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to rename item'
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
  async function getFileContentById(fileId: string): Promise<MindscribbleDocument | null> {
    try {
      return await getFileContent(fileId)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to get file content'
      throw err
    }
  }

  async function getFileContentFromItem(itemId: string): Promise<MindscribbleDocument | null> {
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
  async function updateExistingFileContent(fileId: string, content: MindscribbleDocument) {
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
