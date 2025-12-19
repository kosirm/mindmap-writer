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
  nodeWidth?: number       // Width of nodes (default: 120)
  nodeHeight?: number      // Height of nodes (default: 40)
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
    spacingRatio: 1.5,  // Default ratio: 1.5x more spacing at north/south than east/west
    nodeWidth: 120,     // Default node width
    nodeHeight: 40      // Default node height
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
   * Calculate the shortest distance between two rectangles
   * Based on the algorithm from: https://weixuanz.github.io/posts/2021/04/11/rectangles-shortest-distance/
   */
  const getMinDistanceBetweenRectangles = (
    rect1: { x: number; y: number; width: number; height: number },
    rect2: { x: number; y: number; width: number; height: number }
  ): number => {
    // Helper function to check if a point is in the shadow of a line segment
    const pointInLineShadow = (p1: { x: number; y: number }, p2: { x: number; y: number }, q: { x: number; y: number }): boolean => {
      const segmentLength = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
      const segmentDir = {
        x: (p2.x - p1.x) / segmentLength,
        y: (p2.y - p1.y) / segmentLength
      }
      const projection = (q.x - p1.x) * segmentDir.x + (q.y - p1.y) * segmentDir.y
      return 0 < projection && projection < segmentLength
    }

    // Helper function to get the shortest distance from a point to a line segment
    const getMinDistanceToSegment = (p1: { x: number; y: number }, p2: { x: number; y: number }, q: { x: number; y: number }): number => {
      if (pointInLineShadow(p1, p2, q)) {
        // Perpendicular distance
        const segmentLength = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
        const crossProduct = Math.abs((p2.x - p1.x) * (q.y - p1.y) - (p2.y - p1.y) * (q.x - p1.x))
        return crossProduct / segmentLength
      } else {
        // Distance to closest endpoint
        const distToP1 = Math.sqrt(Math.pow(q.x - p1.x, 2) + Math.pow(q.y - p1.y, 2))
        const distToP2 = Math.sqrt(Math.pow(q.x - p2.x, 2) + Math.pow(q.y - p2.y, 2))
        return Math.min(distToP1, distToP2)
      }
    }

    // Get rectangle vertices in clockwise order
    const getRectangleVertices = (rect: { x: number; y: number; width: number; height: number }): Array<{ x: number; y: number }> => {
      return [
        { x: rect.x - rect.width / 2, y: rect.y - rect.height / 2 },  // Top-left
        { x: rect.x + rect.width / 2, y: rect.y - rect.height / 2 },  // Top-right
        { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 },  // Bottom-right
        { x: rect.x - rect.width / 2, y: rect.y + rect.height / 2 }   // Bottom-left
      ]
    }

    // Get rectangle sides as line segments
    const getRectangleSides = (vertices: Array<{ x: number; y: number }>): Array<[{ x: number; y: number }, { x: number; y: number }]> => {
      return vertices.map((vertex, i) => [vertex, vertices[(i + 1) % 4]!])
    }

    // Calculate minimum distance from a point to a rectangle
    const getMinDistancePointRectangle = (rectSides: Array<[ { x: number; y: number }, { x: number; y: number } ]>, q: { x: number; y: number }): number => {
      return Math.min(...rectSides.map(side => getMinDistanceToSegment(side[0], side[1], q)))
    }

    // Get vertices and sides for both rectangles
    const r1Vertices = getRectangleVertices(rect1)
    const r2Vertices = getRectangleVertices(rect2)
    const r1Sides = getRectangleSides(r1Vertices)
    const r2Sides = getRectangleSides(r2Vertices)

    // Calculate minimum distance from r1 vertices to r2 sides
    const minR1ToR2 = Math.min(...r1Vertices.map(vertex => getMinDistancePointRectangle(r2Sides, vertex)))

    // Calculate minimum distance from r2 vertices to r1 sides
    const minR2ToR1 = Math.min(...r2Vertices.map(vertex => getMinDistancePointRectangle(r1Sides, vertex)))

    return Math.min(minR1ToR2, minR2ToR1)
  }

  /**
   * Adjust node positions to ensure equal spacing between rectangles using iterative relaxation
   * Returns adjusted positions and the actual radius used (may be larger if auto-increased)
   */
  const adjustNodeSpacing = (
    nodes: Array<{ id: string; x: number; y: number }>,
    params: CircularLayoutParams,
    centerX: number,
    centerY: number,
    radius: number,
    startAngle: number
  ): { positions: Array<{ id: string; x: number; y: number }>; actualRadius: number } => {
    const numNodes = nodes.length

    if (numNodes < 2) {
      return { positions: nodes, actualRadius: radius } // Nothing to adjust
    }

    console.log('=== DEBUG: adjustNodeSpacing called ===')
    console.log(`Center: (${centerX}, ${centerY}), Radius: ${radius}, Nodes: ${numNodes}`)

    // Node dimensions (use params or defaults)
    const nodeWidth = params.nodeWidth ?? 120
    const nodeHeight = params.nodeHeight ?? 40

    // Check if nodes can fit in the circle and auto-increase radius if needed
    const minSpacing = 0
    const circumference = 2 * Math.PI * radius

    // For circular layout, we need to account for chord length vs arc length
    // A rough approximation: each node needs space for its width projected onto the circle
    // plus the desired spacing. We use a factor of 0.85 to account for the fact that
    // chord length < arc length, making the calculation less conservative.
    const requiredCircumference = numNodes * (nodeWidth * 0.85 + minSpacing)

    let actualRadius = radius
    if (requiredCircumference > circumference) {
      actualRadius = Math.ceil(requiredCircumference / (2 * Math.PI))
      console.warn(`⚠️ AUTO-ADJUSTING RADIUS: ${numNodes} nodes cannot fit in circle with radius ${radius}`)
      console.warn(`   Current circumference: ${circumference.toFixed(1)}px`)
      console.warn(`   Required circumference: ${requiredCircumference.toFixed(1)}px`)
      console.warn(`   Auto-increased radius: ${radius}px → ${actualRadius}px`)
    }

    // IMPORTANT: Always start with equal angular spacing to ensure consistent results
    // Don't use current positions as they may be from a previous layout with different node count
    const startAngleRad = (startAngle * Math.PI / 180) - (Math.PI / 2)
    const angleStep = (2 * Math.PI) / numNodes
    const angles = nodes.map((_, i) => startAngleRad + (i * angleStep))

    // Iterative relaxation parameters
    const maxIterations = 100 // Increased for difficult cases
    const convergenceThreshold = 0.5 // pixels
    let relaxationFactor = 0.3 // How much to adjust each iteration (0-1)

    console.log(`Initial angles: ${angles.map(a => (a * 180 / Math.PI).toFixed(1)).join(', ')}°`)
    console.log(`Using radius: ${actualRadius}px (original: ${radius}px)`)

    // Iterative relaxation loop
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      // Calculate current positions from angles using actualRadius
      const currentPositions = angles.map(angle => ({
        x: centerX + actualRadius * Math.cos(angle),
        y: centerY + actualRadius * Math.sin(angle)
      }))

      // Calculate distances between consecutive rectangles
      const distances: number[] = []
      let hasOverlaps = false
      for (let i = 0; i < numNodes; i++) {
        const current = {
          x: currentPositions[i]!.x,
          y: currentPositions[i]!.y,
          width: nodeWidth,
          height: nodeHeight
        }
        const next = {
          x: currentPositions[(i + 1) % numNodes]!.x,
          y: currentPositions[(i + 1) % numNodes]!.y,
          width: nodeWidth,
          height: nodeHeight
        }

        const distance = getMinDistanceBetweenRectangles(current, next)
        distances.push(distance)
        if (distance < 1) hasOverlaps = true // Detect overlaps
      }

      // Calculate target spacing
      // If there are overlaps, use minSpacing as target to force separation
      // Otherwise use average distance
      const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length
      const targetSpacing = hasOverlaps ? minSpacing : Math.max(avgDistance, minSpacing)

      // Use more aggressive relaxation when overlaps detected
      relaxationFactor = hasOverlaps ? 0.5 : 0.3

      // Calculate adjustments for each node
      const angleAdjustments: number[] = new Array(numNodes).fill(0)
      let maxAdjustment = 0

      for (let i = 0; i < numNodes; i++) {
        const prevIdx = (i - 1 + numNodes) % numNodes

        const distToPrev = distances[prevIdx]!
        const distToNext = distances[i]!

        // Calculate how much we need to adjust based on spacing errors
        const errorToPrev = targetSpacing - distToPrev
        const errorToNext = targetSpacing - distToNext

        // If distance is too small, push nodes apart; if too large, pull together
        // We adjust the angle to change the arc length
        // Approximate: for small angles, arc length ≈ radius * angle
        const angleDeltaToPrev = errorToPrev / (2 * actualRadius)
        const angleDeltaToNext = -errorToNext / (2 * actualRadius)

        // Combine adjustments from both neighbors
        const totalAdjustment = (angleDeltaToPrev + angleDeltaToNext) * relaxationFactor
        angleAdjustments[i] = totalAdjustment

        maxAdjustment = Math.max(maxAdjustment, Math.abs(totalAdjustment * actualRadius))
      }

      // Apply adjustments
      for (let i = 0; i < numNodes; i++) {
        const adjustment = angleAdjustments[i]
        if (adjustment !== undefined) {
          angles[i]! += adjustment
        }
      }

      if (iteration % 10 === 0 || iteration === maxIterations - 1) {
        console.log(`Iteration ${iteration}: distances=[${distances.map(d => d.toFixed(1)).join(', ')}], target=${targetSpacing.toFixed(1)}, maxAdj=${maxAdjustment.toFixed(2)}`)
      }

      // Check for convergence
      if (maxAdjustment < convergenceThreshold) {
        console.log(`Converged after ${iteration + 1} iterations`)
        break
      }
    }

    // Calculate final positions using actualRadius
    const adjustedPositions = angles.map((angle, i) => ({
      id: nodes[i]!.id,
      x: centerX + actualRadius * Math.cos(angle),
      y: centerY + actualRadius * Math.sin(angle)
    }))

    console.log(`Final angles: ${angles.map(a => (a * 180 / Math.PI).toFixed(1)).join(', ')}°`)
    console.log('=== END adjustNodeSpacing ===')

    return { positions: adjustedPositions, actualRadius }
  }

  /**
   * Position nodes in a tree within a sector using equal angular spacing
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
    positions: Record<string, NodePosition>,
    depth: number = 0
  ): void => {
    // Calculate radius for this depth level
    const radius = params.innerRadius + (depth * params.levelSpacing)

    // Calculate angle for this node (center of its allocated sector)
    const sectorMid = (sectorStart + sectorEnd) / 2

    // Position this node
    positions[tree.id] = {
      x: centerX + radius * Math.cos(sectorMid),
      y: centerY + radius * Math.sin(sectorMid)
    }

    // If no children, we're done
    if (tree.children.length === 0) return

    // First, position children using equal angular spacing
    const sectorWidth = sectorEnd - sectorStart
    const numChildren = tree.children.length
    const angleStep = sectorWidth / numChildren

    // Position children initially
    const childPositions: Array<{ id: string; x: number; y: number }> = []
    let currentAngle = sectorStart
    
    tree.children.forEach(child => {
      const childSectorMid = currentAngle + (angleStep / 2)
      const childX = centerX + radius * Math.cos(childSectorMid)
      const childY = centerY + radius * Math.sin(childSectorMid)
      
      childPositions.push({ id: child.id, x: childX, y: childY })
      currentAngle += angleStep
    })

    // Adjust spacing between children to ensure equal distances between rectangles
    console.log(`=== Before adjustment: ${childPositions.length} children at depth ${depth} ===`)
    childPositions.forEach((pos, i) => {
      console.log(`Child ${i} (${tree.children[i]?.id}): (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)})`)
    })

    const { positions: adjustedPositions } = adjustNodeSpacing(childPositions, params, centerX, centerY, radius, params.startAngle)

    console.log(`=== After adjustment: ${adjustedPositions.length} children ===`)
    adjustedPositions.forEach((pos, i) => {
      console.log(`Adjusted child ${i} (${tree.children[i]?.id}): (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)})`)
    })

    // Recursively position children's subtrees using adjusted positions
    adjustedPositions.forEach((adjustedPos, index) => {
      const child = tree.children[index]
      const childAngle = Math.atan2(adjustedPos.y - centerY, adjustedPos.x - centerX)
      
      // Calculate sector for this child (small range around its angle)
      const childSectorWidth = angleStep * 0.8  // Slightly smaller than original
      const childSectorStart = childAngle - (childSectorWidth / 2)
      const childSectorEnd = childAngle + (childSectorWidth / 2)

      // Recursively position child's subtree
      positionTreeInSector(
        child!,
        centerX,
        centerY,
        childSectorStart,
        childSectorEnd,
        params,
        positions,
        depth + 1
      )
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
   * @returns Object with success status and actual radius used (may be auto-increased)
   */
  const applyCircularLayout = (
    nodes: Record<string, MindMapNode>,
    edges: Record<string, MindMapEdge>,
    layouts: vNG.Layouts,
    centerX: number = 0,
    centerY: number = 0,
    params: Partial<CircularLayoutParams> = {}
  ): { success: boolean; actualRadius?: number } => {
    const layoutParams = { ...defaultParams, ...params }
    console.log('Circular layout called with params:', layoutParams)
    const nodeIds = new Set(Object.keys(nodes))

    // Find root nodes
    const rootIds = findRootNodes(nodes, edges)

    if (rootIds.length === 0) {
      console.warn('No root nodes found')
      return { success: false }
    }

    // Track the actual radius used (may be auto-increased)
    let actualRadiusUsed = layoutParams.innerRadius

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

    // First, position all root nodes with equal angular spacing
    const rootPositions: Array<{ id: string; x: number; y: number }> = []

    // Implement relative spacing algorithm to ensure all nodes fit within 360°
    if (layoutParams.spacingRatio && layoutParams.spacingRatio !== 1.0) {
      // Step 1: Calculate base sector widths (without spacing ratio)
      const baseSectors = trees.map(tree => {
        const minSectorRad = toRadians(layoutParams.minSectorAngle)
        const proportionalSector = (tree.subtreeSize / totalSize) * fullCircle
        return Math.max(proportionalSector, minSectorRad)
      })

      // Apply equal angular spacing
      trees.forEach((tree, treeIndex) => {
        const sectorWidth = baseSectors[treeIndex] ?? 0
        const finalSectorWidth = sectorWidth

        const sectorStart = currentAngle
        const sectorEnd = currentAngle + finalSectorWidth * direction

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

        // Collect root node positions for spacing adjustment
        if (tree.depth === 0) {  // Only root nodes (depth 0)
          const pos = positions[tree.id]
          if (pos) {
            rootPositions.push({ id: tree.id, x: pos.x, y: pos.y })
          }
        }

        currentAngle = sectorEnd
      })
    } else {
      // Original uniform spacing (no spacing ratio)
      trees.forEach((tree) => {
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

        // Collect root node positions for spacing adjustment
        if (tree.depth === 0) {  // Only root nodes (depth 0)
          const pos = positions[tree.id]
          if (pos) {
            rootPositions.push({ id: tree.id, x: pos.x, y: pos.y })
          }
        }

        currentAngle = sectorEnd
      })
    }

    // Apply spacing adjustment to root nodes if we have multiple roots
    if (rootPositions.length > 1) {
      console.log(`=== APPLYING SPACING ADJUSTMENT TO ${rootPositions.length} ROOT NODES ===`)
      const { positions: adjustedRootPositions, actualRadius } = adjustNodeSpacing(rootPositions, layoutParams, centerX, centerY, layoutParams.innerRadius, layoutParams.startAngle)

      // Update the actual radius used
      actualRadiusUsed = actualRadius

      // Update positions with adjusted spacing
      adjustedRootPositions.forEach(adjustedPos => {
        positions[adjustedPos.id] = { x: adjustedPos.x, y: adjustedPos.y }
      })
    }

    // Apply positions to layouts
    Object.entries(positions).forEach(([nodeId, pos]) => {
      layouts.nodes[nodeId] = { x: pos.x, y: pos.y }
    })

    // Debug: Log final positions
    console.log('=== FINAL NODE POSITIONS ===')
    Object.entries(layouts.nodes).forEach(([nodeId, pos]) => {
      console.log(`Node ${nodeId}: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)})`)
    })
    console.log('=== END POSITIONS ===')

    return { success: true, actualRadius: actualRadiusUsed }
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
