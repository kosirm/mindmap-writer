/**
 * Context Store - Manages active panel context for focus and interaction
 *
 * Context determines which panel receives keyboard input and is visually highlighted.
 * Prevents shift-drag selection bleeding across panels.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PanelPosition } from '../types'
import { eventBus } from '../events'

export const useContextStore = defineStore('context', () => {
  // Active panel context - which panel has focus
  const activeContext = ref<PanelPosition>('center')

  // Flag to track if we're in a drag operation (for preventing text selection)
  const isDragging = ref(false)

  // Set active context
  function setContext(position: PanelPosition) {
    if (activeContext.value !== position) {
      const previousContext = activeContext.value
      activeContext.value = position

      // Emit event for views to react
      eventBus.emit('context:changed', {
        context: position,
        previous: previousContext
      })

      console.log(`Context switched: ${previousContext} → ${position}`)
    }
  }

  // Set dragging state (used for preventing text selection during canvas drag)
  function setDragging(value: boolean) {
    isDragging.value = value
  }

  // Computed helpers
  const isLeftActive = computed(() => activeContext.value === 'left')
  const isCenterActive = computed(() => activeContext.value === 'center')
  const isRightActive = computed(() => activeContext.value === 'right')

  // Get context by position
  function isActive(position: PanelPosition): boolean {
    return activeContext.value === position
  }

  // Cycle to next visible panel (used for Alt+Tab style cycling)
  function cycleContext(visiblePanels: PanelPosition[]) {
    if (visiblePanels.length === 0) return

    const currentIndex = visiblePanels.indexOf(activeContext.value)
    const nextIndex = (currentIndex + 1) % visiblePanels.length
    const nextPanel = visiblePanels[nextIndex]
    if (nextPanel) {
      setContext(nextPanel)
    }
  }

  return {
    // State
    activeContext,
    isDragging,

    // Computed
    isLeftActive,
    isCenterActive,
    isRightActive,

    // Actions
    setContext,
    setDragging,
    isActive,
    cycleContext
  }
})

