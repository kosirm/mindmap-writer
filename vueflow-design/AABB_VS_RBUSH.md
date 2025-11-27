# AABB vs RBush Comparison

## Overview

This document compares two approaches for collision detection in the nested rectangle layout algorithm:
1. **AABB** (Axis-Aligned Bounding Box) - Simple pairwise collision detection
2. **RBush** - Spatial indexing with R-tree data structure

## When to Use Each

### Use AABB When:
- ✅ < 100 nodes per hierarchy level
- ✅ Simple implementation preferred
- ✅ No external dependencies desired
- ✅ Full control over algorithm needed
- ✅ Predictable behavior required

### Use RBush When:
- ✅ 100+ nodes per hierarchy level
- ✅ Performance is critical
- ✅ Willing to add 5KB dependency
- ✅ Need spatial queries (find nodes in area)

## Algorithm Comparison

### AABB (Current Implementation)

**How it works:**
```typescript
// Check all pairs of siblings
for (let i = 0; i < siblings.length; i++) {
  for (let j = i + 1; j < siblings.length; j++) {
    if (rectanglesOverlap(siblings[i], siblings[j])) {
      resolveOverlap(siblings[i], siblings[j])
    }
  }
}
```

**Complexity:**
- Overlap detection: O(1) per pair
- Sibling resolution: O(s²) where s = number of siblings
- Full resolution: O(n × s²) where n = total nodes

**Pros:**
- ✅ Simple to understand and debug
- ✅ No dependencies
- ✅ Predictable behavior
- ✅ Full control over resolution

**Cons:**
- ❌ Slow with many siblings (100+)
- ❌ Checks all pairs even if far apart

### RBush (Spatial Indexing)

**How it works:**
```typescript
// Build spatial index
const tree = new RBush()
siblings.forEach(s => tree.insert(getBoundingRect(s)))

// Find overlaps efficiently
siblings.forEach(s => {
  const rect = getBoundingRect(s)
  const overlaps = tree.search(rect)
  overlaps.forEach(other => {
    if (other.id !== s.id) {
      resolveOverlap(s, other)
    }
  })
})
```

**Complexity:**
- Build index: O(n log n)
- Overlap detection: O(log n) per query
- Sibling resolution: O(s log s)
- Full resolution: O(n log n)

**Pros:**
- ✅ Fast with many nodes (1000+)
- ✅ Only checks nearby rectangles
- ✅ Supports spatial queries

**Cons:**
- ❌ More complex implementation
- ❌ 5KB dependency
- ❌ Overhead for small datasets

## Performance Comparison

### Expected Performance

| Nodes | AABB Time | RBush Time | Winner |
|-------|-----------|------------|--------|
| 10 | 0.1ms | 0.2ms | AABB |
| 50 | 2ms | 1ms | RBush |
| 100 | 10ms | 2ms | RBush |
| 500 | 250ms | 15ms | RBush |
| 1000 | 1000ms | 30ms | RBush |

*Note: These are estimates. Actual performance will be measured during testing.*

### Crossover Point

**Estimated**: ~30-50 siblings per level

- Below this: AABB is faster (less overhead)
- Above this: RBush is faster (better complexity)

## Implementation Guide

### Current AABB Implementation

Already implemented in `src/collision.ts` and `src/layout.ts`.

### Adding RBush

1. **Install Package**
   ```bash
   npm install rbush
   npm install --save-dev @types/rbush
   ```

2. **Create `collision-rbush.ts`**
   ```typescript
   import RBush from 'rbush'
   import type { NodeData, BoundingRect } from './types'
   
   interface RBushItem {
     minX: number
     minY: number
     maxX: number
     maxY: number
     nodeId: string
   }
   
   export function resolveSiblingOverlapsRBush(
     siblings: NodeData[],
     allNodes: NodeData[]
   ): void {
     // Build spatial index
     const tree = new RBush<RBushItem>()
     const items = siblings.map(s => {
       const rect = calculateBoundingRect(s, allNodes)
       return {
         minX: rect.x,
         minY: rect.y,
         maxX: rect.x + rect.width,
         maxY: rect.y + rect.height,
         nodeId: s.id
       }
     })
     tree.load(items)
     
     // Find and resolve overlaps
     for (const sibling of siblings) {
       const rect = calculateBoundingRect(sibling, allNodes)
       const searchBox = {
         minX: rect.x,
         minY: rect.y,
         maxX: rect.x + rect.width,
         maxY: rect.y + rect.height
       }
       
       const overlaps = tree.search(searchBox)
       for (const overlap of overlaps) {
         if (overlap.nodeId !== sibling.id) {
           const other = siblings.find(s => s.id === overlap.nodeId)
           if (other) {
             resolveOverlap(sibling, other)
           }
         }
       }
     }
   }
   ```

3. **Add Toggle in App.vue**
   ```typescript
   const useRBush = ref(false)
   
   function resolveOverlapsManually() {
     if (useRBush.value) {
       resolveAllOverlapsRBush(nodes.value)
     } else {
       resolveAllOverlaps(nodes.value)
     }
   }
   ```

## Testing Plan

### 1. Measure AABB Performance

```typescript
function measureAABB(nodeCount: number) {
  const start = performance.now()
  resolveAllOverlaps(nodes.value)
  const end = performance.now()
  console.log(`AABB (${nodeCount} nodes): ${end - start}ms`)
}
```

### 2. Measure RBush Performance

```typescript
function measureRBush(nodeCount: number) {
  const start = performance.now()
  resolveAllOverlapsRBush(nodes.value)
  const end = performance.now()
  console.log(`RBush (${nodeCount} nodes): ${end - start}ms`)
}
```

### 3. Compare Results

Test with: 10, 50, 100, 200, 500, 1000 nodes

Record:
- Resolution time
- Frame rate during drag
- Memory usage
- User experience (smoothness)

## Decision Matrix

| Factor | Weight | AABB Score | RBush Score |
|--------|--------|------------|-------------|
| Simplicity | 20% | 10 | 6 |
| Performance (< 100 nodes) | 30% | 9 | 8 |
| Performance (> 100 nodes) | 30% | 4 | 10 |
| No dependencies | 10% | 10 | 0 |
| Maintainability | 10% | 9 | 7 |
| **Total** | | **7.5** | **7.4** |

**Conclusion**: AABB wins slightly for our expected use case (< 100 nodes per level).

## Recommendation

### Phase 1: Start with AABB
- Implement and test AABB first
- Measure performance with realistic datasets
- Document any performance issues

### Phase 2: Add RBush if Needed
- Only if AABB is too slow (> 16ms resolution time)
- Only if users have > 100 nodes per level
- Make it optional (feature flag)

### Phase 3: Optimize Based on Data
- Profile real-world usage
- Optimize the bottleneck (might not be collision detection)
- Consider hybrid approach (AABB for small, RBush for large)

## Hybrid Approach (Future)

```typescript
function resolveAllOverlaps(allNodes: NodeData[]): void {
  const rootNodes = allNodes.filter(n => n.parentId === null)
  
  for (const root of rootNodes) {
    resolveOverlapsRecursive(root, allNodes)
  }
  
  // Use RBush only for root level if many roots
  if (rootNodes.length > 50) {
    resolveSiblingOverlapsRBush(rootNodes, allNodes)
  } else {
    resolveSiblingOverlaps(rootNodes, allNodes)
  }
}
```

## Conclusion

**Start with AABB**. It's simpler, has no dependencies, and should be fast enough for most use cases. Only add RBush if performance testing shows it's necessary.

