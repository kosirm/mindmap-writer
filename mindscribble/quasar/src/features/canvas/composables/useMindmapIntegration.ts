import { computed } from 'vue'
import { useDocumentStore } from 'src/core/stores/documentStore'
import { useViewEvents } from 'src/core/events'
import type { Data } from '../components/mindmap/types/mindmap-types'
import type { MindscribbleNode } from 'src/core/types/node'

export function useMindmapIntegration() {
  const documentStore = useDocumentStore()
  const { onStoreEvent } = useViewEvents('mindmap')

  /**
   * Transform MindScribble nodes to mindmap format
   */
  const mindmapData = computed<Data[]>(() => {
    return transformNodesToMindmapFormat(documentStore.nodes)
  })

  /**
   * Handle node selection
   */
  function handleNodeSelect(nodeId: string) {
    documentStore.selectNode(nodeId, 'mindmap', false)
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
   documentStore.setNodeSide(nodeId, newSide, 'mindmap')
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

function transformNodesToMindmapFormat(nodes: MindscribbleNode[]): Data[] {
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

  function convertNode(node: MindscribbleNode): Data {
    const children = nodes.filter(n => n.data.parentId === node.id)

    // Get side information from node data or view data
    const side = node.data.side
      || node.views.mindmap?.side
      || undefined

    return {
      name: node.data.title,
      children: children.map(convertNode),
      left: side === 'left',  // mindmap uses 'left' boolean
      collapse: node.views.mindmap?.collapsed ?? false,
      ...(node.views.mindmap || {})
    }
  }

  return rootNodes.map(convertNode)
}
