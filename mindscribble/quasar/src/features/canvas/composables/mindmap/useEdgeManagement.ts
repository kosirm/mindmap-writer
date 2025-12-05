import { ref, computed, triggerRef, type Ref } from 'vue'
import type { Node, Edge } from '@vue-flow/core'
import type { NodeData } from '../../components/mindmap/types'
import { getAllDescendants } from '../../components/mindmap/layout'

export function useEdgeManagement(
  nodes: Ref<NodeData[]>,
  edges: Ref<Edge[]>,
  vueFlowNodes: Ref<Node[]>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getRootNode: (nodeId: string) => NodeData | null,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  /**
   * Calculate the closest connection handles based on relative position
   * between parent and child nodes.
   *
   * Uses all 4 connection points (top, right, bottom, left) and connects
   * to whichever is closest based on the child's position relative to parent.
   *
   * @returns { sourceHandle, targetHandle } - The handles to use for the edge
   */
  function getClosestHandles(parent: NodeData, child: NodeData): { sourceHandle: string, targetHandle: string } {
    const parentCenterX = parent.x + parent.width / 2
    const parentCenterY = parent.y + parent.height / 2
    const childCenterX = child.x + child.width / 2
    const childCenterY = child.y + child.height / 2

    const dx = childCenterX - parentCenterX
    const dy = childCenterY - parentCenterY

    // Determine primary direction based on which delta is larger
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal connection is primary
      if (dx > 0) {
        // Child is to the right of parent
        return { sourceHandle: 'right', targetHandle: 'left' }
      } else {
        // Child is to the left of parent
        return { sourceHandle: 'left', targetHandle: 'right' }
      }
    } else {
      // Vertical connection is primary
      if (dy > 0) {
        // Child is below parent
        return { sourceHandle: 'bottom', targetHandle: 'top' }
      } else {
        // Child is above parent
        return { sourceHandle: 'top', targetHandle: 'bottom' }
      }
    }
  }

  /**
   * Update edge handles between parent and child based on closest connection point
   */
  function updateEdgeHandlesForNode(parentId: string, childId: string) {
    const parent = nodes.value.find(n => n.id === parentId)
    const child = nodes.value.find(n => n.id === childId)

    if (!parent || !child) return

    const { sourceHandle, targetHandle } = getClosestHandles(parent, child)

    const edgeId = `e-${parentId}-${childId}`
    const edgeIndex = edges.value.findIndex(e => e.id === edgeId)

    if (edgeIndex !== -1) {
      // Create new edge object to trigger reactivity
      edges.value = edges.value.map(e =>
        e.id === edgeId
          ? { ...e, sourceHandle, targetHandle }
          : e
      )
    }
  }

  // Legacy function signature for compatibility - now ignores isLeftOfRoot parameter
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function updateEdgeHandles(parentId: string, childId: string, _isLeftOfRoot: boolean) {
    updateEdgeHandlesForNode(parentId, childId)
  }

  /**
   * Update edge handles for a node and all its descendants
   * Uses closest handle approach based on parent-child relative position
   */
  function updateEdgesForBranch(node: NodeData) {
    // Update edge for this node
    if (node.parentId) {
      updateEdgeHandlesForNode(node.parentId, node.id)
    }

    // Update edges for all descendants
    const descendants = getAllDescendants(node.id, nodes.value)
    descendants.forEach(descendant => {
      if (descendant.parentId) {
        updateEdgeHandlesForNode(descendant.parentId, descendant.id)
      }
    })

    // Trigger reactivity for edges
    triggerRef(edges)
  }

  /**
   * Update all edge handles based on current node positions
   * Uses closest handle approach - connects to nearest of 4 connection points
   */
  function updateAllEdgeHandles() {
    console.log('Updating all edge handles (closest handle approach)')

    for (const node of nodes.value) {
      if (!node.parentId) continue // Skip root nodes
      updateEdgeHandlesForNode(node.parentId, node.id)
    }

    // Trigger reactivity for edges
    triggerRef(edges)
  }

  /**
   * Create edge between parent and child with handles based on closest connection point
   */
  function createEdge(sourceId: string, targetId: string) {
    const parent = nodes.value.find(n => n.id === sourceId)
    const child = nodes.value.find(n => n.id === targetId)

    if (!parent || !child) return

    const { sourceHandle, targetHandle } = getClosestHandles(parent, child)

    edges.value.push({
      id: `e-${sourceId}-${targetId}`,
      source: sourceId,
      sourceHandle,
      target: targetId,
      targetHandle,
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
    updateAllEdgeHandles,
    createEdge
  }
}
