# Smart Legacy Store Cleanup - Checklist

**Date:** 2025-12-26  
**Branch:** `smart-cleanup-legacy-stores`

## Quick Reference

**Total Files:** 14 files to update + 4 files to delete  
**Estimated Time:** 5 hours  
**Strategy:** One file at a time, test after each

---

## Phase 1: Preparation ⏱️ 5 min

- [ ] Create backup branch: `git checkout -b backup-before-smart-cleanup`
- [ ] Create working branch: `git checkout -b smart-cleanup-legacy-stores`
- [ ] Verify app runs without errors
- [ ] Verify all views work correctly

---

## Phase 2: Remove Store Mode Toggle ⏱️ 30 min

- [ ] **DevPanel.vue** - Remove store mode toggle UI
  - Test: Dev panel opens and works
  - Commit: `chore: remove store mode toggle from DevPanel`

---

## Phase 3: Update View Components ⏱️ 2 hours

- [ ] **D3ConceptMapPanel.vue** (10 min)
  - Remove: `useDocumentStore`, `useStoreMode` imports
  - Replace: `documentStore.X` → `unifiedStore.X`
  - Remove: All `if (isUnifiedMode.value)` conditionals
  - Test: D3 Concept Map view works
  - Commit: `refactor: migrate D3ConceptMapPanel to unified store only`

- [ ] **useMindmapIntegration.ts** (10 min)
  - Same pattern as above
  - Test: Mindmap integration works
  - Commit: `refactor: migrate useMindmapIntegration to unified store only`

- [ ] **OutlineNodeContent.vue** (15 min)
  - Remove: `useDocumentStore`, `useStoreMode` imports
  - Simplify: `selectNode()` and `updateNode()` helper functions
  - Remove: All conditionals
  - Test: Outline node selection and editing works
  - Commit: `refactor: migrate OutlineNodeContent to unified store only`

- [ ] **OutlineView.vue** (15 min)
  - Remove: `useDocumentStore`, `useStoreSynchronizer`, `useStoreMode` imports
  - Remove: Dual-write synchronization code
  - Simplify: Use `unifiedStore` directly
  - Test: Outline view displays and updates correctly
  - Commit: `refactor: migrate OutlineView to unified store only`

- [ ] **WriterNodeContent.vue** (15 min)
  - Same pattern as OutlineNodeContent
  - Test: Writer node editing works
  - Commit: `refactor: migrate WriterNodeContent to unified store only`

- [ ] **WriterView.vue** (15 min)
  - Same pattern as OutlineView
  - Test: Writer view displays and updates correctly
  - Commit: `refactor: migrate WriterView to unified store only`

---

## Phase 4: Update File Operations ⏱️ 45 min

- [ ] **FileOperationsModal.vue** (20 min)
  - Remove: `useDocumentStore`, `useMultiDocumentStore`, `useStoreMode` imports
  - Simplify: Save/open logic to use `unifiedStore` only
  - Test: Save, open, and manage files work
  - Commit: `refactor: migrate FileOperationsModal to unified store only`

- [ ] **useAutosave.ts** (15 min)
  - Remove: Legacy store imports and conditionals
  - Use: `unifiedStore` only
  - Test: Autosave works (wait 2 seconds after edit)
  - Commit: `refactor: migrate useAutosave to unified store only`

---

## Phase 5: Update Layout Components ⏱️ 45 min

- [ ] **FilePanel.vue** (15 min)
  - Remove: `useDocumentStore`, `useMultiDocumentStore` imports
  - Update: Document instance management
  - Test: File panels work correctly
  - Commit: `refactor: migrate FilePanel to unified store only`

- [ ] **DockviewLayout.vue** (15 min)
  - Same pattern as FilePanel
  - Test: Dockview layout and file tabs work
  - Commit: `refactor: migrate DockviewLayout to unified store only`

- [ ] **MainLayout.vue** (15 min)
  - Remove: `useDocumentStore`, `useMultiDocumentStore` imports
  - Update: Save operations and command context
  - Test: Main layout, save (Ctrl+S), and commands work
  - Commit: `refactor: migrate MainLayout to unified store only`

---

## Phase 6: Clean Up Core Stores ⏱️ 30 min

- [ ] **unifiedDocumentStore.ts** (15 min)
  - Remove: `useDocumentStore`, `useMultiDocumentStore` imports
  - Remove: `MIGRATION_MODE`, `logMigrationOperation()`
  - Remove: `getActiveDocumentFromLegacy()`, `getAllDocumentsFromLegacy()`
  - Remove: All migration comments and logging
  - Test: App still works
  - Commit: `refactor: remove migration code from unifiedDocumentStore`

- [ ] **index.ts** (5 min)
  - Remove: Legacy store exports
  - Test: TypeScript compilation succeeds
  - Commit: `refactor: remove legacy store exports from index`

---

## Phase 7: Delete Legacy Files ⏱️ 10 min

- [ ] Delete files:
  ```bash
  git rm mindpad/quasar/src/core/stores/documentStore.ts
  git rm mindpad/quasar/src/core/stores/multiDocumentStore.ts
  git rm mindpad/quasar/src/core/stores/storeSynchronizer.ts
  git rm mindpad/quasar/src/composables/useStoreMode.ts
  ```
- [ ] Test: TypeScript compilation succeeds
- [ ] Test: No import errors
- [ ] Test: App runs without errors
- [ ] Commit: `chore: delete legacy store files`

---

## Phase 8: Final Verification ⏱️ 30 min

### Functionality Tests
- [ ] App starts without errors
- [ ] No console errors on load
- [ ] All views display correctly (Outline, Writer, Mindmap)
- [ ] Node operations work (create, edit, delete, move)
- [ ] File operations work (save, open, manage)
- [ ] Multi-document support works
- [ ] Autosave works
- [ ] Selection synchronization works

### Code Cleanup
- [ ] Search for remaining references:
  ```bash
  grep -r "useDocumentStore" mindpad/quasar/src/
  grep -r "useMultiDocumentStore" mindpad/quasar/src/
  grep -r "useStoreSynchronizer" mindpad/quasar/src/
  grep -r "useStoreMode" mindpad/quasar/src/
  grep -r "isUnifiedMode" mindpad/quasar/src/
  grep -r "isDualWriteMode" mindpad/quasar/src/
  ```
- [ ] Clean up localStorage: `localStorage.removeItem('mindpad-store-mode')`
- [ ] Final commit: `docs: update cleanup documentation`

---

## Progress Tracking

**Files Updated:** 0 / 14  
**Files Deleted:** 0 / 4  
**Commits Made:** 0 / 15  
**Time Spent:** 0 / 5 hours

---

## Emergency Rollback

If issues occur:
```bash
# Rollback last commit
git reset --hard HEAD~1

# Rollback to specific commit
git reset --hard <commit-hash>

# Abandon and start over
git checkout backup-before-smart-cleanup
```

---

## Success Criteria

- ✅ All 14 files updated
- ✅ All 4 legacy files deleted
- ✅ No TypeScript errors
- ✅ No console errors
- ✅ All functionality works
- ✅ ~2000+ lines removed

