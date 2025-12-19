// Dagre Service - Shared layout operations for both MindMap and ConceptMap
import { ref } from 'vue'
import type * as vNG from 'v-network-graph'
// @ts-expect-error - dagre doesn't have proper TypeScript types
import dagre from 'dagre/dist/dagre.min.js'
import { useCircularLayout } from 'src/composables/layouts/useCircularLayout'

export interface DagreParams {
  rankdir: 'TB' | 'BT' | 'LR' | 'RL'
  ranksep: number
  nodesep: number
  edgesep: number
  align: 'UL' | 'UR' | 'DL' | 'DR'
}

export interface CircularLayoutParams {
  innerRadius: number      // Radius for root nodes circle
  levelSpacing: number     // Distance between concentric circles (generations)
  startAngle: number       // Starting angle in degrees (0 = right, 90 = bottom)
  clockwise: boolean       // Direction of layout
  minSectorAngle: number   // Minimum angle per root node sector (degrees)
  nodeSpacing: number      // Minimum spacing between nodes on same circle
  spacingRatio: number     // Ratio for angle-based spacing (1.0 = uniform, >1.0 = more north/south spacing)
}

export interface MindMapLayoutParams {
  branchSpacing: number
  levelDistance: number
  side: 'left' | 'right'
}

export interface BoxLayoutParams {
  boxWidth: number
  boxHeight: number
  padding: number
}

export type LayoutType = 'tree' | 'circular' | 'mindmap' | 'boxes'

export interface LayoutConfig {
  type: LayoutType
  dagreParams: DagreParams | undefined
  circularParams: CircularLayoutParams | undefined
  mindmapParams: MindMapLayoutParams | undefined
  boxParams: BoxLayoutParams | undefined
}

export interface MindMapNode {
  name: string
  parentId: string | null
  order: number
  zIndex?: number
}

export interface MindMapEdge extends vNG.Edge {
  type: 'hierarchy' | 'reference'
}

export const useDagreService = () => {
  // Default parameters
    const defaultParams: DagreParams = {
      rankdir: 'TB',
      ranksep: 100,
      nodesep: 50,
      edgesep: 10,
      align: 'UL'
    }
  
    const defaultCircularParams: CircularLayoutParams = {
      innerRadius: 100,
      levelSpacing: 120,
      startAngle: -90,
      clockwise: true,
      minSectorAngle: 30,
      nodeSpacing: 60,
      spacingRatio: 1.5
    }
  
    const defaultMindMapParams: MindMapLayoutParams = {
      branchSpacing: 50,
      levelDistance: 100,
      side: 'right'
    }
  
    const defaultBoxParams: BoxLayoutParams = {
      boxWidth: 150,
      boxHeight: 100,
      padding: 20
    }
  
    const currentParams = ref<DagreParams>({ ...defaultParams })
    const currentCircularParams = ref<CircularLayoutParams>({ ...defaultCircularParams })
    const currentMindMapParams = ref<MindMapLayoutParams>({ ...defaultMindMapParams })
    const currentBoxParams = ref<BoxLayoutParams>({ ...defaultBoxParams })
    const currentLayoutType = ref<LayoutType>('circular')
  
    // Set parameters
    const setParams = (params: Partial<DagreParams>) => {
      currentParams.value = { ...currentParams.value, ...params }
    }
  
    const setCircularParams = (params: Partial<CircularLayoutParams>) => {
      currentCircularParams.value = { ...currentCircularParams.value, ...params }
    }
  
    const setMindMapParams = (params: Partial<MindMapLayoutParams>) => {
      currentMindMapParams.value = { ...currentMindMapParams.value, ...params }
    }
  
    const setBoxParams = (params: Partial<BoxLayoutParams>) => {
      currentBoxParams.value = { ...currentBoxParams.value, ...params }
    }
  
    const setLayoutType = (type: LayoutType) => {
      currentLayoutType.value = type
    }
  
    // Reset to defaults
    const resetParams = () => {
      currentParams.value = { ...defaultParams }
      currentCircularParams.value = { ...defaultCircularParams }
      currentMindMapParams.value = { ...defaultMindMapParams }
      currentBoxParams.value = { ...defaultBoxParams }
      currentLayoutType.value = 'tree'
    }
  
    // Get current layout configuration
    const getCurrentLayoutConfig = (): LayoutConfig => {
      return {
        type: currentLayoutType.value,
        dagreParams: currentLayoutType.value === 'tree' ? { ...currentParams.value } : undefined,
        circularParams: currentLayoutType.value === 'circular' ? { ...currentCircularParams.value } : undefined,
        mindmapParams: currentLayoutType.value === 'mindmap' ? { ...currentMindMapParams.value } : undefined,
        boxParams: currentLayoutType.value === 'boxes' ? { ...currentBoxParams.value } : undefined
      }
    }

  // Initialize circular layout
  const circularLayout = useCircularLayout()

  // Helper: Get all descendants of a node (recursive)
  const getDescendants = (nodeId: string, edges: Record<string, MindMapEdge>): string[] => {
    const descendants: string[] = []
    const queue = [nodeId]
    const visited = new Set<string>()

    while (queue.length > 0) {
      const currentId = queue.shift()!
      if (visited.has(currentId)) continue
      visited.add(currentId)

      // Find all hierarchy edges where current node is the source
      Object.values(edges).forEach(edge => {
        if (edge.type === 'hierarchy' && edge.source === currentId) {
          descendants.push(edge.target)
          queue.push(edge.target)
        }
      })
    }

    return descendants
  }

  // Helper: Calculate subtree width (for TB/BT layouts)
  const calculateSubtreeWidth = (
    nodeId: string,
    edges: Record<string, MindMapEdge>,
    layouts: vNG.Layouts,
    layoutParams: DagreParams,
    subgraphNodes: string[]
  ): number => {
    // Find direct children of this node
    const directChildren = Object.entries(edges)
      .filter(([, edge]) => 
        edge.type === 'hierarchy' && 
        edge.source === nodeId &&
        subgraphNodes.includes(edge.target)
      )
      .map(([, edge]) => edge.target)

    if (directChildren.length === 0) {
      // Leaf node - just the node width
      return 120 // node width
    }

    let totalWidth = 0
    const childWidths = directChildren.map(childId => {
      const childWidth = calculateSubtreeWidth(childId, edges, layouts, layoutParams, subgraphNodes)
      return childWidth
    })

    // Sum child widths with spacing between them
    for (let i = 0; i < childWidths.length; i++) {
      totalWidth += childWidths[i] || 0
      if (i < childWidths.length - 1) {
        totalWidth += layoutParams.nodesep
      }
    }

    // Ensure minimum width (at least the node width)
    return Math.max(totalWidth, 120)
  }

  // Helper: Calculate subtree height (for LR/RL layouts)
  const calculateSubtreeHeight = (
    nodeId: string,
    edges: Record<string, MindMapEdge>,
    layouts: vNG.Layouts,
    layoutParams: DagreParams,
    subgraphNodes: string[]
  ): number => {
    // Find direct children of this node
    const directChildren = Object.entries(edges)
      .filter(([, edge]) => 
        edge.type === 'hierarchy' && 
        edge.source === nodeId &&
        subgraphNodes.includes(edge.target)
      )
      .map(([, edge]) => edge.target)

    if (directChildren.length === 0) {
      // Leaf node - just the node height
      return 40 // node height
    }

    let totalHeight = 0
    const childHeights = directChildren.map(childId => {
      const childHeight = calculateSubtreeHeight(childId, edges, layouts, layoutParams, subgraphNodes)
      return childHeight
    })

    // Sum child heights with spacing between them
    for (let i = 0; i < childHeights.length; i++) {
      totalHeight += childHeights[i] || 0
      if (i < childHeights.length - 1) {
        totalHeight += layoutParams.nodesep
      }
    }

    // Ensure minimum height (at least the node height)
    return Math.max(totalHeight, 40)
  }

  // Helper: Position nodes with DL/DR alignment considering subtree sizes and rankdir
  const positionDLDRNodes = (
    nodeId: string,
    parentPos: { x: number; y: number } | null,
    edges: Record<string, MindMapEdge>,
    layouts: vNG.Layouts,
    layoutParams: DagreParams,
    subgraphNodes: string[]
  ): void => {
    if (!subgraphNodes.includes(nodeId)) return

    // Find direct children of this node
    const directChildren = Object.entries(edges)
      .filter(([, edge]) => 
        edge.type === 'hierarchy' && 
        edge.source === nodeId &&
        subgraphNodes.includes(edge.target)
      )
      .map(([, edge]) => edge.target)

    if (directChildren.length === 0) return

    if (parentPos) {
      // Calculate dimensions based on rankdir
      let totalDimension = 0
      const childDimensions = directChildren.map(childId => {
        // Use width for TB/BT, height for LR/RL
        const dimension = (layoutParams.rankdir === 'LR' || layoutParams.rankdir === 'RL')
          ? calculateSubtreeHeight(childId, edges, layouts, layoutParams, subgraphNodes)
          : calculateSubtreeWidth(childId, edges, layouts, layoutParams, subgraphNodes)
        return dimension
      })
      
      totalDimension = childDimensions.reduce((sum, dim) => sum + (dim || 0), 0) + 
                      (directChildren.length - 1) * layoutParams.nodesep

      // Position children based on rankdir
      let currentPrimary = 0  // Current position along primary axis
      directChildren.forEach((childId, index) => {
        const childDimension = childDimensions[index] || ((layoutParams.rankdir === 'LR' || layoutParams.rankdir === 'RL') ? 40 : 120)
        
        // Calculate child position based on rankdir
        let childX: number, childY: number
        
        switch (layoutParams.rankdir) {
          case 'TB': // Top to Bottom
            childX = parentPos.x - totalDimension / 2 + currentPrimary + childDimension / 2
            childY = parentPos.y + layoutParams.ranksep
            break
          case 'BT': // Bottom to Top
            childX = parentPos.x - totalDimension / 2 + currentPrimary + childDimension / 2
            childY = parentPos.y - layoutParams.ranksep
            break
          case 'LR': // Left to Right
            childX = parentPos.x + layoutParams.ranksep
            childY = parentPos.y - totalDimension / 2 + currentPrimary + childDimension / 2
            break
          case 'RL': // Right to Left
            childX = parentPos.x - layoutParams.ranksep
            childY = parentPos.y - totalDimension / 2 + currentPrimary + childDimension / 2
            break
          default:
            childX = parentPos.x - totalDimension / 2 + currentPrimary + childDimension / 2
            childY = parentPos.y + layoutParams.ranksep
        }
        
        // Position this child
        layouts.nodes[childId] = {
          x: childX,
          y: childY
        }

        // Move to next position along the perpendicular axis
        currentPrimary += childDimension + layoutParams.nodesep

        // Recursively position this child's children
        positionDLDRNodes(childId, layouts.nodes[childId], edges, layouts, layoutParams, subgraphNodes)
      })
    }
  }

  // Apply dagre layout to selected node and its descendants
  const applyDagreToSelected = (
    nodes: Record<string, MindMapNode>,
    edges: Record<string, MindMapEdge>,
    layouts: vNG.Layouts,
    selectedNodeId: string,
    params: Partial<DagreParams> = {}
  ): boolean => {
    if (!selectedNodeId || !nodes[selectedNodeId]) {
      console.warn('No valid selected node')
      return false
    }

    // Merge provided params with current params
    const layoutParams = { ...currentParams.value, ...params }

    // Get all descendants of the selected node
    const descendants = getDescendants(selectedNodeId, edges)
    const subgraphNodes = [selectedNodeId, ...descendants]

    if (subgraphNodes.length === 1) {
      console.warn('Selected node has no children')
      return false
    }

    // Get the root node's current position to use as anchor
    const rootPos = layouts.nodes[selectedNodeId]
    if (!rootPos) {
      console.warn('Root node has no position')
      return false
    }

    // For DL and DR alignment, use custom positioning for all levels
    if (layoutParams.align === 'DL' || layoutParams.align === 'DR') {
      // Keep root node in its original position
      layouts.nodes[selectedNodeId] = { ...rootPos }
      
      // Position all descendants recursively with subtree-aware positioning
      positionDLDRNodes(selectedNodeId, rootPos, edges, layouts, layoutParams, subgraphNodes)
      
    } else {
      // For UL and UR alignment, use the standard dagre layout
      // Create dagre graph for subgraph
      const g = new dagre.graphlib.Graph()
      g.setGraph({
        rankdir: layoutParams.rankdir,
        nodesep: layoutParams.nodesep,
        edgesep: layoutParams.edgesep,
        ranksep: layoutParams.ranksep,
        align: layoutParams.align
      })
      g.setDefaultEdgeLabel(() => ({}))

      // Add nodes to dagre
      subgraphNodes.forEach(nodeId => {
        g.setNode(nodeId, { width: 120, height: 40 })
      })

      // Add only hierarchy edges within the subgraph
      Object.entries(edges).forEach(([, edge]) => {
        if (edge.type === 'hierarchy' &&
            subgraphNodes.includes(edge.source) &&
            subgraphNodes.includes(edge.target)) {
          g.setEdge(edge.source, edge.target)
        }
      })

      // Run dagre layout
      dagre.layout(g)
      
      const rootDagrePos = g.node(selectedNodeId)
      
      // Calculate offset to keep root in the same position
      const offsetX = rootPos.x - rootDagrePos.x
      const offsetY = rootPos.y - rootDagrePos.y

      // Update positions for subgraph nodes
      subgraphNodes.forEach(nodeId => {
        const dagreNode = g.node(nodeId)
        layouts.nodes[nodeId] = {
          x: dagreNode.x + offsetX,
          y: dagreNode.y + offsetY,
        }
      })
    }

    return true
  }

  // Apply circular layout to selected node and its descendants
  const applyCircularToSelected = (
    nodes: Record<string, MindMapNode>,
    edges: Record<string, MindMapEdge>,
    layouts: vNG.Layouts,
    selectedNodeId: string,
    params: Partial<CircularLayoutParams> = {}
  ): boolean => {
    if (!selectedNodeId || !nodes[selectedNodeId]) {
      console.warn('No valid selected node for circular layout')
      return false
    }

    // Merge provided params with current params
    const layoutParams = { ...currentCircularParams.value, ...params }

    // Get the selected node's position as center
    const centerPos = layouts.nodes[selectedNodeId]
    if (!centerPos) {
      console.warn('Selected node has no position for circular layout')
      return false
    }

    // Apply circular layout
    return circularLayout.applyCircularToSelected(
      nodes,
      edges,
      layouts,
      selectedNodeId,
      layoutParams
    )
  }

  // Apply circular layout to entire graph
  const applyCircularToEntireGraph = (
    nodes: Record<string, MindMapNode>,
    edges: Record<string, MindMapEdge>,
    layouts: vNG.Layouts,
    centerX: number = 0,
    centerY: number = 0,
    params: Partial<CircularLayoutParams> = {}
  ): boolean => {
    // Merge provided params with current params
    const layoutParams = { ...currentCircularParams.value, ...params }

    // Apply circular layout to entire graph
    return circularLayout.applyCircularLayout(
      nodes,
      edges,
      layouts,
      centerX,
      centerY,
      layoutParams
    )
  }

  return {
    currentParams,
    currentCircularParams,
    currentMindMapParams,
    currentBoxParams,
    currentLayoutType,
    setParams,
    setCircularParams,
    setMindMapParams,
    setBoxParams,
    setLayoutType,
    resetParams,
    getCurrentLayoutConfig,
    applyDagreToSelected,
    applyCircularToSelected,
    applyCircularToEntireGraph,
    getDescendants
  }
}

export default useDagreService
