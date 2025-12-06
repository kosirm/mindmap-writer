import type { Ref } from 'vue'
import type { NodeData } from '../../components/mindmap/types'

/**
 * Concept Map Layout Composable
 *
 * Handles layout calculations for concept map view:
 * - View initialization (calculates positions if not already set)
 * - Nested container layout with children inside parent bounds
 * - Container sizing based on children
 *
 * Key principle: Each view has its own `initializeLayout()` function.
 * - If `conceptMapPosition` is null/undefined → view NOT initialized → calculate positions
 * - If `conceptMapPosition` exists → view IS initialized → use existing positions
 */
export function useConceptMapLayout(
  nodes: Ref<NodeData[]>,
  // Dependencies from other composables
  getDirectChildren: (nodeId: string) => NodeData[]
) {
  // ============================================================
  // CONSTANTS
  // ============================================================

  const CONTAINER_PADDING = 20 // Padding inside container nodes
  const NODE_SPACING = 10 // Spacing between sibling nodes
  // Consistent with ConceptMapView.vue and mindmap CustomNode (min-width: 100px, min-height: 30px)
  const MIN_NODE_WIDTH = 100
  const MIN_NODE_HEIGHT = 30

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  /**
   * Get all root nodes (nodes without parent)
   */
  function getRootNodes(): NodeData[] {
    return nodes.value.filter(n => n.parentId === null)
  }

  /**
   * Calculate the bounding box needed for a container to fit all children
   */
  function calculateContainerSize(parentId: string): { width: number; height: number } {
    const children = getDirectChildren(parentId)
    if (children.length === 0) {
      return { width: MIN_NODE_WIDTH, height: MIN_NODE_HEIGHT }
    }

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const child of children) {
      // Get child's concept map size if available, otherwise use regular size
      const childWidth = child.conceptMapSize?.width ?? child.width
      const childHeight = child.conceptMapSize?.height ?? child.height

      minX = Math.min(minX, child.x)
      minY = Math.min(minY, child.y)
      maxX = Math.max(maxX, child.x + childWidth)
      maxY = Math.max(maxY, child.y + childHeight)
    }

    return {
      width: maxX - minX + CONTAINER_PADDING * 2,
      height: maxY - minY + CONTAINER_PADDING * 2
    }
  }

  // ============================================================
  // VIEW INITIALIZATION
  // ============================================================

  /**
   * Check if the concept map view has been initialized
   * (i.e., at least some nodes have conceptMapPosition set)
   */
  function isInitialized(): boolean {
    return nodes.value.some(n => n.conceptMapPosition != null)
  }

  /**
   * Get nodes that need layout (no conceptMapPosition)
   */
  function getNodesNeedingLayout(): NodeData[] {
    return nodes.value.filter(n => n.conceptMapPosition == null)
  }

  /**
   * Initialize layout for concept map view
   *
   * This is the main entry point for view initialization:
   * - If ALL nodes have positions → do nothing (idempotent)
   * - If SOME nodes need positions → incremental layout for new nodes only
   * - If NO nodes have positions → full layout calculation
   *
   * @returns true if layout was calculated, false if nothing needed
   */
  function initializeLayout(): boolean {
    const nodesNeedingLayout = getNodesNeedingLayout()

    if (nodesNeedingLayout.length === 0) {
      console.log('ConceptMap: All nodes have positions, nothing to layout')
      return false
    }

    // Check if this is a full layout or incremental
    const hasExistingPositions = isInitialized()

    if (hasExistingPositions) {
      console.log(`ConceptMap: Incremental layout for ${nodesNeedingLayout.length} new nodes`)
      layoutNewNodesIncrementally(nodesNeedingLayout)
    } else {
      console.log('ConceptMap: Full layout calculation from hierarchy')
      calculateConceptMapPositions()
    }

    return true
  }

  /**
   * Force recalculation of all concept map positions
   * Use this when you want to reset the layout regardless of existing positions
   */
  function recalculateLayout(): void {
    console.log('ConceptMap: Force recalculating layout')
    // Clear existing positions
    for (const node of nodes.value) {
      node.conceptMapPosition = null
      node.conceptMapSize = null
    }
    calculateConceptMapPositions()
  }

  /**
   * Layout only new nodes incrementally, preserving existing node positions
   *
   * Strategy:
   * 1. For new child nodes: re-layout ALL children of parent using grid (preserves sibling order)
   * 2. For new root nodes: position after existing root nodes
   * 3. Recalculate parent sizes bottom-up for affected parents
   */
  function layoutNewNodesIncrementally(newNodes: NodeData[]): void {
    console.log(`=== ConceptMap: Incremental Layout for ${newNodes.length} nodes ===`)

    // Separate new roots from new children
    const newRoots = newNodes.filter(n => n.parentId === null)
    const newChildren = newNodes.filter(n => n.parentId !== null)

    // Collect affected parent IDs
    const affectedParentIds = new Set<string>()
    for (const child of newChildren) {
      if (child.parentId) affectedParentIds.add(child.parentId)
    }

    // First, set initial sizes for new children (bottom-up from leaves)
    for (const child of newChildren) {
      const descendants = getDirectChildren(child.id)
      if (descendants.length === 0) {
        child.conceptMapSize = { width: MIN_NODE_WIDTH, height: MIN_NODE_HEIGHT }
      } else {
        calculateNodeSizeBottomUp(child)
      }
    }

    // Re-layout all children for each affected parent using grid layout
    // This ensures grid consistency when adding new nodes
    for (const parentId of affectedParentIds) {
      positionChildrenInGrid(parentId)
    }

    // Then, position new root nodes
    if (newRoots.length > 0) {
      positionNewRootNodes(newRoots)
    }

    // Finally, recalculate sizes for affected parents (bottom-up)
    for (const parentId of affectedParentIds) {
      recalculateParentSizeBottomUp(parentId)
    }

    console.log('=== ConceptMap: Incremental Layout Complete ===')
  }

  /**
   * Position all children of a parent in grid layout
   * This is called when new children are added to maintain grid consistency
   */
  function positionChildrenInGrid(parentId: string): void {
    const children = getDirectChildren(parentId)
    if (children.length === 0) return

    const { cols } = calculateGridDimensions(children.length)

    // Find max dimensions for uniform grid cells
    let maxChildWidth = MIN_NODE_WIDTH
    let maxChildHeight = MIN_NODE_HEIGHT

    for (const child of children) {
      const childSize = child.conceptMapSize ?? { width: MIN_NODE_WIDTH, height: MIN_NODE_HEIGHT }
      maxChildWidth = Math.max(maxChildWidth, childSize.width)
      maxChildHeight = Math.max(maxChildHeight, childSize.height)
    }

    // Position children in grid
    const HEADER_HEIGHT = 30
    const startY = CONTAINER_PADDING + HEADER_HEIGHT

    children.forEach((child, i) => {
      const row = Math.floor(i / cols)
      const col = i % cols

      // Position is RELATIVE to parent (VueFlow nested nodes)
      child.conceptMapPosition = {
        x: CONTAINER_PADDING + col * (maxChildWidth + NODE_SPACING),
        y: startY + row * (maxChildHeight + NODE_SPACING)
      }

      console.log(`  Child "${child.label}": grid[${row},${col}], pos=(${child.conceptMapPosition.x}, ${child.conceptMapPosition.y})`)

      // Recursively position any new grandchildren
      const grandchildren = getDirectChildren(child.id)
      const newGrandchildren = grandchildren.filter(gc => gc.conceptMapPosition == null)
      if (newGrandchildren.length > 0) {
        positionChildrenInGrid(child.id)
      }
    })
  }

  /**
   * Position a new child node inside its parent (used for single additions)
   */
  function positionNewChildNode(newChild: NodeData): void {
    if (!newChild.parentId) return
    // Just call positionChildrenInGrid on parent - it will position all children including new one
    positionChildrenInGrid(newChild.parentId)
  }

  /**
   * Position new root nodes after existing root nodes
   */
  function positionNewRootNodes(newRoots: NodeData[]): void {
    const existingRoots = getRootNodes().filter(r => !newRoots.includes(r) && r.conceptMapPosition != null)

    // Find rightmost position of existing roots
    let rightmost = 0
    for (const root of existingRoots) {
      const pos = root.conceptMapPosition
      const size = root.conceptMapSize ?? { width: MIN_NODE_WIDTH, height: MIN_NODE_HEIGHT }
      if (pos) {
        rightmost = Math.max(rightmost, pos.x + size.width)
      }
    }

    // Position new roots after existing ones
    let currentX = rightmost + NODE_SPACING * 3
    for (const newRoot of newRoots) {
      // Calculate size first
      const children = getDirectChildren(newRoot.id)
      if (children.length === 0) {
        newRoot.conceptMapSize = { width: MIN_NODE_WIDTH, height: MIN_NODE_HEIGHT }
      } else {
        calculateNodeSizeBottomUp(newRoot)
      }

      newRoot.conceptMapPosition = { x: currentX, y: 0 }
      const size = newRoot.conceptMapSize ?? { width: MIN_NODE_WIDTH, height: MIN_NODE_HEIGHT }
      currentX += size.width + NODE_SPACING * 3

      console.log(`  New root "${newRoot.label}": pos=(${newRoot.conceptMapPosition.x}, 0)`)

      // Position any new children
      positionChildrenTopDown(newRoot.id)
    }
  }

  /**
   * Recalculate parent size and propagate up the tree
   */
  function recalculateParentSizeBottomUp(nodeId: string): void {
    const node = nodes.value.find(n => n.id === nodeId)
    if (!node) return

    // Recalculate this node's size based on children
    calculateNodeSizeBottomUp(node)

    // Propagate up to parent
    if (node.parentId) {
      recalculateParentSizeBottomUp(node.parentId)
    }
  }

  // ============================================================
  // LAYOUT CALCULATION (INTERNAL)
  // ============================================================

  /**
   * Calculate positions for all nodes in nested concept map layout
   *
   * Algorithm (similar to useMindmapGenerator approach):
   * 1. Process nodes bottom-up (leaves first)
   * 2. For leaf nodes: set minimum size
   * 3. For parent nodes: position children inside, calculate container size
   * 4. Finally, arrange root nodes in a row with spacing
   *
   * Key: Children positions are RELATIVE to parent (VueFlow nested nodes)
   */
  function calculateConceptMapPositions(): void {
    const rootNodes = getRootNodes()
    if (rootNodes.length === 0) return

    console.log('=== ConceptMap Layout: Starting calculation ===')
    console.log(`Processing ${nodes.value.length} nodes, ${rootNodes.length} roots`)

    // First pass: Calculate sizes bottom-up (leaves first, then parents)
    // This ensures we know each node's size before positioning it inside a parent
    const bottomUpOrder = getBottomUpOrder()
    console.log(`Bottom-up order: ${bottomUpOrder.map(n => n.label).join(' → ')}`)

    for (const node of bottomUpOrder) {
      calculateNodeSizeBottomUp(node)
    }

    // Second pass: Position children inside parents (top-down from each root)
    // This ensures parent positions are set before children
    for (const root of rootNodes) {
      positionChildrenTopDown(root.id)
    }

    // Third pass: Arrange root nodes in a row with spacing
    let currentX = 0
    for (const root of rootNodes) {
      const size = root.conceptMapSize ?? { width: MIN_NODE_WIDTH, height: MIN_NODE_HEIGHT }

      root.conceptMapPosition = { x: currentX, y: 0 }
      console.log(`Root "${root.label}": pos=(${currentX}, 0), size=${size.width}x${size.height}`)

      currentX += size.width + NODE_SPACING * 3 // Extra spacing between roots
    }

    console.log('=== ConceptMap Layout: Complete ===')
  }

  /**
   * Calculate optimal grid dimensions for N children
   * Tries to create a roughly square layout
   */
  function calculateGridDimensions(childCount: number): { cols: number; rows: number } {
    if (childCount <= 0) return { cols: 0, rows: 0 }
    if (childCount === 1) return { cols: 1, rows: 1 }
    if (childCount === 2) return { cols: 2, rows: 1 }
    if (childCount <= 4) return { cols: 2, rows: Math.ceil(childCount / 2) }
    if (childCount <= 6) return { cols: 3, rows: Math.ceil(childCount / 3) }
    if (childCount <= 9) return { cols: 3, rows: Math.ceil(childCount / 3) }

    // For larger counts, aim for roughly square
    const cols = Math.ceil(Math.sqrt(childCount))
    const rows = Math.ceil(childCount / cols)
    return { cols, rows }
  }

  /**
   * Calculate a node's size based on its children (bottom-up)
   * Leaf nodes get minimum size, parent nodes get size to fit children in GRID layout
   */
  function calculateNodeSizeBottomUp(node: NodeData): void {
    const children = getDirectChildren(node.id)

    if (children.length === 0) {
      // Leaf node - use minimum size
      node.conceptMapSize = { width: MIN_NODE_WIDTH, height: MIN_NODE_HEIGHT }
      return
    }

    // Parent node - calculate size for GRID layout
    const { cols, rows } = calculateGridDimensions(children.length)

    // Find max width and height among children for uniform grid cells
    let maxChildWidth = MIN_NODE_WIDTH
    let maxChildHeight = MIN_NODE_HEIGHT

    for (const child of children) {
      const childSize = child.conceptMapSize ?? { width: MIN_NODE_WIDTH, height: MIN_NODE_HEIGHT }
      maxChildWidth = Math.max(maxChildWidth, childSize.width)
      maxChildHeight = Math.max(maxChildHeight, childSize.height)
    }

    // Calculate container size
    const HEADER_HEIGHT = 30
    const contentWidth = cols * maxChildWidth + (cols - 1) * NODE_SPACING + CONTAINER_PADDING * 2
    const contentHeight = HEADER_HEIGHT + rows * maxChildHeight + (rows - 1) * NODE_SPACING + CONTAINER_PADDING * 2

    node.conceptMapSize = {
      width: contentWidth,
      height: contentHeight
    }
  }

  /**
   * Position children inside a parent container (top-down recursive)
   * Children are arranged in a GRID layout, each position relative to parent
   */
  function positionChildrenTopDown(parentId: string): void {
    const children = getDirectChildren(parentId)
    if (children.length === 0) return

    const { cols } = calculateGridDimensions(children.length)

    // Find max dimensions for uniform grid cells
    let maxChildWidth = MIN_NODE_WIDTH
    let maxChildHeight = MIN_NODE_HEIGHT

    for (const child of children) {
      const childSize = child.conceptMapSize ?? { width: MIN_NODE_WIDTH, height: MIN_NODE_HEIGHT }
      maxChildWidth = Math.max(maxChildWidth, childSize.width)
      maxChildHeight = Math.max(maxChildHeight, childSize.height)
    }

    // Position children in grid
    const HEADER_HEIGHT = 30
    const startY = CONTAINER_PADDING + HEADER_HEIGHT

    children.forEach((child, i) => {
      const row = Math.floor(i / cols)
      const col = i % cols

      // Position is RELATIVE to parent (VueFlow nested nodes)
      child.conceptMapPosition = {
        x: CONTAINER_PADDING + col * (maxChildWidth + NODE_SPACING),
        y: startY + row * (maxChildHeight + NODE_SPACING)
      }

      console.log(`  Child "${child.label}": grid[${row},${col}], relPos=(${child.conceptMapPosition.x}, ${child.conceptMapPosition.y})`)

      // Recursively position grandchildren
      positionChildrenTopDown(child.id)
    })
  }

  /**
   * Get nodes in bottom-up order (leaves first, then parents)
   */
  function getBottomUpOrder(): NodeData[] {
    const result: NodeData[] = []
    const visited = new Set<string>()

    function visit(node: NodeData) {
      if (visited.has(node.id)) return
      visited.add(node.id)

      // First visit all children
      const children = getDirectChildren(node.id)
      for (const child of children) {
        visit(child)
      }

      // Then add this node
      result.push(node)
    }

    // Start from root nodes
    for (const root of getRootNodes()) {
      visit(root)
    }

    return result
  }

  // ============================================================
  // RETURN
  // ============================================================

  return {
    // Constants (exposed for testing/configuration)
    CONTAINER_PADDING,
    NODE_SPACING,
    MIN_NODE_WIDTH,
    MIN_NODE_HEIGHT,

    // View initialization (main entry point)
    isInitialized,
    initializeLayout,
    recalculateLayout,
    getNodesNeedingLayout,

    // Helper functions
    getRootNodes,
    calculateContainerSize,
    getBottomUpOrder,
    calculateGridDimensions,

    // Internal (exposed for direct access if needed)
    calculateConceptMapPositions,
    calculateNodeSizeBottomUp,
    positionChildrenTopDown,
    layoutNewNodesIncrementally,
    positionNewChildNode,
    positionNewRootNodes,
    recalculateParentSizeBottomUp,
    positionChildrenInGrid
  }
}

