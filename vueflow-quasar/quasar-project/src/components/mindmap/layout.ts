import type { NodeData, BoundingRect, Rectangle } from './types'
import { rectanglesOverlap, expandRectToIncludeRect, addPaddingXY } from './collision'

/**
 * Nested Rectangle Layout Algorithm
 */

// Layout spacing configuration
let HORIZONTAL_SPACING = 0
let VERTICAL_SPACING = 0

export function setLayoutSpacing(horizontal: number, vertical: number): void {
  HORIZONTAL_SPACING = horizontal
  VERTICAL_SPACING = vertical
}

export function getLayoutSpacing(): { horizontal: number; vertical: number } {
  return { horizontal: HORIZONTAL_SPACING, vertical: VERTICAL_SPACING }
}

export function calculateBoundingRect(node: NodeData, allNodes: NodeData[]): BoundingRect {
  let rect: Rectangle = { x: node.x, y: node.y, width: node.width, height: node.height }

  if (node.collapsed) {
    return { ...rect, nodeId: node.id, padding: 0 }
  }

  const children = allNodes.filter(n => n.parentId === node.id)

  if (children.length === 0) {
    rect = addPaddingXY(rect, HORIZONTAL_SPACING, VERTICAL_SPACING)
    return { ...rect, nodeId: node.id, padding: Math.max(HORIZONTAL_SPACING, VERTICAL_SPACING) }
  }

  const childBounds = children.map(child => calculateBoundingRect(child, allNodes))
  for (const childBound of childBounds) {
    rect = expandRectToIncludeRect(rect, childBound)
  }

  rect = addPaddingXY(rect, HORIZONTAL_SPACING, VERTICAL_SPACING)
  return { ...rect, nodeId: node.id, padding: Math.max(HORIZONTAL_SPACING, VERTICAL_SPACING) }
}

function getChildren(nodeId: string, allNodes: NodeData[]): NodeData[] {
  return allNodes.filter(n => n.parentId === nodeId)
}

export function moveNodeAndDescendants(node: NodeData, deltaX: number, deltaY: number, allNodes: NodeData[]): void {
  node.x += deltaX
  node.y += deltaY
  const children = getChildren(node.id, allNodes)
  for (const child of children) {
    moveNodeAndDescendants(child, deltaX, deltaY, allNodes)
  }
}

export function getAllDescendants(nodeId: string, allNodes: NodeData[]): NodeData[] {
  const descendants: NodeData[] = []
  const children = getChildren(nodeId, allNodes)
  for (const child of children) {
    descendants.push(child)
    descendants.push(...getAllDescendants(child.id, allNodes))
  }
  return descendants
}

export function resolveSiblingOverlaps(siblings: NodeData[], allNodes: NodeData[]): void {
  if (siblings.length === 0) return

  const MAX_ITERATIONS = 5
  const MAX_PUSH = 200

  const firstSibling = siblings[0]
  if (!firstSibling) return

  const parentId = firstSibling.parentId
  const parentNode = parentId ? allNodes.find(n => n.id === parentId) : null

  const bounds = siblings.map(sibling => ({
    node: sibling,
    rect: calculateBoundingRect(sibling, allNodes)
  }))

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    let hadOverlap = false

    for (let i = 0; i < bounds.length; i++) {
      for (let j = i + 1; j < bounds.length; j++) {
        const a = bounds[i]!
        const b = bounds[j]!

        if (rectanglesOverlap(a.rect, b.rect)) {
          hadOverlap = true
          const overlap = {
            x: Math.min(a.rect.x + a.rect.width, b.rect.x + b.rect.width) - Math.max(a.rect.x, b.rect.x),
            y: Math.min(a.rect.y + a.rect.height, b.rect.y + b.rect.height) - Math.max(a.rect.y, b.rect.y)
          }

          let deltaX_A = 0, deltaY_A = 0, deltaX_B = 0, deltaY_B = 0

          if (overlap.x < overlap.y) {
            const pushAmount = Math.min(overlap.x / 2, MAX_PUSH)
            if (a.rect.x < b.rect.x) { deltaX_A = -pushAmount; deltaX_B = pushAmount }
            else { deltaX_A = pushAmount; deltaX_B = -pushAmount }
          } else {
            const pushAmount = Math.min(overlap.y / 2, MAX_PUSH)
            if (a.rect.y < b.rect.y) { deltaY_A = -pushAmount; deltaY_B = pushAmount }
            else { deltaY_A = pushAmount; deltaY_B = -pushAmount }
          }

          moveNodeAndDescendants(a.node, deltaX_A, deltaY_A, allNodes)
          moveNodeAndDescendants(b.node, deltaX_B, deltaY_B, allNodes)
          a.rect.x += deltaX_A; a.rect.y += deltaY_A
          b.rect.x += deltaX_B; b.rect.y += deltaY_B
        }
      }
    }

    if (parentNode) {
      const parentRect: Rectangle = { x: parentNode.x, y: parentNode.y, width: parentNode.width, height: parentNode.height }
      for (const bound of bounds) {
        if (rectanglesOverlap(bound.rect, parentRect)) {
          hadOverlap = true
          const overlap = {
            x: Math.min(bound.rect.x + bound.rect.width, parentRect.x + parentRect.width) - Math.max(bound.rect.x, parentRect.x),
            y: Math.min(bound.rect.y + bound.rect.height, parentRect.y + parentRect.height) - Math.max(bound.rect.y, parentRect.y)
          }
          let deltaX = 0, deltaY = 0
          if (overlap.x < overlap.y) {
            const pushAmount = Math.min(overlap.x + HORIZONTAL_SPACING, MAX_PUSH)
            deltaX = bound.rect.x < parentRect.x ? -pushAmount : pushAmount
          } else {
            const pushAmount = Math.min(overlap.y + VERTICAL_SPACING, MAX_PUSH)
            deltaY = bound.rect.y < parentRect.y ? -pushAmount : pushAmount
          }
          moveNodeAndDescendants(bound.node, deltaX, deltaY, allNodes)
          bound.rect.x += deltaX; bound.rect.y += deltaY
        }
      }
    }
    if (!hadOverlap) break
  }
}

function resolveOverlapsRecursive(node: NodeData, allNodes: NodeData[]): void {
  const children = getChildren(node.id, allNodes)
  for (const child of children) {
    resolveOverlapsRecursive(child, allNodes)
  }
  if (children.length > 0) {
    resolveSiblingOverlaps(children, allNodes)
  }
}

export function resolveAllOverlaps(allNodes: NodeData[]): void {
  const rootNodes = allNodes.filter(n => n.parentId === null)
  for (const root of rootNodes) {
    resolveOverlapsRecursive(root, allNodes)
  }
  resolveSiblingOverlaps(rootNodes, allNodes)
}

export function resolveOverlapsLOD(visibleNodes: NodeData[], allNodes: NodeData[]): void {
  const visibleRootNodes = visibleNodes.filter(n => n.parentId === null)
  for (const root of visibleRootNodes) {
    resolveOverlapsRecursiveLOD(root, visibleNodes, allNodes)
  }
  resolveSiblingOverlaps(visibleRootNodes, allNodes)
}

function resolveOverlapsRecursiveLOD(node: NodeData, visibleNodes: NodeData[], allNodes: NodeData[]): void {
  const visibleChildren = visibleNodes.filter(n => n.parentId === node.id)
  if (visibleChildren.length === 0) return
  for (const child of visibleChildren) {
    resolveOverlapsRecursiveLOD(child, visibleNodes, allNodes)
  }
  resolveSiblingOverlaps(visibleChildren, allNodes)
}

function getRootNode(nodeId: string, allNodes: NodeData[]): NodeData | null {
  let node = allNodes.find(n => n.id === nodeId)
  if (!node) return null
  while (node.parentId !== null) {
    const parent = allNodes.find(n => n.id === node!.parentId)
    if (!parent) break
    node = parent
  }
  return node
}

export function resolveOverlapsForAffectedRoots(affectedNodeIds: string[], allNodes: NodeData[]): void {
  const affectedRoots = new Set<string>()
  for (const nodeId of affectedNodeIds) {
    const root = getRootNode(nodeId, allNodes)
    if (root) affectedRoots.add(root.id)
  }
  for (const rootId of affectedRoots) {
    const root = allNodes.find(n => n.id === rootId)
    if (root) resolveOverlapsRecursive(root, allNodes)
  }
  const rootNodes = allNodes.filter(n => n.parentId === null)
  resolveSiblingOverlaps(rootNodes, allNodes)
}

export function resolveOverlapsForAffectedRootsLOD(
  affectedNodeIds: string[],
  visibleNodes: NodeData[],
  allNodes: NodeData[]
): void {
  const affectedRoots = new Set<string>()
  for (const nodeId of affectedNodeIds) {
    const root = getRootNode(nodeId, allNodes)
    if (root) affectedRoots.add(root.id)
  }
  for (const rootId of affectedRoots) {
    const root = visibleNodes.find(n => n.id === rootId)
    if (root) resolveOverlapsRecursiveLOD(root, visibleNodes, allNodes)
  }
  const visibleRootNodes = visibleNodes.filter(n => n.parentId === null)
  resolveSiblingOverlaps(visibleRootNodes, allNodes)
}
