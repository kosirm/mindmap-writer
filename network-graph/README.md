# v-network-graph POC for MindScribble

## Overview

This POC evaluates **v-network-graph** as a replacement for VueFlow in MindScribble due to performance issues with 200+ nodes.

### Problem with VueFlow
- VueFlow keeps all nodes in memory and redraws them all during drag operations
- Performance degrades significantly around 200 nodes
- Node dragging becomes very laggy with 500+ nodes

### Why v-network-graph?
- Much smaller library, easier to maintain and extend
- Handles 500+ nodes smoothly without lag
- Successfully tested with 1000 nodes - drag operations remain responsive
- SVG-based rendering with better performance characteristics

## Project Structure

```
network-graph/
├── dev/
│   └── docs/           # v-network-graph reference documentation
│       ├── Props.md
│       ├── Configurations.md
│       ├── Methods.md
│       └── Events.md
└── quasar-project/     # POC test application
    └── src/
        └── pages/      # Test pages for each POC test
```

## Running the POC

```bash
cd network-graph/quasar-project
npm install
npm run dev
```

The app will open in your browser with a navigation page listing all tests.

## POC Tests

### ✅ Test 1: Basic Rendering (50 nodes)
- **File:** `Test1Basic.vue`
- **Purpose:** Verify basic v-network-graph functionality
- **Features:** Tree structure with 50 nodes, basic styling

### ✅ Test 2: Custom SVG Nodes
- **File:** `Test2CustomNodes.vue`
- **Purpose:** Custom node rendering styled like MindScribble
- **Features:** Override-node slot, custom SVG rendering, mindmap-like layout

### ✅ Test 3: Drag with Custom Layout
- **File:** `Test3DragLayout.vue`
- **Purpose:** Test node dragging with reactive position updates
- **Features:** Draggable nodes, reset layout, random layout

### ✅ Test 4: Performance Test (500 nodes)
- **File:** `Test4Performance.vue`
- **Purpose:** Measure FPS during drag operations with 500 nodes
- **Features:** Real-time FPS measurement, radial tree layout

### ✅ Test 5: Custom Minimap
- **File:** `Test5Minimap.vue`
- **Purpose:** Implement minimap using absolute positioning
- **Features:** SVG minimap overlay, viewport indicator, toggle visibility

### ✅ Test 6: Zoom/Fit Controls
- **File:** `Test6ZoomControls.vue`
- **Purpose:** Test zoom controls and fit-to-content functionality
- **Features:** Zoom in/out, fit to content, pan to center, floating controls

### ✅ Test 7: Context Menu
- **File:** `Test7ContextMenu.vue`
- **Purpose:** Right-click context menu for nodes and canvas
- **Features:** Quasar menu integration, node operations, canvas operations

### ✅ Test 8: Collapse/Expand Simulation
- **File:** `Test8Collapse.vue`
- **Purpose:** Simulate collapse/expand by hiding/showing nodes
- **Features:** Click to toggle, collapse indicator badge, expand/collapse all

### ✅ Test 9: Stress Test (1000 nodes)
- **File:** `Test9Stress.vue`
- **Purpose:** Maximum stress test with 1000 nodes
- **Features:** FPS measurement, progress indicator, drag performance testing

## Key Findings

### Performance
- ✅ **500 nodes:** Smooth drag operations, no noticeable lag
- ✅ **1000 nodes:** Still responsive during drag operations
- ✅ **FPS:** Maintains good frame rates even with large graphs

### Features Implemented
- ✅ Custom SVG node rendering
- ✅ Draggable nodes with reactive layouts
- ✅ Custom minimap
- ✅ Zoom/pan controls
- ✅ Context menus (Quasar integration)
- ✅ Collapse/expand simulation
- ✅ Performance monitoring

### Missing Features (vs VueFlow)
- ❌ No built-in minimap (but easy to implement custom)
- ❌ No nested nodes (but can simulate with grouping)
- ❌ No built-in context menu (but Quasar integration works well)

## Integration with MindScribble

### Data Structure Mapping
```typescript
// MindScribble NodeData → v-network-graph
{
  nodes: {
    [nodeId]: {
      name: node.title,
      // ... custom data
    }
  },
  edges: {
    [edgeId]: {
      source: parentId,
      target: childId
    }
  },
  layouts: {
    nodes: {
      [nodeId]: { x: node.x, y: node.y }
    }
  }
}
```

### Custom Node Rendering
Use `override-node` slot to render MindScribble-style nodes with:
- Rounded rectangles
- Rich text content
- Collapse/expand buttons
- Custom styling

### Event Handling
- `node:click` → Select node
- `node:dblclick` → Edit node
- `node:contextmenu` → Context menu
- `node:dragend` → Update positions
- `view:zoom`, `view:pan` → Update viewport

## Recommendations

### ✅ Proceed with v-network-graph
- Significantly better performance than VueFlow
- Smaller library, easier to maintain
- All required features can be implemented
- Good integration with Quasar

### Migration Strategy
1. Create adapter layer to convert MindScribble data to v-network-graph format
2. Implement custom node rendering with Tiptap integration
3. Add collapse/expand functionality
4. Implement custom minimap
5. Migrate event handlers
6. Test with real MindScribble documents

## Next Steps

1. Test with real MindScribble data structure
2. Implement Tiptap editor integration in custom nodes
3. Add keyboard shortcuts
4. Implement LOD (Level of Detail) if needed
5. Performance testing with complex documents

