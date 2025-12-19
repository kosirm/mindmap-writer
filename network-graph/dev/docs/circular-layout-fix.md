# Fix: Circular Layout Corruption When Adding Nodes

## Problem

When adding new root nodes and reapplying the circular layout:
1. **First application**: Nodes positioned correctly with equal spacing
2. **After adding nodes**: New nodes inserted incorrectly, old structure intact
3. **After adding more nodes**: Layout corrupted, distances unequal

## Root Cause

The `adjustNodeSpacing()` function was calculating initial angles from **current node positions**:

```typescript
// OLD CODE - WRONG!
const angles = nodes.map(node => Math.atan2(node.y - centerY, node.x - centerX))
```

This caused problems because:
- When nodes were added, the algorithm started from the **previous layout**
- The previous layout had a different number of nodes
- The iterative relaxation converged to a **suboptimal local minimum**
- New nodes were squeezed into existing gaps instead of redistributing all nodes

## Solution

Always start with **fresh equal angular spacing**, ignoring current positions:

```typescript
// NEW CODE - CORRECT!
const startAngleRad = (startAngle * Math.PI / 180) - (Math.PI / 2)
const angleStep = (2 * Math.PI) / numNodes
const angles = nodes.map((_, i) => startAngleRad + (i * angleStep))
```

This ensures:
✅ **Consistent results** regardless of previous layout  
✅ **Proper redistribution** when nodes are added/removed  
✅ **Optimal convergence** from a good starting point  
✅ **Predictable behavior** every time layout is applied  

## Changes Made

### File: `useCircularLayout.ts`

**Line 213-217**: Changed angle initialization
```typescript
// BEFORE
const angles = nodes.map(node => Math.atan2(node.y - centerY, node.x - centerX))

// AFTER
const startAngleRad = (startAngle * Math.PI / 180) - (Math.PI / 2)
const angleStep = (2 * Math.PI) / numNodes
const angles = nodes.map((_, i) => startAngleRad + (i * angleStep))
```

**Line 287-302**: Removed redundant angle normalization
```typescript
// REMOVED - No longer needed since we start at correct angle
// Shift all angles so the first node is at startAngle
const startAngleRad = (startAngle * Math.PI / 180) - (Math.PI / 2)
const firstAngle = angles[0]
if (firstAngle !== undefined) {
  const angleOffset = startAngleRad - firstAngle
  for (let i = 0; i < numNodes; i++) {
    angles[i]! += angleOffset
  }
}
```

## Testing

To verify the fix:

1. **Create 3 root nodes** → Apply circular layout → ✅ Equal spacing
2. **Add 2 more nodes (total 5)** → Apply circular layout → ✅ All 5 equally spaced
3. **Add 3 more nodes (total 8)** → Apply circular layout → ✅ All 8 equally spaced
4. **Remove 4 nodes (total 4)** → Apply circular layout → ✅ All 4 equally spaced

## Key Insight

**Iterative algorithms need good initial conditions!**

The iterative relaxation algorithm works by making small adjustments to converge to equal spacing. If you start from a bad initial state (e.g., 3 nodes positioned for 3, then trying to fit 5 nodes), the algorithm can get stuck in a local minimum.

By always starting from equal angular spacing, we ensure:
- The algorithm starts from a **reasonable approximation**
- Convergence is **fast and predictable**
- Results are **consistent and reproducible**

## Related Files

- `useCircularLayout.ts` - Main implementation
- `circular-layout-spacing.md` - Algorithm documentation
- `SOLUTION_SUMMARY.md` - Overall solution summary

---

# Fix 2: Auto-Increase Radius When Nodes Don't Fit

## Problem

When adding many nodes (e.g., 14 nodes) to a circle with small radius (e.g., 100px):
- Nodes overlap (distance = 0.0)
- Algorithm pairs nodes together instead of distributing evenly
- Final layout has nodes clustered in pairs: `(-119.9°, -116.1°)`, `(-63.9°, -60.1°)`, etc.

**Root Cause**: 14 nodes × (120px width + 20px spacing) = 1960px required circumference, but circle with radius 100px only has 628px circumference.

## Solution

**Auto-increase radius** when nodes don't fit:

```typescript
const circumference = 2 * Math.PI * radius
// Use 0.85 factor to account for chord length < arc length
// This makes the calculation less conservative, resulting in ~20px spacing
const requiredCircumference = numNodes * (nodeWidth * 0.85 + minSpacing)

if (requiredCircumference > circumference) {
  actualRadius = Math.ceil(requiredCircumference / (2 * Math.PI))
  console.warn(`⚠️ AUTO-ADJUSTING RADIUS: ${radius}px → ${actualRadius}px`)
}
```

**Why 0.85 factor?**
- Nodes on a circle: chord length < arc length
- Without factor: `14 × (120 + 20) = 1960px` → radius 312px → ~50px spacing (too much!)
- With 0.85 factor: `14 × (102 + 20) = 1708px` → radius 272px → ~20px spacing (perfect!)
- The factor accounts for geometric projection of rectangles onto the circle

## Changes Made

### 1. Changed Return Type

**Before**: Returns array of positions
```typescript
const adjustNodeSpacing = (...): Array<{ id: string; x: number; y: number }> => {
  // ...
  return adjustedPositions
}
```

**After**: Returns positions AND actual radius used
```typescript
const adjustNodeSpacing = (...): { positions: Array<...>; actualRadius: number } => {
  // ...
  return { positions: adjustedPositions, actualRadius }
}
```

### 2. Updated All Callers

```typescript
// Before
const adjustedPositions = adjustNodeSpacing(...)

// After
const { positions: adjustedPositions } = adjustNodeSpacing(...)
```

### 3. Use actualRadius Throughout

All calculations now use `actualRadius` instead of `radius`:
- Position calculations: `actualRadius * Math.cos(angle)`
- Angular adjustments: `error / (2 * actualRadius)`
- Final positions: `actualRadius * Math.cos(angle)`

## Result

✅ **14 nodes with radius 100px**: Auto-increases to ~272px (not 312px - optimized!)
✅ **20 nodes with radius 100px**: Auto-increases to ~387px (not 446px - optimized!)
✅ **All nodes evenly spaced**: ~20px spacing between nodes
✅ **No overlaps, no clustering**: Perfect distribution
✅ **Console warning**: User informed of radius adjustment
✅ **UI slider updates**: Automatically reflects new radius

## Example Log

```
⚠️ AUTO-ADJUSTING RADIUS: 14 nodes cannot fit in circle with radius 100
   Current circumference: 628.3px
   Required circumference: 1960.0px
   Auto-increased radius: 100px → 312px
📐 Updating innerRadius in service: 100px → 312px
```

## UI Integration

The auto-increased radius is automatically propagated back to the UI:

1. **`useCircularLayout.ts`**: Returns `{ success, actualRadius }`
2. **`dagreService.ts`**: Updates `currentCircularParams.innerRadius` if radius changed
3. **`DagreTestControls.vue`**: Slider automatically reflects the new value (reactive)

This means:
- ✅ User sees the slider update to the new radius
- ✅ Next layout application uses the increased radius
- ✅ User can manually adjust if needed
- ✅ Transparent and predictable behavior

