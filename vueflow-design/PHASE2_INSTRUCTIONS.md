# Phase 2: Create MindmapView Component - Exact Instructions

## Overview
Copy the entire App.vue into MindmapView.vue, then gradually refactor to use composables.

---

## Step 1: Copy Template Section

**Source:** `App.vue` lines 1-320  
**Destination:** `src/views/MindmapView.vue`

**What to copy:**
- Everything from `<template>` to `</template>`
- Includes: Controls Panel, VueFlow Canvas, Overlays, Context Menu, Zoom Indicator

**Action:**
1. Open `App.vue`
2. Select lines 1-320
3. Copy
4. Create new file `src/views/MindmapView.vue`
5. Paste at the top

---

## Step 2: Copy Script Section

**Source:** `App.vue` lines 322-2190  
**Destination:** `src/views/MindmapView.vue` (append after template)

**What to copy:**
- Everything from `<script setup lang="ts">` to the end of the script
- All imports, state, computed, functions

**Action:**
1. In `App.vue`, select lines 322-2190
2. Copy
3. In `MindmapView.vue`, paste after the `</template>` tag

**Important:** Change import paths:
- `'./components/CustomNode.vue'` → `'../components/CustomNode.vue'`
- `'./components/LodBadgeNode.vue'` → `'../components/LodBadgeNode.vue'`
- `'./types'` → `'../types'`
- `'./layout'` → `'../layout'`
- `'./layout-rbush'` → `'../layout-rbush'`

---

## Step 3: Copy Style Section

**Source:** `App.vue` lines 2192-2736  
**Destination:** `src/views/MindmapView.vue` (append after script)

**What to copy:**
- Everything from `<style scoped>` to `</style>`
- All CSS for controls panel, canvas, nodes, etc.

**Action:**
1. In `App.vue`, select lines 2192-2736
2. Copy
3. In `MindmapView.vue`, paste after the `</script>` tag

---

## Step 4: Test MindmapView

Before refactoring, verify the component works standalone.

**Create a test App.vue:**

```vue
<template>
  <MindmapView />
</template>

<script setup lang="ts">
import MindmapView from './views/MindmapView.vue'
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow: hidden;
}

#app {
  width: 100vw;
  height: 100vh;
}
</style>
```

**Test:**
1. Run `npm run dev`
2. Verify all features work:
   - Add root node
   - Add children
   - Drag nodes
   - Collapse/expand
   - LOD system
   - Stress test
   - Bounding boxes

---

## Step 5: Refactor MindmapView to Use Composables

**Only after Phase 1 composables are created!**

### 5.1 Add composable imports

At the top of the script section in `MindmapView.vue`, add:

```typescript
import { useNodeTree } from '../composables/useNodeTree'
import { useLOD } from '../composables/useLOD'
import { useNodeDrag } from '../composables/useNodeDrag'
import { useNodeOperations } from '../composables/useNodeOperations'
import { useEdgeManagement } from '../composables/useEdgeManagement'
import { useVueFlowSync } from '../composables/useVueFlowSync'
import { useStressTest } from '../composables/useStressTest'
```

### 5.2 Replace inline code with composable calls

**Example for useNodeTree:**

**Before:**
```typescript
function getDirectChildren(nodeId: string): NodeData[] {
  return nodes.value.filter(n => n.parentId === nodeId)
}
// ... more functions
```

**After:**
```typescript
const {
  getDirectChildren,
  getVisibleDescendants,
  getChildrenSide,
  getNodeDepth,
  isRootNode,
  getRootNode,
  isNodeOnLeftOfRoot,
  getAllDescendants
} = useNodeTree(nodes)
```

**Repeat for all composables:**

```typescript
const {
  lodEnabled,
  lodStartPercent,
  lodIncrementPercent,
  lodThresholds,
  maxTreeDepth,
  currentLodLevel,
  getVisibleNodesForLOD,
  calculateHiddenChildrenBounds
} = useLOD(nodes, viewport, getNodeDepth)

const {
  dragStartPositions,
  nodeCrossedSides,
  dragStartSides,
  descendantDeltas,
  potentialParent,
  dragMousePosition,
  onNodeDragStart,
  onNodeDrag,
  onNodeDragStop,
  detectPotentialParent,
  mirrorDescendantsAcrossNode,
  onPaneMouseMove
} = useNodeDrag(nodes, edges, viewport, /* pass dependencies */)

// ... etc for other composables
```

### 5.3 Delete replaced code

After importing from composables, delete the original function definitions.

**Be careful:** Some functions might be called by other functions. Make sure all dependencies are resolved.

---

## Step 6: Verify Refactored MindmapView

After refactoring:

1. Run `npm run dev`
2. Test all features again
3. Check console for errors
4. Verify no functionality is broken

---

## Common Issues

### Issue 1: Circular dependencies
**Problem:** Composable A needs function from composable B, which needs function from A  
**Solution:** Create a "master composable" or pass functions as parameters

### Issue 2: Missing reactive context
**Problem:** Functions lose reactivity when moved to composables  
**Solution:** Ensure refs are passed correctly, use `.value` where needed

### Issue 3: Import path errors
**Problem:** Relative imports break after moving files  
**Solution:** Update all import paths (add `../` for parent directory)

### Issue 4: Type errors
**Problem:** TypeScript can't find types after refactoring  
**Solution:** Ensure all types are exported from `types.ts` and imported correctly

---

## Rollback Plan

If refactoring breaks something:

1. Keep `App-original.vue` as backup
2. Can always revert to working version
3. Refactor incrementally - one composable at a time
4. Test after each composable extraction

---

## Next Steps

After MindmapView is working with composables:

1. Move to Phase 3: Create ConceptMapView
2. Move to Phase 4: Create tabbed App.vue
3. Move to Phase 5: Position conversion utilities
4. Move to Phase 6: Testing and cleanup

