# Smart Legacy Store Cleanup Plan

**Date:** 2025-12-26  
**Status:** 📋 READY TO EXECUTE

## Problem with Previous Approach

The previous plan tried to update too many files at once, leading to:
- Hundreds of TypeScript errors
- Runtime errors cascading across files
- Difficulty tracking which changes caused which errors
- Hard to rollback specific changes

## New Strategy: Incremental File-by-File Approach

**Key Principles:**
1. ✅ **One file at a time** - Make changes, test, commit
2. ✅ **Bottom-up approach** - Start with leaf components, work up to core
3. ✅ **Keep app running** - After each change, app should still work
4. ✅ **Frequent commits** - Easy to rollback if needed
5. ✅ **Test after each file** - Catch errors immediately

## Phase 1: Preparation (5 minutes)

### Step 1.1: Create Backup and Working Branch
```bash
git checkout -b backup-before-smart-cleanup
git checkout -b smart-cleanup-legacy-stores
```

### Step 1.2: Verify Current State
- [ ] App runs without errors
- [ ] All views work correctly
- [ ] No console errors

## Phase 2: Remove Store Mode Toggle (30 minutes)

Since we're always using unified store now, we can remove the toggle UI first.

### Step 2.1: Update DevPanel.vue
**File:** `mindpad/quasar/src/dev/DevPanel.vue`

**Changes:**
- Remove store mode toggle UI (radio buttons)
- Remove store mode display
- Keep other dev tools intact

**Test:** Dev panel still opens and works

**Commit:** `chore: remove store mode toggle from DevPanel`

---

## Phase 3: Update View Components (2 hours)

Update components from simplest to most complex.

### Step 3.1: Update D3ConceptMapPanel.vue (10 min)
**File:** `mindpad/quasar/src/pages/components/D3ConceptMapPanel.vue`

**Remove:**
```typescript
import { useDocumentStore } from 'src/core/stores/documentStore'
import { useStoreMode } from 'src/composables/useStoreMode'
const documentStore = useDocumentStore()
const { isUnifiedMode } = useStoreMode()
```

**Replace all:**
- `documentStore.X` → `unifiedStore.X`
- Remove all `if (isUnifiedMode.value)` conditionals

**Test:** D3 Concept Map view still works

**Commit:** `refactor: migrate D3ConceptMapPanel to unified store only`

### Step 3.2: Update useMindmapIntegration.ts (10 min)
**File:** `mindpad/quasar/src/features/canvas/composables/useMindmapIntegration.ts`

**Changes:** Same pattern as above

**Test:** Mindmap integration still works

**Commit:** `refactor: migrate useMindmapIntegration to unified store only`

### Step 3.3: Update OutlineNodeContent.vue (15 min)
**File:** `mindpad/quasar/src/features/tree/components/OutlineNodeContent.vue`

**Remove:**
```typescript
import { useDocumentStore } from 'src/core/stores'
import { useStoreMode } from 'src/composables/useStoreMode'
const documentStore = useDocumentStore()
const { isUnifiedMode } = useStoreMode()
```

**Simplify helper functions:**
```typescript
// Before
function selectNode(nodeId: string, source: EventSource, scrollIntoView: boolean) {
  if (isUnifiedMode.value) {
    unifiedStore.selectNode(nodeId, source, scrollIntoView)
  } else {
    documentStore.selectNode(nodeId, source, scrollIntoView)
  }
}

// After
function selectNode(nodeId: string, source: EventSource, scrollIntoView: boolean) {
  unifiedStore.selectNode(nodeId, source, scrollIntoView)
}
```

**Test:** Outline node selection and editing works

**Commit:** `refactor: migrate OutlineNodeContent to unified store only`

### Step 3.4: Update OutlineView.vue (15 min)
**File:** `mindpad/quasar/src/features/tree/components/OutlineView.vue`

**Remove:**
```typescript
import { useDocumentStore } from 'src/core/stores'
import { useStoreSynchronizer } from 'src/core/stores/storeSynchronizer'
import { useStoreMode } from 'src/composables/useStoreMode'
const documentStore = useDocumentStore()
const synchronizer = useStoreSynchronizer()
const { isUnifiedMode, isDualWriteMode } = useStoreMode()
```

**Simplify:**
- Remove all `if (isUnifiedMode.value)` conditionals
- Remove dual-write synchronization code
- Use `unifiedStore` directly everywhere

**Test:** Outline view displays and updates correctly

**Commit:** `refactor: migrate OutlineView to unified store only`

### Step 3.5: Update WriterNodeContent.vue (15 min)
**File:** `mindpad/quasar/src/features/writer/components/WriterNodeContent.vue`

**Changes:** Same pattern as OutlineNodeContent

**Test:** Writer node editing works

**Commit:** `refactor: migrate WriterNodeContent to unified store only`

### Step 3.6: Update WriterView.vue (15 min)
**File:** `mindpad/quasar/src/features/writer/components/WriterView.vue`

**Changes:** Same pattern as OutlineView

**Test:** Writer view displays and updates correctly

**Commit:** `refactor: migrate WriterView to unified store only`

---

## Phase 4: Update File Operations (45 minutes)

### Step 4.1: Update FileOperationsModal.vue (20 min)
**File:** `mindpad/quasar/src/shared/components/FileOperationsModal.vue`

**Remove:**
```typescript
import { useDocumentStore } from 'src/core/stores'
import { useMultiDocumentStore } from 'src/core/stores/multiDocumentStore'
import { useStoreMode } from 'src/composables/useStoreMode'
const documentStore = useDocumentStore()
const multiDocStore = useMultiDocumentStore()
const { isUnifiedMode, isDualWriteMode } = useStoreMode()
```

**Simplify save logic:**
```typescript
// Before
if (isUnifiedMode.value || isDualWriteMode.value) {
  document = unifiedStore.toDocument()
} else {
  document = documentStore.toDocument()
}

// After
document = unifiedStore.toDocument()
```

**Test:** Save, open, and manage files work

**Commit:** `refactor: migrate FileOperationsModal to unified store only`

### Step 4.2: Update useAutosave.ts (15 min)
**File:** `mindpad/quasar/src/composables/useAutosave.ts`

**Changes:** Same pattern - remove conditionals, use unified store only

**Test:** Autosave still works (wait 2 seconds after edit)

**Commit:** `refactor: migrate useAutosave to unified store only`

---

## Phase 5: Update Layout Components (45 minutes)

### Step 5.1: Update FilePanel.vue (15 min)
**File:** `mindpad/quasar/src/pages/components/FilePanel.vue`

**Remove:**
```typescript
import { useDocumentStore } from 'src/core/stores/documentStore'
import { useMultiDocumentStore } from 'src/core/stores/multiDocumentStore'
const documentStore = useDocumentStore()
const multiDocStore = useMultiDocumentStore()
```

**Update:**
- Use `unifiedStore` for all document operations
- Update document instance management

**Test:** File panels work correctly

**Commit:** `refactor: migrate FilePanel to unified store only`

### Step 5.2: Update DockviewLayout.vue (15 min)
**File:** `mindpad/quasar/src/layouts/DockviewLayout.vue`

**Changes:** Same pattern

**Test:** Dockview layout and file tabs work

**Commit:** `refactor: migrate DockviewLayout to unified store only`

### Step 5.3: Update MainLayout.vue (15 min)
**File:** `mindpad/quasar/src/layouts/MainLayout.vue`

**Remove:**
```typescript
import { useDocumentStore } from 'src/core/stores/documentStore'
import { useMultiDocumentStore } from 'src/core/stores/multiDocumentStore'
const documentStore = useDocumentStore()
const multiDocStore = useMultiDocumentStore()
```

**Update:**
- Use `unifiedStore` for save operations
- Update command context

**Test:** Main layout, save (Ctrl+S), and commands work

**Commit:** `refactor: migrate MainLayout to unified store only`

---

## Phase 6: Clean Up Core Stores (30 minutes)

### Step 6.1: Update unifiedDocumentStore.ts (15 min)
**File:** `mindpad/quasar/src/core/stores/unifiedDocumentStore.ts`

**Remove:**
- Import of `useDocumentStore` and `useMultiDocumentStore`
- `MIGRATION_MODE` constant
- `logMigrationOperation()` function
- `getActiveDocumentFromLegacy()` method
- `getAllDocumentsFromLegacy()` method
- All migration-related comments and logging

**Test:** App still works after cleanup

**Commit:** `refactor: remove migration code from unifiedDocumentStore`

### Step 6.2: Update index.ts (5 min)
**File:** `mindpad/quasar/src/core/stores/index.ts`

**Remove:**
```typescript
export { useDocumentStore } from './documentStore'
export { useMultiDocumentStore } from './multiDocumentStore'
export { useStoreSynchronizer } from './storeSynchronizer'
```

**Test:** TypeScript compilation succeeds

**Commit:** `refactor: remove legacy store exports from index`

---

## Phase 7: Delete Legacy Files (10 minutes)

### Step 7.1: Delete Legacy Store Files
```bash
git rm mindpad/quasar/src/core/stores/documentStore.ts
git rm mindpad/quasar/src/core/stores/multiDocumentStore.ts
git rm mindpad/quasar/src/core/stores/storeSynchronizer.ts
git rm mindpad/quasar/src/composables/useStoreMode.ts
```

**Test:**
- TypeScript compilation succeeds
- No import errors
- App runs without errors

**Commit:** `chore: delete legacy store files`

---

## Phase 8: Final Verification (30 minutes)

### Step 8.1: Run Full Test Suite
- [ ] App starts without errors
- [ ] No console errors on load
- [ ] All views display correctly
- [ ] Node operations work (create, edit, delete, move)
- [ ] File operations work (save, open, manage)
- [ ] Multi-document support works
- [ ] Autosave works
- [ ] Selection synchronization works

### Step 8.2: Search for Remaining References
```bash
# Search for any remaining legacy store references
grep -r "useDocumentStore" mindpad/quasar/src/
grep -r "useMultiDocumentStore" mindpad/quasar/src/
grep -r "useStoreSynchronizer" mindpad/quasar/src/
grep -r "useStoreMode" mindpad/quasar/src/
grep -r "isUnifiedMode" mindpad/quasar/src/
grep -r "isDualWriteMode" mindpad/quasar/src/
```

### Step 8.3: Clean Up localStorage
```javascript
// In browser console
localStorage.removeItem('mindpad-store-mode')
```

### Step 8.4: Final Commit
**Commit:** `docs: update cleanup documentation`

---

## Estimated Time Breakdown

| Phase | Time | Cumulative |
|-------|------|------------|
| 1. Preparation | 5 min | 5 min |
| 2. Remove Toggle | 30 min | 35 min |
| 3. View Components | 2 hours | 2h 35min |
| 4. File Operations | 45 min | 3h 20min |
| 5. Layout Components | 45 min | 4h 5min |
| 6. Core Stores | 30 min | 4h 35min |
| 7. Delete Files | 10 min | 4h 45min |
| 8. Verification | 30 min | 5h 15min |

**Total: ~5 hours**

## Key Advantages of This Approach

1. ✅ **Incremental** - One file at a time, easy to track progress
2. ✅ **Testable** - Test after each file, catch errors immediately
3. ✅ **Reversible** - Frequent commits make rollback easy
4. ✅ **Low Risk** - App keeps working throughout the process
5. ✅ **Clear Progress** - Know exactly where you are in the process
6. ✅ **No Cascading Errors** - Fix errors in one file before moving to next

## Emergency Rollback

If you encounter issues at any step:
```bash
# Rollback last commit
git reset --hard HEAD~1

# Or rollback to specific commit
git reset --hard <commit-hash>

# Or abandon and start over
git checkout backup-before-smart-cleanup
```

## Success Criteria

- ✅ All 13 files updated successfully
- ✅ 4 legacy files deleted
- ✅ No TypeScript errors
- ✅ No console errors
- ✅ All functionality works
- ✅ ~2000+ lines of code removed

## Next Steps

1. Review this plan
2. Start with Phase 1 (Preparation)
3. Follow each step in order
4. Test after each file
5. Commit frequently
6. Celebrate when done! 🎉


