<template>
  <div class="mindmap-canvas">
    <VueFlow
      ref="vueFlowRef"
      :nodes="vueFlowNodes"
      :edges="visibleEdges"
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
      <MiniMap pannable zoomable v-if="showMinimap" />

      <template #node-custom="{ data, id }">
        <CustomNode
          :data="data"
          @toggle-collapse="toggleCollapse(id)"
          @toggle-collapse-left="toggleCollapseLeft(id)"
          @toggle-collapse-right="toggleCollapseRight(id)"
        />
      </template>

      <template #node-lod-badge="{ data }">
        <LodBadgeNode :data="data" />
      </template>
    </VueFlow>

    <!-- SVG Overlay for bounding boxes -->
    <svg class="canvas-overlay" v-if="showBoundingBoxes || showCanvasCenter">
      <g :style="{ transform: viewportTransform }">
        <g v-if="showCanvasCenter">
          <line x1="-20" y1="0" x2="20" y2="0" stroke="#ff6b6b" stroke-width="2" />
          <line x1="0" y1="-20" x2="0" y2="20" stroke="#ff6b6b" stroke-width="2" />
          <circle cx="0" cy="0" r="3" fill="#ff6b6b" />
        </g>
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
        </g>
      </g>
    </svg>

    <!-- Context Menu -->
    <div v-if="contextMenu.visible" class="context-menu" :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }">
      <template v-if="isRootNode(contextMenu.nodeId)">
        <div class="context-menu-item" @click="addChildLeft">Add Child Left</div>
        <div class="context-menu-item" @click="addChildRight">Add Child Right</div>
      </template>
      <template v-else>
        <div class="context-menu-item" @click="addChild">Add Child</div>
        <div class="context-menu-item context-menu-item-danger" @click="detachNode">Detach from Parent</div>
      </template>
      <div class="context-menu-item" @click="addSibling">Add Sibling</div>
    </div>

    <!-- Zoom Indicator -->
    <div v-if="showZoomIndicator" class="zoom-indicator">
      <div class="zoom-value">{{ zoomPercent }}%</div>
      <div class="zoom-level" v-if="lodEnabled">LOD: {{ currentLodLevel }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import type { Node, Edge, NodeMouseEvent } from '@vue-flow/core'
import CustomNode from './CustomNode.vue'
import LodBadgeNode from './LodBadgeNode.vue'
import type { NodeData, ContextMenuState, BoundingRect } from './types'
import { calculateBoundingRect, resolveAllOverlaps, resolveOverlapsForAffectedRootsLOD, setLayoutSpacing, getAllDescendants } from './layout'

// Import composables
import { useNodeTree } from '../../composables/mindmap/useNodeTree'
import { useLOD } from '../../composables/mindmap/useLOD'
import { useEdgeManagement } from '../../composables/mindmap/useEdgeManagement'
import { useNodeOperations } from '../../composables/mindmap/useNodeOperations'
import { useVueFlowSync } from '../../composables/mindmap/useVueFlowSync'
import { useNodeDrag } from '../../composables/mindmap/useNodeDrag'
import { useMindmapGenerator } from '../../composables/mindmap/useMindmapGenerator'
import { useMindmapLayout } from '../../composables/mindmap/useMindmapLayout'

// VueFlow instance
const { viewport, fitView, setViewport } = useVueFlow()

// Core state
const nodes = ref<NodeData[]>([])
const edges = ref<Edge[]>([])
const nodeCounter = ref(1)

// UI state
const showBoundingBoxes = ref(false)
const showMinimap = ref(true)
const showCanvasCenter = ref(false)
const showZoomIndicator = ref(true)
const horizontalSpacing = ref(0)
const verticalSpacing = ref(0)

const contextMenu = ref<ContextMenuState>({ visible: false, x: 0, y: 0, nodeId: null })

// Composables initialization
const { getDirectChildren, getChildrenSide, getNodeDepth, getRootNode, isRootNode, isNodeOnLeftOfRoot } = useNodeTree(nodes)

const { lodEnabled, lodThresholds, maxTreeDepth, currentLodLevel, getVisibleNodesForLOD, calculateHiddenChildrenBounds } = useLOD(nodes, viewport, getNodeDepth)

const maxZoom = computed(() => {
  if (lodThresholds.value.length === 0) return 2.0
  const lastThreshold = lodThresholds.value[lodThresholds.value.length - 1]
  if (lastThreshold === undefined) return 2.0
  return Math.min(Math.max((lastThreshold + 20) / 100, 3.0), 5.0)
})

const potentialParentRef = ref<string | null>(null)

const { vueFlowNodes, updateNodeDimensionsFromDOM, syncToVueFlow, syncFromVueFlow } = useVueFlowSync(
  nodes, edges, viewport, lodEnabled, potentialParentRef, getVisibleNodesForLOD,
  calculateHiddenChildrenBounds, getDirectChildren, getChildrenSide, getNodeDepth, currentLodLevel
)

const { edgeType, edgeTypeOptions, visibleEdges, updateEdgesForBranch, updateAllEdgeHandles, createEdge } = useEdgeManagement(
  nodes, edges, vueFlowNodes, getRootNode, isNodeOnLeftOfRoot
)

const { potentialParent, onPaneMouseMove, onNodeDragStart, onNodeDrag, onNodeDragStop } = useNodeDrag(
  nodes, viewport, getRootNode, getAllDescendants, getVisibleNodesForLOD, updateEdgesForBranch,
  () => {}, syncToVueFlow, syncFromVueFlow, resolveAllOverlaps, resolveOverlapsForAffectedRootsLOD
)

watch(potentialParent, (newVal) => { potentialParentRef.value = newVal })

const { closeContextMenu, toggleCollapse, toggleCollapseLeft, toggleCollapseRight, addRootNode, addChildLeft, addChildRight, addChild, addSibling, detachNode } = useNodeOperations(
  nodes, edges, contextMenu, nodeCounter, viewport, getDirectChildren, getRootNode, getAllDescendants,
  createEdge, updateEdgesForBranch, syncToVueFlow, updateNodeDimensionsFromDOM, resolveAllOverlaps
)

const { algorithm, generatorNodeCount, lastPerformance, generateNodeTree, clearAllNodes, generateAndLayoutMindmap } = useMindmapGenerator(
  nodes, edges, nodeCounter, viewport, verticalSpacing, vueFlowNodes, createEdge, syncToVueFlow,
  updateNodeDimensionsFromDOM, resolveAllOverlaps, () => { void fitView({ duration: 300, padding: 0.2 }) }
)

const { initializeLayout: initializeMindmapLayout } = useMindmapLayout(nodes, getDirectChildren, getRootNode)

// Computed
const viewportTransform = computed(() => `translate(${viewport.value.x}px, ${viewport.value.y}px) scale(${viewport.value.zoom})`)
const boundingBoxes = computed<BoundingRect[]>(() => showBoundingBoxes.value ? nodes.value.map(node => calculateBoundingRect(node, nodes.value)) : [])
const rootNodes = computed(() => nodes.value.filter(n => n.parentId === null))
const renderedNodeCount = computed(() => vueFlowNodes.value.filter(n => (n as Node & { computed?: { visible?: boolean } }).computed?.visible !== false).length)
const zoomPercent = computed(() => Math.round(viewport.value.zoom * 100))

// Event handlers
function onNodeContextMenu(event: NodeMouseEvent) {
  if ('clientX' in event.event) {
    event.event.preventDefault()
    contextMenu.value = { visible: true, x: event.event.clientX, y: event.event.clientY, nodeId: event.node.id }
  }
}

// Expose methods and state to parent
defineExpose({
  nodes, edges, viewport, showBoundingBoxes, showMinimap, showCanvasCenter, showZoomIndicator, lodEnabled,
  horizontalSpacing, verticalSpacing, maxTreeDepth, currentLodLevel, zoomPercent, rootNodes, renderedNodeCount,
  algorithm, generatorNodeCount, lastPerformance, edgeType, edgeTypeOptions,
  addRootNode, generateNodeTree, clearAllNodes, generateAndLayoutMindmap, syncToVueFlow, resolveAllOverlaps: () => { resolveAllOverlaps(nodes.value); syncToVueFlow() },
  fitView: () => fitView({ padding: 0.2, duration: 300 }),
  setSpacing: (h: number, v: number) => { horizontalSpacing.value = h; verticalSpacing.value = v; setLayoutSpacing(h, v); resolveAllOverlaps(nodes.value); syncToVueFlow() },
  initializeMindmapLayout,
  updateAllEdgeHandles
})

onMounted(async () => {
  setLayoutSpacing(horizontalSpacing.value, verticalSpacing.value)
  // Initialize with a root node
  console.log('MindmapView mounted, creating initial root node...')
  await addRootNode()
  console.log('Initial root node created, nodes:', nodes.value.length, 'vueFlowNodes:', vueFlowNodes.value.length)
  // Center view on the node after it's rendered - wait for VueFlow to be ready
  await nextTick()
  // Get the VueFlow container dimensions
  const vueFlowContainer = document.querySelector('.vue-flow')
  if (vueFlowContainer) {
    const rect = vueFlowContainer.getBoundingClientRect()
    // Set viewport so canvas origin (0,0) is at center of container, at 100% zoom
    void setViewport({ x: rect.width / 2, y: rect.height / 2, zoom: 1 }, { duration: 0 })
  }
})
</script>

<style scoped>
.mindmap-canvas {
  width: 100%;
  height: 100%;
  flex: 1;
  min-height: 0;
  position: relative;
  display: flex;
  flex-direction: column;
}

.mindmap-canvas :deep(.vue-flow) {
  flex: 1;
  min-height: 0;
}

.canvas-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
}

.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  z-index: 1000;
  min-width: 150px;
}

.context-menu-item {
  padding: 8px 16px;
  cursor: pointer;
}

.context-menu-item:hover {
  background: #f0f0f0;
}

.context-menu-item-danger {
  color: #dc3545;
}

.zoom-indicator {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(255,255,255,0.9);
  padding: 8px 12px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  font-size: 14px;
  z-index: 10;
}
</style>

