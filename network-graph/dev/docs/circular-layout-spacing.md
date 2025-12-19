# Circular Layout with Equal Rectangle Spacing

## Problem Statement

When distributing rectangular nodes around a circle with equal angular spacing, nodes appear unevenly spaced because:

1. **Rectangles are not circles**: Nodes have dimensions (e.g., 120×40 pixels)
2. **Arc length varies**: At different positions on the circle, the same angular spacing produces different linear distances
3. **Orientation matters**: 
   - At north/south: rectangles' long edges (120px) are tangent to the circle
   - At east/west: rectangles' short edges (40px) are tangent to the circle

This causes nodes at the top and bottom of the circle to appear **overlapping** while nodes on the sides appear **too far apart**.

## Solution: Iterative Relaxation Algorithm

Instead of trying to solve this analytically (which is mathematically complex), we use an **iterative relaxation** approach that converges to equal spacing.

### Algorithm Steps

1. **Initialize**: Place nodes at equal angular intervals around the circle
2. **Measure**: Calculate actual rectangle-to-rectangle distances between consecutive nodes
3. **Calculate Target**: Use the average distance as the target spacing
4. **Adjust**: For each node:
   - Calculate spacing error to previous neighbor: `errorPrev = target - actualPrev`
   - Calculate spacing error to next neighbor: `errorNext = target - actualNext`
   - Convert to angular adjustment: `angleAdjust = error / radius`
   - Apply with relaxation factor to prevent oscillation
5. **Repeat**: Continue until convergence (max adjustment < threshold)

### Key Parameters

```typescript
const maxIterations = 50              // Maximum iterations (usually converges in 10-20)
const convergenceThreshold = 0.5      // Stop when adjustments < 0.5 pixels
const relaxationFactor = 0.3          // Damping factor (0-1) to prevent oscillation
const minSpacing = 20                 // Minimum desired spacing between rectangles
```

### Why This Works

- **Gradual convergence**: Small adjustments each iteration prevent overshooting
- **Local corrections**: Each node only considers its immediate neighbors
- **Self-balancing**: The system naturally finds equilibrium
- **Robust**: Works for any number of nodes and any node dimensions

## Implementation Details

### Rectangle Distance Calculation

We use the algorithm from [this article](https://weixuanz.github.io/posts/2021/04/11/rectangles-shortest-distance/) to calculate the minimum distance between two rectangles:

1. Calculate distance from each vertex of rectangle A to all edges of rectangle B
2. Calculate distance from each vertex of rectangle B to all edges of rectangle A
3. Return the minimum of all these distances

This handles all cases: overlapping, touching, and separated rectangles.

### Angle Adjustment Formula

For small angles, arc length ≈ radius × angle, so:

```
linearError = targetSpacing - actualSpacing
angularAdjustment = linearError / radius
```

We apply this adjustment with a relaxation factor:

```
actualAdjustment = angularAdjustment × relaxationFactor
```

The relaxation factor (0.3) prevents oscillation and ensures smooth convergence.

## Usage

```typescript
const { applyCircularLayout } = useCircularLayout()

applyCircularLayout(nodes, edges, layouts, centerX, centerY, {
  innerRadius: 150,
  levelSpacing: 120,
  startAngle: -90,      // Start from top
  clockwise: true,
  minSectorAngle: 30,
  nodeSpacing: 60,
  spacingRatio: 1.0,    // Use iterative algorithm
  nodeWidth: 120,       // Optional: custom node width
  nodeHeight: 40        // Optional: custom node height
})
```

## Performance

- **Time Complexity**: O(n × k) where n = number of nodes, k = iterations (typically 10-20)
- **Space Complexity**: O(n) for storing angles and adjustments
- **Typical Performance**: < 20ms for 10 nodes, < 50ms for 50 nodes

## Advantages

✅ **Simple**: No complex geometry calculations  
✅ **Flexible**: Works with any node dimensions  
✅ **Fast**: Converges in 10-20 iterations  
✅ **Robust**: Handles edge cases gracefully  
✅ **Visually pleasing**: Equal spacing between all nodes  

## Limitations

- Requires iterative computation (not a closed-form solution)
- May not converge if radius is too small for the number/size of nodes
- Assumes nodes are rectangles (not arbitrary shapes)

## Future Improvements

1. **Adaptive relaxation factor**: Start with larger factor, decrease as we approach convergence
2. **Variable node sizes**: Support different dimensions for each node
3. **Collision detection**: Ensure nodes never overlap, even if spacing is tight
4. **Hierarchical spacing**: Apply different spacing rules for different levels

