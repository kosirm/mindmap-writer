# Session 04: Reference Edges, Edge Types & Concept Map Improvements
**Date:** 2025-12-05

## Summary
Major improvements to concept map view including proper node sizing/styling, parent resize fixes, and reference edge system with auto-pinning and configurable edge types.

## Features Implemented

### 1. Concept Map Parent Resize Fix
- Fixed nodes gaining children in mindmap overflowing parent boundaries when viewed in concept map
- Implemented correct order: resolve sibling overlaps FIRST, THEN resize parents (bottom-up)
- Parents now properly expand to contain all children with appropriate padding

### 2. Concept Map Node Styling
- Made concept map nodes match mindmap node style and size
- Both views now use consistent MIN_NODE_WIDTH=100 and MIN_NODE_HEIGHT=30
- Added proper padding, flexbox layout, and visual styling to ConceptNode

### 3. Default Settings Changes
- Changed default orientation to counter-clockwise (more natural for mindmaps)
- Changed default node name from empty to 'Untitled'

### 4. Reference Edge Creation (Hold C + Drag)
- Users can create reference edges by holding the C key and dragging from one node handle to another
- Works in both mindmap and concept map views
- Reference edges are styled differently (purple dashed line) to distinguish from hierarchy edges

### 5. Reference Edge Persistence
- Reference edges are saved to the document store
- Edges persist when switching between views (mindmap ↔ concept map)

### 6. Auto-Pin Reference Edges to Optimal Handles
- When switching views, reference edge handles are automatically recalculated
- Algorithm determines best connection point (top/bottom/left/right) based on relative node positions
- Uses the same pattern as hierarchy edges: compare center positions, choose based on larger delta (dx vs dy)

### 7. Edge Type Settings in Dev Tools
- Added dropdowns for hierarchy edge type and reference edge type
- Options: Bezier, Straight, Step, Smooth Step, Simple Bezier
- Settings are reactive - changing dropdown updates edges immediately

## Roadblocks & Solutions

### 1. Concept Map Parent Resize Order
**Problem:** When nodes gained children in mindmap view, switching to concept map showed children overflowing parent boundaries.
**Root Cause:** We were resizing parents before resolving sibling overlaps, causing incorrect size calculations.
**Solution:** Changed order to: resolve sibling overlaps FIRST (ensures children don't overlap), THEN resize parents bottom-up (so parent sizes are based on final child positions).

### 2. Concept Map Node Size Mismatch
**Problem:** Concept map nodes were much smaller (34x12) than mindmap nodes (62x24).
**Root Cause:** ConceptNode.vue and useConceptMapLayout.ts had different min size constants.
**Solution:** Updated both to use MIN_NODE_WIDTH=100, MIN_NODE_HEIGHT=30, matching mindmap.

### 3. Concept Map Node "Inner Node" Issue
**Problem:** After fixing sizes, nodes appeared correct but handles were positioned on a smaller "inner" element - pins appeared over node title, children stuck outside parent on right side.
**Root Cause:** ConceptNode CSS didn't have proper sizing constraints, so the visual element didn't match VueFlow's internal node dimensions.
**Solution:** Added CSS to ConceptNode matching CustomNode from mindmap:
```css
.concept-node {
  min-width: 100px;
  min-height: 30px;
  padding: 2px 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### 4. Reference Edges Not Being Created
**Problem:** Dragging from handle to handle showed connection line but nothing happened on drop.
**Root Cause:** VueFlow was rejecting connections because handles had `type="source"` on both ends or similar invalid combinations.
**Solution:** Added `is-valid-connection` prop to VueFlow that always returns `true`:
```vue
<VueFlow :is-valid-connection="isValidConnection" ...>
```
```typescript
const isValidConnection = () => true
```

### 5. Reference Edges Hidden Behind Parent Nodes
**Problem:** In concept map, reference edges appeared behind parent node boxes.
**Solution:** Added CSS to ensure edges container has higher z-index than nodes.

### 6. Reference Edges Hidden When Parent Selected
**Problem:** Selecting a parent node hid reference edges because VueFlow sets selected nodes to z-index: 1000.
**Solution:** Increased edges z-index to 1001:
```css
:deep(.vue-flow__edges) {
  z-index: 1001 !important;
}
```

### 7. TypeScript Error with Edge Class Property
**Problem:** `edge.class?.includes('edge-reference')` caused type error because `class` can be various types.
**Solution:** Added type guard:
```typescript
const classValue = edge.class
const isReferenceEdge = edge.data?.edgeType === 'reference' || 
  (typeof classValue === 'string' && classValue.includes('edge-reference')) ||
  (Array.isArray(classValue) && classValue.includes('edge-reference'))
```

## Key Files Modified
- `mindscribble/quasar/src/features/canvas/composables/useReferenceEdges.ts` - C key detection and edge creation
- `mindscribble/quasar/src/features/canvas/composables/mindmap/useEdgeManagement.ts` - Edge type management
- `mindscribble/quasar/src/features/canvas/components/MindmapView.vue` - Reference edge loading, getOptimalHandles
- `mindscribble/quasar/src/features/canvas/components/conceptmap/ConceptMapView.vue` - Reference edge loading, getOptimalHandles, z-index fixes
- `mindscribble/quasar/src/features/canvas/components/conceptmap/ConceptNode.vue` - Node styling to match mindmap
- `mindscribble/quasar/src/features/canvas/composables/conceptmap/useConceptMapLayout.ts` - Node size constants
- `mindscribble/quasar/src/features/canvas/composables/conceptmap/useConceptMapCollision.ts` - Parent resize logic
- `mindscribble/quasar/src/dev/devSettingsStore.ts` - Edge type settings, default orientation
- `mindscribble/quasar/src/dev/MindMapDevTools.vue` - Edge type dropdowns

## Technical Notes

### Handle Naming Convention
- Format: `{position}-{type}` e.g., `right-source`, `left-target`, `top-source`, `bottom-target`
- Positions: top, bottom, left, right
- Types: source (outgoing), target (incoming)

### Optimal Handle Calculation
```typescript
function getOptimalHandles(sourceId, targetId) {
  // Calculate center positions
  const dx = targetCenterX - sourceCenterX
  const dy = targetCenterY - sourceCenterY
  
  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal: right→left or left→right
    return dx > 0 
      ? { sourceHandle: 'right-source', targetHandle: 'left-target' }
      : { sourceHandle: 'left-source', targetHandle: 'right-target' }
  } else {
    // Vertical: bottom→top or top→bottom
    return dy > 0
      ? { sourceHandle: 'bottom-source', targetHandle: 'top-target' }
      : { sourceHandle: 'top-source', targetHandle: 'bottom-target' }
  }
}
```

### Edge Data Structure
Reference edges have `data.edgeType: 'reference'` and class `edge-reference` to distinguish from hierarchy edges.

