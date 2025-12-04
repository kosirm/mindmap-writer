/**
 * Keyboard Navigation Composable
 * Handles arrow key navigation in mindmap/tree views
 */

import { ref } from 'vue'

export function useKeyboardNavigation() {
  const isEnabled = ref(true)

  function enable() {
    isEnabled.value = true
  }

  function disable() {
    isEnabled.value = false
  }

  // Placeholder - will be implemented from vueflow-test
  function navigateUp() {
    if (!isEnabled.value) return
    console.log('Navigate up')
  }

  function navigateDown() {
    if (!isEnabled.value) return
    console.log('Navigate down')
  }

  function navigateLeft() {
    if (!isEnabled.value) return
    console.log('Navigate left')
  }

  function navigateRight() {
    if (!isEnabled.value) return
    console.log('Navigate right')
  }

  return {
    isEnabled,
    enable,
    disable,
    navigateUp,
    navigateDown,
    navigateLeft,
    navigateRight
  }
}

