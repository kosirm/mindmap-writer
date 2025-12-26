<template>
  <div class="mindmap-container" :class="{ selecting: isDraggingSelection }">
    <svg ref="svgEle" class="mindmap-svg"></svg>

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
import { defineComponent, ref, onMounted, watch, onUnmounted, onBeforeUnmount, computed, nextTick } from 'vue'
import type { PropType } from 'vue'
import type { Data } from './types/mindmap-types'
import * as d3 from 'd3'
import { Dark } from 'quasar'
import MindmapContextMenu from './MindmapContextMenu.vue'
import { useUnifiedDocumentStore } from 'src/core/stores/unifiedDocumentStore'
import { useDocumentStore } from 'src/core/stores/documentStore'
import { useStoreMode } from 'src/composables/useStoreMode'
import { useViewEvents } from 'src/core/events'

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
      default: 84  // Original mindmap default
    },
    yGap: {
      type: Number,
      default: 18  // Original mindmap default
    },
    groupSpacing: {
      type: Number,
      default: 100  // Default group spacing
    },
    zoom: {
      type: Boolean,
      default: true
    }
  },
  emits: ['node-select'],
  setup(props, { emit }) {
    const svgEle = ref<SVGSVGElement | null>(null)

    // Store mode toggle
    const { isUnifiedMode } = useStoreMode()
    const unifiedStore = useUnifiedDocumentStore()
    const documentStore = useDocumentStore()
    const { onStoreEvent } = useViewEvents('mindmap')

    // Helper to get the appropriate store based on mode
    const getStore = () => isUnifiedMode.value ? unifiedStore : documentStore

    // Context menu state
    const showContextMenu = ref(false)
    const contextMenuPosition = ref({ x: 0, y: 0 })
    const contextMenuNodeId = ref<string | null>(null)

    // Selection state
    const selectedNodeIds = ref<string[]>([])
    const isDraggingSelection = ref(false)
    const selectionRect = ref<{ x: number, y: number, width: number, height: number } | null>(null)
    const selectionStart = ref<{ x: number, y: number } | null>(null)

    // Pan state - prevent multiple concurrent pans
    let isPanning = false

    // D3 state
    let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null
    let svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null
    let g: d3.Selection<SVGGElement, unknown, null, undefined> | null = null
    let selectionRectElement: d3.Selection<SVGRectElement, unknown, null, undefined> | null = null

    // Drag state - store offsets separately to avoid triggering watch
    const dragOffsets = new Map<string, { px: number, py: number }>()

    // Computed property for D3 data - use modelValue prop
    const d3Data = computed(() => {
      console.log('[MindmapCore] d3Data computed, modelValue:', props.modelValue)
      return props.modelValue
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

    /**
     * Pan to a specific node with smooth animation
     * @param nodeId - The ID of the node to pan to
     * @param retryCount - Internal parameter for retry logic
     */
    const panToNode = (nodeId: string, retryCount = 0) => {
      if (retryCount === 0) {
        console.log('🎯 panToNode called for node:', nodeId)
      }

      // Prevent multiple concurrent pan operations
      if (isPanning) {
        if (retryCount === 0) {
          console.log('⚠️ Pan already in progress, skipping this request')
        }
        return
      }

      if (!svg || !svgEle.value || !zoomBehavior || !g) {
        if (retryCount === 0) {
          console.log('⚠️ Cannot pan: missing required elements', { svg: !!svg, svgEle: !!svgEle.value, zoomBehavior: !!zoomBehavior, g: !!g })
        }
        return
      }

      // Set panning flag
      isPanning = true

      // Check if SVG has valid dimensions
      const svgNode = svgEle.value
      if (!svgNode.clientWidth || !svgNode.clientHeight) {
        // If SVG doesn't have dimensions yet (e.g., panel not visible), retry up to 5 times
        if (retryCount < 5) {
          if (retryCount === 0) {
            console.log(`⚠️ SVG has no dimensions, retrying in 100ms (attempt ${retryCount + 1}/5)`)
          }
          setTimeout(() => {
            panToNode(nodeId, retryCount + 1)
          }, 100)
        } else {
          console.log('⚠️ Cannot pan: SVG has no dimensions after 5 retries (panel may not be visible)')
          // Clear panning flag on failure
          isPanning = false
        }
        return
      }

      // Find the node element
      const nodeElement = g.select<SVGGElement>(`.node[data-id="${nodeId}"]`)
      if (!nodeElement.node()) {
        console.log('⚠️ Node not found for panning:', nodeId)
        isPanning = false
        return
      }

      // Get the node's position in the g coordinate system
      const transform = nodeElement.attr('transform')
      const match = transform?.match(/translate\(([^,]+),([^)]+)\)/) || []
      if (match.length < 3) {
        console.log('⚠️ Could not parse node transform:', transform)
        isPanning = false
        return
      }

      const nodeX = parseFloat(match[1] || '0')
      const nodeY = parseFloat(match[2] || '0')
      console.log('📍 Node position in g coordinates:', { nodeX, nodeY })

      // Get current zoom transform
      const currentTransform = d3.zoomTransform(svgEle.value)
      const currentScale = currentTransform.k
      console.log('🔍 Current zoom transform:', { k: currentScale, x: currentTransform.x, y: currentTransform.y })

      // Calculate the position in SVG coordinates
      const nodeXSvg = nodeX * currentScale + currentTransform.x
      const nodeYSvg = nodeY * currentScale + currentTransform.y
      console.log('📍 Node position in SVG coordinates:', { nodeXSvg, nodeYSvg })

      // Get SVG dimensions
      const svgWidth = svgNode.clientWidth
      const svgHeight = svgNode.clientHeight
      console.log('📐 SVG viewport dimensions:', { svgWidth, svgHeight })

      // Calculate center of SVG viewport
      const svgCenterX = svgWidth / 2
      const svgCenterY = svgHeight / 2
      console.log('🎯 SVG viewport center:', { svgCenterX, svgCenterY })

      // Calculate target translation to center the node
      const targetX = svgCenterX - nodeXSvg
      const targetY = svgCenterY - nodeYSvg
      console.log('🎯 Target translation:', { targetX, targetY })

      // Create target transform
      const targetTransform = d3.zoomIdentity.translate(targetX, targetY).scale(currentScale)
      console.log('🎯 Target transform:', targetTransform)

      // Animate to the target transform
      svg.transition()
        .duration(750)
        .ease(d3.easeCubicOut)
        .call(zoomBehavior.transform.bind(zoomBehavior), targetTransform)
        .on('end', () => {
          console.log('🎬 Pan animation completed for node:', nodeId)
          // Verify final position
          if (svgEle.value) {
            const finalTransform = d3.zoomTransform(svgEle.value)
            console.log('🎯 Final transform after pan:', { k: finalTransform.k, x: finalTransform.x, y: finalTransform.y })
          } else {
            console.log('⚠️ SVG element not available when checking final transform')
          }
          // Clear panning flag
          isPanning = false
        })
        .on('interrupt', () => {
          // Also clear flag if animation is interrupted
          isPanning = false
        })
    }

    const fitView = () => {
      console.log('Fit view')
    }

    const handleNodeSelect = (nodeId: string, event: MouseEvent) => {
      const isCtrlClick = event.ctrlKey || event.metaKey
      const isShiftClick = event.shiftKey

      console.log('🎯 Node click:', nodeId, { ctrlKey: isCtrlClick, shiftKey: isShiftClick, metaKey: event.metaKey })

      if (isShiftClick) {
        // Start rectangle selection
        console.log('📋 Starting rectangle selection')
        startRectangleSelection(event)
        return
      }

      if (isCtrlClick) {
        // Multi-select: toggle selection
        console.log('⌨️ Ctrl+click - toggling selection for:', nodeId)
        console.log('📊 Current store selection:', [...getStore().selectedNodeIds])
        console.log('📊 Current local selection:', [...selectedNodeIds.value])

        if (getStore().selectedNodeIds.includes(nodeId)) {
          // Remove from selection
          console.log('➖ Removing from selection')
          getStore().removeFromSelection(nodeId, 'mindmap')
          // Update local state to match store
          selectedNodeIds.value = [...getStore().selectedNodeIds]
        } else {
          // Add to selection
          console.log('➕ Adding to selection')
          getStore().addToSelection(nodeId, 'mindmap')
          // Update local state to match store
          selectedNodeIds.value = [...getStore().selectedNodeIds]
        }

        console.log('📊 After update - store selection:', [...getStore().selectedNodeIds])
        console.log('📊 After update - local selection:', [...selectedNodeIds.value])

        // Update styles immediately
        console.log('🎨 About to update styles, selectedNodeIds:', [...selectedNodeIds.value])
        void nextTick(() => {
          updateSelectedNodeStyles()
        })
      } else {
        // Single select: clear previous selection and select this node
        console.log('🎯 Regular click - selecting:', nodeId, 'current selection:', [...selectedNodeIds.value])
        // Notify store first (it will update its state)
        emit('node-select', nodeId)
        getStore().selectNode(nodeId, 'mindmap')
        // Update local state to match store
        selectedNodeIds.value = [nodeId]
        // Update styles immediately
        console.log('🎨 About to update styles, selectedNodeIds:', [...selectedNodeIds.value])
        void nextTick(() => {
          updateSelectedNodeStyles()
        })
      }
    }

    const startRectangleSelection = (event: MouseEvent) => {
      console.log('🎯 startRectangleSelection called, svg:', !!svg, 'g:', !!g)
      if (!svg || !g) return

      // Prevent default text selection behavior
      event.preventDefault()
      event.stopPropagation()

      isDraggingSelection.value = true
      selectionStart.value = { x: event.clientX, y: event.clientY }

      console.log('📍 Selection start:', selectionStart.value, 'isDraggingSelection:', isDraggingSelection.value)

      // Add global class to prevent text selection in all panels
      document.body.classList.add('mindmap-selecting')

      // Create selection rectangle in SVG coordinate space (not in transformed g space)
      if (!selectionRectElement) {
        selectionRectElement = svg.append('rect')
          .attr('class', 'selection-rect')
          .attr('fill', 'rgba(66, 165, 245, 0.2)')
          .attr('stroke', 'rgba(66, 165, 245, 0.8)')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '5,5')
          .attr('pointer-events', 'none')
      }

      // Position the rectangle at the start point (in SVG coordinates)
      const svgRect = svgEle.value?.getBoundingClientRect()
      if (svgRect) {
        const startX = event.clientX - svgRect.left
        const startY = event.clientY - svgRect.top
        console.log('📍 Rectangle start (SVG coords):', startX, startY)
        selectionRectElement
          .attr('x', startX)
          .attr('y', startY)
          .attr('width', 0)
          .attr('height', 0)
      }
    }

    const updateRectangleSelection = (event: MouseEvent) => {
      if (!isDraggingSelection.value || !selectionStart.value || !svgEle.value || !selectionRectElement) return

      const svgRect = svgEle.value.getBoundingClientRect()
      const currentX = event.clientX - svgRect.left
      const currentY = event.clientY - svgRect.top
      const startX = selectionStart.value.x - svgRect.left
      const startY = selectionStart.value.y - svgRect.top

      // Calculate rectangle dimensions
      const x = Math.min(startX, currentX)
      const y = Math.min(startY, currentY)
      const width = Math.abs(currentX - startX)
      const height = Math.abs(currentY - startY)

      // Update rectangle
      selectionRectElement
        .attr('x', x)
        .attr('y', y)
        .attr('width', width)
        .attr('height', height)

      // Store current selection rect for later use (in SVG coordinates)
      selectionRect.value = { x, y, width, height }
    }

    const endRectangleSelection = () => {
      if (!isDraggingSelection.value || !selectionRect.value || !g) return

      isDraggingSelection.value = false

      // Remove global class to re-enable text selection
      document.body.classList.remove('mindmap-selecting')

      // Remove selection rectangle
      if (selectionRectElement) {
        selectionRectElement.remove()
        selectionRectElement = null
      }

      // Find nodes within the selection rectangle
      const selectedNodes: string[] = []
      const rect = selectionRect.value
      const currentG = g

      if (currentG && svg && svgEle.value) {
        // Get the current transform of the g element
        const gTransform = d3.zoomTransform(svgEle.value)
        console.log('🔍 Current zoom transform:', gTransform)
        console.log('📦 Selection rect (SVG coords):', rect)

        currentG.selectAll('.node').each(function(d: unknown) {
          const nodeData = d as { data: { id: string } }
          if (!nodeData.data.id) return

          // Get node position in g coordinate space
          const nodeElement = d3.select(this)
          const transform = nodeElement.attr('transform') || ''
          const match = transform.match(/translate\(([^,]+),([^)]+)\)/) || []
          const nodeX = match[1] ? parseFloat(match[1]) : 0
          const nodeY = match[2] ? parseFloat(match[2]) : 0

          // Transform node position to SVG coordinate space
          const nodeXSvg = nodeX * gTransform.k + gTransform.x
          const nodeYSvg = nodeY * gTransform.k + gTransform.y

          // Node dimensions (from the text rectangle) - also scaled by zoom
          const nodeWidth = 100 * gTransform.k
          const nodeHeight = 30 * gTransform.k

          // Calculate node bounding box (centered at node position) in SVG coordinates
          const nodeLeft = nodeXSvg - nodeWidth / 2
          const nodeTop = nodeYSvg - nodeHeight / 2
          const nodeRight = nodeXSvg + nodeWidth / 2
          const nodeBottom = nodeYSvg + nodeHeight / 2

          // Check if node intersects with selection rectangle
          const intersects = !(
            nodeRight < rect.x ||
            nodeLeft > rect.x + rect.width ||
            nodeBottom < rect.y ||
            nodeTop > rect.y + rect.height
          )

          if (intersects) {
            console.log('✅ Node intersects:', nodeData.data.id, { nodeXSvg, nodeYSvg, nodeLeft, nodeTop, nodeRight, nodeBottom })
            selectedNodes.push(nodeData.data.id)
          }
        })

        // Update selection in store
        console.log('📦 Rectangle selection completed, selected nodes:', selectedNodes)
        if (selectedNodes.length > 0) {
          getStore().selectNodes(selectedNodes, 'mindmap')
          // Update local state to match store
          selectedNodeIds.value = [...selectedNodes]
        } else {
          // No nodes selected, clear selection
          getStore().clearSelection('mindmap')
          selectedNodeIds.value = []
        }

        // Update styles immediately
        void nextTick(() => {
          updateSelectedNodeStyles()
        })

        // Reset selection state
        selectionRect.value = null
        selectionStart.value = null
      }
    }

    const clearSelection = () => {
      if (!isDraggingSelection.value) {
        getStore().clearSelection('mindmap')
      }
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
        getStore().moveNode(draggedNode.data.id, newParentId, undefined, 'mindmap')
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
          handleNodeSelect(action.nodeId, new MouseEvent('click'))
          break
        case 'delete':
          // Node was deleted, clear selection if it was selected
          break
      }
    }

    let cleanupMouseListeners: (() => void) | null = null

    function createMindmap() {
      if (!svgEle.value) return

      // Clean up previous mouse listeners if they exist
      if (cleanupMouseListeners) {
        cleanupMouseListeners()
      }

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
        .on('mousedown', (event: MouseEvent) => {
          console.log('🖱️ Mousedown on main group, shiftKey:', event.shiftKey)
          // Check if we clicked on a node (event.target will be part of a .node group)
          const target = event.target as Element
          const isNodeClick = target.closest('.node') !== null

          if (event.shiftKey) {
            console.log('📦 Starting rectangle selection...')
            event.preventDefault()
            startRectangleSelection(event)
          } else if (!isNodeClick) {
            // Only clear selection when clicking on empty space (not on a node)
            clearSelection()
          }
        })

      // Set up zoom behavior
      zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .filter((event: MouseEvent) => {
          // Prevent zoom/pan when Shift is held (for rectangle selection)
          if (event.shiftKey) {
            return false
          }
          // Prevent zoom/pan when dragging a node (event.target is part of .text-group)
          const target = event.target as Element
          if (target.closest && target.closest('.text-group')) {
            return false
          }
          // Allow zoom/pan for all other cases
          return true
        })
        .on('zoom', (event) => {
          if (g) {
            g.attr('transform', event.transform)
          }
        })

      if (zoomBehavior && svg) {
        svg.call(zoomBehavior)
      }

      // Add direct mousedown listener to SVG for Shift+drag rectangle selection
      // This needs to be added AFTER zoom behavior to intercept events
      if (svgEle.value) {
        svgEle.value.addEventListener('mousedown', (event: MouseEvent) => {
          console.log('🖱️ SVG mousedown, shiftKey:', event.shiftKey)
          if (event.shiftKey) {
            console.log('📦 Shift detected, starting rectangle selection...')
            event.preventDefault()
            event.stopPropagation()
            startRectangleSelection(event)
          }
        }, { capture: true })  // Use capture phase to intercept before D3
      }

      // Set up global mouse event listeners for rectangle selection
      const handleMouseMove = (event: MouseEvent) => {
        if (isDraggingSelection.value) {
          updateRectangleSelection(event)
        }
      }

      const handleMouseUp = () => {
        if (isDraggingSelection.value) {
          endRectangleSelection()
        }
      }

      // Add event listeners
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)

      // Draw the mindmap
      drawMindmap()

      // Assign cleanup function
      cleanupMouseListeners = () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
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
        .separation((a, b) => {
          // If nodes have the same parent, use normal spacing (1)
          if (a.parent === b.parent) {
            return 1
          }
          // If nodes have different parents, use group spacing
          // Convert group spacing to a separation multiplier
          // The separation function expects a multiplier, not absolute pixels
          const groupSpacingMultiplier = props.groupSpacing / props.yGap
          return groupSpacingMultiplier
        })

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

      // Apply selection styles after drawing
      void nextTick(() => {
        updateSelectedNodeStyles()
      })

      // Add click handler to text group for selection
      // console.log('🔧 Setting up click handler for', gText.size(), 'text groups')
      gText.on('click', (event: MouseEvent, d) => {
        console.log('🖐️ Click handler called for node:', d.data.id, 'event:', event, 'ctrlKey:', event.ctrlKey, 'shiftKey:', event.shiftKey)
        event.stopPropagation()
        if (d.data.id) {
          handleNodeSelect(d.data.id, event)
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

            // Highlight potential drop targets using rectangle-based hit test (like original mindmap)
            // event.x/y represent where the dragged node should be, so we need to calculate actual mouse position
            // The dragged node is at (d.y + px, d.x + py), and event.x/y is the target position
            // So the mouse is at the same position as the dragged node's current visual position
            const mouseX = d.y + px  // Horizontal position (y-axis in D3)
            const mouseY = d.x + py  // Vertical position (x-axis in D3)

            // Debug: Only log occasionally to avoid spam
            if (Math.random() < 0.05) {  // Log ~5% of drag events
              console.log('🔍 Mouse:', mouseX.toFixed(0), mouseY.toFixed(0), 'Dragging:', d.data.name, 'at', d.y.toFixed(0), d.x.toFixed(0), 'offset:', px.toFixed(0), py.toFixed(0))

              // Log all node positions
              const allNodes = treeData.descendants()
              console.log('All nodes:', allNodes.map(n => ({
                name: n.data.name,
                x: n.x.toFixed(0),
                y: n.y.toFixed(0),
                bbox: `[${(n.y - 60).toFixed(0)}, ${(n.y + 60).toFixed(0)}] x [${(n.x - 25).toFixed(0)}, ${(n.x + 25).toFixed(0)}]`
              })))
            }

            // Find all nodes and check if mouse is within their bounding box
            const potentialTargetNode = g.selectAll<SVGGElement, d3.HierarchyPointNode<Data>>('.node')
              .filter(function(other: d3.HierarchyPointNode<Data>) {
                // Exclude self, parent, and descendants
                if (other === d || other === d.parent) {
                  return false
                }

                // Check if other is a descendant of d
                let current = other.parent
                while (current) {
                  if (current === d) return false
                  current = current.parent
                }

                // Define node bounding box with padding
                // Nodes are centered at their position, so we need to calculate from center
                const padding = 10  // Increased padding for easier targeting
                const nodeHalfWidth = 50  // Node rect is x: -50 to 50
                const nodeHalfHeight = 15  // Node rect is y: -15 to 15

                // Calculate bounding box centered at node position
                const x0 = other.y - nodeHalfWidth - padding
                const x1 = other.y + nodeHalfWidth + padding
                const y0 = other.x - nodeHalfHeight - padding
                const y1 = other.x + nodeHalfHeight + padding

                // Check if mouse is within bounding box
                const isInside = mouseX > x0 && mouseX < x1 &&
                                 mouseY > y0 && mouseY < y1

                if (isInside) {
                  console.log('✅ Found potential target:', other.data.name, 'at (', other.y.toFixed(0), other.x.toFixed(0), ') bbox: [', x0.toFixed(0), x1.toFixed(0), '] x [', y0.toFixed(0), y1.toFixed(0), ']')
                }

                return isInside
              })

            // Remove outline from all nodes
            g.selectAll('.node').classed('outline', false)

            // Add outline to the first matching node
            if (potentialTargetNode.size() > 0) {
              potentialTargetNode.classed('outline', true)
              console.log('✓ Highlighting potential parent:', potentialTargetNode.datum()?.data.name)
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

            // Detect if this was a click (no significant movement)
            const dragDistance = Math.sqrt(px * px + py * py)
            const isClick = dragDistance < 3  // Less than 3 pixels = click

            // Clean up drag offsets for this node and all descendants
            const descendants = d.descendants()
            dragOffsets.delete(d.data.id)
            descendants.forEach(desc => {
              if (desc.data.id) {
                dragOffsets.delete(desc.data.id)
              }
            })

            // If it was a click, handle selection
            if (isClick && d.data.id) {
              console.log('🖱️ Detected click (not drag) on node:', d.data.id)
              handleNodeSelect(d.data.id, event.sourceEvent as MouseEvent)
              return
            }

            // Calculate actual mouse position from dragged node's current position
            const mouseX = d.y + px  // Horizontal position (y-axis in D3)
            const mouseY = d.x + py  // Vertical position (x-axis in D3)

            // Check if node crossed to the other side (for depth 1 nodes only)
            const rootNode = treeData
            const rootCenterY = rootNode.y  // Root's Y position (horizontal axis)
            const nodeCenterY = d.y + px  // Node's final Y position after drag
            const crossedSide = d.depth === 1 && ((d.y < rootCenterY && nodeCenterY > rootCenterY) || (d.y > rootCenterY && nodeCenterY < rootCenterY))

            // Find node at drop position for reparenting using rectangle-based hit test
            const target = treeData.descendants().find(other => {
              // Exclude self, parent, and descendants
              if (other === d || other === d.parent) {
                return false
              }

              // Check if other is a descendant of d
              let current = other.parent
              while (current) {
                if (current === d) return false
                current = current.parent
              }

              // Define node bounding box with padding
              // Nodes are centered at their position
              const padding = 10
              const nodeHalfWidth = 50  // Node rect is x: -50 to 50
              const nodeHalfHeight = 15  // Node rect is y: -15 to 15

              // Calculate bounding box centered at node position
              const x0 = other.y - nodeHalfWidth - padding
              const x1 = other.y + nodeHalfWidth + padding
              const y0 = other.x - nodeHalfHeight - padding
              const y1 = other.x + nodeHalfHeight + padding

              // Check if mouse is within bounding box
              return mouseX > x0 && mouseX < x1 &&
                     mouseY > y0 && mouseY < y1
            })

            if (target && target.data.id) {
              // Handle node drop (reparenting)
              console.log('Reparenting:', d.data.id, 'to', target.data.id)
              handleNodeDrop(d, target)
              // Redraw will happen via store watch
              return
            } else if (crossedSide && d.data.id) {
              // Handle side change for root children
              const newSide = nodeCenterY < rootCenterY ? 'left' : 'right'
              console.log('Side change:', d.data.id, 'to', newSide)
              getStore().setNodeSide(d.data.id, newSide, 'mindmap')
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
                  getStore().reorderSiblings(parentId, newOrders, 'mindmap')
                  // Redraw will happen via store watch
                  return
                }
              } else {
                console.log('No target sibling found')
              }
            } else {
              console.log('No reordering needed, dy too small or no parent')
            }

            // No valid operation, snap back to original position with smooth animation
            d3.select(nodeGroup)
              .transition()
              .duration(500)  // Increased from 200ms for smoother, more visible animation
              .ease(d3.easeCubicOut)
              .attr('transform', `translate(${d.y},${d.x})`)

            // Redraw to restore edge
            drawMindmap()
          })
        )
    }

    function initializeCenterView(retryCount = 0) {
      // Center the view on initial load only
      if (!g || !svgEle.value) return

      const svgNode = svgEle.value

      // Check if SVG has valid dimensions before attempting to center
      // This prevents D3 errors when the SVG is not yet laid out by dockview
      if (!svgNode.clientWidth || !svgNode.clientHeight) {
        if (retryCount < 10) { // Limit retries to prevent spam
          if (retryCount === 0 || retryCount % 5 === 0) {
            console.log(`⚠️ SVG not yet sized, deferring center view (attempt ${retryCount + 1}/10)`)
          }
          // Retry after a short delay to allow dockview to complete layout
          setTimeout(() => {
            initializeCenterView(retryCount + 1)
          }, 100)
        } else {
          console.log('⚠️ SVG still not sized after 10 attempts, giving up')
        }
        return
      }

      const centerX = svgNode.clientWidth / 2
      const centerY = svgNode.clientHeight / 2

      // Set initial transform
      const initialTransform = d3.zoomIdentity.translate(centerX, centerY)

      // Apply to both the group and the zoom behavior
      if (svg && zoomBehavior) {
        svg.call(zoomBehavior.transform.bind(zoomBehavior), initialTransform)
      }
    }

    // Handle ESC key to clear selection
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedNodeIds.value.length > 0) {
        console.log('🔑 ESC pressed - clearing selection')
        selectedNodeIds.value = []
        getStore().selectNode(null, 'mindmap')
        void nextTick(() => {
          updateSelectedNodeStyles()
        })
      }
    }

    onMounted(() => {
      createMindmap()
      // Center view after initial render
      initializeCenterView()
      // Initialize selection from store
      selectedNodeIds.value = getStore().selectedNodeIds
      void nextTick(() => {
        updateSelectedNodeStyles()
      })
      // Add keyboard listener for ESC
      window.addEventListener('keydown', handleKeyDown)
    })

    onBeforeUnmount(() => {
      // Clean up keyboard listener
      window.removeEventListener('keydown', handleKeyDown)
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

    // Watch for modelValue changes (works with both legacy and unified stores)
    watch(() => props.modelValue, () => {
      console.log('[MindmapCore] modelValue changed, redrawing mindmap')
      drawMindmap()
    }, { deep: true })

    const updateSelectedNodeStyles = () => {
      const currentG = g
      if (!currentG) {
        console.log('⚠️ updateSelectedNodeStyles: g is null')
        return
      }

      // console.log('🎨 Updating selection styles for nodes:', [...selectedNodeIds.value])

      // Remove selected class from all nodes
      currentG.selectAll('.node').classed('selected', false)

      // Add selected class to selected nodes
      selectedNodeIds.value.forEach(nodeId => {
        // console.log('🔍 Applying selected style to node:', nodeId)
        const selection = currentG.selectAll('.node')
          .filter(function(d: unknown) {
            const nodeData = d as { data: { id: string } }
            return nodeData.data.id === nodeId
          })

        // console.log('📊 Found', selection.size(), 'nodes matching', nodeId)
        selection.classed('selected', true)

        // Log the actual DOM elements
        // selection.each(function() {
        //   console.log('🏷️ Applied selected class to element:', this)
        // })
      })
    }

    // Listen to selection changes from other views via event bus
    onStoreEvent('store:node-selected', ({ nodeId, scrollIntoView }) => {
      console.log('👀 Single node selected in store:', nodeId, 'scrollIntoView:', scrollIntoView)

      selectedNodeIds.value = nodeId ? [nodeId] : []

      // Pan to the selected node if requested
      // Note: useViewEvents already filters out events from this view (source === 'mindmap')
      if (nodeId && scrollIntoView) {
        console.log('🎯 Requesting pan to node:', nodeId)
        setTimeout(() => {
          panToNode(nodeId)
        }, 100) // Small delay to ensure node is rendered
      }

      void nextTick(() => {
        updateSelectedNodeStyles()
      })
    })

    onStoreEvent('store:nodes-selected', ({ nodeIds }) => {
      // console.log('👀 Multiple nodes selected in store:', [...nodeIds])
      selectedNodeIds.value = nodeIds
      void nextTick(() => {
        updateSelectedNodeStyles()
      })
    })

    return {
      svgEle,
      centerView,
      fitView,
      showContextMenu,
      contextMenuPosition,
      contextMenuNodeId,
      handleContextMenu,
      handleNodeAction,
      isDraggingSelection
    }
  }
})
</script>

<style scoped lang="scss">
.mindmap-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;

  // Prevent text selection when dragging
  &.selecting {
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
  }
}

.mindmap-svg {
  width: 100%;
  height: 100%;

  // Prevent text selection in SVG
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
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

  &.selected {
    .text-group rect {
      stroke: #2196F3 !important;
      stroke-width: 2px !important;
      filter: drop-shadow(0 0 6px rgba(33, 150, 243, 0.5));
    }
  }
}
</style>

<style lang="scss">
// Global style to prevent text selection during rectangle selection
body.mindmap-selecting {
  user-select: none !important;
  -webkit-user-select: none !important;
  -moz-user-select: none !important;
  -ms-user-select: none !important;

  * {
    user-select: none !important;
    -webkit-user-select: none !important;
    -moz-user-select: none !important;
    -ms-user-select: none !important;
  }
}
</style>
