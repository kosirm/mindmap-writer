import { ref, computed, triggerRef, type Ref } from 'vue'
import type { Node, Edge } from '@vue-flow/core'
import type { NodeData } from '../types'
import { getAllDescendants } from '../layout'

export function useEdgeManagement(
  nodes: Ref<NodeData[]>,
  edges: Ref<Edge[]>,
  vueFlowNodes: Ref<Node[]>,
  getRootNode: (nodeId: string) => NodeData | null,
  isNodeOnLeftOfRoot: (node: NodeData) => boolean
) {

  // ============================================================
  // STATE - Copy from App.vue lines 409-416
  // ============================================================

  const edgeType = ref<'default' | 'straight' | 'step' | 'smoothstep' | 'simplebezier'>('default')
const edgeTypeOptions = [
  { value: 'straight', label: 'Straight' },
  { value: 'default', label: 'Bezier' },
  { value: 'simplebezier', label: 'Simple Bezier' },
  { value: 'step', label: 'Step' },
  { value: 'smoothstep', label: 'Smooth Step' },
]



  // ============================================================
  // COMPUTED - Copy from App.vue lines 457-467
  // ============================================================

  const visibleEdges = computed(() => {
  const visibleNodeIds = new Set(vueFlowNodes.value.map(n => n.id))
  return edges.value
    .filter(edge =>
      visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    )
    .map(edge => ({
      ...edge,
      type: edgeType.value
    }))
})



  // ============================================================
  // FUNCTIONS
  // ============================================================

  // Update edge handles between parent and child based on side
function updateEdgeHandles(parentId: string, childId: string, isLeftSide: boolean) {
  const edgeId = `e-${parentId}-${childId}`
  const edgeIndex = edges.value.findIndex(e => e.id === edgeId)

  if (edgeIndex !== -1) {
    const sourceHandle = isLeftSide ? 'left' : 'right'
    const targetHandle = isLeftSide ? 'right' : 'left'

    // Create new edge object to trigger reactivity
    edges.value = edges.value.map(e =>
      e.id === edgeId
        ? { ...e, sourceHandle, targetHandle }
        : e
    )
  }
}



// Update edge handles for a node and all its descendants
function updateEdgesForBranch(node: NodeData) {
  const root = getRootNode(node.id)
  if (!root) return

  const isLeftSide = node.x < root.x

  // Update edge for this node
  updateEdgeHandles(node.parentId!, node.id, isLeftSide)

  // Update edges for all descendants
  const descendants = getAllDescendants(node.id, nodes.value)
  descendants.forEach(descendant => {
    if (descendant.parentId) {
      updateEdgeHandles(descendant.parentId, descendant.id, isLeftSide)
    }
  })

  // Trigger reactivity for edges
  triggerRef(edges)
}



function createEdge(sourceId: string, targetId: string) {
  // Find source and target nodes to determine which handles to use
  const sourceNode = nodes.value.find(n => n.id === sourceId)
  const targetNode = nodes.value.find(n => n.id === targetId)

  if (!sourceNode || !targetNode) return

  // Determine handles based on child position relative to parent
  // If child is LEFT of parent: parent uses LEFT handle, child uses RIGHT handle
  // If child is RIGHT of parent: parent uses RIGHT handle, child uses LEFT handle

  let sourceHandle: string
  let targetHandle: string

  if (targetNode.x < sourceNode.x) {
    // Child is on LEFT side of parent
    sourceHandle = 'left'
    targetHandle = 'right'
  } else {
    // Child is on RIGHT side of parent
    sourceHandle = 'right'
    targetHandle = 'left'
  }

  edges.value.push({
    id: `e-${sourceId}-${targetId}`,
    source: sourceId,
    sourceHandle: sourceHandle,
    target: targetId,
    targetHandle: targetHandle,
    type: 'straight'
  })

  // Trigger reactivity for edges
  triggerRef(edges)
}



  // ============================================================
  // RETURN
  // ============================================================

  return {
    edgeType,
    edgeTypeOptions,
    visibleEdges,
    updateEdgeHandles,
    updateEdgesForBranch,
    createEdge
  }
}
