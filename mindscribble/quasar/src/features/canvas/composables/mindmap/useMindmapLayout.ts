import type { Ref } from 'vue'
import type { NodeData } from '../../components/mindmap/types'

/**
 * Mindmap Layout Composable
 *
 * Handles layout calculations for mindmap view:
 * - View initialization (calculates positions if not already set)
 * - Horizontal left-right tree layout
 * - Automatic side assignment for children
 *
 * Key principle: Each view has its own `initializeLayout()` function.
 * - If `mindmapPosition` is null/undefined → view NOT initialized → calculate positions
 * - If `mindmapPosition` exists → view IS initialized → use existing positions
 */
export function useMindmapLayout(
  nodes: Ref<NodeData[]>,
  // Dependencies from other composables
  getDirectChildren: (nodeId: string) => NodeData[],
  getRootNode: (nodeId: string) => NodeData | null
) {
  // ============================================================
  // CONSTANTS
  // ============================================================

  const HORIZONTAL_SPACING = 200 // Horizontal distance between parent and child
  const VERTICAL_SPACING = 20 // Vertical spacing between siblings
  const DEFAULT_WIDTH = 150
  const DEFAULT_HEIGHT = 50

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
   * Determine which side of the root a node is on
   */
  function getNodeSide(nodeId: string): 'left' | 'right' | null {
    const node = nodes.value.find(n => n.id === nodeId)
    if (!node) return null

    // Root nodes don't have a side
    if (!node.parentId) return null

    const root = getRootNode(nodeId)
    if (!root) return null

    return node.x < root.x ? 'left' : 'right'
  }

  /**
   * Get all descendants of a node
   */
  function getAllDescendants(nodeId: string): NodeData[] {
    const descendants: NodeData[] = []
    const children = getDirectChildren(nodeId)
    for (const child of children) {
      descendants.push(child)
      descendants.push(...getAllDescendants(child.id))
    }
    return descendants
  }

  // ============================================================
  // VIEW INITIALIZATION
  // ============================================================

  /**
   * Check if the mindmap view has been initialized
   * (i.e., nodes have proper x/y positions set)
   */
  function isInitialized(): boolean {
    // Consider initialized if nodes have reasonable x/y positions
    // (not all at 0,0 or not all at same position)
    const rootNodes = getRootNodes()
    if (rootNodes.length === 0) return true

    // Check if mindmapPosition is set on any node
    return nodes.value.some(n => n.mindmapPosition != null)
  }

  /**
   * Check if a specific node needs mindmap layout
   */
  function nodeNeedsLayout(node: NodeData): boolean {
    return node.mindmapPosition == null
  }

  /**
   * Initialize layout for mindmap view
   *
   * This is the main entry point for view initialization:
   * - If positions already exist → do nothing (idempotent)
   * - If no positions → calculate from hierarchy structure
   *
   * @returns true if layout was calculated, false if already initialized
   */
  function initializeLayout(): boolean {
    // Find nodes that need layout (no mindmapPosition)
    const nodesNeedingLayout = nodes.value.filter(nodeNeedsLayout)

    if (nodesNeedingLayout.length === 0) {
      console.log('Mindmap: All nodes already have positions')
      return false
    }

    console.log(`Mindmap: Calculating layout for ${nodesNeedingLayout.length} nodes`)
    calculateMindmapPositions(nodesNeedingLayout)
    return true
  }

  /**
   * Force recalculation of all mindmap positions
   * Use this when you want to reset the layout regardless of existing positions
   */
  function recalculateLayout(): void {
    console.log('Mindmap: Force recalculating layout')
    // Clear existing positions
    for (const node of nodes.value) {
      node.mindmapPosition = null
    }
    calculateMindmapPositions(nodes.value)
  }

  // ============================================================
  // LAYOUT CALCULATION (INTERNAL)
  // ============================================================

  /**
   * Calculate positions for nodes in horizontal mindmap layout
   *
   * Algorithm:
   * 1. For root nodes: position at center with horizontal spacing
   * 2. For child nodes: position relative to parent based on side (left/right)
   * 3. Children inherit side from their parent's position relative to root
   */
  function calculateMindmapPositions(nodesToLayout: NodeData[]): void {
    console.log('=== Mindmap Layout: Starting calculation ===')
    console.log(`Processing ${nodesToLayout.length} nodes`)

    // Separate root nodes from children
    const rootNodesToLayout = nodesToLayout.filter(n => n.parentId === null)
    const childNodesToLayout = nodesToLayout.filter(n => n.parentId !== null)

    // First, handle root nodes that need layout
    layoutRootNodes(rootNodesToLayout)

    // Then, handle child nodes that need layout
    layoutChildNodes(childNodesToLayout)

    console.log('=== Mindmap Layout: Complete ===')
  }

  /**
   * Layout root nodes - position them horizontally centered
   * For incremental layout: positions new roots after existing ones
   */
  function layoutRootNodes(rootNodes: NodeData[]): void {
    if (rootNodes.length === 0) return

    // Find existing root nodes (already positioned)
    const existingRoots = getRootNodes().filter(r => !rootNodes.includes(r) && r.mindmapPosition != null)

    // Calculate starting X position after existing roots
    let currentX = 0
    if (existingRoots.length > 0) {
      // Find rightmost position of existing roots
      for (const existingRoot of existingRoots) {
        const rightEdge = existingRoot.x + (existingRoot.width ?? DEFAULT_WIDTH)
        currentX = Math.max(currentX, rightEdge + HORIZONTAL_SPACING)
      }
    }

    // Position new root nodes
    for (const root of rootNodes) {
      const width = root.width ?? DEFAULT_WIDTH
      const height = root.height ?? DEFAULT_HEIGHT

      root.x = currentX - width / 2
      root.y = -height / 2
      root.mindmapPosition = { x: root.x, y: root.y }

      console.log(`Root "${root.label}": pos=(${root.x}, ${root.y})`)

      currentX += width + HORIZONTAL_SPACING
    }
  }

  /**
   * Layout child nodes - position relative to parent based on side
   */
  function layoutChildNodes(childNodes: NodeData[]): void {
    if (childNodes.length === 0) return

    // Group children by parent
    const childrenByParent = new Map<string, NodeData[]>()
    for (const child of childNodes) {
      if (!child.parentId) continue
      const siblings = childrenByParent.get(child.parentId) ?? []
      siblings.push(child)
      childrenByParent.set(child.parentId, siblings)
    }

    // Process each parent's children
    for (const [parentId, children] of childrenByParent) {
      const parent = nodes.value.find(n => n.id === parentId)
      if (!parent) continue

      // Determine side for these children
      const side = determineSideForChildren(parent)

      // Get existing children of this parent (already positioned)
      const existingChildren = getDirectChildren(parentId).filter(
        c => !children.includes(c)
      )

      // Calculate starting Y position (below existing children)
      let startY = parent.y
      if (existingChildren.length > 0) {
        const lastChild = existingChildren[existingChildren.length - 1]
        if (lastChild) {
          startY = lastChild.y + (lastChild.height ?? DEFAULT_HEIGHT) + VERTICAL_SPACING
        }
      }

      // Position each child
      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        if (!child) continue

        const childHeight = child.height ?? DEFAULT_HEIGHT
        const offsetX = side === 'left' ? -HORIZONTAL_SPACING : HORIZONTAL_SPACING

        child.x = parent.x + offsetX
        child.y = startY + i * (childHeight + VERTICAL_SPACING)
        child.mindmapPosition = { x: child.x, y: child.y }

        console.log(`Child "${child.label}": pos=(${child.x}, ${child.y}), side=${side}`)

        // Recursively layout this child's descendants
        const descendants = childNodes.filter(n => {
          let current: NodeData | undefined = n
          while (current?.parentId) {
            if (current.parentId === child.id) return true
            current = nodes.value.find(node => node.id === current?.parentId)
          }
          return false
        })

        if (descendants.length > 0) {
          layoutChildNodes(descendants)
        }
      }
    }
  }

  /**
   * Determine which side children should be placed on
   */
  function determineSideForChildren(parent: NodeData): 'left' | 'right' {
    // If parent is a root node, decide based on existing children or alternate
    if (!parent.parentId) {
      const existingChildren = getDirectChildren(parent.id)
      if (existingChildren.length === 0) {
        // No existing children, default to right
        return 'right'
      }

      // Count children on each side
      let leftCount = 0
      let rightCount = 0
      for (const child of existingChildren) {
        if (child.x < parent.x) {
          leftCount++
        } else {
          rightCount++
        }
      }

      // Put new children on the side with fewer children for balance
      return leftCount <= rightCount ? 'left' : 'right'
    }

    // For non-root parents, inherit side from parent's position relative to root
    const root = getRootNode(parent.id)
    if (!root) return 'right'

    return parent.x < root.x ? 'left' : 'right'
  }

  // ============================================================
  // RETURN
  // ============================================================

  return {
    // Constants (exposed for testing/configuration)
    HORIZONTAL_SPACING,
    VERTICAL_SPACING,
    DEFAULT_WIDTH,
    DEFAULT_HEIGHT,

    // View initialization (main entry point)
    isInitialized,
    initializeLayout,
    recalculateLayout,
    nodeNeedsLayout,

    // Helper functions
    getRootNodes,
    getNodeSide,
    getAllDescendants,
    determineSideForChildren,

    // Internal (exposed for direct access if needed)
    calculateMindmapPositions,
    layoutRootNodes,
    layoutChildNodes
  }
}
