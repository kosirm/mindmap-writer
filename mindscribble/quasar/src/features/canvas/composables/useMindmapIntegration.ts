import { computed } from 'vue'
import { useUnifiedDocumentStore } from 'src/core/stores/unifiedDocumentStore'
import { useViewEvents } from 'src/core/events'
import type { Data } from '../components/mindmap/types/mindmap-types'
import type { MindpadNode } from 'src/core/types/node'

export function useMindmapIntegration() {
  // Unified store
  const unifiedStore = useUnifiedDocumentStore()

  const { onStoreEvent } = useViewEvents('mindmap')

  /**
   * Transform MindPad nodes to mindmap format
   */
  const mindmapData = computed<Data[]>(() => {
    // Access the nodes array to ensure reactivity
    const doc = unifiedStore.activeDocument
    const nodes = doc?.nodes || []
    console.log('[MindmapIntegration] Computing mindmapData (unified mode), nodes count:', nodes.length)
    return transformNodesToMindmapFormat(nodes)
  })

  /**
   * Handle node selection
   */
  function handleNodeSelect(nodeId: string) {
    unifiedStore.selectNode(nodeId, 'mindmap', false)
  }

  /**
   * Handle node operations
   */
  function handleNodeOperation(operation: 'create' | 'update' | 'delete', nodeData: unknown) {
    console.log(`Node operation: ${operation}`, nodeData)
    switch (operation) {
      case 'create':
        // Convert and create node via store
        break
      case 'update':
        // Convert and update node via store
        break
      case 'delete':
        // Delete node via store
        break
    }
  }

 /**
  * Handle node side changes
  */
 function handleNodeSideChange(nodeId: string, newSide: 'left' | 'right') {
   unifiedStore.setNodeSide(nodeId, newSide, 'mindmap')
 }

  /**
   * Setup event listeners
   */
  function setupStoreEventListeners() {
    onStoreEvent('store:node-created', ({ nodeId }) => {
      console.log('Node created:', nodeId)
      // Auto-update via computed property
    })

    onStoreEvent('store:node-updated', ({ nodeId }) => {
      console.log('Node updated:', nodeId)
      // Auto-update via computed property
    })

    onStoreEvent('store:node-deleted', () => {
      console.log('Node deleted')
      // Auto-update via computed property
    })

    onStoreEvent('store:node-selected', ({ nodeId }) => {
      console.log('Node selected:', nodeId)
      // Update mindmap selection
    })

    onStoreEvent('store:node-side-changed', ({ nodeId, newSide }) => {
      console.log('Node side changed:', nodeId, 'to', newSide)
      // Auto-update via computed property
    })
  }

  return {
    mindmapData,
    handleNodeSelect,
    handleNodeOperation,
    handleNodeSideChange,
    setupStoreEventListeners
  }
}

function transformNodesToMindmapFormat(nodes: MindpadNode[]): Data[] {
  const rootNodes = nodes.filter(node => !node.data.parentId)

  // If no root nodes exist, create a default root node
  if (rootNodes.length === 0) {
    return [{
      name: 'New Mindmap',
      children: [],
      left: false,
      collapse: false
    }]
  }

  function convertNode(node: MindpadNode, inheritedSide?: 'left' | 'right'): Data {
    const children = nodes.filter(n => n.data.parentId === node.id)
      .sort((a, b) => a.data.order - b.data.order)

    // Get side information from node data or view data
    // Depth-1 nodes have explicit side, deeper nodes inherit from parent
    const explicitSide = node.data.side || node.views.mindmap?.side
    const effectiveSide = explicitSide || inheritedSide

    return {
      id: node.id,  // Include node ID for interactions
      name: node.data.title,
      children: children.map(child => convertNode(child, effectiveSide)),  // Pass side to children
      left: effectiveSide === 'left',  // mindmap uses 'left' boolean
      collapse: node.views.mindmap?.collapsed ?? false,
      ...(node.views.mindmap || {})
    }
  }

  return rootNodes.map(node => convertNode(node))
}
