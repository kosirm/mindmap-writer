# Refactoring Documentation

This directory contains detailed documentation for refactoring the vueflow-design project to support multiple views (Mindmap + Concept Map).

## Quick Start

Read the documents in this order:

1. **REFACTORING_PLAN.md** - High-level overview of all phases
2. **EXTRACTION_GUIDE.md** - Detailed line numbers and function locations
3. **PHASE2_INSTRUCTIONS.md** - Step-by-step instructions for creating MindmapView

## Current Status

✅ **Completed:**
- Extended `NodeData` type with `mindmapPosition` and `conceptMapPosition` fields
- Created placeholder `ConceptMapView.vue` with nested node support
- Created `App-new.vue` with tab navigation template

⏳ **In Progress:**
- Phase 1: Extract composables from App.vue (NOT STARTED)
- Phase 2: Create MindmapView component (NOT STARTED)

## File Structure

### Documentation Files
- `REFACTORING_PLAN.md` - Complete refactoring plan with all phases
- `EXTRACTION_GUIDE.md` - Exact line numbers for copy-paste operations
- `PHASE2_INSTRUCTIONS.md` - Detailed instructions for Phase 2
- `README_REFACTORING.md` - This file

### Code Files
- `src/types.ts` - Updated with ViewPosition interface
- `src/views/ConceptMapView.vue` - Placeholder concept map view
- `src/App-new.vue` - Template for new tabbed App.vue
- `src/App.vue` - Original 2739-line file (to be refactored)

## Recommended Workflow

### Phase 1: Extract Composables (7 files to create)

Create these files in order:

1. `src/composables/useNodeTree.ts` - Tree traversal utilities
2. `src/composables/useLOD.ts` - Level of Detail system
3. `src/composables/useEdgeManagement.ts` - Edge operations
4. `src/composables/useNodeOperations.ts` - Node CRUD operations
5. `src/composables/useVueFlowSync.ts` - VueFlow synchronization
6. `src/composables/useNodeDrag.ts` - Drag and drop logic
7. `src/composables/useStressTest.ts` - Performance testing

**See EXTRACTION_GUIDE.md for exact line numbers to copy.**

### Phase 2: Create MindmapView

1. Copy App.vue template (lines 1-320) to `src/views/MindmapView.vue`
2. Copy App.vue script (lines 322-2190) to MindmapView.vue
3. Copy App.vue styles (lines 2192-2736) to MindmapView.vue
4. Fix import paths (add `../` prefix)
5. Test that MindmapView works standalone
6. Refactor to use composables from Phase 1
7. Test again

**See PHASE2_INSTRUCTIONS.md for detailed steps.**

### Phase 3: Create ConceptMapView

1. Use the placeholder `src/views/ConceptMapView.vue` as starting point
2. Implement nested node layout using VueFlow's `parentNode` feature
3. Add parent node auto-resizing when children move
4. Add controls panel for concept map settings

### Phase 4: Create Tabbed App.vue

1. Backup current App.vue to `App-original.vue`
2. Replace App.vue with content from `App-new.vue`
3. Create shared state (Pinia store or composable)
4. Wire up both views to shared state

### Phase 5: Position Conversion

1. Create `src/utils/positionConverter.ts`
2. Implement conversion functions
3. Add UI buttons to trigger conversion

### Phase 6: Testing

1. Test all features in MindmapView
2. Test all features in ConceptMapView
3. Test tab switching and state preservation
4. Clean up temporary files

## Key Decisions

### Why Extract Composables?

- **Maintainability:** 2739 lines in one file is unmanageable
- **Reusability:** Both views can share common logic
- **Testability:** Easier to test isolated functions
- **Readability:** Smaller, focused files are easier to understand

### Why Separate Views?

- **Different layouts:** Mindmap uses left/right positioning, Concept Map uses nested nodes
- **Different interactions:** Different drag behaviors, different controls
- **Dual positions:** Each node stores two positions (one per view)
- **Future extensibility:** Easy to add more view types later

### Why Shared State?

- **Single source of truth:** One nodes array, one edges array
- **Consistency:** Changes in one view reflect in the other
- **Conversion:** Easy to convert between layouts by updating position fields

## Important Notes

### Large Functions

Some functions are very large (100-200 lines):
- `syncToVueFlow()` - ~170 lines
- `onNodeDragStop()` - ~130 lines
- `runStressTest()` - ~200 lines
- `reparentNode()` - ~150 lines

These may need further refactoring within their composables.

### Dependencies Between Composables

Many composables depend on each other:
- `useLOD` needs `getNodeDepth` from `useNodeTree`
- `useNodeDrag` needs functions from `useNodeTree` and `useEdgeManagement`
- `useVueFlowSync` needs functions from `useLOD` and `useNodeTree`

**Solution:** Pass dependencies as parameters or create a master composable.

### Import Path Changes

When moving code to composables and views:
- `'./types'` → `'../types'`
- `'./components/X'` → `'../components/X'`
- `'./layout'` → `'../layout'`

### Testing Strategy

Test after each phase:
1. After creating each composable - unit test if possible
2. After creating MindmapView - full integration test
3. After creating ConceptMapView - test nested nodes
4. After creating tabbed App - test tab switching

## Troubleshooting

### If something breaks:

1. Check console for errors
2. Verify all imports are correct
3. Ensure refs are passed correctly (not unwrapped)
4. Check that all dependencies are provided to composables
5. Revert to `App-original.vue` if needed

### Common errors:

- **"Cannot read property of undefined"** - Missing dependency parameter
- **"X is not a function"** - Import path wrong or function not exported
- **"Reactive object lost reactivity"** - Passing `.value` instead of ref
- **Circular dependency** - Composables importing each other

## Timeline Estimate

- **Phase 1:** 4-6 hours (creating 7 composables)
- **Phase 2:** 2-3 hours (creating and refactoring MindmapView)
- **Phase 3:** 3-4 hours (creating ConceptMapView)
- **Phase 4:** 2-3 hours (tabbed App + shared state)
- **Phase 5:** 2-3 hours (position conversion)
- **Phase 6:** 2-3 hours (testing and cleanup)

**Total:** 15-22 hours

## Questions?

If you encounter issues or need clarification:
1. Check the relevant documentation file
2. Review the original App.vue for context
3. Test incrementally - don't refactor everything at once
4. Keep backups of working versions

## Success Criteria

The refactoring is complete when:
- ✅ All composables are created and tested
- ✅ MindmapView works with all original features
- ✅ ConceptMapView displays nested nodes correctly
- ✅ Tab switching works smoothly
- ✅ Both views share the same data
- ✅ Position conversion works
- ✅ No console errors
- ✅ Code is more maintainable than before

