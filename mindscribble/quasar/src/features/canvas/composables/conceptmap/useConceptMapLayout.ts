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
  const MIN_NODE_WIDTH = 100
  const MIN_NODE_HEIGHT = 40

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
   * Initialize layout for concept map view
   *
   * This is the main entry point for view initialization:
   * - If positions already exist → do nothing (idempotent)
   * - If no positions → calculate from hierarchy structure
   *
   * @returns true if layout was calculated, false if already initialized
   */
  function initializeLayout(): boolean {
    if (isInitialized()) {
      console.log('ConceptMap: Already initialized, using existing positions')
      return false
    }

    console.log('ConceptMap: Calculating initial layout from hierarchy')
    calculateConceptMapPositions()
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
   * Calculate a node's size based on its children (bottom-up)
   * Leaf nodes get minimum size, parent nodes get size to fit children
   */
  function calculateNodeSizeBottomUp(node: NodeData): void {
    const children = getDirectChildren(node.id)

    if (children.length === 0) {
      // Leaf node - use minimum size
      node.conceptMapSize = { width: MIN_NODE_WIDTH, height: MIN_NODE_HEIGHT }
      return
    }

    // Parent node - calculate size needed to fit all children in a vertical stack
    // Children will be arranged vertically with spacing
    let totalHeight = CONTAINER_PADDING + 30 // Start after header
    let maxChildWidth = 0

    for (const child of children) {
      const childSize = child.conceptMapSize ?? { width: MIN_NODE_WIDTH, height: MIN_NODE_HEIGHT }
      maxChildWidth = Math.max(maxChildWidth, childSize.width)
      totalHeight += childSize.height + NODE_SPACING
    }

    // Remove extra spacing after last child, add bottom padding
    totalHeight = totalHeight - NODE_SPACING + CONTAINER_PADDING

    node.conceptMapSize = {
      width: maxChildWidth + CONTAINER_PADDING * 2,
      height: totalHeight
    }
  }

  /**
   * Position children inside a parent container (top-down recursive)
   * Children are arranged vertically, each position relative to parent
   */
  function positionChildrenTopDown(parentId: string): void {
    const children = getDirectChildren(parentId)
    if (children.length === 0) return

    // Position children vertically inside the container
    let currentY = CONTAINER_PADDING + 30 // Start below header

    for (const child of children) {
      const childSize = child.conceptMapSize ?? { width: MIN_NODE_WIDTH, height: MIN_NODE_HEIGHT }

      // Position is RELATIVE to parent (VueFlow nested nodes)
      child.conceptMapPosition = {
        x: CONTAINER_PADDING,
        y: currentY
      }

      console.log(`  Child "${child.label}": relPos=(${CONTAINER_PADDING}, ${currentY}), size=${childSize.width}x${childSize.height}`)

      currentY += childSize.height + NODE_SPACING

      // Recursively position grandchildren
      positionChildrenTopDown(child.id)
    }
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

    // Helper functions
    getRootNodes,
    calculateContainerSize,
    getBottomUpOrder,

    // Internal (exposed for direct access if needed)
    calculateConceptMapPositions,
    calculateNodeSizeBottomUp,
    positionChildrenTopDown
  }
}

