# Editor Refactoring Plan

## Problem Statement

We currently have two nearly identical editor implementations:
1. **TiptapEditor.vue** - Content editor (single node)
2. **FullDocumentDraggable.vue** - Full Document editor (multiple nodes)

This causes:
- Code duplication
- Inconsistent behavior
- Bugs in one but not the other
- Double maintenance effort

## Root Cause

The duplication exists because:
- Full Document needs multiple editor instances (one per node, lazy loaded)
- Content editor needs one editor instance (for selected node)
- But they're **never open simultaneously** (they're tabs)

## Proposed Solution: Unified NodeEditor Component

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ MindmapPage.vue                                             │
│                                                             │
│  ┌──────────────────┐         ┌──────────────────┐        │
│  │ Content Mode     │   OR    │ Full Document    │        │
│  │                  │         │ Mode             │        │
│  │ <NodeEditor      │         │                  │        │
│  │   :node="..."    │         │ <NodeEditor      │        │
│  │   mode="single"  │         │   v-for="node"   │        │
│  │ />               │         │   :node="node"   │        │
│  │                  │         │   mode="document"│        │
│  └──────────────────┘         │ />               │        │
│                                └──────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### New Component: NodeEditor.vue

**Props:**
- `node: MindmapNode` - The node to edit
- `mode: 'single' | 'document'` - Display mode
- `depth?: number` - For Full Document indentation

**Features:**
- Creates Tiptap editor instance
- Handles inferred title highlighting
- Syncs with store
- Emits content updates
- Handles drag-drop (in document mode)

**Key Benefits:**
1. **Single source of truth** - All editor logic in one place
2. **Consistent behavior** - Same code = same behavior
3. **Easier debugging** - One place to add logs
4. **Simpler testing** - Test one component

### Migration Steps

#### Phase 1: Create NodeEditor.vue
1. Extract common editor logic from TiptapEditor and FullDocumentDraggable
2. Create unified component with both modes
3. Add comprehensive tests

#### Phase 2: Update Content Mode
1. Replace TiptapEditor with NodeEditor in "single" mode
2. Test all Content editor functionality
3. Remove old TiptapEditor code

#### Phase 3: Update Full Document Mode
1. Replace FullDocumentDraggable with NodeEditor in "document" mode
2. Test all Full Document functionality
3. Remove old FullDocumentDraggable code

#### Phase 4: Cleanup
1. Remove duplicate utility functions
2. Simplify store synchronization
3. Remove unnecessary flags and watchers

### Implementation Details

#### NodeEditor.vue Structure

```vue
<template>
  <div :class="editorClass">
    <!-- Title (for document mode) -->
    <div v-if="mode === 'document'" class="node-title">
      {{ displayTitle }}
    </div>
    
    <!-- Tiptap Editor -->
    <editor-content :editor="editor" />
    
    <!-- Drag handle (for document mode) -->
    <div v-if="mode === 'document'" class="drag-handle">
      ⋮⋮
    </div>
  </div>
</template>

<script setup lang="ts">
// Single editor implementation used by both modes
// All inferred title logic here
// All store sync logic here
// All highlight logic here
</script>
```

#### Key Functions (Centralized)

1. **`createEditor()`** - Create Tiptap instance with all extensions
2. **`syncWithStore()`** - Handle store updates
3. **`updateInferredHighlight()`** - Apply/update highlight
4. **`handleContentChange()`** - Handle user edits
5. **`extractHighlightLength()`** - Get highlight from HTML

### Data Flow (Simplified)

```
User types in editor
  ↓
handleContentChange()
  ↓
Extract highlight length from current HTML
  ↓
Emit to store (with highlight preserved)
  ↓
Store updates
  ↓
Other views sync (mindmap, tree)
```

**No circular updates!** Editor doesn't watch store changes for its own node.

### Benefits

1. **50% less code** - Remove duplicate logic
2. **Consistent behavior** - Same code everywhere
3. **Easier to fix bugs** - Fix once, works everywhere
4. **Better performance** - Simpler logic, fewer watchers
5. **Easier to understand** - One component to learn

## Decision Required

Should we proceed with this refactoring?

**Estimated effort:** 4-6 hours
**Risk:** Medium (need careful testing)
**Benefit:** High (eliminates entire class of bugs)

## Alternative: Quick Fix

If we don't want to refactor now, we can:
1. Fix the immediate bug (highlight disappearing in Full Document)
2. Add TODO comments to refactor later
3. Continue with current architecture

But this will continue to cause problems.

