import { triggerRef, nextTick, type Ref } from 'vue'
import type { Edge } from '@vue-flow/core'
import type { NodeData, ContextMenuState } from '../types'

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
  resolveAllOverlaps: (nodes: NodeData[]) => void
) {

  // ============================================================
  // HELPER FUNCTION
  // ============================================================
  
  function closeContextMenu() {
  contextMenu.value.visible = false
}



  // ============================================================
  // COLLAPSE FUNCTIONS
  // ============================================================
  
  function toggleCollapse(nodeId: string) {
  const node = nodes.value.find((n: NodeData) => n.id === nodeId)
  if (!node) return

  const wasCollapsed = node.collapsed
  node.collapsed = !node.collapsed

  // Trigger bounding box recalculation (computed property will recalculate)
  // This ensures collapsed nodes have smaller bounding boxes
  triggerRef(nodes)

  // Sync to update visibility
  syncToVueFlow()

  // If we just expanded (was collapsed, now not), resolve overlaps
  if (wasCollapsed && !node.collapsed) {
    // Use setTimeout to ensure bounding boxes are recalculated first
    setTimeout(() => {
      resolveAllOverlaps(nodes.value)
      syncToVueFlow()
      triggerRef(nodes)
    }, 50)
  }

  // Also need to update edges visibility
  edges.value = [...edges.value]
}



  function toggleCollapseLeft(nodeId: string) {
    const node = nodes.value.find((n: NodeData) => n.id === nodeId)
    if (!node || node.parentId !== null) return // Only for root nodes
  
    const wasCollapsed = node.collapsedLeft
    node.collapsedLeft = !node.collapsedLeft
  
    // Trigger bounding box recalculation
    triggerRef(nodes)
  
    // Sync to update visibility
    syncToVueFlow()
  
    // If we just expanded, resolve overlaps
    if (wasCollapsed && !node.collapsedLeft) {
      setTimeout(() => {
        resolveAllOverlaps(nodes.value)
        syncToVueFlow()
        triggerRef(nodes)
      }, 50)
    }
  
    // Update edges visibility
    edges.value = [...edges.value]
  }
  


  function toggleCollapseRight(nodeId: string) {
    const node = nodes.value.find((n: NodeData) => n.id === nodeId)
    if (!node || node.parentId !== null) return // Only for root nodes
  
    const wasCollapsed = node.collapsedRight
    node.collapsedRight = !node.collapsedRight
  
    // Trigger bounding box recalculation
    triggerRef(nodes)
  
    // Sync to update visibility
    syncToVueFlow()
  
    // If we just expanded, resolve overlaps
    if (wasCollapsed && !node.collapsedRight) {
      setTimeout(() => {
        resolveAllOverlaps(nodes.value)
        syncToVueFlow()
        triggerRef(nodes)
      }, 50)
    }
  
    // Update edges visibility
    edges.value = [...edges.value]
  }
  


  // ============================================================
  // ADD NODE FUNCTIONS
  // ============================================================
  
  async function addRootNode() {
  console.log('addRootNode called, current nodes:', nodes.value.length)
  const id = `node-${nodeCounter.value++}`
  nodes.value.push({
    id,
    label: `Root ${id}`,
    parentId: null,
    x: Math.random() * 400 - 200,
    y: Math.random() * 400 - 200,
    width: 150,
    height: 50,
    collapsed: false,
    collapsedLeft: false,
    collapsedRight: false,
    isDirty: true, // New node needs position calculation
    lastCalculatedZoom: viewport.value.zoom
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



  // Helper function to add child on a specific side
  function addChildToSide(parent: NodeData, side: 'left' | 'right') {
    const offsetX = side === 'left' ? -200 : 200
    const childX = parent.x + offsetX
    const childY = parent.y  // Same horizontal level as parent

    const id = `node-${nodeCounter.value++}`
    const newNode: NodeData = {
      id,
      label: `Child ${id}`,
      parentId: parent.id,
      x: childX,
      y: childY,
      width: 150,
      height: 50,  // Same height as root nodes (one line of text)
      collapsed: false,
      isDirty: true, // New node needs position calculation
      lastCalculatedZoom: viewport.value.zoom
    }
  
    nodes.value.push(newNode)
  
    // Sync node to VueFlow first
    syncToVueFlow()
  
    // Add edge with correct handles based on side
    const sourceHandle = side === 'left' ? 'left' : 'right'
    const targetHandle = side === 'left' ? 'right' : 'left'
  
    console.log('Adding edge:', { source: parent.id, target: id, sourceHandle, targetHandle, side })
  
    // Create new edge
    const newEdge = {
      id: `e-${parent.id}-${id}`,
      source: parent.id,
      sourceHandle: sourceHandle,
      target: id,
      targetHandle: targetHandle,
      type: 'straight'
    }
  
    // Replace edges array to trigger reactivity
    edges.value = [...edges.value, newEdge]
  
    console.log('Total edges after adding:', edges.value.length)
  
    closeContextMenu()
  
    // Measure dimensions and resolve overlaps after adding
    setTimeout(async () => {
      await updateNodeDimensionsFromDOM()
      resolveAllOverlaps(nodes.value)
      syncToVueFlow()
    }, 100)
  }
  


  function addSibling() {
    if (!contextMenu.value.nodeId) return
  
    const sibling = nodes.value.find(n => n.id === contextMenu.value.nodeId)
    if (!sibling) return

    const id = `node-${nodeCounter.value++}`
    const newNode: NodeData = {
      id,
      label: `Sibling ${id}`,
      parentId: sibling.parentId,
      x: sibling.x + 200,
      y: sibling.y,
      width: 150,
      height: 50,  // All nodes have same height now
      collapsed: false
    }
  
    nodes.value.push(newNode)
  
    // Add edge if parent exists
    if (sibling.parentId) {
      edges.value.push({
        id: `e-${sibling.parentId}-${id}`,
        source: sibling.parentId,
        target: id,
        type: 'straight'
      })
      // Trigger reactivity for edges
      triggerRef(edges)
    }
  
    closeContextMenu()
  
    // Sync to VueFlow
    syncToVueFlow()
  
    // Measure dimensions and resolve overlaps after adding
    setTimeout(async () => {
      await updateNodeDimensionsFromDOM()
      resolveAllOverlaps(nodes.value)
      syncToVueFlow()
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
      node.collapsedLeft = undefined
      node.collapsedRight = undefined
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
  
    // Create new edge with appropriate handles
    const newParentRoot2 = getRootNode(newParentId)
    let sourceHandle = 'bottom'
    let targetHandle = 'top'
  
    if (newParentRoot2) {
      const isLeftBranch = newParent.x < newParentRoot2.x
      sourceHandle = isLeftBranch ? 'left' : 'right'
      targetHandle = isLeftBranch ? 'right' : 'left'
    } else {
      // New parent is root
      const isLeftBranch = node.x < newParent.x
      sourceHandle = isLeftBranch ? 'left' : 'right'
      targetHandle = isLeftBranch ? 'right' : 'left'
    }
  
    edges.value.push({
      id: `e-${newParentId}-${nodeId}`,
      source: newParentId,
      target: nodeId,
      sourceHandle,
      targetHandle,
      type: 'straight'
    })
  
    // Update edges for the entire branch
    updateEdgesForBranch(node)
  
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

