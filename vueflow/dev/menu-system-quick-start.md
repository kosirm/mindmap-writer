# Menu System Quick Start Guide

## Overview

The menu system is a VSCode-inspired command architecture that provides:
- Centralized command registry
- Context-aware command availability
- Multiple UI representations (top menu, toolbars, context menus)
- Keyboard shortcuts support
- Type-safe TypeScript implementation

## Architecture

```
commands/
├── types.ts              # Core interfaces (Command, CommandContext, MenuItem)
├── fileCommands.ts       # File operations (New, Open, Save, Export, Import)
├── editCommands.ts       # Edit operations (Undo, Redo, Cut, Copy, Paste)
├── viewCommands.ts       # View operations (Zoom, Orientation)
├── mindmapCommands.ts    # Mindmap operations (Layout, Collisions, Nodes)
├── writerCommands.ts     # Writer operations (Formatting)
└── index.ts              # Central export

composables/
└── useCommands.ts        # Command registry and execution

components/menus/
├── TopBarMenu.vue        # Text-based menu bar (File, Edit, View)
├── ToolBar.vue           # Icon-based toolbar
├── ContextMenu.vue       # Right-click context menu
└── ViewSelector.vue      # View switcher dropdown

config/
└── menus.ts              # Declarative menu configuration
```

## Key Concepts

### 1. Command Definition

```typescript
{
  id: 'mindmap.runLayout',           // Unique identifier
  label: 'Run Auto Layout',          // Display name
  icon: 'scatter_plot',              // Material icon name
  category: 'mindmap',               // Category for grouping
  keybinding: 'Ctrl+L',              // Keyboard shortcut
  tooltip: 'Run automatic layout',   // Tooltip text
  showInPalette: true,               // Show in command palette
  when: (context) => true,           // Conditional availability (optional)
  execute: (context) => {            // Execution function
    if (context?.runD3ForceOnce) {
      context.runD3ForceOnce();
    }
  },
}
```

### 2. Command Context

The `CommandContext` is the bridge between commands and application state:

```typescript
interface CommandContext {
  selectedNodeIds?: string[];
  activeView?: 'mindmap' | 'writer' | 'tree';
  matterEnabled?: boolean;
  // Function references for command execution
  runD3ForceOnce?: () => void;
  toggleMatterCollisions?: () => void;
  // ... more functions
  [key: string]: unknown;
}
```

### 3. Context Updates

Commands automatically enable/disable based on context:

```typescript
// In VueFlowTest.vue
function updateCommandContext() {
  updateContext({
    selectedNodeIds: getSelectedNodes.value.map(n => n.id),
    activeView: 'mindmap',
    matterEnabled: matterEnabled.value,
    // Function references
    runD3ForceOnce,
    toggleMatterCollisions,
    // ... more functions
  });
}

// Watch for changes
watch([() => getSelectedNodes.value.length, matterEnabled], () => {
  updateCommandContext();
}, { flush: 'post' });
```

## Adding a New Command

### Step 1: Define the Command

Add to appropriate command file (e.g., `mindmapCommands.ts`):

```typescript
{
  id: 'mindmap.myNewCommand',
  label: 'My New Command',
  icon: 'star',
  category: 'mindmap',
  keybinding: 'Ctrl+M',
  tooltip: 'Does something cool',
  showInPalette: true,
  execute: (context) => {
    if (context?.myFunction) {
      context.myFunction();
    }
  },
}
```

### Step 2: Add Function to Context

In `VueFlowTest.vue`:

```typescript
function myFunction() {
  // Implementation
  console.log('My function executed!');
}

function updateCommandContext() {
  updateContext({
    // ... existing context
    myFunction,  // Add function reference
  });
}
```

### Step 3: Add to Menu Configuration

In `config/menus.ts`:

```typescript
export const toolbarMenus = {
  mindmap: [
    // ... existing items
    { command: 'mindmap.myNewCommand' },
  ],
};
```

### Step 4: Update TypeScript Types

In `commands/types.ts`:

```typescript
export interface CommandContext {
  // ... existing properties
  myFunction?: () => void;
}
```

## Conditional Commands

Commands can be shown/hidden based on context:

```typescript
{
  id: 'mindmap.resolveOverlaps',
  // ... other properties
  when: (context) => context?.matterEnabled === false,  // Only show when collisions OFF
  execute: (context) => { /* ... */ },
}
```

## Active State Styling

Buttons can show active state (e.g., blue when enabled):

In `ToolBar.vue`:

```typescript
function isCommandActive(commandId: string): boolean {
  if (commandId === 'mindmap.toggleCollisions') {
    const context = getContext();
    return context.matterEnabled === true;
  }
  return false;
}
```

CSS:

```scss
.toolbar-button-active {
  color: #1976d2 !important;
  background-color: rgba(25, 118, 210, 0.08) !important;
}
```

## Performance Considerations

### 1. Use `flush: 'post'` for Watchers

```typescript
watch([...], () => {
  updateCommandContext();
}, { flush: 'post' });  // Avoid blocking UI
```

### 2. Minimize Context Updates

Only watch values that affect command availability:

```typescript
// Good: Only watch selection count, not full array
watch([() => getSelectedNodes.value.length, matterEnabled], ...)

// Bad: Watching full array causes too many updates
watch([getSelectedNodes, matterEnabled], ...)
```

### 3. Debounce Heavy Operations

For expensive operations, consider debouncing:

```typescript
import { useDebounceFn } from '@vueuse/core';

const debouncedUpdate = useDebounceFn(() => {
  updateCommandContext();
}, 100);
```

## Lessons Learned

### ✅ Do's

1. **Export `updateContext` from composable** - Needed for external updates
2. **Use `flush: 'post'` in watchers** - Prevents UI blocking during drag operations
3. **Add function types to CommandContext** - Enables type-safe command execution
4. **Use conditional `when` clauses** - Commands auto-enable/disable based on state
5. **Keep command execution lightweight** - Just call context functions, don't do heavy work
6. **Use Material icons consistently** - Matches Quasar design system
7. **Add visual feedback for toggle states** - Blue color for active states

### ❌ Don'ts

1. **Don't watch full reactive arrays** - Watch `.length` or specific properties instead
2. **Don't put business logic in commands** - Commands should just call context functions
3. **Don't forget to initialize context on mount** - Call `updateCommandContext()` in `onMounted`
4. **Don't use duplicate icons** - Each command should have unique visual identity
5. **Don't block UI with synchronous updates** - Use `flush: 'post'` or debouncing

### 🐛 Common Issues

**Issue**: Commands not executing
- **Fix**: Check if function is added to context and CommandContext interface

**Issue**: Performance degradation during drag
- **Fix**: Use `flush: 'post'` in watchers, watch `.length` not full arrays

**Issue**: TypeScript errors about missing properties
- **Fix**: Add function types to CommandContext interface in `types.ts`

**Issue**: Button not showing active state
- **Fix**: Implement `isCommandActive()` in ToolBar.vue and add CSS class

**Issue**: Conditional command not appearing/disappearing
- **Fix**: Ensure `when` condition checks correct context property and context is updated

## Quick Reference

### Import Command System

```typescript
import { updateContext } from '../composables/useCommands';
```

### Execute Command Programmatically

```typescript
const { executeCommand } = useCommands();
await executeCommand('mindmap.runLayout');
```

### Check Command Availability

```typescript
const { isCommandAvailable, getContext } = useCommands();
const available = isCommandAvailable('mindmap.runLayout', getContext());
```

### Register Commands on Mount

```typescript
import { useMenuSystem } from '../composables/useMenuSystem';

const { mindmapToolbarItems, writerToolbarItems } = useMenuSystem();
```

## Next Steps

Future enhancements to consider:

1. **Command Palette** - Searchable command list (Ctrl+Shift+P)
2. **Keyboard Manager** - Global keyboard shortcut handler
3. **Context Menus** - Right-click menus with commands
4. **Command History** - Undo/redo support
5. **Custom Keybindings** - User-configurable shortcuts
6. **Command Groups** - Organize related commands
7. **Command Aliases** - Multiple ways to trigger same command

## Summary

The menu system provides a clean, maintainable architecture for commands:
- ✅ Single source of truth for all commands
- ✅ Type-safe with full TypeScript support
- ✅ Context-aware availability
- ✅ Multiple UI representations
- ✅ Performance optimized
- ✅ Easy to extend

Follow this guide to quickly add new commands and maintain consistency! 🚀

