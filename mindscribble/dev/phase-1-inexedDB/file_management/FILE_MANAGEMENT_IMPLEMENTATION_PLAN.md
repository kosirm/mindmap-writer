# File Management Component Implementation Plan

## 🎯 Overview

This document outlines the implementation plan for the new file management component that will replace the current Google Drive-based file operations with IndexedDB-based vault management. The implementation will include:

1. **IndexedDB Initialization** - Proper setup and initialization of the IndexedDB database
2. **Vault Management** - Create, open, delete vaults
3. **File/Folder Management** - Add, organize, and manage files and folders within vaults
4. **Tree-based UI** - Reuse the OutlineView component structure for vault/file/folder hierarchy
5. **Drag-and-Drop** - Enhanced drag-and-drop with proper validation

## 🔍 Current State Analysis

### Issues Identified

1. **IndexedDB Not Initialized**: The `MindScribbleDB` singleton is created but never opened, so it doesn't appear in Chrome DevTools
2. **Google Drive Dependency**: Current file operations work exclusively with Google Drive
3. **Limited File Management**: No folder structure or vault concept
4. **No IndexedDB Operations**: File operations don't use the implemented IndexedDB service

### Current Components

- `FileManagement.vue` - Current file management drawer with Google Drive operations
- `FileOperationsModal.vue` - Modal for file operations (save, open, manage)
- `OutlineView.vue` - Tree component that will be reused for vault/file/folder structure
- `indexedDBService.ts` - Dexie-based IndexedDB service (not initialized)
- `useIndexedDB.ts` - Composable for IndexedDB operations (not used)

## 🚀 Implementation Plan

### Phase 1: IndexedDB Initialization (Critical Fix)

**Objective**: Initialize IndexedDB on app startup so it appears in Chrome DevTools and is ready for use.

**Tasks**:
1. **Create IndexedDB Boot File** (`src/boot/indexedDB.ts`)
   - Open the database connection on app startup
   - Handle version upgrades and migrations
   - Initialize default vault if none exists
   - Register in `quasar.config.ts`

2. **Update App Initialization**
   - Ensure IndexedDB is ready before app components mount
   - Add loading state for IndexedDB initialization
   - Handle initialization errors gracefully

**Files to Create/Modify**:
- `src/boot/indexedDB.ts` (new)
- `quasar.config.ts` (add to boot array)
- `src/core/stores/appStore.ts` (add initialization state)

**Estimated Time**: 1-2 hours

### Phase 2: Vault Management Service

**Objective**: Create services for vault operations (create, open, delete, switch).

**Tasks**:
1. **Create Vault Service** (`src/core/services/vaultService.ts`)
   - `createVault(name, description)` - Create new vault
   - `openVault(vaultId)` - Open existing vault
   - `deleteVault(vaultId)` - Delete vault
   - `getAllVaults()` - List all vaults
   - `getActiveVault()` - Get current active vault
   - `setActiveVault(vaultId)` - Switch active vault

2. **Create Vault Composable** (`src/composables/useVault.ts`)
   - Reactive vault operations
   - Integration with IndexedDB
   - State management

**Files to Create/Modify**:
- `src/core/services/vaultService.ts` (new)
- `src/composables/useVault.ts` (new)
- `src/core/services/index.ts` (export new service)

**Estimated Time**: 2-3 hours

### Phase 3: File/Folder Management Service

**Objective**: Create services for file and folder operations within vaults.

**Tasks**:
1. **Create File System Service** (`src/core/services/fileSystemService.ts`)
   - `createFile(parentId, name, content)` - Create new file
   - `createFolder(parentId, name)` - Create new folder
   - `deleteItem(itemId)` - Delete file or folder
   - `renameItem(itemId, newName)` - Rename file or folder
   - `moveItem(itemId, newParentId)` - Move file or folder
   - `getVaultStructure(vaultId)` - Get complete vault structure

2. **Create File System Composable** (`src/composables/useFileSystem.ts`)
   - Reactive file system operations
   - Tree structure management
   - Integration with IndexedDB

**Files to Create/Modify**:
- `src/core/services/fileSystemService.ts` (new)
- `src/composables/useFileSystem.ts` (new)
- `src/core/services/index.ts` (export new service)

**Estimated Time**: 3-4 hours

### Phase 4: VaultTree Component (Based on OutlineView)

**Objective**: Create a tree component for visualizing and managing vaults, folders, and files.

**Tasks**:
1. **Create VaultTree Component** (`src/features/vault/components/VaultTree.vue`)
   - Base structure on `OutlineView.vue`
   - Replace node operations with vault/file/folder operations
   - Add file/folder icons
   - Implement custom toolbar with "Add File" and "Add Folder" buttons

2. **Create VaultTreeItem Component** (`src/features/vault/components/VaultTreeItem.vue`)
   - Custom item rendering for files vs folders
   - Different icons and context menus
   - Drag-and-drop indicators

3. **Create VaultToolbar Component** (`src/features/vault/components/VaultToolbar.vue`)
   - Vault operations (New Vault, Open Vault, Delete Vault)
   - File operations (Add File, Add Folder)
   - View controls (Expand All, Collapse All)

**Files to Create/Modify**:
- `src/features/vault/components/VaultTree.vue` (new)
- `src/features/vault/components/VaultTreeItem.vue` (new)
- `src/features/vault/components/VaultToolbar.vue` (new)
- `src/features/vault/index.ts` (new)

**Estimated Time**: 4-5 hours

### Phase 5: Enhanced Drag-and-Drop with Validation

**Objective**: Implement drag-and-drop with proper validation rules.

**Tasks**:
1. **Implement Validation Rules**
   - Files cannot be dropped into other files (only folders)
   - Vaults cannot be moved (root level only)
   - Folders can contain files and other folders
   - Prevent circular references

2. **Create Drag-and-Drop Service** (`src/core/services/dragDropService.ts`)
   - `validateDrop(targetId, sourceId)` - Validate drop operation
   - `handleDrop(targetId, sourceId)` - Execute drop operation
   - `getDropTargetType(itemId)` - Determine if item is file, folder, or vault

3. **Update VaultTree Component**
   - Integrate drag-and-drop validation
   - Visual feedback for valid/invalid drops
   - Custom drop indicators

**Files to Create/Modify**:
- `src/core/services/dragDropService.ts` (new)
- `src/features/vault/components/VaultTree.vue` (update)

**Estimated Time**: 2-3 hours

### Phase 6: Update FileManagement Component

**Objective**: Replace current Google Drive operations with new vault-based file management.

**Tasks**:
1. **Update FileManagement.vue**
   - Replace Google Drive operations with vault operations
   - Integrate VaultTree component
   - Update UI for vault-based workflow
   - Add vault selector/manager

2. **Update FileOperationsModal.vue**
   - Replace Google Drive file listing with vault-based file listing
   - Update save/open operations to work with IndexedDB
   - Add folder navigation

**Files to Create/Modify**:
- `src/shared/components/FileManagement.vue` (update)
- `src/shared/components/FileOperationsModal.vue` (update)

**Estimated Time**: 2-3 hours

### Phase 7: Integration with Existing Systems

**Objective**: Ensure new file management integrates with existing app systems.

**Tasks**:
1. **Update Unified Document Store**
   - Add vault awareness
   - Update document loading/saving to use IndexedDB
   - Maintain backward compatibility

2. **Update Command System**
   - Add vault-related commands
   - Update file operations commands
   - Ensure command palette works with new system

3. **Update Sync Manager**
   - Add IndexedDB ↔ Google Drive sync
   - Implement partial sync for vaults
   - Handle conflict resolution

**Files to Create/Modify**:
- `src/core/stores/unifiedDocumentStore.ts` (update)
- `src/core/commands/definitions/fileCommands.ts` (update)
- `src/core/services/syncManager.ts` (update)

**Estimated Time**: 3-4 hours

### Phase 8: Testing and Validation

**Objective**: Comprehensive testing of all file management functionality.

**Tasks**:
1. **Manual Testing Plan**
   - IndexedDB initialization and visibility
   - Vault creation, opening, deletion
   - File/folder creation, renaming, moving
   - Drag-and-drop validation
   - Integration with existing features

2. **Automated Testing**
   - Unit tests for services
   - Component tests for UI
   - Integration tests for workflows

3. **Performance Testing**
   - Large vault performance
   - Memory usage
   - Sync performance

**Files to Create/Modify**:
- `mindscribble/dev/phase-1-inexedDB/__TESTING.md` (update)
- Test files as needed

**Estimated Time**: 2-3 hours

## 📋 Detailed Component Structure

### VaultTree Component Structure

```
VaultTree
├── VaultToolbar
│   ├── VaultOperations (New/Open/Delete Vault)
│   ├── FileOperations (Add File/Add Folder)
│   └── ViewControls (Expand/Collapse All)
│
├── VaultTreeContainer
│   ├── VaultTreeItem (Root Vault)
│   │   ├── VaultTreeItem (Folder)
│   │   │   ├── VaultTreeItem (File)
│   │   │   └── VaultTreeItem (Folder)
│   │   └── VaultTreeItem (File)
│   └── VaultTreeItem (Folder)
│
└── VaultContextMenu
    ├── VaultActions (Rename, Delete, Properties)
    ├── FolderActions (Rename, Delete, New File, New Folder)
    └── FileActions (Rename, Delete, Open, Properties)
```

### Data Flow

```
User Interaction → VaultTree Component → VaultService/FileSystemService → IndexedDB → UI Update
```

## 🎯 Key Design Decisions

### 1. IndexedDB Initialization
- **Boot File Approach**: Initialize IndexedDB during app boot phase
- **Graceful Degradation**: Handle initialization errors without breaking app
- **Version Management**: Automatic schema upgrades via Dexie

### 2. Vault Management
- **Single Active Vault**: Only one vault active at a time
- **Central Index**: Track all vaults in `centralIndex` table
- **Metadata Storage**: Individual vault metadata in `vaultMetadata` table

### 3. File System Structure
- **Tree Hierarchy**: Vault → Folders → Files
- **Type Differentiation**: Files vs folders with different behaviors
- **Validation Rules**: Strict rules for drag-and-drop operations

### 4. UI/UX
- **Reuse Existing Components**: Base VaultTree on OutlineView for consistency
- **Visual Feedback**: Clear indicators for valid/invalid operations
- **Keyboard Support**: Full keyboard navigation and operations

### 5. Integration Strategy
- **Incremental Migration**: Keep Google Drive operations for now
- **Dual Storage**: IndexedDB as primary, Google Drive as backup/sync
- **Backward Compatibility**: Support existing document formats

## 📊 Implementation Timeline

| Phase | Task | Estimated Time | Priority |
|-------|------|----------------|----------|
| 1 | IndexedDB Initialization | 1-2 hours | Critical |
| 2 | Vault Management Service | 2-3 hours | High |
| 3 | File/Folder Management Service | 3-4 hours | High |
| 4 | VaultTree Component | 4-5 hours | High |
| 5 | Enhanced Drag-and-Drop | 2-3 hours | Medium |
| 6 | Update FileManagement Component | 2-3 hours | Medium |
| 7 | Integration with Existing Systems | 3-4 hours | High |
| 8 | Testing and Validation | 2-3 hours | Critical |

**Total Estimated Time**: 19-25 hours

## ✅ Success Criteria

### IndexedDB Initialization
- [ ] IndexedDB appears in Chrome DevTools Application tab
- [ ] Database is initialized on app startup
- [ ] Default vault is created if none exists
- [ ] Error handling works gracefully

### Vault Management
- [ ] Can create, open, delete, and switch vaults
- [ ] Vault metadata is properly stored
- [ ] Only one vault is active at a time
- [ ] Vault operations are fast and responsive

### File/Folder Management
- [ ] Can create, rename, move, and delete files/folders
- [ ] Tree structure is properly maintained
- [ ] File operations integrate with document store
- [ ] Folder operations maintain hierarchy

### Drag-and-Drop
- [ ] Files can only be dropped into folders
- [ ] Folders can contain files and other folders
- [ ] Vaults cannot be moved (root level only)
- [ ] Visual feedback for valid/invalid operations
- [ ] No circular references possible

### Integration
- [ ] File management works with existing document operations
- [ ] Command system includes vault operations
- [ ] Sync manager handles IndexedDB ↔ Google Drive sync
- [ ] No breaking changes to existing functionality

### Testing
- [ ] All manual tests pass
- [ ] IndexedDB operations are reliable
- [ ] Performance is acceptable with large vaults
- [ ] Error handling works correctly

## 🔮 Next Steps

1. **Review this implementation plan**
2. **Prioritize phases based on immediate needs**
3. **Start with Phase 1 (IndexedDB Initialization) - Critical for testing**
4. **Proceed to Phase 2-4 (Core functionality)**
5. **Complete with Phase 5-8 (Enhancements and integration)**

**Recommendation**: Start with Phase 1 immediately to resolve the IndexedDB visibility issue, then proceed with the core file management functionality.