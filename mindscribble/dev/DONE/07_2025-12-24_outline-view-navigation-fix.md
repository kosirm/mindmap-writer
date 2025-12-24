# Outline View Navigation Fix - 2025-12-24

## Problem
In outline view, expand/collapse and navigation were not working correctly when edit mode was OFF:
- After collapsing a node with Alt+Left, could not expand it with Alt+Right
- After collapsing, Down arrow navigation didn't work
- After collapsing, Up arrow moved selection to wrong node (second last node in tree)
- Focus was jumping to incorrect nodes after expand/collapse operations

## Root Causes

### 1. Reactivity Issue
The `flattenedNodes` computed property in `useOutlineNavigation` was not reactive to expansion state changes:
- It only watched `treeData.value` changes
- Expansion state is stored in `node.views.outline.expanded` (not part of treeData)
- When nodes were collapsed/expanded, the computed property didn't recalculate
- Navigation still thought collapsed children were visible

### 2. Focus Loss Issue
After expand/collapse operations, keyboard focus was lost:
- In edit mode: Tiptap editor is persistent, maintains focus through DOM updates
- In non-edit mode: Keyboard handlers attached to DOM elements that get recreated by he-tree
- When he-tree re-renders after expand/collapse, DOM elements are recreated
- Focus jumps to wrong element (often last rendered node)

## Solution

### 1. Make flattenedNodes Reactive to Expansion State
**File**: `mindscribble/quasar/src/features/tree/composables/useOutlineNavigation.ts`

Changed `flattenVisibleTree` to directly access `item.node.views.outline?.expanded` instead of calling `documentStore.isNodeExpanded()`. This ensures Vue's reactivity system tracks these property reads and triggers recomputation when expansion state changes.

```typescript
// Before: Called store method (not reactive)
const isExpanded = documentStore.isNodeExpanded(item.id)

// After: Direct property access (reactive)
const isExpanded = item.node.views.outline?.expanded ?? true
```

### 2. Refocus Node After Expand/Collapse
**File**: `mindscribble/quasar/src/features/tree/components/OutlineNodeContent.vue`

Added `setTimeout` with 100ms delay to refocus the node after expand/collapse operations:

```typescript
onAltLeftArrow: () => {
  if (props.stat.children.length > 0) {
    const nodeIdToRefocus = props.node.id
    documentStore.collapseNode(props.node.id, 'outline')
    // Wait for he-tree to finish DOM updates
    setTimeout(() => {
      focusNode(nodeIdToRefocus)
    }, 100)
  }
}
```

**Why 100ms?**
- `nextTick()` wasn't enough - he-tree does async DOM updates
- 100ms provides buffer for he-tree to complete re-render
- For huge maps (hundreds of nodes), this timeout may need adjustment

## Files Modified
- `mindscribble/quasar/src/features/tree/composables/useOutlineNavigation.ts`
- `mindscribble/quasar/src/features/tree/components/OutlineNodeContent.vue`

## Testing
Verified with tree structure: 1 root → 3 children → 2 children each
- ✅ Alt+Left collapses node
- ✅ Alt+Right expands same node
- ✅ Down arrow navigates correctly after expand/collapse
- ✅ Up arrow navigates correctly after expand/collapse
- ✅ Focus stays on correct node throughout operations

## Future Considerations
If performance issues arise with very large maps (hundreds of nodes):
- May need to increase the 100ms timeout
- Could implement dynamic timeout based on tree size
- Could optimize he-tree rendering to be more predictable

