/**
 * Keyboard Shortcuts Composable
 * Handles global keyboard shortcuts
 */

import { onMounted, onUnmounted } from 'vue'
import { useCommands } from 'src/core/commands'

export function useKeyboardShortcuts() {
  const { executeCommand } = useCommands()

  // Keyboard shortcut map
  const shortcuts: Record<string, string> = {
    'Ctrl+Shift+P': 'app.openCommandPalette',
    'Ctrl+F': 'app.openSearch',
    'Ctrl+1': 'panel.toggleLeft',
    'Ctrl+2': 'panel.toggleCenter',
    'Ctrl+3': 'panel.toggleRight',
    'Ctrl+0': 'panel.toggleFocus',
    // More shortcuts will be added
  }

  function handleKeydown(event: KeyboardEvent) {
    const key = buildKeyString(event)
    const commandId = shortcuts[key]

    if (commandId) {
      event.preventDefault()
      void executeCommand(commandId)
    }
  }

  function buildKeyString(event: KeyboardEvent): string {
    const parts: string[] = []
    if (event.ctrlKey) parts.push('Ctrl')
    if (event.shiftKey) parts.push('Shift')
    if (event.altKey) parts.push('Alt')
    parts.push(event.key.toUpperCase())
    return parts.join('+')
  }

  function register() {
    window.addEventListener('keydown', handleKeydown)
  }

  function unregister() {
    window.removeEventListener('keydown', handleKeydown)
  }

  onMounted(register)
  onUnmounted(unregister)

  return {
    shortcuts,
    register,
    unregister
  }
}

