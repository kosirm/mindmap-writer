# Step-by-Step Extraction Guide

This guide provides exact line numbers and copy-paste instructions for refactoring App.vue.

## Step 1: Create useNodeTree.ts

**File:** `src/composables/useNodeTree.ts`

**Copy these functions from App.vue:**

1. **getDirectChildren** (lines 528-530)
2. **getVisibleDescendants** (lines 563-575)
3. **getChildrenSide** (lines 578-595)
4. **getNodeDepth** (lines 598-611)
5. **isRootNode** (lines 888-892)
6. **getRootNode** (lines 894-906)
7. **isNodeOnLeftOfRoot** (lines 908-912)

**Template structure:**
```typescript
import { type Ref } from 'vue'
import type { NodeData } from '../types'
import { getAllDescendants } from '../layout'

export function useNodeTree(nodes: Ref<NodeData[]>) {
  // Paste functions here
  
  return {
    getDirectChildren,
    getVisibleDescendants,
    getChildrenSide,
    getNodeDepth,
    isRootNode,
    getRootNode,
    isNodeOnLeftOfRoot,
    getAllDescendants // re-export from layout
  }
}
```

---

## Step 2: Create useLOD.ts

**File:** `src/composables/useLOD.ts`

**Copy these from App.vue:**

1. **State declarations** (lines 388-392):
   - `lodEnabled`
   - `lodStartPercent`
   - `lodIncrementPercent`

2. **Computed properties:**
   - `lodThresholds` (lines 395-402)
   - `maxTreeDepth` (lines 475-487)
   - `currentLodLevel` (lines 490-504)

3. **Functions:**
   - `getVisibleNodesForLOD` (lines 614-651)
   - `calculateHiddenChildrenBounds` (lines 533-560)

**Template structure:**
```typescript
import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type { NodeData } from '../types'
import { calculateBoundingRect } from '../layout'

export function useLOD(
  nodes: Ref<NodeData[]>,
  viewport: Ref<{ zoom: number; x: number; y: number }>,
  getNodeDepth: (nodeId: string) => number
) {
  // Paste state and computed here
  
  return {
    lodEnabled,
    lodStartPercent,
    lodIncrementPercent,
    lodThresholds,
    maxTreeDepth,
    currentLodLevel,
    getVisibleNodesForLOD,
    calculateHiddenChildrenBounds
  }
}
```

---

## Step 3: Create useNodeDrag.ts

**File:** `src/composables/useNodeDrag.ts`

**Copy these from App.vue:**

1. **State declarations** (lines 355-371):
   - `dragStartPositions`
   - `nodeCrossedSides`
   - `dragStartSides`
   - `descendantDeltas`
   - `potentialParent`
   - `dragMousePosition`

2. **Functions:**
   - `onPaneMouseMove` (lines 1257-1265)
   - `onNodeDragStart` (lines 1267-1307)
   - `onNodeDrag` (lines 1309-1388)
   - `onNodeDragStop` (lines 1621-1752) - **LARGE FUNCTION**
   - `detectPotentialParent` (lines 1390-1467)
   - `mirrorDescendantsAcrossNode` (lines 916-942)

**Dependencies needed:**
- Tree utilities (getRootNode, getAllDescendants)
- Edge utilities (updateEdgesForBranch)
- Layout utilities (resolveAllOverlaps, etc.)

---

## Step 4: Create useNodeOperations.ts

**File:** `src/composables/useNodeOperations.ts`

**Copy these from App.vue:**

1. **Functions:**
   - `addRootNode` (lines 1065-1089)
   - `addChildLeft` (lines 1092-1098)
   - `addChildRight` (lines 1101-1107)
   - `addChild` (lines 1110-1121)
   - `addChildToSide` (lines 1124-1177)
   - `addSibling` (lines 1179-1222)
   - `detachNode` (lines 1224-1255)
   - `reparentNode` (lines 1469-1619) - **LARGE FUNCTION**
   - `toggleCollapse` (lines 985-1011)
   - `toggleCollapseLeft` (lines 1013-1037)
   - `toggleCollapseRight` (lines 1039-1063)

**Also need:**
- `nodeCounter` variable (line 429)
- `closeContextMenu` function (lines 1764-1766)

---

## Step 5: Create useEdgeManagement.ts

**File:** `src/composables/useEdgeManagement.ts`

**Copy these from App.vue:**

1. **State:**
   - `edgeType` (line 409)
   - `edgeTypeOptions` (lines 410-416)

2. **Computed:**
   - `visibleEdges` (lines 457-467)

3. **Functions:**
   - `createEdge` (lines 2150-2185)
   - `updateEdgeHandles` (lines 967-982)
   - `updateEdgesForBranch` (lines 945-964)

---

## Step 6: Create useVueFlowSync.ts

**File:** `src/composables/useVueFlowSync.ts`

**Copy these from App.vue:**

1. **State:**
   - `vueFlowNodes` (line 340)

2. **Functions:**
   - `syncToVueFlow` (lines 700-870) - **VERY LARGE FUNCTION ~170 lines**
   - `syncFromVueFlow` (lines 873-885)
   - `measureNodeDimensions` (lines 655-668)
   - `updateNodeDimensionsFromDOM` (lines 672-697)

**This is the most complex composable - needs many dependencies**

---

## Step 7: Create useStressTest.ts

**File:** `src/composables/useStressTest.ts`

**Copy these from App.vue:**

1. **State:**
   - `algorithm` (line 378)
   - `stressTestNodeCount` (line 379)
   - `lastPerformance` (lines 380-385)

2. **Functions:**
   - `generateTestData` (lines 1833-1908)
   - `clearAll` (lines 1910-1916)
   - `runStressTest` (lines ~1920-2114) - **VERY LARGE FUNCTION ~200 lines**
   - `createNode` (lines 2130-2148)
   - `delay` helper (lines 2117-2119)

---

## Quick Reference: Line Numbers by Category

### State Variables (lines 334-429)
- VueFlow instance: 335
- Core state: 338-340
- Display options: 345-352
- Drag tracking: 355-371
- Layout spacing: 374-375
- Stress test: 378-385
- LOD: 388-402
- Display: 405-416
- Node counter: 429

### Computed Properties (lines 432-504)
- viewportTransform: 432
- boundingBoxes: 438
- rootNodes: 453
- visibleEdges: 457
- renderedNodeCount: 470
- maxTreeDepth: 475
- currentLodLevel: 490

### Watchers (lines 508-519)
- viewport.zoom watcher: 508
- lodEnabled watcher: 517

### Helper Functions (lines 528-697)
- Tree traversal: 528-611
- LOD: 614-651
- DOM measurement: 655-697

### Core Functions (lines 700-1063)
- VueFlow sync: 700-885
- Tree helpers: 888-912
- Mirroring: 916-942
- Edge management: 945-982
- Collapse: 985-1063

### Node Operations (lines 1065-1255)
- Add nodes: 1065-1222
- Detach: 1224-1255

### Drag Operations (lines 1257-1752)
- Drag handlers: 1267-1619
- Context menu: 1754-1766

### UI Handlers (lines 1768-1916)
- Toggle functions: 1768-1779
- Keyboard: 1785-1809
- Mounted/unmounted: 1812-1821
- Spacing: 1823-1831
- Test data: 1833-1916

### Stress Test (lines 1920-2190)
- runStressTest: ~1920-2114
- Helpers: 2117-2185
- Initialize: 2188-2190

---

## Recommended Order of Extraction

1. **Start with useNodeTree** - No dependencies, pure functions
2. **Then useLOD** - Depends only on useNodeTree
3. **Then useEdgeManagement** - Relatively independent
4. **Then useNodeOperations** - Depends on tree + edges
5. **Then useVueFlowSync** - Depends on LOD + tree
6. **Then useNodeDrag** - Depends on tree + edges + layout
7. **Finally useStressTest** - Depends on everything

---

## Notes

- Some functions are **VERY LARGE** (100-200 lines)
- Many functions have dependencies on other functions
- You may need to pass functions as parameters between composables
- Consider creating a "master composable" that combines all others
- Keep `nodes` and `edges` refs in a shared store/composable

