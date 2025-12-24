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
    const result = flattenVisibleTree(treeData.value, documentStore)
    console.log('🗺️ [DEBUG NAVIGATION] Flattened nodes:', result.map(n => ({ id: n.id, title: n.data.title })))
    return result
  })

  /**
   * Find the index of a specific node in the flattened list
   */
  function findNodeIndex(nodeId: string): number {
    const index = flattenedNodes.value.findIndex(
      (node) => node.id === nodeId
    )
    console.log(`🔍 [DEBUG NAVIGATION] Node ${nodeId} index:`, index)
    return index
  }

  /**
   * Get the next visible node (for Down arrow navigation)
   */
  function getNextNode(nodeId: string): MindscribbleNode | null {
    const currentIndex = findNodeIndex(nodeId)

    console.log(`➡️ [DEBUG NAVIGATION] Current index for ${nodeId}:`, currentIndex)
    console.log(`➡️ [DEBUG NAVIGATION] Total nodes:`, flattenedNodes.value.length)

    if (currentIndex === -1 || currentIndex === flattenedNodes.value.length - 1) {
      console.log(`➡️ [DEBUG NAVIGATION] No next node for ${nodeId}`)
      return null
    }

    const nextNode = flattenedNodes.value[currentIndex + 1] ?? null
    console.log(`➡️ [DEBUG NAVIGATION] Next node for ${nodeId}:`, nextNode ? { id: nextNode.id, title: nextNode.data.title } : null)
    return nextNode
  }

  /**
   * Get the previous visible node (for Up arrow navigation)
   */
  function getPreviousNode(nodeId: string): MindscribbleNode | null {
    const currentIndex = findNodeIndex(nodeId)

    console.log(`⬅️ [DEBUG NAVIGATION] Current index for ${nodeId}:`, currentIndex)

    if (currentIndex === -1 || currentIndex === 0) {
      console.log(`⬅️ [DEBUG NAVIGATION] No previous node for ${nodeId}`)
      return null
    }

    const prevNode = flattenedNodes.value[currentIndex - 1] ?? null
    console.log(`⬅️ [DEBUG NAVIGATION] Previous node for ${nodeId}:`, prevNode ? { id: prevNode.id, title: prevNode.data.title } : null)
    return prevNode
  }

  return {
    flattenedNodes,
    findNodeIndex,
    getNextNode,
    getPreviousNode
  }
}
