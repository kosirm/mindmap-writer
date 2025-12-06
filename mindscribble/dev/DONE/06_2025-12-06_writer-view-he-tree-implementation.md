# Writer View Implementation with @he-tree/vue

**Date:** 2025-12-06  
**Session:** Writer View Drag-and-Drop Implementation

## Summary

Implemented the Writer view using `@he-tree/vue` for drag-and-drop tree functionality with lazy-loaded Tiptap editors for rich text editing. Added bidirectional sync between Writer and Mindmap views for sibling reordering with proper position swapping.

## New Dependencies

- `@he-tree/vue` - Tree component with drag-and-drop support
- `@tiptap/vue-3` - Rich text editor for Vue 3
- `@tiptap/starter-kit` - Basic Tiptap extensions
- `@tiptap/extension-placeholder` - Placeholder text support
- `@tiptap/pm` - ProseMirror dependencies

## New Files Created

### 1. `src/features/writer/components/WriterNodeContent.vue`
- Renders individual tree nodes with lazy-loaded Tiptap editors
- Title and content fields (content only visible in Writer, not in Mindmap/ConceptMap)
- Uses `shallowRef` for Editor instances to avoid deep reactivity issues

### 2. `src/features/writer/composables/useWriterNavigation.ts`
- Keyboard navigation composable (up/down/left/right arrows)
- Treats the entire tree as one navigable text document
- Exports `WriterTreeItem` interface

### 3. `src/features/writer/composables/useWriterKeyboardHandlers.ts`
- Keyboard event handlers for Writer view
- Navigation between nodes

### 4. `src/features/canvas/composables/mindmap/useExternalSiblingPositioning.ts`
- Handles positioning nodes in mindmap when changes come from Writer
- `swapPositionsOnReorder()` - Swaps node positions when sibling order changes
- `calculateInsertPosition()` - Calculates position for new nodes based on:
  - First child: 90° (right side), 200px from parent
  - Between siblings: Average angle/distance of prev/next
  - Last sibling: Uses gap from previous two siblings (+30° default)
  - First sibling: Uses gap from next two siblings (-30° default)
- Respects MIN_ANGLE (1°) and MAX_ANGLE (359°) bounds
- Orientation-aware (clockwise, counter-clockwise, left-right, right-left)

## Modified Files

### Store Changes

**`src/core/stores/documentStore.ts`**
- Added `reorderSiblings()` method that updates order values and emits `store:siblings-reordered`
- Fixed `rootNodes` computed to sort by order for consistency

**`src/core/events/index.ts`**
- Simplified `SiblingsReorderedPayload` (removed view-specific `orientation` field)

### Writer View

**`src/features/writer/components/WriterView.vue`**
- Implemented tree rendering with `@he-tree/vue`
- Updated `onTreeChange()` to detect sibling-only reorders vs reparenting
- Now calls `reorderSiblings()` for order changes (emits `store:siblings-reordered`)
- Calls `moveNode()` for parent changes (emits `store:node-reparented`)
- Listens for `store:siblings-reordered` to rebuild tree from other views

### Mindmap View

**`src/features/canvas/components/MindmapView.vue`**
- Added import and initialization of `useExternalSiblingPositioning`
- Updated `store:siblings-reordered` handler to use `swapPositionsOnReorder()`
- Updated `store:node-created` handler to use `calculateInsertPosition()` with sibling context
- Fixed `resolveOverlapsBottomUpLOD()` calls to pass correct 3 arguments

**`src/features/canvas/composables/mindmap/useSiblingReorder.ts`**
- Updated to call `documentStore.reorderSiblings()` instead of emitting event directly

**`src/features/canvas/composables/mindmap/useOrientationSort.ts`**
- Exported `calculateClockwiseAngle` function for use in other composables

### ConceptMap View

**`src/features/canvas/components/conceptmap/ConceptMapView.vue`**
- Fixed label to use only `sn.data.title` (was incorrectly using `sn.data.content || sn.data.title`)

## Architecture Compliance

Following the established architecture pattern:
- **Views** → call **Store methods** → **Store emits events** → **Other Views listen**
- Views do NOT emit events directly to each other
- Store is the single source of truth and event emitter

## Key Features

1. **Drag-and-drop in Writer**: Reorder siblings, change hierarchy by dragging horizontally
2. **Bidirectional sync**: Sibling order changes sync between Writer ↔ Mindmap
3. **Position swapping**: When siblings reordered in Writer, mindmap nodes swap positions
4. **Lazy Tiptap editors**: Editors created on focus, destroyed on blur for performance
5. **Separate title/content**: Title shows in all views, content only editable in Writer

## Bug Fixes

1. Content text appearing in mindmap/conceptmap title - Fixed by using only `title`
2. Edges drawn incorrectly after reordering - Fixed `rebuildEdgesFromHierarchy()` to use `getOptimalHandles()`
3. Sibling order not syncing Writer→Mindmap - Implemented `swapPositionsOnReorder()`
4. `resolveOverlapsBottomUpLOD` missing argument - Added `affectedNodeIds` parameter

