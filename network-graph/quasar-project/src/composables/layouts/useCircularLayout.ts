// Circular Layout Composable
// Places root nodes in a small inner circle, with descendants radiating outward
// in tree formation on progressively larger concentric circles

import type * as vNG from 'v-network-graph'

export interface CircularLayoutParams {
  innerRadius: number      // Radius for root nodes circle
  levelSpacing: number     // Distance between concentric circles (generations)
  startAngle: number       // Starting angle in degrees (0 = right, 90 = bottom)
  clockwise: boolean       // Direction of layout
  minSectorAngle: number   // Minimum angle per root node sector (degrees)
  nodeSpacing: number      // Minimum spacing between nodes on same circle
}

export interface MindMapNode {
  name: string
  parentId: string | null
  order: number
  zIndex?: number
}

export interface MindMapEdge {
  source: string
  target: string
  type: 'hierarchy' | 'reference'
}

interface NodePosition {
  x: number
  y: number
}

interface TreeNode {
  id: string
  children: TreeNode[]
  depth: number
  subtreeSize: number  // Total descendants including self
}

export const useCircularLayout = () => {
  const defaultParams: CircularLayoutParams = {
    innerRadius: 100,
    levelSpacing: 120,
    startAngle: -90,  // Start from top
    clockwise: true,
    minSectorAngle: 30,
    nodeSpacing: 60
  }

  /**
   * Find all root nodes (nodes with no parent in hierarchy edges)
   */
  const findRootNodes = (
    nodes: Record<string, MindMapNode>,
    edges: Record<string, MindMapEdge>
  ): string[] => {
    const nodeIds = Object.keys(nodes)
    const childIds = new Set<string>()

    // Collect all nodes that are targets of hierarchy edges
    Object.values(edges).forEach(edge => {
      if (edge.type === 'hierarchy') {
        childIds.add(edge.target)
      }
    })

    // Root nodes are those not targeted by any hierarchy edge
    return nodeIds.filter(id => !childIds.has(id))
  }

  /**
   * Build tree structure from a root node
   */
  const buildTree = (
    rootId: string,
    edges: Record<string, MindMapEdge>,
    allNodes: Set<string>,
    depth: number = 0
  ): TreeNode => {
    // Find direct children
    const children = Object.values(edges)
      .filter(edge => 
        edge.type === 'hierarchy' && 
        edge.source === rootId &&
        allNodes.has(edge.target)
      )
      .map(edge => buildTree(edge.target, edges, allNodes, depth + 1))

    // Calculate subtree size (self + all descendants)
    const subtreeSize = 1 + children.reduce((sum, child) => sum + child.subtreeSize, 0)

    return {
      id: rootId,
      children,
      depth,
      subtreeSize
    }
  }

  /**
   * Calculate the maximum depth of a tree
   */
  const getMaxDepth = (tree: TreeNode): number => {
    if (tree.children.length === 0) return tree.depth
    return Math.max(...tree.children.map(getMaxDepth))
  }

  /**
   * Convert degrees to radians
   */
  const toRadians = (degrees: number): number => degrees * (Math.PI / 180)

  /**
   * Position nodes in a tree within a sector
   * @param tree - The tree structure to position
   * @param centerX - Canvas center X
   * @param centerY - Canvas center Y
   * @param sectorStart - Start angle of sector (radians)
   * @param sectorEnd - End angle of sector (radians)
   * @param params - Layout parameters
   * @param positions - Output positions map
   */
  const positionTreeInSector = (
    tree: TreeNode,
    centerX: number,
    centerY: number,
    sectorStart: number,
    sectorEnd: number,
    params: CircularLayoutParams,
    positions: Record<string, NodePosition>
  ): void => {
    // Calculate radius for this depth level
    const radius = params.innerRadius + (tree.depth * params.levelSpacing)
    
    // Calculate angle for this node (center of its allocated sector)
    const sectorMid = (sectorStart + sectorEnd) / 2
    
    // Position this node
    positions[tree.id] = {
      x: centerX + radius * Math.cos(sectorMid),
      y: centerY + radius * Math.sin(sectorMid)
    }

    // If no children, we're done
    if (tree.children.length === 0) return

    // Distribute children within the sector based on their subtree sizes
    const totalSubtreeSize = tree.children.reduce((sum, child) => sum + child.subtreeSize, 0)
    const sectorWidth = sectorEnd - sectorStart

    let currentAngle = sectorStart
    tree.children.forEach(child => {
      // Allocate sector proportional to subtree size
      const childSectorWidth = (child.subtreeSize / totalSubtreeSize) * sectorWidth
      const childSectorEnd = currentAngle + childSectorWidth

      // Recursively position child's subtree
      positionTreeInSector(
        child,
        centerX,
        centerY,
        currentAngle,
        childSectorEnd,
        params,
        positions
      )

      currentAngle = childSectorEnd
    })
  }

  /**
   * Apply circular layout to the entire graph
   * @param nodes - All nodes in the graph
   * @param edges - All edges in the graph
   * @param layouts - VueFlow layouts object to update
   * @param centerX - Canvas center X coordinate
   * @param centerY - Canvas center Y coordinate
   * @param params - Layout parameters (optional, uses defaults if not provided)
   */
  const applyCircularLayout = (
    nodes: Record<string, MindMapNode>,
    edges: Record<string, MindMapEdge>,
    layouts: vNG.Layouts,
    centerX: number = 0,
    centerY: number = 0,
    params: Partial<CircularLayoutParams> = {}
  ): boolean => {
    const layoutParams = { ...defaultParams, ...params }
    const nodeIds = new Set(Object.keys(nodes))

    // Find root nodes
    const rootIds = findRootNodes(nodes, edges)
    
    if (rootIds.length === 0) {
      console.warn('No root nodes found')
      return false
    }

    // Build trees for each root
    const trees = rootIds.map(rootId => buildTree(rootId, edges, nodeIds))

    // Calculate total subtree sizes for sector allocation
    const totalSize = trees.reduce((sum, tree) => sum + tree.subtreeSize, 0)

    // Calculate full circle angle range
    const fullCircle = 2 * Math.PI
    const startAngleRad = toRadians(layoutParams.startAngle)
    const direction = layoutParams.clockwise ? 1 : -1

    // Position each root's tree in its allocated sector
    const positions: Record<string, NodePosition> = {}
    let currentAngle = startAngleRad

    trees.forEach(tree => {
      // Allocate sector proportional to subtree size
      // Ensure minimum sector angle
      const minSectorRad = toRadians(layoutParams.minSectorAngle)
      const proportionalSector = (tree.subtreeSize / totalSize) * fullCircle
      const sectorWidth = Math.max(proportionalSector, minSectorRad) * direction

      const sectorStart = currentAngle
      const sectorEnd = currentAngle + sectorWidth

      // Position this tree within its sector
      positionTreeInSector(
        tree,
        centerX,
        centerY,
        Math.min(sectorStart, sectorEnd),
        Math.max(sectorStart, sectorEnd),
        layoutParams,
        positions
      )

      currentAngle = sectorEnd
    })

    // Apply positions to layouts
    Object.entries(positions).forEach(([nodeId, pos]) => {
      layouts.nodes[nodeId] = { x: pos.x, y: pos.y }
    })

    return true
  }

  /**
   * Apply circular layout starting from a selected node
   * The selected node becomes the center, and its descendants radiate outward
   */
  const applyCircularToSelected = (
    nodes: Record<string, MindMapNode>,
    edges: Record<string, MindMapEdge>,
    layouts: vNG.Layouts,
    selectedNodeId: string,
    params: Partial<CircularLayoutParams> = {}
  ): boolean => {
    if (!selectedNodeId || !nodes[selectedNodeId]) {
      console.warn('No valid selected node')
      return false
    }

    const layoutParams = { ...defaultParams, ...params }
    const nodeIds = new Set(Object.keys(nodes))

    // Get current position of selected node as center
    const selectedPos = layouts.nodes[selectedNodeId]
    if (!selectedPos) {
      console.warn('Selected node has no position')
      return false
    }

    const centerX = selectedPos.x
    const centerY = selectedPos.y

    // Build tree from selected node
    const tree = buildTree(selectedNodeId, edges, nodeIds)

    if (tree.children.length === 0) {
      console.warn('Selected node has no children')
      return false
    }

    // Position selected node at center (depth 0)
    const positions: Record<string, NodePosition> = {
      [selectedNodeId]: { x: centerX, y: centerY }
    }

    // Calculate full circle for children
    const fullCircle = 2 * Math.PI
    const startAngleRad = toRadians(layoutParams.startAngle)
    const direction = layoutParams.clockwise ? 1 : -1

    // Distribute children around the center
    const totalSize = tree.children.reduce((sum, child) => sum + child.subtreeSize, 0)
    let currentAngle = startAngleRad

    tree.children.forEach(child => {
      // Allocate sector proportional to subtree size
      const minSectorRad = toRadians(layoutParams.minSectorAngle)
      const proportionalSector = (child.subtreeSize / totalSize) * fullCircle
      const sectorWidth = Math.max(proportionalSector, minSectorRad) * direction

      const sectorStart = currentAngle
      const sectorEnd = currentAngle + sectorWidth

      // Recursively update depths
      const updateDepths = (node: TreeNode, baseDepth: number): TreeNode => ({
        ...node,
        depth: baseDepth,
        children: node.children.map(c => updateDepths(c, baseDepth + 1))
      })

      const adjustedTree = updateDepths(child, 1)

      // Position this subtree within its sector
      positionTreeInSector(
        adjustedTree,
        centerX,
        centerY,
        Math.min(sectorStart, sectorEnd),
        Math.max(sectorStart, sectorEnd),
        layoutParams,
        positions
      )

      currentAngle = sectorEnd
    })

    // Apply positions to layouts
    Object.entries(positions).forEach(([nodeId, pos]) => {
      layouts.nodes[nodeId] = { x: pos.x, y: pos.y }
    })

    return true
  }

  return {
    defaultParams,
    findRootNodes,
    buildTree,
    getMaxDepth,
    applyCircularLayout,
    applyCircularToSelected
  }
}

export default useCircularLayout
