import { computed, type Ref } from 'vue'
import type { MindscribbleNode } from '../../../core/types'
import { useDocumentStore } from '../../../core/stores/documentStore'

/**
 * Represents a node in the flattened outline structure
 */
export interface OutlineTreeItem {
  id: string
  text: string
  node: MindscribbleNode
  children: OutlineTreeItem[]
}

/**
 * Flatten the tree into a linear sequence of visible nodes only
 * This creates a depth-first traversal but only includes expanded nodes
 */
function flattenVisibleTree(items: OutlineTreeItem[], documentStore: ReturnType<typeof useDocumentStore>, result: MindscribbleNode[] = []): MindscribbleNode[] {
  for (const item of items) {
    // Add the current node (always visible)
    result.push(item.node)

    // Recursively process children only if node is expanded
    if (item.children && item.children.length > 0) {
      const isExpanded = documentStore.isNodeExpanded(item.id)
      if (isExpanded) {
        flattenVisibleTree(item.children, documentStore, result)
      }
    }
  }

  return result
}

/**
 * Composable for document-wide navigation between nodes in Outline view
 *
 * @param treeData - Reactive reference to the tree data
 * @returns Navigation functions for keyboard navigation
 */
export function useOutlineNavigation(treeData: Ref<OutlineTreeItem[]>) {
  const documentStore = useDocumentStore()

  /**
   * Get flattened list of all visible nodes in the document
   */
  const flattenedNodes = computed<MindscribbleNode[]>(() => {
    return flattenVisibleTree(treeData.value, documentStore)
  })

  /**
   * Find the index of a specific node in the flattened list
   */
  function findNodeIndex(nodeId: string): number {
    return flattenedNodes.value.findIndex(
      (node) => node.id === nodeId
    )
  }

  /**
   * Get the next visible node (for Down arrow navigation)
   */
  function getNextNode(nodeId: string): MindscribbleNode | null {
    const currentIndex = findNodeIndex(nodeId)

    if (currentIndex === -1 || currentIndex === flattenedNodes.value.length - 1) {
      return null
    }

    return flattenedNodes.value[currentIndex + 1] ?? null
  }

  /**
   * Get the previous visible node (for Up arrow navigation)
   */
  function getPreviousNode(nodeId: string): MindscribbleNode | null {
    const currentIndex = findNodeIndex(nodeId)

    if (currentIndex === -1 || currentIndex === 0) {
      return null
    }

    return flattenedNodes.value[currentIndex - 1] ?? null
  }

  return {
    flattenedNodes,
    findNodeIndex,
    getNextNode,
    getPreviousNode
  }
}
