<template>
  <div class="concept-map-view">
    <!-- VueFlow Canvas with nested nodes support -->
    <div class="canvas-container">
      <VueFlow
        :nodes="vueFlowNodes"
        :edges="edges"
        :default-viewport="{ zoom: 0.8, x: 200, y: 200 }"
        :min-zoom="0.1"
        :max-zoom="2.0"
        @node-drag-start="onNodeDragStart"
        @node-drag="onNodeDrag"
        @node-drag-stop="onNodeDragStop"
        @node-context-menu="onNodeContextMenu"
        @pane-click="closeContextMenu"
      >
        <Background />
        <MiniMap pannable zoomable />

        <!-- Custom Node Template for nested nodes -->
        <template #node-custom="{ data, id }">
          <div class="concept-node">
            <div class="concept-node-header">
              {{ data.label }}
            </div>
            <div v-if="data.childCount > 0" class="concept-node-children-indicator">
              {{ data.childCount }} children
            </div>
          </div>
        </template>
      </VueFlow>

      <!-- Context Menu -->
      <div
        v-if="contextMenu.visible"
        class="context-menu"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      >
        <div class="context-menu-item" @click="addChild">
          Add Child (Nested)
        </div>
        <div class="context-menu-item" @click="addSibling">
          Add Sibling
        </div>
      </div>

      <!-- Info Panel -->
      <div class="info-panel">
        <h3>Concept Map View</h3>
        <p>Nodes are nested inside parent nodes</p>
        <p>Drag child nodes to resize parent automatically</p>
        <div class="stats">
          <div>Total Nodes: {{ nodes.length }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import type { Node, Edge } from '@vue-flow/core'
import type { NodeData } from '../types'

// Props to receive shared data from parent
const props = defineProps<{
  // We'll define these as we refactor
}>()

const { viewport } = useVueFlow()

// Local state
const nodes = ref<NodeData[]>([])
const edges = ref<Edge[]>([])
const vueFlowNodes = ref<Node[]>([])
const contextMenu = ref({ visible: false, x: 0, y: 0, nodeId: null as string | null })

// Convert NodeData to VueFlow nodes with parent support
function syncToVueFlow() {
  vueFlowNodes.value = nodes.value.map(node => {
    // Use conceptMapPosition if available, otherwise fall back to x, y
    const position = node.conceptMapPosition || { x: node.x, y: node.y }
    
    return {
      id: node.id,
      type: 'custom',
      position,
      // Set parent for nested nodes
      parentNode: node.parentId || undefined,
      // Extent: 'parent' makes child nodes stay within parent bounds
      extent: node.parentId ? 'parent' as const : undefined,
      data: {
        label: node.label,
        childCount: nodes.value.filter(n => n.parentId === node.id).length
      }
    }
  })
}

// Handle node drag - update parent size when child moves
function onNodeDrag(event: any) {
  // When dragging a child node, we need to ensure parent resizes to fit
  event.nodes.forEach((vfNode: any) => {
    const node = nodes.value.find(n => n.id === vfNode.id)
    if (node) {
      // Update position
      if (node.conceptMapPosition) {
        node.conceptMapPosition.x = vfNode.position.x
        node.conceptMapPosition.y = vfNode.position.y
      } else {
        node.x = vfNode.position.x
        node.y = vfNode.position.y
      }
    }
  })
}

function onNodeDragStart(event: any) {
  console.log('Drag start:', event)
}

function onNodeDragStop(event: any) {
  console.log('Drag stop:', event)
  // Here we would resize parent nodes to fit all children
  resizeParentNodes()
}

function resizeParentNodes() {
  // For each parent node, calculate bounding box of all children
  // and resize parent to fit
  const parentNodes = nodes.value.filter(n => 
    nodes.value.some(child => child.parentId === n.id)
  )
  
  parentNodes.forEach(parent => {
    const children = nodes.value.filter(n => n.parentId === parent.id)
    if (children.length === 0) return
    
    // Calculate bounding box
    let minX = Infinity, minY = Infinity
    let maxX = -Infinity, maxY = -Infinity
    
    children.forEach(child => {
      const pos = child.conceptMapPosition || { x: child.x, y: child.y }
      minX = Math.min(minX, pos.x)
      minY = Math.min(minY, pos.y)
      maxX = Math.max(maxX, pos.x + child.width)
      maxY = Math.max(maxY, pos.y + child.height)
    })
    
    // Add padding
    const padding = 20
    parent.width = (maxX - minX) + padding * 2
    parent.height = (maxY - minY) + padding * 2
  })
  
  syncToVueFlow()
}

function onNodeContextMenu(event: any) {
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

function addChild() {
  // Placeholder
  closeContextMenu()
}

function addSibling() {
  // Placeholder
  closeContextMenu()
}

// Initialize
syncToVueFlow()

