# Layout System Investigation

## Topic 1: Manual Left/Right Control ✅

### Current State
- **Automatic split**: Uses `Math.ceil(children.length / 2)` to split nodes 50/50
- **Balance strategies added**: 'count', 'weight', 'height', 'manual'
- **Manual mode**: Respects existing `left` property on nodes

### How Manual Control Works
When `balanceStrategy = 'manual'`:
```typescript
const leftCount = children.filter(c => c.left === true).length
return children.length - leftCount // Right side comes first in array
```

### User Control Points
1. **Initial load**: User can set `left: true/false` on depth-1 nodes in saved data
2. **Drag across center**: Line 246 in `listener.ts` detects when node crosses center
   ```typescript
   const lr = d.depth === 1 && (xToCenter * (xToCenter + d.px) < 0)
   ```
3. **Manual toggle**: Could add UI button to toggle node's `left` property

### Recommendation
✅ **Manual control already exists!** The `left` property on depth-1 nodes is:
- Stored in data (persisted)
- User can drag nodes across center to change sides
- We just need to use `balanceStrategy: 'manual'` by default

---

## Topic 2: Arbitrary Positioning (Free-form Layout)

### Current Layout System

#### A. Automatic Layout (Current)
- **Algorithm**: Flextree (modified Reingold-Tilford)
- **Positioning**: Calculated based on tree structure
- **Collision avoidance**: Built into algorithm
- **User control**: Limited to reordering and parent changes

#### B. Desired: Hybrid Layout
- **Initial**: Automatic layout
- **Override**: User can manually position specific nodes
- **Constraint**: Maintain minimum distances (no overlap)

### Architecture Options

#### Option 1: Position Override System (Recommended)
```typescript
interface NodePosition {
  x?: number;        // Manual X position (undefined = auto)
  y?: number;        // Manual Y position (undefined = auto)
  pinned?: boolean;  // Is position locked?
}

interface ExtendedNode extends Data {
  position?: NodePosition;
  // ... other fields
}
```

**Flow**:
1. Calculate automatic layout for all nodes
2. For nodes with `position` set, override calculated position
3. Apply force-directed adjustment to prevent overlaps
4. Store manual positions in data

**Pros**:
- Gradual migration (start with auto, override as needed)
- Fallback to auto if manual position causes issues
- Can mix auto and manual nodes

**Cons**:
- More complex rendering logic
- Need collision detection for manual positions

#### Option 2: Pure Manual Mode
Switch entire mindmap to free-form mode where ALL positions are manual.

**Pros**:
- Simpler logic (no mixing)
- Full control

**Cons**:
- Lose automatic layout benefits
- User must position everything
- Not suitable for large mindmaps

#### Option 3: Constrained Manual (Best of Both)
Allow manual positioning but constrain to valid tree positions.

**Pros**:
- Maintains tree structure
- Prevents overlaps automatically
- Intuitive for users

**Cons**:
- Limited freedom
- Complex constraint system

### Implementation Plan for Option 1

#### Phase 1: Data Structure
```typescript
// Add to extended data structure
interface MindmapNode {
  // ... existing fields
  position?: {
    x?: number;
    y?: number;
    pinned?: boolean;
  };
}
```

#### Phase 2: Layout Calculation
```typescript
class ImData {
  private applyManualPositions(node: Mdata): void {
    if (node.rawData.position?.x !== undefined) {
      node.x = node.rawData.position.x
    }
    if (node.rawData.position?.y !== undefined) {
      node.y = node.rawData.position.y
    }
    // Recursively apply to children
  }
  
  private renew(): void {
    // ... existing layout calculation
    this.applyManualPositions(this.data)
    this.preventOverlaps() // New function
  }
}
```

#### Phase 3: Drag Behavior
```typescript
export function onDragEnd(e, d: Mdata): void {
  // Check if Ctrl/Cmd key is pressed for free-form drag
  if (e.sourceEvent.ctrlKey || e.sourceEvent.metaKey) {
    // Free-form positioning
    d.rawData.position = {
      x: d.x + d.px,
      y: d.y + d.py,
      pinned: true
    }
    afterOperation()
  } else {
    // Existing behavior (reorder/reparent)
    // ... existing code
  }
}
```

#### Phase 4: Collision Detection
```typescript
function preventOverlaps(nodes: Mdata[]): void {
  // Simple force-directed adjustment
  const minDistance = 50 // Minimum distance between nodes
  
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i]
      const b = nodes[j]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance < minDistance) {
        // Push nodes apart
        const angle = Math.atan2(dy, dx)
        const push = (minDistance - distance) / 2
        
        if (!a.rawData.position?.pinned) {
          a.x -= Math.cos(angle) * push
          a.y -= Math.sin(angle) * push
        }
        if (!b.rawData.position?.pinned) {
          b.x += Math.cos(angle) * push
          b.y += Math.sin(angle) * push
        }
      }
    }
  }
}
```

### Key Questions to Answer

1. **Scope**: Should manual positioning apply to:
   - ✅ All nodes (any level)
   - ⚠️ Only depth-1 nodes
   - ⚠️ Only leaf nodes

2. **Persistence**: How to store positions:
   - ✅ In node data (survives reload)
   - ⚠️ Separate layout file
   - ⚠️ Not persisted (recalculate on load)

3. **UI Interaction**:
   - ✅ Ctrl+Drag for free positioning
   - ✅ Right-click menu: "Pin position" / "Reset to auto"
   - ✅ Visual indicator for pinned nodes

4. **Constraints**:
   - ✅ Maintain parent-child relationships
   - ✅ Prevent overlaps
   - ⚠️ Keep nodes within viewport
   - ⚠️ Snap to grid

---

## Summary of Current Capabilities

### ✅ Already Working
1. **Manual left/right control**:
   - Drag depth-1 nodes across center to change sides
   - `changeLeft(id)` function toggles left/right
   - `left` property is stored and persisted

2. **Reordering**:
   - Drag nodes vertically to reorder siblings
   - `moveSibling(id, refId, after)` function

3. **Reparenting**:
   - Drag node onto another node to change parent
   - `moveChild(parentId, childId)` function

4. **Temporary visual offset**:
   - During drag, nodes have `px, py` offset
   - After drag ends, either commits change or resets to 0

### 🔧 Current Drag Behavior (onDragEnd)
```typescript
// Priority order:
1. If hovering over another node → reparent (moveChild)
2. If depth-1 and crossed center → change side (changeLeft)
3. If dragged up/down → reorder siblings (moveSibling)
4. Else → reset position (px=0, py=0)
```

### 💡 Key Insight
The system uses **temporary offsets** (`px`, `py`) during drag, but these are NOT persisted. After drag ends, the node either:
- Commits a structural change (reorder/reparent/side change)
- Resets to calculated position

This is why arbitrary positioning doesn't work - there's no way to persist the offset!

---

## Proposed Solution: Hybrid Layout System

### Architecture

```typescript
interface NodeLayout {
  mode: 'auto' | 'manual';  // Layout mode for this node
  x?: number;               // Manual X position (relative to parent)
  y?: number;               // Manual Y position (relative to parent)
  pinned?: boolean;         // Lock position (prevent auto-layout)
}

interface ExtendedNode {
  // ... existing fields
  layout?: NodeLayout;
}
```

### Implementation Strategy

#### Phase 1: Add Layout Mode Toggle (Quick Win)
Add UI to toggle between auto and manual layout modes:
- **Auto mode** (default): Current behavior
- **Manual mode**: Persist `px, py` as absolute positions

```typescript
// In onDragEnd, check if manual mode is enabled
if (manualLayoutMode) {
  // Persist the offset as absolute position
  d.rawData.layout = {
    mode: 'manual',
    x: d.x + d.px,
    y: d.y + d.py,
    pinned: true
  }
  afterOperation()
} else {
  // Existing behavior (reorder/reparent/reset)
}
```

#### Phase 2: Collision Detection
Add simple overlap prevention:
```typescript
function checkCollisions(node: Mdata, newX: number, newY: number): boolean {
  // Check if new position overlaps with siblings
  // Return true if collision detected
}
```

#### Phase 3: Mixed Mode
Allow some nodes to be auto-layout, others manual:
```typescript
private renew(): void {
  // Calculate auto layout
  this.data = this.l(this.data)

  // Apply manual overrides
  traverse(this.data, [this.applyManualLayout.bind(this)])
}

private applyManualLayout(node: Mdata): void {
  if (node.rawData.layout?.mode === 'manual') {
    node.x = node.rawData.layout.x ?? node.x
    node.y = node.rawData.layout.y ?? node.y
  }
}
```

### UI Controls

1. **Toggle button**: Switch between auto/manual mode globally
2. **Per-node context menu**:
   - "Pin position" - Lock current position
   - "Reset to auto" - Remove manual override
3. **Visual indicators**:
   - Pinned nodes show a pin icon
   - Manual-mode nodes have different outline color

---

## Recommended Next Steps

### Priority 1: Fix Current Orientation Issues ⚠️
Before adding new features, we need to fix the visual ordering for clockwise/anticlockwise at all depths.

**Current status**: Depth-1 works, but deeper levels still show wrong order.

### Priority 2: Manual Left/Right Balance
Add UI to control balance strategy:
```typescript
// In settings panel
<q-select
  v-model="balanceStrategy"
  :options="['manual', 'count', 'weight', 'height']"
  label="Balance Strategy"
/>
```

### Priority 3: Manual Positioning (Phase 1)
Add simple toggle for manual layout mode:
- Ctrl+Drag to enable free positioning
- Store position in `layout.x`, `layout.y`
- Add "Pin/Unpin" to context menu

### Priority 4: Collision Detection
Add overlap prevention for manual positions.

---

## Questions for You

1. **Immediate priority**: Should we first fix the orientation visual order issue, or start on manual positioning?

2. **Balance strategy**: Do you want UI to switch between auto-balance strategies, or just keep it manual?

3. **Manual positioning scope**:
   - Start with global toggle (all nodes manual or all auto)?
   - Or per-node control from the start?

4. **Keyboard shortcut**: What key for free-form drag? (Ctrl, Alt, Shift, or combination?)

5. **Data persistence**: Should manual positions be:
   - Stored in the same JSON as node data?
   - Separate layout file?
   - Not persisted (recalculate on load)?

