# Session Summary: Concept Map with Nested Nodes

## Date: 2024-12-03

## Overview

This session focused on implementing the **Concept Map view** using VueFlow's nested nodes feature. Unlike the Mindmap view where parent-child relationships are shown with edges and horizontal layout, the Concept Map uses visual nesting - child nodes appear **inside** their parent nodes.

---

## What We Achieved

### 1. Initial Setup Fixes
- Fixed stress test function (`mindmapRef` was null due to timing issues)
- Fixed initial zoom level (was 300%, corrected to 100%)
- Centered initial root node on canvas

### 2. Created ConceptMapView Component
- New component at `src/components/conceptmap/ConceptMapView.vue`
- Uses VueFlow's `parentNode` property for nesting
- Child positions are relative to parent
- Separate position storage: `conceptMapPosition` (vs `mindmapPosition` for mindmap)

### 3. Context Menu Operations
- **Add Child** - Creates nested node inside current node
- **Add Sibling** - Creates node at same level
- **Wrap in Parent** - Creates new parent and moves node inside
- **Detach from Parent** - Makes node a root node (not available for root nodes)
- **Delete** - Removes node and all descendants

### 4. Dynamic Parent Sizing
Parent nodes automatically resize based on children:
- Expands when children move toward edges
- **Contracts** when children move away from edges (key fix!)
- Works recursively up the hierarchy (grandparents resize too)

---

## Key Problems & Solutions

### Problem 1: Edges Showing as Empty Boxes
**Symptom:** Empty box elements appeared behind concept map nodes
**Cause:** Edge components were being rendered even though not needed
**Solution:** Return empty array from `vueFlowEdges` computed property

```typescript
const vueFlowEdges = computed<Edge[]>(() => {
  return [] // No edges in concept map - nesting shows relationships
})
```

### Problem 2: ESLint "no-mutating-props" Errors
**Symptom:** Errors when modifying `props.nodes` directly
**Solution:** Emit events for parent to handle mutations

```typescript
emit('add-node', newNode)
emit('delete-nodes', nodeIds)
emit('update-node', nodeId, { conceptMapPosition: { x, y } })
```

### Problem 3: Asymmetric Parent Resize (Main Challenge)
**Symptom:** Parent resized correctly for right/bottom but not for left/top
- Moving child right → parent contracts ✓
- Moving child down → parent contracts ✓
- Moving child left → parent expands but never contracts ✗
- Moving child up → parent expands but never contracts ✗

**Root Cause:** No logic to detect "slack" when child moves away from left/top edges

**Solution:** Direction-based resizing with anchor point concept

```typescript
// Track drag direction
let lastDragPos: { x: number; y: number } | null = null

function adjustParentBasedOnDirection(parentId, movingChildId, deltaX, deltaY) {
  // Moving LEFT & child below minimum → expand parent left
  if (deltaX < 0 && childPos.x < minX) {
    parentShiftX = childPos.x - minX  // negative shift
  }
  // Moving RIGHT → check if we can contract from left
  else if (deltaX > 0) {
    const newMinX = findMinChildX(children)
    if (newMinX > minX) {
      parentShiftX = newMinX - minX  // positive shift (contract)
    }
  }
  // Same logic for Y axis...
  
  // Apply: move parent, compensate all children
  parent.conceptMapPosition.x += parentShiftX
  for (child of children) {
    child.conceptMapPosition.x -= parentShiftX
  }
}
```

**Key Insight:** The anchor point depends on movement direction:
- Moving right/down → anchor top-left corner
- Moving left/up → anchor bottom-right corner

---

## File Changes

| File | Changes |
|------|---------|
| `src/components/conceptmap/ConceptMapView.vue` | New - main concept map component |
| `src/components/conceptmap/ConceptNode.vue` | New - custom node component |
| `src/components/mindmap/types.ts` | Added `conceptMapPosition`, `conceptMapSize` |
| `src/pages/IndexPage.vue` | Wired up ConceptMapView with event handlers |

---

## Next Steps (Next Session)

1. **Mindmap → Concept Map converter** - Generate initial nested layout from tree structure
2. **Concept Map → Mindmap converter** - Generate horizontal layout from nested structure
3. Both use the shared `NodeData` structure with view-specific positions

---

## Technical Notes

### Nested Nodes in VueFlow
```typescript
// Child node with parent
const childNode = {
  id: 'child-1',
  parentNode: 'parent-1',  // Makes position relative to parent
  expandParent: true,       // Allow child to expand parent bounds
  position: { x: 20, y: 50 } // Relative to parent's content area
}
```

### Dual Position System
```typescript
interface NodeData {
  // ... other fields
  mindmapPosition?: { x: number; y: number }    // For mindmap view
  conceptMapPosition?: { x: number; y: number } // For concept map view
  conceptMapSize?: { width: number; height: number }
}
```

