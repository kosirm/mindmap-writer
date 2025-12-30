# VaultStore Implementation Plan - Session Breakdown

## 📋 Overview

This document provides a detailed, session-by-session breakdown for implementing the VaultStore upgrade. Each session is designed to be completed in a single focused work period.

## 🎯 Session 1: Event Bus Setup (1-2 hours)

### Objective
Add vault-specific events to the event bus system following the existing pattern.

### Tasks
1. **Add EventSource types for vault operations**
   - Add `'vault-tree'`, `'vault-tree-item'`, `'vault-toolbar'` to EventSource type
   - File: `src/core/events/index.ts`

2. **Define vault event payload interfaces**
   - VaultLoadedPayload, VaultCreatedPayload, VaultActivatedPayload
   - FileCreatedPayload, FolderCreatedPayload
   - ItemRenamedPayload, ItemDeletedPayload, ItemMovedPayload
   - VaultStructureRefreshedPayload, VaultErrorPayload
   - File: `src/core/events/index.ts`

3. **Add VaultEvents type definition**
   - Define all vault event types and their payloads
   - Update Events type to include VaultEvents
   - File: `src/core/events/index.ts`

### Expected Outcome
- Event bus is ready to handle vault-related events
- All event types are properly typed and documented
- No breaking changes to existing functionality

## 🎯 Session 2: VaultStore Implementation (2-3 hours)

### Objective
Create the centralized VaultStore following the unifiedDocumentStore pattern.

### Tasks
1. **Create VaultStore file**
   - File: `src/core/stores/vaultStore.ts`
   - Follow Pinia store pattern with defineStore

2. **Define state**
   - vaults: VaultMetadata[]
   - activeVault: VaultMetadata | null
   - vaultStructure: FileSystemItem[]
   - selectedItems: Set<string>
   - isLoading: boolean
   - error: string | null
   - vaultRevision: number

3. **Add computed properties**
   - hasVaults, hasActiveVault
   - rootFiles, rootFolders
   - allFiles, allFolders
   - hasItems

4. **Implement vault operations**
   - loadAllVaults()
   - loadVaultStructure()
   - activateVault()
   - createNewVault()
   - deleteExistingVault()
   - renameExistingVault()

5. **Implement file/folder operations**
   - createNewFile()
   - createNewFolder()
   - renameExistingItem()
   - deleteExistingItem()
   - moveExistingItem()

6. **Implement selection operations**
   - selectItem()
   - toggleItemSelection()
   - isItemSelected()

7. **Add helper functions**
   - getDescendantIds()
   - findItem()
   - checkItemExists()

8. **Export store from index**
   - Add export to `src/core/stores/index.ts`

### Expected Outcome
- Complete VaultStore implementation
- All operations emit appropriate events
- Store follows the same pattern as unifiedDocumentStore
- Proper error handling and loading states

## 🎯 Session 3: Update VaultTree.vue (2-3 hours)

### Objective
Refactor VaultTree component to use VaultStore instead of composables.

### Tasks
1. **Replace composables with store**
   - Remove `useVault()` and `useFileSystem()` imports
   - Import and use `useVaultStore()`

2. **Remove local event emitter**
   - Remove vaultEmitter implementation
   - Remove provide() calls
   - Replace with eventBus imports

3. **Update buildTreeFromVault()**
   - Use store state instead of composable state
   - Remove manual tree building logic
   - Use reactive store properties

4. **Update action handlers**
   - addFileToRoot() - use store.createNewFile()
   - addFolderToRoot() - use store.createNewFolder()
   - handleNewVault() - use store.createNewVault()
   - handleDeleteVault() - use store.deleteExistingVault()

5. **Add event listeners**
   - Listen to vault:structure-refreshed
   - Listen to item:renamed, item:deleted, etc.
   - Clean up listeners on unmount

6. **Update watchers**
   - Replace fileSystemService watcher
   - Use store reactive properties

### Expected Outcome
- VaultTree uses VaultStore for all operations
- No more composable dependencies
- Event-driven updates instead of manual refreshes
- Cleaner, more maintainable code

## 🎯 Session 4: Update VaultTreeItem.vue (1-2 hours)

### Objective
Refactor VaultTreeItem to use VaultStore and remove injected dependencies.

### Tasks
1. **Replace composables with store**
   - Remove useFileSystem() import
   - Import useVaultStore()

2. **Remove injected dependencies**
   - Remove vaultEmitter inject
   - Remove updateLocalTreeItemData inject
   - Use eventBus directly

3. **Update renameItem()**
   - Use store.renameExistingItem()
   - Remove manual state updates
   - Remove updateLocalTreeItemData calls

4. **Update event listeners**
   - Replace vaultEmitter.on() with eventBus.on()
   - Listen to item:renamed events
   - Clean up on unmount

5. **Update toggleFolder()**
   - Emit through eventBus instead of vaultEmitter

### Expected Outcome
- VaultTreeItem uses VaultStore
- No injected dependencies
- Clean event handling
- Automatic reactivity through store

## 🎯 Session 5: Update VaultToolbar.vue (1 hour)

### Objective
Refactor VaultToolbar to use VaultStore for actions and state.

### Tasks
1. **Replace composables with store**
   - Remove any composable imports
   - Import useVaultStore()

2. **Update action handlers**
   - Use store methods instead of emits
   - handleAddFile() - use store.createNewFile()
   - handleAddFolder() - use store.createNewFolder()

3. **Update computed properties**
   - Use store.activeVault instead of composables
   - Use store.hasVaults, etc.

### Expected Outcome
- VaultToolbar uses VaultStore
- Direct store method calls
- Clean, type-safe implementation

## 🎯 Session 6: Deprecate Composables (1 hour)

### Objective
Mark old composables as deprecated and create migration guide.

### Tasks
1. **Add deprecation notices**
   - Add JSDoc @deprecated tags to useVault.ts
   - Add migration examples
   - Add deprecation notice to useFileSystem.ts

2. **Create migration guide**
   - Document in VAULT_STORE_IMPLEMENTATION.md
   - Provide before/after examples
   - List breaking changes

3. **Update documentation**
   - Add migration section to README
   - Update any tutorials or guides

### Expected Outcome
- Clear deprecation path
- Migration documentation
- No breaking changes yet (grace period)

## 🎯 Session 7: Testing (2-3 hours)

### Objective
Comprehensive testing of the new VaultStore implementation.

### Tasks
1. **Write unit tests**
   - Create vaultStore.spec.ts
   - Test vault operations
   - Test file/folder operations
   - Test event emission
   - Test error handling

2. **Integration testing**
   - Test full workflow: create vault → create file → rename → delete
   - Verify event flow between components
   - Test reactivity and state updates

3. **Manual testing**
   - Create vaults through UI
   - Create files and folders
   - Rename and delete items
   - Test drag-and-drop
   - Verify no console errors
   - Check performance improvements

### Expected Outcome
- All tests passing
- No regressions
- Improved performance metrics
- Ready for production

## 🎯 Session 8: Final Validation (1 hour)

### Objective
Final review and validation before deployment.

### Tasks
1. **Code review**
   - Check for consistency with unifiedDocumentStore pattern
   - Verify proper error handling
   - Ensure all events are properly typed

2. **Performance testing**
   - Measure memory usage improvements
   - Count IndexedDB query reductions
   - Verify reactivity performance

3. **Documentation finalization**
   - Update all documentation
   - Add implementation notes
   - Create troubleshooting guide

4. **Deployment checklist**
   - Backup current implementation
   - Create rollback plan
   - Schedule deployment

### Expected Outcome
- Production-ready implementation
- Complete documentation
- Confidence in deployment

## 📊 Implementation Timeline

| Session | Focus Area | Estimated Time | Priority |
|---------|------------|----------------|----------|
| 1 | Event Bus Setup | 1-2 hours | High |
| 2 | VaultStore Implementation | 2-3 hours | High |
| 3 | VaultTree Refactoring | 2-3 hours | High |
| 4 | VaultTreeItem Refactoring | 1-2 hours | High |
| 5 | VaultToolbar Refactoring | 1 hour | Medium |
| 6 | Composables Deprecation | 1 hour | Low |
| 7 | Testing | 2-3 hours | Critical |
| 8 | Final Validation | 1 hour | Critical |

**Total Estimated Time:** 11-17 hours

## 🎯 Success Criteria

1. **All components use VaultStore**
2. **No composable dependencies in vault components**
3. **All events properly typed and emitted**
4. **Unit tests passing**
5. **Integration tests passing**
6. **Manual testing complete**
7. **Performance improvements measured**
8. **Documentation complete**

## 📝 Notes

- Each session should be completed before starting the next
- Test after each session to catch issues early
- Document any challenges or deviations from plan
- Keep stakeholders informed of progress
- Celebrate milestones! 🎉

**Plan Version:** 1.0
**Last Updated:** 2025-12-30
**Author:** AI Assistant