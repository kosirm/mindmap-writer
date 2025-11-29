# Nested Rectangle Layout Algorithm

## Overview

The nested rectangle layout algorithm provides automatic collision avoidance for hierarchical mindmap nodes without using physics engines. It's based on **bounding box hierarchy** and **AABB collision detection**.

## Core Concept

### Bounding Box Hierarchy

```
┌─────────────────────────────────────┐
│ Root Node 1 Bounding Rectangle      │
│  ┌──────────┐                       │
│  │ Root 1   │                       │
│  └──────────┘                       │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Child 1 Bounding Rectangle  │   │
│  │  ┌──────────┐               │   │
│  │  │ Child 1  │               │   │
│  │  └──────────┘               │   │
│  │                             │   │
│  │  ┌──────────┐  ┌──────────┐│   │
│  │  │Grandchild│  │Grandchild││   │
│  │  │    1     │  │    2     ││   │
│  │  └──────────┘  └──────────┘│   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Child 2 Bounding Rectangle  │   │
│  │  ┌──────────┐               │   │
│  │  │ Child 2  │               │   │
│  │  └──────────┘               │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### Key Properties

1. **Each node has a bounding rectangle** that includes:
   - The node itself
   - All its descendants
   - Padding around children

2. **Hierarchy rules**:
   - Root node rectangles cannot overlap
   - Sibling rectangles (same parent) cannot overlap
   - Child rectangles are contained within parent rectangle
   - Child rectangles can expand parent rectangle

3. **No physics simulation**:
   - Just geometric collision detection
   - Predictable behavior
   - Full control over resolution

## AABB Collision Detection

### What is AABB?

**AABB** = Axis-Aligned Bounding Box

- Rectangles with sides parallel to X/Y axes
- Fast overlap detection: O(1) per pair
- Simple resolution algorithm
- No rotation support (not needed for mindmaps)

### Overlap Detection

```typescript
function rectanglesOverlap(a: Rectangle, b: Rectangle): boolean {
  return !(
    a.x + a.width < b.x ||   // a is left of b
    b.x + b.width < a.x ||   // b is left of a
    a.y + a.height < b.y ||  // a is above b
    b.y + b.height < a.y     // b is above a
  )
}
```

**Time Complexity**: O(1)
**Space Complexity**: O(1)

### Overlap Resolution

```typescript
function resolveOverlap(a: Rectangle, b: Rectangle): void {
  const overlap = getOverlap(a, b)
  
  // Push in direction of smallest overlap
  if (overlap.x < overlap.y) {
    // Push horizontally
    const pushAmount = overlap.x / 2
    if (a.x < b.x) {
      a.x -= pushAmount
      b.x += pushAmount
    } else {
      a.x += pushAmount
      b.x -= pushAmount
    }
  } else {
    // Push vertically
    const pushAmount = overlap.y / 2
    if (a.y < b.y) {
      a.y -= pushAmount
      b.y += pushAmount
    } else {
      a.y += pushAmount
      b.y -= pushAmount
    }
  }
}
```

**Strategy**: Push rectangles apart in the direction of smallest overlap (minimum displacement).

## Algorithm Steps

### 1. Calculate Bounding Rectangles

```typescript
function calculateBoundingRect(node: NodeData, allNodes: NodeData[]): BoundingRect {
  // Start with node's own rectangle
  let rect = { x: node.x, y: node.y, width: node.width, height: node.height }
  
  // Get all children
  const children = allNodes.filter(n => n.parentId === node.id)
  
  if (children.length === 0) {
    return rect // Leaf node
  }
  
  // Recursively calculate child bounds
  const childBounds = children.map(child => calculateBoundingRect(child, allNodes))
  
  // Expand to include all children
  for (const childBound of childBounds) {
    rect = expandToInclude(rect, childBound)
  }
  
  // Add padding
  rect = addPadding(rect, PADDING)
  
  return rect
}
```

**Time Complexity**: O(n) where n is number of descendants
**Space Complexity**: O(d) where d is depth (recursion stack)

### 2. Resolve Sibling Overlaps

```typescript
function resolveSiblingOverlaps(siblings: NodeData[], allNodes: NodeData[]): void {
  // Calculate bounding rectangles for all siblings
  const bounds = siblings.map(s => ({
    node: s,
    rect: calculateBoundingRect(s, allNodes)
  }))
  
  // Check all pairs for overlaps
  for (let i = 0; i < bounds.length; i++) {
    for (let j = i + 1; j < bounds.length; j++) {
      if (rectanglesOverlap(bounds[i].rect, bounds[j].rect)) {
        // Resolve overlap
        resolveOverlap(bounds[i].rect, bounds[j].rect)
        
        // Move nodes and their descendants
        moveNodeAndDescendants(bounds[i].node, deltaX, deltaY, allNodes)
        moveNodeAndDescendants(bounds[j].node, deltaX, deltaY, allNodes)
      }
    }
  }
}
```

**Time Complexity**: O(s²) where s is number of siblings
**Space Complexity**: O(s)

### 3. Resolve All Overlaps (Bottom-Up)

```typescript
function resolveAllOverlaps(allNodes: NodeData[]): void {
  // Get root nodes
  const rootNodes = allNodes.filter(n => n.parentId === null)
  
  // Resolve each root tree
  for (const root of rootNodes) {
    resolveOverlapsRecursive(root, allNodes)
  }
  
  // Resolve root node overlaps
  resolveSiblingOverlaps(rootNodes, allNodes)
}

function resolveOverlapsRecursive(node: NodeData, allNodes: NodeData[]): void {
  const children = getChildren(node.id, allNodes)
  
  // Resolve children first (depth-first)
  for (const child of children) {
    resolveOverlapsRecursive(child, allNodes)
  }
  
  // Then resolve siblings at this level
  if (children.length > 0) {
    resolveSiblingOverlaps(children, allNodes)
  }
}
```

**Time Complexity**: O(n × s²) where n is total nodes, s is max siblings per level
**Space Complexity**: O(d) where d is max depth

## Performance Analysis

### AABB (Current Implementation)

| Metric | Value |
|--------|-------|
| Overlap Detection | O(1) per pair |
| Sibling Resolution | O(s²) per level |
| Full Resolution | O(n × s²) |
| Memory | O(n) |
| Expected Performance | Good for < 100 nodes per level |

### RBush (Future Optimization)

| Metric | Value |
|--------|-------|
| Overlap Detection | O(log n) with spatial index |
| Sibling Resolution | O(s log s) per level |
| Full Resolution | O(n log n) |
| Memory | O(n) |
| Expected Performance | Good for 1000+ nodes |

## When to Use Each

### Use AABB When:
- ✅ < 100 nodes per hierarchy level
- ✅ Simple implementation needed
- ✅ Full control over resolution
- ✅ Predictable behavior required

### Use RBush When:
- ✅ 100+ nodes per hierarchy level
- ✅ Performance is critical
- ✅ Willing to add dependency (~5KB)
- ✅ Need spatial queries

## Integration with VueFlow

### On Node Drag End

```typescript
function onNodeDragStop(event: { node: Node }) {
  // Update our data model
  const node = nodes.value.find(n => n.id === event.node.id)
  if (node) {
    node.x = event.node.position.x
    node.y = event.node.position.y
  }
  
  // Resolve overlaps
  resolveAllOverlaps(nodes.value)
  
  // VueFlow will automatically re-render with new positions
}
```

### Visual Debugging

```vue
<!-- Show bounding boxes as SVG overlay -->
<svg style="position: absolute; pointer-events: none;">
  <rect
    v-for="bound in boundingBoxes"
    :key="bound.nodeId"
    :x="bound.x"
    :y="bound.y"
    :width="bound.width"
    :height="bound.height"
    fill="none"
    stroke="red"
    stroke-dasharray="5,5"
  />
</svg>
```

## Future Enhancements

1. **Directional Bias**: Prefer horizontal or vertical separation
2. **Minimum Spacing**: Enforce minimum gap between siblings
3. **Alignment**: Align siblings horizontally or vertically
4. **Animation**: Smooth transitions when resolving overlaps
5. **RBush Integration**: For large datasets
6. **Incremental Resolution**: Only resolve affected subtrees

## Testing Checklist

- [ ] Single root with children
- [ ] Multiple root nodes
- [ ] Deep hierarchy (5+ levels)
- [ ] Many siblings (10+ at same level)
- [ ] Drag child node
- [ ] Drag parent node
- [ ] Drag root node
- [ ] Add child to leaf node
- [ ] Add sibling to node
- [ ] Performance with 100 nodes
- [ ] Performance with 500 nodes
- [ ] Performance with 1000 nodes

