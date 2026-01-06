# Session 3: Update VaultTree.vue - Detailed Implementation Plan

## 🎯 Overview

This document provides the detailed implementation plan for Session 3: Update VaultTree.vue, focusing on refactoring the VaultTree component to use VaultStore instead of composables.

## 📋 Current State Analysis

### Current VaultTree.vue Dependencies

The current implementation uses:
- `useVault()` composable for vault operations
- `useFileSystem()` composable for file system operations
- Local `vaultEmitter` event system for child component communication
- Manual tree building logic in `buildTreeFromVault()`
- Manual state management and reactivity

### Current VaultTree.vue Structure

```mermaid
graph TD
    A[VaultTree.vue] --> B[useVault composable]
    A --> C[useFileSystem composable]
    A --> D[vaultEmitter (local events)]
    A --> E[Manual tree building]
    A --> F[Manual state management]
```

### Target VaultTree.vue Structure

```mermaid
graph TD
    A[VaultTree.vue] --> B[useVaultStore (Pinia store)]
    A --> C[eventBus (global events)]
    A --> D[Reactive store properties]
    A --> E[Automatic reactivity]
```

## 🔧 Implementation Steps

### Step 1: Replace Composables with Store

**Location**: `src/features/vault/components/VaultTree.vue`, lines 63-64

**Changes**:
```typescript
// Remove these imports
import { useVault } from 'src/composables/useVault'
import { useFileSystem } from 'src/composables/useFileSystem'

// Add this import
import { useVaultStore } from 'src/core/stores/vaultStore'
```

**Replace service usage**:
```typescript
// Remove these
const vaultService = useVault()
const fileSystemService = useFileSystem()

// Add this
const vaultStore = useVaultStore()
```

### Step 2: Remove Local Event Emitter

**Location**: `src/features/vault/components/VaultTree.vue`, lines 96-130

**Changes**:
```typescript
// Remove the entire vaultEmitter implementation
// Remove these provide() calls
provide('vaultEmitter', vaultEmitter)
provide('updateLocalTreeItemData', updateLocalTreeItemData)

// Add eventBus import
import { eventBus } from 'src/core/events'
```

**Replace event handling**:
```typescript
// Remove vaultEmitter event listeners
vaultEmitter.on('toggle-folder', (payload) => { ... })
vaultEmitter.on('refresh-tree', () => { ... })

// Add eventBus listeners
onMounted(() => {
  eventBus.on('vault:structure-refreshed', handleStructureRefresh)
  eventBus.on('vault:item-renamed', handleItemRenamed)
  eventBus.on('vault:item-deleted', handleItemDeleted)
  eventBus.on('vault:item-moved', handleItemMoved)
})

onUnmounted(() => {
  eventBus.off('vault:structure-refreshed', handleStructureRefresh)
  eventBus.off('vault:item-renamed', handleItemRenamed)
  eventBus.off('vault:item-deleted', handleItemDeleted)
  eventBus.off('vault:item-moved', handleItemMoved)
})
```

### Step 3: Update buildTreeFromVault()

**Location**: `src/features/vault/components/VaultTree.vue`, lines 146-209

**Changes**:
```typescript
/**
 * Build tree structure from vault store
 */
async function buildTreeFromVault() {
  try {
    // Use store methods instead of composables
    await vaultStore.loadAllVaults()
    
    const vaults = vaultStore.vaults
    const activeVault = vaultStore.activeVault
    
    // If no vaults exist, show empty state
    if (vaults.length === 0) {
      treeData.value = []
      return
    }
    
    // If no active vault, use the first vault
    let vaultToUse = activeVault
    if (!vaultToUse && vaults.length > 0) {
      const firstVault = vaults[0]
      if (firstVault) {
        vaultToUse = firstVault
        await vaultStore.activateVault(firstVault.id)
      }
    }
    
    if (!vaultToUse) {
      treeData.value = []
      return
    }
    
    // Get the complete vault structure from store
    await vaultStore.loadVaultStructure()
    const vaultStructure = vaultStore.vaultStructure
    
    // Build tree items (same logic but using store data)
    const buildTreeItems = (items: FileSystemItem[]): VaultTreeItem[] => {
      return items.map(item => ({
        id: item.id,
        text: item.name,
        item: item,
        type: item.type === 'file' ? 'file' : 'folder',
        children: item.children ? buildTreeItems(item.children.map(childId =>
          vaultStructure.find(i => i.id === childId)!
        ).filter(Boolean)) : [],
        stat: {
          children: { length: item.children ? item.children.length : 0 },
          open: false
        }
      }))
    }
    
    // Find root items (items with null parentId)
    const rootItems = vaultStructure.filter(item => item.parentId === null)
    
    treeData.value = buildTreeItems(rootItems)
    
  } catch (error) {
    console.error('Failed to build vault tree:', error)
    $q.notify({
      type: 'error',
      message: 'Failed to load vault structure',
      timeout: 3000
    })
    treeData.value = []
  }
}
```

### Step 4: Update Action Handlers

**Location**: `src/features/vault/components/VaultTree.vue`, lines 315-438

**Changes**:

**addFileToRoot()**:
```typescript
async function addFileToRoot() {
  try {
    await vaultStore.loadAllVaults()
    const activeVault = vaultStore.activeVault
    if (!activeVault) {
      $q.notify({ type: 'warning', message: 'No active vault', timeout: 2000 })
      return
    }
    
    // Create a minimal document for the new file
    const newDocument: MindpadDocument = {
      version: '1.0',
      metadata: {
        id: `file-${Date.now()}`,
        name: 'New File',
        created: Date.now(),
        modified: Date.now(),
        vaultId: activeVault.id,
        tags: [],
        nodeCount: 0,
        edgeCount: 0,
        maxDepth: 0,
        searchableText: ''
      },
      nodes: [],
      edges: [],
      interMapLinks: [],
      layout: {
        activeView: 'mindmap' as const,
        orientationMode: 'clockwise' as const,
        lodEnabled: true,
        lodThresholds: [10, 30, 50, 70, 90],
        horizontalSpacing: 200,
        verticalSpacing: 150
      }
    }
    
    // Use store method instead of composable
    await vaultStore.createNewFile(null, 'New File', newDocument)
    
    $q.notify({ type: 'positive', message: 'File created', timeout: 2000 })
  } catch (error) {
    console.error('Failed to create file:', error)
    $q.notify({ type: 'error', message: 'Failed to create file', timeout: 3000 })
  }
}
```

**addFolderToRoot()**:
```typescript
async function addFolderToRoot() {
  try {
    await vaultStore.loadAllVaults()
    const activeVault = vaultStore.activeVault
    if (!activeVault) {
      $q.notify({ type: 'warning', message: 'No active vault', timeout: 2000 })
      return
    }
    
    // Use store method instead of composable
    await vaultStore.createNewFolder(null, 'New Folder')
    
    $q.notify({ type: 'positive', message: 'Folder created', timeout: 2000 })
  } catch (error) {
    console.error('Failed to create folder:', error)
    $q.notify({ type: 'error', message: 'Failed to create folder', timeout: 3000 })
  }
}
```

**handleNewVault()**:
```typescript
async function handleNewVault() {
  try {
    const vaultName = prompt('Enter vault name:', 'My Vault')
    if (!vaultName) return
    
    // Use store method instead of composable
    await vaultStore.createNewVault(vaultName, 'New vault')
    
    $q.notify({ type: 'positive', message: 'Vault created', timeout: 2000 })
  } catch (error) {
    console.error('Failed to create vault:', error)
    $q.notify({ type: 'error', message: 'Failed to create vault', timeout: 3000 })
  }
}
```

**handleDeleteVault()**:
```typescript
async function handleDeleteVault() {
  try {
    await vaultStore.loadAllVaults()
    const activeVault = vaultStore.activeVault
    if (!activeVault) {
      $q.notify({ type: 'warning', message: 'No active vault', timeout: 2000 })
      return
    }
    
    const confirm = window.confirm(`Delete vault "${activeVault.name}"? This cannot be undone.`)
    if (!confirm) return
    
    // Use store method instead of composable
    await vaultStore.deleteExistingVault(activeVault.id)
    
    $q.notify({ type: 'positive', message: 'Vault deleted', timeout: 2000 })
  } catch (error) {
    console.error('Failed to delete vault:', error)
    $q.notify({ type: 'error', message: 'Failed to delete vault', timeout: 3000 })
  }
}
```

### Step 5: Add Event Listeners

**Location**: `src/features/vault/components/VaultTree.vue`, around lines 487-495

**Changes**:
```typescript
// Add event handlers for vault events
function handleStructureRefresh(payload: VaultStructureRefreshedPayload) {
  if (payload.source !== 'vault-tree') {
    void buildTreeFromVault()
  }
}

function handleItemRenamed(payload: ItemRenamedPayload) {
  if (payload.source !== 'vault-tree') {
    // Update local tree data if needed
    // The store should already have the updated data
    void buildTreeFromVault()
  }
}

function handleItemDeleted(payload: ItemDeletedPayload) {
  if (payload.source !== 'vault-tree') {
    // Remove deleted items from local tree
    // The store should already have the updated data
    void buildTreeFromVault()
  }
}

function handleItemMoved(payload: ItemMovedPayload) {
  if (payload.source !== 'vault-tree') {
    // Update item positions in local tree
    // The store should already have the updated data
    void buildTreeFromVault()
  }
}

// Update onMounted to include event listeners
onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeydown)
  
  // Add vault event listeners
  eventBus.on('vault:structure-refreshed', handleStructureRefresh)
  eventBus.on('vault:item-renamed', handleItemRenamed)
  eventBus.on('vault:item-deleted', handleItemDeleted)
  eventBus.on('vault:item-moved', handleItemMoved)
  
  void buildTreeFromVault()
})

// Update onUnmounted to clean up event listeners
onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown)
  
  // Clean up vault event listeners
  eventBus.off('vault:structure-refreshed', handleStructureRefresh)
  eventBus.off('vault:item-renamed', handleItemRenamed)
  eventBus.off('vault:item-deleted', handleItemDeleted)
  eventBus.off('vault:item-moved', handleItemMoved)
})
```

### Step 6: Update Watchers

**Location**: `src/features/vault/components/VaultTree.vue`, lines 497-500

**Changes**:
```typescript
// Remove the fileSystemService watcher
// watch(() => fileSystemService.vaultStructure, () => {
//   void buildTreeFromVault()
// }, { deep: true })

// Add watcher for store reactive properties
watch(() => vaultStore.vaultRevision, () => {
  void buildTreeFromVault()
}, { immediate: false })

// Watch for active vault changes
watch(() => vaultStore.activeVault, (newVault) => {
  if (newVault) {
    void buildTreeFromVault()
  }
}, { immediate: false })
```

## 🧪 Testing Strategy

### Test Cases to Verify

1. **Initial Load**: VaultTree loads and displays vault structure correctly
2. **Create File**: File creation works and tree updates automatically
3. **Create Folder**: Folder creation works and tree updates automatically
4. **Create Vault**: Vault creation works and tree updates automatically
5. **Delete Vault**: Vault deletion works and tree updates automatically
6. **Event Flow**: Events are properly emitted and handled
7. **Reactivity**: Tree updates automatically when store changes
8. **Error Handling**: Errors are properly displayed to user

### Manual Testing Steps

1. Open the application and verify VaultTree loads
2. Create a new vault and verify it appears in the tree
3. Create files and folders and verify they appear
4. Rename items and verify changes are reflected
5. Delete items and verify they are removed
6. Switch between vaults and verify structure updates
7. Check console for any errors

## 🔍 Verification Checklist

- [ ] Composables replaced with VaultStore
- [ ] Local event emitter removed
- [ ] EventBus used for event handling
- [ ] buildTreeFromVault() uses store state
- [ ] Action handlers use store methods
- [ ] Event listeners added for vault events
- [ ] Watchers updated to use store reactive properties
- [ ] All functionality works as expected
- [ ] No console errors
- [ ] Proper error handling

## 📊 Expected Outcomes

1. **Cleaner Code**: No more composable dependencies
2. **Event-Driven Updates**: Automatic reactivity through events
3. **Consistency**: Follows the same pattern as other components
4. **Maintainability**: Easier to understand and modify
5. **Performance**: Better reactivity and state management

## 🎯 Next Steps

After completing Session 3:
1. Proceed to Session 4: Update VaultTreeItem.vue
2. Update VaultTreeItem to use VaultStore
3. Remove injected dependencies
4. Test integration between components

**Plan Version**: 1.0
**Last Updated**: 2025-12-30
**Author**: AI Assistant