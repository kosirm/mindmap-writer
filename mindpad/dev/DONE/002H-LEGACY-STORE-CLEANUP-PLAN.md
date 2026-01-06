# Legacy Store Cleanup Plan

**Date:** 2025-12-25  
**Status:** 📋 PLANNED

##Diagram
```mermaid
raph TB
    Start([Start Cleanup]) --> Backup[Create Backup Branch]
    Backup --> Branch[Create Working Branch]
    Branch --> Phase1{Phase 1: Components}
    
    Phase1 --> Simple[Update Simple Components]
    Simple --> FileOps[Update File Operations]
    FileOps --> Layouts[Update Layout Components]
    Layouts --> Views[Update View Components]
    Views --> Test1[Test After Each Update]
    
    Test1 --> Phase2{Phase 2: Stores}
    Phase2 --> Unified[Clean UnifiedDocumentStore]
    Unified --> Index[Update Store Index]
    Index --> Delete[Delete 4 Legacy Files]
    Delete --> Compile[Run TypeScript Compiler]
    
    Compile --> Phase3{Phase 3: Testing}
    Phase3 --> TestViews[Test All Views]
    TestViews --> TestOps[Test All Operations]
    TestOps --> TestConsole[Check Console]
    TestConsole --> TestRefs[Verify No Legacy Refs]
    
    TestRefs --> Pass{All Tests Pass?}
    Pass -->|Yes| Finalize[Finalize & Commit]
    Pass -->|No| Debug[Debug Issues]
    Debug --> Fix[Fix Problems]
    Fix --> TestViews
    
    Finalize --> PR[Create Pull Request]
    PR --> Done([Cleanup Complete])
    
    style Start fill:#e1f5e1
    style Done fill:#e1f5e1
    style Pass fill:#fff4e1
    style Debug fill:#ffe1e1
    style Delete fill:#ffe1e1
    style Finalize fill:#e1f5e1
```

## Overview

Now that the unified store is fully functional and all views have been migrated, we can safely remove the legacy stores (DocumentStore, MultiDocumentStore) and all related migration code (store mode toggle, synchronizer, etc.).

## Files to Delete

### 1. Legacy Store Files
- `mindpad/quasar/src/core/stores/documentStore.ts` (entire file)
- `mindpad/quasar/src/core/stores/multiDocumentStore.ts` (entire file)
- `mindpad/quasar/src/core/stores/storeSynchronizer.ts` (entire file)

### 2. Store Mode Toggle System
- `mindpad/quasar/src/composables/useStoreMode.ts` (entire file)

## Files to Update

### 1. Store Exports (`src/core/stores/index.ts`)
**Remove:**
```typescript
export { useDocumentStore } from './documentStore'
export { useMultiDocumentStore } from './multiDocumentStore'
export { useStoreSynchronizer } from './storeSynchronizer'
```

**Keep:**
```typescript
export { useAppStore } from './appStore'
export { useAuthStore } from './authStore'
export { useCommandStore } from './commandStore'
export { useContextStore } from './contextStore'
export { useGoogleDriveStore } from './googleDriveStore'
export { usePanelStore } from './panelStore'
export { useUnifiedDocumentStore } from './unifiedDocumentStore'
```

### 2. UnifiedDocumentStore (`src/core/stores/unifiedDocumentStore.ts`)
**Remove:**
- Import of `useDocumentStore` and `useMultiDocumentStore` (line 30)
- `MIGRATION_MODE` constant and all migration logging
- `logMigrationOperation()` function
- `getActiveDocumentFromLegacy()` method
- `getAllDocumentsFromLegacy()` method
- All migration-related comments

**Update:**
- Remove "Migration Strategy" section from file header comment
- Simplify header to just describe the unified store purpose

### 3. View Components

#### OutlineView (`src/features/tree/components/OutlineView.vue`)
**Remove:**
- Import of `useDocumentStore`
- Import of `useStoreMode`
- `documentStore` constant
- `isUnifiedMode` constant
- `activeStore` computed property
- All conditional logic checking `isUnifiedMode`
- Dual-write synchronization code

**Update:**
- Use `unifiedStore` directly everywhere
- Remove all `if (isUnifiedMode.value)` checks

#### OutlineNodeContent (`src/features/tree/components/OutlineNodeContent.vue`)
**Remove:**
- Import of `useDocumentStore`
- Import of `useStoreMode`
- `documentStore` constant
- `isUnifiedMode` constant
- All conditional logic checking `isUnifiedMode`

**Update:**
- Use `unifiedStore` directly everywhere

#### WriterView (`src/features/writer/components/WriterView.vue`)
**Remove:**
- Import of `useDocumentStore`
- Import of `useStoreMode`
- `documentStore` constant
- `isUnifiedMode` constant
- All conditional logic checking `isUnifiedMode`

**Update:**
- Use `unifiedStore` directly everywhere
- Simplify `buildTreeFromStore()` to only use unified store

#### WriterNodeContent (`src/features/writer/components/WriterNodeContent.vue`)
**Remove:**
- Import of `useDocumentStore`
- Import of `useStoreMode`
- `documentStore` constant
- `isUnifiedMode` constant
- All conditional logic checking `isUnifiedMode`

**Update:**
- Use `unifiedStore` directly everywhere

#### MindmapView (`src/features/canvas/composables/useMindmapIntegration.ts`)
**Remove:**
- Import of `useDocumentStore`
- Import of `useStoreMode`
- `documentStore` constant
- `isUnifiedMode` constant
- All conditional logic checking `isUnifiedMode`

**Update:**
- Use `unifiedStore` directly everywhere

### 4. File Operations

#### FileOperationsModal (`src/shared/components/FileOperationsModal.vue`)
**Remove:**
- Import of `useDocumentStore`
- Import of `useMultiDocumentStore`
- Import of `useStoreMode`
- `documentStore` constant
- `multiDocStore` constant
- `isUnifiedMode` and `isDualWriteMode` constants
- All conditional logic in `handleSave()`

**Update:**
- Use `unifiedStore.toDocument()` directly
- Use `unifiedStore.markClean()` directly
- Remove all store mode checks

#### useAutosave (`src/composables/useAutosave.ts`)
**Remove:**
- Import of `useDocumentStore`
- Import of `useStoreMode`
- `documentStore` constant
- `isUnifiedMode` and `isDualWriteMode` constants
- All conditional logic in `performAutosave()`

**Update:**
- Use `unifiedStore.toDocument()` directly
- Use `unifiedStore.markClean()` directly

#### MainLayout (`src/layouts/MainLayout.vue`)
**Remove:**
- Import of `useDocumentStore`
- Import of `useMultiDocumentStore`
- Import of `useStoreMode`
- `documentStore` constant
- `multiDocStore` constant (if not used elsewhere)
- `isUnifiedMode` and `isDualWriteMode` constants
- All conditional logic in `saveCurrentFile()`

**Update:**
- Use `unifiedStore.toDocument()` directly
- Use `unifiedStore.markClean()` directly

### 5. Layout Components

#### DockviewLayout (`src/layouts/DockviewLayout.vue`)
**Remove:**
- Import of `useDocumentStore`
- Import of `useMultiDocumentStore`
- `documentStore` constant
- `multiDocStore` constant

**Update:**
- Use `unifiedStore` for all document operations
- Update file panel creation to use unified store

#### FilePanel (`src/pages/components/FilePanel.vue`)
**Remove:**
- Import of `useDocumentStore`
- Import of `useMultiDocumentStore`
- `documentStore` constant
- `multiDocStore` constant

**Update:**
- Use `unifiedStore` for all document operations

### 6. Other Components

#### D3ConceptMapPanel (`src/pages/components/D3ConceptMapPanel.vue`)
**Remove:**
- Import of `useDocumentStore`
- `documentStore` constant

**Update:**
- Use `unifiedStore` for view switching

### 7. Dev Tools

#### DevPanel (`src/dev/DevPanel.vue`)
**Remove:**
- Store mode toggle UI (radio buttons)
- Store mode description display
- Store mode banner
- Conditional logic in "Log Store State" button

**Update:**
- Simplify "Log Store State" to only show unified store
- Remove all store mode related UI elements

## Implementation Steps

### Step 1: Remove Store Mode Checks from All Components
1. Update OutlineView.vue
2. Update OutlineNodeContent.vue
3. Update WriterView.vue
4. Update WriterNodeContent.vue
5. Update useMindmapIntegration.ts
6. Update FileOperationsModal.vue
7. Update useAutosave.ts
8. Update MainLayout.vue
9. Update DockviewLayout.vue
10. Update FilePanel.vue
11. Update D3ConceptMapPanel.vue

### Step 2: Clean Up UnifiedDocumentStore
1. Remove legacy store imports
2. Remove migration logging
3. Remove legacy compatibility methods
4. Update documentation

### Step 3: Remove Store Mode Toggle System
1. Delete useStoreMode.ts
2. Update DevPanel.vue to remove store mode UI

### Step 4: Delete Legacy Store Files
1. Delete documentStore.ts
2. Delete multiDocumentStore.ts
3. Delete storeSynchronizer.ts

### Step 5: Update Store Exports
1. Update src/core/stores/index.ts

### Step 6: Test Everything
1. Run the application
2. Test all views (Outline, Writer, Mindmap)
3. Test file operations (save, open, autosave)
4. Test node operations (create, edit, delete, move)
5. Test multi-document support
6. Verify no console errors

## Benefits

- ✅ **Simpler codebase** - Remove ~2000+ lines of legacy code
- ✅ **Better performance** - No dual-write overhead
- ✅ **Easier maintenance** - Single source of truth
- ✅ **Cleaner architecture** - No conditional store logic
- ✅ **Reduced complexity** - No store synchronization needed

## Risks

- ⚠️ **Breaking changes** - Must update all components at once
- ⚠️ **Testing required** - Need thorough testing after cleanup
- ⚠️ **No rollback** - Once deleted, can't easily revert (use git)

## Rollback Plan

If issues are discovered after cleanup:
1. Use `git revert` to restore deleted files
2. Use `git checkout` to restore modified files
3. Test with legacy stores to verify functionality
4. Debug and fix issues in unified store
5. Re-attempt cleanup

## Estimated Effort

- **Step 1-2:** ~2-3 hours (update all components)
- **Step 3-5:** ~30 minutes (delete files and update exports)
- **Step 6:** ~1-2 hours (thorough testing)
- **Total:** ~4-6 hours

## Success Criteria

- ✅ Application runs without errors
- ✅ All views work correctly
- ✅ File operations work (save, open, autosave)
- ✅ Node operations work (create, edit, delete, move)
- ✅ Multi-document support works
- ✅ No references to legacy stores in codebase
- ✅ No store mode toggle in dev tools
- ✅ Reduced bundle size
- ✅ Cleaner console logs (no migration logs)

## Notes

- Keep git history clean with meaningful commit messages
- Consider creating a backup branch before cleanup
- Update documentation to reflect new architecture
- Remove migration-related documentation files after cleanup
- Clean up localStorage (remove 'mindpad-store-mode' key)

