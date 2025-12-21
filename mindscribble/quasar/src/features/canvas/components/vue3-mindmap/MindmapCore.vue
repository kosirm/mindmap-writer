<template>
  <div class="vue3-mindmap-container">
    <svg ref="svgEle" class="vue3-mindmap-svg"></svg>

    <div v-if="zoom" class="button-list right-bottom">
      <button @click="centerView()"><i class="gps"></i></button>
      <button @click="fitView()"><i class="fit"></i></button>
    </div>

    <MindmapContextMenu
      v-model="showContextMenu"
      :position="contextMenuPosition"
      :node-id="contextMenuNodeId"
      @node-action="handleNodeAction"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch, onUnmounted, computed } from 'vue'
import type { PropType } from 'vue'
import type { Data } from './types/mindmap-types'
import * as d3 from 'd3'
import { Dark } from 'quasar'
import MindmapContextMenu from './MindmapContextMenu.vue'
import { useDocumentStore } from 'src/core/stores/documentStore'

export default defineComponent({
  name: 'MindmapCore',
  components: {
    MindmapContextMenu
  },
  props: {
    modelValue: {
      type: Array as PropType<Data[]>,
      required: true
    },
    branch: {
      type: Number,
      default: 2
    },
    xGap: {
      type: Number,
      default: 84  // Original vue3-mindmap default
    },
    yGap: {
      type: Number,
      default: 18  // Original vue3-mindmap default
    },
    zoom: {
      type: Boolean,
      default: true
    }
  },
  emits: ['node-select'],
  setup(props, { emit }) {
    const svgEle = ref<SVGSVGElement | null>(null)
    const documentStore = useDocumentStore()

    // Context menu state
    const showContextMenu = ref(false)
    const contextMenuPosition = ref({ x: 0, y: 0 })
    const contextMenuNodeId = ref<string | null>(null)

    // D3 state
    let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null
    let svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null
    let g: d3.Selection<SVGGElement, unknown, null, undefined> | null = null

    // Drag state - store offsets separately to avoid triggering watch
    const dragOffsets = new Map<string, { px: number, py: number }>()

    // Convert document store nodes to D3 hierarchical data format
    const convertToD3Data = (): Data[] => {
      const rootNodes = documentStore.nodes.filter(node => node.data.parentId === null)

      const convertNode = (nodeId: string, depth: number = 0, parentLeft?: boolean): Data => {
        const node = documentStore.getNodeById(nodeId)
        if (!node) return { name: 'Unknown' }

        const children = documentStore.getChildNodes(nodeId)
          .sort((a, b) => a.data.order - b.data.order)
          .map(child => convertNode(child.id, depth + 1, depth === 1 ? (node.data.side === 'left') : parentLeft))

        const result: Data = {
          name: node.data.title,
          id: node.id
        }

        // Only set 'left' for depth 1 nodes (immediate children of root)
        // Descendants will inherit from their parent during layout
        if (depth === 1) {
          result.left = node.data.side === 'left'
        } else if (depth > 1 && parentLeft !== undefined) {
          result.left = parentLeft
        }

        if (children.length > 0) {
          result.children = children
        }

        return result
      }

      return rootNodes.map(rootNode => convertNode(rootNode.id))
    }

    // Computed property for D3 data
    const d3Data = computed(() => {
      return convertToD3Data()
    })

    // Theme colors based on dark/light mode
    const getThemeColors = () => {
      return {
        background: Dark.isActive ? '#1e1e1e' : '#fff',
        nodeFill: Dark.isActive ? '#2a2a2a' : '#fff',
        nodeStroke: Dark.isActive ? '#555' : '#666',
        textColor: Dark.isActive ? '#e0e0e0' : '#333',
        linkStroke: Dark.isActive ? '#666' : '#999'
      }
    }

    const centerView = () => {
      if (!svg || !svgEle.value || !zoomBehavior) return

      const svgNode = svgEle.value
      const centerX = svgNode?.clientWidth ? svgNode.clientWidth / 2 : 400
      const centerY = svgNode?.clientHeight ? svgNode.clientHeight / 2 : 300

      const centerTransform = d3.zoomIdentity.translate(centerX, centerY)
      svg.transition().duration(750).call(zoomBehavior.transform.bind(zoomBehavior), centerTransform)
    }

    const fitView = () => {
      console.log('Fit view')
    }

    const handleNodeSelect = (nodeId: string) => {
      emit('node-select', nodeId)
      documentStore.selectNode(nodeId, 'mindmap')
    }



    /**
     * Handle node reparenting - make draggedNode a child of targetNode
     */
    const handleNodeDrop = (draggedNode: d3.HierarchyPointNode<Data>, targetNode: d3.HierarchyPointNode<Data>) => {
      // Don't allow dropping on self
      if (draggedNode.data.id === targetNode.data.id) return false

      // Check if target would be a descendant of dragged node
      let current = targetNode
      while (current.parent) {
        if (current.parent.data.id === draggedNode.data.id) {
          return false // Can't make a node its own descendant
        }
        current = current.parent
      }

      // Reparent: make draggedNode a child of targetNode
      const newParentId = targetNode.data.id || null
      if (draggedNode.data.id && newParentId) {
        documentStore.moveNode(draggedNode.data.id, newParentId)
      }

      return true
    }

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault()

      // Get the target element and find the closest node
      const target = event.target as HTMLElement
      const nodeElement = target.closest('.node')

      if (nodeElement) {
        // Extract node ID from the node element's data-id attribute
        const nodeId = nodeElement.getAttribute('data-id')

        // Show context menu at mouse position
        showContextMenu.value = true
        contextMenuPosition.value = { x: event.clientX, y: event.clientY }
        contextMenuNodeId.value = nodeId || null
      }
    }

    const handleNodeAction = (action: { action: string, nodeId: string }) => {
      console.log('Node action:', action)
      // Handle node actions from context menu
      switch (action.action) {
        case 'add-child':
        case 'add-sibling':
        case 'add-parent':
          // Node was added, we might want to select it
          handleNodeSelect(action.nodeId)
          break
        case 'delete':
          // Node was deleted, clear selection if it was selected
          break
      }
    }

    function createMindmap() {
      if (!svgEle.value) return

      // Initialize D3 with proper sizing
      svg = d3.select(svgEle.value)
        .attr('width', '100%')
        .attr('height', '100%')
        .style('background-color', getThemeColors().background)
        .on('contextmenu', (event: MouseEvent) => {
          // Prevent default browser context menu
          event.preventDefault()

          // Get the target element and find the closest node
          const target = event.target as HTMLElement
          const nodeElement = target.closest('.node')

          if (nodeElement) {
            // Extract node ID from the node element's data-id attribute
            const nodeId = nodeElement.getAttribute('data-id')

            // Show context menu at mouse position
            showContextMenu.value = true
            contextMenuPosition.value = { x: event.clientX, y: event.clientY }
            contextMenuNodeId.value = nodeId || null
          }
        })

      // Create main group for zooming/panning
      g = svg.append('g')
        .attr('class', 'mindmap-main-group')

      // Set up zoom behavior
      zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
          if (g) {
            g.attr('transform', event.transform)
          }
        })

      if (zoomBehavior && svg) {
        svg.call(zoomBehavior)
      }

      // Draw the mindmap
      drawMindmap()
    }

    function drawMindmap() {
      if (!g || !svgEle.value) return

      // Get theme colors for this draw cycle
      const colors = getThemeColors()

      // Clear previous content
      g.selectAll('*').remove()

      // Create hierarchy from computed D3 data - handle empty data case
      const data = d3Data.value
      const rootData = data.length > 0 ? data[0] : { name: 'New Mindmap', children: [] }

      const root = d3.hierarchy(rootData)

      // Separate left and right children data
      const leftChildrenData: Data[] = []
      const rightChildrenData: Data[] = []

      if (rootData?.children) {
        rootData.children.forEach(child => {
          if (child.left) {
            leftChildrenData.push(child)
          } else {
            rightChildrenData.push(child)
          }
        })
      }

      // Create tree layout
      const treeLayout = d3.tree<Data>()
        .nodeSize([props.xGap, props.yGap])
        .separation((a, b) => (a.parent === b.parent ? 1 : 2))

      // Layout left and right trees separately
      const leftRootData = { ...rootData, children: leftChildrenData }
      const rightRootData = { ...rootData, children: rightChildrenData }

      const leftRoot = d3.hierarchy(leftRootData)
      const rightRoot = d3.hierarchy(rightRootData)

      const leftTree = treeLayout(leftRoot as d3.HierarchyNode<Data>)
      const rightTree = treeLayout(rightRoot as d3.HierarchyNode<Data>)

      // Calculate offsets for coordinate transformation
      const diffY = rightTree.x - leftTree.x
      const rootWidth = leftTree.y  // Root node's Y position (will become X after swap)

      // Create a map to store transformed coordinates by node ID
      const coordMap = new Map<string, { x: number, y: number }>()

      // Transform coordinates for all nodes
      const transformCoords = (node: d3.HierarchyPointNode<Data>) => {
        // Swap x and y (tree is vertical, we want horizontal)
        let newX = node.y
        let newY = node.x

        // Mirror left side
        if (node.data.left && node.depth > 0) {
          newX = -newX + rootWidth
          newY += diffY
        }

        if (node.data.id) {
          coordMap.set(node.data.id, { x: newX, y: newY })
        }
      }

      // Apply transformation to all nodes in both trees
      leftTree.descendants().forEach(transformCoords)
      rightTree.descendants().forEach(transformCoords)

      // Now layout the full tree and apply the transformed coordinates
      const treeData = treeLayout(root as d3.HierarchyNode<Data>)

      // Apply transformed coordinates to all nodes
      treeData.descendants().forEach(node => {
        if (node.data.id && coordMap.has(node.data.id)) {
          const coords = coordMap.get(node.data.id)!
          node.x = coords.y  // Note: D3 uses x for vertical, y for horizontal
          node.y = coords.x
        } else if (node.depth === 0) {
          // Root node: swap x and y
          const temp = node.x
          node.x = node.y
          node.y = temp
        }
      })

      // Draw links
      g.selectAll('.link')
        .data(treeData.links())
        .enter()
        .append('path')
        .attr('class', 'link')
        .attr('d', d3.linkHorizontal<d3.HierarchyPointLink<Data>, d3.HierarchyPointNode<Data>>()
          .x((d: d3.HierarchyPointNode<Data>) => d.y)
          .y((d: d3.HierarchyPointNode<Data>) => d.x))
        .attr('fill', 'none')
        .attr('stroke', colors.linkStroke)
        .attr('stroke-width', props.branch)

      // Draw nodes
      const node = g.selectAll('.node')
        .data(treeData.descendants())
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.y},${d.x})`)
        .attr('data-id', d => d.data.id || '')

      // Create a group for text content (this is what we'll make draggable)
      const gText = node.append('g')
        .attr('class', 'text-group')

      // Add text rectangles (background for text) - centered
      gText.append('rect')
        .attr('x', -50)  // Center the rectangle
        .attr('y', -15)
        .attr('width', 100)
        .attr('height', 30)
        .attr('rx', 4)
        .attr('ry', 4)
        .attr('fill', colors.nodeFill)
        .attr('stroke', colors.nodeStroke)
        .attr('stroke-width', 1)

      // Add node text with proper positioning - centered
      gText.append('text')
        .attr('dy', 5)
        .attr('x', 0)  // Center the text
        .style('text-anchor', 'middle')
        .text(d => d.data.name)
        .attr('font-size', '12px')
        .attr('fill', colors.textColor)
        .style('pointer-events', 'none')

      // Add node circles (for connection points) - centered at the edge
      node.append('circle')
        .attr('r', 5)
        .attr('fill', colors.nodeFill)
        .attr('stroke', colors.nodeStroke)
        .attr('stroke-width', 1)
        .attr('cx', d => d.data.left ? -50 : 50)  // Position connection point at edge based on side

      // Add click handler to text group for selection
      gText.on('click', (event, d) => {
        event.stopPropagation()
        if (d.data.id) {
          handleNodeSelect(d.data.id)
        }
      })

      // Apply drag behavior to text group (not root nodes)
      // Set container to the parent node group for proper coordinate system
      const getDragContainer = function(this: SVGGElement): SVGGElement {
        return this.parentNode?.parentNode as SVGGElement
      }

      gText
        .filter(d => d.depth > 0)  // Don't allow dragging root nodes
        .call(d3.drag<SVGGElement, d3.HierarchyPointNode<Data>>()
          .container(getDragContainer)
          .on('start', function(event: d3.D3DragEvent<SVGGElement, d3.HierarchyPointNode<Data>, d3.HierarchyPointNode<Data>>, d) {
            if (!d.data.id) return
            // Start drag operation
            const nodeGroup = this.parentNode as SVGGElement
            d3.select(nodeGroup).raise()
            // Initialize drag offset in separate Map (not in data to avoid triggering watch)
            dragOffsets.set(d.data.id, { px: 0, py: 0 })
          })
          .on('drag', function(event: d3.D3DragEvent<SVGGElement, d3.HierarchyPointNode<Data>, d3.HierarchyPointNode<Data>>, d) {
            if (!d.data.id || !g) return

            // Calculate offset like original: event.x/y are absolute positions in drag coordinate system
            const px = event.x - d.x
            const py = event.y - d.y

            // Store in separate Map to avoid triggering watch
            dragOffsets.set(d.data.id, { px, py })

            const nodeGroup = this.parentNode as SVGGElement

            // Move the node - use y for horizontal (x-axis) and x for vertical (y-axis)
            d3.select(nodeGroup)
              .attr('transform', `translate(${d.y + px},${d.x + py})`)

            // Get all descendants of this node
            const descendants = d.descendants()

            // Move all descendant nodes
            descendants.forEach(descendant => {
              if (descendant === d || !descendant.data.id) return

              // Store offset for descendant
              dragOffsets.set(descendant.data.id, { px, py })

              // Find and move the descendant node
              g?.selectAll('.node')
                .filter(function(datum: unknown) {
                  const node = datum as d3.HierarchyPointNode<Data>
                  return node.data.id === descendant.data.id
                })
                .attr('transform', `translate(${descendant.y + px},${descendant.x + py})`)
            })

            // Update all edges connected to this node and its descendants
            const affectedNodeIds = new Set([d.data.id, ...descendants.map(desc => desc.data.id)])

            g.selectAll<SVGPathElement, d3.HierarchyPointLink<Data>>('.link')
              .filter(link => affectedNodeIds.has(link.target.data.id))
              .attr('d', d3.linkHorizontal<d3.HierarchyPointLink<Data>, d3.HierarchyPointNode<Data>>()
                .x((node: d3.HierarchyPointNode<Data>) => {
                  if (affectedNodeIds.has(node.data.id)) {
                    return node.y + px
                  }
                  return node.y
                })
                .y((node: d3.HierarchyPointNode<Data>) => {
                  if (affectedNodeIds.has(node.data.id)) {
                    return node.x + py
                  }
                  return node.x
                }))

            // Highlight potential drop targets
            const mousePos = d3.pointer(event, g)
            const potentialTarget = treeData.descendants().find(other => {
              if (other === d || other === d.parent || other.data.id?.startsWith(d.data.id || '')) {
                return false
              }
              const targetDx = mousePos[0] - other.y
              const targetDy = mousePos[1] - other.x
              const distance = Math.sqrt(targetDx * targetDx + targetDy * targetDy)
              return distance < 60  // Within 60px radius
            })

            // Remove previous outline
            g.selectAll('.node').classed('outline', false)

            // Add outline to potential target
            if (potentialTarget) {
              const targetId = potentialTarget.data.id
              g.selectAll('.node')
                .filter(function(datum: unknown) {
                  const node = datum as d3.HierarchyPointNode<Data>
                  return node.data.id === targetId
                })
                .classed('outline', true)
            }
          })
          .on('end', function(event: d3.D3DragEvent<SVGGElement, d3.HierarchyPointNode<Data>, d3.HierarchyPointNode<Data>>, d) {
            if (!d.data.id || !g) return

            const nodeGroup = this.parentNode as SVGGElement

            // Remove outline
            g.selectAll('.node').classed('outline', false)

            // Get drag offsets from Map
            const offsets = dragOffsets.get(d.data.id)
            const px = offsets?.px ?? 0
            const py = offsets?.py ?? 0

            // Clean up drag offsets for this node and all descendants
            const descendants = d.descendants()
            dragOffsets.delete(d.data.id)
            descendants.forEach(desc => {
              if (desc.data.id) {
                dragOffsets.delete(desc.data.id)
              }
            })

            // Get mouse position relative to g element
            const mousePos = d3.pointer(event, g)

            // Check if node crossed to the other side (for depth 1 nodes only)
            const rootNode = treeData
            const rootCenterY = rootNode.y  // Root's Y position (horizontal axis)
            const nodeCenterY = d.y + px  // Node's final Y position after drag
            const crossedSide = d.depth === 1 && ((d.y < rootCenterY && nodeCenterY > rootCenterY) || (d.y > rootCenterY && nodeCenterY < rootCenterY))

            // Find node at drop position for reparenting
            const target = treeData.descendants().find(other => {
              if (other === d || other === d.parent || other.data.id?.startsWith(d.data.id || '')) {
                return false
              }
              const targetDx = mousePos[0] - other.y
              const targetDy = mousePos[1] - other.x
              const distance = Math.sqrt(targetDx * targetDx + targetDy * targetDy)
              return distance < 60  // Within 60px radius
            })

            if (target && target.data.id !== d.data.id) {
              // Handle node drop (reparenting)
              console.log('Reparenting:', d.data.id, 'to', target.data.id)
              handleNodeDrop(d, target)
              // Redraw will happen via store watch
              return
            } else if (crossedSide && d.data.id) {
              // Handle side change for root children
              const newSide = nodeCenterY < rootCenterY ? 'left' : 'right'
              console.log('Side change:', d.data.id, 'to', newSide)
              documentStore.setNodeSide(d.data.id, newSide, 'vue3-mindmap')
              // Redraw will happen via store watch
              return
            } else if (d.parent && Math.abs(py) > 10) {
              console.log('Checking reordering, py:', py)
              // Check for reordering among siblings
              const siblings = d.parent.children || []
              const endX = d.x + py  // Final X position (vertical axis)

              // Find sibling to swap with
              let targetSibling: d3.HierarchyPointNode<Data> | null = null
              for (const sibling of siblings) {
                if (sibling === d) continue

                // Check if we dragged past this sibling
                if (py > 0 && sibling.x > d.x && sibling.x < endX) {
                  // Dragged down, find the lowest sibling we passed
                  if (!targetSibling || sibling.x > targetSibling.x) {
                    targetSibling = sibling
                  }
                } else if (py < 0 && sibling.x < d.x && sibling.x > endX) {
                  // Dragged up, find the highest sibling we passed
                  if (!targetSibling || sibling.x < targetSibling.x) {
                    targetSibling = sibling
                  }
                }
              }

              if (targetSibling && targetSibling.data.id && d.data.id) {
                // Reorder siblings
                const draggedIndex = siblings.findIndex(s => s.data.id === d.data.id)
                const targetIndex = siblings.findIndex(s => s.data.id === targetSibling.data.id)

                console.log('Reordering:', {
                  draggedId: d.data.id,
                  targetSiblingId: targetSibling.data.id,
                  draggedIndex,
                  targetIndex,
                  siblings: siblings.map(s => ({ id: s.data.id, x: s.x }))
                })

                if (draggedIndex !== -1 && targetIndex !== -1) {
                  const newOrders = new Map<string, number>()

                  // Calculate new orders
                  siblings.forEach((sibling, index) => {
                    if (!sibling.data.id) return

                    if (sibling.data.id === d.data.id) {
                      newOrders.set(sibling.data.id, targetIndex)
                    } else if (draggedIndex < targetIndex) {
                      // Dragged down
                      if (index > draggedIndex && index <= targetIndex) {
                        newOrders.set(sibling.data.id, index - 1)
                      }
                    } else {
                      // Dragged up
                      if (index >= targetIndex && index < draggedIndex) {
                        newOrders.set(sibling.data.id, index + 1)
                      }
                    }
                  })

                  console.log('New orders:', Array.from(newOrders.entries()))
                  const parentId = d.parent?.data.id || null
                  documentStore.reorderSiblings(parentId, newOrders)
                  // Redraw will happen via store watch
                  return
                }
              } else {
                console.log('No target sibling found')
              }
            } else {
              console.log('No reordering needed, dy too small or no parent')
            }

            // No valid operation, snap back to original position
            d3.select(nodeGroup)
              .transition()
              .duration(200)
              .attr('transform', `translate(${d.y},${d.x})`)

            // Redraw to restore edge
            drawMindmap()
          })
        )
    }

    function initializeCenterView() {
      // Center the view on initial load only
      if (!g || !svgEle.value) return

      const svgNode = svgEle.value
      const centerX = svgNode?.clientWidth ? svgNode.clientWidth / 2 : 400
      const centerY = svgNode?.clientHeight ? svgNode.clientHeight / 2 : 300

      // Set initial transform
      const initialTransform = d3.zoomIdentity.translate(centerX, centerY)

      // Apply to both the group and the zoom behavior
      if (svg && zoomBehavior) {
        svg.call(zoomBehavior.transform.bind(zoomBehavior), initialTransform)
      }
    }

    onMounted(() => {
      createMindmap()
      // Center view after initial render
      initializeCenterView()
    })

    onUnmounted(() => {
      if (zoomBehavior && svg) {
        svg.on('.zoom', null)
      }
    })

    // Watch for dark mode changes and redraw with new theme
    watch(() => Dark.isActive, () => {
      if (svg) {
        svg.style('background-color', getThemeColors().background)
      }
      drawMindmap()
    })

    // Watch for document store node changes
    watch(() => documentStore.nodes, () => {
      drawMindmap()
    }, { deep: true })

    return {
      svgEle,
      centerView,
      fitView,
      showContextMenu,
      contextMenuPosition,
      contextMenuNodeId,
      handleContextMenu,
      handleNodeAction
    }
  }
})
</script>

<style scoped lang="scss">
.vue3-mindmap-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.vue3-mindmap-svg {
  width: 100%;
  height: 100%;
}

// Button styles
.button-list {
  position: absolute;
  display: flex;
  gap: 8px;
  z-index: 10;
}

.right-bottom {
  right: 16px;
  bottom: 16px;
}

button {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  background-color: #333;
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

button:hover {
  background-color: #444;
}

// Button icons
.gps {
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>');
  width: 16px;
  height: 16px;
}

.fit {
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M3 3h18v2H3V3zm2 4h14v2H5V7zm0 4h14v2H5v-2zm0 4h14v2H5v-2zm0 4h14v2H5v-2z"/></svg>');
  width: 16px;
  height: 16px;
}

// Drag and drop styles
:deep(.node.outline) {
  .text-group rect {
    stroke: #4CAF50 !important;
    stroke-width: 3px !important;
    filter: drop-shadow(0 0 8px rgba(76, 175, 80, 0.6));
  }
}

:deep(.text-group) {
  cursor: move;
}

:deep(.node) {
  &.outline {
    opacity: 0.8;
  }
}
</style>
