# Session 2: VaultStore Implementation - Detailed Plan

## 🎯 Overview

This document provides the detailed implementation plan for Session 2: VaultStore Implementation, focusing on creating the centralized VaultStore following the unifiedDocumentStore pattern.

## 📋 Current State Analysis

### Completed in Session 1
- ✅ Event bus setup with vault-specific event types
- ✅ All vault event payload interfaces defined
- ✅ VaultEvents type definition complete
- ✅ Events type includes VaultEvents

### Current Store Structure
The `unifiedDocumentStore.ts` follows this pattern:
- Uses Pinia's `defineStore()`
- State managed with `ref()` and `computed()`
- Event emission through `eventBus`
- Comprehensive error handling
- Revision counter for reactivity

## 🔧 Implementation Steps

### Step 1: Create VaultStore File

**Location**: `src/core/stores/vaultStore.ts`

**File Structure**:
```typescript
/**
 * VaultStore - Centralized vault management store
 * 
 * Manages:
 * - Vault metadata and active vault state
 * - Vault structure (files and folders)
 * - Item selection and operations
 * - Event emission for vault changes
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { eventBus, type EventSource } from '../events'
import type { VaultMetadata, FileSystemItem } from '../services/indexedDBService'
import * as vaultService from '../services/vaultService'
import * as fileSystemService from '../services/fileSystemService'
```

### Step 2: Define State

```typescript
// ============================================================
// STATE
// ============================================================

/** All vaults */
const vaults = ref<VaultMetadata[]>([])

/** Active vault */
const activeVault = ref<VaultMetadata | null>(null)

/** Vault structure (hierarchical) */
const vaultStructure = ref<FileSystemItem[]>([])

/** Selected items */
const selectedItems = ref<Set<string>>(new Set())

/** Loading state */
const isLoading = ref<boolean>(false)

/** Error state */
const error = ref<string | null>(null)

/** Revision counter for reactivity */
const vaultRevision = ref<number>(0)
```

### Step 3: Add Computed Properties

```typescript
// ============================================================
// COMPUTED PROPERTIES
// ============================================================

/** Check if any vaults exist */
const hasVaults = computed(() => vaults.value.length > 0)

/** Check if active vault exists */
const hasActiveVault = computed(() => activeVault.value !== null)

/** Get root files (files in root of vault) */
const rootFiles = computed(() => {
  return vaultStructure.value.filter(item => 
    item.type === 'file' && !item.parentId 
  )
})

/** Get root folders (folders in root of vault) */
const rootFolders = computed(() => {
  return vaultStructure.value.filter(item => 
    item.type === 'folder' && !item.parentId 
  )
})

/** Get all files in vault */
const allFiles = computed(() => {
  return vaultStructure.value.filter(item => item.type === 'file')
})

/** Get all folders in vault */
const allFolders = computed(() => {
  return vaultStructure.value.filter(item => item.type === 'folder')
})

/** Check if vault has any items */
const hasItems = computed(() => vaultStructure.value.length > 0)
```

### Step 4: Implement Vault Operations

```typescript
// ============================================================
// VAULT OPERATIONS
// ============================================================

/**
 * Load all vaults from database
 */
async function loadAllVaults() {
  try {
    isLoading.value = true
    error.value = null
    
    const loadedVaults = await vaultService.getAllVaults()
    vaults.value = loadedVaults
    
    // Set active vault if available
    const active = await vaultService.getActiveVault()
    if (active) {
      activeVault.value = active
    } else if (loadedVaults.length > 0) {
      // Set first vault as active if no active vault
      await activateVault(loadedVaults[0].id)
    }
    
    vaultRevision.value++
    
    eventBus.emit('vault:loaded', {
      source: 'store',
      vaultId: active?.id || loadedVaults[0]?.id || '',
      vaultName: active?.name || loadedVaults[0]?.name || '',
      vaultMetadata: active || loadedVaults[0] || null
    })
  } catch (err) {
    error.value = `Failed to load vaults: ${err instanceof Error ? err.message : String(err)}`
    eventBus.emit('vault:error', {
      source: 'store',
      vaultId: null,
      error: err instanceof Error ? err : new Error(String(err)),
      operation: 'loadAllVaults'
    })
  } finally {
    isLoading.value = false
  }
}

/**
 * Load vault structure for active vault
 */
async function loadVaultStructure() {
  if (!activeVault.value) return
  
  try {
    isLoading.value = true
    error.value = null
    
    const structure = await fileSystemService.getVaultStructure(activeVault.value.id)
    vaultStructure.value = structure
    
    vaultRevision.value++
    
    eventBus.emit('vault:structure-refreshed', {
      source: 'store',
      vaultId: activeVault.value.id,
      fullStructure: true
    })
  } catch (err) {
    error.value = `Failed to load vault structure: ${err instanceof Error ? err.message : String(err)}`
    eventBus.emit('vault:error', {
      source: 'store',
      vaultId: activeVault.value.id,
      error: err instanceof Error ? err : new Error(String(err)),
      operation: 'loadVaultStructure'
    })
  } finally {
    isLoading.value = false
  }
}

/**
 * Activate a vault
 */
async function activateVault(vaultId: string) {
  try {
    isLoading.value = true
    error.value = null
    
    await vaultService.setActiveVault(vaultId)
    
    // Update local state
    const vault = vaults.value.find(v => v.id === vaultId)
    if (vault) {
      activeVault.value = vault
      
      // Load structure for new active vault
      await loadVaultStructure()
      
      eventBus.emit('vault:activated', {
        source: 'store',
        vaultId: vault.id,
        vaultName: vault.name,
        vaultMetadata: vault
      })
    }
  } catch (err) {
    error.value = `Failed to activate vault: ${err instanceof Error ? err.message : String(err)}`
    eventBus.emit('vault:error', {
      source: 'store',
      vaultId: vaultId,
      error: err instanceof Error ? err : new Error(String(err)),
      operation: 'activateVault'
    })
  } finally {
    isLoading.value = false
  }
}

/**
 * Create a new vault
 */
async function createNewVault(name: string, description: string = '') {
  try {
    isLoading.value = true
    error.value = null
    
    const newVault = await vaultService.createVault(name, description)
    
    // Add to local state
    vaults.value = [...vaults.value, newVault]
    
    // If this is the first vault, activate it
    if (vaults.value.length === 1) {
      await activateVault(newVault.id)
    }
    
    vaultRevision.value++
    
    eventBus.emit('vault:created', {
      source: 'store',
      vaultId: newVault.id,
      vaultName: newVault.name,
      vaultMetadata: newVault
    })
    
    return newVault
  } catch (err) {
    error.value = `Failed to create vault: ${err instanceof Error ? err.message : String(err)}`
    eventBus.emit('vault:error', {
      source: 'store',
      vaultId: null,
      error: err instanceof Error ? err : new Error(String(err)),
      operation: 'createNewVault'
    })
    throw err
  } finally {
    isLoading.value = false
  }
}

/**
 * Delete an existing vault
 */
async function deleteExistingVault(vaultId: string) {
  try {
    isLoading.value = true
    error.value = null
    
    await vaultService.deleteVault(vaultId)
    
    // Remove from local state
    vaults.value = vaults.value.filter(v => v.id !== vaultId)
    
    // If we deleted the active vault, activate another one
    if (activeVault.value?.id === vaultId) {
      const remainingVaults = vaults.value
      if (remainingVaults.length > 0) {
        await activateVault(remainingVaults[0].id)
      } else {
        activeVault.value = null
        vaultStructure.value = []
      }
    }
    
    vaultRevision.value++
    
    eventBus.emit('vault:structure-refreshed', {
      source: 'store',
      vaultId: vaultId,
      fullStructure: false
    })
  } catch (err) {
    error.value = `Failed to delete vault: ${err instanceof Error ? err.message : String(err)}`
    eventBus.emit('vault:error', {
      source: 'store',
      vaultId: vaultId,
      error: err instanceof Error ? err : new Error(String(err)),
      operation: 'deleteExistingVault'
    })
    throw err
  } finally {
    isLoading.value = false
  }
}

/**
 * Rename an existing vault
 */
async function renameExistingVault(vaultId: string, newName: string) {
  try {
    isLoading.value = true
    error.value = null
    
    const updatedVault = await vaultService.renameVault(vaultId, newName)
    
    // Update local state
    const index = vaults.value.findIndex(v => v.id === vaultId)
    if (index !== -1) {
      vaults.value[index] = updatedVault
      
      // Update active vault if needed
      if (activeVault.value?.id === vaultId) {
        activeVault.value = updatedVault
      }
    }
    
    vaultRevision.value++
    
    eventBus.emit('vault:item-renamed', {
      source: 'store',
      vaultId: vaultId,
      itemId: vaultId,
      oldName: vaults.value[index]?.name || '',
      newName: newName,
      itemType: 'file' as const
    })
  } catch (err) {
    error.value = `Failed to rename vault: ${err instanceof Error ? err.message : String(err)}`
    eventBus.emit('vault:error', {
      source: 'store',
      vaultId: vaultId,
      error: err instanceof Error ? err : new Error(String(err)),
      operation: 'renameExistingVault'
    })
    throw err
  } finally {
    isLoading.value = false
  }
}
```

### Step 5: Implement File/Folder Operations

```typescript
// ============================================================
// FILE/FOLDER OPERATIONS
// ============================================================

/**
 * Create a new file
 */
async function createNewFile(
  parentId: string | null = null,
  name: string,
  content: unknown = {}
) {
  if (!activeVault.value) {
    throw new Error('No active vault')
  }
  
  try {
    isLoading.value = true
    error.value = null
    
    const file = await fileSystemService.createFile(
      activeVault.value.id,
      parentId,
      name,
      content
    )
    
    // Add to local structure
    vaultStructure.value = [...vaultStructure.value, file]
    
    vaultRevision.value++
    
    eventBus.emit('vault:file-created', {
      source: 'store',
      vaultId: activeVault.value.id,
      fileId: file.id,
      fileName: file.name,
      parentId: file.parentId
    })
    
    return file
  } catch (err) {
    error.value = `Failed to create file: ${err instanceof Error ? err.message : String(err)}`
    eventBus.emit('vault:error', {
      source: 'store',
      vaultId: activeVault.value.id,
      error: err instanceof Error ? err : new Error(String(err)),
      operation: 'createNewFile'
    })
    throw err
  } finally {
    isLoading.value = false
  }
}

/**
 * Create a new folder
 */
async function createNewFolder(
  parentId: string | null = null,
  name: string
) {
  if (!activeVault.value) {
    throw new Error('No active vault')
  }
  
  try {
    isLoading.value = true
    error.value = null
    
    const folder = await fileSystemService.createFolder(
      activeVault.value.id,
      parentId,
      name
    )
    
    // Add to local structure
    vaultStructure.value = [...vaultStructure.value, folder]
    
    vaultRevision.value++
    
    eventBus.emit('vault:folder-created', {
      source: 'store',
      vaultId: activeVault.value.id,
      folderId: folder.id,
      folderName: folder.name,
      parentId: folder.parentId
    })
    
    return folder
  } catch (err) {
    error.value = `Failed to create folder: ${err instanceof Error ? err.message : String(err)}`
    eventBus.emit('vault:error', {
      source: 'store',
      vaultId: activeVault.value.id,
      error: err instanceof Error ? err : new Error(String(err)),
      operation: 'createNewFolder'
    })
    throw err
  } finally {
    isLoading.value = false
  }
}

/**
 * Rename an existing item
 */
async function renameExistingItem(
  itemId: string,
  newName: string
) {
  if (!activeVault.value) {
    throw new Error('No active vault')
  }
  
  try {
    isLoading.value = true
    error.value = null
    
    const item = await fileSystemService.renameItem(itemId, newName)
    
    // Update local structure
    const index = vaultStructure.value.findIndex(i => i.id === itemId)
    if (index !== -1) {
      vaultStructure.value[index] = item
    }
    
    vaultRevision.value++
    
    eventBus.emit('vault:item-renamed', {
      source: 'store',
      vaultId: activeVault.value.id,
      itemId: item.id,
      oldName: vaultStructure.value[index]?.name || '',
      newName: item.name,
      itemType: item.type
    })
    
    return item
  } catch (err) {
    error.value = `Failed to rename item: ${err instanceof Error ? err.message : String(err)}`
    eventBus.emit('vault:error', {
      source: 'store',
      vaultId: activeVault.value.id,
      error: err instanceof Error ? err : new Error(String(err)),
      operation: 'renameExistingItem'
    })
    throw err
  } finally {
    isLoading.value = false
  }
}

/**
 * Delete an existing item
 */
async function deleteExistingItem(itemId: string) {
  if (!activeVault.value) {
    throw new Error('No active vault')
  }
  
  try {
    isLoading.value = true
    error.value = null
    
    const deletedIds = await fileSystemService.deleteItem(itemId)
    
    // Remove from local structure
    vaultStructure.value = vaultStructure.value.filter(
      i => !deletedIds.includes(i.id)
    )
    
    // Remove from selection
    deletedIds.forEach(id => selectedItems.value.delete(id))
    
    vaultRevision.value++
    
    // Find the item type for event
    const item = vaultStructure.value.find(i => i.id === itemId)
    const itemType: 'file' | 'folder' = item?.type || 'file'
    
    eventBus.emit('vault:item-deleted', {
      source: 'store',
      vaultId: activeVault.value.id,
      itemId: itemId,
      itemType: itemType,
      deletedIds: deletedIds
    })
  } catch (err) {
    error.value = `Failed to delete item: ${err instanceof Error ? err.message : String(err)}`
    eventBus.emit('vault:error', {
      source: 'store',
      vaultId: activeVault.value.id,
      error: err instanceof Error ? err : new Error(String(err)),
      operation: 'deleteExistingItem'
    })
    throw err
  } finally {
    isLoading.value = false
  }
}

/**
 * Move an existing item
 */
async function moveExistingItem(
  itemId: string,
  newParentId: string | null,
  newOrder: number
) {
  if (!activeVault.value) {
    throw new Error('No active vault')
  }
  
  try {
    isLoading.value = true
    error.value = null
    
    const item = await fileSystemService.moveItem(itemId, newParentId, newOrder)
    
    // Update local structure
    const index = vaultStructure.value.findIndex(i => i.id === itemId)
    if (index !== -1) {
      vaultStructure.value[index] = item
    }
    
    vaultRevision.value++
    
    // Find old parent for event
    const oldItem = vaultStructure.value.find(i => i.id === itemId)
    const oldParentId = oldItem?.parentId || null
    
    eventBus.emit('vault:item-moved', {
      source: 'store',
      vaultId: activeVault.value.id,
      itemId: item.id,
      oldParentId: oldParentId,
      newParentId: newParentId,
      newOrder: newOrder
    })
    
    return item
  } catch (err) {
    error.value = `Failed to move item: ${err instanceof Error ? err.message : String(err)}`
    eventBus.emit('vault:error', {
      source: 'store',
      vaultId: activeVault.value.id,
      error: err instanceof Error ? err : new Error(String(err)),
      operation: 'moveExistingItem'
    })
    throw err
  } finally {
    isLoading.value = false
  }
}
```

### Step 6: Implement Selection Operations

```typescript
// ============================================================
// SELECTION OPERATIONS
// ============================================================

/**
 * Select an item
 */
function selectItem(itemId: string) {
  selectedItems.value = new Set([itemId])
}

/**
 * Toggle item selection
 */
function toggleItemSelection(itemId: string) {
  const newSelection = new Set(selectedItems.value)
  if (newSelection.has(itemId)) {
    newSelection.delete(itemId)
  } else {
    newSelection.add(itemId)
  }
  selectedItems.value = newSelection
}

/**
 * Check if item is selected
 */
function isItemSelected(itemId: string): boolean {
  return selectedItems.value.has(itemId)
}
```

### Step 7: Add Helper Functions

```typescript
// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get all descendant IDs for an item
 */
function getDescendantIds(itemId: string): string[] {
  const descendants: string[] = []
  const item = vaultStructure.value.find(i => i.id === itemId)
  
  if (item && item.type === 'folder') {
    const children = vaultStructure.value.filter(i => i.parentId === itemId)
    for (const child of children) {
      descendants.push(child.id)
      descendants.push(...getDescendantIds(child.id))
    }
  }
  
  return descendants
}

/**
 * Find item in structure
 */
function findItem(itemId: string): FileSystemItem | null {
  return vaultStructure.value.find(i => i.id === itemId) || null
}

/**
 * Check if item exists
 */
function checkItemExists(itemId: string): boolean {
  return vaultStructure.value.some(i => i.id === itemId)
}
```

### Step 8: Export Store from Index

**Location**: `src/core/stores/index.ts`

**Add export**:
```typescript
export * from './vaultStore'
```

### Step 9: Return Public API

```typescript
// ============================================================
// PUBLIC API
// ============================================================

return {
  // State
  vaults,
  activeVault,
  vaultStructure,
  selectedItems,
  isLoading,
  error,
  vaultRevision,
  
  // Computed properties
  hasVaults,
  hasActiveVault,
  rootFiles,
  rootFolders,
  allFiles,
  allFolders,
  hasItems,
  
  // Vault operations
  loadAllVaults,
  loadVaultStructure,
  activateVault,
  createNewVault,
  deleteExistingVault,
  renameExistingVault,
  
  // File/folder operations
  createNewFile,
  createNewFolder,
  renameExistingItem,
  deleteExistingItem,
  moveExistingItem,
  
  // Selection operations
  selectItem,
  toggleItemSelection,
  isItemSelected,
  
  // Helper functions
  getDescendantIds,
  findItem,
  checkItemExists
}
```

## 🧪 Testing Strategy

### Unit Tests to Create
1. **State Management Tests**: Verify state initialization and updates
2. **Vault Operations Tests**: Test create, delete, rename, activate
3. **File/Folder Operations Tests**: Test CRUD operations
4. **Event Emission Tests**: Verify all events are emitted correctly
5. **Error Handling Tests**: Test error scenarios

### Test File Location
`src/core/stores/vaultStore.spec.ts`

### Example Test Cases
```typescript
import { setActivePinia, createPinia } from 'pinia'
import { useVaultStore } from './vaultStore'
import { eventBus } from '../events'

describe('VaultStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  test('initial state', () => {
    const store = useVaultStore()
    expect(store.vaults).toEqual([])
    expect(store.activeVault).toBeNull()
    expect(store.isLoading).toBe(false)
  })

  test('create vault', async () => {
    const store = useVaultStore()
    const mockVault = { id: 'vault-1', name: 'Test Vault' }
    
    // Mock vaultService.createVault
    vi.spyOn(vaultService, 'createVault').mockResolvedValue(mockVault)
    
    await store.createNewVault('Test Vault')
    
    expect(store.vaults).toHaveLength(1)
    expect(store.vaults[0].name).toBe('Test Vault')
  })

  test('event emission', async () => {
    const store = useVaultStore()
    const mockHandler = vi.fn()
    
    eventBus.on('vault:created', mockHandler)
    
    const mockVault = { id: 'vault-1', name: 'Test Vault' }
    vi.spyOn(vaultService, 'createVault').mockResolvedValue(mockVault)
    
    await store.createNewVault('Test Vault')
    
    expect(mockHandler).toHaveBeenCalled()
  })
})
```

## 🔍 Verification Checklist

- [ ] VaultStore file created with proper structure
- [ ] All state properties defined
- [ ] Computed properties implemented
- [ ] Vault operations implemented with event emission
- [ ] File/folder operations implemented with event emission
- [ ] Selection operations implemented
- [ ] Helper functions implemented
- [ ] Store exported from index
- [ ] TypeScript compilation succeeds
- [ ] All tests pass
- [ ] Event emission verified
- [ ] Error handling verified

## 📊 Expected Outcomes

1. **Centralized State**: All vault management through single store
2. **Event-Driven**: All operations emit appropriate events
3. **Type Safety**: Full TypeScript support
4. **Error Handling**: Comprehensive error management
5. **Reactivity**: Proper Vue reactivity patterns
6. **Consistency**: Follows unifiedDocumentStore pattern

## 🎯 Next Steps

After completing Session 2:
1. Proceed to Session 3: Update VaultTree.vue
2. Update components to use VaultStore
3. Test integration between store and components
4. Verify event flow and reactivity

**Plan Version**: 1.0
**Last Updated**: 2025-12-30
**Author**: AI Assistant