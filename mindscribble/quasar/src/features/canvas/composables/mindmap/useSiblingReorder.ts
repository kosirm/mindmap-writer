/**
 * Sibling Reorder Composable
 *
 * Handles updating sibling order in the store when nodes are dragged
 * to new positions. Order is determined by angular position relative
 * to parent (or canvas center for root nodes) based on current orientation.
 *
 * Uses position-swap approach: nodes exchange their physical positions
 * to match new logical order - this prevents UI glitches and is reversible.
 */

import type { Ref } from 'vue'
import type { NodeData } from '../../components/mindmap/types'
import { getOrientationSortKey, type OrientationMode } from './useOrientationSort'
import { useDocumentStore } from 'src/core/stores/documentStore'
import { useOrientationStore } from 'src/core/stores/orientationStore'
import type { EventSource } from 'src/core/events'

export function useSiblingReorder(
  nodes: Ref<NodeData[]>,
  canvasCenter: Ref<{ x: number; y: number }>
) {
  const documentStore = useDocumentStore()
  const orientationStore = useOrientationStore()

  /**
   * Calculate new order for siblings based on their angular positions
   * Returns a map of nodeId -> new order value
   */
  function calculateNewOrders(
    siblings: NodeData[],
    parentNode: NodeData | null,
    orientation: OrientationMode
  ): Map<string, number> {
    // Reference point: parent center or canvas center for root nodes
    const refX = parentNode ? parentNode.x + parentNode.width / 2 : canvasCenter.value.x
    const refY = parentNode ? parentNode.y + parentNode.height / 2 : canvasCenter.value.y

    // Calculate sort key for each sibling
    const siblingsWithKeys = siblings.map(sibling => ({
      id: sibling.id,
      sortKey: getOrientationSortKey(sibling, refX, refY, orientation)
    }))

    // Sort by key
    siblingsWithKeys.sort((a, b) => a.sortKey - b.sortKey)

    // Create order map (0-based index)
    const newOrders = new Map<string, number>()
    siblingsWithKeys.forEach((item, index) => {
      newOrders.set(item.id, index)
    })

    return newOrders
  }

  /**
   * Check if sibling order has changed and update the store if needed
   * Returns true if order was changed
   */
  function updateSiblingOrderIfChanged(
    draggedNodeId: string,
    source: EventSource = 'mindmap'
  ): boolean {
    const draggedNode = nodes.value.find(n => n.id === draggedNodeId)
    if (!draggedNode) return false

    const parentId = draggedNode.parentId

    // Get all siblings (including the dragged node)
    const siblings = nodes.value.filter(n => n.parentId === parentId)
    if (siblings.length <= 1) return false // No reordering needed for single node

    // Get parent node (null for root nodes)
    const parentNode = parentId ? nodes.value.find(n => n.id === parentId) ?? null : null

    // Get current orientation from orientation store
    const orientation = orientationStore.orientation

    // Calculate new orders based on current positions
    const newOrders = calculateNewOrders(siblings, parentNode, orientation)

    // Check if any order actually changed
    let orderChanged = false
    for (const sibling of siblings) {
      const storeNode = documentStore.getNodeById(sibling.id)
      const newOrder = newOrders.get(sibling.id)
      if (storeNode && newOrder !== undefined && storeNode.data.order !== newOrder) {
        orderChanged = true
        break
      }
    }

    if (!orderChanged) return false

    // Update orders in the store (store will emit the event)
    console.log(`🔄 Sibling order changed for parent ${parentId ?? 'ROOT'}:`)
    for (const sibling of siblings) {
      const newOrder = newOrders.get(sibling.id)
      const storeNode = documentStore.getNodeById(sibling.id)
      if (storeNode && newOrder !== undefined) {
        console.log(`  ${sibling.label}: ${storeNode.data.order} → ${newOrder}`)
      }
    }

    // Call store method which will emit the event
    documentStore.reorderSiblings(parentId, newOrders, source)

    return true
  }

  return {
    calculateNewOrders,
    updateSiblingOrderIfChanged
  }
}

