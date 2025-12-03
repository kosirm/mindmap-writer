import { type Ref } from 'vue'
import type { NodeData } from '../types'
import { getAllDescendants } from '../layout'

export function useNodeTree(nodes: Ref<NodeData[]>) {

    function getDirectChildren(nodeId: string): NodeData[] {
  return nodes.value.filter(n => n.parentId === nodeId)
}

function getVisibleDescendants(nodeId: string): NodeData[] {
  const node = nodes.value.find(n => n.id === nodeId)
  if (!node || node.collapsed) return []

  const children = getDirectChildren(nodeId)
  const descendants: NodeData[] = [...children]

  for (const child of children) {
    descendants.push(...getVisibleDescendants(child.id))
  }

  return descendants
}

function getChildrenSide(nodeId: string): 'left' | 'right' | null {
  const node = nodes.value.find(n => n.id === nodeId)
  if (!node) return null

  const children = getDirectChildren(nodeId)
  if (children.length === 0) return null

  // For root nodes, check first child position
  if (!node.parentId) {
    return children[0].x < node.x ? 'left' : 'right'
  }

  // For non-root nodes, check relative to root
  const root = getRootNode(nodeId)
  if (!root) return null

  return node.x < root.x ? 'left' : 'right'
}

// Get node depth (0 for root, 1 for direct children, etc.)
function getNodeDepth(nodeId: string): number {
  const node = nodes.value.find(n => n.id === nodeId)
  if (!node) return 0

  let depth = 0
  let current = node
  while (current.parentId) {
    depth++
    const parent = nodes.value.find(n => n.id === current.parentId)
    if (!parent) break
    current = parent
  }
  return depth
}

function getRootNode(nodeId: string): NodeData | null {
  let current = nodes.value.find(n => n.id === nodeId)
  if (!current) return null

  // Traverse up to find root
  while (current.parentId) {
    const parent = nodes.value.find(n => n.id === current.parentId)
    if (!parent) break
    current = parent
  }

  return current
}

function isRootNode(nodeId: string | null): boolean {
  if (!nodeId) return false
  const node = nodes.value.find(n => n.id === nodeId)
  return node ? node.parentId === null : false
}

function isNodeOnLeftOfRoot(node: NodeData): boolean {
  const root = getRootNode(node.id)
  if (!root) return false
  return node.x < root.x
}

  return {
    getDirectChildren,
    getVisibleDescendants,
    getChildrenSide,
    getNodeDepth,
    isRootNode,
    getRootNode,
    isNodeOnLeftOfRoot,
    getAllDescendants // re-export from layout
  }
}