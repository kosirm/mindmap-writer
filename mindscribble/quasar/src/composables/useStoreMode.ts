/**
 * Store Mode Composable - Toggle between legacy and unified stores
 *
 * This composable provides a global state for switching between:
 * - Legacy stores (DocumentStore + MultiDocumentStore)
 * - Unified store (UnifiedDocumentStore)
 *
 * Used for testing and migration purposes.
 */

import { ref, computed } from 'vue'

export type StoreMode = 'legacy' | 'unified' | 'dual-write'

// Global state (shared across all components)
const storeMode = ref<StoreMode>('dual-write')

// Load from localStorage on init
const savedMode = localStorage.getItem('mindscribble-store-mode') as StoreMode | null
if (savedMode && ['legacy', 'unified', 'dual-write'].includes(savedMode)) {
  storeMode.value = savedMode
}

export function useStoreMode() {
  /**
   * Set the store mode
   */
  function setStoreMode(mode: StoreMode) {
    storeMode.value = mode
    localStorage.setItem('mindscribble-store-mode', mode)
    console.log(`[StoreMode] Switched to ${mode} mode`)
  }

  /**
   * Check if using legacy stores
   */
  const isLegacyMode = computed(() => storeMode.value === 'legacy')

  /**
   * Check if using unified store
   */
  const isUnifiedMode = computed(() => storeMode.value === 'unified')

  /**
   * Check if using dual-write mode (both stores)
   */
  const isDualWriteMode = computed(() => storeMode.value === 'dual-write')

  /**
   * Get current mode description
   */
  const modeDescription = computed(() => {
    switch (storeMode.value) {
      case 'legacy':
        return 'Using legacy DocumentStore + MultiDocumentStore'
      case 'unified':
        return 'Using UnifiedDocumentStore only'
      case 'dual-write':
        return 'Using both stores with synchronization'
      default:
        return 'Unknown mode'
    }
  })

  return {
    storeMode,
    setStoreMode,
    isLegacyMode,
    isUnifiedMode,
    isDualWriteMode,
    modeDescription
  }
}

