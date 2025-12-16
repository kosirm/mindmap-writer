# MindMap Features Test

## Overview
Comprehensive test page for MindScribble use case features in v-network-graph.

## Implemented Features

### ✅ Node Operations
- **Click to Add Node**: Toggle "Add Node" mode, then click canvas to create new nodes
- **Node Selection**: Click nodes to select them (multi-select with Ctrl/Cmd)
- **Connect Nodes**: Select 2 nodes and press `C` key or click "Connect Nodes" button
- **Drag Nodes**: All nodes are draggable

### ✅ Node Styling
- **Rounded Rectangle Shape**: Nodes use rounded rectangles (better for mindmaps than circles)
- **Text Inside Node**: Node name is rendered inside the node (not below)
- **Custom Rendering**: Uses SVG `<rect>` with rounded corners and centered text
- **Selection Highlighting**: Selected nodes have different colors and thicker borders

### ✅ View Controls
- **Zoom Level Slider**: Set zoom from 10% to 200%
- **Mouse Wheel Zoom Rate**: Configurable zoom speed (0.1 to 2.0)
- **Scaling Objects**: Nodes scale with zoom level (can be toggled in config)

### ✅ Layout Algorithms
- **D3 Force Layout**: Toggle on/off with checkbox
  - Nodes automatically arrange themselves
  - Dragged nodes become fixed
  - Alt+Click to fix/unfix node positions
- **Dagre Layout**: Dropdown with 4 directions
  - Top to Bottom (TB)
  - Bottom to Up (BT)
  - Left to Right (LR)
  - Right to Left (RL)
  - Note: Requires `dagre` npm package (not yet installed)

### ✅ Keyboard Shortcuts
- **C**: Connect two selected nodes
- **Ctrl/Cmd + Click**: Multi-select nodes
- **Alt + Click**: Fix/unfix node position (when D3 Force is enabled)

### ✅ Multi-Selection
- Built-in v-network-graph feature
- Hold Ctrl/Cmd and click nodes to select multiple
- Selected nodes count displayed in UI

## Navigation Structure

### Left Drawer Tabs
1. **Navigation Tab**: Links to all test pages
   - Test 1-9: Original POC tests
   - **MindMap Features**: New comprehensive test (highlighted)

2. **Tests Tab**: Reserved for future test controls

## Technical Implementation

### Key Configuration
```typescript
configs: {
  view: {
    scalingObjects: true,  // Nodes scale with zoom
    mouseWheelZoomRate: 0.3,  // Configurable
    layoutHandler: ForceLayout  // D3 force simulation
  },
  node: {
    selectable: true,  // Enable selection
    type: 'rect',  // Rounded rectangle
    width: 120,
    height: 40,
    draggable: true
  }
}
```

### Custom Node Rendering
Uses `#override-node` slot to render:
- Rounded rectangle with `<rect rx="8">`
- Centered text with `text-anchor="middle"`
- Scales properly with zoom level

### Event Handlers
- `view:click`: Add node at click position
- `node:select`: Track selected nodes

## Performance Notes

From stress testing (Test 9):
- ✅ **100 nodes**: Very fast
- ✅ **500 nodes**: Smooth (VueFlow limit)
- ✅ **1000 nodes**: Added in ~3 seconds, draggable at 55 FPS
- 🎯 **Batched Addition**: Nodes added in batches of 20 to avoid UI freeze

## Next Steps

### To Install Dagre Layout
```bash
cd network-graph/quasar-project
npm install dagre
npm install --save-dev @types/dagre
```

Then implement the layout function in `TestMindMap.vue` following the example in `network-graph/dev/examples/dagre.vue`.

### Future Enhancements
- [ ] Implement actual Dagre layout (requires library)
- [ ] Add node editing (double-click to edit name)
- [ ] Add node deletion (Delete key)
- [ ] Add edge deletion
- [ ] Add undo/redo
- [ ] Add export/import
- [ ] Add minimap overlay
- [ ] Add context menu (right-click)
- [ ] Add keyboard shortcuts for zoom (Ctrl +/-)
- [ ] Add fit-to-screen button
- [ ] Add node colors/styles
- [ ] Add edge labels
- [ ] Add collapse/expand for hierarchies

## Usage

1. Navigate to "MindMap Features" from the left drawer
2. Try adding nodes by clicking "Add Node" then clicking canvas
3. Select nodes and press `C` to connect them
4. Toggle D3 Force to see automatic layout
5. Adjust zoom level and wheel zoom rate
6. Test with multiple nodes to verify performance

## Conclusion

v-network-graph successfully handles all MindScribble requirements:
- ✅ Performance with 1000+ nodes
- ✅ Custom node shapes and styling
- ✅ Text inside nodes
- ✅ Multi-selection
- ✅ Keyboard shortcuts
- ✅ D3 Force layout
- ✅ Configurable zoom
- ⏳ Dagre layout (pending library installation)

**Recommendation**: Proceed with v-network-graph for MindScribble implementation.

