import { computed, triggerRef, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import type { Node, Edge } from '@vue-flow/core'
import type { NodeData } from '../../components/mindmap/types'
import { getAllDescendants } from '../../components/mindmap/layout'
import { useDevSettingsStore, edgeTypeOptions } from '../../../../dev/devSettingsStore'

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
  // STATE - Use devSettings for edge types
  // ============================================================
  const devSettings = useDevSettingsStore()
  const { hierarchyEdgeType, referenceEdgeType } = storeToRefs(devSettings)

  // ============================================================
  // COMPUTED
  // ============================================================

  const visibleEdges = computed(() => {
    const visibleNodeIds = new Set(vueFlowNodes.value.map(n => n.id))
    return edges.value
      .filter(edge =>
        visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
      )
      .map(edge => {
        // Preserve reference edge styling, apply edgeType to hierarchy edges only
        // Check data.edgeType or if class is a string containing 'edge-reference'
        const classStr = typeof edge.class === 'string' ? edge.class : ''
        const isReferenceEdge = edge.data?.edgeType === 'reference' || classStr.includes('edge-reference')

        if (isReferenceEdge) {
          return {
            ...edge,
            type: referenceEdgeType.value,
            class: 'edge-reference'
          }
        }
        // For hierarchy edges, use hierarchyEdgeType
        return {
          ...edge,
          type: hierarchyEdgeType.value
        }
      })
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
    // Handle IDs now include -source/-target suffix for bi-directional connections
    // Parent uses -source handles, child uses -target handles
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal connection is primary
      if (dx > 0) {
        // Child is to the right of parent
        return { sourceHandle: 'right-source', targetHandle: 'left-target' }
      } else {
        // Child is to the left of parent
        return { sourceHandle: 'left-source', targetHandle: 'right-target' }
      }
    } else {
      // Vertical connection is primary
      if (dy > 0) {
        // Child is below parent
        return { sourceHandle: 'bottom-source', targetHandle: 'top-target' }
      } else {
        // Child is above parent
        return { sourceHandle: 'top-source', targetHandle: 'bottom-target' }
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
    hierarchyEdgeType,
    referenceEdgeType,
    edgeTypeOptions,
    visibleEdges,
    updateEdgeHandles,
    updateEdgesForBranch,
    updateAllEdgeHandles,
    createEdge
  }
}
