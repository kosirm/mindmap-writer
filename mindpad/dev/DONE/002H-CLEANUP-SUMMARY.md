# Legacy Store Cleanup - Summary

**Date:** 2025-12-25  
**Status:** 📋 READY TO EXECUTE

## Overview

The unified store migration is complete and fully functional. All views (OutlineView, WriterView, MindmapView) are working correctly with the unified store. We can now safely remove the legacy stores and all migration-related code.

## What Needs to Be Done

### 1. Delete 4 Files (~2000+ lines of code)

```
mindpad/quasar/src/core/stores/documentStore.ts
mindpad/quasar/src/core/stores/multiDocumentStore.ts
mindpad/quasar/src/core/stores/storeSynchronizer.ts
mindpad/quasar/src/composables/useStoreMode.ts
```

### 2. Update 13 Files

Remove all references to legacy stores and store mode toggle:

**Core Stores (2 files):**
- `src/core/stores/index.ts` - Remove 3 export statements
- `src/core/stores/unifiedDocumentStore.ts` - Remove migration code (~50 lines)

**View Components (5 files):**
- `src/features/tree/components/OutlineView.vue`
- `src/features/tree/components/OutlineNodeContent.vue`
- `src/features/writer/components/WriterView.vue`
- `src/features/writer/components/WriterNodeContent.vue`
- `src/features/canvas/composables/useMindmapIntegration.ts`

**File Operations (2 files):**
- `src/shared/components/FileOperationsModal.vue`
- `src/composables/useAutosave.ts`

**Layout Components (3 files):**
- `src/layouts/MainLayout.vue`
- `src/layouts/DockviewLayout.vue`
- `src/pages/components/FilePanel.vue`

**Other (1 file):**
- `src/pages/components/D3ConceptMapPanel.vue`

### 3. Pattern to Remove

In each file, remove:

```typescript
// ❌ Remove these imports
import { useDocumentStore } from 'src/core/stores/documentStore'
import { useMultiDocumentStore } from 'src/core/stores/multiDocumentStore'
import { useStoreMode } from 'src/composables/useStoreMode'

// ❌ Remove these constants
const documentStore = useDocumentStore()
const multiDocStore = useMultiDocumentStore()
const { isUnifiedMode, isDualWriteMode } = useStoreMode()

// ❌ Remove conditional logic
if (isUnifiedMode.value || isDualWriteMode.value) {
  // Use unified store
  document = unifiedStore.toDocument()
} else {
  // Use legacy store
  document = documentStore.toDocument()
}

// ✅ Replace with direct unified store usage
document = unifiedStore.toDocument()
```

## Quick Reference: Search & Replace Patterns

### Pattern 1: Remove Legacy Store Imports
**Search for:**
```
import.*useDocumentStore.*from
import.*useMultiDocumentStore.*from
import.*useStoreMode.*from
```

### Pattern 2: Remove Store Constants
**Search for:**
```
const documentStore = useDocumentStore()
const multiDocStore = useMultiDocumentStore()
const { isUnifiedMode, isDualWriteMode } = useStoreMode()
```

### Pattern 3: Remove Conditional Store Logic
**Search for:**
```
if (isUnifiedMode.value
if (isDualWriteMode.value
isUnifiedMode.value ||
isDualWriteMode.value
```

### Pattern 4: Direct Store Usage
**Replace:**
- `documentStore.toDocument()` → `unifiedStore.toDocument()`
- `documentStore.markClean()` → `unifiedStore.markClean(activeDocumentId)`
- `documentStore.nodes` → `unifiedStore.activeDocument?.nodes`
- `documentStore.selectedNodeIds` → `unifiedStore.getSelectedNodeIds()`

## Benefits

- ✅ **~2000+ lines removed** - Simpler codebase
- ✅ **No dual-write overhead** - Better performance
- ✅ **Single source of truth** - Easier maintenance
- ✅ **No conditional logic** - Cleaner code
- ✅ **Smaller bundle size** - Faster load times
- ✅ **Cleaner console** - No migration logs

## Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking changes | Create backup branch before starting |
| Missed references | Use TypeScript compiler + linter to find issues |
| Runtime errors | Thorough testing after each change |
| Hard to rollback | Commit frequently with clear messages |

## Execution Plan

### Phase 1: Preparation (15 min)
1. Create backup branch: `git checkout -b backup-before-cleanup`
2. Create working branch: `git checkout -b cleanup-legacy-stores`
3. Review this document and checklist

### Phase 2: Update Components (2-3 hours)
1. Start with simple files (D3ConceptMapPanel)
2. Update file operations (FileOperationsModal, useAutosave)
3. Update layout components (MainLayout, DockviewLayout, FilePanel)
4. Update view components (OutlineView, WriterView, MindmapView)
5. Test after each file update

### Phase 3: Clean Up Stores (30 min)
1. Update unifiedDocumentStore.ts (remove migration code)
2. Update index.ts (remove exports)
3. Delete 4 legacy files
4. Run TypeScript compiler

### Phase 4: Testing (1-2 hours)
1. Run application
2. Test all views
3. Test all operations
4. Check console for errors
5. Verify no legacy store references

### Phase 5: Finalize (30 min)
1. Update documentation
2. Clean up localStorage
3. Commit changes
4. Create PR

## Success Criteria

- ✅ No TypeScript errors
- ✅ No console errors
- ✅ All views work correctly
- ✅ All operations work correctly
- ✅ No references to legacy stores
- ✅ Tests pass (if any)

## Next Steps

1. Review the detailed plan: `002H-LEGACY-STORE-CLEANUP-PLAN.md`
2. Use the checklist: `002H-CLEANUP-CHECKLIST.md`
3. Execute the cleanup
4. Test thoroughly
5. Commit and create PR

## Estimated Time: 4-6 hours

Good luck! 🚀

