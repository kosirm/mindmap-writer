/**
 * Command API Bridge
 *
 * Exposes the command system to external agents (n8n, browser automation, AI assistants).
 * This creates a global `window.mindpad` API that can be called from:
 * - n8n Execute JavaScript nodes
 * - Browser automation (Puppeteer/Playwright)
 * - Browser DevTools console
 * - Custom browser extensions
 */

import {
  executeCommand,
  isCommandAvailable,
  searchCommands,
  getAllCommands,
  getCommand,
} from './index'
import type { Command } from './types'

/**
 * Simplified command info for external consumers
 */
export interface CommandInfo {
  id: string
  label: string
  description: string | undefined
  category: string
  keybinding: string | undefined
  available: boolean
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * The public API exposed on window.mindpad
 */
export interface MindpadAPI {
  /**
   * Get API version
   */
  version: string

  /**
   * List all available commands
   * @example window.mindpad.listCommands()
   */
  listCommands: () => CommandInfo[]

  /**
   * Search commands by query
   * @example window.mindpad.searchCommands('dark mode')
   */
  searchCommands: (query: string) => CommandInfo[]

  /**
   * Get a specific command by ID
   * @example window.mindpad.getCommand('view.theme.toggle')
   */
  getCommand: (id: string) => CommandInfo | null

  /**
   * Execute a command by ID
   * @example window.mindpad.execute('view.theme.toggle')
   * @example window.mindpad.execute('node.add.child')
   */
  execute: (commandId: string) => Promise<ApiResponse>

  /**
   * Execute multiple commands in sequence
   * @example window.mindpad.executeSequence(['node.add.child', 'node.edit'])
   */
  executeSequence: (commandIds: string[], delayMs?: number) => Promise<ApiResponse>

  /**
   * Check if a command is currently available
   * @example window.mindpad.isAvailable('node.delete')
   */
  isAvailable: (commandId: string) => boolean

  /**
   * Get commands by category
   * @example window.mindpad.getByCategory('node')
   */
  getByCategory: (category: string) => CommandInfo[]

  /**
   * Subscribe to command execution events
   * @example window.mindpad.onCommandExecuted((cmd) => console.log('Executed:', cmd))
   */
  onCommandExecuted: (callback: (commandId: string) => void) => () => void
}

/**
 * Convert internal Command to public CommandInfo
 */
function toCommandInfo(cmd: Command): CommandInfo {
  return {
    id: cmd.id,
    label: cmd.label,
    description: cmd.description,
    category: cmd.category || 'general',
    keybinding: cmd.keybinding,
    available: isCommandAvailable(cmd.id),
  }
}

// Event listeners for command execution
const executionListeners: Set<(commandId: string) => void> = new Set()

/**
 * Notify listeners when a command is executed
 */
export function notifyCommandExecuted(commandId: string): void {
  executionListeners.forEach((cb) => cb(commandId))
}

/**
 * Create the public API object
 */
function createAPI(): MindpadAPI {
  return {
    version: '1.0.0',

    listCommands: () => {
      return getAllCommands()
        .filter((cmd) => cmd.showInPalette !== false)
        .map(toCommandInfo)
    },

    searchCommands: (query: string) => {
      return searchCommands(query).map(toCommandInfo)
    },

    getCommand: (id: string) => {
      const cmd = getCommand(id)
      return cmd ? toCommandInfo(cmd) : null
    },

    execute: async (commandId: string): Promise<ApiResponse> => {
      try {
        if (!isCommandAvailable(commandId)) {
          return { success: false, error: `Command '${commandId}' is not available` }
        }
        await executeCommand(commandId)
        notifyCommandExecuted(commandId)
        return { success: true, data: { commandId } }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    },

    executeSequence: async (commandIds: string[], delayMs = 100): Promise<ApiResponse> => {
      const results: string[] = []
      for (const id of commandIds) {
        if (!isCommandAvailable(id)) {
          return { success: false, error: `Command '${id}' is not available`, data: { executed: results } }
        }
        await executeCommand(id)
        notifyCommandExecuted(id)
        results.push(id)
        if (delayMs > 0) {
          await new Promise((r) => setTimeout(r, delayMs))
        }
      }
      return { success: true, data: { executed: results } }
    },

    isAvailable: (commandId: string) => isCommandAvailable(commandId),

    getByCategory: (category: string) => {
      return getAllCommands()
        .filter((cmd) => cmd.category === category)
        .map(toCommandInfo)
    },

    onCommandExecuted: (callback: (commandId: string) => void) => {
      executionListeners.add(callback)
      return () => executionListeners.delete(callback)
    },
  }
}

// Extend Window interface
declare global {
  interface Window {
    mindpad: MindpadAPI
  }
}

/**
 * Initialize the global API
 * Call this once at app startup
 */
export function initCommandAPI(): void {
  if (typeof window !== 'undefined') {
    window.mindpad = createAPI()
    // console.log('[MindPad] Command API initialized. Try: window.mindpad.listCommands()')
  }
}

