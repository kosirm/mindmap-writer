/**
 * File System Service
 * Handles file and folder operations within vaults
 */

import { db } from './indexedDBService'
import type { MindscribbleDocument } from '../types'
import type { FileSystemItem } from './indexedDBService'


/**
 * Create a new file in a vault
 */
export async function createFile(
  vaultId: string,
  parentId: string | null,
  name: string,
  content: MindscribbleDocument
): Promise<FileSystemItem> {
  try {
    // Generate file ID
    const fileId = `file-${Date.now()}`

    // Create file system item
    const fileItem: FileSystemItem = {
      id: fileId,
      vaultId,
      parentId,
      name,
      type: 'file',
      created: Date.now(),
      modified: Date.now(),
      size: JSON.stringify(content).length,
      fileId: content.metadata.id
    }

    // Store the file system item
    await db.transaction('rw', db.fileSystem, db.documents, async () => {
      // Ensure fileSystem store exists
      if (!db.fileSystem) {
        throw new Error('fileSystem store not available')
      }

      await db.fileSystem.add(fileItem)

      // If this is a file with content, store the document
      if (content) {
        await db.documents.put(content)
      }

      // If parent exists, add this file to parent's children
      if (parentId) {
        const parent = await db.fileSystem.get(parentId)
        if (parent && parent.type === 'folder') {
          parent.children = parent.children || []
          parent.children.push(fileId)
          parent.modified = Date.now()
          await db.fileSystem.put(parent)
        }
      }
    })

    return fileItem
  } catch (error) {
    console.error('Failed to create file:', error)
    throw new Error('Failed to create file')
  }
}

/**
 * Create a new folder in a vault
 */
export async function createFolder(
  vaultId: string,
  parentId: string | null,
  name: string
): Promise<FileSystemItem> {
  try {
    // Generate folder ID
    const folderId = `folder-${Date.now()}`

    // Create folder item
    const folderItem: FileSystemItem = {
      id: folderId,
      vaultId,
      parentId,
      name,
      type: 'folder',
      created: Date.now(),
      modified: Date.now(),
      children: []
    }

    // Store the folder item
    await db.transaction('rw', db.fileSystem, async () => {
      // Ensure fileSystem store exists
      if (!db.fileSystem) {
        throw new Error('fileSystem store not available')
      }

      await db.fileSystem.add(folderItem)

      // If parent exists, add this folder to parent's children
      if (parentId) {
        const parent = await db.fileSystem.get(parentId)
        if (parent && parent.type === 'folder') {
          parent.children = parent.children || []
          parent.children.push(folderId)
          parent.modified = Date.now()
          await db.fileSystem.put(parent)
        }
      }
    })

    return folderItem
  } catch (error) {
    console.error('Failed to create folder:', error)
    throw new Error('Failed to create folder')
  }
}

/**
 * Delete a file or folder
 */
export async function deleteItem(itemId: string): Promise<void> {
  try {
    await db.transaction('rw', db.fileSystem, db.documents, async () => {
      const item = await db.fileSystem.get(itemId)

      if (!item) {
        throw new Error('Item not found')
      }

      // If it's a file with content, delete the document
      if (item.type === 'file' && item.fileId) {
        await db.documents.delete(item.fileId)
      }

      // If it's a folder, recursively delete children
      if (item.type === 'folder' && item.children) {
        for (const childId of item.children) {
          await deleteItem(childId)
        }
      }

      // Remove from parent's children list
      if (item.parentId) {
        const parent = await db.fileSystem.get(item.parentId)
        if (parent && parent.children) {
          parent.children = parent.children.filter(id => id !== itemId)
          parent.modified = Date.now()
          await db.fileSystem.put(parent)
        }
      }

      // Delete the item itself
      await db.fileSystem.delete(itemId)
    })
  } catch (error) {
    console.error(`Failed to delete item ${itemId}:`, error)
    throw new Error(`Failed to delete item ${itemId}`)
  }
}

/**
 * Rename a file or folder
 */
export async function renameItem(itemId: string, newName: string): Promise<FileSystemItem> {
  try {
    console.log('📝 [fileSystemService] Renaming item in IndexedDB:', itemId, 'to:', newName)

    const item = await db.fileSystem.get(itemId)

    if (!item) {
      throw new Error('Item not found')
    }

    console.log('📋 [fileSystemService] Current item:', item)

    item.name = newName
    item.modified = Date.now()

    console.log('💾 [fileSystemService] Saving updated item to IndexedDB')
    await db.fileSystem.put(item)

    console.log('✅ [fileSystemService] Rename completed successfully')

    return item
  } catch (error) {
    console.error(`❌ [fileSystemService] Failed to rename item ${itemId}:`, error)
    throw new Error(`Failed to rename item ${itemId}`)
  }
}

/**
 * Move a file or folder to a new parent
 */
export async function moveItem(itemId: string, newParentId: string | null): Promise<void> {
  try {
    await db.transaction('rw', db.fileSystem, async () => {
      const item = await db.fileSystem.get(itemId)

      if (!item) {
        throw new Error('Item not found')
      }

      // Remove from old parent's children list
      if (item.parentId) {
        const oldParent = await db.fileSystem.get(item.parentId)
        if (oldParent && oldParent.children) {
          oldParent.children = oldParent.children.filter(id => id !== itemId)
          oldParent.modified = Date.now()
          await db.fileSystem.put(oldParent)
        }
      }

      // Update item's parent
      item.parentId = newParentId
      item.modified = Date.now()

      // Add to new parent's children list
      if (newParentId) {
        const newParent = await db.fileSystem.get(newParentId)
        if (newParent && newParent.type === 'folder') {
          newParent.children = newParent.children || []
          newParent.children.push(itemId)
          newParent.modified = Date.now()
          await db.fileSystem.put(newParent)
        }
      }

      await db.fileSystem.put(item)
    })
  } catch (error) {
    console.error(`Failed to move item ${itemId}:`, error)
    throw new Error(`Failed to move item ${itemId}`)
  }
}

/**
 * Get the complete vault structure
 */
export async function getVaultStructure(vaultId: string): Promise<FileSystemItem[]> {
  try {
    const allItems = await db.fileSystem.where('vaultId').equals(vaultId).toArray()

    // Build hierarchy
    const rootItems: FileSystemItem[] = []
    const itemMap = new Map<string, FileSystemItem>()

    // Create map of all items
    allItems.forEach(item => {
      itemMap.set(item.id, item)
    })

    // Find root items (no parent or parent doesn't exist)
    allItems.forEach(item => {
      if (!item.parentId || !itemMap.has(item.parentId)) {
        rootItems.push(item)
      }
    })

    // Sort by name for consistent ordering
    rootItems.sort((a, b) => a.name.localeCompare(b.name))

    return rootItems
  } catch (error) {
    console.error(`Failed to get vault structure for ${vaultId}:`, error)
    throw new Error(`Failed to get vault structure for ${vaultId}`)
  }
}

/**
 * Get a specific file or folder
 */
export async function getItem(itemId: string): Promise<FileSystemItem | null> {
  try {
    const item = await db.fileSystem.get(itemId)
    return item || null
  } catch (error) {
    console.error(`Failed to get item ${itemId}:`, error)
    return null
  }
}

/**
 * Get file content (document)
 */
export async function getFileContent(fileId: string): Promise<MindscribbleDocument | null> {
  try {
    const fileItem = await db.fileSystem.get(fileId)

    if (!fileItem || fileItem.type !== 'file' || !fileItem.fileId) {
      return null
    }

    const document = await db.documents.get(fileItem.fileId)
    return document || null
  } catch (error) {
    console.error(`Failed to get file content for ${fileId}:`, error)
    return null
  }
}

/**
 * Update file content
 */
export async function updateFileContent(fileId: string, content: MindscribbleDocument): Promise<void> {
  try {
    await db.transaction('rw', db.fileSystem, db.documents, async () => {
      const fileItem = await db.fileSystem.get(fileId)

      if (!fileItem || fileItem.type !== 'file') {
        throw new Error('File not found')
      }

      // Update document
      await db.documents.put(content)

      // Update file system item
      fileItem.modified = Date.now()
      fileItem.size = JSON.stringify(content).length
      fileItem.fileId = content.metadata.id

      await db.fileSystem.put(fileItem)
    })
  } catch (error) {
    console.error(`Failed to update file content for ${fileId}:`, error)
    throw new Error(`Failed to update file content for ${fileId}`)
  }
}

/**
 * Get all files in a vault (flat list)
 */
export async function getAllFilesInVault(vaultId: string): Promise<FileSystemItem[]> {
  try {
    return await db.fileSystem
      .where('vaultId')
      .equals(vaultId)
      .and(item => item.type === 'file')
      .toArray()
  } catch (error) {
    console.error(`Failed to get all files in vault ${vaultId}:`, error)
    throw new Error(`Failed to get all files in vault ${vaultId}`)
  }
}

/**
 * Get all folders in a vault (flat list)
 */
export async function getAllFoldersInVault(vaultId: string): Promise<FileSystemItem[]> {
  try {
    return await db.fileSystem
      .where('vaultId')
      .equals(vaultId)
      .and(item => item.type === 'folder')
      .toArray()
  } catch (error) {
    console.error(`Failed to get all folders in vault ${vaultId}:`, error)
    throw new Error(`Failed to get all folders in vault ${vaultId}`)
  }
}

/**
 * Check if an item with the given name already exists in a parent
 */
export async function itemExists(parentId: string | null, name: string): Promise<boolean> {
  try {
    const query = db.fileSystem.where('parentId').equals(parentId || '')
    const items = await query.toArray()
    return items.some(item => item.name === name)
  } catch (error) {
    console.error(`Failed to check if item exists:`, error)
    return false
  }
}
/**
 * Get file content by file ID (not file system item ID)
 */
export async function getFileContentById(fileId: string): Promise<MindscribbleDocument | null> {
  try {
    const document = await db.documents.get(fileId)
    return document || null
  } catch (error) {
    console.error(`Failed to get file content for ${fileId}:`, error)
    return null
  }
}

/**
 * Get file content from file system item
 */
export async function getFileContentFromItem(itemId: string): Promise<MindscribbleDocument | null> {
  try {
    const fileItem = await db.fileSystem.get(itemId)

    if (!fileItem || fileItem.type !== 'file' || !fileItem.fileId) {
      return null
    }

    const document = await db.documents.get(fileItem.fileId)
    return document || null
  } catch (error) {
    console.error(`Failed to get file content for item ${itemId}:`, error)
    return null
  }
}

/**
 * Create a new file with the given content
 */
export async function createNewFile(
  vaultId: string,
  parentId: string | null,
  name: string,
  content: MindscribbleDocument
): Promise<FileSystemItem> {
  return createFile(vaultId, parentId, name, content)
}

/**
 * Create a new folder
 */
export async function createNewFolder(
  vaultId: string,
  parentId: string | null,
  name: string
): Promise<FileSystemItem> {
  return createFolder(vaultId, parentId, name)
}

/**
 * Delete an item by ID
 */
export async function deleteItemById(itemId: string): Promise<void> {
  return deleteItem(itemId)
}

/**
 * Move an existing item to a new parent
 */
export async function moveExistingItem(itemId: string, newParentId: string | null): Promise<void> {
  return moveItem(itemId, newParentId)
}

/**
 * Get the vault structure
 */
export async function getVaultStructureById(vaultId: string): Promise<FileSystemItem[]> {
  return getVaultStructure(vaultId)
}
