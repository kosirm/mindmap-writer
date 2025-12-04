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
        <div class="edge-type-control">
          <label>
            Edge Type:
            <select v-model="edgeType" class="edge-type-select">
              <option v-for="option in edgeTypeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
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
        <MiniMap pannable zoomable v-if="showMinimap" />

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
/**
 * MindmapView.vue - Refactored using Composables
 */

import { ref, computed, triggerRef, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import type { Node, Edge, NodeDragEvent } from '@vue-flow/core'
import CustomNode from '../components/CustomNode.vue'
import LodBadgeNode from '../components/LodBadgeNode.vue'
import type { NodeData, ContextMenuState, BoundingRect } from '../types'
import {
  calculateBoundingRect,
  resolveAllOverlaps,
  resolveOverlapsForAffectedRoots,
  resolveOverlapsLOD,
  resolveOverlapsForAffectedRootsLOD,
  getAllDescendants,
  moveNodeAndDescendants,
  setLayoutSpacing,
  getLayoutSpacing
} from '../layout'
import * as LayoutRBush from '../layout-rbush'

// Import composables
import { useNodeTree } from '../composables/useNodeTree'
import { useLOD } from '../composables/useLOD'
import { useEdgeManagement } from '../composables/useEdgeManagement'
import { useNodeOperations } from '../composables/useNodeOperations'
import { useVueFlowSync } from '../composables/useVueFlowSync'
import { useNodeDrag } from '../composables/useNodeDrag'
import { useMindmapGenerator } from '../composables/useMindmapGenerator'

// ============================================================
// VUEFLOW INSTANCE
// ============================================================

const { viewport, fitView, zoomIn, zoomOut, setViewport, vueFlowRef } = useVueFlow()

// ============================================================
// CORE STATE
// ============================================================

const nodes = ref<NodeData[]>([])
const edges = ref<Edge[]>([])
const nodeCounter = ref(1)

// UI State
const showBoundingBoxes = ref(false)
const showMinimap = ref(true)
const showCanvasCenter = ref(false)
const showZoomIndicator = ref(true)

const contextMenu = ref<ContextMenuState>({
  visible: false,
  x: 0,
  y: 0,
  nodeId: null
})

// Layout spacing state
const horizontalSpacing = ref(0)
const verticalSpacing = ref(0)

// LOD (Level of Detail) state
const lodEnabled = ref(false)
const lodStartPercent = ref(10)
const lodIncrementPercent = ref(20)

// ============================================================
// COMPOSABLES - Initialize all composables
// ============================================================

// 1. Node Tree Utilities
const {
  getDirectChildren,
  getVisibleDescendants,
  getChildrenSide,
  getNodeDepth,
  getRootNode,
  isRootNode,
  isNodeOnLeftOfRoot
} = useNodeTree(nodes)

// 2. LOD System
const {
  lodThresholds,
  maxTreeDepth,
  currentLodLevel,
  getVisibleNodesForLOD,
  calculateHiddenChildrenBounds
} = useLOD(nodes, viewport, getNodeDepth)

// Dynamic max zoom based on LOD levels
const maxZoom = computed(() => {
  if (lodThresholds.value.length === 0) return 2.0
  const lastThreshold = lodThresholds.value[lodThresholds.value.length - 1]
  return Math.min(Math.max((lastThreshold + 20) / 100, 3.0), 5.0)
})

// 3. VueFlow Sync (needs potentialParent from NodeDrag, so we'll pass a computed ref)
const potentialParentRef = ref<string | null>(null)

const {
  vueFlowNodes,
  measureNodeDimensions,
  updateNodeDimensionsFromDOM,
  syncToVueFlow,
  syncFromVueFlow
} = useVueFlowSync(
  nodes,
  edges,
  viewport,
  lodEnabled,
  potentialParentRef,
  getVisibleNodesForLOD,
  calculateHiddenChildrenBounds,
  getDirectChildren,
  getChildrenSide,
  getNodeDepth,
  currentLodLevel
)

// 4. Edge Management
const {
  edgeType,
  edgeTypeOptions,
  visibleEdges,
  updateEdgeHandles,
  updateEdgesForBranch,
  createEdge
} = useEdgeManagement(
  nodes,
  edges,
  vueFlowNodes,
  getRootNode,
  isNodeOnLeftOfRoot
)

// 5. Node Drag
const {
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
} = useNodeDrag(
  nodes,
  viewport,
  getRootNode,
  getAllDescendants,
  getVisibleNodesForLOD,
  updateEdgesForBranch,
  () => {}, // reparentNode - will be provided by NodeOperations
  syncToVueFlow,
  syncFromVueFlow,
  resolveAllOverlaps,
  resolveOverlapsForAffectedRootsLOD
)

// Sync potentialParent to the ref used by VueFlowSync
watch(potentialParent, (newVal) => {
  potentialParentRef.value = newVal
})

// 6. Node Operations
const {
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
} = useNodeOperations(
  nodes,
  edges,
  contextMenu,
  nodeCounter,
  viewport,
  getDirectChildren,
  getRootNode,
  getAllDescendants,
  createEdge,
  updateEdgesForBranch,
  syncToVueFlow,
  updateNodeDimensionsFromDOM,
  resolveAllOverlaps
)

// 7. Mindmap Generator
const {
  algorithm,
  generatorNodeCount: stressTestNodeCount,
  lastPerformance,
  generateNodeTree: generateTestData,
  clearAllNodes: clearAll,
  generateAndLayoutMindmap: runStressTest,
  createNode,
  delay
} = useMindmapGenerator(
  nodes,
  edges,
  nodeCounter,
  viewport,
  verticalSpacing,
  vueFlowNodes,
  createEdge,
  syncToVueFlow,
  updateNodeDimensionsFromDOM,
  resolveAllOverlaps,
  () => fitView({ duration: 300, padding: 0.2 })
)

// ============================================================
// COMPUTED PROPERTIES
// ============================================================

// Compute viewport transform for SVG
const viewportTransform = computed(() => {
  const { x, y, zoom } = viewport.value
  return `translate(${x}px, ${y}px) scale(${zoom})`
})

// Calculate bounding boxes for visualization
const boundingBoxes = computed<BoundingRect[]>(() => {
  if (!showBoundingBoxes.value) return []
  const currentNodes = nodes.value
  return currentNodes.map(node => calculateBoundingRect(node, currentNodes))
})

// Get root nodes
const rootNodes = computed(() => nodes.value.filter(n => n.parentId === null))

// Count rendered nodes (for performance monitoring)
const renderedNodeCount = computed(() => {
  return vueFlowNodes.value.filter(n => n.computed?.visible !== false).length
})

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function recalculateBoundingBoxes() {
  triggerRef(nodes)
}

// ============================================================
// EVENT HANDLERS
// ============================================================

function onNodeContextMenu(event: { event: MouseEvent; node: Node }) {
  event.event.preventDefault()
  contextMenu.value = {
    visible: true,
    x: event.event.clientX,
    y: event.event.clientY,
    nodeId: event.node.id
  }
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

// Fine-grained zoom control (1% increments)
function handleKeyDown(event: KeyboardEvent) {
  // Ctrl+ (Ctrl and Plus/Equals key) - Zoom in by 1%
  if (event.ctrlKey && (event.key === '+' || event.key === '=')) {
    event.preventDefault()
    const currentZoom = viewport.value.zoom
    const newZoom = Math.min(currentZoom * 1.01, maxZoom.value)
    setViewport({ ...viewport.value, zoom: newZoom })
  }
  // Ctrl- (Ctrl and Minus key) - Zoom out by 1%
  else if (event.ctrlKey && event.key === '-') {
    event.preventDefault()
    const currentZoom = viewport.value.zoom
    const newZoom = Math.max(currentZoom * 0.99, 0.05)
    setViewport({ ...viewport.value, zoom: newZoom })
  }
}

// ============================================================
// LIFECYCLE HOOKS
// ============================================================

onMounted(() => {
  // Initialize layout spacing
  setLayoutSpacing(horizontalSpacing.value, verticalSpacing.value)

  // Add keyboard event listener
  window.addEventListener('keydown', handleKeyDown)

  console.log('MindmapView mounted')
})

onUnmounted(() => {
  // Remove keyboard event listener
  window.removeEventListener('keydown', handleKeyDown)

  console.log('MindmapView unmounted')
})


</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  width: 100%;
  height: 100%;
  min-height: 0; /* Critical for nested flex containers */
  overflow: hidden;
  position: relative;
}

.controls-panel {
  width: 300px;
  flex-shrink: 0;
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
  min-width: 0;
  height: 100%;
  position: relative;
  background: #fafafa;
  overflow: hidden;
}

.canvas-container .vue-flow {
  width: 100%;
  height: 100%;
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

.edge-type-control {
  margin-top: 15px;
}

.edge-type-control label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
  color: #495057;
  font-weight: 500;
}

.edge-type-select {
  padding: 8px 12px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  background: white;
  font-size: 14px;
  color: #212529;
  cursor: pointer;
  transition: border-color 0.2s;
}

.edge-type-select:hover {
  border-color: #adb5bd;
}

.edge-type-select:focus {
  outline: none;
  border-color: #4dabf7;
  box-shadow: 0 0 0 3px rgba(77, 171, 247, 0.1);
}
</style>