/**
 * App Store - Global application state
 */

import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { Dark, LocalStorage } from 'quasar'
import type { SubscriptionPlan } from '../types'

export type ActiveContext = 'canvas' | 'writer' | 'outline' | 'none'

const DARK_MODE_KEY = 'mindpad-dark-mode'

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

  // Subscription state - initialize with enterprise for development
  const currentSubscriptionPlan = ref<SubscriptionPlan>('enterprise')

  // IndexedDB initialization state
  const indexedDBInitialized = ref(false)
  const indexedDBError = ref<string | null>(null)

  // Sync with Quasar Dark mode
  Dark.set(isDarkMode.value)
  // console.log('🎨 [AppStore] Initial dark mode:', isDarkMode.value)

  watch(isDarkMode, (newValue) => {
    // console.log('🎨 [AppStore] Dark mode changed to:', newValue)
    Dark.set(newValue)
    LocalStorage.set(DARK_MODE_KEY, newValue)
    // console.log('🎨 [AppStore] Quasar Dark.isActive:', Dark.isActive)
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
    // console.log('🎨 [AppStore] toggleDarkMode called, current value:', isDarkMode.value)
    isDarkMode.value = !isDarkMode.value
    // console.log('🎨 [AppStore] toggleDarkMode new value:', isDarkMode.value)
  }

  /**
   * Set subscription plan (for dev testing)
   */
  function setSubscriptionPlan(plan: SubscriptionPlan) {
    currentSubscriptionPlan.value = plan
    console.log(`[AppStore] Subscription plan set to: ${plan}`)
  }

  /**
   * Set IndexedDB initialization status
   */
  function setIndexedDBInitialized(initialized: boolean) {
    indexedDBInitialized.value = initialized
    console.log(`[AppStore] IndexedDB initialized: ${initialized}`)
  }

  /**
   * Set IndexedDB error
   */
  function setIndexedDBError(error: string | null) {
    indexedDBError.value = error
    if (error) {
      console.error(`[AppStore] IndexedDB error: ${error}`)
    }
  }

  // Initialize online status listeners
  function initOnlineListeners() {
    window.addEventListener('online', () => setOnlineStatus(true))
    window.addEventListener('offline', () => setOnlineStatus(false))
  }

  // Helper function to get dockview theme class name
  function getDockviewThemeClass() {
    return isDarkMode.value ? 'dockview-theme-abyss' : 'dockview-theme-light'
  }

  return {
    // State
    leftDrawerOpen,
    commandPaletteOpen,
    searchOpen,
    activeContext,
    isOnline,
    isDarkMode,
    currentSubscriptionPlan,
    indexedDBInitialized,
    indexedDBError,

    // Actions
    toggleLeftDrawer,
    openCommandPalette,
    closeCommandPalette,
    openSearch,
    closeSearch,
    setActiveContext,
    setOnlineStatus,
    toggleDarkMode,
    setSubscriptionPlan,
    setIndexedDBInitialized,
    setIndexedDBError,
    initOnlineListeners,
    getDockviewThemeClass
  }
})

