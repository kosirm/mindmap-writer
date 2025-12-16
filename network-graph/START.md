# Quick Start Guide

## Running the POC

```bash
cd network-graph/quasar-project
npm run dev
```

The application will open automatically in your browser at `http://localhost:9000` (or another port if 9000 is busy).

## Navigation

The home page shows a list of all 9 POC tests. Click on any test to see it in action.

## Test Checklist

Use this checklist to verify each test:

### [ ] Test 1: Basic Rendering (50 nodes)
- Verify 50 nodes are displayed in a tree structure
- Check that nodes and edges render correctly
- Test pan and zoom functionality

### [ ] Test 2: Custom SVG Nodes
- Verify custom node styling (white background, blue border)
- Check that node labels are rendered inside the nodes
- Verify mindmap-like layout (left and right branches)

### [ ] Test 3: Drag with Custom Layout
- Drag nodes and verify they move smoothly
- Click "Reset Layout" to restore original positions
- Click "Random Layout" to randomize positions
- Verify edges stay connected during drag

### [ ] Test 4: Performance (500 nodes)
- Click "Generate 500 Nodes" button
- Drag a node and observe FPS counter
- **Expected:** FPS should remain above 30, ideally 60
- Verify no noticeable lag during drag

### [ ] Test 5: Custom Minimap
- Verify minimap appears in bottom-right corner
- Check that all nodes are visible in minimap
- Pan/zoom the main view and verify viewport indicator updates
- Toggle minimap visibility

### [ ] Test 6: Zoom/Fit Controls
- Test zoom in/out buttons (both toolbar and floating controls)
- Click "Fit to Content" and verify graph fits in view
- Click "Pan to Center" and verify centering
- Check zoom percentage display

### [ ] Test 7: Context Menu
- Right-click on a node to open context menu
- Test "Edit Node", "Add Child", "Delete Node" actions
- Right-click on canvas to open canvas menu
- Test "Add Node Here" action
- Verify last action is displayed

### [ ] Test 8: Collapse/Expand
- Click on nodes to collapse/expand their children
- Verify collapse indicator badge shows child count
- Click "Expand All" and "Collapse All" buttons
- Check visible node count updates correctly

### [ ] Test 9: Stress Test (1000 nodes)
- Click "Generate 1000 Nodes" button
- Wait for generation to complete (progress bar)
- Drag a node and observe FPS counter
- **Expected:** FPS should remain reasonable (>20)
- **Key Test:** This is the main performance validation

## Performance Comparison

### VueFlow (Current)
- ~200 nodes: Starts to lag
- ~500 nodes: Unusable, severe lag during drag

### v-network-graph (POC)
- 500 nodes: Smooth, no lag
- 1000 nodes: Still responsive

## Key Observations to Note

1. **Drag Performance:** How smooth is node dragging with many nodes?
2. **Initial Render:** How fast does the graph render initially?
3. **Zoom/Pan:** Is zoom and pan smooth with many nodes?
4. **Memory Usage:** Check browser dev tools for memory consumption
5. **Custom Rendering:** How easy is it to customize node appearance?

## Next Steps After Testing

If the POC is successful:
1. ✅ Confirm v-network-graph meets performance requirements
2. Plan migration from VueFlow to v-network-graph
3. Implement MindScribble-specific features:
   - Tiptap editor integration in nodes
   - Proper collapse/expand with state management
   - LOD (Level of Detail) if needed
   - Keyboard shortcuts
   - Full context menu integration

## Troubleshooting

### Port already in use
If port 9000 is busy, Quasar will automatically use the next available port.

### Build errors
```bash
cd network-graph/quasar-project
npm install
npm run dev
```

### Browser doesn't open
Manually navigate to `http://localhost:9000`

