# Quick Start Guide

## Installation

```bash
cd mindmap-writer/vueflow-design
npm install
```

## Run Development Server

```bash
npm run dev
```

The app will automatically open at `http://localhost:3000`

## Basic Usage

### 1. Add Nodes

**Add Root Node:**
- Click the "Add Root Node" button in the left panel

**Add Child Node:**
- Right-click on any node
- Select "Add Child" from the context menu

**Add Sibling Node:**
- Right-click on any node
- Select "Add Sibling" from the context menu

### 2. Move Nodes

- Click and drag any node to move it
- On drag end, overlaps are automatically resolved
- Parent rectangles expand to contain children
- Sibling rectangles push each other apart

### 3. Visualize Bounding Boxes

- Click "Show/Hide Bounding Boxes" to toggle visualization
- **Red dashed boxes**: Root node bounding rectangles
- **Blue dashed boxes**: Child node bounding rectangles

### 4. Generate Test Data

- Click "Generate Test Data (50 nodes)" to create a complex hierarchy
- This creates 3 root nodes with multiple levels of children
- Great for testing performance and algorithm behavior

### 5. Manual Overlap Resolution

- Click "Resolve Overlaps" to manually trigger the algorithm
- Useful for testing or if automatic resolution is disabled

## What to Test

### Basic Functionality
1. ✅ Create root nodes
2. ✅ Add children to nodes
3. ✅ Add siblings to nodes
4. ✅ Drag nodes around
5. ✅ Verify overlaps are resolved

### Hierarchy Testing
1. ✅ Create deep hierarchies (5+ levels)
2. ✅ Create wide hierarchies (10+ siblings)
3. ✅ Drag child nodes
4. ✅ Drag parent nodes
5. ✅ Verify parent rectangles expand

### Performance Testing
1. ✅ Generate 50 nodes (provided)
2. ✅ Manually create 100+ nodes
3. ✅ Measure resolution time
4. ✅ Check for lag during dragging
5. ✅ Monitor browser memory usage

### Edge Cases
1. ✅ Overlapping root nodes
2. ✅ Deeply nested children
3. ✅ Many siblings at same level
4. ✅ Rapid dragging
5. ✅ Adding nodes while dragging

## Performance Monitoring

### Browser DevTools

1. Open DevTools (F12)
2. Go to Performance tab
3. Click Record
4. Perform actions (drag nodes, add nodes)
5. Stop recording
6. Analyze:
   - Frame rate (should be 60 FPS)
   - JavaScript execution time
   - Layout/paint time

### Memory Monitoring

1. Open DevTools (F12)
2. Go to Memory tab
3. Take heap snapshot
4. Perform actions
5. Take another snapshot
6. Compare to check for leaks

## Expected Behavior

### When Dragging a Node

1. Node moves with cursor
2. On drag end:
   - Bounding rectangles are recalculated
   - Overlaps are detected
   - Nodes are pushed apart
   - Parent rectangles expand if needed

### When Adding a Child

1. New node appears below parent
2. Edge is created (visual connection)
3. Parent's bounding rectangle expands
4. Overlaps are resolved automatically

### When Adding a Sibling

1. New node appears next to sibling
2. Edge is created to parent (if exists)
3. Sibling rectangles may push apart
4. Parent's bounding rectangle expands

## Troubleshooting

### Nodes Not Moving After Drag

**Cause**: VueFlow reactivity issue
**Solution**: Check console for errors, refresh page

### Overlaps Not Resolving

**Cause**: Algorithm not running
**Solution**: Click "Resolve Overlaps" button manually

### Performance Issues

**Cause**: Too many nodes or deep hierarchy
**Solution**: 
- Reduce node count
- Consider RBush optimization
- Check browser memory usage

### Context Menu Not Appearing

**Cause**: Right-click not detected
**Solution**: 
- Make sure to right-click directly on a node
- Check browser console for errors

## Next Steps

After testing the AABB implementation:

1. **Measure Performance**
   - Record resolution time for 50, 100, 500 nodes
   - Note any lag or stuttering

2. **Implement RBush Version**
   - Create `collision-rbush.ts`
   - Compare performance with AABB

3. **Document Results**
   - Update README with findings
   - Add performance comparison table

4. **Integrate into MindScribble**
   - Copy working algorithm
   - Adapt for production use
   - Add optimizations as needed

## Keyboard Shortcuts

Currently none implemented. Future additions:

- `Ctrl+Click`: Add root node at cursor
- `Delete`: Delete selected node
- `Ctrl+Z`: Undo
- `Ctrl+Y`: Redo

## Tips

1. **Start Small**: Begin with 2-3 root nodes and a few children
2. **Use Bounding Boxes**: Keep them visible to understand the algorithm
3. **Test Incrementally**: Add nodes one at a time to see behavior
4. **Monitor Performance**: Watch for slowdowns as node count increases
5. **Take Notes**: Document any issues or unexpected behavior

## Support

For questions or issues:
1. Check README.md for detailed documentation
2. Review NESTED_LAYOUT.md for algorithm details
3. Check browser console for error messages
4. Review the code in `src/layout.ts` and `src/collision.ts`

