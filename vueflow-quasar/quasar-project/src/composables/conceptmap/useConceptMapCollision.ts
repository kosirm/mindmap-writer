import type { Ref } from 'vue'
import type { NodeData, Rectangle } from '../../components/mindmap/types'

/**
 * Concept Map Collision Detection Composable
 *
 * AABB collision detection for concept map view:
 * - Detects overlaps between sibling nodes within a container
 * - Resolves overlaps by adjusting neighbor positions
 * - Adjusts parent container size when children move
 */
export function useConceptMapCollision(
  nodes: Ref<NodeData[]>,
  // Dependencies from other composables
  getDirectChildren: (nodeId: string) => NodeData[],
  // Optional: function to calculate actual container size (for parent nodes with children)
  calculateParentSize?: (nodeId: string) => { width: number; height: number }
) {
  // ============================================================
  // CONSTANTS
  // ============================================================

  const MINIMUM_GAP = 10 // Minimum gap between nodes
  const CONTAINER_PADDING = 20 // Padding inside container nodes
  const HEADER_HEIGHT = 30 // Height of parent node header/title bar
  const MIN_NODE_WIDTH = 150 // Minimum node width
  const MIN_NODE_HEIGHT = 60 // Minimum node height

  // ============================================================
  // AABB COLLISION DETECTION
  // ============================================================

  /**
   * Check if two rectangles overlap
   */
  function rectanglesOverlap(a: Rectangle, b: Rectangle): boolean {
    return !(
      a.x + a.width <= b.x ||
      b.x + b.width <= a.x ||
      a.y + a.height <= b.y ||
      b.y + b.height <= a.y
    )
  }

  /**
   * Get the overlap amount between two rectangles
   * Returns { overlapX, overlapY } - positive values mean overlap
   */
  function getOverlap(a: Rectangle, b: Rectangle): { overlapX: number; overlapY: number } {
    const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
    const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
    return { overlapX, overlapY }
  }

  /**
   * Check if a node has children
   */
  function hasChildren(nodeId: string): boolean {
    return getDirectChildren(nodeId).length > 0
  }

  /**
   * Get node rectangle for concept map view
   * Uses conceptMapPosition and calculated size for parent nodes, conceptMapSize for leaf nodes
   * Returns null if node is not yet initialized (no conceptMapPosition)
   */
  function getNodeRect(node: NodeData): Rectangle | null {
    // Only return rect for initialized nodes
    if (!node.conceptMapPosition) {
      return null
    }

    const pos = node.conceptMapPosition

    // For parent nodes with children, use the calculated container size if available
    let size: { width: number; height: number }
    if (hasChildren(node.id) && calculateParentSize) {
      size = calculateParentSize(node.id)
    } else {
      size = node.conceptMapSize ?? { width: node.width, height: node.height }
    }

    return {
      x: pos.x,
      y: pos.y,
      width: size.width,
      height: size.height
    }
  }

  // ============================================================
  // OVERLAP RESOLUTION
  // ============================================================

  /**
   * Resolve overlaps between siblings within a container
   * Moves nodes to eliminate overlaps while keeping them inside container
   * Only considers nodes that are initialized (have conceptMapPosition)
   */
  function resolveSiblingOverlaps(parentId: string | null): void {
    const allSiblings = parentId === null
      ? nodes.value.filter(n => n.parentId === null)
      : getDirectChildren(parentId)

    // Only consider initialized nodes (nodes with conceptMapPosition)
    const siblings = allSiblings.filter(n => n.conceptMapPosition != null)

    if (siblings.length < 2) return

    // Simple iterative approach - move overlapping nodes apart
    let hasOverlap = true
    let iterations = 0
    const maxIterations = 100

    while (hasOverlap && iterations < maxIterations) {
      hasOverlap = false
      iterations++

      for (let i = 0; i < siblings.length; i++) {
        for (let j = i + 1; j < siblings.length; j++) {
          const nodeA = siblings[i]!
          const nodeB = siblings[j]!

          const rectA = getNodeRect(nodeA)
          const rectB = getNodeRect(nodeB)

          // Skip if either node doesn't have a valid rect (shouldn't happen after filter, but safety)
          if (!rectA || !rectB) continue

          // Add minimum gap to rectangles for spacing
          const paddedRectA = {
            x: rectA.x - MINIMUM_GAP / 2,
            y: rectA.y - MINIMUM_GAP / 2,
            width: rectA.width + MINIMUM_GAP,
            height: rectA.height + MINIMUM_GAP
          }
          const paddedRectB = {
            x: rectB.x - MINIMUM_GAP / 2,
            y: rectB.y - MINIMUM_GAP / 2,
            width: rectB.width + MINIMUM_GAP,
            height: rectB.height + MINIMUM_GAP
          }

          if (rectanglesOverlap(paddedRectA, paddedRectB)) {
            hasOverlap = true

            const { overlapX, overlapY } = getOverlap(paddedRectA, paddedRectB)

            // Move along the axis with smaller overlap
            if (overlapX < overlapY) {
              // Move horizontally
              const moveAmount = (overlapX + MINIMUM_GAP) / 2
              if (rectA.x < rectB.x) {
                updateNodeConceptMapX(nodeA, rectA.x - moveAmount)
                updateNodeConceptMapX(nodeB, rectB.x + moveAmount)
              } else {
                updateNodeConceptMapX(nodeA, rectA.x + moveAmount)
                updateNodeConceptMapX(nodeB, rectB.x - moveAmount)
              }
            } else {
              // Move vertically - pass parentId for header protection
              const moveAmount = (overlapY + MINIMUM_GAP) / 2
              if (rectA.y < rectB.y) {
                updateNodeConceptMapY(nodeA, rectA.y - moveAmount, parentId)
                updateNodeConceptMapY(nodeB, rectB.y + moveAmount, parentId)
              } else {
                updateNodeConceptMapY(nodeA, rectA.y + moveAmount, parentId)
                updateNodeConceptMapY(nodeB, rectB.y - moveAmount, parentId)
              }
            }
          }
        }
      }
    }

    if (iterations >= maxIterations) {
      console.warn(`resolveSiblingOverlaps: Max iterations reached for parent ${parentId}`)
    }
  }

  /**
   * Update node's concept map X position
   * IMPORTANT: Only updates if node already has conceptMapPosition!
   * This prevents accidentally initializing nodes with wrong positions during collision detection.
   */
  function updateNodeConceptMapX(node: NodeData, x: number): void {
    if (!node.conceptMapPosition) {
      // Don't create conceptMapPosition here - let initializeLayout handle it
      console.warn(`updateNodeConceptMapX: Node ${node.id} has no conceptMapPosition, skipping`)
      return
    }
    node.conceptMapPosition.x = x
  }

  /**
   * Update node's concept map Y position
   * Enforces minimum Y based on parent's header if node is inside a container
   * IMPORTANT: Only updates if node already has conceptMapPosition!
   */
  function updateNodeConceptMapY(node: NodeData, y: number, parentId: string | null): void {
    if (!node.conceptMapPosition) {
      // Don't create conceptMapPosition here - let initializeLayout handle it
      console.warn(`updateNodeConceptMapY: Node ${node.id} has no conceptMapPosition, skipping`)
      return
    }

    // Enforce minimum Y to stay below header bar if inside a container
    const minY = parentId !== null ? CONTAINER_PADDING + HEADER_HEIGHT : 0
    const safeY = Math.max(y, minY)
    node.conceptMapPosition.y = safeY
  }

  /**
   * Adjust parent container size to fit all children
   * Only considers initialized children (with conceptMapPosition)
   */
  function adjustParentSize(parentId: string): void {
    const parent = nodes.value.find(n => n.id === parentId)
    if (!parent) return

    const children = getDirectChildren(parentId)
    if (children.length === 0) return

    // Only consider initialized children
    const initializedChildren = children.filter(c => c.conceptMapPosition != null)
    if (initializedChildren.length === 0) return

    let maxRight = 0
    let maxBottom = 0

    for (const child of initializedChildren) {
      const rect = getNodeRect(child)
      if (!rect) continue

      // Child position is relative to parent, so right edge is x + width
      const rightEdge = rect.x + rect.width
      const bottomEdge = rect.y + rect.height

      if (rightEdge > maxRight) maxRight = rightEdge
      if (bottomEdge > maxBottom) maxBottom = bottomEdge
    }

    // Update parent size: need to fit from 0 to maxRight/maxBottom plus padding
    parent.conceptMapSize = {
      width: Math.max(MIN_NODE_WIDTH, maxRight + CONTAINER_PADDING),
      height: Math.max(MIN_NODE_HEIGHT, maxBottom + CONTAINER_PADDING)
    }
  }

  /**
   * Resolve all overlaps after a node is moved
   * 1. Resolve sibling overlaps at the node's level
   * 2. Adjust parent size and resolve sibling overlaps at parent's level
   * 3. Propagate up to ancestors (each level: adjust size, then resolve sibling overlaps)
   */
  function resolveOverlapsForNode(nodeId: string): void {
    const node = nodes.value.find(n => n.id === nodeId)
    if (!node) return

    // Resolve overlaps with siblings at this node's level
    resolveSiblingOverlaps(node.parentId)

    // Adjust parent size and propagate up
    let currentParentId = node.parentId
    while (currentParentId) {
      adjustParentSize(currentParentId)

      // After parent size changed, resolve overlaps between parent and its siblings
      const parent = nodes.value.find(n => n.id === currentParentId)
      if (parent) {
        resolveSiblingOverlaps(parent.parentId)
      }

      currentParentId = parent?.parentId ?? null
    }
  }

  // ============================================================
  // RETURN
  // ============================================================

  return {
    // Constants
    MINIMUM_GAP,
    CONTAINER_PADDING,

    // Collision detection
    rectanglesOverlap,
    getOverlap,
    getNodeRect,

    // Overlap resolution
    resolveSiblingOverlaps,
    adjustParentSize,
    resolveOverlapsForNode,
    updateNodeConceptMapX,
    updateNodeConceptMapY
  }
}

