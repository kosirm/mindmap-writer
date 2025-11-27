# MindScribble Architecture

## Overview

MindScribble is a professional mindmap application built with Vue 3, Quasar, and VueFlow. This document outlines the architecture designed to avoid the performance and maintainability issues encountered in the vueflow prototype.

## Core Principles

1. **Feature-based modular structure** - Code organized by feature, not by layer
2. **Strict separation of concerns** - Clear boundaries between features
3. **Memory-conscious design** - Lazy loading, cleanup, shallow refs
4. **Performance-first** - Debouncing, memoization, virtual scrolling
5. **Composable-driven** - Small, focused, testable composables
6. **Pinia stores** for shared state - Not reactive refs in components
7. **Event bus** for cross-component communication
8. **Command system** for all user actions

## Technology Stack

- **Vue 3** (Composition API) - UI framework
- **Quasar 2** - UI components with light/dark mode
- **Pinia** - State management
- **VueFlow** - Canvas rendering
- **Tiptap** - Rich text editing
- **D3-Force** - Additional visualizations (circle pack, sunburst, treemap)
- **mitt** - Event bus
- **vue-i18n** - Internationalization
- **TypeScript** - Type safety

## Folder Structure

```
mindscribble/
├── src/
│   ├── features/              # Feature modules
│   │   ├── canvas/           # Mindmap canvas
│   │   ├── writer/           # Writer panel
│   │   ├── tree/             # Tree view
│   │   ├── keyboard/         # Keyboard navigation
│   │   ├── orientation/      # Layout orientation
│   │   └── persistence/      # File operations
│   ├── core/                 # Core infrastructure
│   │   ├── commands/         # Command system
│   │   ├── events/           # Event bus
│   │   ├── stores/           # Global stores
│   │   └── types/            # Shared types
│   ├── shared/               # Shared utilities
│   │   ├── components/       # Reusable components
│   │   ├── composables/      # Utility composables
│   │   └── utils/            # Helper functions
│   ├── layouts/              # App layouts
│   ├── pages/                # Route pages
│   ├── i18n/                 # Translations
│   ├── boot/                 # Boot files
│   └── router/               # Routing
└── dev/                      # Documentation
    ├── ARCHITECTURE.md       # This file
    └── NESTED_LAYOUT.md      # Layout algorithm
```

## State Management

### Pinia Stores

1. **appStore** - Global app state
   - View mode (split/mindmap/writer)
   - Active context (canvas/writer/tree)
   - UI state (drawers, dialogs)

2. **documentStore** - Document data (single source of truth)
   - nodes: Node[]
   - edges: Edge[]
   - Document metadata
   - CRUD operations

3. **canvasStore** - Canvas-specific state
   - Selected node IDs
   - Viewport (position, zoom)
   - Visual settings

4. **orientationStore** - Layout orientation
   - Mode (clockwise/counterclockwise)
   - Layout calculations

5. **keyboardStore** - Keyboard state
   - Pressed keys
   - Active context
   - Navigation mode

6. **settingsStore** - User preferences
   - Theme (light/dark)
   - Locale
   - User settings

## Communication Patterns

### Event Bus (Cross-Feature)

All cross-feature communication uses the event bus:

```typescript
// Canvas → Writer
eventBus.emit('canvas:node-selected', { nodeId })

// Writer → Canvas
eventBus.emit('writer:hierarchy-changed', { nodeId, newParentId })

// Tree → Canvas
eventBus.emit('tree:node-selected', { nodeId })
```

### Command System (User Actions)

All user actions go through the command system:

```typescript
registerCommand({
  id: 'file.save',
  label: 'Save',
  icon: 'save',
  keybinding: 'Ctrl+S',
  execute: async () => {
    await documentStore.save()
  }
})
```

## Memory Management

### Critical Strategies

1. **Shallow Refs for Heavy Objects**
   ```typescript
   const d3Simulation = shallowRef<d3.Simulation | null>(null)
   ```

2. **Cleanup Composables**
   ```typescript
   const { registerCleanup } = useCleanup()
   registerCleanup(() => editor.destroy())
   ```

3. **Lazy Loading**
   ```typescript
   // Only create Tiptap editor when needed
   eventBus.on('node:edit-start', ({ nodeId }) => {
     if (!editors.has(nodeId)) {
       editors.set(nodeId, createEditor(nodeId))
     }
   })
   ```

4. **Debouncing**
   ```typescript
   const debouncedTreeRebuild = useDebounceFn(() => {
     rebuildTree()
   }, 300)
   ```

5. **Limited Watcher Depth**
   ```typescript
   // Watch specific properties, not deep objects
   watch(() => nodes.value.length, () => { ... })
   ```

## Layout Algorithm

### Nested Rectangle Layout

See `NESTED_LAYOUT.md` for detailed documentation.

**Key Points:**
- Each node has an invisible bounding rectangle
- Children are contained within parent's rectangle
- Sibling rectangles cannot overlap
- Uses AABB collision detection (fast and simple)
- No physics simulation needed

## Performance Optimizations

1. **Virtual Scrolling** - For large node lists
2. **Memoization** - For expensive computations
3. **Debouncing** - For frequent operations
4. **Throttling** - For drag operations
5. **Lazy Loading** - For Tiptap editors
6. **Shallow Refs** - For heavy objects
7. **Cleanup** - On component unmount
8. **Performance Monitoring** - In dev mode

## Component Responsibilities

### MindmapPage.vue (Orchestrator)
- Layout structure
- Event bus registration
- Command context updates
- Keyboard delegation
- **NO business logic**

### MindmapCanvas.vue
- VueFlow setup
- Node/edge rendering
- Viewport management
- Delegates to composables

### WriterPanel.vue
- Writer UI structure
- Delegates to WriterEditor

### TreePanel.vue
- Tree rendering
- Selection handling

## Migration from vueflow Prototype

### What to Keep
- ✅ Event bus architecture
- ✅ Command system
- ✅ Keyboard navigation logic
- ✅ Writer panel functionality
- ✅ Tree view logic
- ✅ Tiptap integration
- ✅ Orientation system

### What to Change
- ❌ Monolithic VueFlowTest.vue → Split into features
- ❌ Reactive refs in components → Pinia stores
- ❌ Physics engines (Matter.js, Planck.js) → AABB layout
- ❌ Deep watchers → Specific property watchers
- ❌ No cleanup → Proper cleanup
- ❌ No debouncing → Debounce expensive operations

### What to Add
- ➕ Light/dark mode
- ➕ Internationalization (i18n)
- ➕ Performance monitoring
- ➕ Memory leak detection
- ➕ Virtual scrolling
- ➕ Lazy loading

## Development Workflow

1. **Feature Development**
   - Create feature folder
   - Add components, composables, stores
   - Register commands
   - Add event bus events
   - Test in isolation

2. **Integration**
   - Connect via event bus
   - Update command context
   - Test cross-feature communication

3. **Performance Testing**
   - Profile with Vue DevTools
   - Monitor memory usage
   - Test with large datasets
   - Optimize bottlenecks

## Testing Strategy

1. **Unit Tests** - Composables and utilities
2. **Component Tests** - Individual components
3. **Integration Tests** - Feature interactions
4. **Performance Tests** - Large datasets
5. **Memory Tests** - Leak detection

## Next Steps

1. ✅ Create vueflow-design test project
2. ✅ Validate nested layout algorithm
3. [ ] Test with large datasets (100, 500, 1000 nodes)
4. [ ] Compare AABB vs RBush performance
5. [ ] Initialize MindScribble project with Quasar
6. [ ] Implement core infrastructure
7. [ ] Migrate features one by one
8. [ ] Add performance monitoring
9. [ ] Final testing and optimization

