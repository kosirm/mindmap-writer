/**
 * Cleanup composable - Register cleanup functions to run on unmount
 */

import { onUnmounted } from 'vue'

export function useCleanup() {
  const cleanupFns: Array<() => void> = []

  function registerCleanup(fn: () => void) {
    cleanupFns.push(fn)
  }

  onUnmounted(() => {
    cleanupFns.forEach((fn) => {
      try {
        fn()
      } catch (e) {
        console.error('Cleanup error:', e)
      }
    })
  })

  return { registerCleanup }
}

