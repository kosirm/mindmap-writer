// Circular Layout Composable
// Places root nodes in a small inner circle, with descendants radiating outward
// in tree formation on progressively larger concentric circles

import type * as vNG from 'v-network-graph'

export interface CircularLayoutParams {
  innerRadius: number      // Radius for root nodes circle
  levelSpacing: number     // Minimum distance between concentric circles (generations)
  startAngle: number       // Starting angle in degrees (0 = right, 90 = bottom)
  clockwise: boolean       // Direction of layout
  minSectorAngle: number   // Minimum angle per root node sector (degrees)
  nodeSpacing: number      // Minimum spacing between nodes on same circle (pixels)
  spacingRatio: number     // Ratio for angle-based spacing (1.0 = uniform, >1.0 = more north/south spacing)
  nodeWidth?: number       // Width of nodes (default: 120)
  nodeHeight?: number      // Height of nodes (default: 40)
  minNodeSpacing?: number  // Minimum spacing between node borders (default: 10 pixels)
  nodeSizeScaleFactor?: number  // Scale factor for node size when they don't fit (default: 0.9)
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
    nodeHeight: 40,     // Default node height
    minNodeSpacing: 10, // Minimum spacing between node borders
    nodeSizeScaleFactor: 0.9  // Scale factor when nodes don't fit
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
   * Calculate flexible sectors for root nodes based on their child counts
   * Parents with more children get more angular space
   */
  const calculateFlexibleSectors = (
    trees: TreeNode[],
    startAngle: number,
    fullCircle: number
  ): Array<{ start: number; end: number; tree: TreeNode }> => {
    if (trees.length === 0) return []
    if (trees.length === 1) {
      return [{ start: startAngle, end: startAngle + fullCircle, tree: trees[0]! }]
    }

    // Count total children at level 1 (direct children of roots)
    const childCounts = trees.map(tree => tree.children.length)
    const totalChildren = childCounts.reduce((sum, count) => sum + count, 0)

    // If no children, distribute equally
    if (totalChildren === 0) {
      const angleStep = fullCircle / trees.length
      return trees.map((tree, i) => ({
        start: startAngle + (i * angleStep),
        end: startAngle + ((i + 1) * angleStep),
        tree
      }))
    }

    // Allocate sectors proportional to child count
    // But ensure minimum sector size for nodes with few/no children
    const minSectorSize = fullCircle / (trees.length * 4) // At least 1/4 of equal share
    const sectors: Array<{ start: number; end: number; tree: TreeNode }> = []

    let currentAngle = startAngle
    trees.forEach((tree, i) => {
      const childCount = childCounts[i]!
      const proportionalSize = (childCount / totalChildren) * fullCircle
      const sectorSize = Math.max(proportionalSize, minSectorSize)

      sectors.push({
        start: currentAngle,
        end: currentAngle + sectorSize,
        tree
      })

      currentAngle += sectorSize
    })

    // Normalize to fit exactly in fullCircle
    const totalAllocated = currentAngle - startAngle
    const scale = fullCircle / totalAllocated

    currentAngle = startAngle
    sectors.forEach(sector => {
      const size = (sector.end - sector.start) * scale
      sector.start = currentAngle
      sector.end = currentAngle + size
      currentAngle = sector.end
    })

    return sectors
  }

  /**
   * Check if two rectangles collide
   */
  const rectanglesCollide = (
    rect1: { x: number; y: number; width: number; height: number },
    rect2: { x: number; y: number; width: number; height: number },
    minSpacing: number = 0
  ): boolean => {
    const distance = getMinDistanceBetweenRectangles(rect1, rect2)
    return distance < minSpacing
  }

  /**
   * Check if a node at given position collides with any existing nodes
   */
  const checkCollisionWithExisting = (
    x: number,
    y: number,
    width: number,
    height: number,
    existingPositions: Record<string, NodePosition>,
    params: CircularLayoutParams
  ): boolean => {
    const minSpacing = params.minNodeSpacing ?? 10
    const nodeWidth = params.nodeWidth ?? 120
    const nodeHeight = params.nodeHeight ?? 40

    const testRect = { x, y, width, height }

    for (const pos of Object.values(existingPositions)) {
      const existingRect = { x: pos.x, y: pos.y, width: nodeWidth, height: nodeHeight }
      if (rectanglesCollide(testRect, existingRect, minSpacing)) {
        return true
      }
    }

    return false
  }

  /**
   * Place child nodes on a circle using 3-step algorithm:
   * 1. Safe distance placement (spread evenly, can't overlap)
   * 2. Calculate real border distances
   * 3. Adjust to minimum distance
   * Returns adjusted positions and actual radius used
   */
  const placeChildrenOnCircle = (
    children: TreeNode[],
    parentAngle: number,
    parentRadius: number,
    childRadius: number,
    sectorStart: number,
    sectorEnd: number,
    centerX: number,
    centerY: number,
    params: CircularLayoutParams,
    allPositions: Record<string, NodePosition>
  ): { positions: Array<{ id: string; x: number; y: number; angle: number }>; actualRadius: number } => {

    const nodeWidth = params.nodeWidth ?? 120
    const nodeHeight = params.nodeHeight ?? 40

    if (children.length === 0) {
      return { positions: [], actualRadius: childRadius }
    }

    if (children.length === 1) {
      // Single child: place at parent's angle
      const x = centerX + childRadius * Math.cos(parentAngle)
      const y = centerY + childRadius * Math.sin(parentAngle)
      return {
        positions: [{ id: children[0]!.id, x, y, angle: parentAngle }],
        actualRadius: childRadius
      }
    }

    // STEP 1: Place children evenly in the sector
    // Simple algorithm: |-N-N-N-| (equal spacing between sector borders and nodes)
    console.log(`=== STEP 1: PLACE CHILDREN IN SECTOR ===`)
    console.log(`Parent angle: ${(parentAngle * 180 / Math.PI).toFixed(1)}°`)
    console.log(`Sector: [${(sectorStart * 180 / Math.PI).toFixed(1)}°, ${(sectorEnd * 180 / Math.PI).toFixed(1)}°]`)

    // Calculate sector width with wraparound handling
    let sectorWidth = sectorEnd - sectorStart
    if (sectorWidth < 0) sectorWidth += 2 * Math.PI

    const currentRadius = childRadius

    console.log(`Sector width: ${(sectorWidth * 180 / Math.PI).toFixed(1)}°`)
    console.log(`Number of children: ${children.length}`)

    // Divide sector into (n+1) equal parts: | - N - N - N - |
    // This creates equal spacing between borders and nodes
    const numSpaces = children.length + 1
    const spaceWidth = sectorWidth / numSpaces

    console.log(`Space width: ${(spaceWidth * 180 / Math.PI).toFixed(1)}°`)

    let centeredPositions = children.map((child, i) => {
      // Place node at position (i+1) * spaceWidth from sector start
      let angle = sectorStart + (i + 1) * spaceWidth

      // Normalize angle to [-π, π]
      if (angle > Math.PI) angle -= 2 * Math.PI
      if (angle < -Math.PI) angle += 2 * Math.PI
      return {
        id: child.id,
        x: centerX + currentRadius * Math.cos(angle),
        y: centerY + currentRadius * Math.sin(angle),
        angle
      }
    })

    console.log(`Node angles: ${centeredPositions.map(p => (p.angle * 180 / Math.PI).toFixed(1)).join(', ')}°`)

    // Calculate distances for debugging
    if (centeredPositions.length > 1) {
      const distances: number[] = []
      for (let i = 0; i < centeredPositions.length - 1; i++) {
        const current = centeredPositions[i]!
        const next = centeredPositions[i + 1]!

        const distance = getMinDistanceBetweenRectangles(
          { x: current.x, y: current.y, width: nodeWidth, height: nodeHeight },
          { x: next.x, y: next.y, width: nodeWidth, height: nodeHeight }
        )
        distances.push(distance)
      }
      console.log(`Distances between nodes: ${distances.map(d => d.toFixed(1)).join(', ')}px`)
    }

    // Check for collisions with existing nodes
    let collisionAttempts = 0
    const maxCollisionAttempts = 5
    let finalRadius = currentRadius

    while (collisionAttempts < maxCollisionAttempts) {
      let hasCollision = false

      // Check each child position against all existing positions
      for (const pos of centeredPositions) {
        if (checkCollisionWithExisting(pos.x, pos.y, nodeWidth, nodeHeight, allPositions, params)) {
          hasCollision = true
          break
        }
      }

      if (!hasCollision) {
        break // No collisions, we're good!
      }

      // Collision detected, increase radius and recalculate
      console.warn(`Collision detected at radius ${finalRadius}, increasing...`)
      finalRadius += params.levelSpacing * 0.15

      centeredPositions = centeredPositions.map(pos => {
        const newAngle = pos.angle
        return {
          id: pos.id,
          x: centerX + finalRadius * Math.cos(newAngle),
          y: centerY + finalRadius * Math.sin(newAngle),
          angle: newAngle
        }
      })

      collisionAttempts++
    }

    if (collisionAttempts >= maxCollisionAttempts) {
      console.warn(`Could not resolve collisions after ${maxCollisionAttempts} attempts`)
    }

    return { positions: centeredPositions, actualRadius: finalRadius }
  }

  /**
   * Position nodes in a tree within a sector
   * NEW ALGORITHM: Places root first, then children on larger circle aligned with parent
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
    // Handle wraparound: if sector crosses -180°/180° boundary
    let sectorMid: number
    if (sectorEnd < sectorStart) {
      // Sector wraps around (e.g., [158.5°, -158.5°])
      // Add 2π to end to calculate correct midpoint
      sectorMid = (sectorStart + sectorEnd + 2 * Math.PI) / 2
      // Normalize to [-π, π]
      if (sectorMid > Math.PI) sectorMid -= 2 * Math.PI
    } else {
      // Normal sector (e.g., [-90°, -21.5°])
      sectorMid = (sectorStart + sectorEnd) / 2
    }

    // Position this node
    positions[tree.id] = {
      x: centerX + radius * Math.cos(sectorMid),
      y: centerY + radius * Math.sin(sectorMid)
    }

    console.log(`Positioned node ${tree.id} at depth ${depth}, angle ${(sectorMid * 180 / Math.PI).toFixed(1)}°, radius ${radius}`)

    // If no children, we're done
    if (tree.children.length === 0) return

    // Calculate child radius
    const childRadius = params.innerRadius + ((depth + 1) * params.levelSpacing)

    // Place children using the 3-step algorithm
    const { positions: childPositions, actualRadius } = placeChildrenOnCircle(
      tree.children,
      sectorMid, // Parent's angle
      radius,    // Parent's radius
      childRadius,
      sectorStart,
      sectorEnd,
      centerX,
      centerY,
      params,
      positions
    )

    console.log(`Placed ${childPositions.length} children at depth ${depth + 1}, radius ${actualRadius}`)

    // Store child positions
    childPositions.forEach(pos => {
      positions[pos.id] = { x: pos.x, y: pos.y }
    })

    // Recursively position grandchildren
    // Each child gets an equal slice of the parent's sector
    let parentSectorWidth = sectorEnd - sectorStart
    if (parentSectorWidth < 0) parentSectorWidth += 2 * Math.PI

    const childSectorWidth = parentSectorWidth / tree.children.length

    childPositions.forEach((pos, index) => {
      const child = tree.children[index]!

      // Calculate sector for this child: parent's sector divided equally among siblings
      // Child i gets: [sectorStart + i * slice, sectorStart + (i+1) * slice]
      let childSectorStart = sectorStart + (index * childSectorWidth)
      let childSectorEnd = sectorStart + ((index + 1) * childSectorWidth)

      // Normalize angles to [-π, π]
      if (childSectorStart > Math.PI) childSectorStart -= 2 * Math.PI
      if (childSectorStart < -Math.PI) childSectorStart += 2 * Math.PI
      if (childSectorEnd > Math.PI) childSectorEnd -= 2 * Math.PI
      if (childSectorEnd < -Math.PI) childSectorEnd += 2 * Math.PI

      positionTreeInSector(
        child,
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
    // const totalSize = trees.reduce((sum, tree) => sum + tree.subtreeSize, 0)

    // Calculate full circle angle range
    const fullCircle = 2 * Math.PI
    const startAngleRad = toRadians(layoutParams.startAngle)
    // const direction = layoutParams.clockwise ? 1 : -1

    // Position each root's tree in its allocated sector
    const positions: Record<string, NodePosition> = {}

    // First, position all root nodes with equal angular spacing
    const rootPositions: Array<{ id: string; x: number; y: number }> = []

    // Calculate flexible sectors based on child count
    console.log('=== CALCULATING FLEXIBLE SECTORS ===')
    const sectors = calculateFlexibleSectors(trees, startAngleRad, fullCircle)

    // STEP 1: Position ONLY root nodes first (without children)
    sectors.forEach(sector => {
      const tree = sector.tree
      const sectorStart = sector.start
      const sectorEnd = sector.end

      console.log(`Tree ${tree.id}: sector [${(sectorStart * 180 / Math.PI).toFixed(1)}°, ${(sectorEnd * 180 / Math.PI).toFixed(1)}°], ${tree.children.length} children`)

      // Calculate radius for root (depth 0)
      const radius = layoutParams.innerRadius
      const sectorMid = (sectorStart + sectorEnd) / 2

      // Position root node
      positions[tree.id] = {
        x: centerX + radius * Math.cos(sectorMid),
        y: centerY + radius * Math.sin(sectorMid)
      }

      console.log(`Positioned root ${tree.id} at angle ${(sectorMid * 180 / Math.PI).toFixed(1)}°, radius ${radius}`)

      // Collect root node positions for spacing adjustment
      rootPositions.push({ id: tree.id, x: positions[tree.id]!.x, y: positions[tree.id]!.y })
    })

    // STEP 2: Apply spacing adjustment to root nodes if we have multiple roots
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

    // STEP 3: Now place children for each root (roots are in final positions)
    // First, recalculate sectors based on NEW root positions after adjustNodeSpacing
    const rootAngles = trees.map(tree => {
      const rootPos = positions[tree.id]!
      return {
        id: tree.id,
        angle: Math.atan2(rootPos.y - centerY, rootPos.x - centerX),
        tree
      }
    })

    // Sort by angle to find neighbors
    rootAngles.sort((a, b) => a.angle - b.angle)

    console.log(`=== RECALCULATED ROOT ANGLES AFTER SPACING ADJUSTMENT ===`)
    rootAngles.forEach(r => {
      console.log(`Root ${r.id}: angle ${(r.angle * 180 / Math.PI).toFixed(1)}°`)
    })

    // Calculate NEW sectors: from halfway to previous root to halfway to next root
    const newSectors = rootAngles.map((root, i) => {
      const prevRoot = rootAngles[(i - 1 + rootAngles.length) % rootAngles.length]!
      const nextRoot = rootAngles[(i + 1) % rootAngles.length]!

      // Calculate halfway angles with proper wraparound handling
      let halfwayToPrev: number
      let halfwayToNext: number

      // Calculate angle difference considering wraparound
      let diffToPrev = root.angle - prevRoot.angle
      if (diffToPrev < -Math.PI) diffToPrev += 2 * Math.PI
      if (diffToPrev > Math.PI) diffToPrev -= 2 * Math.PI

      let diffToNext = nextRoot.angle - root.angle
      if (diffToNext < -Math.PI) diffToNext += 2 * Math.PI
      if (diffToNext > Math.PI) diffToNext -= 2 * Math.PI

      // Halfway point is root angle minus half the difference
      halfwayToPrev = root.angle - diffToPrev / 2
      halfwayToNext = root.angle + diffToNext / 2

      // Normalize to [-π, π]
      if (halfwayToPrev > Math.PI) halfwayToPrev -= 2 * Math.PI
      if (halfwayToPrev < -Math.PI) halfwayToPrev += 2 * Math.PI
      if (halfwayToNext > Math.PI) halfwayToNext -= 2 * Math.PI
      if (halfwayToNext < -Math.PI) halfwayToNext += 2 * Math.PI

      return {
        tree: root.tree,
        rootAngle: root.angle,
        sectorStart: halfwayToPrev,
        sectorEnd: halfwayToNext
      }
    })

    console.log(`=== NEW SECTORS BASED ON FINAL ROOT POSITIONS ===`)
    newSectors.forEach(s => {
      // Calculate sector width with wraparound handling
      let sectorWidth = s.sectorEnd - s.sectorStart
      if (sectorWidth < 0) sectorWidth += 2 * Math.PI
      console.log(`Root ${s.tree.id}: sector [${(s.sectorStart * 180 / Math.PI).toFixed(1)}°, ${(s.sectorEnd * 180 / Math.PI).toFixed(1)}°], width: ${(sectorWidth * 180 / Math.PI).toFixed(1)}°`)
    })

    // Now place children using NEW sectors
    newSectors.forEach(sector => {
      const tree = sector.tree

      // Skip if no children
      if (tree.children.length === 0) return

      // Get the root's FINAL position (after spacing adjustment)
      const rootPos = positions[tree.id]!
      const rootAngle = sector.rootAngle
      const rootRadius = Math.sqrt((rootPos.x - centerX) ** 2 + (rootPos.y - centerY) ** 2)

      // Calculate child radius
      const childRadius = layoutParams.innerRadius + layoutParams.levelSpacing

      // Use the NEW sector boundaries
      const childSectorStart = sector.sectorStart
      const childSectorEnd = sector.sectorEnd

      // Place children
      const { positions: childPositions } = placeChildrenOnCircle(
        tree.children,
        rootAngle,
        rootRadius,
        childRadius,
        childSectorStart,
        childSectorEnd,
        centerX,
        centerY,
        layoutParams,
        positions
      )

      console.log(`Placed ${childPositions.length} children for ${tree.id} at depth 1`)

      // Store child positions
      childPositions.forEach(pos => {
        positions[pos.id] = { x: pos.x, y: pos.y }
      })

      // Recursively position grandchildren
      // Each child gets an equal slice of the parent's sector
      let parentSectorWidth = childSectorEnd - childSectorStart
      if (parentSectorWidth < 0) parentSectorWidth += 2 * Math.PI

      const childSectorWidth = parentSectorWidth / tree.children.length

      childPositions.forEach((pos, index) => {
        const child = tree.children[index]!

        // Calculate sector for this child: parent's sector divided equally among siblings
        // Child i gets: [sectorStart + i * slice, sectorStart + (i+1) * slice]
        let grandchildSectorStart = childSectorStart + (index * childSectorWidth)
        let grandchildSectorEnd = childSectorStart + ((index + 1) * childSectorWidth)

        // Normalize angles to [-π, π]
        if (grandchildSectorStart > Math.PI) grandchildSectorStart -= 2 * Math.PI
        if (grandchildSectorStart < -Math.PI) grandchildSectorStart += 2 * Math.PI
        if (grandchildSectorEnd > Math.PI) grandchildSectorEnd -= 2 * Math.PI
        if (grandchildSectorEnd < -Math.PI) grandchildSectorEnd += 2 * Math.PI

        positionTreeInSector(
          child,
          centerX,
          centerY,
          grandchildSectorStart,
          grandchildSectorEnd,
          layoutParams,
          positions,
          1 // depth = 1 (children are at depth 1, grandchildren at depth 2)
        )
      })
    })

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
