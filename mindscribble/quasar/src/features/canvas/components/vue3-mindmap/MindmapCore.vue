<template>
  <div class="vue3-mindmap-container">
    <svg ref="svgEle" class="vue3-mindmap-svg"></svg>

    <div v-if="zoom" class="button-list right-bottom">
      <button @click="centerView()"><i class="gps"></i></button>
      <button @click="fitView()"><i class="fit"></i></button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch, onUnmounted } from 'vue'
import type { PropType } from 'vue'
import type { Data } from './types/mindmap-types'
import * as d3 from 'd3'
import { Dark } from 'quasar'

export default defineComponent({
  name: 'MindmapCore',
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
      default: 84
    },
    yGap: {
      type: Number,
      default: 18
    },
    zoom: {
      type: Boolean,
      default: true
    }
  },
  emits: ['node-select'],
  setup(props, { emit }) {
    const svgEle = ref<SVGSVGElement | null>(null)

    // D3 state
    let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null
    let svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null
    let g: d3.Selection<SVGGElement, unknown, null, undefined> | null = null

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
      console.log('Center view')
    }

    const fitView = () => {
      console.log('Fit view')
    }

    const handleNodeSelect = (nodeId: string) => {
      emit('node-select', nodeId)
    }


    function createMindmap() {
      if (!svgEle.value) return

      // Initialize D3 with proper sizing
      svg = d3.select(svgEle.value)
        .attr('width', '100%')
        .attr('height', '100%')
        .style('background-color', getThemeColors().background)

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

      // Create hierarchy from data - handle empty data case
      const data = props.modelValue
      const rootData = data.length > 0 ? data[0] : { name: 'New Mindmap', children: [] }

      // Create tree layout
      const treeLayout = d3.tree<Data>()
        .nodeSize([props.xGap, props.yGap])
        .separation((a, b) => (a.parent === b.parent ? 1 : 2))

      const root = d3.hierarchy(rootData)
      const treeData = treeLayout(root as d3.HierarchyNode<Data>)

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
        .on('click', (event, d) => {
          if (d.data.id) {
            handleNodeSelect(d.data.id)
          }
        })

      // Add node circles
      node.append('circle')
        .attr('r', 10)
        .attr('fill', colors.nodeFill)
        .attr('stroke', colors.nodeStroke)
        .attr('stroke-width', 2)

      // Add node text
      node.append('text')
        .attr('dy', 3)
        .attr('x', d => d.children ? -12 : 12)
        .style('text-anchor', d => d.children ? 'end' : 'start')
        .text(d => d.data.name)
        .attr('font-size', '12px')
        .attr('fill', colors.textColor)

      // Center the view
      const svgNode = svgEle.value
      const centerX = svgNode?.clientWidth ? svgNode.clientWidth / 2 : 400
      const centerY = svgNode?.clientHeight ? svgNode.clientHeight / 2 : 300
      g.attr('transform', `translate(${centerX},${centerY})`)
    }

    onMounted(() => {
      createMindmap()
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

    // Watch for data changes
    watch(() => props.modelValue, () => {
      drawMindmap()
    }, { deep: true })

    return {
      svgEle,
      centerView,
      fitView
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
</style>
