import { ref, triggerRef, type Ref } from 'vue'
import type { NodeDragEvent } from '@vue-flow/core'
import type { NodeData } from '../../components/mindmap/types'

export function useNodeDrag(
  nodes: Ref<NodeData[]>,
  viewport: Ref<{ zoom: number; x: number; y: number }>,
  // Dependencies from other composables
  getRootNode: (nodeId: string) => NodeData | null,
  getAllDescendants: (nodeId: string, nodes: NodeData[]) => NodeData[],
  getVisibleNodesForLOD: () => NodeData[],
  updateEdgesForBranch: (node: NodeData) => void,
  reparentNode: (nodeId: string, newParentId: string) => void,
  syncToVueFlow: () => void,
  syncFromVueFlow: () => void,
  resolveAllOverlaps: (nodes: NodeData[]) => void,
  resolveOverlapsForAffectedRootsLOD: (affectedNodeIds: string[], visibleNodes: NodeData[], allNodes: NodeData[]) => void,
  // VueFlow function to force re-render of nodes (fixes visible-only rendering issue)
  updateNodeInternals: (nodeIds?: string[]) => void
) {

  // ============================================================
  // STATE - Drag tracking
  // ============================================================

  const dragStartPositions = ref<Map<string, { x: number; y: number }>>(new Map())

// Track if node crossed to other side during drag
const nodeCrossedSides = ref(false)

// Track which side each node started on (to detect crossing)
const dragStartSides = ref<Map<string, 'left' | 'right'>>(new Map())

// Track relative positions of all descendants to dragged node (for mirroring)
// Key: descendant node id, Value: { deltaX, deltaY } relative to dragged node center
const descendantDeltas = ref<Map<string, { deltaX: number; deltaY: number }>>(new Map())

// Track potential parent during drag (for reparenting)
const potentialParent = ref<string | null>(null)

// Track mouse position during drag (for reparenting detection)
const dragMousePosition = ref<{ x: number; y: number } | null>(null)



  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

// Mirror all descendants across the dragged node's center
// This flips the deltaX for all descendants (left becomes right, right becomes left)
function mirrorDescendantsAcrossNode(node: NodeData) {
  const nodeCenterX = node.x + node.width / 2
  const nodeCenterY = node.y + node.height / 2

  // Get all descendants
  const descendants = getAllDescendants(node.id, nodes.value)

  descendants.forEach(descendant => {
    // Get the stored delta for this descendant
    const delta = descendantDeltas.value.get(descendant.id)
    if (!delta) return

    // Mirror the deltaX (flip horizontal position)
    const mirroredDeltaX = -delta.deltaX

    // Calculate new position based on mirrored delta
    const descendantCenterX = nodeCenterX + mirroredDeltaX
    const descendantCenterY = nodeCenterY + delta.deltaY

    // Update descendant position (convert from center to top-left)
    descendant.x = descendantCenterX - descendant.width / 2
    descendant.y = descendantCenterY - descendant.height / 2

    // Update the stored delta to the mirrored value
    descendantDeltas.value.set(descendant.id, { deltaX: mirroredDeltaX, deltaY: delta.deltaY })
  })
}



function detectPotentialParent(draggedNode: NodeData, mouseX?: number, mouseY?: number) {
  // Check if dragged node is over another node
  // Don't allow reparenting to self or descendants
  const descendants = getAllDescendants(draggedNode.id, nodes.value)
  const descendantIds = new Set([draggedNode.id, ...descendants.map(d => d.id)])

  // Find if dragged node overlaps with any other node
  let foundParent: string | null = null

  // Use mouse position if available, otherwise fall back to node center
  const checkX = mouseX !== undefined ? mouseX : draggedNode.x + draggedNode.width / 2
  const checkY = mouseY !== undefined ? mouseY : draggedNode.y + draggedNode.height / 2

  for (const targetNode of nodes.value) {
    // Skip if target is the dragged node or its descendant
    if (descendantIds.has(targetNode.id)) continue

    // Check if mouse/node center is inside target node bounds
    if (
      checkX >= targetNode.x &&
      checkX <= targetNode.x + targetNode.width &&
      checkY >= targetNode.y &&
      checkY <= targetNode.y + targetNode.height
    ) {
      // More subtle reparenting: check if mouse is in the inner 1/3 of the target node
      // Determine which side of the root the target node is on
      const targetRoot = getRootNode(targetNode.id)

      if (targetRoot) {
        const isLeftBranch = targetNode.x < targetRoot.x

        // For left branch: check if mouse is in the LEFT 1/3 of target node
        // For right branch: check if mouse is in the RIGHT 1/3 of target node
        const relativeX = checkX - targetNode.x
        const threshold = targetNode.width / 3

        if (isLeftBranch) {
          // Left branch: mouse must be in left 1/3
          if (relativeX <= threshold) {
            foundParent = targetNode.id
            break
          }
        } else {
          // Right branch: mouse must be in right 2/3 (beyond left 1/3)
          if (relativeX >= targetNode.width - threshold) {
            foundParent = targetNode.id
            break
          }
        }
      } else {
        // Target is a root node - use same logic based on which side dragged node is on
        const isLeftSide = draggedNode.x < targetNode.x
        const relativeX = checkX - targetNode.x
        const threshold = targetNode.width / 3

        if (isLeftSide) {
          // Dragging from left: mouse must be in left 1/3
          if (relativeX <= threshold) {
            foundParent = targetNode.id
            break
          }
        } else {
          // Dragging from right: mouse must be in right 1/3
          if (relativeX >= targetNode.width - threshold) {
            foundParent = targetNode.id
            break
          }
        }
      }
    }
  }

  // Update potential parent
  if (potentialParent.value !== foundParent) {
    potentialParent.value = foundParent
    syncToVueFlow() // Update visual feedback
  }
}



  // ============================================================
  // DRAG EVENT HANDLERS
  // ============================================================

  function onPaneMouseMove(event: MouseEvent) {
  // Track mouse position during drag (converted to canvas coordinates)
  if (dragStartPositions.value.size > 0) {
    // Convert screen coordinates to canvas coordinates
    const canvasX = (event.clientX - viewport.value.x) / viewport.value.zoom
    const canvasY = (event.clientY - viewport.value.y) / viewport.value.zoom
    dragMousePosition.value = { x: canvasX, y: canvasY }
  }
}



  function onNodeDragStart(event: NodeDragEvent) {
  // Store initial positions of all dragged nodes
  dragStartPositions.value.clear()
  dragStartSides.value.clear()
  descendantDeltas.value.clear()
  dragMousePosition.value = null
  nodeCrossedSides.value = false // Reset side-crossing flag

  event.nodes.forEach(vfNode => {
    const node = nodes.value.find(n => n.id === vfNode.id)
    if (node) {
      dragStartPositions.value.set(node.id, { x: node.x, y: node.y })

      // Store which side the node started on
      if (node.parentId) {
        const root = getRootNode(node.id)
        if (root) {
          const rootCenterX = root.x + root.width / 2
          const nodeCenterX = node.x + node.width / 2
          const startSide = nodeCenterX < rootCenterX ? 'left' : 'right'
          dragStartSides.value.set(node.id, startSide)
        }
      }

      // Store relative positions (deltas) of ALL descendants relative to dragged node center
      const nodeCenterX = node.x + node.width / 2
      const nodeCenterY = node.y + node.height / 2
      const descendants = getAllDescendants(node.id, nodes.value)

      descendants.forEach(descendant => {
        const descendantCenterX = descendant.x + descendant.width / 2
        const descendantCenterY = descendant.y + descendant.height / 2

        const deltaX = descendantCenterX - nodeCenterX
        const deltaY = descendantCenterY - nodeCenterY

        descendantDeltas.value.set(descendant.id, { deltaX, deltaY })
      })
    }
  })
}



  function onNodeDrag(event: NodeDragEvent) {
    // For each dragged node, move its children with it
    event.nodes.forEach(vfNode => {
      const node = nodes.value.find(n => n.id === vfNode.id)
      const startPos = dragStartPositions.value.get(vfNode.id)

      if (node && startPos) {
        // Update the node position
        node.x = vfNode.position.x
        node.y = vfNode.position.y

        // Check if node crossed root center line (only for non-root nodes)
        if (node.parentId) {
          const root = getRootNode(node.id)
          if (root) {
            const rootCenterX = root.x + root.width / 2
            const nodeCenterX = node.x + node.width / 2

            const startSide = dragStartSides.value.get(node.id)
            const currentSide = nodeCenterX < rootCenterX ? 'left' : 'right'

            // If crossed to other side, mirror descendants
            if (startSide && startSide !== currentSide) {
              console.log(`🔄 Node ${node.id} crossed root center! Mirroring descendants...`)
              console.log(`  Root center X: ${rootCenterX.toFixed(0)}`)
              console.log(`  Node center X: ${nodeCenterX.toFixed(0)}`)
              console.log(`  Crossed from ${startSide.toUpperCase()} to ${currentSide.toUpperCase()}`)

              nodeCrossedSides.value = true // Mark that side change happened

              // Mirror all descendants across the dragged node's center
              mirrorDescendantsAcrossNode(node)

              // Update edges for this node and all descendants
              updateEdgesForBranch(node)

              // Update the start side so we can detect crossing back
              dragStartSides.value.set(node.id, currentSide)
            }
          }
        }

        // Move all descendants based on their stored deltas
        const nodeCenterX = node.x + node.width / 2
        const nodeCenterY = node.y + node.height / 2
        const descendants = getAllDescendants(node.id, nodes.value)

        descendants.forEach(descendant => {
          const delta = descendantDeltas.value.get(descendant.id)
          if (delta) {
            // Calculate new position based on current delta
            const descendantCenterX = nodeCenterX + delta.deltaX
            const descendantCenterY = nodeCenterY + delta.deltaY

            // Update descendant position (convert from center to top-left)
            descendant.x = descendantCenterX - descendant.width / 2
            descendant.y = descendantCenterY - descendant.height / 2
          }
        })

        // Check if dragged node is over another node (for reparenting)
        // Pass mouse position if available for more subtle reparenting detection
        if (dragMousePosition.value) {
          detectPotentialParent(node, dragMousePosition.value.x, dragMousePosition.value.y)
        } else {
          detectPotentialParent(node)
        }
      }
    })

    // Sync to VueFlow to update descendant positions on canvas
    syncToVueFlow()

    // Force reactivity update for bounding boxes
    triggerRef(nodes)
  }



function onNodeDragStop(event: NodeDragEvent) {
  const startTime = performance.now()

  // Check if we should reparent
  const firstNode = event.nodes[0]
  if (potentialParent.value && event.nodes.length === 1 && firstNode) {
    const draggedNodeId = firstNode.id
    const newParentId = potentialParent.value

    // Clear potential parent
    potentialParent.value = null

    // Reparent the node (this sets new positions)
    reparentNode(draggedNodeId, newParentId)

    // Clear drag start positions
    dragStartPositions.value.clear()

    // LOD-AWARE: Resolve overlaps using visible nodes but calculate bounding boxes with all nodes
    const visibleNodes = getVisibleNodesForLOD()
    resolveOverlapsForAffectedRootsLOD([draggedNodeId, newParentId], visibleNodes, nodes.value)

    // Update VueFlow with resolved positions
    syncToVueFlow()
  } else {
    // Normal drag without reparenting

    // Clear potential parent
    potentialParent.value = null

    // Sync final positions (only updates dragged nodes)
    console.log(`📍 Drag stopped - syncing ${event.nodes.length} dragged nodes`)
    syncFromVueFlow()

    // Get IDs of all dragged nodes
    const draggedNodeIds = event.nodes.map(n => n.id)

    // Log dragged node and descendants positions BEFORE layout recalculation
    if (nodeCrossedSides.value) {
      console.log(`📍 Positions BEFORE layout recalculation (after side crossing):`)
      const draggedNode = nodes.value.find(n => n.id === draggedNodeIds[0])
      if (draggedNode) {
        console.log(`  Dragged node ${draggedNode.id}: (${draggedNode.x.toFixed(0)}, ${draggedNode.y.toFixed(0)})`)
        const descendants = getAllDescendants(draggedNode.id, nodes.value)
        descendants.forEach(d => {
          console.log(`    Descendant ${d.id}: (${d.x.toFixed(0)}, ${d.y.toFixed(0)})`)
        })
      }
    }

    // Clear drag start positions
    dragStartPositions.value.clear()

    // OPTIMIZED: Bottom-up AABB - only process ancestor chain + siblings
    // No side filtering needed - bottom-up is already O(d×s) complexity
    // This also fixes edge case with 360° orientations where nodes at 1° and 179° could overlap
    console.log(`🔄 Recalculating layout (bottom-up AABB)...`)
    const lodTime = performance.now()
    const visibleNodes = getVisibleNodesForLOD()
    console.log(`  ⏱️ LOD filtering: ${(performance.now() - lodTime).toFixed(2)}ms`)

    const resolveTime = performance.now()
    resolveOverlapsForAffectedRootsLOD(draggedNodeIds, visibleNodes, nodes.value)
    console.log(`  ⏱️ Bottom-up overlap resolution: ${(performance.now() - resolveTime).toFixed(2)}ms`)

    // Log positions AFTER layout recalculation
    if (nodeCrossedSides.value) {
      console.log(`📍 Positions AFTER layout recalculation:`)
      const draggedNode = nodes.value.find(n => n.id === draggedNodeIds[0])
      if (draggedNode) {
        console.log(`  Dragged node ${draggedNode.id}: (${draggedNode.x.toFixed(0)}, ${draggedNode.y.toFixed(0)})`)
        const descendants = getAllDescendants(draggedNode.id, nodes.value)
        descendants.forEach(d => {
          console.log(`    Descendant ${d.id}: (${d.x.toFixed(0)}, ${d.y.toFixed(0)})`)
        })
      }
    }

    // Update edges to connect to closest handles based on final positions
    // This handles the case where node was dragged around its parent
    const draggedNode = nodes.value.find(n => n.id === draggedNodeIds[0])
    if (draggedNode) {
      updateEdgesForBranch(draggedNode)
    }

    // Update VueFlow with resolved positions
    syncToVueFlow()

    // Force VueFlow to re-render all affected nodes (fixes visible-only rendering issue)
    // When nodes are dragged off-screen and back, descendants may not render correctly
    const allAffectedIds = [...draggedNodeIds]
    draggedNodeIds.forEach(id => {
      getAllDescendants(id, nodes.value).forEach(d => allAffectedIds.push(d.id))
    })
    updateNodeInternals(allAffectedIds)

    const endTime = performance.now()
    console.log(`  ✓ Drag complete in ${(endTime - startTime).toFixed(2)}ms`)
  }
}



  // ============================================================
  // RETURN
  // ============================================================

  return {
    dragStartPositions,
    nodeCrossedSides,
    dragStartSides,
    descendantDeltas,
    potentialParent,
    dragMousePosition,
    mirrorDescendantsAcrossNode,
    detectPotentialParent,
    onPaneMouseMove,
    onNodeDragStart,
    onNodeDrag,
    onNodeDragStop
  }
}

