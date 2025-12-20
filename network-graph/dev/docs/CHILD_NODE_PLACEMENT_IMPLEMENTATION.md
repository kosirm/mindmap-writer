# Child Node Placement Implementation - Circular Layout

## Date: 2025-12-19
## Task: Implement sophisticated child node placement algorithm for circular layout

## Overview

Implemented a comprehensive child node placement algorithm that:
1. Places child nodes on progressively larger circles
2. Aligns children with their parent's angle
3. Uses flexible sector allocation based on child count
4. Includes collision detection and radius adjustment
5. Provides fallback node scaling when space is tight

## Key Features Implemented

### 1. Flexible Sector Allocation
**Function**: `calculateFlexibleSectors()`

- Parents with more children get more angular space
- Minimum sector size ensures nodes with few children still get reasonable space
- Sectors are normalized to fit exactly in 360°
- Proportional allocation based on direct child count (not subtree size)

**Algorithm**:
```typescript
// Count children at level 1
childCounts = trees.map(tree => tree.children.length)
totalChildren = sum(childCounts)

// Allocate proportionally with minimum
minSectorSize = fullCircle / (trees.length * 4)  // At least 1/4 of equal share
sectorSize = max(proportionalSize, minSectorSize)

// Normalize to fit in 360°
scale = fullCircle / totalAllocated
```

### 2. Three-Step Child Placement Algorithm
**Function**: `placeChildrenOnCircle()`

**Step 1: Safe Distance Placement**
- Calculate safe angular spacing (node width * 1.2 safety margin)
- Check if children fit in sector
- If not, increase radius by 20% of levelSpacing
- Repeat up to 10 attempts

**Step 2: Real Distance Calculation**
- Use existing `adjustNodeSpacing()` function
- Calculates actual rectangle-to-rectangle distances
- Applies iterative relaxation to equalize spacing

**Step 3: Center on Parent Angle**
- Calculate average angle of all children
- Shift entire group so center aligns with parent's angle
- Maintains radial organization

### 3. Collision Detection
**Function**: `checkCollisionWithExisting()`

- Checks each child position against all existing nodes
- Uses rectangle collision with minimum spacing
- If collision detected, increases radius by 15% of levelSpacing
- Retries up to 5 times

### 4. Fallback Node Scaling
**Last Resort Strategy**:

When radius increases don't help:
1. Scale down node dimensions by `nodeSizeScaleFactor` (default 0.9)
2. Recalculate with smaller effective node size
3. Reduces both width and height proportionally
4. Logs warning to console

## New Parameters

Added to `CircularLayoutParams`:

```typescript
minNodeSpacing?: number           // Minimum spacing between node borders (default: 10px)
nodeSizeScaleFactor?: number      // Scale factor when nodes don't fit (default: 0.9)
```

Updated existing parameter:
```typescript
levelSpacing: number  // Changed from "Distance" to "Minimum distance" between levels
```

## Algorithm Flow

```
1. Position root nodes on inner circle
   └─> Use existing adjustNodeSpacing() for equal spacing

2. For each root node:
   ├─> Calculate flexible sector based on child count
   ├─> Place children using placeChildrenOnCircle():
   │   ├─> Step 1: Safe distance placement
   │   │   └─> Increase radius if doesn't fit
   │   ├─> Step 2: Adjust spacing (real distances)
   │   ├─> Step 3: Center on parent angle
   │   └─> Check collisions, increase radius if needed
   └─> Recursively position grandchildren

3. If still doesn't fit after max attempts:
   └─> Scale down node size and retry
```

## Helper Functions Added

1. **`calculateFlexibleSectors()`** - Allocate angular space based on child count
2. **`rectanglesCollide()`** - Check if two rectangles collide with min spacing
3. **`getAngle()`** - Calculate angle of point relative to center
4. **`normalizeAngle()`** - Normalize angle to [0, 2π)
5. **`angleInSector()`** - Check if angle is within sector (handles wraparound)
6. **`checkCollisionWithExisting()`** - Check node position against all existing nodes
7. **`placeChildrenOnCircle()`** - Main 3-step placement algorithm

## Files Modified

### `network-graph/quasar-project/src/composables/layouts/useCircularLayout.ts`

**Changes**:
- Added 2 new parameters to `CircularLayoutParams`
- Added 7 new helper functions (110 lines)
- Completely rewrote `positionTreeInSector()` function (50 lines)
- Updated `applyCircularLayout()` to use flexible sectors (40 lines)
- Total additions: ~200 lines of code

## Testing Recommendations

### Test Case 1: Uneven Child Distribution
```
Root 1: 10 children
Root 2: 2 children  
Root 3: 1 child
```
**Expected**: Root 1 gets larger sector, children fit without overlap

### Test Case 2: Deep Tree
```
Root
├─ Child 1
│  ├─ Grandchild 1
│  └─ Grandchild 2
└─ Child 2
   └─ Grandchild 3
```
**Expected**: Each level on progressively larger circle, aligned with parents

### Test Case 3: Many Children in Small Sector
```
Root with 20 children in 30° sector
```
**Expected**: Radius auto-increases, or nodes scale down if needed

## Performance Considerations

- **Time Complexity**: O(n × k) where n = nodes, k = iterations (typically 10-20)
- **Space Complexity**: O(n) for position storage
- **Collision Checks**: O(n²) in worst case, but typically O(n) per level

## Next Steps

1. Test with real mindmap data
2. Fine-tune parameters (safety margins, scale factors)
3. Add visual feedback for scaled nodes
4. Consider caching collision checks for performance
5. Add option to disable collision detection for performance

## Known Limitations

1. Very deep trees (>5 levels) may require large canvas
2. Nodes with 50+ children may need aggressive scaling
3. Collision detection can be slow with 1000+ nodes
4. No support for variable node sizes (all nodes same size)

## Future Enhancements

1. **Adaptive level spacing**: Increase spacing for levels with many nodes
2. **Variable node sizes**: Support different dimensions per node
3. **Sector borrowing**: Allow children to borrow space from neighbors
4. **Visual indicators**: Show when nodes are scaled down
5. **Performance optimization**: Spatial indexing for collision detection

