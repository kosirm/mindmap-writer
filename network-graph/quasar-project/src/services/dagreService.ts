// Dagre Service - Shared layout operations for both MindMap and ConceptMap
import { ref } from 'vue'
import type * as vNG from 'v-network-graph'
// @ts-expect-error - dagre doesn't have proper TypeScript types
import dagre from 'dagre/dist/dagre.min.js'

export interface DagreParams {
  rankdir: 'TB' | 'BT' | 'LR' | 'RL'
  ranksep: number
  nodesep: number
  edgesep: number
  align: 'UL' | 'UR' | 'DL' | 'DR'
}

export interface CircularLayoutParams {
  radius: number
  startAngle: number
  clockwise: boolean
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
      radius: 200,
      startAngle: 0,
      clockwise: true
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
    const currentLayoutType = ref<LayoutType>('tree')
  
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

    // For DL and DR alignment, use custom positioning
    if (layoutParams.align === 'DL' || layoutParams.align === 'DR') {
      // Get direct children of the root node
      const directChildren = Object.entries(edges)
        .filter(([, edge]) => 
          edge.type === 'hierarchy' && 
          edge.source === selectedNodeId &&
          subgraphNodes.includes(edge.target)
        )
        .map(([, edge]) => edge.target)
      
      if (directChildren.length > 0) {
        // Position direct children centered below the parent
        const totalWidth = directChildren.length * layoutParams.nodesep
        const startX = rootPos.x - totalWidth / 2 + layoutParams.nodesep / 2
        
        directChildren.forEach((childId, index) => {
          layouts.nodes[childId] = {
            x: startX + index * layoutParams.nodesep,
            y: rootPos.y + layoutParams.ranksep
          }
        })
        
        // Handle grandchildren if any
        const grandchildren = descendants.filter(descendantId => 
          !directChildren.includes(descendantId)
        )
        
        grandchildren.forEach(grandchildId => {
          // Find the parent of this grandchild
          const parentId = Object.entries(edges)
            .find(([, edge]) => 
              edge.type === 'hierarchy' && 
              edge.target === grandchildId &&
              directChildren.includes(edge.source)
            )?.[1]?.source
          
          if (parentId && layouts.nodes[parentId]) {
            const parentPos = layouts.nodes[parentId]
            layouts.nodes[grandchildId] = {
              x: parentPos.x,
              y: parentPos.y + layoutParams.ranksep
            }
          }
        })
      }
      
      // Keep root node in its original position
      layouts.nodes[selectedNodeId] = { ...rootPos }
      
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
    getDescendants
  }
}

export default useDagreService