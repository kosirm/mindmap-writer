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
  spacingRatio: number     // Ratio for angle-based spacing (1.0 = uniform, >1.0 = more north/south spacing)
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
    nodeSpacing: 60,
    spacingRatio: 1.5  // Default ratio: 1.5x more spacing at north/south than east/west
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
   * Calculate angle-based spacing factor
   * Returns a spacing multiplier based on angle (0 = more spacing at north/south)
   */
  const getAngleSpacingFactor = (angle: number, spacingRatio: number): number => {
    // Normalize angle to 0-2π range
    const normalizedAngle = angle % (2 * Math.PI)
    
    // Calculate spacing factor based on angle
    // We want more spacing at north/south (0° and 180°) and less at east/west (90° and 270°)
    // Use cosine function: cos(0) = 1 (north/south), cos(90°) = 0 (east/west)
    const cosAngle = Math.cos(normalizedAngle)
    
    // Map cosine value to spacing factor
    // cosAngle ranges from -1 to 1, we want it from 0 to 1
    const absCosAngle = Math.abs(cosAngle)
    
    // Calculate spacing factor: interpolate between 1.0 and spacingRatio
    // When absCosAngle = 1 (north/south): factor = spacingRatio
    // When absCosAngle = 0 (east/west): factor = 1.0
    const factor = 1.0 + (spacingRatio - 1.0) * absCosAngle
    
    console.log(`Angle: ${normalizedAngle.toFixed(3)} rad (${(normalizedAngle * 180 / Math.PI).toFixed(1)}°), cos: ${cosAngle.toFixed(3)}, absCos: ${absCosAngle.toFixed(3)}, spacingRatio: ${spacingRatio}, factor: ${factor.toFixed(3)}`)
    
    return factor
  }

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

      // Apply angle-based spacing adjustment
      const midAngle = (currentAngle + childSectorEnd) / 2
      const spacingFactor = getAngleSpacingFactor(midAngle, params.spacingRatio || 1.5)
      
      console.log(`Child sector: ${(currentAngle * 180 / Math.PI).toFixed(1)}° to ${(childSectorEnd * 180 / Math.PI).toFixed(1)}°, mid: ${(midAngle * 180 / Math.PI).toFixed(1)}°, original width: ${(childSectorWidth * 180 / Math.PI).toFixed(1)}°, spacingFactor: ${spacingFactor.toFixed(3)}`)
      
      // Adjust the sector width based on the spacing factor
      // The idea is to make sectors at north/south wider and sectors at east/west narrower
      const adjustedSectorWidth = childSectorWidth * spacingFactor
      const adjustedSectorEnd = currentAngle + adjustedSectorWidth
      
      console.log(`Adjusted sector width: ${(adjustedSectorWidth * 180 / Math.PI).toFixed(1)}°, end: ${(adjustedSectorEnd * 180 / Math.PI).toFixed(1)}°`)

      // Recursively position child's subtree
      positionTreeInSector(
        child,
        centerX,
        centerY,
        currentAngle,
        adjustedSectorEnd,
        params,
        positions
      )

      currentAngle = adjustedSectorEnd
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
    console.log('Circular layout called with params:', layoutParams)
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

    // Implement relative spacing algorithm to ensure all nodes fit within 360°
    if (layoutParams.spacingRatio && layoutParams.spacingRatio !== 1.0) {
      // Step 1: Calculate base sector widths (without spacing ratio)
      const baseSectors = trees.map(tree => {
        const minSectorRad = toRadians(layoutParams.minSectorAngle)
        const proportionalSector = (tree.subtreeSize / totalSize) * fullCircle
        return Math.max(proportionalSector, minSectorRad)
      })

      // Step 2: Calculate midpoint angles for each base sector
      let tempAngle = startAngleRad
      const midAngles = baseSectors.map(sectorWidth => {
        const sectorMid = tempAngle + (sectorWidth / 2)
        tempAngle += sectorWidth
        return sectorMid
      })

      // Step 3: Calculate spacing factors for each sector
      const spacingFactors = midAngles.map(midAngle =>
        getAngleSpacingFactor(midAngle, layoutParams.spacingRatio || 1.5)
      )

      // Step 4: Calculate weighted sectors (base * spacing factor)
      const weightedSectors = baseSectors.map((baseSector, i) =>
        baseSector * spacingFactors[i]
      )

      // Step 5: Calculate total weighted space
      const totalWeightedSpace = weightedSectors.reduce((sum, sector) => sum + sector, 0)

      // Step 6: Normalize to fit within 360° by calculating scaling factor
      const scalingFactor = fullCircle / totalWeightedSpace

      console.log(`Relative spacing: base sectors sum to ${(baseSectors.reduce((sum, s) => sum + s, 0) * 180 / Math.PI).toFixed(1)}°, weighted sectors sum to ${(totalWeightedSpace * 180 / Math.PI).toFixed(1)}°, scaling factor: ${scalingFactor.toFixed(3)}`)

      // Step 7: Apply relative spacing with normalization
      trees.forEach((tree, treeIndex) => {
        const baseSectorWidth = baseSectors[treeIndex]
        const spacingFactor = spacingFactors[treeIndex]
        const weightedSectorWidth = weightedSectors[treeIndex]
        const finalSectorWidth = weightedSectorWidth * scalingFactor
        
        const sectorStart = currentAngle
        const sectorEnd = currentAngle + finalSectorWidth * direction

        console.log(`Tree ${treeIndex}: base=${(baseSectorWidth * 180 / Math.PI).toFixed(1)}°, weighted=${(weightedSectorWidth * 180 / Math.PI).toFixed(1)}°, final=${(finalSectorWidth * 180 / Math.PI).toFixed(1)}°, factor=${spacingFactor.toFixed(3)}`)

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
    } else {
      // Original uniform spacing (no spacing ratio)
      trees.forEach((tree, index) => {
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
    }

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
