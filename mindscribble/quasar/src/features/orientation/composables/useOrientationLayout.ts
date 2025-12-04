/**
 * Orientation Layout Composable
 * Provides layout calculations based on orientation mode
 */

import { computed } from 'vue'
import { useOrientationStore } from '../stores/orientationStore'
import { useDocumentStore } from 'src/core/stores/documentStore'

export function useOrientationLayout() {
  const orientationStore = useOrientationStore()
  const documentStore = useDocumentStore()

  /**
   * Calculate the side and vertical order for a node's children
   * Returns layout info for each child based on current orientation
   */
  function calculateChildrenLayout(parentId: string) {
    const children = documentStore.getChildNodes(parentId)
    const totalChildren = children.length

    return children.map((child, index) => {
      const order = index + 1
      const side = orientationStore.getChildSide(order, totalChildren)
      
      return {
        nodeId: child.id,
        side,
        order,
        // Vertical order within the side (will be calculated by layout engine)
        sideOrder: 0
      }
    })
  }

  /**
   * Get the source handle based on child side
   */
  function getSourceHandle(side: 'left' | 'right'): string {
    return side === 'left' ? 'left' : 'right'
  }

  /**
   * Get the target handle based on child side
   */
  function getTargetHandle(side: 'left' | 'right'): string {
    return side === 'left' ? 'right' : 'left'
  }

  return {
    calculateChildrenLayout,
    getSourceHandle,
    getTargetHandle,
    currentMode: computed(() => orientationStore.mode)
  }
}

