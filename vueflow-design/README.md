# VueFlow Nested Layout Test

## Overview

This is a test project to validate the **nested rectangle layout algorithm** for the MindScribble mindmap application.

## Core Concept

The layout system uses a **bounding box hierarchy** where:
- Each root node has an invisible bounding rectangle
- Children are contained within their parent's rectangle
- Child rectangles can expand parent rectangles
- Sibling rectangles (same level) cannot overlap
- No physics simulation - just geometric collision detection

## Algorithm: AABB (Axis-Aligned Bounding Box)

### What is AABB?

AABB is a simple and fast collision detection method for rectangles:
- **Axis-Aligned**: Rectangles are not rotated (sides parallel to X/Y axes)
- **Bounding Box**: Each node has a rectangular boundary
- **Fast**: O(1) overlap detection between two rectangles
- **Predictable**: No physics simulation, just geometry

### How It Works

1. **Overlap Detection**
   ```typescript
   function rectanglesOverlap(a, b) {
     return !(
       a.x + a.width < b.x ||   // a is left of b
       b.x + b.width < a.x ||   // b is left of a
       a.y + a.height < b.y ||  // a is above b
       b.y + b.height < a.y     // b is above a
     )
   }
   ```

2. **Overlap Resolution**
   - Calculate overlap amount in X and Y directions
   - Push rectangles apart in the direction of smallest overlap
   - Split the push amount equally between both rectangles

3. **Hierarchy Resolution**
   - Resolve overlaps bottom-up (children first, then parents)
   - Siblings at the same level cannot overlap
   - Parent rectangles expand to contain all children

## Project Structure

```
vueflow-design/
├── src/
│   ├── App.vue              # Main application
│   ├── main.ts              # Entry point
│   ├── types.ts             # TypeScript interfaces
│   ├── collision.ts         # AABB collision detection
│   ├── layout.ts            # Nested layout algorithm
│   └── components/
│       └── CustomNode.vue   # Node component
├── index.html
├── package.json
├── vite.config.ts
└── README.md
```

## Features

### Implemented
- ✅ AABB collision detection
- ✅ Nested rectangle layout algorithm
- ✅ Drag nodes to move them
- ✅ **Parent-child movement**: Dragging a parent moves all children with it
- ✅ **Bounding boxes follow viewport**: Boxes move when panning/zooming canvas
- ✅ Right-click context menu (Add Child, Add Sibling)
- ✅ Visual bounding boxes (toggle on/off)
- ✅ Automatic overlap resolution on drag end
- ✅ Test data generator (50 nodes)
- ✅ Hierarchy visualization with edges

### To Test
- [ ] Performance with 100+ nodes
- [ ] Performance with 500+ nodes
- [ ] Compare AABB vs RBush
- [ ] Deep hierarchies (5+ levels)
- [ ] Many siblings (10+ at same level)

## Getting Started

### Installation

```bash
cd mindmap-writer/vueflow-design
npm install
```

### Run Development Server

```bash
npm run dev
```

The app will open at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

## Usage

### Basic Operations

1. **Add Root Node**: Click "Add Root Node" button
2. **Add Child**: Right-click on a node → "Add Child"
3. **Add Sibling**: Right-click on a node → "Add Sibling"
4. **Move Node**: Drag any node
5. **Toggle Bounding Boxes**: Click "Show/Hide Bounding Boxes"
6. **Generate Test Data**: Click "Generate Test Data (50 nodes)"

### Visual Indicators

- **Red dashed boxes**: Root node bounding rectangles
- **Blue dashed boxes**: Child node bounding rectangles
- **Blue solid borders**: Node boundaries
- **Red borders**: Selected nodes

## Algorithm Details

### Bounding Rectangle Calculation

```typescript
function calculateBoundingRect(node, allNodes) {
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

### Overlap Resolution

```typescript
function resolveSiblingOverlaps(siblings, allNodes) {
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

## Performance Considerations

### Current Implementation (AABB)
- **Time Complexity**: O(n²) for n siblings at same level
- **Space Complexity**: O(n) for storing bounding rectangles
- **Expected Performance**: Good for < 100 nodes per level

### Future Optimization (RBush)
- **Time Complexity**: O(n log n) with spatial indexing
- **Space Complexity**: O(n) for R-tree structure
- **Expected Performance**: Good for 1000+ nodes

## Next Steps

1. **Test with large datasets** (100, 500, 1000 nodes)
2. **Implement RBush version** for comparison
3. **Measure performance** (FPS, resolution time)
4. **Test edge cases**:
   - Very deep hierarchies (10+ levels)
   - Many siblings (50+ at same level)
   - Rapid dragging
   - Overlapping root nodes
5. **Optimize if needed**:
   - Debounce overlap resolution
   - Only resolve affected subtrees
   - Use spatial indexing (RBush)

## Lessons Learned

(To be filled after testing)

## Comparison: AABB vs Physics Engines

| Feature | AABB | Matter.js | Planck.js | D3-Force |
|---------|------|-----------|-----------|----------|
| Complexity | Simple | Complex | Complex | Medium |
| Predictability | High | Low | Low | Medium |
| Performance | Fast | Slow | Medium | Medium |
| Control | Full | Limited | Limited | Medium |
| Size | ~1KB | ~100KB | ~50KB | ~20KB |
| Use Case | Our needs | Games | Games | Graphs |

**Verdict**: AABB is perfect for our use case - simple, fast, predictable, and gives us full control.

