# ConceptMap Parent Node Resize Fix

**Date:** 2025-12-04  
**Status:** ✅ SOLVED

## Problem

In ConceptMapView, parent nodes would not properly resize when children were dragged:
- **Right edge**: Expanded during drag but reverted after drop
- **Bottom edge**: Did NOT expand at all
- **Left edge**: Moved children unexpectedly

VueFlow's `expandParent: true` was fighting with our programmatic size changes, overwriting them.

## Root Cause

1. **VueFlow's `expandParent`** only expands (never shrinks) and manages dimensions internally
2. **Two-way binding (`v-model:nodes`)** caused VueFlow to overwrite our calculated sizes
3. **ConceptNode CSS** didn't fill its VueFlow wrapper container

## Solution

### 1. One-way binding (ConceptMapView.vue)
```vue
<!-- Before -->
<VueFlow v-model:nodes="vueFlowNodes" ...>

<!-- After -->
<VueFlow :nodes="vueFlowNodes" ...>
```

### 2. Removed `expandParent: true` (ConceptMapView.vue)
We handle parent sizing manually via `adjustParentSize()` instead of VueFlow's inconsistent expandParent.

### 3. Used `setNodes()` for forced updates (ConceptMapView.vue)
```typescript
function buildVueFlowNodes() {
  const newNodes: Node[] = sorted.map(node => { ... })
  vueFlowNodes.value = newNodes
  setNodes(newNodes)  // Force VueFlow to recognize changes
}
```

### 4. Added `updateNodeInternals()` after size changes (ConceptMapView.vue)
```typescript
function onNodeDragStop(event: NodeDragEvent) {
  // ... update positions, resolve overlaps, build nodes ...
  
  // Force VueFlow to recognize dimension changes
  updateNodeInternals([...affectedParentIds])
}
```

### 5. Made ConceptNode fill its container (ConceptNode.vue)
```css
.concept-node {
  width: 100%;
  height: 100%;
  /* ... other styles ... */
}
```

## Files Changed

- `mindscribble/quasar/src/features/canvas/components/conceptmap/ConceptMapView.vue`
- `mindscribble/quasar/src/features/canvas/components/conceptmap/ConceptNode.vue`

## Impact

This fix enables **reparenting functionality** - when a node is dropped onto another node, it can become its child. With `expandParent: true` this was impossible because the parent border would be dragged together with the child node, making it unusable.

This is the foundation for implementing drag-and-drop reparenting in ConceptMapView (similar to MindMapView).

## Key Learnings

1. VueFlow's `expandParent` is useful for simple cases but fights programmatic control
2. One-way binding (`:nodes`) gives us full control over node state
3. `setNodes()` + `updateNodeInternals()` are required to force VueFlow to recognize changes
4. Custom node components must have `width: 100%; height: 100%` to fill their VueFlow wrapper

