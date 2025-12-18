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

  const currentParams = ref<DagreParams>({ ...defaultParams })

  // Set parameters
  const setParams = (params: Partial<DagreParams>) => {
    currentParams.value = { ...currentParams.value, ...params }
  }

  // Reset to defaults
  const resetParams = () => {
    currentParams.value = { ...defaultParams }
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

    // Get the root node's current position to use as anchor
    const rootPos = layouts.nodes[selectedNodeId]
    if (!rootPos) {
      console.warn('Root node has no position')
      return false
    }

    const rootDagrePos = g.node(selectedNodeId)
    const offsetX = rootPos.x - rootDagrePos.x
    const offsetY = rootPos.y - rootDagrePos.y

    // Update positions for subgraph nodes (offset to keep root in place)
    subgraphNodes.forEach(nodeId => {
      const dagreNode = g.node(nodeId)
      layouts.nodes[nodeId] = {
        x: dagreNode.x + offsetX,
        y: dagreNode.y + offsetY,
      }
    })

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
    setParams,
    resetParams,
    applyDagreToSelected,
    getDescendants
  }
}

export default useDagreService