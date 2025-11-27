# Performance Mode - Crash Prevention

## 🚨 If the app is crashing your browser/computer:

### Immediate Steps:

1. **Clear Browser Cache**
   - Press `Ctrl+Shift+Delete`
   - Clear cached images and files
   - Restart browser

2. **Start Fresh**
   - Delete `dev.log` file
   - Run `npm run dev` again
   - The console.log statements are now commented out

3. **Use Performance Settings**
   - Disable Matter.js collision detection (toggle off in settings)
   - Disable Planck.js collision detection (toggle off in settings)
   - Disable D3 Force simulation
   - Hide minimap
   - Use single view mode (not split view)

4. **Limit Node Count**
   - Start with < 20 nodes for testing
   - Avoid creating large hierarchies initially

### Known Performance Issues:

1. **Selection Watcher Firing Multiple Times**
   - Location: `VueFlowTest.vue:3718`
   - Cause: VueFlow's `getSelectedNodes` computed ref triggers frequently
   - Impact: Can cause cascading updates in tree and writer views

2. **Computed Properties Rebuilding Data**
   - `treeData` (line 1358) - Rebuilds entire tree structure on any node change
   - `nodesWithChildren` (line 1388) - Deep copies all nodes on any change
   - Impact: Memory allocation spikes with large node counts

3. **Event Bus Listeners**
   - Multiple components listening to same events
   - Can cause circular event loops if not careful

### Recommended Development Workflow:

1. Start with empty canvas
2. Add 5-10 nodes for testing
3. Test one feature at a time
4. Keep physics engines disabled during development
5. Monitor browser memory usage (F12 → Performance tab)

### If Crash Occurs:

1. Force quit browser
2. Delete `dev.log`
3. Clear browser cache
4. Restart with smaller dataset
5. Check Windows Task Manager for memory usage

### Future Optimizations Needed:

- [ ] Debounce selection watcher
- [ ] Memoize computed properties with large data structures
- [ ] Add virtual scrolling for large node lists
- [ ] Implement lazy loading for tree view
- [ ] Add performance monitoring
- [ ] Limit event bus emission frequency

