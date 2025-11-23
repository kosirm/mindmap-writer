# Node Reordering Design Document

## 💡 Related: Physics Mode & Collision Detection

**See also**: `physics-mode-design.md` for details on physics-based automatic layout.

**Key insight**: Physics mode (springs + anti-gravity + collision) can **complement** or **replace** manual sibling-based positioning:
- **Manual positioning** (this document): Deterministic, works without physics
- **Physics mode**: Automatic, organic layout using Matter.js forces
- **Both together**: Manual positioning as starting point, physics refines it

**Note on collision detection**: We're switching from rectangle to **circle bodies** for smoother, more natural collisions. See physics-mode-design.md for details.

## Overview

Node reordering is a bidirectional synchronization system between Canvas (mindmap) and Writer views:
- **Canvas → Store**: When user drags nodes in canvas, calculate angle from parent and update `order` field in store
- **Store → Canvas**: When user reorders nodes in Writer, calculate new position on canvas based on siblings

## Current Status: Canvas → Store (COMPLETED ✅)

### What We Achieved

When a node is dropped on a new position in the canvas:
1. Calculate the angle from parent to the dropped node
2. Find the node's siblings (nodes with same parent)
3. Determine where the node fits in the sibling order based on angle
4. Update the `order` field in the store to reflect the new position
5. Reorder siblings if necessary to maintain consistent ordering

### Implementation Details

**Angle Calculation** (0° = top, clockwise):
```typescript
function calculateAngle(parentPos: Position, childPos: Position): number {
  const dx = childPos.x - parentPos.x;
  const dy = childPos.y - parentPos.y;
  let angle = Math.atan2(dy, dx) * (180 / Math.PI);
  angle = (angle + 90 + 360) % 360; // Convert to 0° = top
  return angle;
}
```

**Order Update on Drop**:
```typescript
function onNodeDragStop(event: NodeDragEvent) {
  const node = event.node;
  const parent = nodes.value.find(n => n.id === node.data.parentId);
  
  if (parent) {
    const angle = calculateAngle(parent.position, node.position);
    const siblings = nodes.value.filter(n => n.data.parentId === parent.id);
    
    // Sort siblings by angle and assign order values
    siblings.sort((a, b) => {
      const angleA = calculateAngle(parent.position, a.position);
      const angleB = calculateAngle(parent.position, b.position);
      return angleA - angleB;
    });
    
    siblings.forEach((sibling, index) => {
      sibling.data.order = index;
    });
  }
}
```

### Orientation Support

The system respects two orientation modes:
- **Clockwise**: 0° at top, angles increase clockwise
- **Counterclockwise**: 0° at top, angles increase counterclockwise

Orientation affects:
- How angles are calculated
- How siblings are sorted
- Which side of parent children appear (left/right)

**Key Implementation**:
- Orientation is stored in `orientationMode` ref: `'clockwise' | 'counterclockwise'`
- Angle calculations respect current orientation
- Orientation can be changed via toolbar split button
- When orientation changes, all nodes are repositioned on canvas

## Next Step: Store → Canvas (TODO 📋)

### User's Requirements

When a node is reordered in Writer view (drag/drop to change hierarchy position):
1. **Move node on canvas** to new position based on siblings
2. **Children move with parent** maintaining relative positions (offset-based movement)
3. **Position based on siblings**:
   - **Between two siblings**: Place at average angle/distance of the two siblings
   - **Next to one sibling**: Place at sibling's angle ± configurable degrees
   - **Only child**: Inherit parent's angle (or default angle if parent is root)

### Architecture Approach

**User's Preferred Approach**:
> "When moving a node to a new position in hierarchy, find its new sibling nodes and place it between them; if only one sibling exists, place next to it; children should move with parent maintaining relative positions (offset-based movement)."

### Implementation Plan

#### Step 1: Detect Reordering in Writer

Watch for changes in Writer view that affect node hierarchy:
```typescript
// In Writer component or VueFlowTest.vue
watch(() => nodes.value.map(n => ({ id: n.id, parentId: n.data.parentId, order: n.data.order })), 
  (newHierarchy, oldHierarchy) => {
    // Detect which node changed parent or order
    const changedNode = findChangedNode(newHierarchy, oldHierarchy);
    if (changedNode) {
      repositionNodeOnCanvas(changedNode);
    }
  },
  { deep: true }
);
```

#### Step 2: Calculate New Position Based on Siblings

**Case 1: Between Two Siblings**
```typescript
function positionBetweenSiblings(node, prevSibling, nextSibling, parent) {
  // Calculate angles of siblings
  const prevAngle = calculateAngle(parent.position, prevSibling.position);
  const nextAngle = calculateAngle(parent.position, nextSibling.position);
  
  // Average angle (handle wraparound at 0°/360°)
  const avgAngle = averageAngle(prevAngle, nextAngle);
  
  // Average distance
  const prevDist = calculateDistance(parent.position, prevSibling.position);
  const nextDist = calculateDistance(parent.position, nextSibling.position);
  const avgDist = (prevDist + nextDist) / 2;
  
  // Calculate new position
  return calculatePositionFromAngle(parent.position, avgAngle, avgDist);
}
```

**Case 2: Next to One Sibling**
```typescript
function positionNextToSibling(node, sibling, parent, isAfter: boolean) {
  const siblingAngle = calculateAngle(parent.position, sibling.position);
  const siblingDist = calculateDistance(parent.position, sibling.position);
  
  // Offset angle by configurable degrees (e.g., 30°)
  const SIBLING_ANGLE_OFFSET = 30; // Configurable
  const newAngle = isAfter 
    ? (siblingAngle + SIBLING_ANGLE_OFFSET) % 360
    : (siblingAngle - SIBLING_ANGLE_OFFSET + 360) % 360;
  
  // Use same distance as sibling
  return calculatePositionFromAngle(parent.position, newAngle, siblingDist);
}
```

**Case 3: Only Child**
```typescript
function positionOnlyChild(node, parent) {
  // If parent is root, use default angle (e.g., 0° = top)
  // If parent has a parent, inherit parent's angle from grandparent
  
  if (!parent.data.parentId) {
    // Parent is root - use default angle
    const DEFAULT_ANGLE = 0; // Top
    const DEFAULT_DISTANCE = 300; // Configurable
    return calculatePositionFromAngle(parent.position, DEFAULT_ANGLE, DEFAULT_DISTANCE);
  } else {
    // Parent has a parent - inherit angle
    const grandparent = nodes.value.find(n => n.id === parent.data.parentId);
    const parentAngle = calculateAngle(grandparent.position, parent.position);
    const DEFAULT_DISTANCE = 300; // Configurable
    return calculatePositionFromAngle(parent.position, parentAngle, DEFAULT_DISTANCE);
  }
}
```

#### Step 3: Move Children with Parent (Offset-Based)

When a node is repositioned, all its descendants move with it:
```typescript
function moveNodeWithChildren(node, newPosition) {
  // Calculate offset
  const offsetX = newPosition.x - node.position.x;
  const offsetY = newPosition.y - node.position.y;
  
  // Move the node
  node.position = newPosition;
  
  // Recursively move all descendants
  function moveDescendants(parentId, offsetX, offsetY) {
    const children = nodes.value.filter(n => n.data.parentId === parentId);
    children.forEach(child => {
      child.position.x += offsetX;
      child.position.y += offsetY;
      
      // Recursively move this child's children
      moveDescendants(child.id, offsetX, offsetY);
    });
  }
  
  moveDescendants(node.id, offsetX, offsetY);
}
```

#### Step 4: Handle Orientation

Position calculations must respect current orientation mode:
```typescript
function calculatePositionFromAngle(parentPos, angle, distance) {
  // Adjust angle based on orientation
  if (orientationMode.value === 'counterclockwise') {
    angle = 360 - angle; // Mirror angle
  }
  
  // Convert angle to radians (0° = top)
  const radians = (angle - 90) * (Math.PI / 180);
  
  // Calculate position
  const x = parentPos.x + distance * Math.cos(radians);
  const y = parentPos.y + distance * Math.sin(radians);
  
  return { x, y };
}
```

### Configuration Parameters

```typescript
// Configurable parameters for positioning
const SIBLING_ANGLE_OFFSET = ref(30); // Degrees between siblings when only one exists
const DEFAULT_CHILD_DISTANCE = ref(300); // Distance from parent for only child
const MIN_SIBLING_DISTANCE = ref(200); // Minimum distance between siblings
const MAX_SIBLING_DISTANCE = ref(500); // Maximum distance between siblings
```

### Edge Cases to Handle

1. **Root node reordering**: Root nodes don't have a parent, so position based on angle from center (0, 0)
2. **Circular references**: Prevent infinite loops when moving descendants
3. **Overlapping nodes**: After repositioning, run collision detection to resolve overlaps
4. **Angle wraparound**: Handle 0°/360° boundary correctly when averaging angles
5. **Multiple simultaneous moves**: If multiple nodes are reordered at once, process in order
6. **Undo/Redo**: Store previous positions for undo functionality

### Implementation Steps for Next Session

#### Step 1: Create Helper Functions

Create utility functions in VueFlowTest.vue or separate utils file:

```typescript
// Calculate distance between two points
function calculateDistance(pos1: Position, pos2: Position): number {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Average two angles (handle wraparound)
function averageAngle(angle1: number, angle2: number): number {
  // Handle wraparound at 0°/360°
  let diff = angle2 - angle1;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return (angle1 + diff / 2 + 360) % 360;
}

// Convert angle and distance to position
function calculatePositionFromAngle(
  parentPos: Position,
  angle: number,
  distance: number
): Position {
  // Adjust for orientation
  if (orientationMode.value === 'counterclockwise') {
    angle = 360 - angle;
  }

  // Convert to radians (0° = top)
  const radians = (angle - 90) * (Math.PI / 180);

  return {
    x: parentPos.x + distance * Math.cos(radians),
    y: parentPos.y + distance * Math.sin(radians)
  };
}
```

#### Step 2: Implement Main Repositioning Function

```typescript
function repositionNodeOnCanvas(nodeId: string) {
  const node = nodes.value.find(n => n.id === nodeId);
  if (!node) return;

  const parent = nodes.value.find(n => n.id === node.data.parentId);
  if (!parent) {
    // Root node - position based on angle from center
    repositionRootNode(node);
    return;
  }

  // Get siblings sorted by order
  const siblings = nodes.value
    .filter(n => n.data.parentId === parent.id && n.id !== node.id)
    .sort((a, b) => a.data.order - b.data.order);

  let newPosition: Position;

  if (siblings.length === 0) {
    // Only child
    newPosition = positionOnlyChild(node, parent);
  } else {
    // Find position in sibling list
    const nodeOrder = node.data.order;
    const prevSibling = siblings.filter(s => s.data.order < nodeOrder).pop();
    const nextSibling = siblings.find(s => s.data.order > nodeOrder);

    if (prevSibling && nextSibling) {
      // Between two siblings
      newPosition = positionBetweenSiblings(node, prevSibling, nextSibling, parent);
    } else if (prevSibling) {
      // After last sibling
      newPosition = positionNextToSibling(node, prevSibling, parent, true);
    } else if (nextSibling) {
      // Before first sibling
      newPosition = positionNextToSibling(node, nextSibling, parent, false);
    } else {
      // Fallback (shouldn't happen)
      newPosition = positionOnlyChild(node, parent);
    }
  }

  // Move node and all its children
  moveNodeWithChildren(node, newPosition);

  // Optional: Run collision detection to resolve overlaps
  if (matterEnabled.value) {
    runMatterEngineToResolveOverlaps();
  }
}
```

#### Step 3: Add Watcher for Hierarchy Changes

```typescript
// Watch for changes in node hierarchy (parent or order changes)
watch(
  () => nodes.value.map(n => ({
    id: n.id,
    parentId: n.data.parentId,
    order: n.data.order
  })),
  (newHierarchy, oldHierarchy) => {
    // Find nodes that changed parent or order
    newHierarchy.forEach((newNode, index) => {
      const oldNode = oldHierarchy[index];
      if (oldNode && (
        newNode.parentId !== oldNode.parentId ||
        newNode.order !== oldNode.order
      )) {
        // Node hierarchy changed - reposition on canvas
        repositionNodeOnCanvas(newNode.id);
      }
    });
  },
  { deep: true }
);
```

#### Step 4: Add Configuration UI (Optional)

Add settings panel for positioning parameters:
- Sibling angle offset (degrees)
- Default child distance (pixels)
- Min/max sibling distance (pixels)

#### Step 5: Testing Checklist

- [ ] Reorder node in Writer (drag/drop) - node moves on canvas
- [ ] Node positioned between two siblings - at average angle/distance
- [ ] Node positioned next to one sibling - at offset angle
- [ ] Only child positioned - inherits parent's angle or uses default
- [ ] Children move with parent - maintain relative positions
- [ ] Root node reordering - positions based on angle from center
- [ ] Orientation respected - clockwise vs counterclockwise
- [ ] No overlaps after repositioning (collision detection runs)
- [ ] Multiple nodes reordered - all positioned correctly
- [ ] Undo/Redo works (if implemented)

### Integration with Physics Mode

**Important**: Store → Canvas repositioning and Physics Mode are **complementary** features:

1. **Without Physics Mode**:
   - User reorders in Writer → Node repositioned on canvas using sibling-based calculation
   - Manual, deterministic positioning

2. **With Physics Mode**:
   - User reorders in Writer → Node repositioned on canvas using sibling-based calculation
   - Physics mode then applies springs and anti-gravity to fine-tune positions
   - Springs keep parent-child nodes connected
   - Anti-gravity prevents nodes from clustering at center
   - Result: Automatic, physics-based layout refinement

**Workflow**:
```
Writer Reorder → Calculate Position (siblings) → Move Node → Physics Mode (if enabled) → Final Position
```

### Alternative: Use Physics Mode Instead of Manual Calculation

**User's Idea**: Instead of manually calculating positions based on siblings, let Physics Mode do the work:
- When node is reordered in Writer, just update the `order` field in store
- If Physics Mode is enabled, springs and anti-gravity will automatically position nodes correctly
- No need for complex sibling-based position calculations

**Pros**:
- Simpler implementation
- More natural, organic layout
- Automatically handles edge cases

**Cons**:
- Requires Physics Mode to be enabled
- Less predictable positioning
- May need tuning of physics parameters

**Decision**: Implement both approaches:
1. **Manual calculation** (this document) - works without Physics Mode
2. **Physics Mode** (see physics-mode-design.md) - automatic layout when enabled

User can choose which approach to use based on their workflow.

## Related Files

- **Canvas → Store implementation**: `mindmap-writer/vueflow/vueflow-test/src/pages/VueFlowTest.vue`
  - See `onNodeDragStop()` function
  - See `calculateAngle()` function
  - See orientation handling in `setOrientationClockwise()` and `setOrientationCounterclockwise()`

- **Writer view**: `mindmap-writer/vueflow/vueflow-test/src/components/WriterEditor.vue`
  - Drag/drop reordering happens here
  - Updates `node.data.order` and `node.data.parentId`

- **Orientation system**: `mindmap-writer/vueflow/vueflow-test/src/pages/VueFlowTest.vue`
  - `orientationMode` ref
  - `setOrientationClockwise()` and `setOrientationCounterclockwise()` functions

## Key Concepts

### Angle System
- **0° = Top** (12 o'clock position)
- **Clockwise**: 0° → 90° (right) → 180° (bottom) → 270° (left) → 360° (top)
- **Counterclockwise**: 0° → 270° (left) → 180° (bottom) → 90° (right) → 360° (top)

### Canvas Coordinates
- **Center**: (0, 0) in flow coordinates
- **Node position**: Top-left corner of node
- **Parent-child angle**: Calculated from parent center to child center

### Order Field
- **Type**: Number (0, 1, 2, ...)
- **Scope**: Per parent (siblings have unique orders)
- **Usage**: Determines visual order in Writer and angle order on canvas

## Success Criteria

Store → Canvas repositioning is considered working when:
1. ✅ Node reordered in Writer → moves on canvas
2. ✅ Position calculated based on siblings (between, next to, or only child)
3. ✅ Children move with parent maintaining relative positions
4. ✅ Orientation respected (clockwise/counterclockwise)
5. ✅ No overlaps after repositioning (collision detection)
6. ✅ Root nodes positioned correctly
7. ✅ Edge cases handled (wraparound, circular refs, etc.)
8. ✅ Works with and without Physics Mode
9. ✅ Smooth animation (optional)
10. ✅ Configurable parameters (angle offset, distance, etc.)


