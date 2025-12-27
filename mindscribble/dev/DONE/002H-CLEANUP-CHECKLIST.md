# Legacy Store Cleanup Checklist

**Date:** 2025-12-25

## Files to Delete (4 files)

- [ ] `mindscribble/quasar/src/core/stores/documentStore.ts`
- [ ] `mindscribble/quasar/src/core/stores/multiDocumentStore.ts`
- [ ] `mindscribble/quasar/src/core/stores/storeSynchronizer.ts`
- [ ] `mindscribble/quasar/src/composables/useStoreMode.ts`

## Files to Update (13 files)

### Core Stores (2 files)
- [ ] `mindscribble/quasar/src/core/stores/index.ts` - Remove legacy store exports
- [ ] `mindscribble/quasar/src/core/stores/unifiedDocumentStore.ts` - Remove migration code

### View Components (5 files)
- [ ] `mindscribble/quasar/src/features/tree/components/OutlineView.vue`
- [ ] `mindscribble/quasar/src/features/tree/components/OutlineNodeContent.vue`
- [ ] `mindscribble/quasar/src/features/writer/components/WriterView.vue`
- [ ] `mindscribble/quasar/src/features/writer/components/WriterNodeContent.vue`
- [ ] `mindscribble/quasar/src/features/canvas/composables/useMindmapIntegration.ts`

### File Operations (2 files)
- [ ] `mindscribble/quasar/src/shared/components/FileOperationsModal.vue`
- [ ] `mindscribble/quasar/src/composables/useAutosave.ts`

### Layout Components (3 files)
- [ ] `mindscribble/quasar/src/layouts/MainLayout.vue`
- [ ] `mindscribble/quasar/src/layouts/DockviewLayout.vue`
- [ ] `mindscribble/quasar/src/pages/components/FilePanel.vue`

### Other Components (1 file)
- [ ] `mindscribble/quasar/src/pages/components/D3ConceptMapPanel.vue`

### Dev Tools (1 file - optional)
- [ ] `mindscribble/quasar/src/dev/DevPanel.vue` - Remove store mode toggle UI

## Testing Checklist

### Basic Functionality
- [ ] Application starts without errors
- [ ] No console errors on load
- [ ] Dev tools panel opens

### View Operations
- [ ] OutlineView displays nodes correctly
- [ ] WriterView displays nodes correctly
- [ ] MindmapView displays nodes correctly
- [ ] Can switch between views
- [ ] View synchronization works

### Node Operations
- [ ] Can create new nodes
- [ ] Can edit node content
- [ ] Can delete nodes
- [ ] Can move/reorder nodes (outline)
- [ ] Can drag nodes (mindmap)
- [ ] Node selection works
- [ ] Node expansion/collapse works (outline)

### File Operations
- [ ] Can save file (Ctrl+S)
- [ ] Can open file
- [ ] Can create new file
- [ ] Autosave works
- [ ] File list displays correctly
- [ ] File metadata updates correctly

### Multi-Document Support
- [ ] Can open multiple files
- [ ] Can switch between file tabs
- [ ] Each file maintains its own state
- [ ] Closing file works correctly

### Edge Cases
- [ ] Empty document works
- [ ] Large document (100+ nodes) works
- [ ] Rapid edits don't cause errors
- [ ] Undo/redo works (if implemented)

## Post-Cleanup Tasks

- [ ] Run TypeScript compiler to check for errors
- [ ] Run linter to check for unused imports
- [ ] Search codebase for any remaining references to:
  - `useDocumentStore`
  - `useMultiDocumentStore`
  - `useStoreSynchronizer`
  - `useStoreMode`
  - `isUnifiedMode`
  - `isDualWriteMode`
  - `isLegacyMode`
- [ ] Update documentation
- [ ] Remove migration-related dev docs (optional)
- [ ] Clean up localStorage key: `mindscribble-store-mode`
- [ ] Commit changes with clear message
- [ ] Create PR for review

## Estimated Time

- **Preparation:** 15 minutes (review plan, backup)
- **File Updates:** 2-3 hours
- **File Deletions:** 5 minutes
- **Testing:** 1-2 hours
- **Documentation:** 30 minutes
- **Total:** 4-6 hours

## Notes

- Create a backup branch before starting: `git checkout -b backup-before-cleanup`
- Work in a new branch: `git checkout -b cleanup-legacy-stores`
- Commit frequently with descriptive messages
- Test after each major change
- If issues arise, can revert to backup branch

