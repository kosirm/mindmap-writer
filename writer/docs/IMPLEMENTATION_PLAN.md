# Implementation Plan: Orientation → Automatic → Manual Layout

## Phase 1: Fix Orientation (FOUNDATION) 🎯

**Goal**: Make orientation completely independent of data structure, working correctly at ALL levels.

### Understanding Orientation

```
Left-right:   🢃 ➡️ 🢃   (left children top→bottom, right children top→bottom)
Right-left:   🢃 ⬅️ 🢃   (left children top→bottom, right children top→bottom)
Clockwise:    🢁 ⬅️ 🢃   (left children bottom→top, right children top→bottom)
Anticlockwise: 🢃 ➡️ 🢁   (left children top→bottom, right children bottom→top)
```

### Key Principle
**Data order is ALWAYS canonical** (1, 2, 3, 4, 5...). Orientation only affects:
1. **Visual display order** (how we render)
2. **Add operation** (where new node appears visually, but data order stays canonical)
3. **Reorder operation** (translate visual position to data position)

### Tasks

#### 1.1: Fix Visual Display at All Levels ✅ (Partially done)
- [x] Depth 1 works correctly
- [ ] Fix depth > 1 visual ordering
- [ ] Test all 4 orientations with deep trees

**Current issue**: `getVisualChildren()` in `draw/index.ts` doesn't work correctly for depth > 1.

**Root cause analysis needed**: 
- Is the logic wrong?
- Is `currentOrientation` not accessible?
- Is the reversal applied at wrong time?

#### 1.2: Fix Add Operation
When user adds a node, it should appear at the correct visual position based on orientation.

**Current behavior**: Always adds to end of data array (correct!)

**What we need**: Visual position should respect orientation, but data position stays at end.

Example in anticlockwise, right side:
```
Visual:  8 (newest)    Data: [1, 2, 3, 4, 5, 6, 7, 8]
         7
         6
         5
```

#### 1.3: Fix Reorder Operation
When user drags to reorder, translate visual position to data position.

**Current behavior**: Uses array indices directly (WRONG for clockwise/anticlockwise)

**What we need**: Use `visualToDataIndex()` to translate positions.

Example: In anticlockwise right side, dragging node from visual position 2 to position 0:
```
Visual before: 8, 7, 6, 5    Data before: [5, 6, 7, 8]
Visual after:  6, 8, 7, 5    Data after:  [5, 7, 8, 6]  (moved 6 from index 1 to index 3)
```

#### 1.4: Test All Orientations
Create test cases for each orientation:
- Visual display order
- Add new node
- Reorder nodes
- Multi-level trees

---

## Phase 2: Automatic Layout Mode

**Goal**: Automatic left/right distribution with proper persistence.

### Tasks

#### 2.1: Add Layout Mode to Data Structure
```typescript
interface MindmapData {
  layoutMode: 'automatic' | 'manual';
  balanceStrategy?: 'count' | 'weight' | 'height';
}
```

#### 2.2: Store `left` Property in Automatic Mode
**Current issue**: `left` property is calculated but not persisted.

**Solution**: When `applyOrientation()` sets `left` property, mark it in rawData:
```typescript
child.left = true
child.rawData.left = true  // ADD THIS
```

#### 2.3: Add UI Toggle in Settings
```vue
<q-toggle
  v-model="layoutMode"
  label="Manual Layout"
  @update:model-value="onLayoutModeChange"
/>

<q-select
  v-if="layoutMode === 'automatic'"
  v-model="balanceStrategy"
  :options="['count', 'weight', 'height']"
  label="Balance Strategy"
/>
```

#### 2.4: Respect Stored `left` Property on Load
When loading data in automatic mode:
- If node has `left` property → use it
- If node doesn't have `left` property → calculate it

---

## Phase 3: Manual Layout Mode

**Goal**: Allow free-form positioning while maintaining tree structure.

### Tasks

#### 3.1: Add Position Storage
```typescript
interface NodeData {
  // ... existing fields
  position?: {
    x: number;
    y: number;
  };
}
```

#### 3.2: Modify Drag Behavior
In `onDragEnd()`:
```typescript
if (layoutMode === 'manual') {
  // Check if over another node
  if (hoveredNode) {
    moveChild(hoveredNode.id, d.id)  // Reparent
    return
  }
  
  // Check if horizontally aligned with sibling
  const alignedSibling = findHorizontallyAlignedSibling(d, d.y + d.py)
  if (alignedSibling) {
    moveSibling(d.id, alignedSibling.id)  // Reorder
    return
  }
  
  // Free-form positioning
  d.rawData.position = {
    x: d.x + d.px,
    y: d.y + d.py
  }
  d.px = 0
  d.py = 0
  afterOperation()
} else {
  // Existing automatic mode behavior
}
```

#### 3.3: Apply Manual Positions in Layout
```typescript
private renew(): void {
  // ... existing layout calculation
  
  if (layoutMode === 'manual') {
    traverse(this.data, [this.applyManualPositions.bind(this)])
  }
}

private applyManualPositions(node: Mdata): void {
  if (node.rawData.position) {
    node.x = node.rawData.position.x
    node.y = node.rawData.position.y
  }
}
```

#### 3.4: Add Collision Detection (Optional)
Simple overlap prevention for manual mode.

---

## Implementation Order

### Week 1: Orientation Foundation
1. ✅ Add balance strategies (DONE)
2. 🔧 Debug and fix `getVisualChildren()` for all depths
3. 🔧 Test visual display in all 4 orientations
4. 🔧 Fix add operation to respect orientation
5. 🔧 Fix reorder operation to use visual↔data translation

### Week 2: Automatic Mode
1. Add `layoutMode` to store
2. Persist `left` property in rawData
3. Add UI toggle in settings
4. Test automatic mode with all orientations

### Week 3: Manual Mode
1. Add `position` to data structure
2. Modify drag behavior for manual mode
3. Apply manual positions in layout
4. Test switching between automatic and manual

---

## Current Status

- ✅ Balance strategies implemented
- ✅ `getVisualChildren()` function created
- ⚠️ Visual ordering broken for depth > 1
- ❌ Add operation doesn't respect orientation
- ❌ Reorder operation doesn't translate visual↔data positions
- ❌ `left` property not persisted
- ❌ Manual mode not implemented

---

## Next Immediate Steps

1. **Debug `getVisualChildren()`** - Find why depth > 1 doesn't work
2. **Test with console logs** - Trace through the rendering pipeline
3. **Fix the visual ordering** - Make it work for all depths
4. **Create test mindmap** - Deep tree with 3-4 levels to test all orientations

