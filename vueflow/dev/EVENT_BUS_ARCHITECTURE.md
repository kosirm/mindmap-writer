# Event Bus Architecture

**Status:** ✅ Implemented (Phase 1 complete)  
**Last Updated:** 2025-11-18  
**Library:** [mitt](https://github.com/developit/mitt) (200 bytes, 11.7k stars)

---

## Table of Contents

1. [Overview](#overview)
2. [Why Event Bus?](#why-event-bus)
3. [Architecture](#architecture)
4. [Event Types](#event-types)
5. [Usage Examples](#usage-examples)
6. [Migration Guide](#migration-guide)
7. [Debugging](#debugging)
8. [Best Practices](#best-practices)
9. [Future Events](#future-events)

---

## Overview

The event bus provides a centralized, type-safe communication system for the mindmap application. It uses the `mitt` library to enable decoupled communication between components.

**Key Benefits:**
- ✅ **Type Safety:** Full TypeScript support with typed events
- ✅ **Decoupling:** Components don't need direct references to each other
- ✅ **Debugging:** Wildcard listener logs all events in dev mode
- ✅ **Scalability:** Easy to add new events as features grow
- ✅ **Single Source of Truth:** All events defined in one place

---

## Why Event Bus?

### Problems with Direct Reactivity (Previous Approach)

In the first iteration (`mindmap-writer/writer`), we used direct reactivity with watchers and props/emits. This led to:

1. **Circular Update Problems:** `isUpdatingFromStore` flags everywhere
2. **Tight Coupling:** Components directly manipulated each other's state
3. **Hard to Debug:** Reactivity chains were difficult to trace
4. **Performance Issues:** Multiple watchers firing for the same change
5. **Maintenance Nightmare:** Changes in one component broke others

### Event Bus Solution

With an event bus:

1. **Clear Event Flow:** Easy to see what events trigger what actions
2. **Loose Coupling:** Components only know about events, not each other
3. **Easy Debugging:** Log all events in one place with wildcard listener
4. **Better Performance:** Events fire once, listeners decide what to do
5. **Maintainable:** Adding new features doesn't break existing code

---

## Architecture

### File Structure

```
src/
├── composables/
│   └── useEventBus.ts          # Event bus implementation
├── pages/
│   └── VueFlowTest.vue         # Main page (emits & listens to events)
└── components/
    └── (future components)     # Will emit & listen to events
```

### Event Flow Diagram

```
┌─────────────┐
│  Tree View  │
│             │
│  User clicks│
│  a node     │
└──────┬──────┘
       │
       │ emit('tree:node-selected', { nodeId })
       │
       ▼
┌─────────────────────┐
│    Event Bus        │
│  (mitt instance)    │
│                     │
│  • Type-safe        │
│  • Centralized      │
│  • Logged in dev    │
└──────┬──────────────┘
       │
       │ on('tree:node-selected', handler)
       │
       ▼
┌─────────────┐
│   Canvas    │
│             │
│  Selects    │
│  the node   │
└─────────────┘
```

---

## Event Types

All events are defined in `src/composables/useEventBus.ts` with full TypeScript types.

### Current Events (Phase 1)

| Event Name | Payload | Description |
|------------|---------|-------------|
| `tree:node-selected` | `{ nodeId: string \| null }` | Tree view node selected (null = deselect all) |
| `canvas:node-selected` | `{ nodeId: string }` | Canvas node clicked/selected |
| `canvas:pane-clicked` | `{}` | Canvas background clicked (deselect all) |

### Future Events (Planned)

See [Future Events](#future-events) section below.

---

## Usage Examples

### Basic Usage

```typescript
import { eventBus } from '@/composables/useEventBus';

// Emit an event
eventBus.emit('tree:node-selected', { nodeId: '123' });

// Listen to an event
eventBus.on('canvas:node-selected', ({ nodeId }) => {
  console.log('Node selected:', nodeId);
});

// Remove listener (important for cleanup!)
const handler = ({ nodeId }) => console.log(nodeId);
eventBus.on('canvas:node-selected', handler);
eventBus.off('canvas:node-selected', handler);
```

### In Vue Components

```vue
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { eventBus } from '@/composables/useEventBus';

// Define handler
function handleNodeSelected({ nodeId }: { nodeId: string }) {
  console.log('Node selected:', nodeId);
}

// Register listener on mount
onMounted(() => {
  eventBus.on('canvas:node-selected', handleNodeSelected);
});

// IMPORTANT: Clean up on unmount!
onUnmounted(() => {
  eventBus.off('canvas:node-selected', handleNodeSelected);
});
</script>
```

### Using the Composable (Alternative)

```typescript
import { useEventBus } from '@/composables/useEventBus';

const { emit, on, off } = useEventBus();

emit('tree:node-selected', { nodeId: '123' });
on('canvas:node-selected', handler);
off('canvas:node-selected', handler);
```

---

## Migration Guide

### Phase 1: Tree ↔ Canvas Selection Sync

**Before (Direct Reactivity):**

```typescript
// In VueFlowTest.vue
function onTreeNodeSelected(nodeId: string | null) {
  // Directly manipulate canvas selection
  if (!nodeId) {
    removeSelectedNodes(nodes.value);
  } else {
    const node = nodes.value.find(n => n.id === nodeId);
    if (node) addSelectedNodes([node]);
  }
}

// Watch canvas selection changes
watch(getSelectedNodes, (selectedNodes) => {
  // Directly update tree selection
  selectedTreeNodeIds.value = selectedNodes.map(node => node.id);
});
```

**After (Event Bus):**

```typescript
// Tree emits event
function onTreeNodeSelected(nodeId: string | null) {
  eventBus.emit('tree:node-selected', { nodeId });
}

// Canvas listens and updates
eventBus.on('tree:node-selected', ({ nodeId }) => {
  if (!nodeId) {
    removeSelectedNodes(nodes.value);
  } else {
    const node = nodes.value.find(n => n.id === nodeId);
    if (node) addSelectedNodes([node]);
  }
});

// Canvas emits event
function onNodeClick(event: { node: Node }) {
  eventBus.emit('canvas:node-selected', { nodeId: event.node.id });
}

// Tree listens and updates
eventBus.on('canvas:node-selected', ({ nodeId }) => {
  selectedTreeNodeIds.value = [nodeId];
});
```

---

## Debugging

### Wildcard Listener (Automatic in Dev Mode)

The event bus automatically logs all events in development mode:

```typescript
// In useEventBus.ts
if (import.meta.env.DEV) {
  eventBus.on('*', (type, payload) => {
    console.log(`[Event Bus] ${String(type)}`, payload);
  });
}
```

**Console Output Example:**
```
[Event Bus] tree:node-selected { nodeId: '1' }
[Event Bus] canvas:node-selected { nodeId: '2' }
[Event Bus] canvas:pane-clicked {}
```

### Manual Debugging

You can add your own wildcard listener for custom debugging:

```typescript
eventBus.on('*', (type, payload) => {
  // Custom debugging logic
  if (type.startsWith('node:')) {
    console.warn('Node event:', type, payload);
  }
});
```

### Debugging Circular Events

If you suspect circular event loops:

1. Check console for repeated event patterns
2. Add guards in event handlers:
   ```typescript
   let isHandling = false;

   eventBus.on('some:event', (payload) => {
     if (isHandling) {
       console.warn('Circular event detected!');
       return;
     }
     isHandling = true;
     // Handle event
     isHandling = false;
   });
   ```

---

## Best Practices

### 1. Always Clean Up Listeners

```typescript
// ❌ BAD: Memory leak!
onMounted(() => {
  eventBus.on('some:event', handler);
});

// ✅ GOOD: Clean up on unmount
onMounted(() => {
  eventBus.on('some:event', handler);
});
onUnmounted(() => {
  eventBus.off('some:event', handler);
});
```

### 2. Use Named Functions for Handlers

```typescript
// ❌ BAD: Can't remove listener later
eventBus.on('some:event', (payload) => {
  console.log(payload);
});

// ✅ GOOD: Can remove listener
function handleEvent(payload) {
  console.log(payload);
}
eventBus.on('some:event', handleEvent);
eventBus.off('some:event', handleEvent); // Works!
```

### 3. Keep Event Names Consistent

Follow the naming convention: `<source>:<action>`

```typescript
// ✅ GOOD
'tree:node-selected'
'canvas:node-clicked'
'writer:node-updated'
'node:edit-start'

// ❌ BAD
'nodeSelected'
'clickedNode'
'update'
```

### 4. Define All Events in useEventBus.ts

Never emit events that aren't defined in the `MindmapEvents` type. This ensures type safety and makes it easy to see all available events.

### 5. Document Event Purpose

Add JSDoc comments for each event type explaining when it's emitted and what the payload contains.

### 6. Avoid Circular Events

Be careful not to create circular event loops:

```typescript
// ❌ BAD: Circular loop!
eventBus.on('tree:node-selected', ({ nodeId }) => {
  eventBus.emit('canvas:node-selected', { nodeId }); // Triggers canvas handler
});

eventBus.on('canvas:node-selected', ({ nodeId }) => {
  eventBus.emit('tree:node-selected', { nodeId }); // Triggers tree handler again!
});

// ✅ GOOD: One-way flow
eventBus.on('tree:node-selected', ({ nodeId }) => {
  // Update canvas directly, don't emit another event
  selectNodeInCanvas(nodeId);
});
```

---

## Future Events

These events are defined but not yet implemented. They will be used when we add Tiptap and Writer panel.

### Node Lifecycle Events

```typescript
'node:created': { nodeId: string; position: { x: number; y: number } }
'node:deleted': { nodeId: string }
```

**Use Case:** Track node creation/deletion for undo/redo, analytics, or syncing with Writer panel.

### Node Editing Events (Tiptap Integration)

```typescript
'node:edit-start': { nodeId: string }
'node:title-updated': { nodeId: string; title: string }
'node:content-updated': { nodeId: string; content: string }
'node:edit-end': { nodeId: string }
'node:resize-requested': { nodeId: string; dimensions: { width: number; height: number } }
```

**Use Case:**
- `edit-start`: Load Tiptap editor lazily when user double-clicks node
- `title-updated` / `content-updated`: Sync changes between canvas and Writer panel
- `edit-end`: Destroy Tiptap editor to free memory
- `resize-requested`: Adjust node size when content changes (multi-line titles)

### Writer Panel Events

```typescript
'writer:node-updated': { nodeId: string }
'writer:order-changed': { nodeIds: string[] }
```

**Use Case:**
- `node-updated`: Sync changes from Writer panel to canvas
- `order-changed`: Update node order field when user reorders nodes in Writer

---

## Implementation Status

### ✅ Phase 1: Event Bus Foundation (COMPLETE)

- [x] Install mitt package
- [x] Create `useEventBus.ts` with typed events
- [x] Add wildcard listener for debugging
- [x] Document architecture in this file

### ✅ Phase 2: Migrate Tree ↔ Canvas Sync (COMPLETE)

- [x] Update tree selection to emit events
- [x] Update canvas selection to emit events
- [x] Add event listeners for bidirectional sync
- [x] Test thoroughly - **Works perfectly!**
- [x] Clean up event listeners in `onBeforeUnmount`

**Result:** Tree ↔ Canvas selection sync now uses event bus. No more direct state manipulation!

### 📋 Phase 3: Tiptap Integration (PLANNED)

- [ ] Install Tiptap packages
- [ ] Create lazy-loaded Tiptap component
- [ ] Implement `node:edit-start` event on double-click
- [ ] Implement `node:title-updated` event on blur/save
- [ ] Implement `node:resize-requested` for multi-line titles
- [ ] Implement `node:edit-end` event on blur

### 📋 Phase 4: Writer Panel (PLANNED)

- [ ] Create Writer panel component
- [ ] Implement `writer:node-updated` event
- [ ] Implement `writer:order-changed` event
- [ ] Sync Writer ↔ Canvas via event bus

---

## Related Documentation

- **Quick Reference:** `QUICK_REFERENCE.md` - Common patterns and code snippets
- **Lessons Learned:** `LESSONS_LEARNED.md` - Problems from first iteration
- **MVP Documentation:** `MVP_DOCUMENTATION.md` - Current MVP features
- **TODO:** `todo.md` - Planned features and tasks

---

## Questions or Issues?

If you encounter problems with the event bus:

1. Check console for `[Event Bus]` logs
2. Verify event names match `MindmapEvents` type
3. Ensure listeners are cleaned up on unmount
4. Check for circular event loops
5. Review this documentation for best practices

---

**Last Updated:** 2025-11-18
**Author:** Milan Košir
**Status:** Living document - will be updated as we add more events
