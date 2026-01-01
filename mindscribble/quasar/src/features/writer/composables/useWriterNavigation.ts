import { computed, type Ref } from 'vue'
import type { MindpadNode } from '../../../core/types'

/**
 * Represents an editable field in the flattened document
 */
export interface EditableField {
  nodeId: string
  field: 'title' | 'content'
  node: MindpadNode
}

/**
 * Tree item structure for he-tree (matches store structure)
 */
export interface WriterTreeItem {
  id: string
  text: string
  node: MindpadNode
  children: WriterTreeItem[]
}

/**
 * Flatten the tree into a linear sequence of editable fields
 * This creates a depth-first traversal of all editable fields
 */
function flattenTree(items: WriterTreeItem[], result: EditableField[] = []): EditableField[] {
  for (const item of items) {
    // Always add title field
    result.push({
      nodeId: item.id,
      field: 'title',
      node: item.node
    })

    // Add content field only if it has actual text content
    const hasContent = item.node.data.content && (() => {
      const tmp = document.createElement('div')
      tmp.innerHTML = item.node.data.content
      const textContent = tmp.textContent || ''
      return textContent.trim() !== ''
    })()

    if (hasContent) {
      result.push({
        nodeId: item.id,
        field: 'content',
        node: item.node
      })
    }

    // Recursively process children (depth-first)
    if (item.children && item.children.length > 0) {
      flattenTree(item.children, result)
    }
  }

  return result
}

/**
 * Composable for document-wide navigation between editable fields in Writer view
 *
 * @param treeData - Reactive reference to the tree data
 * @returns Navigation functions for keyboard navigation
 */
export function useWriterNavigation(treeData: Ref<WriterTreeItem[]>) {
  /**
   * Get flattened list of all editable fields in the document
   */
  const flattenedFields = computed<EditableField[]>(() => {
    return flattenTree(treeData.value)
  })

  /**
   * Find the index of a specific field in the flattened list
   */
  function findFieldIndex(nodeId: string, field: 'title' | 'content'): number {
    return flattenedFields.value.findIndex(
      (f) => f.nodeId === nodeId && f.field === field
    )
  }

  /**
   * Get the next editable field (for Right arrow / Down arrow navigation)
   */
  function getNextField(nodeId: string, field: 'title' | 'content'): EditableField | null {
    const currentIndex = findFieldIndex(nodeId, field)

    if (currentIndex === -1 || currentIndex === flattenedFields.value.length - 1) {
      return null
    }

    return flattenedFields.value[currentIndex + 1] ?? null
  }

  /**
   * Get the previous editable field (for Left arrow / Up arrow navigation)
   */
  function getPreviousField(nodeId: string, field: 'title' | 'content'): EditableField | null {
    const currentIndex = findFieldIndex(nodeId, field)

    if (currentIndex === -1 || currentIndex === 0) {
      return null
    }

    return flattenedFields.value[currentIndex - 1] ?? null
  }

  return {
    flattenedFields,
    findFieldIndex,
    getNextField,
    getPreviousField
  }
}

