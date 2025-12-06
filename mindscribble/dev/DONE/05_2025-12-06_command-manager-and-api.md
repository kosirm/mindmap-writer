# Command Manager System & External API

**Date:** 2025-12-06  
**Status:** ✅ Complete

## Overview

Implemented a VSCode-inspired command system that provides a centralized way to register, discover, and execute commands. Every user action can be represented as a command with multiple access points: toolbar icons, keyboard shortcuts, context menus, and command palette.

## Architecture

### Core Components

```
src/core/commands/
├── types.ts          # TypeScript interfaces
├── index.ts          # Command registry (singleton)
├── api.ts            # Window API for external agents
└── definitions/
    ├── index.ts      # Exports all commands
    ├── nodeCommands.ts
    ├── viewCommands.ts
    ├── editCommands.ts
    └── paletteCommands.ts
```

### Command Interface

```typescript
interface Command {
  id: string                    // Unique identifier (e.g., 'node.add.child')
  label: string                 // Display name
  description?: string          // Detailed description
  icon?: string                 // Material icon name
  category?: CommandCategory    // file, edit, view, node, etc.
  keybinding?: string           // Keyboard shortcut (e.g., 'Ctrl+Shift+D')
  keywords?: string[]           // Search keywords
  when?: CommandScope           // Availability conditions
  execute: () => void | Promise<void>
  showInPalette?: boolean       // Show in Ctrl+Shift+P dialog
  showInContextMenu?: boolean   // Show in right-click menu
}
```

### Command Categories

- `file` - New, open, save, export
- `edit` - Undo, redo, clipboard operations
- `view` - Panel toggles, zoom, theme
- `selection` - Select all, deselect
- `node` - Add, delete, edit, collapse
- `edge` - Create, delete, style
- `navigation` - Focus, pan, zoom to fit
- `ai` - AI-powered features
- `settings` - Preferences

### Command Scope (Availability)

```typescript
interface CommandScope {
  views?: ViewType[]           // Only in specific views
  panels?: PanelPosition[]     // Only in specific panels
  requiresSelection?: boolean  // Needs selected nodes
  requiresDocument?: boolean   // Needs open document
  requiresAuth?: boolean       // Needs authenticated user
}
```

## Registry Functions

| Function | Description |
|----------|-------------|
| `registerCommand(cmd)` | Register a single command |
| `registerCommands(cmds)` | Register multiple commands |
| `executeCommand(id)` | Execute command by ID |
| `isCommandAvailable(id)` | Check if command can execute |
| `searchCommands(query)` | Search by label/description/keywords |
| `handleKeyboardEvent(e)` | Process keyboard shortcuts |
| `toggleStarred(id)` | Star/unstar a command |
| `getStarredCommands()` | Get user's favorite commands |
| `getRecentCommands()` | Get recently executed commands |

## Command Palette UI

**File:** `src/shared/components/CommandPalette.vue`

### Features

- Opens with `Ctrl+Shift+P`
- Real-time search filtering
- Keyboard navigation (↑/↓ arrows)
- Execute with Enter
- Star commands with Ctrl+Enter
- Shows starred commands section
- Shows recent commands section
- Displays keyboard shortcuts
- Category badges

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+P` | Open command palette |
| `↑` / `↓` | Navigate list |
| `Enter` | Execute selected |
| `Ctrl+Enter` | Star/unstar selected |
| `Escape` | Close palette |

## Window API for External Agents

**File:** `src/core/commands/api.ts`

Exposes `window.mindscribble` global API for:
- n8n automation workflows
- Browser automation (Puppeteer/Playwright)
- DevTools console
- Browser extensions

### API Methods

```javascript
// List all commands
window.mindscribble.listCommands()

// Search commands
window.mindscribble.searchCommands('dark mode')

// Execute a command
await window.mindscribble.execute('view.theme.toggle')

// Execute sequence
await window.mindscribble.executeSequence(['cmd1', 'cmd2'], 100)

// Check availability
window.mindscribble.isAvailable('node.delete')

// Get by category
window.mindscribble.getByCategory('view')

// Subscribe to executions
const unsub = window.mindscribble.onCommandExecuted((id) => {
  console.log('Executed:', id)
})
```

## Implemented Commands

### Node Commands
- `node.add.root` - Add root node
- `node.add.child` - Add child node (Tab)
- `node.add.sibling` - Add sibling node (Enter)
- `node.edit` - Edit node (F2)
- `node.delete` - Delete node (Delete)
- `node.collapse.toggle` - Toggle collapse (Space)
- `node.detach` - Detach from parent

### View Commands
- `view.panel.left.toggle` - Toggle left panel (Ctrl+1)
- `view.panel.right.toggle` - Toggle right panel (Ctrl+2)
- `view.zoom.in` - Zoom in (Ctrl++)
- `view.zoom.out` - Zoom out (Ctrl+-)
- `view.zoom.fit` - Fit to screen (Ctrl+0)
- `view.zoom.reset` - Reset zoom (Ctrl+Shift+0)
- `view.theme.toggle` - Toggle dark mode (Ctrl+Shift+D)
- `view.drawer.left.toggle` - Toggle tools drawer
- `view.drawer.right.toggle` - Toggle AI chat (Ctrl+Shift+A)

### Edit Commands
- `edit.undo` - Undo (Ctrl+Z)
- `edit.redo` - Redo (Ctrl+Y)
- `edit.cut` - Cut (Ctrl+X)
- `edit.copy` - Copy (Ctrl+C)
- `edit.paste` - Paste (Ctrl+V)
- `edit.duplicate` - Duplicate (Ctrl+D)
- `edit.selectAll` - Select all (Ctrl+A)
- `edit.deselect` - Deselect (Escape)

### Palette Commands
- `palette.open` - Open palette (Ctrl+Shift+P)
- `palette.searchNodes` - Search nodes (Ctrl+P)
- `palette.searchFiles` - Search files (Ctrl+Shift+F)

## Persistence

**Store:** `src/core/stores/commandStore.ts`

Persists to localStorage:
- Starred commands (`mindscribble-starred-commands`)
- Recent commands (`mindscribble-recent-commands`)

## Integration Points

1. **MainLayout.vue** - Global keyboard listener, command event handlers
2. **CommandPalette.vue** - UI component
3. **AppStore** - `commandPaletteOpen` state

## Future Enhancements

- [ ] WebSocket bridge for real-time n8n agent communication
- [ ] Custom keybinding editor
- [ ] Command history with undo
- [ ] Context menu integration
- [ ] Toolbar button generation from commands

