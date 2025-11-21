/**
 * Command System Types
 * 
 * Inspired by VSCode's command system, this provides a centralized
 * way to define and execute commands throughout the application.
 */

/**
 * Command category for organizing commands
 */
export type CommandCategory = 
  | 'file'      // File operations (load, save, export)
  | 'edit'      // Edit operations (undo, redo, cut, copy, paste)
  | 'view'      // View operations (zoom, layout, orientation)
  | 'selection' // Selection operations (select all, deselect)
  | 'mindmap'   // Mindmap-specific operations
  | 'writer'    // Writer-specific operations
  | 'navigation'; // Navigation operations

/**
 * Context for command execution
 * Contains information about the current state when command is executed
 */
export interface CommandContext {
  selectedNodeIds?: string[];
  activeView?: 'mindmap' | 'writer' | 'tree';
  clipboardData?: unknown;
  matterEnabled?: boolean;
  // Function references for command execution
  runD3ForceOnce?: () => void;
  toggleMatterCollisions?: () => void;
  resolveOverlapsOnce?: () => void;
  createNewMindmap?: () => void;
  showOpenDialog?: () => void;
  saveCurrentMindmap?: () => void;
  showSaveAsDialog?: () => void;
  exportAsJSON?: () => void;
  importFromJSON?: () => void;
  [key: string]: unknown;
}

/**
 * Command definition
 */
export interface Command {
  /** Unique command identifier (e.g., 'file.save', 'mindmap.addNode') */
  id: string;
  
  /** Human-readable label for the command */
  label: string;
  
  /** Optional icon (Material Icons name) */
  icon?: string;
  
  /** Command category for organization */
  category: CommandCategory;
  
  /** Optional keyboard shortcut (e.g., 'Ctrl+S', 'Shift+Enter') */
  keybinding?: string;
  
  /** Optional condition function - command is only available when this returns true */
  when?: (context?: CommandContext) => boolean;
  
  /** Command execution function */
  execute: (context?: CommandContext) => void | Promise<void>;
  
  /** Optional tooltip/description */
  tooltip?: string;
  
  /** Whether command should be visible in command palette */
  showInPalette?: boolean;
}

/**
 * Menu item group for organizing menu items with separators
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
  | 'connection'
  | 'formatting';

/**
 * Menu item definition
 */
export interface MenuItem {
  /** Command ID to execute */
  command: string;
  
  /** Optional condition expression (command ID or function) */
  when?: string | ((context?: CommandContext) => boolean);
  
  /** Optional group for organizing with separators */
  group?: MenuGroup;
  
  /** Optional submenu items (for dropdown menus) */
  submenu?: MenuItem[];
  
  /** Optional custom label (overrides command label) */
  label?: string;
  
  /** Optional custom icon (overrides command icon) */
  icon?: string;
}

/**
 * Keyboard event for keybinding matching
 */
export interface KeyboardEventInfo {
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
}

