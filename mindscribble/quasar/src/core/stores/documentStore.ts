/**
 * Document Store - Single source of truth for document data
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MindmapNode, MindmapEdge, OrientationMode } from '../types'

export const useDocumentStore = defineStore('document', () => {
  // Document data
  const nodes = ref<MindmapNode[]>([])
  const edges = ref<MindmapEdge[]>([])

  // Document metadata
  const currentDocumentId = ref<string | null>(null)
  const documentName = ref('Untitled')
  const documentDescription = ref('')
  const documentTags = ref<string[]>([])
  const documentCreated = ref<string>(new Date().toISOString())
  const documentModified = ref<string>(new Date().toISOString())

  // Layout settings
  const orientationMode = ref<OrientationMode>('anticlockwise')
  const horizontalSpacing = ref(50)
  const verticalSpacing = ref(20)

  // Selection state
  const selectedNodeIds = ref<string[]>([])

  // Dirty state
  const isDirty = ref(false)

  // Computed
  const selectedNodes = computed(() =>
    nodes.value.filter((n) => selectedNodeIds.value.includes(n.id))
  )

  const rootNodes = computed(() =>
    nodes.value.filter((n) => n.data.parentId === null)
  )

  // Actions
  function selectNode(nodeId: string | null) {
    if (nodeId === null) {
      selectedNodeIds.value = []
    } else {
      selectedNodeIds.value = [nodeId]
    }
  }

  function selectNodes(nodeIds: string[]) {
    selectedNodeIds.value = nodeIds
  }

  function addToSelection(nodeId: string) {
    if (!selectedNodeIds.value.includes(nodeId)) {
      selectedNodeIds.value.push(nodeId)
    }
  }

  function removeFromSelection(nodeId: string) {
    selectedNodeIds.value = selectedNodeIds.value.filter((id) => id !== nodeId)
  }

  function clearSelection() {
    selectedNodeIds.value = []
  }

  function getNodeById(nodeId: string): MindmapNode | undefined {
    return nodes.value.find((n) => n.id === nodeId)
  }

  function getChildNodes(parentId: string): MindmapNode[] {
    return nodes.value
      .filter((n) => n.data.parentId === parentId)
      .sort((a, b) => a.data.order - b.data.order)
  }

  function markDirty() {
    isDirty.value = true
    documentModified.value = new Date().toISOString()
  }

  function markClean() {
    isDirty.value = false
  }

  function clearDocument() {
    nodes.value = []
    edges.value = []
    selectedNodeIds.value = []
    currentDocumentId.value = null
    documentName.value = 'Untitled'
    documentDescription.value = ''
    documentTags.value = []
    isDirty.value = false
  }

  return {
    // State
    nodes,
    edges,
    currentDocumentId,
    documentName,
    documentDescription,
    documentTags,
    documentCreated,
    documentModified,
    orientationMode,
    horizontalSpacing,
    verticalSpacing,
    selectedNodeIds,
    isDirty,

    // Computed
    selectedNodes,
    rootNodes,

    // Actions
    selectNode,
    selectNodes,
    addToSelection,
    removeFromSelection,
    clearSelection,
    getNodeById,
    getChildNodes,
    markDirty,
    markClean,
    clearDocument
  }
})

