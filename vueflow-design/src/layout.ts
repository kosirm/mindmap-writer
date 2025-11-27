import type { NodeData, BoundingRect, Rectangle } from './types'
import { rectanglesOverlap, resolveOverlap, expandRectToIncludeRect, addPadding } from './collision'

/**
 * Nested Rectangle Layout Algorithm
 * 
 * Core concept:
 * - Each node has an invisible bounding rectangle
 * - Root nodes have rectangles that cannot overlap
 * - Children are contained within parent's rectangle
 * - Child rectangles expand parent rectangles
 * - Sibling rectangles (same parent) cannot overlap
 */

const PADDING = 20 // Padding around children within parent rectangle

/**
 * Calculate bounding rectangle for a node and all its descendants
 * If node is collapsed, only includes the node itself (not children)
 */
export function calculateBoundingRect(
  node: NodeData,
  allNodes: NodeData[]
): BoundingRect {
  // Start with the node itself
  let rect: Rectangle = {
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height
  }

  // If node is collapsed, return just the node's rectangle (no children)
  if (node.collapsed) {
    return {
      ...rect,
      nodeId: node.id,
      padding: 0
    }
  }

  // Get all children
  const children = allNodes.filter(n => n.parentId === node.id)

  if (children.length === 0) {
    // Leaf node - just return its own rectangle
    return {
      ...rect,
      nodeId: node.id,
      padding: 0
    }
  }

  // Calculate bounding rectangles for all children (recursive)
  const childBounds = children.map(child => calculateBoundingRect(child, allNodes))

  // Expand to include all children
  for (const childBound of childBounds) {
    rect = expandRectToIncludeRect(rect, childBound)
  }

  // Add padding around children
  rect = addPadding(rect, PADDING)

  return {
    ...rect,
    nodeId: node.id,
    padding: PADDING
  }
}

/**
 * Get all children of a node
 */
function getChildren(nodeId: string, allNodes: NodeData[]): NodeData[] {
  return allNodes.filter(n => n.parentId === nodeId)
}

/**
 * Get all siblings of a node (nodes with same parent)
 */
function getSiblings(node: NodeData, allNodes: NodeData[]): NodeData[] {
  return allNodes.filter(n => n.parentId === node.parentId && n.id !== node.id)
}

/**
 * Resolve overlaps between sibling nodes (same parent)
 * Also prevents children from overlapping with their parent node
 */
export function resolveSiblingOverlaps(
  siblings: NodeData[],
  allNodes: NodeData[]
): void {
  if (siblings.length === 0) return

  // Simple iterative approach with limited movement
  const MAX_ITERATIONS = 5
  const MAX_PUSH = 200 // Maximum pixels to push in one iteration

  // Get parent node if siblings have one
  const parentId = siblings[0].parentId
  const parentNode = parentId ? allNodes.find(n => n.id === parentId) : null

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    let hadOverlap = false

    // Calculate bounding rectangles for all siblings
    const bounds = siblings.map(sibling => ({
      node: sibling,
      rect: calculateBoundingRect(sibling, allNodes)
    }))

    // 1. Check and resolve overlaps between sibling pairs
    for (let i = 0; i < bounds.length; i++) {
      for (let j = i + 1; j < bounds.length; j++) {
        const a = bounds[i]
        const b = bounds[j]

        if (rectanglesOverlap(a.rect, b.rect)) {
          hadOverlap = true

          // Calculate overlap
          const overlap = {
            x: Math.min(a.rect.x + a.rect.width, b.rect.x + b.rect.width) - Math.max(a.rect.x, b.rect.x),
            y: Math.min(a.rect.y + a.rect.height, b.rect.y + b.rect.height) - Math.max(a.rect.y, b.rect.y)
          }

          // Push in direction of smallest overlap, but limit the push amount
          let deltaX_A = 0, deltaY_A = 0, deltaX_B = 0, deltaY_B = 0

          if (overlap.x < overlap.y) {
            // Push horizontally
            const pushAmount = Math.min(overlap.x / 2, MAX_PUSH)
            if (a.rect.x < b.rect.x) {
              deltaX_A = -pushAmount
              deltaX_B = pushAmount
            } else {
              deltaX_A = pushAmount
              deltaX_B = -pushAmount
            }
          } else {
            // Push vertically
            const pushAmount = Math.min(overlap.y / 2, MAX_PUSH)
            if (a.rect.y < b.rect.y) {
              deltaY_A = -pushAmount
              deltaY_B = pushAmount
            } else {
              deltaY_A = pushAmount
              deltaY_B = -pushAmount
            }
          }

          // Move the nodes and all their descendants
          moveNodeAndDescendants(a.node, deltaX_A, deltaY_A, allNodes)
          moveNodeAndDescendants(b.node, deltaX_B, deltaY_B, allNodes)
        }
      }
    }

    // 2. Check and resolve overlaps between children and parent node rectangle
    if (parentNode) {
      const parentRect: Rectangle = {
        x: parentNode.x,
        y: parentNode.y,
        width: parentNode.width,
        height: parentNode.height
      }

      for (const bound of bounds) {
        if (rectanglesOverlap(bound.rect, parentRect)) {
          hadOverlap = true

          // Calculate overlap
          const overlap = {
            x: Math.min(bound.rect.x + bound.rect.width, parentRect.x + parentRect.width) -
               Math.max(bound.rect.x, parentRect.x),
            y: Math.min(bound.rect.y + bound.rect.height, parentRect.y + parentRect.height) -
               Math.max(bound.rect.y, parentRect.y)
          }

          // Push child away from parent
          let deltaX = 0, deltaY = 0

          if (overlap.x < overlap.y) {
            // Push horizontally
            const pushAmount = Math.min(overlap.x + 10, MAX_PUSH) // +10 for spacing
            if (bound.rect.x < parentRect.x) {
              deltaX = -pushAmount
            } else {
              deltaX = pushAmount
            }
          } else {
            // Push vertically
            const pushAmount = Math.min(overlap.y + 10, MAX_PUSH) // +10 for spacing
            if (bound.rect.y < parentRect.y) {
              deltaY = -pushAmount
            } else {
              deltaY = pushAmount
            }
          }

          // Move the child node and all its descendants
          moveNodeAndDescendants(bound.node, deltaX, deltaY, allNodes)
        }
      }
    }

    // If no overlaps found, we're done
    if (!hadOverlap) {
      break
    }
  }
}

/**
 * Move a node and all its descendants by a delta
 */
export function moveNodeAndDescendants(
  node: NodeData,
  deltaX: number,
  deltaY: number,
  allNodes: NodeData[]
): void {
  // Move the node
  node.x += deltaX
  node.y += deltaY

  // Move all descendants recursively
  const children = getChildren(node.id, allNodes)
  for (const child of children) {
    moveNodeAndDescendants(child, deltaX, deltaY, allNodes)
  }
}

/**
 * Get all descendants of a node (children, grandchildren, etc.)
 */
export function getAllDescendants(nodeId: string, allNodes: NodeData[]): NodeData[] {
  const descendants: NodeData[] = []
  const children = getChildren(nodeId, allNodes)

  for (const child of children) {
    descendants.push(child)
    descendants.push(...getAllDescendants(child.id, allNodes))
  }

  return descendants
}

/**
 * Resolve overlaps recursively from bottom-up
 */
function resolveOverlapsRecursive(
  node: NodeData,
  allNodes: NodeData[]
): void {
  const children = getChildren(node.id, allNodes)

  // First, resolve children recursively (depth-first)
  for (const child of children) {
    resolveOverlapsRecursive(child, allNodes)
  }

  // Then resolve siblings at this level
  if (children.length > 0) {
    resolveSiblingOverlaps(children, allNodes)
  }
}

/**
 * Main function: Resolve all overlaps in the hierarchy
 */
export function resolveAllOverlaps(allNodes: NodeData[]): void {
  // Get root nodes (nodes with no parent)
  const rootNodes = allNodes.filter(n => n.parentId === null)

  // Resolve overlaps for each root tree
  for (const root of rootNodes) {
    resolveOverlapsRecursive(root, allNodes)
  }

  // Finally, resolve overlaps between root nodes
  resolveSiblingOverlaps(rootNodes, allNodes)
}

