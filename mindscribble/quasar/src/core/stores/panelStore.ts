/**
 * Panel Store - Manages the 3-panel layout state
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PanelPosition, PanelState, ViewType } from '../types'
import { DEFAULT_PANEL_CONFIG } from '../types/panel'

export const usePanelStore = defineStore('panel', () => {
  // Panel states
  const leftPanel = ref<PanelState>({ ...DEFAULT_PANEL_CONFIG.left })
  const centerPanel = ref<PanelState>({ ...DEFAULT_PANEL_CONFIG.center })
  const rightPanel = ref<PanelState>({ ...DEFAULT_PANEL_CONFIG.right })

  // Get panel by position
  function getPanel(position: PanelPosition): PanelState {
    switch (position) {
      case 'left':
        return leftPanel.value
      case 'center':
        return centerPanel.value
      case 'right':
        return rightPanel.value
    }
  }

  // Toggle panel collapse state
  function togglePanel(position: PanelPosition) {
    const panel = getPanel(position)
    panel.isCollapsed = !panel.isCollapsed
  }

  // Collapse panel
  function collapsePanel(position: PanelPosition) {
    getPanel(position).isCollapsed = true
  }

  // Expand panel
  function expandPanel(position: PanelPosition) {
    getPanel(position).isCollapsed = false
  }

  // Set panel view type
  function setPanelView(position: PanelPosition, viewType: ViewType) {
    getPanel(position).viewType = viewType
  }

  // Set panel width
  function setPanelWidth(position: PanelPosition, width: number) {
    const panel = getPanel(position)
    if (width >= panel.minWidth) {
      panel.width = width
    }
  }

  // Reset to default layout
  function resetLayout() {
    leftPanel.value = { ...DEFAULT_PANEL_CONFIG.left }
    centerPanel.value = { ...DEFAULT_PANEL_CONFIG.center }
    rightPanel.value = { ...DEFAULT_PANEL_CONFIG.right }
  }

  // Computed: number of visible panels
  const visiblePanelCount = computed(() => {
    let count = 0
    if (!leftPanel.value.isCollapsed) count++
    if (!centerPanel.value.isCollapsed) count++
    if (!rightPanel.value.isCollapsed) count++
    return count
  })

  // Computed: all panels collapsed except center
  const isFocusMode = computed(() => {
    return (
      leftPanel.value.isCollapsed &&
      rightPanel.value.isCollapsed &&
      !centerPanel.value.isCollapsed
    )
  })

  // Toggle focus mode (collapse left/right, expand center)
  function toggleFocusMode() {
    if (isFocusMode.value) {
      // Exit focus mode - restore default
      leftPanel.value.isCollapsed = false
      rightPanel.value.isCollapsed = false
    } else {
      // Enter focus mode
      leftPanel.value.isCollapsed = true
      rightPanel.value.isCollapsed = true
      centerPanel.value.isCollapsed = false
    }
  }

  // Save layout to localStorage
  function saveLayout() {
    const layout = {
      left: leftPanel.value,
      center: centerPanel.value,
      right: rightPanel.value
    }
    localStorage.setItem('mindpad-panel-layout', JSON.stringify(layout))
  }

  // Load layout from localStorage
  function loadLayout() {
    const saved = localStorage.getItem('mindpad-panel-layout')
    if (saved) {
      try {
        const layout = JSON.parse(saved)
        leftPanel.value = { ...DEFAULT_PANEL_CONFIG.left, ...layout.left }
        centerPanel.value = { ...DEFAULT_PANEL_CONFIG.center, ...layout.center }
        rightPanel.value = { ...DEFAULT_PANEL_CONFIG.right, ...layout.right }
      } catch (e) {
        console.error('Failed to load panel layout:', e)
      }
    }
  }

  return {
    // State
    leftPanel,
    centerPanel,
    rightPanel,

    // Getters
    getPanel,
    visiblePanelCount,
    isFocusMode,

    // Actions
    togglePanel,
    collapsePanel,
    expandPanel,
    setPanelView,
    setPanelWidth,
    resetLayout,
    toggleFocusMode,
    saveLayout,
    loadLayout
  }
})

