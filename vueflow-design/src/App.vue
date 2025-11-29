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
              max="50"
              step="1"
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
              max="50"
              step="1"
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

      <!-- LOD (Level of Detail) Configuration -->
      <div class="lod-section">
        <h3>LOD (Level of Detail)</h3>
        <div class="controls">
          <label>
            <input type="checkbox" v-model="lodEnabled" />
            Enable LOD System
          </label>
          <label>
            <input type="checkbox" v-model="showMinimap" />
            Show Minimap
          </label>
        </div>
        <div v-if="lodEnabled" class="lod-info">
          <p class="info-text">
            <strong>Max depth:</strong> {{ maxTreeDepth }} |
            <strong>Zoom:</strong> {{ (viewport.zoom * 100).toFixed(0) }}% |
            <strong>LOD:</strong> {{ currentLodLevel }}
          </p>
        </div>
        <div v-if="lodEnabled" class="lod-config">
          <h4>LOD Configuration:</h4>
          <div class="lod-input-group">
            <label>
              <span class="lod-label">Start LOD at:</span>
              <input
                v-model.number="lodStartPercent"
                type="number"
                min="5"
                max="100"
                step="5"
                class="lod-input"
              />
              <span class="lod-unit">%</span>
            </label>
          </div>
          <div class="lod-input-group">
            <label>
              <span class="lod-label">Increment LOD by:</span>
              <input
                v-model.number="lodIncrementPercent"
                type="number"
                min="5"
                max="100"
                step="5"
                class="lod-input"
              />
              <span class="lod-unit">%</span>
            </label>
          </div>
          <div class="lod-preview">
            <h5>Generated Thresholds:</h5>
            <div class="lod-preview-list">
              <div v-for="(threshold, index) in lodThresholds" :key="index" class="lod-preview-item">
                <span class="lod-label">LOD {{ index + 1 }}:</span>
                <span class="lod-hint">Zoom &lt; {{ threshold }}%</span>
              </div>
              <div class="lod-preview-item">
                <span class="lod-label">LOD {{ lodThresholds.length + 1 }}:</span>
                <span class="lod-hint">Zoom ≥ {{ lodThresholds[lodThresholds.length - 1] }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Display Options -->
      <div class="display-section">
        <h3>Display Options</h3>
        <div class="controls">
          <button @click="showCanvasCenter = !showCanvasCenter" class="btn">
            {{ showCanvasCenter ? 'Hide' : 'Show' }} Canvas Center
          </button>
          <button @click="showZoomIndicator = !showZoomIndicator" class="btn">
            {{ showZoomIndicator ? 'Hide' : 'Show' }} Zoom Indicator
          </button>
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
        :max-zoom="maxZoom"
        :only-render-visible-elements="true"
        @node-drag-start="onNodeDragStart"
        @node-drag="onNodeDrag"
        @node-drag-stop="onNodeDragStop"
        @node-context-menu="onNodeContextMenu"
        @pane-click="closeContextMenu"
        @pane-mousemove="onPaneMouseMove"
      >
        <Background />

        <!-- MiniMap -->
        <MiniMap v-if="showMinimap" />

        <!-- Custom Node Template -->
        <template #node-custom="{ data, id }">
          <CustomNode
            :data="data"
            @toggle-collapse="toggleCollapse(id)"
            @toggle-collapse-left="toggleCollapseLeft(id)"
            @toggle-collapse-right="toggleCollapseRight(id)"
          />
        </template>

        <!-- LOD Badge Node Template -->
        <template #node-lod-badge="{ data }">
          <LodBadgeNode :data="data" />
        </template>
      </VueFlow>

      <!-- Overlays - Outside VueFlow but synced with viewport -->
      <svg class="canvas-overlay">
        <g :style="{ transform: viewportTransform }">
          <!-- Center Cross Marker -->
          <g v-if="showCanvasCenter">
            <line x1="-20" y1="0" x2="20" y2="0" stroke="#ff6b6b" stroke-width="2" />
            <line x1="0" y1="-20" x2="0" y2="20" stroke="#ff6b6b" stroke-width="2" />
            <circle cx="0" cy="0" r="3" fill="#ff6b6b" />
          </g>

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

      <!-- Zoom Indicator (Top Right) -->
      <div v-if="showZoomIndicator" class="zoom-indicator">
        <div class="zoom-value">{{ (viewport.zoom * 100).toFixed(0) }}%</div>
        <div class="zoom-level" v-if="lodEnabled">LOD: {{ currentLodLevel }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, triggerRef, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import type { Node, Edge, NodeDragEvent } from '@vue-flow/core'
import CustomNode from './components/CustomNode.vue'
import LodBadgeNode from './components/LodBadgeNode.vue'
import type { NodeData, ContextMenuState, BoundingRect } from './types'
import { calculateBoundingRect, resolveAllOverlaps, resolveOverlapsForAffectedRoots, resolveOverlapsLOD, resolveOverlapsForAffectedRootsLOD, getAllDescendants, moveNodeAndDescendants, setLayoutSpacing, getLayoutSpacing } from './layout'
import * as LayoutRBush from './layout-rbush'

// VueFlow instance
const { viewport, fitView, zoomIn, zoomOut, setViewport, vueFlowRef } = useVueFlow()

// State
const nodes = ref<NodeData[]>([])
const edges = ref<Edge[]>([])
const vueFlowNodes = ref<Node[]>([])

// No longer needed - layout is calculated once during creation, not during zoom/pan


const showBoundingBoxes = ref(false)
const showMinimap = ref(false)
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
const horizontalSpacing = ref(0)
const verticalSpacing = ref(0)

// Stress test state
const algorithm = ref<'aabb' | 'rbush'>('aabb')
const stressTestNodeCount = ref(200)
const lastPerformance = ref<{
  overlapDetection: number
  resolution: number
  total: number
  overlapsFound: number
} | null>(null)

// LOD (Level of Detail) state
const lodEnabled = ref(true)
// Dynamic LOD thresholds: array of zoom percentages (10, 30, 50, 70, 90, etc.)
// LOD configuration
const lodStartPercent = ref(10)  // Start LOD at 10%
const lodIncrementPercent = ref(20)  // Increment by 20%

// Computed LOD thresholds based on start and increment
const lodThresholds = computed(() => {
  const thresholds: number[] = []
  const numLevels = Math.max(maxTreeDepth.value, 5)
  for (let i = 0; i < numLevels; i++) {
    thresholds.push(lodStartPercent.value + i * lodIncrementPercent.value)
  }
  return thresholds
})

// Display options
const showCanvasCenter = ref(true)
const showZoomIndicator = ref(true)

// Dynamic max zoom based on LOD levels
// Ensure max zoom is high enough to show all LOD levels
// Formula: last LOD threshold + 20% buffer, minimum 2.0 (200%)
const maxZoom = computed(() => {
  if (lodThresholds.value.length === 0) return 2.0
  const lastThreshold = lodThresholds.value[lodThresholds.value.length - 1]
  // Add 20% buffer above the last threshold, convert to zoom (divide by 100)
  // Minimum 2.0 (200%), maximum 5.0 (500%) for safety
  return Math.min(Math.max((lastThreshold + 20) / 100, 2.0), 5.0)
})

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

// Calculate maximum depth in the tree
const maxTreeDepth = computed(() => {
  if (nodes.value.length === 0) return 0

  let maxDepth = 0
  nodes.value.forEach(node => {
    const depth = getNodeDepth(node.id)
    if (depth > maxDepth) {
      maxDepth = depth
    }
  })

  return maxDepth
})

// Current LOD level based on zoom (1-based: LOD 1, LOD 2, etc.)
const currentLodLevel = computed(() => {
  if (!lodEnabled.value) return maxTreeDepth.value + 1 // Show all

  const zoomPercent = viewport.value.zoom * 100

  // Find which LOD level we're at
  for (let i = 0; i < lodThresholds.value.length; i++) {
    if (zoomPercent < lodThresholds.value[i]) {
      return i + 1 // LOD levels are 1-based
    }
  }

  // If zoom is above all thresholds, show all levels
  return lodThresholds.value.length + 1
})

// Watch for zoom changes and update visible nodes when LOD is enabled
// NO DEBOUNCING - just update view immediately
watch(() => viewport.value.zoom, (newZoom, oldZoom) => {
  if (lodEnabled.value) {
    // Just update the view - no layout recalculation
    // All positions were calculated during stress test creation
    syncToVueFlow()
  }
})

// Watch for LOD enabled/disabled and update
watch(lodEnabled, () => {
  syncToVueFlow()
})

// LOD thresholds are now computed automatically based on maxTreeDepth, lodStartPercent, and lodIncrementPercent
// No need for a watcher - the computed property handles it

// NOTE: resolveOverlapsIncremental removed - we don't recalculate layout on zoom changes
// Layout is only calculated when nodes are created or dragged

// Get direct children of a node
function getDirectChildren(nodeId: string): NodeData[] {
  return nodes.value.filter(n => n.parentId === nodeId)
}

// Calculate bounding box of hidden children
function calculateHiddenChildrenBounds(hiddenChildren: NodeData[]): { x: number, y: number, width: number, height: number } {
  if (hiddenChildren.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  // Calculate bounding box for all hidden children and their descendants
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const child of hiddenChildren) {
    // Get bounding rect including all descendants
    const bounds = calculateBoundingRect(child, nodes.value)

    minX = Math.min(minX, bounds.x)
    minY = Math.min(minY, bounds.y)
    maxX = Math.max(maxX, bounds.x + bounds.width)
    maxY = Math.max(maxY, bounds.y + bounds.height)
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  }
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

// Get node depth (0 for root, 1 for direct children, etc.)
function getNodeDepth(nodeId: string): number {
  const node = nodes.value.find(n => n.id === nodeId)
  if (!node) return 0

  let depth = 0
  let current = node
  while (current.parentId) {
    depth++
    const parent = nodes.value.find(n => n.id === current.parentId)
    if (!parent) break
    current = parent
  }
  return depth
}

// LOD: Determine which nodes should be visible at current zoom level
function getVisibleNodesForLOD(): NodeData[] {
  if (!lodEnabled.value) {
    // LOD disabled: return all nodes
    return nodes.value
  }

  const zoomPercent = viewport.value.zoom * 100

  // Determine max depth to show based on zoom level
  // Logic: Count how many thresholds we've PASSED (zoom >= threshold)
  // Example: [10, 30, 50, 70, 90]
  //   zoom < 10%        → passed 0 thresholds → show depth 0 (roots only)
  //   10% <= zoom < 30% → passed 1 threshold  → show depth 0-1
  //   30% <= zoom < 50% → passed 2 thresholds → show depth 0-2
  //   zoom >= 90%       → passed all          → show all depths

  let maxDepthToShow = 0 // Default: show only roots (depth 0)

  // Count how many thresholds we've passed
  for (let i = 0; i < lodThresholds.value.length; i++) {
    if (zoomPercent >= lodThresholds.value[i]) {
      maxDepthToShow = i + 1 // We've passed this threshold, show one more level
    } else {
      break // Stop at first threshold we haven't reached
    }
  }

  // If zoom is above all thresholds, show all nodes
  if (zoomPercent >= lodThresholds.value[lodThresholds.value.length - 1]) {
    return nodes.value
  }

  // Filter nodes by depth
  return nodes.value.filter(node => {
    const depth = getNodeDepth(node.id)
    return depth <= maxDepthToShow
  })
}

// Sync our data model to VueFlow nodes (only visible nodes)
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
    collapsedRight: false,
    isDirty: true, // New node needs position calculation
    lastCalculatedZoom: viewport.value.zoom
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
  const startTime = performance.now()

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

    // Clear drag start positions
    dragStartPositions.value.clear()

    // Get IDs of all dragged nodes
    const draggedNodeIds = event.nodes.map(n => n.id)

    // OPTIMIZED: Only recalculate affected branch, not entire tree
    console.log(`🔄 Recalculating layout for affected branch...`)
    const lodTime = performance.now()
    const visibleNodes = getVisibleNodesForLOD()
    console.log(`  ⏱️ LOD filtering: ${(performance.now() - lodTime).toFixed(2)}ms`)

    // Filter visible nodes by side (left/right of root) to reduce calculation
    const filterTime = performance.now()
    const draggedNode = nodes.value.find(n => n.id === draggedNodeIds[0])
    if (draggedNode) {
      const root = getRootNode(draggedNode.id)
      if (root) {
        const isOnLeft = draggedNode.x < root.x
        const sideVisibleNodes = visibleNodes.filter(n => {
          if (n.id === root.id) return true // Include root
          const nodeRoot = getRootNode(n.id)
          if (!nodeRoot || nodeRoot.id !== root.id) return false // Different root tree
          const nodeIsOnLeft = n.x < root.x
          return nodeIsOnLeft === isOnLeft // Same side only
        })
        console.log(`  📊 Filtered to ${sideVisibleNodes.length}/${visibleNodes.length} nodes (same side of root)`)
        console.log(`  ⏱️ Side filtering: ${(performance.now() - filterTime).toFixed(2)}ms`)

        const resolveTime = performance.now()
        resolveOverlapsForAffectedRootsLOD(draggedNodeIds, sideVisibleNodes, nodes.value)
        console.log(`  ⏱️ Overlap resolution: ${(performance.now() - resolveTime).toFixed(2)}ms`)
      } else {
        // Fallback: use all visible nodes
        const resolveTime = performance.now()
        resolveOverlapsForAffectedRootsLOD(draggedNodeIds, visibleNodes, nodes.value)
        console.log(`  ⏱️ Overlap resolution: ${(performance.now() - resolveTime).toFixed(2)}ms`)
      }
    }

    // Update VueFlow with resolved positions
    syncToVueFlow()

    const endTime = performance.now()
    console.log(`  ✓ Drag complete in ${(endTime - startTime).toFixed(2)}ms`)
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

// LOD configuration is now handled by lodStartPercent and lodIncrementPercent
// No need for addLodLevel() or resetLodLevels() - thresholds are computed automatically

// Fine-grained zoom control (1% increments)
function handleKeyDown(event: KeyboardEvent) {
  // Ctrl+ (Ctrl and Plus/Equals key) - Zoom in by 1%
  if (event.ctrlKey && (event.key === '+' || event.key === '=')) {
    event.preventDefault()
    const currentZoom = viewport.value.zoom
    const newZoom = Math.min(currentZoom + 0.01, maxZoom.value) // Use dynamic max zoom
    setViewport({
      x: viewport.value.x,
      y: viewport.value.y,
      zoom: newZoom
    })
  }

  // Ctrl- (Ctrl and Minus key) - Zoom out by 1%
  if (event.ctrlKey && event.key === '-') {
    event.preventDefault()
    const currentZoom = viewport.value.zoom
    const newZoom = Math.max(currentZoom - 0.01, 0.05) // Min zoom is 0.05
    setViewport({
      x: viewport.value.x,
      y: viewport.value.y,
      zoom: newZoom
    })
  }
}

// Register keyboard event listener and initialize layout spacing
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)

  // Initialize layout spacing with default values from UI
  setLayoutSpacing(horizontalSpacing.value, verticalSpacing.value)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

function onSpacingChange() {
  // Update layout spacing
  setLayoutSpacing(horizontalSpacing.value, verticalSpacing.value)

  // Recalculate bounding boxes and resolve overlaps
  triggerRef(nodes)
  resolveAllOverlaps(nodes.value)
  syncToVueFlow()
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

async function runStressTest() {
  console.log(`Running stress test with ${stressTestNodeCount.value} nodes using ${algorithm.value.toUpperCase()}...`)

  // Clear existing data
  clearAll()

  const startTotal = performance.now()

  // Create ONE root node at center
  const root = createNode('Root', null, 0, 0)

  // Sync to VueFlow to show root
  syncToVueFlow()
  await delay(50)

  const targetNodeCount = stressTestNodeCount.value
  let currentNodeCount = 1 // We have the root

  // Calculate number of root children based on total node count
  // Goal: Keep tree wider and shorter for larger node counts
  // Formula: rootChildrenPerSide = sqrt(targetNodeCount / 30)
  // Examples: 200 nodes → 3 children, 500 nodes → 4 children, 1000 nodes → 6 children
  const rootChildrenPerSide = Math.max(2, Math.round(Math.sqrt(targetNodeCount / 30)))
  console.log(`📊 Creating ${rootChildrenPerSide} root children per side for ${targetNodeCount} nodes`)

  // Track left and right side nodes separately for balance
  const leftSideQueue: NodeData[] = []
  const rightSideQueue: NodeData[] = []

  let level = 0

  while (currentNodeCount < targetNodeCount) {
    console.log(`\n=== Creating Level ${level + 1} ===`)
    console.log(`  Current node count: ${currentNodeCount}/${targetNodeCount}`)
    console.log(`  Left queue size: ${leftSideQueue.length}, Right queue size: ${rightSideQueue.length}`)

    const newNodesThisLevel: NodeData[] = []

    // For root level, create N children on left and N on right (proportional to total node count)
    if (level === 0) {
      const nodeHeight = 50
      const spacing = verticalSpacing.value
      const verticalStep = nodeHeight + spacing // Nodes should be spaced by height + configured spacing

      // Create left children
      for (let i = 0; i < rootChildrenPerSide && currentNodeCount < targetNodeCount; i++) {
        // Center the children vertically around root
        const childY = root.y + (i - (rootChildrenPerSide - 1) / 2) * verticalStep
        const leftChild = createNode(`L1-N${currentNodeCount}`, root.id, root.x - 200, childY)
        createEdge(root.id, leftChild.id)
        leftSideQueue.push(leftChild)
        newNodesThisLevel.push(leftChild)
        currentNodeCount++
        console.log(`  Created node ${leftChild.id} (LEFT of root) at (${leftChild.x}, ${leftChild.y})`)
      }

      // Create right children
      for (let i = 0; i < rootChildrenPerSide && currentNodeCount < targetNodeCount; i++) {
        // Center the children vertically around root
        const childY = root.y + (i - (rootChildrenPerSide - 1) / 2) * verticalStep
        const rightChild = createNode(`L1-N${currentNodeCount}`, root.id, root.x + 200, childY)
        createEdge(root.id, rightChild.id)
        rightSideQueue.push(rightChild)
        newNodesThisLevel.push(rightChild)
        currentNodeCount++
        console.log(`  Created node ${rightChild.id} (RIGHT of root) at (${rightChild.x}, ${rightChild.y})`)
      }
    } else {
      // For subsequent levels, ALTERNATE between left and right parents to maintain balance
      // This ensures if we hit the node limit, both sides are equally filled
      const leftQueueSize = leftSideQueue.length
      const rightQueueSize = rightSideQueue.length

      if (leftQueueSize === 0 && rightQueueSize === 0) {
        break // No more nodes to expand
      }

      // Process parents alternating between left and right
      const maxParents = Math.max(leftQueueSize, rightQueueSize)
      for (let i = 0; i < maxParents && currentNodeCount < targetNodeCount; i++) {
        // Process one left parent if available
        if (i < leftQueueSize && currentNodeCount < targetNodeCount) {
          const parent = leftSideQueue.shift()!

          // Get parent's CURRENT position from nodes array (after layout resolution)
          const parentNode = nodes.value.find(n => n.id === parent.id)!

          const nodeHeight = 50
          const spacing = verticalSpacing.value
          const verticalStep = nodeHeight + spacing // Nodes should be spaced by height + configured spacing

          // Create 2 children for this parent
          for (let j = 0; j < 2 && currentNodeCount < targetNodeCount; j++) {
            // Position children to the LEFT of parent's CURRENT position
            const childX = parentNode.x - 200
            const childY = parentNode.y + (j - 0.5) * verticalStep

            const child = createNode(`L${level + 1}-N${currentNodeCount}`, parent.id, childX, childY)
            createEdge(parent.id, child.id)

            leftSideQueue.push(child)
            newNodesThisLevel.push(child)
            currentNodeCount++
            console.log(`  Created node ${child.id} (LEFT side) at (${childX.toFixed(0)}, ${childY.toFixed(0)}) - parent ${parent.id} at (${parentNode.x.toFixed(0)}, ${parentNode.y.toFixed(0)})`)
          }
        }

        // Process one right parent if available
        if (i < rightQueueSize && currentNodeCount < targetNodeCount) {
          const parent = rightSideQueue.shift()!

          // Get parent's CURRENT position from nodes array (after layout resolution)
          const parentNode = nodes.value.find(n => n.id === parent.id)!

          const nodeHeight = 50
          const spacing = verticalSpacing.value
          const verticalStep = nodeHeight + spacing // Nodes should be spaced by height + configured spacing

          // Create 2 children for this parent
          for (let j = 0; j < 2 && currentNodeCount < targetNodeCount; j++) {
            // Position children to the RIGHT of parent's CURRENT position
            const childX = parentNode.x + 200
            const childY = parentNode.y + (j - 0.5) * verticalStep

            const child = createNode(`L${level + 1}-N${currentNodeCount}`, parent.id, childX, childY)
            createEdge(parent.id, child.id)

            rightSideQueue.push(child)
            newNodesThisLevel.push(child)
            currentNodeCount++
            console.log(`  Created node ${child.id} (RIGHT side) at (${childX.toFixed(0)}, ${childY.toFixed(0)}) - parent ${parent.id} at (${parentNode.x.toFixed(0)}, ${parentNode.y.toFixed(0)})`)
          }
        }
      }
    }

    // Sync to VueFlow to show new nodes
    syncToVueFlow()

    // Wait for browser to render
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))

    // Apply layout for this level
    console.log(`  Applying layout for level ${level + 1}...`)
    console.log(`  Nodes created this level: ${newNodesThisLevel.length}`)

    // IMPORTANT: Calculate layout for ALL nodes (not just LOD-visible)
    // This ensures that when we zoom in, nodes already have correct positions
    // and LOD badges have the correct size from the start
    console.log(`  Calculating layout for ALL ${nodes.value.length} nodes (including LOD-hidden)`)

    if (algorithm.value === 'rbush') {
      LayoutRBush.resolveAllOverlaps(nodes.value)
    } else {
      // Use ALL nodes for both visible and all parameters
      // This calculates positions for every node, even if LOD-hidden
      resolveOverlapsLOD(nodes.value, nodes.value)
    }

    console.log(`  Layout resolved for all nodes`)

    // Log positions AFTER layout resolution for debugging
    console.log(`  Positions after layout:`)
    for (const node of newNodesThisLevel) {
      const updatedNode = nodes.value.find(n => n.id === node.id)!
      const parent = nodes.value.find(n => n.id === updatedNode.parentId)!
      const side = updatedNode.x < parent.x ? 'LEFT' : 'RIGHT'
      console.log(`    ${node.id}: (${updatedNode.x.toFixed(0)}, ${updatedNode.y.toFixed(0)}) - ${side} of parent ${parent.id} at (${parent.x.toFixed(0)}, ${parent.y.toFixed(0)})`)
    }

    // Sync to VueFlow to show layout changes
    syncToVueFlow()

    // Wait for browser to render layout changes
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))

    level++
    console.log(`  ✓ Level ${level} complete. Total nodes: ${currentNodeCount}`)
    console.log(`  ---`)
  }

  const endTotal = performance.now()
  console.log(`\n=== Stress Test Complete ===`)
  console.log(`Created ${currentNodeCount} nodes in ${level} levels`)
  console.log(`Total time: ${(endTotal - startTotal).toFixed(2)}ms`)

  // Zoom to fit after completion
  setTimeout(() => {
    zoomToFit()
  }, 100)
}

// Helper function for async delay
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
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

.layout-loading-indicator {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  font-size: 14px;
  color: #495057;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #dee2e6;
  border-top-color: #228be6;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
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

/* Zoom Indicator */
.zoom-indicator {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.95);
  border: 2px solid #4dabf7;
  border-radius: 8px;
  padding: 12px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  min-width: 100px;
}

.zoom-value {
  font-size: 24px;
  font-weight: bold;
  color: #1971c2;
  text-align: center;
  line-height: 1;
}

.zoom-level {
  font-size: 11px;
  color: #868e96;
  text-align: center;
  margin-top: 4px;
  font-weight: 500;
}

/* LOD Section */
.lod-section {
  background: #e7f5ff;
  border: 1px solid #a5d8ff;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 20px;
}

.lod-section h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #1971c2;
}

.lod-info {
  background: white;
  border: 1px solid #a5d8ff;
  border-radius: 4px;
  padding: 10px;
  margin-top: 10px;
}

.lod-info .info-text {
  margin: 0;
  font-size: 12px;
  color: #1971c2;
  line-height: 1.6;
}

.lod-config {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #a5d8ff;
}

.lod-config h4 {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #1971c2;
  font-weight: 600;
}

.lod-config h5 {
  margin: 12px 0 6px 0;
  font-size: 12px;
  color: #495057;
  font-weight: 600;
}

.lod-preview {
  margin-top: 12px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #dee2e6;
}

.lod-preview-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.lod-preview-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #495057;
  padding: 2px 0;
}

.lod-description {
  margin: 0 0 12px 0;
  font-size: 11px;
  color: #495057;
  font-style: italic;
}

.lod-input-group {
  margin-bottom: 10px;
}

.lod-input-group label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #495057;
}

.lod-label {
  min-width: 50px;
  font-weight: 500;
  color: #1971c2;
}

.lod-hint {
  color: #868e96;
  font-size: 11px;
}

.lod-input {
  width: 70px;
  padding: 4px 8px;
  border: 1px solid #a5d8ff;
  border-radius: 4px;
  font-size: 12px;
  text-align: right;
}

.lod-unit {
  color: #868e96;
  font-size: 11px;
}

.lod-buttons {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #a5d8ff;
}

/* Display Section */
.display-section {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 20px;
}

.display-section h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #495057;
}
</style>


