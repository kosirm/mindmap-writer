/**
 * App Store - Global application state
 */

import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { Dark, LocalStorage } from 'quasar'

export type ActiveContext = 'canvas' | 'writer' | 'outline' | 'none'

const DARK_MODE_KEY = 'mindscribble-dark-mode'

export const useAppStore = defineStore('app', () => {
  // UI State
  const leftDrawerOpen = ref(false)
  const commandPaletteOpen = ref(false)
  const searchOpen = ref(false)

  // Active context (which view has focus)
  const activeContext = ref<ActiveContext>('canvas')

  // Online/offline status
  const isOnline = ref(navigator.onLine)

  // Theme - initialize from localStorage or system preference
  const savedDarkMode = LocalStorage.getItem(DARK_MODE_KEY)
  const initialDarkMode = savedDarkMode !== null
    ? savedDarkMode === true
    : window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDarkMode = ref(initialDarkMode)

  // Sync with Quasar Dark mode
  Dark.set(isDarkMode.value)

  watch(isDarkMode, (newValue) => {
    Dark.set(newValue)
    LocalStorage.set(DARK_MODE_KEY, newValue)
  })

  // Actions
  function toggleLeftDrawer() {
    leftDrawerOpen.value = !leftDrawerOpen.value
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
    commandPaletteOpen,
    searchOpen,
    activeContext,
    isOnline,
    isDarkMode,

    // Actions
    toggleLeftDrawer,
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

