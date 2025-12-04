/**
 * Bridge composable to sync MindmapView local state with documentStore
 *
 * Pattern:
 * - MindmapView maintains local NodeData[] for VueFlow (with x, y positions)
 * - documentStore maintains MindscribbleNode[] (source of truth)
 * - This composable syncs between them and emits events
 */

import type { Ref } from 'vue'
import { useDocumentStore } from 'src/core/stores/documentStore'
import { useViewEvents } from 'src/core/events'
import type { NodeData } from '../../components/mindmap/types'
import type { MindscribbleNode } from 'src/core/types'

export function useStoreSync(
  localNodes: Ref<NodeData[]>,
  syncToVueFlow: () => void
) {
  const documentStore = useDocumentStore()
  const { onStoreEvent, source } = useViewEvents('mindmap')

  // ============================================================
  // CONVERSION FUNCTIONS
  // ============================================================

  /**
   * Convert MindscribbleNode (store) to NodeData (VueFlow local)
   */
  function storeNodeToLocal(node: MindscribbleNode): NodeData {
    // Get mindmap view position or use active position
    const mindmapPos = node.views.mindmap?.position ?? node.position

    return {
      id: node.id,
      label: node.data.title,
      parentId: node.data.parentId,
      x: mindmapPos?.x ?? 0,
      y: mindmapPos?.y ?? 0,
      width: 150,  // Default width
      height: 40,  // Default height
      mindmapPosition: mindmapPos ? { x: mindmapPos.x, y: mindmapPos.y } : null,
      collapsed: node.views.mindmap?.collapsed ?? false,
      collapsedLeft: node.views.mindmap?.collapsedLeft ?? false,
      collapsedRight: node.views.mindmap?.collapsedRight ?? false,
    }
  }

  // ============================================================
  // SYNC FROM STORE TO LOCAL
  // ============================================================

  /**
   * Load all nodes from store into local state
   */
  function loadFromStore() {
    localNodes.value = documentStore.nodes.map(storeNodeToLocal)
    syncToVueFlow()
  }

  // ============================================================
  // SYNC FROM LOCAL TO STORE
  // ============================================================

  /**
   * Add a node to the store and return the created node's ID
   */
  function addNodeToStore(
    parentId: string | null,
    title: string,
    position: { x: number; y: number }
  ): string {
    const newNode = documentStore.addNode(parentId, title, '', position, source)
    return newNode.id
  }

  /**
   * Update a node's position in the store
   */
  function updateNodePositionInStore(nodeId: string, position: { x: number; y: number }) {
    documentStore.updateNodePosition(nodeId, position, source)
  }

  /**
   * Update a node's title in the store
   */
  function updateNodeTitleInStore(nodeId: string, title: string) {
    documentStore.updateNode(nodeId, { title }, source)
  }

  /**
   * Delete a node from the store
   */
  function deleteNodeFromStore(nodeId: string, deleteChildren: boolean = false) {
    documentStore.deleteNode(nodeId, deleteChildren, source)
  }

  /**
   * Select a node in the store
   */
  function selectNodeInStore(nodeId: string | null) {
    documentStore.selectNode(nodeId, source, true)
  }

  // ============================================================
  // EVENT LISTENERS
  // ============================================================

  // Listen for node selection from other views
  onStoreEvent('store:node-selected', ({ nodeId }) => {
    // Could highlight node in VueFlow here
    console.log('[MindmapView] Node selected from another view:', nodeId)
  })

  // Listen for node creation from other views
  onStoreEvent('store:node-created', ({ nodeId }) => {
    const storeNode = documentStore.nodes.find(n => n.id === nodeId)
    if (storeNode) {
      const localNode = storeNodeToLocal(storeNode)
      localNodes.value.push(localNode)
      syncToVueFlow()
    }
  })

  // Listen for node deletion from other views
  onStoreEvent('store:node-deleted', ({ deletedIds }) => {
    localNodes.value = localNodes.value.filter(n => !deletedIds.includes(n.id))
    syncToVueFlow()
  })

  // Listen for document load
  onStoreEvent('store:document-loaded', () => {
    loadFromStore()
  })

  return {
    source,
    loadFromStore,
    addNodeToStore,
    updateNodePositionInStore,
    updateNodeTitleInStore,
    deleteNodeFromStore,
    selectNodeInStore,
    storeNodeToLocal,
  }
}

