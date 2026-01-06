/**
 * File System Service
 * Handles file and folder operations within vaults
 */

import { db } from './indexedDBService'
import type { FileSystemItem } from './indexedDBService'
import { getChangeTracker } from './syncStrategy'
import type { MindpadDocument } from '../types'


/**
 * Create a new file in a vault
 */
export async function createFile(
  vaultId: string,
  parentId: string | null,
  name: string,
  content: MindpadDocument
): Promise<FileSystemItem> {
  try {
    // Generate file ID
    const fileId = `file-${Date.now()}`

    // Get the next sortOrder for this parent
    const siblings = await db.fileSystem
      .where({ vaultId, parentId })
      .toArray()
    const maxSortOrder = siblings.length > 0
      ? Math.max(...siblings.map(s => s.sortOrder ?? 0))
      : -1

    // Create file system item
    const fileItem: FileSystemItem = {
      id: fileId,
      vaultId,
      parentId,
      name,
      type: 'file',
      created: Date.now(),
      modified: Date.now(),
      sortOrder: maxSortOrder + 1,
      size: JSON.stringify(content).length,
      fileId: content.metadata.id
    }

    // Serialize document BEFORE transaction to avoid premature commit
    // Store with SHORT property names for space optimization
    let serializedDoc: Record<string, unknown> | null = null
    if (content) {
      const { serializeDocument } = await import('../utils/propertySerialization')
      serializedDoc = serializeDocument(content as unknown as Record<string, unknown>)
    }

    // Store the file system item
    console.log('📁 [FileSystemService] Creating file:', fileItem.name, 'in vault:', vaultId)
    await db.transaction('rw', db.fileSystem, db.documents, async () => {
      // Ensure fileSystem store exists
      if (!db.fileSystem) {
        throw new Error('fileSystem store not available')
      }

      await db.fileSystem.add(fileItem)
      console.log('📁 [FileSystemService] File added to fileSystem store')

      // If this is a file with content, store the document with SHORT property names
      if (serializedDoc) {
        // Store the serialized document directly (with short property names)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await db.documents.put(serializedDoc as any)
        console.log('📁 [FileSystemService] Document saved with short property names')
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

    // NEW: Track as modified for sync
    const changeTracker = getChangeTracker()
    changeTracker.modifiedFiles.add(fileItem.id)
    console.log('🔄 [FileSystemService] Tracked file creation for sync:', fileItem.id)

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

    // Get the next sortOrder for this parent
    const siblings = await db.fileSystem
      .where({ vaultId, parentId })
      .toArray()
    const maxSortOrder = siblings.length > 0
      ? Math.max(...siblings.map(s => s.sortOrder ?? 0))
      : -1

    // Create folder item
    const folderItem: FileSystemItem = {
      id: folderId,
      vaultId,
      parentId,
      name,
      type: 'folder',
      created: Date.now(),
      modified: Date.now(),
      sortOrder: maxSortOrder + 1,
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

      // NEW: Track deletion for sync
      const changeTracker = getChangeTracker()
      changeTracker.deletedItems.add(itemId)
      console.log('🔄 [fileSystemService] Tracked deletion for sync:', itemId)
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

    // NEW: Track rename for sync
    const changeTracker = getChangeTracker()
    changeTracker.renamedItems.set(item.id, newName)
    console.log('🔄 [fileSystemService] Tracked rename for sync:', item.id, '->', newName)

    console.log('✅ [fileSystemService] Rename completed successfully')

    return item
  } catch (error) {
    console.error(`❌ [fileSystemService] Failed to rename item ${itemId}:`, error)
    throw new Error(`Failed to rename item ${itemId}`)
  }
}

/**
 * Move a file or folder to a new parent and update sort order
 */
export async function moveItem(
  itemId: string,
  newParentId: string | null,
  newSortOrder?: number
): Promise<void> {
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

      // Update item's parent and sort order
      item.parentId = newParentId
      item.modified = Date.now()
      if (newSortOrder !== undefined) {
        item.sortOrder = newSortOrder
      }

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

      // NEW: Track move for sync
      const changeTracker = getChangeTracker()
      changeTracker.movedItems.set(itemId, newParentId)
      console.log('🔄 [fileSystemService] Tracked move for sync:', itemId, '->', newParentId)
    })
  } catch (error) {
    console.error(`Failed to move item ${itemId}:`, error)
    throw new Error(`Failed to move item ${itemId}`)
  }
}

/**
 * Get the complete vault structure (all items, not just root)
 */
export async function getVaultStructure(vaultId: string): Promise<FileSystemItem[]> {
  try {
    console.log('📁 [FileSystemService] Getting vault structure for:', vaultId)

    // Debug: Check all items in fileSystem table
    const allItemsInDB = await db.fileSystem.toArray()
    console.log('📁 [FileSystemService] Total items in fileSystem table:', allItemsInDB.length, allItemsInDB.map(i => ({ id: i.id, vaultId: i.vaultId, name: i.name, type: i.type })))

    // Return all items for the vault - the tree component will build the hierarchy
    const allItems = await db.fileSystem.where('vaultId').equals(vaultId).toArray()

    console.log('📁 [FileSystemService] Found items for vault:', allItems.length, allItems.map(i => ({ name: i.name, type: i.type })))

    // Sort by sortOrder for consistent ordering
    allItems.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

    return allItems
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
export async function getFileContent(fileId: string): Promise<MindpadDocument | null> {
  try {
    const fileItem = await db.fileSystem.get(fileId)

    if (!fileItem || fileItem.type !== 'file' || !fileItem.fileId) {
      return null
    }

    const storedDocument = await db.documents.get(fileItem.fileId)
    if (!storedDocument) {
      return null
    }

    // Deserialize from short property names to long property names
    // This converts the optimized storage format back to the working format
    const { deserializeDocument } = await import('../utils/propertySerialization')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const document = deserializeDocument(storedDocument as any) as unknown as MindpadDocument

    return document
  } catch (error) {
    console.error(`Failed to get file content for ${fileId}:`, error)
    return null
  }
}

/**
 * Update file content
 * @param fileId - File system item ID
 * @param content - Document content (can be MindpadDocument or serialized Record)
 * @param documentId - Optional document ID (required if content is serialized)
 */
export async function updateFileContent(
  fileId: string,
  content: MindpadDocument | Record<string, unknown>,
  documentId?: string
): Promise<void> {
  try {
    await db.transaction('rw', db.fileSystem, db.documents, async () => {
      const fileItem = await db.fileSystem.get(fileId)

      if (!fileItem || fileItem.type !== 'file') {
        throw new Error('File not found')
      }

      // Update document (content is already serialized with short property names)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.documents.put(content as any)

      // Update file system item
      fileItem.modified = Date.now()
      fileItem.size = JSON.stringify(content).length

      // Use provided documentId or try to extract from content
      if (documentId) {
        fileItem.fileId = documentId
      } else if ('metadata' in content && content.metadata && typeof content.metadata === 'object' && 'id' in content.metadata) {
        fileItem.fileId = (content.metadata as { id: string }).id
      }

      await db.fileSystem.put(fileItem)

      // NEW: Track as modified for sync
      const changeTracker = getChangeTracker()
      changeTracker.modifiedFiles.add(fileItem.id)
      console.log('🔄 [fileSystemService] Tracked content update for sync:', fileItem.id)
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
export async function getFileContentById(fileId: string): Promise<MindpadDocument | null> {
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
export async function getFileContentFromItem(itemId: string): Promise<MindpadDocument | null> {
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
  content: MindpadDocument
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
