# Command System Architecture

## Overview

The command system provides a centralized, VSCode-inspired architecture for managing all application commands, menus, toolbars, and keyboard shortcuts.

## Core Components

### 1. Command Registry (`composables/useCommands.ts`)

The heart of the system. Provides:
- **Command registration**: Register commands from anywhere in the app
- **Command execution**: Execute commands with context
- **Availability checking**: Commands can be conditionally enabled based on context
- **Keybinding matching**: Automatic keyboard shortcut handling

```typescript
const { registerCommand, executeCommand, updateContext } = useCommands();

// Register a command
registerCommand({
  id: 'file.save',
  label: 'Save',
  icon: 'save',
  category: 'file',
  keybinding: 'Ctrl+S',
  execute: async () => { /* save logic */ }
});

// Execute a command
await executeCommand('file.save');
```

### 2. View Registry (`composables/useViewRegistry.ts`)

Manages different view types (Mindmap, Writer, Circle Pack, Sunburst, etc.):
- **View registration**: Register new view types
- **View metadata**: Icons, labels, supported commands
- **View switching**: Easy switching between different visualizations

```typescript
const { registerView, getAllViews } = useViewRegistry();

registerView({
  id: 'mindmap',
  label: 'Mindmap',
  icon: 'account_tree',
  component: MindmapView,
  supportedCommands: ['mindmap.addNode', 'mindmap.connect', ...]
});
```

### 3. Command Modules (`commands/`)

Commands are organized by category:
- **fileCommands.ts**: File operations (new, open, save, export)
- **editCommands.ts**: Edit operations (undo, redo, cut, copy, paste)
- **viewCommands.ts**: View operations (zoom, layout, orientation)
- **mindmapCommands.ts**: Mindmap-specific operations
- **writerCommands.ts**: Writer-specific operations

Each command includes:
- Unique ID
- Label and icon
- Category
- Optional keybinding
- Optional `when` condition (for context-sensitive availability)
- Execute function

### 4. Menu Configuration (`config/menus.ts`)

Declarative menu definitions:
- **topBarMenus**: Text-based menus (File, Edit, View)
- **toolbarMenus**: Icon-based toolbars for each view
- **contextMenus**: Right-click context menus

Menus reference commands by ID, so adding a command once makes it available everywhere.

## Command Context

Commands receive a context object with current application state:

```typescript
interface CommandContext {
  selectedNodeIds?: string[];
  activeView?: 'mindmap' | 'writer' | 'tree';
  clipboardData?: any;
  [key: string]: any;
}
```

Update context from anywhere:

```typescript
const { updateContext } = useCommands();

// When selection changes
updateContext({ selectedNodeIds: ['node1', 'node2'] });

// When view changes
updateContext({ activeView: 'mindmap' });
```

## Conditional Commands

Commands can be conditionally enabled:

```typescript
{
  id: 'edit.delete',
  label: 'Delete',
  when: (context) => (context?.selectedNodeIds?.length ?? 0) > 0,
  execute: async (context) => {
    // Delete selected nodes
  }
}
```

## Benefits

✅ **Centralized**: All commands in one place
✅ **Reusable**: Same command in menu, toolbar, context menu, keybinding
✅ **Maintainable**: Add command once, use everywhere
✅ **Type-safe**: Full TypeScript support
✅ **Extensible**: Easy to add new commands and views
✅ **Testable**: Commands can be tested independently

## Next Steps

1. Create UI components (TopBarMenu, ToolBar, ContextMenu)
2. Create ViewSelector component
3. Integrate into VueFlowTest.vue
4. Connect existing functionality to commands
5. Add keyboard shortcut handler
6. Implement command palette (future)

## File Structure

```
src/
├── commands/
│   ├── types.ts              # TypeScript interfaces
│   ├── index.ts              # Main export
│   ├── fileCommands.ts       # File operations
│   ├── editCommands.ts       # Edit operations
│   ├── viewCommands.ts       # View operations
│   ├── mindmapCommands.ts    # Mindmap operations
│   └── writerCommands.ts     # Writer operations
├── composables/
│   ├── useCommands.ts        # Command system
│   └── useViewRegistry.ts    # View management
└── config/
    └── menus.ts              # Menu definitions
```

