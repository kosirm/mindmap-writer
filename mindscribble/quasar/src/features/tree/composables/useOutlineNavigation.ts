import { computed, type Ref } from 'vue'
import type { MindpadNode } from '../../../core/types'

/**
 * Represents a node in the flattened outline structure
 */
export interface OutlineTreeItem {
  id: string
  text: string
  node: MindpadNode
  children: OutlineTreeItem[]
}

/**
 * Flatten the tree into a linear sequence of visible nodes only
 * This creates a depth-first traversal but only includes expanded nodes
 *
 * IMPORTANT: This function directly accesses node.views.outline.expanded to ensure
 * Vue's reactivity system tracks these reads and triggers recomputation when they change
 */
function flattenVisibleTree(items: OutlineTreeItem[], result: MindpadNode[] = []): MindpadNode[] {
  for (const item of items) {
    // Add the current node (always visible)
    result.push(item.node)

    // Recursively process children only if node is expanded
    // Access the expansion state directly from the node to ensure reactivity
    if (item.children && item.children.length > 0) {
      const isExpanded = item.node.views.outline?.expanded ?? true
      if (isExpanded) {
        flattenVisibleTree(item.children, result)
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
  /**
   * Get flattened list of all visible nodes in the document
   * This computed is reactive to both treeData changes AND expansion state changes
   * because flattenVisibleTree directly accesses node.views.outline.expanded
   */
  const flattenedNodes = computed<MindpadNode[]>(() => {
    return flattenVisibleTree(treeData.value)
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
  function getNextNode(nodeId: string): MindpadNode | null {
    const currentIndex = findNodeIndex(nodeId)

    if (currentIndex === -1 || currentIndex === flattenedNodes.value.length - 1) {
      return null
    }

    return flattenedNodes.value[currentIndex + 1] ?? null
  }

  /**
   * Get the previous visible node (for Up arrow navigation)
   */
  function getPreviousNode(nodeId: string): MindpadNode | null {
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
