import { defineStore } from 'pinia'
import { ref } from 'vue'

// Edge type options for VueFlow
export type EdgeType = 'default' | 'straight' | 'step' | 'smoothstep' | 'simplebezier'

export const edgeTypeOptions: { label: string; value: EdgeType }[] = [
  { label: 'Bezier', value: 'default' },
  { label: 'Straight', value: 'straight' },
  { label: 'Step', value: 'step' },
  { label: 'Smooth Step', value: 'smoothstep' },
  { label: 'Simple Bezier', value: 'simplebezier' }
]

/**
 * Dev settings store - for development/debug settings that affect view components
 * These settings are used by MindmapView and ConceptMapView for debugging
 */
export const useDevSettingsStore = defineStore('devSettings', () => {
  // Bounding boxes
  const showBoundingBoxes = ref(false)
  const showCanvasCenter = ref(false)

  // Layout spacing (affects AABB calculations)
  const horizontalSpacing = ref(0)
  const verticalSpacing = ref(0)

  // Edge types (default is 'default' which is Bezier in VueFlow)
  const hierarchyEdgeType = ref<EdgeType>('default')
  const referenceEdgeType = ref<EdgeType>('default')

  // Actions
  function toggleBoundingBoxes() {
    showBoundingBoxes.value = !showBoundingBoxes.value
  }

  function toggleCanvasCenter() {
    showCanvasCenter.value = !showCanvasCenter.value
  }

  function setSpacing(horizontal: number, vertical: number) {
    horizontalSpacing.value = horizontal
    verticalSpacing.value = vertical
  }

  function setHierarchyEdgeType(type: EdgeType) {
    hierarchyEdgeType.value = type
  }

  function setReferenceEdgeType(type: EdgeType) {
    referenceEdgeType.value = type
  }

  return {
    // State
    showBoundingBoxes,
    showCanvasCenter,
    horizontalSpacing,
    verticalSpacing,
    hierarchyEdgeType,
    referenceEdgeType,
    // Actions
    toggleBoundingBoxes,
    toggleCanvasCenter,
    setSpacing,
    setHierarchyEdgeType,
    setReferenceEdgeType
  }
})

