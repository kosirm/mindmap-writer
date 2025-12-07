/**
 * Command System
 *
 * VSCode-inspired centralized command registry with multiple representations:
 * - Toolbar icons
 * - Keyboard shortcuts
 * - Context menus
 * - Command palette (Ctrl+Shift+P)
 *
 * Every user action goes through commands for consistency and discoverability.
 */

import { ref, computed, shallowRef } from 'vue'
import type { Command, CommandContext, CommandCategory } from './types'

// Re-export types
export * from './types'

// Re-export API
export { initCommandAPI } from './api'

// ============================================================================
// Global Command Registry (Singleton)
// ============================================================================

/** All registered commands */
const commands = shallowRef<Map<string, Command>>(new Map())

/** Current command context */
const context = ref<CommandContext>(createDefaultContext())

/** Recently executed commands (for quick access) */
const recentCommandIds = ref<string[]>([])

/** Starred/pinned commands (user favorites) */
const starredCommandIds = ref<string[]>([])

/** Maximum recent commands to track */
const MAX_RECENT_COMMANDS = 10

// ============================================================================
// Default Context
// ============================================================================

function createDefaultContext(): CommandContext {
  return {
    selectedNodeIds: [],
    selectedEdgeIds: [],
    activeView: null,
    activePanel: null,
    documentId: null,
    hasUnsavedChanges: false,
    clipboardData: null,
    isCommandPaletteOpen: false,
    isEditing: false,
    isAuthenticated: false,
  }
}

// ============================================================================
// Keybinding Utilities
// ============================================================================

interface ParsedKeybinding {
  key: string
  ctrl: boolean
  shift: boolean
  alt: boolean
  meta: boolean
}

/**
 * Parse keybinding string to structured format
 * e.g., 'Ctrl+Shift+P' -> { key: 'p', ctrl: true, shift: true, alt: false, meta: false }
 */
function parseKeybinding(keybinding: string): ParsedKeybinding {
  const parts = keybinding.toLowerCase().split('+')
  const key = parts[parts.length - 1] || ''

  return {
    key,
    ctrl: parts.includes('ctrl') || parts.includes('control'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    meta: parts.includes('meta') || parts.includes('cmd'),
  }
}

/**
 * Check if keyboard event matches a keybinding
 */
function matchesKeybinding(event: KeyboardEvent, keybinding: string): boolean {
  const parsed = parseKeybinding(keybinding)

  return (
    event.key.toLowerCase() === parsed.key &&
    event.ctrlKey === parsed.ctrl &&
    event.shiftKey === parsed.shift &&
    event.altKey === parsed.alt &&
    event.metaKey === parsed.meta
  )
}

// ============================================================================
// Registry Functions
// ============================================================================

/**
 * Register a command
 */
export function registerCommand(command: Command): void {
  const newMap = new Map(commands.value)
  newMap.set(command.id, command)
  commands.value = newMap
}

/**
 * Register multiple commands
 */
export function registerCommands(commandList: Command[]): void {
  const newMap = new Map(commands.value)
  commandList.forEach((cmd) => newMap.set(cmd.id, cmd))
  commands.value = newMap
}

/**
 * Unregister a command
 */
export function unregisterCommand(commandId: string): void {
  const newMap = new Map(commands.value)
  newMap.delete(commandId)
  commands.value = newMap
}

/**
 * Get a command by ID
 */
export function getCommand(commandId: string): Command | undefined {
  return commands.value.get(commandId)
}

/**
 * Get all registered commands
 */
export function getAllCommands(): Command[] {
  return Array.from(commands.value.values())
}

/**
 * Get commands by category
 */
export function getCommandsByCategory(category: CommandCategory): Command[] {
  return getAllCommands()
    .filter((cmd) => cmd.category === category)
    .sort((a, b) => (a.order ?? 100) - (b.order ?? 100))
}

/**
 * Get commands for a specific view
 */
export function getCommandsForView(viewType: string): Command[] {
  return getAllCommands().filter((cmd) => {
    if (!cmd.scope?.views) return true // Available in all views
    return cmd.scope.views.includes(viewType as never)
  })
}

/**
 * Get commands that can show in command palette
 */
export function getPaletteCommands(): Command[] {
  return getAllCommands().filter((cmd) => cmd.showInPalette !== false)
}

/**
 * Get commands that can show in context menu
 */
export function getContextMenuCommands(): Command[] {
  return getAllCommands().filter((cmd) => cmd.showInContextMenu === true)
}

// ============================================================================
// Command Availability
// ============================================================================

/**
 * Check if a command is available in current context
 */
export function isCommandAvailable(
  commandId: string,
  ctx?: CommandContext
): boolean {
  const command = getCommand(commandId)
  if (!command) return false

  const currentContext = ctx ?? context.value

  // Check scope requirements
  if (command.scope) {
    const { scope } = command

    // Check view scope
    if (scope.views && currentContext.activeView) {
      if (!scope.views.includes(currentContext.activeView)) {
        return false
      }
    }

    // Check panel scope
    if (scope.panels && currentContext.activePanel) {
      if (!scope.panels.includes(currentContext.activePanel)) {
        return false
      }
    }

    // Check selection requirement
    if (scope.requiresSelection && currentContext.selectedNodeIds.length === 0) {
      return false
    }

    // Check clipboard requirement
    if (scope.requiresClipboard && !currentContext.clipboardData) {
      return false
    }

    // Check auth requirement
    if (scope.requiresAuth && !currentContext.isAuthenticated) {
      return false
    }
  }

  // Check custom when condition
  if (command.when && !command.when(currentContext)) {
    return false
  }

  return true
}

// ============================================================================
// Command Execution
// ============================================================================

/**
 * Execute a command by ID
 */
export async function executeCommand(
  commandId: string,
  ctx?: CommandContext
): Promise<boolean> {
  const command = getCommand(commandId)
  if (!command) {
    console.warn(`[Commands] Command not found: ${commandId}`)
    return false
  }

  const currentContext = ctx ?? context.value

  if (!isCommandAvailable(commandId, currentContext)) {
    console.warn(`[Commands] Command not available: ${commandId}`)
    return false
  }

  try {
    await command.execute(currentContext)

    // Track as recent (don't track palette open command)
    if (commandId !== 'palette.open') {
      addToRecent(commandId)
    }

    return true
  } catch (error) {
    console.error(`[Commands] Error executing ${commandId}:`, error)
    return false
  }
}

// ============================================================================
// Context Management
// ============================================================================

/**
 * Update command context
 */
export function updateContext(updates: Partial<CommandContext>): void {
  context.value = { ...context.value, ...updates }
}

/**
 * Get current command context
 */
export function getContext(): CommandContext {
  return context.value
}

/**
 * Reset context to defaults
 */
export function resetContext(): void {
  context.value = createDefaultContext()
}

// ============================================================================
// Recent & Starred Commands
// ============================================================================

function addToRecent(commandId: string): void {
  const filtered = recentCommandIds.value.filter((id) => id !== commandId)
  recentCommandIds.value = [commandId, ...filtered].slice(0, MAX_RECENT_COMMANDS)
}

export function getRecentCommands(): Command[] {
  return recentCommandIds.value
    .map((id) => getCommand(id))
    .filter((cmd): cmd is Command => cmd !== undefined)
}

export function toggleStarred(commandId: string): void {
  const idx = starredCommandIds.value.indexOf(commandId)
  if (idx >= 0) {
    starredCommandIds.value.splice(idx, 1)
  } else {
    starredCommandIds.value.push(commandId)
  }
}

export function isStarred(commandId: string): boolean {
  return starredCommandIds.value.includes(commandId)
}

export function getStarredCommands(): Command[] {
  return starredCommandIds.value
    .map((id) => getCommand(id))
    .filter((cmd): cmd is Command => cmd !== undefined)
}

// ============================================================================
// Search
// ============================================================================

/**
 * Search commands by query
 * Searches in: label, id, description, keywords
 */
export function searchCommands(query: string): Command[] {
  if (!query.trim()) {
    return getPaletteCommands()
  }

  const lowerQuery = query.toLowerCase()

  return getPaletteCommands()
    .filter((cmd) => {
      // Search in label
      if (cmd.label.toLowerCase().includes(lowerQuery)) return true

      // Search in id
      if (cmd.id.toLowerCase().includes(lowerQuery)) return true

      // Search in description
      if (cmd.description?.toLowerCase().includes(lowerQuery)) return true

      // Search in keywords
      if (cmd.keywords?.some((kw) => kw.toLowerCase().includes(lowerQuery))) {
        return true
      }

      return false
    })
    .sort((a, b) => {
      // Prioritize starred
      const aStarred = isStarred(a.id)
      const bStarred = isStarred(b.id)
      if (aStarred && !bStarred) return -1
      if (!aStarred && bStarred) return 1

      // Then by label match quality
      const aLabelMatch = a.label.toLowerCase().startsWith(lowerQuery)
      const bLabelMatch = b.label.toLowerCase().startsWith(lowerQuery)
      if (aLabelMatch && !bLabelMatch) return -1
      if (!aLabelMatch && bLabelMatch) return 1

      // Finally alphabetically
      return a.label.localeCompare(b.label)
    })
}

// ============================================================================
// Keybinding Handling
// ============================================================================

/**
 * Find command that matches a keyboard event
 */
export function findCommandByKeybinding(event: KeyboardEvent): Command | undefined {
  return getAllCommands().find((cmd) => {
    // Check primary keybinding
    if (cmd.keybinding && matchesKeybinding(event, cmd.keybinding)) {
      return true
    }

    // Check alternative keybindings
    if (cmd.keybindingAlt) {
      return cmd.keybindingAlt.some((kb) => matchesKeybinding(event, kb))
    }

    return false
  })
}

/**
 * Commands that should always prevent browser default behavior
 * even if the command itself is not available (e.g., user not authenticated)
 */
const ALWAYS_PREVENT_DEFAULT = ['file.save', 'file.open', 'file.new']

/**
 * Handle keyboard event - find and execute matching command
 * Returns true if a command was executed
 */
export function handleKeyboardEvent(event: KeyboardEvent): boolean {
  // Don't handle if user is typing in an input
  const target = event.target as HTMLElement
  if (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  ) {
    // Still handle some shortcuts even in inputs
    const command = findCommandByKeybinding(event)
    if (command && ['palette.open', 'file.save'].includes(command.id)) {
      event.preventDefault()
      void executeCommand(command.id)
      return true
    }
    return false
  }

  const command = findCommandByKeybinding(event)
  if (command) {
    // Always prevent browser default for certain shortcuts (like Ctrl+S)
    if (ALWAYS_PREVENT_DEFAULT.includes(command.id)) {
      event.preventDefault()
    }

    if (isCommandAvailable(command.id)) {
      event.preventDefault()
      void executeCommand(command.id)
      return true
    }
  }

  return false
}

// ============================================================================
// Vue Composable
// ============================================================================

/**
 * Composable for using command system in Vue components
 */
export function useCommands() {
  return {
    // State (reactive)
    commands: computed(() => getAllCommands()),
    context: computed(() => context.value),
    recentCommands: computed(() => getRecentCommands()),
    starredCommands: computed(() => getStarredCommands()),

    // Registration
    registerCommand,
    registerCommands,
    unregisterCommand,

    // Query
    getCommand,
    getAllCommands,
    getCommandsByCategory,
    getCommandsForView,
    getPaletteCommands,
    getContextMenuCommands,
    searchCommands,

    // Availability
    isCommandAvailable,

    // Execution
    executeCommand,

    // Context
    updateContext,
    getContext,
    resetContext,

    // Starred
    toggleStarred,
    isStarred,

    // Keybindings
    findCommandByKeybinding,
    handleKeyboardEvent,
  }
}

