import RBush from 'rbush'
import type { NodeData } from './types'

export interface Rectangle {
  x: number
  y: number
  width: number
  height: number
}

export interface BoundingRect extends Rectangle {
  nodeId: string
  padding: number
}

const PADDING = 20

// RBush item format
interface RBushItem {
  minX: number
  minY: number
  maxX: number
  maxY: number
  nodeId: string
}

function rectToRBushItem(rect: BoundingRect): RBushItem {
  return {
    minX: rect.x,
    minY: rect.y,
    maxX: rect.x + rect.width,
    maxY: rect.y + rect.height,
    nodeId: rect.nodeId
  }
}

// Calculate bounding rectangle for a node and all its descendants
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

function expandRectToIncludeRect(rect: Rectangle, other: Rectangle): Rectangle {
  const minX = Math.min(rect.x, other.x)
  const minY = Math.min(rect.y, other.y)
  const maxX = Math.max(rect.x + rect.width, other.x + other.width)
  const maxY = Math.max(rect.y + rect.height, other.y + other.height)

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  }
}

function addPadding(rect: Rectangle, padding: number): Rectangle {
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2
  }
}

export function checkOverlap(rect1: Rectangle, rect2: Rectangle): boolean {
  return !(
    rect1.x + rect1.width <= rect2.x ||
    rect2.x + rect2.width <= rect1.x ||
    rect1.y + rect1.height <= rect2.y ||
    rect2.y + rect2.height <= rect1.y
  )
}

// RBush-based overlap detection
export function findOverlapsRBush(boundingRects: BoundingRect[]): Array<[BoundingRect, BoundingRect]> {
  const tree = new RBush<RBushItem>()
  const overlaps: Array<[BoundingRect, BoundingRect]> = []
  
  // Build spatial index
  const items = boundingRects.map(rectToRBushItem)
  tree.load(items)
  
  // Check each rectangle against the tree
  for (const rect of boundingRects) {
    const item = rectToRBushItem(rect)
    const candidates = tree.search(item)
    
    for (const candidate of candidates) {
      if (candidate.nodeId !== rect.nodeId && candidate.nodeId > rect.nodeId) {
        const otherRect = boundingRects.find(r => r.nodeId === candidate.nodeId)
        if (otherRect && checkOverlap(rect, otherRect)) {
          overlaps.push([rect, otherRect])
        }
      }
    }
  }
  
  return overlaps
}

