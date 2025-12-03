import { ref, nextTick, triggerRef, type Ref } from 'vue'
import type { Node, Edge } from '@vue-flow/core'
import type { NodeData } from '../types'
import { getAllDescendants } from '../layout'

export function useVueFlowSync(
  nodes: Ref<NodeData[]>,
  edges: Ref<Edge[]>,
  viewport: Ref<{ zoom: number; x: number; y: number }>,
  // Dependencies from other composables
  lodEnabled: Ref<boolean>,
  potentialParent: Ref<string | null>,
  getVisibleNodesForLOD: () => NodeData[],
  calculateHiddenChildrenBounds: (hiddenChildren: NodeData[]) => { x: number, y: number, width: number, height: number },
  getDirectChildren: (nodeId: string) => NodeData[],
  getChildrenSide: (nodeId: string) => 'left' | 'right' | null,
  getNodeDepth: (nodeId: string) => number,
  currentLodLevel: Ref<number>
) {

  // VueFlow nodes (synced from our data model)
  const vueFlowNodes = ref<Node[]>([])

  // ============================================================
  // DOM MEASUREMENT FUNCTIONS
  // ============================================================
  
  function measureNodeDimensions(nodeId: string): { width: number; height: number } | null {
  const vueFlowNode = document.querySelector(`[data-id="${nodeId}"]`)
  if (vueFlowNode) {
    const customNode = vueFlowNode.querySelector('.custom-node')
    if (customNode) {
      const rect = customNode.getBoundingClientRect()
      // Account for zoom level - getBoundingClientRect returns scaled dimensions
      const actualWidth = rect.width / viewport.value.zoom
      const actualHeight = rect.height / viewport.value.zoom
      return { width: actualWidth, height: actualHeight }
    }
  }
  return null
}



  async function updateNodeDimensionsFromDOM() {
  // Wait for DOM to update
  await nextTick()

  let updated = false
  let updateCount = 0
  for (const node of nodes.value) {
    const dimensions = measureNodeDimensions(node.id)
    if (dimensions) {
      // Only update if dimensions changed significantly (more than 1px difference)
      if (Math.abs(node.width - dimensions.width) > 1 || Math.abs(node.height - dimensions.height) > 1) {
        console.log(`📏 Updated dimensions for ${node.id}: ${node.width.toFixed(0)}x${node.height.toFixed(0)} → ${dimensions.width.toFixed(0)}x${dimensions.height.toFixed(0)}`)
        node.width = dimensions.width
        node.height = dimensions.height
        updated = true
        updateCount++
      }
    }
  }

  if (updateCount > 0) {
    console.log(`📏 Updated dimensions for ${updateCount} nodes`)
  }

  return updated
}



  // ============================================================
  // SYNC FUNCTIONS
  // ============================================================
  
  function syncToVueFlow() {
  // console.log('syncToVueFlow: nodes.value.length =', nodes.value.length)

  // Step 1: Apply LOD filtering (zoom-based visibility)
  const lodFilteredNodes = getVisibleNodesForLOD()

  // Step 2: Filter by collapse state (only show nodes not in collapsed branches)
  const visibleNodes = lodFilteredNodes.filter(node => {
    if (!node.parentId) return true // Root nodes always visible

    // Check if any ancestor is collapsed
    let current = node
    while (current.parentId) {
      const parent = nodes.value.find(n => n.id === current.parentId)
      if (!parent) break

      // For root nodes, check collapsedLeft/collapsedRight based on current node's side
      if (!parent.parentId) {
        const root = parent
        const isOnLeft = current.x < root.x
        if (isOnLeft && root.collapsedLeft) return false
        if (!isOnLeft && root.collapsedRight) return false
      } else {
        // For child nodes, check collapsed
        if (parent.collapsed) return false
      }

      current = parent
    }

    return true
  })

  // Map visible nodes to VueFlow nodes
  const regularNodes = visibleNodes.map(node => {
    const childCount = getDirectChildren(node.id).length
    const childrenSide = getChildrenSide(node.id)

    // For root nodes, calculate separate left/right counts
    let childCountLeft = 0
    let childCountRight = 0
    if (!node.parentId) {
      const children = getDirectChildren(node.id)
      childCountLeft = children.filter(c => c.x < node.x).length
      childCountRight = children.filter(c => c.x >= node.x).length
    }

    return {
      id: node.id,
      type: 'custom',
      position: { x: node.x, y: node.y },
      data: {
        label: node.label,
        parentId: node.parentId,
        childCount,
        childCountLeft,
        childCountRight,
        collapsed: node.collapsed,
        collapsedLeft: node.collapsedLeft,
        collapsedRight: node.collapsedRight,
        childrenSide,
        isPotentialParent: potentialParent.value === node.id
      }
    }
  })

  // Create LOD badge nodes for nodes with LOD-hidden children
  // NOTE: Do NOT create badges for manually collapsed children
  const lodBadgeNodes: Node[] = []
  if (lodEnabled.value) {
    for (const node of visibleNodes) {
      // Skip if this node is manually collapsed
      // (manually collapsed nodes should not show LOD badges)
      if (node.collapsed || node.collapsedLeft || node.collapsedRight) {
        continue
      }

      // Get all direct children
      const allChildren = getDirectChildren(node.id)
      // Get hidden children (not in visible nodes)
      const visibleNodeIds = new Set(visibleNodes.map(n => n.id))
      const hiddenChildren = allChildren.filter(c => !visibleNodeIds.has(c.id))

      if (hiddenChildren.length > 0) {
        // Special handling for ROOT nodes: create separate badges for left and right sides
        if (node.parentId === null) {
          // Separate hidden children by side
          const leftHiddenChildren = hiddenChildren.filter(c => c.x < node.x)
          const rightHiddenChildren = hiddenChildren.filter(c => c.x >= node.x)

          // Create LEFT badge if there are hidden left children
          if (leftHiddenChildren.length > 0) {
            let leftHiddenCount = 0
            for (const hiddenChild of leftHiddenChildren) {
              leftHiddenCount += 1
              leftHiddenCount += getAllDescendants(hiddenChild.id, nodes.value).length
            }

            const leftBounds = calculateHiddenChildrenBounds(leftHiddenChildren)
            lodBadgeNodes.push({
              id: `lod-badge-${node.id}-left`,
              type: 'lod-badge',
              position: { x: leftBounds.x, y: leftBounds.y },
              data: {
                count: leftHiddenCount,
                width: leftBounds.width,
                height: leftBounds.height
              },
              draggable: false,
              selectable: false
            })
          }

          // Create RIGHT badge if there are hidden right children
          if (rightHiddenChildren.length > 0) {
            let rightHiddenCount = 0
            for (const hiddenChild of rightHiddenChildren) {
              rightHiddenCount += 1
              rightHiddenCount += getAllDescendants(hiddenChild.id, nodes.value).length
            }

            const rightBounds = calculateHiddenChildrenBounds(rightHiddenChildren)
            lodBadgeNodes.push({
              id: `lod-badge-${node.id}-right`,
              type: 'lod-badge',
              position: { x: rightBounds.x, y: rightBounds.y },
              data: {
                count: rightHiddenCount,
                width: rightBounds.width,
                height: rightBounds.height
              },
              draggable: false,
              selectable: false
            })
          }
        } else {
          // Non-root nodes: create single badge for all hidden children
          let totalHiddenCount = 0
          for (const hiddenChild of hiddenChildren) {
            totalHiddenCount += 1 // Count the hidden child itself
            totalHiddenCount += getAllDescendants(hiddenChild.id, nodes.value).length // Count all its descendants
          }

          // Calculate bounding box of hidden children
          const hiddenChildrenBounds = calculateHiddenChildrenBounds(hiddenChildren)

          // Create LOD badge node
          lodBadgeNodes.push({
            id: `lod-badge-${node.id}`,
            type: 'lod-badge',
            position: {
              x: hiddenChildrenBounds.x,
              y: hiddenChildrenBounds.y
            },
            data: {
              count: totalHiddenCount,
              width: hiddenChildrenBounds.width,
              height: hiddenChildrenBounds.height
            },
            draggable: false,
            selectable: false
          })
        }
      }
    }
  }

  vueFlowNodes.value = [...regularNodes, ...lodBadgeNodes]

  // console.log('syncToVueFlow: vueFlowNodes.value.length =', vueFlowNodes.value.length)
}



  function syncFromVueFlow() {
  console.log('syncFromVueFlow: vueFlowNodes.value.length =', vueFlowNodes.value.length)
  vueFlowNodes.value.forEach(vfNode => {
    const node = nodes.value.find(n => n.id === vfNode.id)
    if (node) {
      node.x = vfNode.position.x
      node.y = vfNode.position.y
    }
  })
  // Force reactivity update
  triggerRef(nodes)
  console.log('syncFromVueFlow: nodes.value.length =', nodes.value.length)
}



  // ============================================================
  // RETURN
  // ============================================================
  
  return {
    vueFlowNodes,
    measureNodeDimensions,
    updateNodeDimensionsFromDOM,
    syncToVueFlow,
    syncFromVueFlow
  }
}

