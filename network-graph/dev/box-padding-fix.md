# Box Padding Bug Fix

## Problem
When creating nested boxes (box inside box), the inter-box padding was inconsistent:
- **Top/Bottom padding**: Correct (20px as expected)
- **Left/Right padding**: ~3-4x larger than expected (~60-80px instead of 20px)

## Root Cause
The bug was in the `calculateParentBoxes()` function. The issue was mixing two different types of positions:

1. **Node center positions**: The x,y coordinates of nodes represent their CENTER point
2. **Box edge positions**: The corners of nested boxes represent EDGE points

The old code was treating both types the same way:
```javascript
// OLD CODE - WRONG!
const allPositions = [parentPos, ...childPositions]  // These are CENTER points

// Add nested box corners
allPositions.push(...adjustedCorners)  // These are EDGE points

// Then apply node dimensions to ALL positions
const adjustedMinX = minX - halfNodeWidth  // ❌ Wrong for box edges!
const adjustedMaxX = maxX + halfNodeWidth  // ❌ Wrong for box edges!
```

This caused the bounding box to be inflated by the node dimensions (120×40) even for the nested box corners, which already represented edges.

### Example Calculation (from logs):
**Child 2 box calculation:**
- Parent node at (150, -100) - CENTER point
- Nested box corners at (240, -320) to (510, -180) - EDGE points
- Bounding box: minX=150, maxX=510 → width=360
- After adding node width (±60): width=480 ❌ **WRONG!**
  - The 510 was already an edge, adding +60 made it 570
  - This added 120px total width unnecessarily

## Solution
Separate node center positions from box edge positions, and only apply node dimensions to node centers:

```javascript
// NEW CODE - CORRECT!
const nodeCenterPositions = [parentPos, ...childPositions]
const boxEdgePositions = []

// Add nested box corners as EDGE positions
boxEdgePositions.push(...adjustedCorners)

// Convert node centers to edges by adding node dimensions
const nodeEdgePositions = nodeCenterPositions.flatMap(pos => [
  { x: pos.x - halfNodeWidth, y: pos.y - halfNodeHeight },
  { x: pos.x + halfNodeWidth, y: pos.y + halfNodeHeight },
  // ... all 4 corners
])

// Combine all edge positions
const allEdgePositions = [...nodeEdgePositions, ...boxEdgePositions]

// Calculate bounding box from edges (no further adjustment needed)
const minX = Math.min(...allEdgePositions.map(p => p.x))
const maxX = Math.max(...allEdgePositions.map(p => p.x))
```

## Result
Now both horizontal and vertical inter-box padding are consistent at 20px, matching the node-to-box padding.

## Files Changed
- `network-graph/quasar-project/src/pages/TestConceptMap.vue`
  - Function: `calculateParentBoxes()`
  - Lines: ~480-570

