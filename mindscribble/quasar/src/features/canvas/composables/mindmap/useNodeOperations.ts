import { triggerRef, nextTick, type Ref } from 'vue'
import type { Edge } from '@vue-flow/core'
import type { NodeData, ContextMenuState } from '../../components/mindmap/types'
import { useDocumentStore } from 'src/core/stores/documentStore'
import type { EventSource } from 'src/core/events'

export function useNodeOperations(
  nodes: Ref<NodeData[]>,
  edges: Ref<Edge[]>,
  contextMenu: Ref<ContextMenuState>,
  nodeCounter: Ref<number>,
  viewport: Ref<{ zoom: number; x: number; y: number }>,
  // Dependencies from other composables
  getDirectChildren: (nodeId: string) => NodeData[],
  getRootNode: (nodeId: string) => NodeData | null,
  getAllDescendants: (nodeId: string, nodes: NodeData[]) => NodeData[],
  createEdge: (sourceId: string, targetId: string) => void,
  updateEdgesForBranch: (node: NodeData) => void,
  syncToVueFlow: () => void,
  updateNodeDimensionsFromDOM: () => Promise<boolean>,
  resolveAllOverlaps: (nodes: NodeData[]) => void,
  // Event source for store operations
  eventSource: EventSource = 'mindmap'
) {
  // Get document store
  const documentStore = useDocumentStore()

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  function closeContextMenu() {
    contextMenu.value.visible = false
  }

  /**
   * Sync a local node to the store
   */
  function syncNodeToStore(localNode: NodeData) {
    const storeNode = documentStore.nodes.find(n => n.id === localNode.id)
    if (storeNode) {
      // Update position
      documentStore.updateNodePosition(localNode.id, { x: localNode.x, y: localNode.y }, eventSource)

      // Update data (title, parentId)
      documentStore.updateNode(localNode.id, {
        title: localNode.label,
        parentId: localNode.parentId
      }, eventSource)

      // Update view-specific data directly on the store node
      if (!storeNode.views.mindmap) {
        storeNode.views.mindmap = { position: null }
      }
      storeNode.views.mindmap.position = { x: localNode.x, y: localNode.y }
      // Only set optional properties if they have defined values
      if (localNode.collapsed !== undefined) {
        storeNode.views.mindmap.collapsed = localNode.collapsed
      }
      if (localNode.collapsedLeft !== undefined) {
        storeNode.views.mindmap.collapsedLeft = localNode.collapsedLeft
      }
      if (localNode.collapsedRight !== undefined) {
        storeNode.views.mindmap.collapsedRight = localNode.collapsedRight
      }
    }
  }

  /**
   * Add a node to both local state and store
   */
  function addNodeToLocalAndStore(
    parentId: string | null,
    label: string,
    x: number,
    y: number,
    options: {
      collapsed?: boolean
      collapsedLeft?: boolean
      collapsedRight?: boolean
    } = {}
  ): NodeData {
    const defaultWidth = 150
    const defaultHeight = 50

    // Add to store first to get the ID
    const storeNode = documentStore.addNode(
      parentId,
      label,
      '',
      { x, y },
      eventSource
    )

    // Set mindmap view-specific data on the store node
    storeNode.views.mindmap = {
      position: { x, y },
      collapsed: options.collapsed ?? false,
      collapsedLeft: options.collapsedLeft ?? false,
      collapsedRight: options.collapsedRight ?? false,
      isDirty: true,
      lastCalculatedZoom: viewport.value.zoom
    }

    // Create local node with store ID
    const localNode: NodeData = {
      id: storeNode.id,
      label,
      parentId,
      x,
      y,
      width: defaultWidth,
      height: defaultHeight,
      mindmapPosition: { x, y }, // Mark as having a position
      collapsed: options.collapsed ?? false,
      collapsedLeft: options.collapsedLeft ?? false,
      collapsedRight: options.collapsedRight ?? false,
      isDirty: true,
      lastCalculatedZoom: viewport.value.zoom
    }

    // Add to local state
    nodes.value.push(localNode)

    return localNode
  }



  // ============================================================
  // COLLAPSE FUNCTIONS
  // ============================================================

  function toggleCollapse(nodeId: string) {
    const node = nodes.value.find((n: NodeData) => n.id === nodeId)
    if (!node) return

    node.collapsed = !node.collapsed

    // Sync collapse state to store
    syncNodeToStore(node)

    // Trigger bounding box recalculation (computed property will recalculate)
    // This ensures collapsed nodes have smaller bounding boxes
    triggerRef(nodes)

    // Sync to update visibility
    syncToVueFlow()

    // Note: We do NOT call resolveAllOverlaps here anymore
    // Collapsed/expanded nodes should keep their existing positions
    // AABB will naturally handle any overlaps during normal drag operations

    // Also need to update edges visibility
    edges.value = [...edges.value]
  }



  function toggleCollapseLeft(nodeId: string) {
    const node = nodes.value.find((n: NodeData) => n.id === nodeId)
    if (!node || node.parentId !== null) return // Only for root nodes

    node.collapsedLeft = !node.collapsedLeft

    // Sync collapse state to store
    syncNodeToStore(node)

    // Trigger bounding box recalculation
    triggerRef(nodes)

    // Sync to update visibility
    syncToVueFlow()

    // Note: We do NOT call resolveAllOverlaps - nodes keep their positions

    // Update edges visibility
    edges.value = [...edges.value]
  }

  function toggleCollapseRight(nodeId: string) {
    const node = nodes.value.find((n: NodeData) => n.id === nodeId)
    if (!node || node.parentId !== null) return // Only for root nodes

    node.collapsedRight = !node.collapsedRight

    // Sync collapse state to store
    syncNodeToStore(node)

    // Trigger bounding box recalculation
    triggerRef(nodes)

    // Sync to update visibility
    syncToVueFlow()

    // Note: We do NOT call resolveAllOverlaps - nodes keep their positions

    // Update edges visibility
    edges.value = [...edges.value]
  }



  // ============================================================
  // ADD NODE FUNCTIONS
  // ============================================================

  async function addRootNode() {
    console.log('addRootNode called, current nodes:', nodes.value.length)

    // Default node dimensions - will be updated after DOM measurement
    const defaultWidth = 150
    const defaultHeight = 50

    // Position node so its center is at canvas origin (0,0)
    const x = -defaultWidth / 2
    const y = -defaultHeight / 2

    // Use counter for label (but ID comes from store)
    const labelNum = nodeCounter.value++

    // Add to both local and store
    addNodeToLocalAndStore(null, `Root ${labelNum}`, x, y, {
      collapsed: false,
      collapsedLeft: false,
      collapsedRight: false
    })

    syncToVueFlow()

    // Measure actual dimensions after rendering
    await nextTick()
    await updateNodeDimensionsFromDOM()

    console.log('After addRootNode, nodes:', nodes.value.length)
  }



  function addChildLeft() {
  if (!contextMenu.value.nodeId) return
  const parent = nodes.value.find(n => n.id === contextMenu.value.nodeId)
  if (!parent) return

  addChildToSide(parent, 'left')
}



  function addChildRight() {
  if (!contextMenu.value.nodeId) return
  const parent = nodes.value.find(n => n.id === contextMenu.value.nodeId)
  if (!parent) return

  addChildToSide(parent, 'right')
}



  function addChild() {
  if (!contextMenu.value.nodeId) return
  const parent = nodes.value.find(n => n.id === contextMenu.value.nodeId)
  if (!parent) return

  // Determine which side of root the parent is on
  const root = getRootNode(parent.id)
  if (!root) return

  const isLeftSide = parent.x < root.x
  addChildToSide(parent, isLeftSide ? 'left' : 'right')
}



  /**
   * Add child on a specific side with proper positioning:
   * - First child: at parent's horizontal level (same Y)
   * - Subsequent children: below (or above) the last existing child
   *
   * TODO: When orientation is implemented, "below" vs "above" will depend on:
   * - For clockwise/anticlockwise: depends on which side and visual order
   * - For left-right/right-left: always same direction
   */
  function addChildToSide(parent: NodeData, side: 'left' | 'right') {
    const HORIZONTAL_SPACING = 200
    const VERTICAL_SPACING = 60 // Space between sibling nodes

    const offsetX = side === 'left' ? -HORIZONTAL_SPACING : HORIZONTAL_SPACING
    const childX = parent.x + offsetX

    // Get existing children on this side
    const existingChildren = getDirectChildren(parent.id).filter(child => {
      if (side === 'left') {
        return child.x < parent.x
      } else {
        return child.x >= parent.x
      }
    })

    let childY: number
    if (existingChildren.length === 0) {
      // First child: same Y as parent (horizontal level)
      childY = parent.y
    } else {
      // Find the bottommost child on this side
      const lastChild = existingChildren.reduce((lowest, child) => {
        return child.y > lowest.y ? child : lowest
      }, existingChildren[0]!)

      // Position new child below the last one
      // TODO: In clockwise orientation on left side, this should be ABOVE (negative Y)
      childY = lastChild.y + (lastChild.height ?? 50) + VERTICAL_SPACING
    }

    // Use counter for label (but ID comes from store)
    const labelNum = nodeCounter.value++

    // Add to both local and store
    const newNode = addNodeToLocalAndStore(parent.id, `Child ${labelNum}`, childX, childY, {
      collapsed: false
    })

    // Sync node to VueFlow first
    syncToVueFlow()

    // Add edge with correct handles based on side
    const sourceHandle = side === 'left' ? 'left' : 'right'
    const targetHandle = side === 'left' ? 'right' : 'left'

    console.log('Adding edge:', { source: parent.id, target: newNode.id, sourceHandle, targetHandle, side })

    // Create new edge
    const newEdge = {
      id: `e-${parent.id}-${newNode.id}`,
      source: parent.id,
      sourceHandle: sourceHandle,
      target: newNode.id,
      targetHandle: targetHandle,
      type: 'straight'
    }

    // Replace edges array to trigger reactivity
    edges.value = [...edges.value, newEdge]

    console.log('Total edges after adding:', edges.value.length)

    closeContextMenu()

    // Measure dimensions only - don't reposition existing nodes
    // Let AABB handle overlaps during subsequent drag operations
    setTimeout(() => {
      void (async () => {
        await updateNodeDimensionsFromDOM()
        syncToVueFlow()
      })()
    }, 100)
  }



  /**
   * Add sibling node - positioned below the clicked sibling node
   */
  function addSibling() {
    if (!contextMenu.value.nodeId) return

    const sibling = nodes.value.find(n => n.id === contextMenu.value.nodeId)
    if (!sibling) return

    const VERTICAL_SPACING = 60

    // Position new sibling below the current sibling (same X, below Y)
    const newX = sibling.x
    const newY = sibling.y + (sibling.height ?? 50) + VERTICAL_SPACING

    // Use counter for label (but ID comes from store)
    const labelNum = nodeCounter.value++

    // Add to both local and store
    const newNode = addNodeToLocalAndStore(sibling.parentId, `Sibling ${labelNum}`, newX, newY, {
      collapsed: false
    })

    // Add edge if parent exists
    if (sibling.parentId) {
      // Determine edge handles based on which side of root this sibling is
      const root = getRootNode(sibling.id)
      const isLeftOfRoot = root ? sibling.x < root.x : sibling.x < 0
      const sourceHandle = isLeftOfRoot ? 'left' : 'right'
      const targetHandle = isLeftOfRoot ? 'right' : 'left'

      edges.value.push({
        id: `e-${sibling.parentId}-${newNode.id}`,
        source: sibling.parentId,
        sourceHandle,
        target: newNode.id,
        targetHandle,
        type: 'straight'
      })
      // Trigger reactivity for edges
      triggerRef(edges)
    }

    closeContextMenu()

    // Sync to VueFlow
    syncToVueFlow()

    // Measure dimensions only - don't reposition existing nodes
    setTimeout(() => {
      void (async () => {
        await updateNodeDimensionsFromDOM()
        syncToVueFlow()
      })()
    }, 100)
  }



  // ============================================================
  // DETACH AND REPARENT FUNCTIONS
  // ============================================================

  function detachNode() {
    if (!contextMenu.value.nodeId) return

    const node = nodes.value.find(n => n.id === contextMenu.value.nodeId)
    if (!node || !node.parentId) return // Only detach child nodes

    const oldParentId = node.parentId

    // Remove edge from parent
    edges.value = edges.value.filter(e => !(e.source === oldParentId && e.target === node.id))

    // Make it a root node
    node.parentId = null

    // Initialize collapse states for root nodes
    node.collapsedLeft = false
    node.collapsedRight = false

    // Update all descendants' edges (they stay connected to this node)
    updateEdgesForBranch(node)

    // Sync to store - reparent to null (make root)
    documentStore.moveNode(node.id, null, 0, eventSource)

    closeContextMenu()

    // Sync to VueFlow
    syncToVueFlow()

    // Resolve overlaps after detaching
    setTimeout(() => {
      resolveAllOverlaps(nodes.value)
      syncToVueFlow()
    }, 100)
  }



  function reparentNode(nodeId: string, newParentId: string) {
    const node = nodes.value.find((n: NodeData) => n.id === nodeId)
    const newParent = nodes.value.find((n: NodeData) => n.id === newParentId)

    if (!node || !newParent) return

    console.log(`Reparenting ${nodeId} to ${newParentId}`)

    // Remove old edge
    if (node.parentId) {
      edges.value = edges.value.filter(e => !(e.source === node.parentId && e.target === nodeId))
    }

    // Update parent
    const oldParentId = node.parentId
    const wasRootNode = oldParentId === null
    node.parentId = newParentId

    // Store old position to calculate delta for descendants
    const oldX = node.x
    const oldY = node.y

    // Determine which side of new parent's root the node should be on
    const newParentRoot = getRootNode(newParentId)
    let targetSide: 'left' | 'right' = 'right'

    if (newParentRoot) {
      // Determine new parent's side relative to root
      targetSide = newParent.x < newParentRoot.x ? 'left' : 'right'

      // Position node on the same side as new parent, same horizontal level
      if (targetSide === 'left') {
        // Position to the left of new parent
        node.x = newParent.x - 200
      } else {
        // Position to the right of new parent
        node.x = newParent.x + 200
      }
      node.y = newParent.y  // Same horizontal level as parent
    } else {
      // New parent is a root node
      // Position based on which side of root the node is currently on
      if (node.x < newParent.x) {
        node.x = newParent.x - 200
        targetSide = 'left'
      } else {
        node.x = newParent.x + 200
        targetSide = 'right'
      }
      node.y = newParent.y  // Same horizontal level as parent
    }

    // Special case: If reparenting a root node with children on both sides,
    // mirror all children to follow the new parent's side
    if (wasRootNode) {
      const directChildren = getDirectChildren(nodeId)
      const hasLeftChildren = directChildren.some(c => c.x < oldX)
      const hasRightChildren = directChildren.some(c => c.x >= oldX)

      if (hasLeftChildren && hasRightChildren) {
        // Mirror all children to the target side
        directChildren.forEach(child => {
          const childWasOnLeft = child.x < oldX
          const childWasOnRight = child.x >= oldX

          // Calculate relative position from old node position
          const relativeX = child.x - oldX
          const relativeY = child.y - oldY

          // Mirror if needed
          if (targetSide === 'left' && childWasOnRight) {
            // Flip to left side
            child.x = node.x - Math.abs(relativeX)
            child.y = node.y + relativeY
          } else if (targetSide === 'right' && childWasOnLeft) {
            // Flip to right side
            child.x = node.x + Math.abs(relativeX)
            child.y = node.y + relativeY
          } else {
            // Keep same side
            child.x = node.x + relativeX
            child.y = node.y + relativeY
          }

          // Recursively move all descendants of this child
          const childDescendants = getAllDescendants(child.id, nodes.value)
          const childDeltaX = child.x - (oldX + relativeX)
          const childDeltaY = child.y - (oldY + relativeY)

          childDescendants.forEach(desc => {
            desc.x += childDeltaX
            desc.y += childDeltaY
          })
        })
      } else {
        // Normal case: just move all descendants
        const deltaX = node.x - oldX
        const deltaY = node.y - oldY

        const descendants = getAllDescendants(nodeId, nodes.value)
        descendants.forEach(descendant => {
          descendant.x += deltaX
          descendant.y += deltaY
        })
      }

      // Clear collapse state for root nodes when they become children
      delete node.collapsedLeft
      delete node.collapsedRight
    } else {
      // Normal case: just move all descendants
      const deltaX = node.x - oldX
      const deltaY = node.y - oldY

      const descendants = getAllDescendants(nodeId, nodes.value)
      descendants.forEach(descendant => {
        descendant.x += deltaX
        descendant.y += deltaY
      })
    }

    // Create new edge - handles will be set by updateEdgesForBranch based on closest connection
    edges.value.push({
      id: `e-${newParentId}-${nodeId}`,
      source: newParentId,
      target: nodeId,
      sourceHandle: 'right', // Temporary, will be updated
      targetHandle: 'left',  // Temporary, will be updated
      type: 'straight'
    })

    // Update edges for the entire branch using closest handle approach
    updateEdgesForBranch(node)

    // Sync to store
    documentStore.moveNode(nodeId, newParentId, 0, eventSource)

    // Also sync position updates to store for the node and all descendants
    syncNodeToStore(node)
    const allDescendants = getAllDescendants(nodeId, nodes.value)
    allDescendants.forEach(desc => syncNodeToStore(desc))

    console.log(`Reparented ${nodeId} from ${oldParentId} to ${newParentId}`)
  }



  // ============================================================
  // RETURN
  // ============================================================

  return {
    closeContextMenu,
    toggleCollapse,
    toggleCollapseLeft,
    toggleCollapseRight,
    addRootNode,
    addChildLeft,
    addChildRight,
    addChild,
    addChildToSide,
    addSibling,
    detachNode,
    reparentNode
  }
}

