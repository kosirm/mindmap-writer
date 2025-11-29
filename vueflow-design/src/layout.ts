import type { NodeData, BoundingRect, Rectangle } from './types'
import { rectanglesOverlap, resolveOverlap, expandRectToIncludeRect, addPadding, addPaddingXY } from './collision'

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

// Layout spacing configuration
let HORIZONTAL_SPACING = 0 // Horizontal spacing between bounding boxes (default 0 to match UI)
let VERTICAL_SPACING = 0   // Vertical spacing between bounding boxes (default 0 to match UI)

/**
 * Set layout spacing (used by UI controls)
 */
export function setLayoutSpacing(horizontal: number, vertical: number): void {
  HORIZONTAL_SPACING = horizontal
  VERTICAL_SPACING = vertical
}

/**
 * Get current layout spacing
 */
export function getLayoutSpacing(): { horizontal: number; vertical: number } {
  return { horizontal: HORIZONTAL_SPACING, vertical: VERTICAL_SPACING }
}

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
    // Leaf node - add padding around it so siblings maintain spacing
    rect = addPaddingXY(rect, HORIZONTAL_SPACING, VERTICAL_SPACING)
    return {
      ...rect,
      nodeId: node.id,
      padding: Math.max(HORIZONTAL_SPACING, VERTICAL_SPACING)
    }
  }

  // Calculate bounding rectangles for all children (recursive)
  const childBounds = children.map(child => calculateBoundingRect(child, allNodes))

  // Expand to include all children
  for (const childBound of childBounds) {
    rect = expandRectToIncludeRect(rect, childBound)
  }

  // Add padding around children (separate horizontal and vertical)
  rect = addPaddingXY(rect, HORIZONTAL_SPACING, VERTICAL_SPACING)

  return {
    ...rect,
    nodeId: node.id,
    padding: Math.max(HORIZONTAL_SPACING, VERTICAL_SPACING) // Store max for reference
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

  // Calculate bounding rectangles once at the start
  let bounds = siblings.map(sibling => ({
    node: sibling,
    rect: calculateBoundingRect(sibling, allNodes)
  }))

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    let hadOverlap = false

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

          // Update bounding rectangles for moved nodes
          a.rect.x += deltaX_A
          a.rect.y += deltaY_A
          b.rect.x += deltaX_B
          b.rect.y += deltaY_B
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
            const pushAmount = Math.min(overlap.x + HORIZONTAL_SPACING, MAX_PUSH) // Use configured spacing
            if (bound.rect.x < parentRect.x) {
              deltaX = -pushAmount
            } else {
              deltaX = pushAmount
            }
          } else {
            // Push vertically
            const pushAmount = Math.min(overlap.y + VERTICAL_SPACING, MAX_PUSH) // Use configured spacing
            if (bound.rect.y < parentRect.y) {
              deltaY = -pushAmount
            } else {
              deltaY = pushAmount
            }
          }

          // Move the child node and all its descendants
          moveNodeAndDescendants(bound.node, deltaX, deltaY, allNodes)

          // Update bounding rectangle for moved node
          bound.rect.x += deltaX
          bound.rect.y += deltaY
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

/**
 * LOD-aware overlap resolution: Only resolve overlaps for visible nodes,
 * but calculate bounding boxes using ALL nodes (including LOD-hidden children)
 *
 * @param visibleNodes - Nodes that are visible at current LOD level
 * @param allNodes - All nodes (including LOD-hidden ones)
 */
export function resolveOverlapsLOD(visibleNodes: NodeData[], allNodes: NodeData[]): void {
  // Get visible root nodes
  const visibleRootNodes = visibleNodes.filter(n => n.parentId === null)

  // For each visible root, resolve overlaps within its visible subtree
  for (const root of visibleRootNodes) {
    resolveOverlapsRecursiveLOD(root, visibleNodes, allNodes)
  }

  // Resolve overlaps between visible root nodes
  // Use allNodes for bounding box calculation (includes LOD-hidden children)
  resolveSiblingOverlaps(visibleRootNodes, allNodes)
}

/**
 * LOD-aware recursive overlap resolution
 * Only processes visible nodes, but uses allNodes for bounding box calculation
 */
function resolveOverlapsRecursiveLOD(
  node: NodeData,
  visibleNodes: NodeData[],
  allNodes: NodeData[]
): void {
  // Get visible children only
  const visibleChildren = visibleNodes.filter(n => n.parentId === node.id)

  if (visibleChildren.length === 0) {
    return // No visible children to process
  }

  // Recursively resolve overlaps for each visible child
  for (const child of visibleChildren) {
    resolveOverlapsRecursiveLOD(child, visibleNodes, allNodes)
  }

  // Resolve overlaps between visible siblings
  // Use allNodes for bounding box calculation (includes LOD-hidden descendants)
  resolveSiblingOverlaps(visibleChildren, allNodes)
}

/**
 * Get the root node for a given node
 */
function getRootNode(nodeId: string, allNodes: NodeData[]): NodeData | null {
  let node = allNodes.find(n => n.id === nodeId)
  if (!node) return null

  // Traverse up to find root
  while (node.parentId !== null) {
    const parent = allNodes.find(n => n.id === node!.parentId)
    if (!parent) break
    node = parent
  }

  return node
}

/**
 * Optimized function: Only resolve overlaps for affected root trees
 * This is much faster when only a few nodes change (e.g., during drag)
 *
 * @param affectedNodeIds - IDs of nodes that changed
 * @param allNodes - All nodes in the graph
 */
export function resolveOverlapsForAffectedRoots(
  affectedNodeIds: string[],
  allNodes: NodeData[]
): void {
  // Find all affected root nodes
  const affectedRoots = new Set<string>()
  for (const nodeId of affectedNodeIds) {
    const root = getRootNode(nodeId, allNodes)
    if (root) {
      affectedRoots.add(root.id)
    }
  }

  // Resolve overlaps within each affected root tree
  for (const rootId of affectedRoots) {
    const root = allNodes.find(n => n.id === rootId)
    if (root) {
      resolveOverlapsRecursive(root, allNodes)
    }
  }

  // Resolve overlaps between ALL root nodes (since affected roots might push others)
  const rootNodes = allNodes.filter(n => n.parentId === null)
  resolveSiblingOverlaps(rootNodes, allNodes)
}

/**
 * LOD-aware optimized function: Only resolve overlaps for affected root trees
 * Uses visible nodes for overlap resolution, but all nodes for bounding box calculation
 *
 * @param affectedNodeIds - IDs of nodes that changed
 * @param visibleNodes - Nodes visible at current LOD level
 * @param allNodes - All nodes (including LOD-hidden)
 */
export function resolveOverlapsForAffectedRootsLOD(
  affectedNodeIds: string[],
  visibleNodes: NodeData[],
  allNodes: NodeData[]
): void {
  // Find all affected root nodes (search in allNodes to find the root)
  const affectedRoots = new Set<string>()
  for (const nodeId of affectedNodeIds) {
    const root = getRootNode(nodeId, allNodes)
    if (root) {
      affectedRoots.add(root.id)
    }
  }

  // Resolve overlaps within each affected root tree (only visible nodes)
  for (const rootId of affectedRoots) {
    const root = visibleNodes.find(n => n.id === rootId)
    if (root) {
      resolveOverlapsRecursiveLOD(root, visibleNodes, allNodes)
    }
  }

  // Resolve overlaps between ALL visible root nodes
  // Use allNodes for bounding box calculation (includes LOD-hidden children)
  const visibleRootNodes = visibleNodes.filter(n => n.parentId === null)
  resolveSiblingOverlaps(visibleRootNodes, allNodes)
}

