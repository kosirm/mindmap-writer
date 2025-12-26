<template>
  <div class="d3-conceptmap-canvas">
    <!-- D3.js canvas will be rendered here -->
    <svg ref="svgRef" class="d3-svg"></svg>

    <!-- Shield overlay to block pointer events during dockview drag -->
    <div v-if="isDraggingPanel" class="drag-shield"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, inject, type Ref } from 'vue'
import * as d3 from 'd3'
import { useUnifiedDocumentStore } from 'src/core/stores/unifiedDocumentStore'
import { useOrientationStore } from 'src/core/stores/orientationStore'
import { useAppStore } from 'src/core/stores/appStore'

defineOptions({
  name: 'D3ConceptMapView'
})

const svgRef = ref<SVGSVGElement | null>(null)
const unifiedStore = useUnifiedDocumentStore()
const orientationStore = useOrientationStore()
const appStore = useAppStore()

// Inject the drag state from FilePanel
const isDraggingPanel = inject<Ref<boolean>>('isDraggingPanel')

// Theme colors based on dark/light mode
const getThemeColors = () => {
  return {
    background: appStore.isDarkMode ? '#1e1e1e' : '#f5f5f5',
    nodeFill: appStore.isDarkMode ? '#333333' : '#ffffff',
    nodeStroke: appStore.isDarkMode ? '#666666' : '#cccccc',
    textColor: appStore.isDarkMode ? '#ffffff' : '#333333',
    placeholderColor: appStore.isDarkMode ? '#999999' : '#666666'
  }
}

// D3 state
let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null
let svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null
let g: d3.Selection<SVGGElement, unknown, null, undefined> | null = null

onMounted(() => {
  if (!svgRef.value) return

  // Initialize D3
  svg = d3.select(svgRef.value)
    .attr('width', '100%')
    .attr('height', '100%')
    .style('background-color', getThemeColors().background)

  // Create main group for zooming/panning
  g = svg.append('g')
    .attr('class', 'd3-main-group')

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

  // Ensure the document store is set to d3-concept-map view when this panel is active
  if (unifiedStore.activeDocument?.layout.activeView !== 'd3-concept-map') {
    unifiedStore.updateDocumentLayoutSettings(unifiedStore.activeDocumentId!, { activeView: 'd3-concept-map' })
  }

  // Draw initial concept map
  drawConceptMap()
})

onUnmounted(() => {
  if (zoomBehavior && svg) {
    svg.on('.zoom', null)
  }
})

function drawConceptMap() {
  if (!g || !svgRef.value) return

  // Get theme colors for this draw cycle
  const colors = getThemeColors()

  // Clear previous content
  g.selectAll('*').remove()

  // Get nodes from document store
  const nodes = unifiedStore.activeDocument?.nodes || []

  if (nodes.length === 0) {
    // Draw placeholder text if no nodes
    g.append('text')
      .attr('x', '50%')
      .attr('y', '50%')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', colors.placeholderColor)
      .attr('font-size', '16px')
      .text('D3 Concept Map - No nodes to display')
    return
  }

  // This is a basic implementation - you'll need to expand this
  // with proper D3 force layout, node rendering, edge rendering, etc.

  // For now, just draw a simple representation
  const rootNodes = nodes.filter(node => !node.data.parentId)

  rootNodes.forEach((rootNode, index) => {
    // Draw root node
    const nodeGroup = g!.append('g')
      .attr('class', 'd3-node')
      .attr('transform', `translate(100, ${100 + index * 200})`)

    nodeGroup.append('rect')
      .attr('width', 150)
      .attr('height', 50)
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('fill', colors.nodeFill)
      .attr('stroke', colors.nodeStroke)
      .attr('stroke-width', 2)

    nodeGroup.append('text')
      .attr('x', 75)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', colors.textColor)
      .attr('font-size', '14px')
      .text(rootNode.data.title || 'Root Node')
  })
}

// Watch for document changes
watch(() => unifiedStore.activeDocument?.nodes, () => {
  drawConceptMap()
}, { deep: true })

watch(() => orientationStore.orientation, () => {
  drawConceptMap()
})

// Watch for dark mode changes and redraw with new theme
watch(() => appStore.isDarkMode, () => {
  if (svg) {
    svg.style('background-color', getThemeColors().background)
  }
  drawConceptMap()
})

// Expose methods for parent component
defineExpose({
  drawConceptMap
})
</script>

<style scoped lang="scss">
.d3-conceptmap-canvas {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.d3-svg {
  width: 100%;
  height: 100%;
}

// Shield overlay to block pointer events during dockview drag
.drag-shield {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: transparent;
  pointer-events: all;
  cursor: grabbing;
}
</style>
