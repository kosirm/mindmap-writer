/**
 * Composable for managing reference (non-hierarchical) edges
 * Reference edges are connections between any two nodes that don't represent parent-child relationships
 */

import { ref, type Ref } from 'vue'
import type { Edge } from '@vue-flow/core'
import { useDocumentStore } from 'src/core/stores/documentStore'

interface ReferenceEdgeParams {
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
}

export function useReferenceEdges(
  edges: Ref<Edge[]>,
  viewSource: 'mindmap' | 'conceptmap'
) {
  const documentStore = useDocumentStore()
  // Map view source to EventSource type used by the store
  const eventSource = viewSource === 'mindmap' ? 'mindmap' : 'concept-map' as const

  // Track if 'C' key is pressed (for reference connection mode)
  const isCKeyPressed = ref(false)
  const isCKeyPressedDuringConnection = ref(false)
  const isDraggingConnection = ref(false)

  /**
   * Handle keydown - track C key for reference connection mode
   */
  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'c' || event.key === 'C') {
      isCKeyPressed.value = true
    }
  }

  /**
   * Handle keyup - release C key tracking
   */
  function onKeyUp(event: KeyboardEvent) {
    if (event.key === 'c' || event.key === 'C') {
      isCKeyPressed.value = false
    }
  }

  /**
   * Handle connection start - capture if C key is pressed
   */
  function onConnectStart() {
    console.log('[useReferenceEdges] onConnectStart - isCKeyPressed:', isCKeyPressed.value)
    isDraggingConnection.value = true
    isCKeyPressedDuringConnection.value = isCKeyPressed.value
  }

  /**
   * Handle connection end - reset state
   */
  function onConnectEnd() {
    isDraggingConnection.value = false
  }

  /**
   * Handle connection - create reference edge if C key was pressed
   * Returns true if a reference edge was created, false otherwise
   */
  function onConnect(params: ReferenceEdgeParams): boolean {
    console.log('[useReferenceEdges] onConnect called:', params)
    console.log('[useReferenceEdges] isCKeyPressedDuringConnection:', isCKeyPressedDuringConnection.value)
    console.log('[useReferenceEdges] isCKeyPressed:', isCKeyPressed.value)

    isDraggingConnection.value = false

    // Only create reference edge if C key was pressed during connection
    if (!isCKeyPressedDuringConnection.value) {
      console.log('[useReferenceEdges] C key was not pressed during connection, skipping')
      isCKeyPressedDuringConnection.value = false
      return false
    }

    // Check if connection already exists (prevent duplicates)
    const connectionExists = edges.value.some(edge =>
      (edge.source === params.source && edge.target === params.target) ||
      (edge.source === params.target && edge.target === params.source)
    )

    if (connectionExists) {
      console.log('Reference connection already exists, skipping duplicate')
      isCKeyPressedDuringConnection.value = false
      return false
    }

    // Create reference edge in store (which will sync to local edges via event)
    const storeEdge = documentStore.addEdge(params.source, params.target, 'reference', eventSource)

    if (storeEdge) {
      // Also add to local edges for immediate display
      // Use null instead of undefined for handles (VueFlow expects string | null)
      const newEdge: Edge = {
        id: storeEdge.id,
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle ?? null,
        targetHandle: params.targetHandle ?? null,
        type: 'straight',
        class: 'edge-reference',
        data: {
          edgeType: 'reference'
        }
      }

      // Replace the array to trigger Vue reactivity
      edges.value = [...edges.value, newEdge]
      console.log(`Reference edge created: ${params.source} -> ${params.target}`)
      console.log('Total edges after adding reference:', edges.value.length)
    }

    isCKeyPressedDuringConnection.value = false
    return true
  }

  /**
   * Setup keyboard listeners
   */
  function setupKeyboardListeners() {
    console.log('[useReferenceEdges] Setting up keyboard listeners')
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
  }

  /**
   * Cleanup keyboard listeners
   */
  function cleanupKeyboardListeners() {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
  }

  return {
    isCKeyPressed,
    isDraggingConnection,
    onConnectStart,
    onConnectEnd,
    onConnect,
    setupKeyboardListeners,
    cleanupKeyboardListeners
  }
}

