/**
 * Orientation Store - Manages mindmap layout orientation
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { OrientationMode } from 'src/core/types'

export const useOrientationStore = defineStore('orientation', () => {
  // Current orientation mode
  const mode = ref<OrientationMode>('anticlockwise')

  // Computed properties based on orientation
  const isClockwise = computed(() => mode.value === 'clockwise')
  const isAnticlockwise = computed(() => mode.value === 'anticlockwise')
  const isLeftRight = computed(() => mode.value === 'left-right')
  const isRightLeft = computed(() => mode.value === 'right-left')

  // Actions
  function setMode(newMode: OrientationMode) {
    mode.value = newMode
  }

  function cycleMode() {
    const modes: OrientationMode[] = ['clockwise', 'anticlockwise', 'counter-clockwise', 'left-right', 'right-left']
    const currentIndex = modes.indexOf(mode.value)
    const nextIndex = (currentIndex + 1) % modes.length
    mode.value = modes[nextIndex] as OrientationMode
  }

  /**
   * Get which side a child should be placed on based on order
   * This is the core logic for orientation-aware layouts
   */
  function getChildSide(childOrder: number, totalChildren: number): 'left' | 'right' {
    const halfPoint = Math.ceil(totalChildren / 2)

    switch (mode.value) {
      case 'clockwise':
        // 6,5,4 on left (top-to-bottom), 1,2,3 on right (top-to-bottom)
        return childOrder <= halfPoint ? 'right' : 'left'
      case 'anticlockwise':
      case 'counter-clockwise':
        // 1,2,3 on left (top-to-bottom), 6,5,4 on right (top-to-bottom)
        return childOrder <= halfPoint ? 'left' : 'right'
      case 'left-right':
        // 1,2,3 on left, 4,5,6 on right
        return childOrder <= halfPoint ? 'left' : 'right'
      case 'right-left':
        // 4,5,6 on left, 1,2,3 on right
        return childOrder <= halfPoint ? 'right' : 'left'
    }
  }

  return {
    // State
    mode,

    // Computed
    isClockwise,
    isAnticlockwise,
    isLeftRight,
    isRightLeft,

    // Actions
    setMode,
    cycleMode,
    getChildSide
  }
})

