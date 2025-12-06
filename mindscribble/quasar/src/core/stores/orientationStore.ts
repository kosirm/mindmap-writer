/**
 * Orientation Store
 *
 * Manages the current orientation mode for the mindmap view.
 * Orientation affects how child nodes are ordered relative to their parent.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { OrientationMode } from 'src/features/canvas/composables/mindmap/useOrientationSort'

export const useOrientationStore = defineStore('orientation', () => {
  // Current orientation mode (default: counter-clockwise)
  const orientation = ref<OrientationMode>('counter-clockwise')

  // All available orientations
  const orientations: OrientationMode[] = ['clockwise', 'counter-clockwise', 'left-right', 'right-left']

  // Get display label for orientation
  const orientationLabels: Record<OrientationMode, string> = {
    'clockwise': 'Clockwise',
    'counter-clockwise': 'Counter-Clockwise',
    'left-right': 'Left → Right',
    'right-left': 'Right → Left'
  }

  // Get icon for orientation
  const orientationIcons: Record<OrientationMode, string> = {
    'clockwise': 'rotate_right',
    'counter-clockwise': 'rotate_left',
    'left-right': 'arrow_forward',
    'right-left': 'arrow_back'
  }

  const currentLabel = computed(() => orientationLabels[orientation.value])
  const currentIcon = computed(() => orientationIcons[orientation.value])

  function setOrientation(mode: OrientationMode) {
    orientation.value = mode
  }

  function cycleOrientation() {
    const currentIndex = orientations.indexOf(orientation.value)
    const nextIndex = (currentIndex + 1) % orientations.length
    orientation.value = orientations[nextIndex] ?? 'clockwise'
  }

  return {
    orientation,
    orientations,
    orientationLabels,
    orientationIcons,
    currentLabel,
    currentIcon,
    setOrientation,
    cycleOrientation
  }
})

