<template>
  <div class="app-container">
    <!-- Controls Panel -->
    <div class="controls-panel">
      <h2>Nested Layout Test</h2>
      <div class="controls">
        <button @click="addRootNode" class="btn btn-primary">
          Add Root Node
        </button>
        <button @click="toggleBoundingBoxes" class="btn">
          {{ showBoundingBoxes ? 'Hide' : 'Show' }} Bounding Boxes
        </button>
        <button @click="resolveOverlapsManually" class="btn">
          Resolve Overlaps
        </button>
        <button @click="generateTestData" class="btn btn-secondary">
          Generate Test Data (50 nodes)
        </button>
      </div>

      <!-- Layout Spacing Controls -->
      <div class="spacing-section">
        <h3>Layout Spacing</h3>
        <div class="slider-control">
          <label>
            Horizontal Spacing: {{ horizontalSpacing }}px
            <input
              v-model.number="horizontalSpacing"
              type="range"
              min="0"
              max="100"
              step="5"
              @input="onSpacingChange"
            />
          </label>
        </div>
        <div class="slider-control">
          <label>
            Vertical Spacing: {{ verticalSpacing }}px
            <input
              v-model.number="verticalSpacing"
              type="range"
              min="0"
              max="100"
              step="5"
              @input="onSpacingChange"
            />
          </label>
        </div>
      </div>

      <!-- Stress Test Controls -->
      <div class="stress-test-section">
        <h3>Stress Test</h3>
        <div class="controls">
          <label>
            Node Count:
            <input v-model.number="stressTestNodeCount" type="number" min="50" max="10000" step="50" />
          </label>
          <button @click="runStressTest" class="btn btn-warning">
            Run Stress Test
          </button>
          <button @click="clearAll" class="btn btn-danger">
            Clear All
          </button>
          <button @click="zoomToFit" class="btn">
            Zoom to Fit
          </button>
        </div>
        <div class="algorithm-toggle">
          <label>
            <input type="radio" v-model="algorithm" value="aabb" />
            AABB (O(n²))
          </label>
          <label>
            <input type="radio" v-model="algorithm" value="rbush" />
            RBush (O(n log n))
          </label>
        </div>
        <div class="quick-tests">
          <button @click="stressTestNodeCount = 500; runStressTest()" class="btn btn-small">500 nodes</button>
          <button @click="stressTestNodeCount = 1000; runStressTest()" class="btn btn-small">1K nodes</button>
          <button @click="stressTestNodeCount = 2000; runStressTest()" class="btn btn-small">2K nodes</button>
          <button @click="stressTestNodeCount = 5000; runStressTest()" class="btn btn-small">5K nodes</button>
        </div>
      </div>

      <div class="stats">
        <div>Total Nodes: {{ nodes.length }}</div>
        <div>Root Nodes: {{ rootNodes.length }}</div>
        <div>Algorithm: {{ algorithm.toUpperCase() }}</div>
        <div v-if="nodes.length > 0" style="color: #2196F3; font-weight: bold;">
          Rendered Nodes: {{ renderedNodeCount }}
        </div>
        <div v-if="nodes.length > 0" style="color: #9E9E9E;">
          Viewport Zoom: {{ (viewport.zoom * 100).toFixed(0) }}%
        </div>
        <div v-if="lastPerformance">
          <strong>Last Operation:</strong>
          <div>Overlap Detection: {{ lastPerformance.overlapDetection }}ms</div>
          <div>Resolution: {{ lastPerformance.resolution }}ms</div>
          <div>Total: {{ lastPerformance.total }}ms</div>
          <div>Overlaps Found: {{ lastPerformance.overlapsFound }}</div>
        </div>
      </div>
      <div class="instructions">
        <h3>Instructions:</h3>
        <ul>
          <li>Right-click on a node to add child/sibling</li>
          <li>Drag nodes to move them</li>
          <li>Bounding boxes show hierarchy containment</li>
          <li>Overlaps are resolved on drag end</li>
        </ul>
      </div>
    </div>

    <!-- VueFlow Canvas -->
    <div class="canvas-container">
      <VueFlow
        :nodes="vueFlowNodes"
        :edges="visibleEdges"
        :default-viewport="{ zoom: 0.3, x: 400, y: 300 }"
        :min-zoom="0.05"
        :max-zoom="2"
        :only-render-visible-elements="true"
        @node-drag-start="onNodeDragStart"
        @node-drag="onNodeDrag"
        @node-drag-stop="onNodeDragStop"
        @node-context-menu="onNodeContextMenu"
        @pane-click="closeContextMenu"
        @pane-mousemove="onPaneMouseMove"
      >
        <Background />

        <!-- Custom Node Template -->
        <template #node-custom="{ data, id }">
          <CustomNode
            :data="data"
            @toggle-collapse="toggleCollapse(id)"
            @toggle-collapse-left="toggleCollapseLeft(id)"
            @toggle-collapse-right="toggleCollapseRight(id)"
          />
        </template>
      </VueFlow>

      <!-- Overlays - Outside VueFlow but synced with viewport -->
      <svg class="canvas-overlay">
        <g :style="{ transform: viewportTransform }">
          <!-- Center Cross Marker -->
          <line x1="-20" y1="0" x2="20" y2="0" stroke="#ff6b6b" stroke-width="2" />
          <line x1="0" y1="-20" x2="0" y2="20" stroke="#ff6b6b" stroke-width="2" />
          <circle cx="0" cy="0" r="3" fill="#ff6b6b" />

          <!-- Bounding Boxes -->
          <g v-if="showBoundingBoxes">
            <rect
              v-for="bound in boundingBoxes"
              :key="bound.nodeId"
              :x="bound.x"
              :y="bound.y"
              :width="bound.width"
              :height="bound.height"
              fill="none"
              :stroke="getNodeDepth(bound.nodeId) === 0 ? '#ff6b6b' : '#4dabf7'"
              stroke-width="2"
              stroke-dasharray="5,5"
              opacity="0.5"
            />
            <text
              v-for="bound in boundingBoxes"
              :key="`text-${bound.nodeId}`"
              :x="bound.x + 5"
              :y="bound.y + 15"
              font-size="10"
              fill="#666"
            >
              {{ bound.nodeId }}
            </text>
          </g>
        </g>
      </svg>

      <!-- Context Menu -->
      <div
        v-if="contextMenu.visible"
        class="context-menu"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      >
        <!-- Root node menu: Add Child Left/Right -->
        <template v-if="isRootNode(contextMenu.nodeId)">
          <div class="context-menu-item" @click="addChildLeft">
            Add Child Left
          </div>
          <div class="context-menu-item" @click="addChildRight">
            Add Child Right
          </div>
        </template>

        <!-- Child node menu: Add Child + Detach -->
        <template v-else>
          <div class="context-menu-item" @click="addChild">
            Add Child
          </div>
          <div class="context-menu-item context-menu-item-danger" @click="detachNode">
            Detach from Parent
          </div>
        </template>

        <div class="context-menu-item" @click="addSibling">
          Add Sibling
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, triggerRef } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import type { Node, Edge, NodeDragEvent } from '@vue-flow/core'
import CustomNode from './components/CustomNode.vue'
import type { NodeData, ContextMenuState, BoundingRect } from './types'
import { calculateBoundingRect, resolveAllOverlaps, resolveOverlapsForAffectedRoots, getAllDescendants, moveNodeAndDescendants, setLayoutSpacing, getLayoutSpacing } from './layout'
import * as LayoutRBush from './layout-rbush'

// VueFlow instance
const { viewport, fitView } = useVueFlow()

// State
const nodes = ref<NodeData[]>([])
const edges = ref<Edge[]>([])
const vueFlowNodes = ref<Node[]>([])
const showBoundingBoxes = ref(true)
const contextMenu = ref<ContextMenuState>({
  visible: false,
  x: 0,
  y: 0,
  nodeId: null
})

// Track previous positions for drag delta calculation
const dragStartPositions = ref<Map<string, { x: number; y: number }>>(new Map())

// Track potential parent during drag (for reparenting)
const potentialParent = ref<string | null>(null)

// Track mouse position during drag (for reparenting detection)
const dragMousePosition = ref<{ x: number; y: number } | null>(null)

// Layout spacing state
const horizontalSpacing = ref(20)
const verticalSpacing = ref(20)

// Stress test state
const algorithm = ref<'aabb' | 'rbush'>('aabb')
const stressTestNodeCount = ref(1000)
const lastPerformance = ref<{
  overlapDetection: number
  resolution: number
  total: number
  overlapsFound: number
} | null>(null)

let nodeCounter = 1

// Compute viewport transform for SVG
const viewportTransform = computed(() => {
  const { x, y, zoom } = viewport.value
  return `translate(${x}px, ${y}px) scale(${zoom})`
})

// Calculate bounding boxes for visualization
const boundingBoxes = computed<BoundingRect[]>(() => {
  if (!showBoundingBoxes.value) return []

  // Force recalculation by accessing nodes.value
  const currentNodes = nodes.value
  return currentNodes.map(node => calculateBoundingRect(node, currentNodes))
})

// Helper function to recalculate all bounding boxes
function recalculateBoundingBoxes() {
  // Trigger computed property recalculation by triggering nodes ref
  triggerRef(nodes)
}

// Get root nodes
const rootNodes = computed(() => nodes.value.filter(n => n.parentId === null))

// Get visible edges (only edges where both nodes are visible)
const visibleEdges = computed(() => {
  const visibleNodeIds = new Set(vueFlowNodes.value.map(n => n.id))
  return edges.value.filter(edge =>
    visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
  )
})

// Count rendered nodes (for performance monitoring)
const renderedNodeCount = computed(() => {
  return vueFlowNodes.value.filter(n => n.computed?.visible !== false).length
})

// Get direct children of a node
function getDirectChildren(nodeId: string): NodeData[] {
  return nodes.value.filter(n => n.parentId === nodeId)
}

// Get all visible descendants (excluding collapsed branches)
function getVisibleDescendants(nodeId: string): NodeData[] {
  const node = nodes.value.find(n => n.id === nodeId)
  if (!node || node.collapsed) return []

  const children = getDirectChildren(nodeId)
  const descendants: NodeData[] = [...children]

  for (const child of children) {
    descendants.push(...getVisibleDescendants(child.id))
  }

  return descendants
}

// Determine which side children are on relative to root
function getChildrenSide(nodeId: string): 'left' | 'right' | null {
  const node = nodes.value.find(n => n.id === nodeId)
  if (!node) return null

  const children = getDirectChildren(nodeId)
  if (children.length === 0) return null

  // For root nodes, check first child position
  if (!node.parentId) {
    return children[0].x < node.x ? 'left' : 'right'
  }

  // For non-root nodes, check relative to root
  const root = getRootNode(nodeId)
  if (!root) return null

  return node.x < root.x ? 'left' : 'right'
}

// Sync our data model to VueFlow nodes (only visible nodes)
function syncToVueFlow() {
  // console.log('syncToVueFlow: nodes.value.length =', nodes.value.length)

  // Filter to only show visible nodes (not in collapsed branches)
  const visibleNodes = nodes.value.filter(node => {
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

  vueFlowNodes.value = visibleNodes.map(node => {
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

  // console.log('syncToVueFlow: vueFlowNodes.value.length =', vueFlowNodes.value.length)
}

// Sync VueFlow nodes back to our data model
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

// Helper functions
function isRootNode(nodeId: string | null): boolean {
  if (!nodeId) return false
  const node = nodes.value.find(n => n.id === nodeId)
  return node ? node.parentId === null : false
}

function getRootNode(nodeId: string): NodeData | null {
  let current = nodes.value.find(n => n.id === nodeId)
  if (!current) return null

  // Traverse up to find root
  while (current.parentId) {
    const parent = nodes.value.find(n => n.id === current.parentId)
    if (!parent) break
    current = parent
  }

  return current
}

function isNodeOnLeftOfRoot(node: NodeData): boolean {
  const root = getRootNode(node.id)
  if (!root) return false
  return node.x < root.x
}

// Mirror all descendants of a node across the node's x position
function mirrorDescendantsAcrossNode(node: NodeData) {
  const descendants = getAllDescendants(node.id, nodes.value)

  descendants.forEach(descendant => {
    // Calculate distance from parent node
    const distanceX = descendant.x - node.x

    // Mirror across the node's x position
    descendant.x = node.x - distanceX

    // Update drag start position for this descendant
    dragStartPositions.value.set(descendant.id, { x: descendant.x, y: descendant.y })
  })
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

// Methods
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

function addRootNode() {
  console.log('addRootNode called, current nodes:', nodes.value.length)
  const id = `node-${nodeCounter++}`
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
    collapsedRight: false
  })
  syncToVueFlow()
  console.log('After addRootNode, nodes:', nodes.value.length)
}

// Add child to the left of parent (for root nodes)
function addChildLeft() {
  if (!contextMenu.value.nodeId) return
  const parent = nodes.value.find(n => n.id === contextMenu.value.nodeId)
  if (!parent) return

  addChildToSide(parent, 'left')
}

// Add child to the right of parent (for root nodes)
function addChildRight() {
  if (!contextMenu.value.nodeId) return
  const parent = nodes.value.find(n => n.id === contextMenu.value.nodeId)
  if (!parent) return

  addChildToSide(parent, 'right')
}

// Add child (for non-root nodes - inherits parent's side)
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

  const id = `node-${nodeCounter++}`
  const newNode: NodeData = {
    id,
    label: `Child ${id}`,
    parentId: parent.id,
    x: childX,
    y: childY,
    width: 150,
    height: 50,  // Same height as root nodes (one line of text)
    collapsed: false
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

  // Resolve overlaps after adding
  setTimeout(() => {
    resolveAllOverlaps(nodes.value)
    syncToVueFlow()
  }, 100)
}

function addSibling() {
  if (!contextMenu.value.nodeId) return

  const sibling = nodes.value.find(n => n.id === contextMenu.value.nodeId)
  if (!sibling) return

  const id = `node-${nodeCounter++}`
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

  // Resolve overlaps after adding
  setTimeout(() => {
    resolveAllOverlaps(nodes.value)
    syncToVueFlow()
  }, 100)
}

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
  dragMousePosition.value = null
  event.nodes.forEach(vfNode => {
    const node = nodes.value.find(n => n.id === vfNode.id)
    if (node) {
      dragStartPositions.value.set(node.id, { x: node.x, y: node.y })
    }
  })
}

function onNodeDrag(event: NodeDragEvent) {
  // For each dragged node, move its children with it
  event.nodes.forEach(vfNode => {
    const node = nodes.value.find(n => n.id === vfNode.id)
    const startPos = dragStartPositions.value.get(vfNode.id)

    if (node && startPos) {
      // Calculate delta from start position
      const deltaX = vfNode.position.x - startPos.x
      const deltaY = vfNode.position.y - startPos.y

      // Update the node position
      node.x = vfNode.position.x
      node.y = vfNode.position.y

      // Check if node crossed to other side of root (only for non-root nodes)
      if (node.parentId) {
        const root = getRootNode(node.id)
        if (root) {
          const wasLeftSide = startPos.x < root.x
          const isNowLeftSide = node.x < root.x

          // If crossed to other side, mirror all descendants
          if (wasLeftSide !== isNowLeftSide) {
            console.log(`Node ${node.id} crossed root! Mirroring descendants...`)
            mirrorDescendantsAcrossNode(node)

            // Update edges for this node and all descendants
            updateEdgesForBranch(node)
          }
        }
      }

      // Move all descendants by the same delta
      const descendants = getAllDescendants(node.id, nodes.value)
      descendants.forEach(descendant => {
        const descendantStartPos = dragStartPositions.value.get(descendant.id)
        if (!descendantStartPos) {
          // Store initial position if not already stored
          dragStartPositions.value.set(descendant.id, { x: descendant.x, y: descendant.y })
        }
        const origPos = dragStartPositions.value.get(descendant.id)!
        descendant.x = origPos.x + deltaX
        descendant.y = origPos.y + deltaY
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

function onNodeDragStop(event: NodeDragEvent) {
  // Check if we should reparent
  if (potentialParent.value && event.nodes.length === 1) {
    const draggedNodeId = event.nodes[0].id
    const newParentId = potentialParent.value

    // Clear potential parent
    potentialParent.value = null

    // Reparent the node (this sets new positions)
    reparentNode(draggedNodeId, newParentId)

    // Clear drag start positions
    dragStartPositions.value.clear()

    // Resolve overlaps after reparenting (optimized - only affected roots)
    resolveOverlapsForAffectedRoots([draggedNodeId, newParentId], nodes.value)

    // Update VueFlow with resolved positions
    syncToVueFlow()
  } else {
    // Normal drag without reparenting

    // Clear potential parent
    potentialParent.value = null

    // Sync final positions
    syncFromVueFlow()

    // Clear drag start positions
    dragStartPositions.value.clear()

    // Get IDs of all dragged nodes
    const draggedNodeIds = event.nodes.map(n => n.id)

    // Resolve overlaps after dragging (optimized - only affected roots)
    resolveOverlapsForAffectedRoots(draggedNodeIds, nodes.value)

    // Update VueFlow with resolved positions
    syncToVueFlow()
  }
}

function onNodeContextMenu(event: { event: MouseEvent; node: Node }) {
  event.event.preventDefault()
  contextMenu.value = {
    visible: true,
    x: event.event.clientX,
    y: event.event.clientY,
    nodeId: event.node.id
  }
}

function closeContextMenu() {
  contextMenu.value.visible = false
}

function toggleBoundingBoxes() {
  showBoundingBoxes.value = !showBoundingBoxes.value
}

function resolveOverlapsManually() {
  resolveAllOverlaps(nodes.value)
  syncToVueFlow()
}

function zoomToFit() {
  fitView({ padding: 0.2, duration: 300 })
}

function onSpacingChange() {
  // Update layout spacing
  setLayoutSpacing(horizontalSpacing.value, verticalSpacing.value)

  // Recalculate bounding boxes and resolve overlaps
  triggerRef(nodes)
  resolveAllOverlaps(nodes.value)
  syncToVueFlow()
}

function getNodeDepth(nodeId: string): number {
  let depth = 0
  let currentId: string | null = nodeId

  while (currentId) {
    const node = nodes.value.find(n => n.id === currentId)
    if (!node || !node.parentId) break
    currentId = node.parentId
    depth++
  }

  return depth
}

function generateTestData() {
  console.log('Generating test data...')
  nodes.value = []
  edges.value = []
  vueFlowNodes.value = []
  nodeCounter = 1

  // Create 2 root nodes (left and right of center)
  const root1 = createNode('Root Left', null, -400, 0)
  const root2 = createNode('Root Right', null, 400, 0)

  // Add children to root1 (left side - children go further left)
  const r1c1 = createNode('R1-C1', root1.id, root1.x - 200, root1.y + 100)
  const r1c2 = createNode('R1-C2', root1.id, root1.x - 200, root1.y - 100)
  createEdge(root1.id, r1c1.id)
  createEdge(root1.id, r1c2.id)

  // Add grandchildren to r1c1 (continue left)
  const r1c1c1 = createNode('R1-C1-C1', r1c1.id, r1c1.x - 200, r1c1.y + 80)
  const r1c1c2 = createNode('R1-C1-C2', r1c1.id, r1c1.x - 200, r1c1.y - 80)
  createEdge(r1c1.id, r1c1c1.id)
  createEdge(r1c1.id, r1c1c2.id)

  // Add children to root2 (right side - children go further right)
  const r2c1 = createNode('R2-C1', root2.id, root2.x + 200, root2.y + 100)
  const r2c2 = createNode('R2-C2', root2.id, root2.x + 200, root2.y)
  const r2c3 = createNode('R2-C3', root2.id, root2.x + 200, root2.y - 100)
  createEdge(root2.id, r2c1.id)
  createEdge(root2.id, r2c2.id)
  createEdge(root2.id, r2c3.id)

  // Add more nodes to r2c2 branch (right side)
  let currentParent = r2c2
  for (let i = 0; i < 20; i++) {
    const offsetY = (i % 3 - 1) * 80
    const newNode = createNode(`Node-${i}`, currentParent.id, currentParent.x + 200, currentParent.y + offsetY)
    createEdge(currentParent.id, newNode.id)
    if (i % 4 === 0) {
      currentParent = newNode
    }
  }

  // Add more nodes to r1c2 branch (left side)
  currentParent = r1c2
  for (let i = 20; i < 35; i++) {
    const offsetY = (i % 3 - 1) * 80
    const newNode = createNode(`Node-${i}`, currentParent.id, currentParent.x - 200, currentParent.y + offsetY)
    createEdge(currentParent.id, newNode.id)
    if (i % 4 === 0) {
      currentParent = newNode
    }
  }

  console.log(`Created ${nodes.value.length} nodes and ${edges.value.length} edges`)

  // Sync to VueFlow
  syncToVueFlow()

  console.log(`VueFlow nodes: ${vueFlowNodes.value.length}`)

  // Resolve overlaps
  setTimeout(() => {
    console.log('Resolving overlaps...')
    console.log('Before overlap resolution, sample positions:', nodes.value.slice(0, 5).map(n => ({ id: n.id, x: n.x, y: n.y })))
    resolveAllOverlaps(nodes.value)
    console.log('After overlap resolution, sample positions:', nodes.value.slice(0, 5).map(n => ({ id: n.id, x: n.x, y: n.y })))
    syncToVueFlow()
    console.log(`After overlap resolution: ${nodes.value.length} nodes, ${vueFlowNodes.value.length} VueFlow nodes`)

    // Check if any nodes have extreme positions
    const extremeNodes = nodes.value.filter(n => Math.abs(n.x) > 10000 || Math.abs(n.y) > 10000)
    if (extremeNodes.length > 0) {
      console.warn('Found nodes with extreme positions:', extremeNodes.length, extremeNodes.slice(0, 3))
    }
  }, 100)
}

function clearAll() {
  nodes.value = []
  edges.value = []
  vueFlowNodes.value = []
  nodeCounter = 1
  lastPerformance.value = null
}

function runStressTest() {
  console.log(`Running stress test with ${stressTestNodeCount.value} nodes using ${algorithm.value.toUpperCase()}...`)

  // Clear existing data
  clearAll()

  const startTotal = performance.now()

  // Create root nodes (10 roots) - space them far apart
  const rootCount = 10
  const roots: NodeData[] = []
  for (let i = 0; i < rootCount; i++) {
    const x = (i - rootCount / 2) * 800  // Increased spacing to 800px
    const root = createNode(`Root ${i + 1}`, null, x, 0)
    roots.push(root)
  }

  // Calculate how many children per root
  const childrenPerRoot = Math.floor((stressTestNodeCount.value - rootCount) / rootCount)

  // Create children for each root
  for (const root of roots) {
    const isLeftSide = root.x < 0
    const offsetX = isLeftSide ? -250 : 250  // Increased horizontal spacing

    // Create children in a grid pattern
    const childrenPerLevel = Math.ceil(Math.sqrt(childrenPerRoot))
    let childIndex = 0

    for (let level = 0; level < Math.ceil(childrenPerRoot / childrenPerLevel); level++) {
      for (let i = 0; i < childrenPerLevel && childIndex < childrenPerRoot; i++) {
        const x = root.x + offsetX * (level + 1)
        const y = root.y + (i - childrenPerLevel / 2) * 150  // Increased vertical spacing to 150px
        const child = createNode(`C${childIndex + 1}`, root.id, x, y)
        createEdge(root.id, child.id)
        childIndex++
      }
    }
  }

  // Sync to VueFlow
  syncToVueFlow()

  // Now measure overlap detection and resolution
  let overlapsFoundBefore = 0
  let overlapsFoundAfter = 0

  if (algorithm.value === 'rbush') {
    // Measure overlap detection with RBush
    const startOverlap = performance.now()

    const rootNodesData = nodes.value.filter((n: NodeData) => n.parentId === null)
    const boundingRects = rootNodesData.map((node: NodeData) =>
      LayoutRBush.calculateBoundingRect(node, nodes.value)
    )

    const overlaps = LayoutRBush.findOverlapsRBush(boundingRects)
    overlapsFoundBefore = overlaps.length

    const endOverlap = performance.now()

    // Resolve overlaps using standard algorithm
    const startResolution = performance.now()
    resolveAllOverlaps(nodes.value)
    const endResolution = performance.now()

    // Check overlaps after resolution
    const boundingRectsAfter = rootNodesData.map((node: NodeData) =>
      LayoutRBush.calculateBoundingRect(node, nodes.value)
    )
    const overlapsAfter = LayoutRBush.findOverlapsRBush(boundingRectsAfter)
    overlapsFoundAfter = overlapsAfter.length

    lastPerformance.value = {
      overlapDetection: endOverlap - startOverlap,
      resolution: endResolution - startResolution,
      total: performance.now() - startTotal,
      overlapsFound: overlapsFoundAfter
    }
  } else {
    // Measure overlap detection with AABB
    const startOverlap = performance.now()

    const rootNodesData = nodes.value.filter((n: NodeData) => n.parentId === null)
    const boundingRects = rootNodesData.map((node: NodeData) =>
      calculateBoundingRect(node, nodes.value)
    )

    // Count overlaps before resolution
    for (let i = 0; i < boundingRects.length; i++) {
      for (let j = i + 1; j < boundingRects.length; j++) {
        if (checkOverlap(boundingRects[i], boundingRects[j])) {
          overlapsFoundBefore++
        }
      }
    }

    const endOverlap = performance.now()

    // Resolve overlaps
    const startResolution = performance.now()
    resolveAllOverlaps(nodes.value)
    const endResolution = performance.now()

    // Count overlaps after resolution
    const boundingRectsAfter = rootNodesData.map((node: NodeData) =>
      calculateBoundingRect(node, nodes.value)
    )

    for (let i = 0; i < boundingRectsAfter.length; i++) {
      for (let j = i + 1; j < boundingRectsAfter.length; j++) {
        if (checkOverlap(boundingRectsAfter[i], boundingRectsAfter[j])) {
          overlapsFoundAfter++
        }
      }
    }

    lastPerformance.value = {
      overlapDetection: endOverlap - startOverlap,
      resolution: endResolution - startResolution,
      total: performance.now() - startTotal,
      overlapsFound: overlapsFoundAfter
    }
  }

  syncToVueFlow()

  // Zoom to fit after a short delay
  setTimeout(() => {
    zoomToFit()
  }, 100)

  console.log('Stress test complete:', lastPerformance.value)
  console.log(`Overlaps before: ${overlapsFoundBefore}, after: ${overlapsFoundAfter}`)
}

function checkOverlap(rect1: BoundingRect, rect2: BoundingRect): boolean {
  return !(
    rect1.x + rect1.width <= rect2.x ||
    rect2.x + rect2.width <= rect1.x ||
    rect1.y + rect1.height <= rect2.y ||
    rect2.y + rect2.height <= rect1.y
  )
}

function createNode(label: string, parentId: string | null, x: number, y: number): NodeData {
  const id = `node-${nodeCounter++}`

  // All nodes now have same height (one line of text)
  const height = 50

  const node: NodeData = {
    id,
    label,
    parentId,
    x,
    y,
    width: 150,
    height: height,
    collapsed: false
  }
  nodes.value.push(node)
  return node
}

function createEdge(sourceId: string, targetId: string) {
  // Find source and target nodes to determine which handles to use
  const sourceNode = nodes.value.find(n => n.id === sourceId)
  const targetNode = nodes.value.find(n => n.id === targetId)

  if (!sourceNode || !targetNode) return

  // Determine handles based on position relative to center
  const sourceIsLeft = sourceNode.x < 0
  const targetIsLeft = targetNode.x < 0

  let sourceHandle = 'bottom'
  let targetHandle = 'top'

  // If both on same side, use left/right handles
  if (sourceIsLeft && targetIsLeft) {
    sourceHandle = 'left'
    targetHandle = 'right'
  } else if (!sourceIsLeft && !targetIsLeft) {
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

// Initialize with some test data
function initialize() {
  addRootNode()
  syncToVueFlow()
}

initialize()
</script>

<style scoped>
.app-container {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.controls-panel {
  width: 300px;
  background: #f8f9fa;
  border-right: 1px solid #dee2e6;
  padding: 20px;
  overflow-y: auto;
}

.controls-panel h2 {
  margin: 0 0 20px 0;
  font-size: 20px;
  color: #212529;
}

.controls-panel h3 {
  margin: 20px 0 10px 0;
  font-size: 14px;
  color: #495057;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.btn {
  padding: 10px 16px;
  border: 1px solid #dee2e6;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn:hover {
  background: #e9ecef;
}

.btn-primary {
  background: #4dabf7;
  color: white;
  border-color: #4dabf7;
}

.btn-primary:hover {
  background: #339af0;
}

.btn-secondary {
  background: #51cf66;
  color: white;
  border-color: #51cf66;
}

.btn-secondary:hover {
  background: #40c057;
}

.btn-warning {
  background: #ffd43b;
  color: #212529;
  border-color: #ffd43b;
}

.btn-warning:hover {
  background: #fcc419;
}

.btn-danger {
  background: #ff6b6b;
  color: white;
  border-color: #ff6b6b;
}

.btn-danger:hover {
  background: #fa5252;
}

.spacing-section {
  background: #f3f0ff;
  border: 1px solid #9775fa;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 20px;
}

.spacing-section h3 {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #6741d9;
}

.slider-control {
  margin-bottom: 15px;
}

.slider-control label {
  display: block;
  font-size: 13px;
  color: #495057;
  margin-bottom: 5px;
  font-weight: 500;
}

.slider-control input[type="range"] {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #dee2e6;
  outline: none;
  -webkit-appearance: none;
}

.slider-control input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #9775fa;
  cursor: pointer;
  transition: background 0.2s;
}

.slider-control input[type="range"]::-webkit-slider-thumb:hover {
  background: #7950f2;
}

.slider-control input[type="range"]::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #9775fa;
  cursor: pointer;
  border: none;
  transition: background 0.2s;
}

.slider-control input[type="range"]::-moz-range-thumb:hover {
  background: #7950f2;
}

.stress-test-section {
  background: #e7f5ff;
  border: 1px solid #4dabf7;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 20px;
}

.stress-test-section h3 {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #1971c2;
}

.stress-test-section label {
  display: block;
  font-size: 13px;
  color: #495057;
  margin-bottom: 5px;
}

.stress-test-section input[type="number"] {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 14px;
  margin-bottom: 10px;
}

.algorithm-toggle {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #a5d8ff;
}

.algorithm-toggle label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
}

.algorithm-toggle input[type="radio"] {
  cursor: pointer;
}

.quick-tests {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #a5d8ff;
}

.btn-small {
  padding: 6px 10px;
  font-size: 12px;
}

.stats {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 20px;
}

.stats div {
  padding: 4px 0;
  font-size: 13px;
  color: #495057;
}

.instructions {
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  padding: 12px;
}

.instructions ul {
  margin: 10px 0 0 0;
  padding-left: 20px;
}

.instructions li {
  font-size: 13px;
  color: #856404;
  margin: 4px 0;
}

.canvas-container {
  flex: 1;
  position: relative;
  background: #fafafa;
}

.canvas-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
  overflow: visible;
}

.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 150px;
}

.context-menu-item {
  padding: 10px 16px;
  cursor: pointer;
  font-size: 14px;
  color: #212529;
  transition: background 0.2s;
}

.context-menu-item:hover {
  background: #f8f9fa;
}

.context-menu-item:first-child {
  border-radius: 4px 4px 0 0;
}

.context-menu-item:last-child {
  border-radius: 0 0 4px 4px;
}

.context-menu-item-danger {
  color: #ff6b6b;
}

.context-menu-item-danger:hover {
  background: #fff5f5;
  color: #fa5252;
}
</style>


