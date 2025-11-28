# MindMap Layout Engine - Complete Documentation

## Overview

This project implements a high-performance mindmap layout engine with advanced features including:
- **Nested Rectangle Layout Algorithm** - Custom layout where parent nodes contain their children
- **Level of Detail (LOD) System** - Google Maps-style progressive disclosure based on zoom level
- **Lazy/Incremental Position Calculation** - Only calculates positions for visible nodes
- **Collision Detection & Resolution** - Automatic overlap prevention using AABB algorithm
- **Dynamic Zoom Management** - Max zoom adjusts automatically based on tree depth

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Features](#core-features)
3. [Data Model](#data-model)
4. [Layout Algorithm](#layout-algorithm)
5. [LOD System](#lod-system)
6. [Performance Optimizations](#performance-optimizations)
7. [UI Components](#ui-components)
8. [Integration Guide](#integration-guide)
9. [Configuration Options](#configuration-options)

---

## Architecture Overview

### Technology Stack
- **Vue 3** with Composition API
- **VueFlow** - Canvas rendering and viewport management
- **TypeScript** - Type safety

### Key Files Structure
```
src/
├── App.vue                      # Main application with layout logic
├── components/
│   ├── CustomNode.vue          # Individual node rendering
│   └── LodBadgeNode.vue        # LOD badge for hidden children
├── types.ts                     # TypeScript interfaces
├── layout.ts                    # Layout algorithm (bounding boxes, overlap resolution)
└── layout-rbush.ts             # RBush spatial index (alternative algorithm)
```

### Data Flow
```
User Action → Update nodes[] → Calculate Layout → Sync to VueFlow → Render
                    ↓
              LOD Filtering → Only visible nodes → Performance boost
```

---

## Core Features

### 1. Nested Rectangle Layout

**What it does:** Arranges nodes in a hierarchical structure where parent rectangles contain all their children.

**Key characteristics:**
- Parent bounding box encompasses all descendants
- Configurable horizontal and vertical spacing
- Automatic overlap detection and resolution
- Preserves spatial relationships during drag operations

**Files:** `layout.ts` - `calculateBoundingRect()`, `resolveAllOverlaps()`

### 2. Level of Detail (LOD) System

**What it does:** Shows/hides nodes based on zoom level, similar to Google Maps.

**Benefits:**
- Handles 1000+ nodes smoothly
- Progressive disclosure as user zooms in
- Automatic badge display for hidden children
- Dynamic threshold configuration

**How it works:**
- Define zoom thresholds (e.g., 10%, 30%, 50%, 70%, 90%)
- Each threshold reveals one more depth level
- Badges show count of hidden children

**Files:** `App.vue` - `getVisibleNodesForLOD()`, `LodBadgeNode.vue`

### 3. Lazy/Incremental Calculation

**What it does:** Only calculates positions for newly visible nodes, not all nodes.

**Performance impact:**
- **Without:** O(n²) for 1000 nodes = 1,000,000 operations
- **With:** O(visible²) for ~50 visible = 2,500 operations
- **Result:** 400x faster!

**How it works:**
- Nodes have `isDirty` flag and `lastCalculatedZoom` property
- Only dirty nodes trigger recalculation
- Preserves already-calculated positions

**Files:** `App.vue` - `handleZoomChange()`, `resolveOverlapsIncremental()`

### 4. Dynamic Max Zoom

**What it does:** Automatically adjusts maximum zoom level based on tree depth.

**Why it's needed:** Deep trees (10+ levels) need higher zoom to see all nodes.

**Formula:**
```javascript
maxZoom = (lastLODThreshold + 20%) / 100
Minimum: 2.0 (200%)
Maximum: 5.0 (500%)
```

**Example:**
- 5 LOD levels (up to 90%) → max zoom = 200%
- 10 LOD levels (up to 190%) → max zoom = 210%
- 20 LOD levels (up to 390%) → max zoom = 410%

**Files:** `App.vue` - `maxZoom` computed property

### 5. Collapse/Expand Functionality

**What it does:** Hide/show branches of the tree.

**Features:**
- Root nodes: separate left/right collapse
- Child nodes: collapse all descendants
- Collapse state preserved during layout changes
- Visual indicators (chevron icons)

**Files:** `App.vue` - `toggleCollapse()`, `CustomNode.vue`

---

## Data Model

### NodeData Interface

```typescript
interface NodeData {
  id: string                    // Unique identifier
  label: string                 // Node text content
  parentId: string | null       // Parent node ID (null for roots)
  x: number                     // X position on canvas
  y: number                     // Y position on canvas
  width: number                 // Node width (default: 150px)
  height: number                // Node height (default: 50px)

  // Collapse state
  collapsed?: boolean           // For child nodes: hide all descendants
  collapsedLeft?: boolean       // For root nodes: hide left children
  collapsedRight?: boolean      // For root nodes: hide right children

  // Performance optimization
  isDirty?: boolean             // True if position needs recalculation
  lastCalculatedZoom?: number   // Zoom level when last calculated
}
```

### BoundingRect Interface

```typescript
interface BoundingRect extends Rectangle {
  nodeId: string                // Node this bounding box belongs to
  padding: number               // Padding around children
}

interface Rectangle {
  x: number                     // Top-left X
  y: number                     // Top-left Y
  width: number                 // Rectangle width
  height: number                // Rectangle height
}
```

---

## Layout Algorithm

### Overview

The layout algorithm uses **nested bounding rectangles** where each parent's bounding box encompasses all its children.

### Key Functions

#### 1. `calculateBoundingRect(node, allNodes): BoundingRect`

**Purpose:** Calculate the bounding rectangle for a node and all its descendants.

**Algorithm:**
1. Start with node's own rectangle
2. If node is collapsed, return just the node (no children)
3. Recursively calculate bounding boxes for all children
4. Expand parent rectangle to include all children
5. Add padding around children

**Location:** `layout.ts`

#### 2. `resolveAllOverlaps(nodes): void`

**Purpose:** Detect and resolve overlapping bounding boxes.

**Algorithm:**
1. Group nodes by root (process each tree separately)
2. For each root tree:
   - Calculate bounding boxes for all nodes
   - Detect overlaps using AABB collision detection
   - Move overlapping nodes apart
   - Repeat until no overlaps (max 10 iterations)

**Location:** `layout.ts`

#### 3. `resolveOverlapsIncremental(dirtyNodes, visibleNodes, zoom): void`

**Purpose:** Resolve overlaps only for newly visible nodes (performance optimization).

**Algorithm:**
1. Identify which root trees contain dirty nodes
2. Only resolve overlaps for affected root trees
3. Mark dirty nodes as clean and record zoom level

**Location:** `App.vue`

### Spacing Configuration

```javascript
// Default spacing (can be configured via UI)
const horizontalSpacing = ref(0)  // 0-50px
const verticalSpacing = ref(0)    // 0-50px

// Apply spacing
setLayoutSpacing(horizontalSpacing.value, verticalSpacing.value)
```

---

## LOD System

### Concept

The LOD (Level of Detail) system progressively reveals nodes as the user zooms in, similar to Google Maps showing more detail at higher zoom levels.

### Configuration

#### Default Thresholds
```javascript
const lodThresholds = ref<number[]>([10, 30, 50, 70, 90])
```

**Pattern:** Start at 10%, then increment by 20% for each level.

#### Threshold Semantics

| Zoom Range | LOD Level | Max Depth | Nodes Visible |
|------------|-----------|-----------|---------------|
| < 10% | 1 | 0 | Roots only |
| 10-29% | 2 | 1 | Depth 0-1 |
| 30-49% | 3 | 2 | Depth 0-2 |
| 50-69% | 4 | 3 | Depth 0-3 |
| 70-89% | 5 | 4 | Depth 0-4 |
| >= 90% | All | All | All nodes |

### Core Function: `getVisibleNodesForLOD()`

```javascript
function getVisibleNodesForLOD(): NodeData[] {
  if (!lodEnabled.value) return nodes.value

  const zoomPercent = viewport.value.zoom * 100
  let maxDepthToShow = 0

  // Count how many thresholds we've passed
  for (let i = 0; i < lodThresholds.value.length; i++) {
    if (zoomPercent >= lodThresholds.value[i]) {
      maxDepthToShow = i + 1
    } else {
      break
    }
  }

  // If above all thresholds, show all
  if (zoomPercent >= lodThresholds.value[lodThresholds.value.length - 1]) {
    return nodes.value
  }

  // Filter by depth
  return nodes.value.filter(node => {
    const depth = getNodeDepth(node.id)
    return depth <= maxDepthToShow
  })
}
```

### LOD Badges

When nodes are hidden by LOD, a **badge** appears showing the count of hidden children.

**Features:**
- Badge positioned where hidden children would be
- Badge size matches hidden children's bounding box
- Large, readable text even when zoomed out
- Yellow gradient background

**Component:** `LodBadgeNode.vue`

**Badge Creation Logic:**
```javascript
// In syncToVueFlow()
for (const node of visibleNodes) {
  const allChildren = getDirectChildren(node.id)
  const hiddenChildren = allChildren.filter(c => !visibleNodeIds.has(c.id))

  if (hiddenChildren.length > 0) {
    const bounds = calculateHiddenChildrenBounds(hiddenChildren)

    lodBadgeNodes.push({
      id: `lod-badge-${node.id}`,
      type: 'lod-badge',
      position: { x: bounds.x, y: bounds.y },
      data: {
        count: hiddenChildren.length,
        width: bounds.width,
        height: bounds.height
      }
    })
  }
}
```

### Dynamic LOD Level Management

**Auto-add levels when tree gets deeper:**
```javascript
watch(maxTreeDepth, (newDepth, oldDepth) => {
  if (newDepth > (oldDepth || 0)) {
    while (lodThresholds.value.length < newDepth) {
      const nextThreshold = 10 + lodThresholds.value.length * 20
      lodThresholds.value.push(nextThreshold)
    }
  }
})
```

**Manual controls:**
- **Add Level button:** Adds new threshold (+20% from last)
- **Reset button:** Resets to defaults based on current tree depth
- **Number inputs:** Fine-tune each threshold individually

---

## Performance Optimizations

### 1. Only Render Visible Elements

```javascript
<VueFlow :only-render-visible-elements="true">
```

VueFlow only renders nodes visible in the viewport.

### 2. Lazy Position Calculation

**Problem:** Calculating positions for 1000 nodes on every zoom = slow

**Solution:** Only calculate for newly visible nodes

```javascript
function handleZoomChange(newZoom: number) {
  const previouslyVisibleIds = new Set(vueFlowNodes.value.map(n => n.id))
  const newVisibleNodes = getVisibleNodesForLOD()

  // Mark newly visible nodes as dirty
  newVisibleNodes.forEach(node => {
    const wasVisible = previouslyVisibleIds.has(node.id)
    if (!wasVisible || !node.lastCalculatedZoom ||
        Math.abs(node.lastCalculatedZoom - newZoom) > 0.1) {
      node.isDirty = true
    }
  })

  // Only resolve overlaps for dirty nodes
  const dirtyNodes = newVisibleNodes.filter(n => n.isDirty)
  if (dirtyNodes.length > 0) {
    resolveOverlapsIncremental(dirtyNodes, newVisibleNodes, newZoom)
  }
}
```

### 3. LOD Filtering

**Impact:**
- 1000 nodes without LOD: 1,000,000 collision checks (O(n²))
- 50 visible nodes with LOD: 2,500 collision checks
- **400x performance improvement!**

### 4. Incremental Overlap Resolution

Only resolve overlaps for affected root trees, not the entire canvas.

```javascript
function resolveOverlapsIncremental(dirtyNodes, allVisibleNodes, currentZoom) {
  // Group dirty nodes by their root
  const dirtyRootIds = new Set<string>()
  dirtyNodes.forEach(node => {
    const root = getRootNode(node.id)
    if (root) dirtyRootIds.add(root.id)
  })

  // Only resolve overlaps for affected roots
  const affectedNodes = allVisibleNodes.filter(node => {
    const root = getRootNode(node.id)
    return root && dirtyRootIds.has(root.id)
  })

  resolveOverlapsForAffectedRoots(affectedNodes)
}
```

### Performance Metrics

| Scenario | Nodes | Visible | Collision Checks | Performance |
|----------|-------|---------|------------------|-------------|
| No LOD | 1000 | 1000 | 1,000,000 | Freezes |
| LOD at 10% | 1000 | 10 | 100 | Smooth ⚡ |
| LOD at 50% | 1000 | 50 | 2,500 | Smooth ⚡ |
| LOD at 90% | 1000 | 200 | 40,000 | Good |

---

## UI Components

### 1. CustomNode.vue

**Purpose:** Renders individual mindmap nodes.

**Features:**
- Editable label (double-click to edit)
- Collapse/expand buttons (chevrons)
- Child count indicators
- Hover effects
- Context menu support

**Props:**
```typescript
interface Props {
  data: {
    label: string
    parentId: string | null
    childCount?: number
    childCountLeft?: number
    childCountRight?: number
    collapsed?: boolean
    collapsedLeft?: boolean
    collapsedRight?: boolean
    childrenSide?: 'left' | 'right'
    isPotentialParent?: boolean
  }
}
```

**Styling:**
- Background: White with border
- Hover: Blue border
- Potential parent (during drag): Green border
- Padding: 8px
- Border radius: 4px

### 2. LodBadgeNode.vue

**Purpose:** Displays badge for hidden children in LOD mode.

**Features:**
- Shows count of hidden nodes
- Size matches hidden children's bounding box
- Large, readable text (scales with canvas)
- Yellow gradient background
- Non-interactive (pointer-events: none)

**Props:**
```typescript
interface Props {
  data: {
    count: number      // Number of hidden nodes
    width: number      // Badge width
    height: number     // Badge height
  }
}
```

**Styling (customizable):**
```css
.lod-badge-node {
  background: linear-gradient(135deg,
    rgba(255, 212, 59, 0.9) 0%,
    rgba(250, 176, 5, 0.9) 100%);
  border: 3px solid #fab005;
  border-radius: 12px;
}

.badge-icon {
  font-size: 48px;      /* "⋯" ellipsis */
}

.badge-count {
  font-size: 64px;      /* The number - MOST IMPORTANT */
  font-weight: bold;
  color: #862e9c;
}

.badge-hint {
  font-size: 18px;      /* "hidden nodes" text */
  opacity: 0.9;
}
```

**To customize colors:** Edit `LodBadgeNode.vue` styles.

### 3. LOD Controls (in App.vue)

**UI Elements:**
- **Enable LOD checkbox:** Toggle LOD system on/off
- **Info panel:** Shows max depth, current zoom %, current LOD level
- **Threshold inputs:** Number inputs for each LOD level (1px precision)
- **Add Level button:** Adds new threshold (+20% from last)
- **Reset button:** Resets to defaults

**Example UI:**
```
LOD (Level of Detail)
☑ Enable LOD System

Max depth: 5 | Zoom: 45% | LOD: 3

Zoom Thresholds:
LOD 1: Zoom < [10] %
LOD 2: Zoom < [30] %
LOD 3: Zoom < [50] %
LOD 4: Zoom < [70] %
LOD 5: Zoom < [90] %

[+ Add Level] [Reset]
```

### 4. Layout Spacing Controls

**UI Elements:**
- **Horizontal Spacing slider:** 0-50px, 1px steps
- **Vertical Spacing slider:** 0-50px, 1px steps

**Default:** 0px (tight layout)

---

## Integration Guide

### Step 1: Copy Core Files

Copy these files to your MindScribble project:

```
src/
├── types.ts                     # TypeScript interfaces
├── layout.ts                    # Layout algorithm
├── layout-rbush.ts             # Alternative algorithm (optional)
└── components/
    ├── CustomNode.vue          # Node component
    └── LodBadgeNode.vue        # LOD badge component
```

### Step 2: Install Dependencies

```bash
npm install @vue-flow/core @vue-flow/background
```

### Step 3: Extract Layout Logic from App.vue

**Key functions to extract:**

1. **Data Management:**
   - `nodes` ref (NodeData[])
   - `edges` ref
   - `vueFlowNodes` ref

2. **LOD System:**
   - `lodEnabled` ref
   - `lodThresholds` ref
   - `maxZoom` computed
   - `currentLodLevel` computed
   - `getVisibleNodesForLOD()`
   - `calculateHiddenChildrenBounds()`

3. **Layout Functions:**
   - `syncToVueFlow()` - Convert nodes to VueFlow format
   - `syncFromVueFlow()` - Update positions after drag
   - `handleZoomChange()` - Lazy calculation trigger
   - `resolveOverlapsIncremental()` - Performance optimization

4. **Helper Functions:**
   - `getNodeDepth(nodeId)` - Calculate depth in tree
   - `getRootNode(nodeId)` - Find root ancestor
   - `getDirectChildren(nodeId)` - Get immediate children

5. **Collapse/Expand:**
   - `toggleCollapse(nodeId)`
   - `toggleCollapseLeft(nodeId)`
   - `toggleCollapseRight(nodeId)`

6. **LOD Controls:**
   - `addLodLevel()`
   - `resetLodLevels()`

### Step 4: Set Up VueFlow Component

```vue
<template>
  <VueFlow
    :nodes="vueFlowNodes"
    :edges="visibleEdges"
    :default-viewport="{ zoom: 0.3, x: 400, y: 300 }"
    :min-zoom="0.05"
    :max-zoom="maxZoom"
    :only-render-visible-elements="true"
    @node-drag-start="onNodeDragStart"
    @node-drag="onNodeDrag"
    @node-drag-stop="onNodeDragStop"
  >
    <Background />

    <!-- Custom Node Template -->
    <template #node-custom="{ data, id }">
      <CustomNode
        :data="data"
        @toggle-collapse="toggleCollapse(id)"
        @toggle-collapse-left="toggleCollapseLeft(id)"
        @toggle-collapse-right="toggleCollapseRight(id)"
      />
    </template>

    <!-- LOD Badge Node Template -->
    <template #node-lod-badge="{ data }">
      <LodBadgeNode :data="data" />
    </template>
  </VueFlow>
</template>

<script setup lang="ts">
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import CustomNode from './components/CustomNode.vue'
import LodBadgeNode from './components/LodBadgeNode.vue'

const { viewport, fitView, setViewport } = useVueFlow()
</script>
```

### Step 5: Initialize Layout Spacing

```javascript
import { setLayoutSpacing } from './layout'

// Set default spacing (0px for tight layout)
setLayoutSpacing(0, 0)
```

### Step 6: Watch for Zoom Changes (LOD)

```javascript
import { watch } from 'vue'

watch(() => viewport.value.zoom, (newZoom, oldZoom) => {
  if (lodEnabled.value) {
    const zoomChanged = Math.abs(newZoom - (oldZoom || 1)) > 0.01
    if (zoomChanged) {
      handleZoomChange(newZoom)
    }
  }
})
```

### Step 7: Watch for Tree Depth Changes (Auto-add LOD levels)

```javascript
watch(maxTreeDepth, (newDepth, oldDepth) => {
  if (newDepth > (oldDepth || 0)) {
    while (lodThresholds.value.length < newDepth) {
      const nextThreshold = 10 + lodThresholds.value.length * 20
      lodThresholds.value.push(nextThreshold)
    }
  }
})
```

### Step 8: Keyboard Shortcuts (Optional)

**Fine-grained zoom control:**

```javascript
import { onMounted, onUnmounted } from 'vue'

function handleKeyDown(event: KeyboardEvent) {
  // Ctrl+ : Zoom in by 1%
  if (event.ctrlKey && (event.key === '+' || event.key === '=')) {
    event.preventDefault()
    const newZoom = Math.min(viewport.value.zoom + 0.01, maxZoom.value)
    setViewport({
      x: viewport.value.x,
      y: viewport.value.y,
      zoom: newZoom
    })
  }

  // Ctrl- : Zoom out by 1%
  if (event.ctrlKey && event.key === '-') {
    event.preventDefault()
    const newZoom = Math.max(viewport.value.zoom - 0.01, 0.05)
    setViewport({
      x: viewport.value.x,
      y: viewport.value.y,
      zoom: newZoom
    })
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
```

---

## Configuration Options

### LOD Configuration

```javascript
// Enable/disable LOD
const lodEnabled = ref(false)

// Zoom thresholds (percentages)
// Pattern: 10, 30, 50, 70, 90, 110, 130, ...
const lodThresholds = ref<number[]>([10, 30, 50, 70, 90])

// Add new level
function addLodLevel() {
  const lastThreshold = lodThresholds.value[lodThresholds.value.length - 1] || -10
  lodThresholds.value.push(lastThreshold + 20)
}

// Reset to defaults
function resetLodLevels() {
  const newThresholds: number[] = []
  for (let i = 0; i < Math.max(maxTreeDepth.value, 5); i++) {
    newThresholds.push(10 + i * 20)
  }
  lodThresholds.value = newThresholds
}
```

### Layout Spacing Configuration

```javascript
// Spacing between nodes (pixels)
const horizontalSpacing = ref(0)  // 0-50px
const verticalSpacing = ref(0)    // 0-50px

// Apply spacing changes
function onSpacingChange() {
  setLayoutSpacing(horizontalSpacing.value, verticalSpacing.value)
  triggerRef(nodes)
  resolveAllOverlaps(nodes.value)
  syncToVueFlow()
}
```

### Viewport Configuration

```javascript
// Zoom limits
const minZoom = 0.05  // 5%
const maxZoom = computed(() => {
  if (lodThresholds.value.length === 0) return 2.0
  const lastThreshold = lodThresholds.value[lodThresholds.value.length - 1]
  return Math.min(Math.max((lastThreshold + 20) / 100, 2.0), 5.0)
})

// Default viewport
const defaultViewport = { zoom: 0.3, x: 400, y: 300 }
```

### Node Configuration

```javascript
// Default node dimensions
const DEFAULT_NODE_WIDTH = 150
const DEFAULT_NODE_HEIGHT = 50

// Create new node
function createNode(label: string, parentId: string | null, x: number, y: number): NodeData {
  return {
    id: `node-${nodeCounter++}`,
    label,
    parentId,
    x,
    y,
    width: DEFAULT_NODE_WIDTH,
    height: DEFAULT_NODE_HEIGHT,
    collapsed: false,
    collapsedLeft: false,
    collapsedRight: false,
    isDirty: true,
    lastCalculatedZoom: viewport.value.zoom
  }
}
```

---

## Common Patterns

### Pattern 1: Adding a New Node

```javascript
function addNode(label: string, parentId: string | null) {
  // Create node
  const newNode = createNode(label, parentId, x, y)
  nodes.value.push(newNode)

  // Create edge if has parent
  if (parentId) {
    edges.value.push({
      id: `edge-${parentId}-${newNode.id}`,
      source: parentId,
      target: newNode.id
    })
  }

  // Update layout
  resolveAllOverlaps(nodes.value)
  syncToVueFlow()
}
```

### Pattern 2: Deleting a Node

```javascript
function deleteNode(nodeId: string) {
  // Find all descendants
  const descendants = getAllDescendants(nodeId, nodes.value)
  const idsToDelete = new Set([nodeId, ...descendants.map(n => n.id)])

  // Remove nodes
  nodes.value = nodes.value.filter(n => !idsToDelete.has(n.id))

  // Remove edges
  edges.value = edges.value.filter(e =>
    !idsToDelete.has(e.source) && !idsToDelete.has(e.target)
  )

  // Update layout
  resolveAllOverlaps(nodes.value)
  syncToVueFlow()
}
```

### Pattern 3: Moving a Node (Reparenting)

```javascript
function moveNode(nodeId: string, newParentId: string | null) {
  const node = nodes.value.find(n => n.id === nodeId)
  if (!node) return

  // Update parent
  const oldParentId = node.parentId
  node.parentId = newParentId

  // Update edges
  edges.value = edges.value.filter(e => e.target !== nodeId)
  if (newParentId) {
    edges.value.push({
      id: `edge-${newParentId}-${nodeId}`,
      source: newParentId,
      target: nodeId
    })
  }

  // Update layout
  resolveAllOverlaps(nodes.value)
  syncToVueFlow()
}
```

### Pattern 4: Toggling Collapse

```javascript
function toggleCollapse(nodeId: string) {
  const node = nodes.value.find(n => n.id === nodeId)
  if (!node) return

  // Toggle collapse state
  if (node.parentId === null) {
    // Root node: toggle left/right separately
    // (handled by toggleCollapseLeft/Right)
  } else {
    // Child node: toggle all descendants
    node.collapsed = !node.collapsed
  }

  // Update view (no layout recalculation needed)
  syncToVueFlow()
}
```

### Pattern 5: Handling Drag

```javascript
function onNodeDragStart(event: NodeDragEvent) {
  // Store original positions for potential revert
  dragStartPositions.value = new Map(
    event.nodes.map(n => [n.id, { x: n.position.x, y: n.position.y }])
  )
}

function onNodeDrag(event: NodeDragEvent) {
  // Update positions in real-time (optional)
  // Can show potential parent indicators here
}

function onNodeDragStop(event: NodeDragEvent) {
  // Sync positions back to data model
  event.nodes.forEach(vfNode => {
    const node = nodes.value.find(n => n.id === vfNode.id)
    if (node) {
      node.x = vfNode.position.x
      node.y = vfNode.position.y
      node.isDirty = true
    }
  })

  // Resolve overlaps
  resolveAllOverlaps(nodes.value)
  syncToVueFlow()
}
```

---

## Troubleshooting

### Issue 1: Nodes Not Appearing After Enabling LOD

**Symptom:** All nodes except roots are hidden when LOD is enabled.

**Cause:** LOD logic was inverted (checking `>=` instead of `<`).

**Solution:** Ensure `getVisibleNodesForLOD()` uses correct logic:
```javascript
for (let i = 0; i < lodThresholds.value.length; i++) {
  if (zoomPercent >= lodThresholds.value[i]) {
    maxDepthToShow = i + 1  // ✓ Correct
  } else {
    break
  }
}
```

### Issue 2: Performance Degradation with Many Nodes

**Symptom:** Canvas becomes slow/laggy with 500+ nodes.

**Solutions:**
1. **Enable LOD:** Reduces visible nodes dramatically
2. **Lower zoom:** Shows fewer nodes at low zoom levels
3. **Check `only-render-visible-elements`:** Ensure it's `true` in VueFlow
4. **Verify lazy calculation:** Ensure `isDirty` flags are working

### Issue 3: Nodes Overlapping After Drag

**Symptom:** Nodes overlap after dragging.

**Cause:** `resolveAllOverlaps()` not called after drag.

**Solution:** Call in `onNodeDragStop`:
```javascript
function onNodeDragStop(event: NodeDragEvent) {
  syncFromVueFlow()
  resolveAllOverlaps(nodes.value)
  syncToVueFlow()
}
```

### Issue 4: LOD Badges Not Visible

**Symptom:** No badges appear when nodes are hidden.

**Cause:** Badge nodes not created or wrong type.

**Solution:**
1. Ensure `LodBadgeNode` is registered in template
2. Check badge creation logic in `syncToVueFlow()`
3. Verify badge type is `'lod-badge'`

### Issue 5: Max Zoom Too Low for Deep Trees

**Symptom:** Can't zoom in enough to see deepest nodes.

**Cause:** Fixed max zoom (200%).

**Solution:** Use dynamic max zoom:
```javascript
const maxZoom = computed(() => {
  if (lodThresholds.value.length === 0) return 2.0
  const lastThreshold = lodThresholds.value[lodThresholds.value.length - 1]
  return Math.min(Math.max((lastThreshold + 20) / 100, 2.0), 5.0)
})
```

### Issue 6: Collapse State Not Preserved

**Symptom:** Collapsed nodes expand after layout changes.

**Cause:** Collapse state not checked in `syncToVueFlow()`.

**Solution:** Filter collapsed branches:
```javascript
const visibleNodes = lodFilteredNodes.filter(node => {
  // Check if any ancestor is collapsed
  let current = node
  while (current.parentId) {
    const parent = nodes.value.find(n => n.id === current.parentId)
    if (!parent) break

    if (!parent.parentId) {
      // Root node: check collapsedLeft/Right
      const isOnLeft = current.x < parent.x
      if (isOnLeft && parent.collapsedLeft) return false
      if (!isOnLeft && parent.collapsedRight) return false
    } else {
      // Child node: check collapsed
      if (parent.collapsed) return false
    }

    current = parent
  }
  return true
})
```

---

## Best Practices

### 1. Always Call syncToVueFlow() After Data Changes

```javascript
// ✓ Good
nodes.value.push(newNode)
syncToVueFlow()

// ✗ Bad
nodes.value.push(newNode)
// Missing syncToVueFlow() - changes won't appear!
```

### 2. Use Lazy Calculation for Performance

```javascript
// ✓ Good - Only calculate for dirty nodes
handleZoomChange(newZoom)

// ✗ Bad - Recalculate everything
resolveAllOverlaps(nodes.value)
```

### 3. Enable LOD for Large Trees

```javascript
// ✓ Good - Enable LOD for 100+ nodes
if (nodes.value.length > 100) {
  lodEnabled.value = true
}

// ✗ Bad - No LOD with 1000 nodes = slow
```

### 4. Set Appropriate LOD Thresholds

```javascript
// ✓ Good - Start low (10%), increment by 20%
lodThresholds.value = [10, 30, 50, 70, 90]

// ✗ Bad - Start too high (50%), large gaps
lodThresholds.value = [50, 100, 150]
```

### 5. Use Dynamic Max Zoom

```javascript
// ✓ Good - Adjusts based on tree depth
:max-zoom="maxZoom"

// ✗ Bad - Fixed 200% may be too low
:max-zoom="2"
```

### 6. Mark Nodes as Dirty After Position Changes

```javascript
// ✓ Good
node.x = newX
node.y = newY
node.isDirty = true

// ✗ Bad - Position won't recalculate
node.x = newX
node.y = newY
```

### 7. Use Incremental Overlap Resolution

```javascript
// ✓ Good - Only affected roots
resolveOverlapsIncremental(dirtyNodes, visibleNodes, zoom)

// ✗ Bad - All nodes every time
resolveAllOverlaps(nodes.value)
```

---

## API Reference

### Core Functions

#### `calculateBoundingRect(node: NodeData, allNodes: NodeData[]): BoundingRect`
Calculates bounding rectangle for a node and all its descendants.

**Parameters:**
- `node` - The node to calculate bounds for
- `allNodes` - All nodes in the tree

**Returns:** BoundingRect with x, y, width, height, nodeId, padding

---

#### `resolveAllOverlaps(nodes: NodeData[]): void`
Detects and resolves all overlapping bounding boxes.

**Parameters:**
- `nodes` - Array of all nodes

**Side effects:** Modifies node positions (x, y)

---

#### `getVisibleNodesForLOD(): NodeData[]`
Filters nodes based on current zoom level and LOD thresholds.

**Returns:** Array of nodes that should be visible at current zoom

---

#### `syncToVueFlow(): void`
Converts internal node data to VueFlow format and updates display.

**Side effects:** Updates `vueFlowNodes` ref

---

#### `handleZoomChange(newZoom: number): void`
Handles zoom changes with lazy calculation optimization.

**Parameters:**
- `newZoom` - New zoom level (0.05 to maxZoom)

**Side effects:** Marks nodes as dirty, triggers incremental overlap resolution

---

#### `getNodeDepth(nodeId: string): number`
Calculates depth of a node in the tree (root = 0).

**Parameters:**
- `nodeId` - ID of node to check

**Returns:** Depth level (0 for roots, 1 for direct children, etc.)

---

#### `getRootNode(nodeId: string): NodeData | null`
Finds the root ancestor of a node.

**Parameters:**
- `nodeId` - ID of node to check

**Returns:** Root node or null if not found

---

#### `getDirectChildren(nodeId: string): NodeData[]`
Gets immediate children of a node.

**Parameters:**
- `nodeId` - Parent node ID

**Returns:** Array of direct child nodes

---

#### `calculateHiddenChildrenBounds(hiddenChildren: NodeData[]): Rectangle`
Calculates bounding box for a group of hidden children.

**Parameters:**
- `hiddenChildren` - Array of hidden child nodes

**Returns:** Rectangle encompassing all hidden children

---

### Configuration Functions

#### `setLayoutSpacing(horizontal: number, vertical: number): void`
Sets spacing between nodes in layout algorithm.

**Parameters:**
- `horizontal` - Horizontal spacing in pixels (0-50)
- `vertical` - Vertical spacing in pixels (0-50)

---

#### `addLodLevel(): void`
Adds a new LOD threshold (+20% from last).

---

#### `resetLodLevels(): void`
Resets LOD thresholds to defaults based on current tree depth.

---

## Glossary

- **LOD (Level of Detail):** Progressive disclosure technique that shows/hides content based on zoom level
- **Bounding Box/Rectangle:** Rectangle that encompasses a node and all its descendants
- **AABB:** Axis-Aligned Bounding Box - collision detection algorithm
- **Lazy Calculation:** Computing values only when needed, not in advance
- **Incremental Calculation:** Only calculating changes/deltas rather than recalculating everything
- **Dirty Flag:** Boolean indicating that a value needs recalculation
- **Viewport:** The visible area of the canvas
- **Zoom Level:** Scale factor for the canvas (0.5 = 50%, 1.0 = 100%, 2.0 = 200%)
- **Tree Depth:** Distance from root node (root = 0, children = 1, grandchildren = 2, etc.)
- **Collapse:** Hide all descendants of a node
- **Root Node:** Node with no parent (parentId = null)
- **Leaf Node:** Node with no children

---

## Credits

This layout engine was developed through iterative collaboration, combining:
- **Nested rectangle layout algorithm** for hierarchical visualization
- **LOD system** inspired by Google Maps for performance
- **Lazy calculation** for efficient position updates
- **VueFlow** for canvas rendering and viewport management

**Key innovations:**
1. Dynamic LOD thresholds that auto-adjust to tree depth
2. Badge positioning that matches hidden children's bounding box
3. Incremental overlap resolution for affected subtrees only
4. Dynamic max zoom based on LOD configuration

---

## License

This documentation and code are part of the MindScribble project.

---

**End of Documentation**

For questions or issues, refer to the source code in `mindmap-writer/vueflow-design/`.


