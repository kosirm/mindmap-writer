/**
 * App Store - Global application state
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ActiveContext = 'canvas' | 'writer' | 'outline' | 'none'

export const useAppStore = defineStore('app', () => {
  // UI State
  const leftDrawerOpen = ref(false)
  const rightDrawerOpen = ref(false)
  const commandPaletteOpen = ref(false)
  const searchOpen = ref(false)

  // Active context (which view has focus)
  const activeContext = ref<ActiveContext>('canvas')

  // Online/offline status
  const isOnline = ref(navigator.onLine)

  // Theme
  const isDarkMode = ref(false)

  // Actions
  function toggleLeftDrawer() {
    leftDrawerOpen.value = !leftDrawerOpen.value
  }

  function toggleRightDrawer() {
    rightDrawerOpen.value = !rightDrawerOpen.value
  }

  function openCommandPalette() {
    commandPaletteOpen.value = true
  }

  function closeCommandPalette() {
    commandPaletteOpen.value = false
  }

  function openSearch() {
    searchOpen.value = true
  }

  function closeSearch() {
    searchOpen.value = false
  }

  function setActiveContext(context: ActiveContext) {
    activeContext.value = context
  }

  function setOnlineStatus(online: boolean) {
    isOnline.value = online
  }

  function toggleDarkMode() {
    isDarkMode.value = !isDarkMode.value
  }

  // Initialize online status listeners
  function initOnlineListeners() {
    window.addEventListener('online', () => setOnlineStatus(true))
    window.addEventListener('offline', () => setOnlineStatus(false))
  }

  return {
    // State
    leftDrawerOpen,
    rightDrawerOpen,
    commandPaletteOpen,
    searchOpen,
    activeContext,
    isOnline,
    isDarkMode,

    // Actions
    toggleLeftDrawer,
    toggleRightDrawer,
    openCommandPalette,
    closeCommandPalette,
    openSearch,
    closeSearch,
    setActiveContext,
    setOnlineStatus,
    toggleDarkMode,
    initOnlineListeners
  }
})

