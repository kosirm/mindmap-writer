/**
 * Command System Types
 *
 * VSCode-inspired command system with multiple representations:
 * - Toolbar icon
 * - Keyboard shortcut
 * - Context menu
 * - Command palette (Ctrl+Shift+P)
 */

import type { ViewType } from '../types/view'

// ============================================================================
// Command Categories
// ============================================================================

/**
 * Command category for organizing commands in palette and menus
 */
export type CommandCategory =
  | 'file' // File operations (new, open, save, export)
  | 'edit' // Edit operations (undo, redo, cut, copy, paste)
  | 'view' // View operations (zoom, layout, orientation, panels)
  | 'selection' // Selection operations (select all, deselect, invert)
  | 'node' // Node operations (add, delete, edit, move)
  | 'edge' // Edge operations (connect, disconnect)
  | 'navigation' // Navigation (focus, pan, keyboard nav)
  | 'ai' // AI operations (generate, expand, summarize)
  | 'settings' // Settings and preferences

// ============================================================================
// Command Scope - Where command is available
// ============================================================================

/**
 * Defines where a command is available
 */
export interface CommandScope {
  /** Available in these views (undefined = all views) */
  views?: ViewType[]
  /** Available in these panels (undefined = all panels) */
  panels?: ('left' | 'center' | 'right')[]
  /** Only when nodes are selected */
  requiresSelection?: boolean
  /** Only when clipboard has data */
  requiresClipboard?: boolean
  /** Only when authenticated */
  requiresAuth?: boolean
}

// ============================================================================
// Command Context - Runtime state when executing
// ============================================================================

/**
 * Context passed to command execution
 */
export interface CommandContext {
  // Selection state
  selectedNodeIds: string[]
  selectedEdgeIds: string[]

  // Active view/panel
  activeView: ViewType | null
  activePanel: 'left' | 'center' | 'right' | null

  // Document state
  documentId: string | null
  hasUnsavedChanges: boolean

  // Clipboard
  clipboardData: unknown

  // UI state
  isCommandPaletteOpen: boolean
  isEditing: boolean // Is user editing a node/text field?

  // Auth state
  isAuthenticated: boolean

  // Extended context (for custom data)
  [key: string]: unknown
}

// ============================================================================
// Command Definition
// ============================================================================

/**
 * Menu group for organizing items with separators
 */
export type MenuGroup =
  | 'navigation'
  | 'history'
  | 'clipboard'
  | 'selection'
  | 'layout'
  | 'file'
  | 'export'
  | 'node'
  | 'edge'
  | 'formatting'
  | 'ai'
  | 'settings'

/**
 * Full command definition
 */
export interface Command {
  /** Unique command identifier (e.g., 'node.add.child', 'view.zoom.in') */
  id: string

  /** Human-readable label */
  label: string

  /** Optional icon (Material Icons name) */
  icon?: string

  /** Command category for organization */
  category: CommandCategory

  /** Keyboard shortcut (e.g., 'Ctrl+S', 'Ctrl+Shift+P') */
  keybinding?: string

  /** Alternative keybindings */
  keybindingAlt?: string[]

  /** Description/tooltip */
  description?: string

  /** Search keywords for command palette */
  keywords?: string[]

  /** Menu group for organizing in menus */
  group?: MenuGroup

  /** Scope - where command is available */
  scope?: CommandScope

  /** Condition function - command available when this returns true */
  when?: (context: CommandContext) => boolean

  /** Execute function */
  execute: (context: CommandContext) => void | Promise<void>

  /** Show in command palette (default: true) */
  showInPalette?: boolean

  /** Show in context menu (default: false) */
  showInContextMenu?: boolean

  /** Sort order within category (lower = higher) */
  order?: number
}

// ============================================================================
// Menu Item Definition (for toolbars, context menus)
// ============================================================================

/**
 * Menu item referencing a command
 */
export interface MenuItem {
  /** Command ID to execute */
  commandId: string

  /** Override label */
  label?: string

  /** Override icon */
  icon?: string

  /** Submenu items */
  children?: MenuItem[]

  /** Separator before this item */
  separator?: boolean

  /** Custom when condition (in addition to command's when) */
  when?: (context: CommandContext) => boolean
}

/**
 * Menu definition (toolbar, context menu, etc.)
 */
export interface MenuDefinition {
  id: string
  label?: string
  items: MenuItem[]
}

