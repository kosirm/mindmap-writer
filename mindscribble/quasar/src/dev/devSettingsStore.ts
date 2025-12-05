import { defineStore } from 'pinia'
import { ref } from 'vue'

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

  return {
    // State
    showBoundingBoxes,
    showCanvasCenter,
    horizontalSpacing,
    verticalSpacing,
    // Actions
    toggleBoundingBoxes,
    toggleCanvasCenter,
    setSpacing
  }
})

