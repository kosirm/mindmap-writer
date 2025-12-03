# Refactoring Plan: Multi-View Support (Mindmap + Concept Map)

## Overview
Refactor the 2739-line App.vue into manageable composables and separate view components to support both Mindmap and Concept Map views.

## Phase 1: Extract Composables from App.vue

### 1.1 Create `src/composables/useNodeTree.ts`
**Purpose:** Tree traversal and hierarchy utilities  
**Functions to extract:**
- `getDirectChildren(nodeId: string): NodeData[]` (line 528)
- `getVisibleDescendants(nodeId: string): NodeData[]` (line 563)
- `getChildrenSide(nodeId: string): 'left' | 'right' | null` (line 578)
- `getNodeDepth(nodeId: string): number` (line 598)
- `getRootNode(nodeId: string): NodeData | null` (line 894)
- `isRootNode(nodeId: string | null): boolean` (line 888)
- `isNodeOnLeftOfRoot(node: NodeData): boolean` (line 908)
- Import `getAllDescendants` from `layout.ts`

**Parameters needed:** `nodes: Ref<NodeData[]>`

---

### 1.2 Create `src/composables/useLOD.ts`
**Purpose:** Level of Detail system  
**State to extract:**
- `lodEnabled: Ref<boolean>` (line 388)
- `lodStartPercent: Ref<number>` (line 391)
- `lodIncrementPercent: Ref<number>` (line 392)
- `lodThresholds: ComputedRef<number[]>` (line 395)
- `currentLodLevel: ComputedRef<number>` (line 490)
- `maxTreeDepth: ComputedRef<number>` (line 475)

**Functions to extract:**
- `getVisibleNodesForLOD(): NodeData[]` (line 614)
- `calculateHiddenChildrenBounds(hiddenChildren: NodeData[]): {...}` (line 533)

**Parameters needed:** `nodes: Ref<NodeData[]>`, `viewport: Ref<Viewport>`

---

### 1.3 Create `src/composables/useNodeDrag.ts`
**Purpose:** Node dragging, mirroring, and reparenting  
**State to extract:**
- `dragStartPositions: Ref<Map<string, {x, y}>>` (line 355)
- `nodeCrossedSides: Ref<boolean>` (line 358)
- `dragStartSides: Ref<Map<string, 'left' | 'right'>>` (line 361)
- `descendantDeltas: Ref<Map<string, {deltaX, deltaY}>>` (line 365)
- `potentialParent: Ref<string | null>` (line 368)
- `dragMousePosition: Ref<{x, y} | null>` (line 371)

**Functions to extract:**
- `onNodeDragStart(event: NodeDragEvent)` (line 1267)
- `onNodeDrag(event: NodeDragEvent)` (line 1309)
- `onNodeDragStop(event: NodeDragEvent)` (line 1621)
- `detectPotentialParent(draggedNode, mouseX?, mouseY?)` (line 1390)
- `mirrorDescendantsAcrossNode(node: NodeData)` (line 916)
- `onPaneMouseMove(event: MouseEvent)` (line 1257)

**Parameters needed:** `nodes: Ref<NodeData[]>`, `edges: Ref<Edge[]>`, `viewport: Ref<Viewport>`, tree utilities, edge utilities

---

### 1.4 Create `src/composables/useNodeOperations.ts`
**Purpose:** Node CRUD operations  
**Functions to extract:**
- `addRootNode()` (line 1065)
- `addChild()` (line 1110)
- `addChildLeft()` (line 1092)
- `addChildRight()` (line 1101)
- `addChildToSide(parent, side)` (line 1124)
- `addSibling()` (line 1179)
- `detachNode()` (line 1224)
- `reparentNode(nodeId, newParentId)` (line 1469)
- `toggleCollapse(nodeId)` (line 985)
- `toggleCollapseLeft(nodeId)` (line 1013)
- `toggleCollapseRight(nodeId)` (line 1039)

**Parameters needed:** `nodes: Ref<NodeData[]>`, `edges: Ref<Edge[]>`, `contextMenu: Ref<ContextMenuState>`, `nodeCounter: Ref<number>`, `viewport: Ref<Viewport>`

---

### 1.5 Create `src/composables/useEdgeManagement.ts`
**Purpose:** Edge creation and updates  
**Functions to extract:**
- `createEdge(sourceId, targetId)` (line 2150)
- `updateEdgeHandles(parentId, childId, isLeftSide)` (line 967)
- `updateEdgesForBranch(node: NodeData)` (line 945)

**Computed to extract:**
- `visibleEdges: ComputedRef<Edge[]>` (line 457)

**Parameters needed:** `nodes: Ref<NodeData[]>`, `edges: Ref<Edge[]>`, `vueFlowNodes: Ref<Node[]>`, `edgeType: Ref<string>`

---

### 1.6 Create `src/composables/useVueFlowSync.ts`
**Purpose:** Sync between data model and VueFlow  
**State to extract:**
- `vueFlowNodes: Ref<Node[]>` (line 340)

**Functions to extract:**
- `syncToVueFlow()` (line 700) - LARGE function ~170 lines
- `syncFromVueFlow()` (line 873)
- `measureNodeDimensions(nodeId): {width, height} | null` (line 655)
- `updateNodeDimensionsFromDOM(): Promise<boolean>` (line 672)

**Parameters needed:** `nodes: Ref<NodeData[]>`, `edges: Ref<Edge[]>`, LOD utilities, tree utilities, `viewport: Ref<Viewport>`

---

### 1.7 Create `src/composables/useStressTest.ts`
**Purpose:** Performance testing and test data generation  
**State to extract:**
- `algorithm: Ref<'aabb' | 'rbush'>` (line 378)
- `stressTestNodeCount: Ref<number>` (line 379)
- `lastPerformance: Ref<{...} | null>` (line 380)

**Functions to extract:**
- `runStressTest()` (line ~1920) - LARGE function
- `generateTestData()` (line 1833)
- `clearAll()` (line 1910)
- `createNode(label, parentId, x, y): NodeData` (line 2130)

**Parameters needed:** `nodes: Ref<NodeData[]>`, `edges: Ref<Edge[]>`, `nodeCounter: Ref<number>`, layout utilities

---

## Phase 2: Create MindmapView Component

### 2.1 Copy App.vue template to MindmapView.vue
- Copy lines 1-320 (entire template section)
- Keep: VueFlow canvas, overlays, context menu, zoom indicator

### 2.2 Copy App.vue script to MindmapView.vue  
- Copy lines 322-2190 (entire script section)

### 2.3 Copy App.vue styles to MindmapView.vue
- Copy lines 2192-2736 (entire style section)

### 2.4 Refactor MindmapView to use composables
- Replace inline functions with composable imports
- Keep only view-specific logic in component

---

## Phase 3: Create ConceptMapView Component

### 3.1 Design ConceptMapView layout
- Use VueFlow with `parentNode` support
- Use `conceptMapPosition` from NodeData
- Nested node rendering

### 3.2 Implement nested node resizing
- Auto-resize parent when child moves
- Maintain padding around children

### 3.3 Add concept map controls
- Controls panel for concept-specific settings

---

## Phase 4: Create New App.vue with Tabs

### 4.1 Backup original App.vue
- Rename to `App-original.vue`

### 4.2 Replace App.vue with tabbed version
- Use `App-new.vue` as template
- Tab navigation: Mindmap | Concept Map
- Render appropriate view component

### 4.3 Create shared state/store
- Create Pinia store or composable
- Shared: `nodes`, `edges`, `activeView`

### 4.4 Wire up views to shared state
- Both views use same data source
- Different position fields per view

---

## Phase 5: Position Conversion Utilities

### 5.1 Create `src/utils/positionConverter.ts`
- `convertMindmapToConceptMap(nodes: NodeData[]): void`
- `convertConceptMapToMindmap(nodes: NodeData[]): void`

### 5.2 Add conversion buttons
- UI to trigger layout conversion

---

## Phase 6: Testing and Cleanup

### 6.1 Test MindmapView
- Drag, collapse, LOD, stress test

### 6.2 Test ConceptMapView
- Nested nodes, resizing

### 6.3 Test tab switching
- State preservation

### 6.4 Remove temporary files
- Delete `App-new.vue`, `App-original.vue`

---

## File Structure After Refactoring

```
src/
├── App.vue (new tabbed version)
├── components/
│   ├── CustomNode.vue
│   └── LodBadgeNode.vue
├── composables/
│   ├── useNodeTree.ts
│   ├── useLOD.ts
│   ├── useNodeDrag.ts
│   ├── useNodeOperations.ts
│   ├── useEdgeManagement.ts
│   ├── useVueFlowSync.ts
│   └── useStressTest.ts
├── views/
│   ├── MindmapView.vue
│   └── ConceptMapView.vue
├── stores/
│   └── mindmapStore.ts (shared state)
├── utils/
│   └── positionConverter.ts
├── layout.ts (existing)
├── layout-rbush.ts (existing)
└── types.ts (updated with ViewPosition)
```

