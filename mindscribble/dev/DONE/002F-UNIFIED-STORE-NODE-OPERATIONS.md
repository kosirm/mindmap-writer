# Unified Store Node Operations Implementation

**Date:** 2025-12-25  
**Status:** ✅ COMPLETED

## Overview

Successfully implemented full node-level operations in the UnifiedDocumentStore and created a dev tools toggle to switch between legacy stores and unified store for independent testing.

## What Was Implemented

### 1. Node Operations in UnifiedDocumentStore

Added complete node CRUD operations to `unifiedDocumentStore.ts`:

#### Node Query Operations
- `getNodeById(nodeId)` - Get node by ID from active document
- `getChildNodes(parentId)` - Get child nodes of a parent
- `getAllDescendants(nodeId)` - Get all descendants recursively
- `getRootNodes()` - Get root nodes from active document

#### Node CRUD Operations
- `addNode(parentId, title, content, position, source)` - Add new node
- `updateNode(nodeId, updates, source)` - Update node data
- `updateNodePosition(nodeId, position, source)` - Update node position
- `deleteNode(nodeId, deleteChildren, source)` - Delete node and optionally children
- `moveNode(nodeId, newParentId, newOrder, source)` - Move node to new parent
- `reorderSiblings(parentId, newOrders, source)` - Reorder siblings

#### Selection Operations
- `selectNode(nodeId, source, scrollIntoView)` - Select single node
- `selectNodes(nodeIds, source)` - Select multiple nodes
- `clearSelection(source)` - Clear selection
- `selectedNodeIds` - Reactive ref for selected node IDs

#### Node Expansion Operations (for Outline view)
- `expandNode(nodeId, source)` - Expand node in outline
- `collapseNode(nodeId, source)` - Collapse node in outline
- `toggleNodeExpansion(nodeId, source)` - Toggle expansion
- `isNodeExpanded(nodeId)` - Check if node is expanded

All operations:
- ✅ Update the active document
- ✅ Mark document as dirty
- ✅ Emit proper events via eventBus
- ✅ Include migration logging in dev mode

### 2. Store Mode Toggle System

Created `useStoreMode` composable (`src/composables/useStoreMode.ts`):

```typescript
export type StoreMode = 'legacy' | 'unified' | 'dual-write'

export function useStoreMode() {
  return {
    storeMode,           // Current mode
    setStoreMode,        // Switch modes
    isLegacyMode,        // Check if legacy
    isUnifiedMode,       // Check if unified
    isDualWriteMode,     // Check if dual-write
    modeDescription      // Human-readable description
  }
}
```

**Modes:**
- **Legacy**: Uses DocumentStore + MultiDocumentStore only
- **Unified**: Uses UnifiedDocumentStore only (for testing)
- **Dual-Write**: Uses both with synchronization (migration mode)

### 3. Dev Tools Panel Enhancement

Updated `DevPanel.vue` with store mode toggle:
- Radio button group to switch between modes
- Real-time mode description
- Visual indicators (banners) for current mode
- Enhanced "Log Store State" to show both stores in dual-write mode
- Persists mode selection to localStorage

### 4. OutlineView Migration to Store Mode

Updated `OutlineView.vue` to support all three modes:

```typescript
// Conditionally use the appropriate store
const activeStore = computed(() => {
  if (isUnifiedMode.value) {
    return unifiedStore
  }
  return documentStore
})
```

**Changes:**
- All node operations check `isUnifiedMode` and call appropriate store
- `buildTreeFromStore()` gets nodes from correct store
- Watchers monitor the correct store based on mode
- `nodeCount` computed from correct store
- Dual-write synchronization only runs in dual-write mode

### 5. OutlineNodeContent Migration

Updated `OutlineNodeContent.vue`:
- Helper functions `selectNode()` and `updateNode()` route to correct store
- Selection state from correct store
- Expansion state from correct store
- All node operations use helper functions

## Testing Strategy

### How to Test

1. **Open Dev Tools** (left drawer → Dev tab)
2. **Switch Store Mode** using the radio buttons
3. **Test OutlineView** functionality in each mode:
   - Add nodes
   - Edit nodes
   - Delete nodes
   - Move nodes (drag & drop)
   - Expand/collapse nodes
   - Select nodes

### Expected Behavior

#### Legacy Mode
- Uses DocumentStore + MultiDocumentStore
- All existing functionality works
- Console shows `[Legacy]` logs

#### Unified Mode
- Uses UnifiedDocumentStore only
- All functionality should work identically
- Console shows `[UnifiedStore]` logs
- **This is the key test** - if everything works here, unified store is ready!

#### Dual-Write Mode
- Uses both stores with synchronization
- Console shows both `[Legacy]` and `[UnifiedStore]` logs
- Consistency checks run every 5 seconds
- Shows any data mismatches

## Files Modified

1. `src/core/stores/unifiedDocumentStore.ts` - Added node operations
2. `src/composables/useStoreMode.ts` - Created store mode composable
3. `src/dev/DevPanel.vue` - Added store mode toggle UI
4. `src/features/tree/components/OutlineView.vue` - Support all modes
5. `src/features/tree/components/OutlineNodeContent.vue` - Support all modes

## Next Steps

1. ✅ Test OutlineView with unified store only (toggle to "Unified" mode)
2. ✅ Port WriterView to support store mode toggle
3. ✅ Port MindmapView to support store mode toggle
4. [ ] Test all views with unified store only
5. [ ] Phase out legacy stores once all views work with unified store

## Update: WriterView Migration Complete (2025-12-25)

Successfully ported WriterView to support store mode toggle:

### Files Updated
- `src/features/writer/components/WriterView.vue`
- `src/features/writer/components/WriterNodeContent.vue`

### Changes Made
1. Added store mode imports and setup
2. Updated `buildTreeFromStore()` to get nodes from appropriate store
3. Updated `onTreeChange()` to call appropriate store methods for drag-and-drop
4. Updated watcher to monitor correct store based on mode
5. Added helper functions in WriterNodeContent for `selectNode()` and `updateNode()`
6. Updated all node operations to use helper functions
7. Updated selection state computed property
8. Updated watcher for selection changes

### Testing
WriterView now respects the store mode toggle in dev tools:
- **Legacy Mode**: Uses DocumentStore
- **Unified Mode**: Uses UnifiedDocumentStore only
- **Dual-Write Mode**: Uses both stores with synchronization

## Update: MindmapView Migration Complete (2025-12-25)

Successfully ported MindmapView to support store mode toggle:

### Files Updated
- `src/features/canvas/composables/useMindmapIntegration.ts`
- `src/core/stores/unifiedDocumentStore.ts` (added side management methods)

### Changes Made

#### 1. Added Side Management to UnifiedDocumentStore
Added three new methods for mindmap side management:
- `setNodeSide(nodeId, side, source)` - Set node side (left/right)
- `toggleNodeSide(nodeId, source)` - Toggle between left and right
- `getRootNodesWithSides()` - Get all root nodes with their children's sides

These methods:
- Check if node is depth-1 (immediate child of root)
- Update both `node.data.side` and `node.views.mindmap.side`
- Mark document as dirty
- Emit `store:node-side-changed` event
- Include migration logging

#### 2. Updated useMindmapIntegration Composable
- Added store mode imports and setup
- Updated `mindmapData` computed to get nodes from appropriate store
- Updated `handleNodeSelect()` to call appropriate store
- Updated `handleNodeSideChange()` to call appropriate store

### Testing
MindmapView now respects the store mode toggle in dev tools:
- **Legacy Mode**: Uses DocumentStore
- **Unified Mode**: Uses UnifiedDocumentStore only
- **Dual-Write Mode**: Uses both stores with synchronization

### All Three Views Now Support Store Mode! 🎉

All main views (OutlineView, WriterView, MindmapView) now support the store mode toggle. You can now:
1. Switch to "Unified Store" mode in dev tools
2. Test the entire application with the unified store independently
3. Verify all functionality works without legacy stores

## Benefits

- **Independent Testing**: Can test unified store without legacy stores
- **Gradual Migration**: Can switch modes per view during development
- **Easy Debugging**: Clear separation between stores
- **Confidence**: Verify unified store works before removing legacy code

## Notes

- Store mode persists to localStorage
- Default mode is "dual-write" for safety
- All event signatures remain unchanged
- No breaking changes to existing functionality

