# Session 5: VaultToolbar.vue Migration to VaultStore - Implementation Plan

## 🎯 Overview

This document provides the detailed implementation plan for Session 5: Migrating VaultToolbar.vue to use VaultStore directly instead of the event-based approach. This completes the migration of all vault components to the store-based architecture.

## 📋 Current State Analysis

### VaultToolbar.vue Current Implementation

The current VaultToolbar.vue uses an event-based approach:

```vue
<!-- Current implementation -->
<template>
  <div class="vault-toolbar">
    <q-btn flat dense icon="add" size="sm" @click="$emit('new-vault')">
      <q-tooltip>New Vault</q-tooltip>
    </q-btn>
    <!-- Other buttons emit events -->
  </div>
</template>

<script setup lang="ts">
defineEmits([
  'new-vault',
  'open-vault', 
  'delete-vault',
  'add-file',
  'add-folder',
  'expand-all',
  'collapse-all'
])
</script>
```

### VaultTree.vue Current Integration

VaultTree.vue handles these events and calls VaultStore methods:

```typescript
// Current event handlers in VaultTree.vue
async function addFileToRoot() {
  try {
    await vaultStore.loadAllVaults()
    const activeVault = vaultStore.activeVault
    if (!activeVault) {
      $q.notify({ type: 'warning', message: 'No active vault', timeout: 2000 })
      return
    }
    await vaultStore.createNewFile(null, 'New File', newDocument)
    await buildTreeFromVault(true)
  } catch (error) {
    console.error('Failed to create file:', error)
    $q.notify({ type: 'error', message: 'Failed to create file', timeout: 3000 })
  }
}
```

## 🔧 Implementation Steps

### Step 1: Update VaultToolbar.vue to Use VaultStore Directly

**Location**: `src/features/vault/components/VaultToolbar.vue`

**Changes**:

```vue
<template>
  <div class="vault-toolbar">
    <!-- Vault Operations -->
    <div class="toolbar-section">
      <q-btn flat dense icon="add" size="sm" @click="handleNewVault">
        <q-tooltip>New Vault</q-tooltip>
      </q-btn>
      <q-btn flat dense icon="folder_open" size="sm" @click="handleOpenVault">
        <q-tooltip>Open Vault</q-tooltip>
      </q-btn>
      <q-btn flat dense icon="delete" size="sm" @click="handleDeleteVault">
        <q-tooltip>Delete Vault</q-tooltip>
      </q-btn>
    </div>

    <q-separator vertical inset class="q-mx-sm" />

    <!-- File Operations -->
    <div class="toolbar-section">
      <q-btn flat dense icon="note_add" size="sm" @click="handleAddFile">
        <q-tooltip>Add File</q-tooltip>
      </q-btn>
      <q-btn flat dense icon="create_new_folder" size="sm" @click="handleAddFolder">
        <q-tooltip>Add Folder</q-tooltip>
      </q-btn>
    </div>

    <q-separator vertical inset class="q-mx-sm" />

    <!-- View Controls -->
    <div class="toolbar-section">
      <q-btn flat dense icon="unfold_more" size="sm" @click="handleExpandAll">
        <q-tooltip>Expand all</q-tooltip>
      </q-btn>
      <q-btn flat dense icon="unfold_less" size="sm" @click="handleCollapseAll">
        <q-tooltip>Collapse all</q-tooltip>
      </q-btn>
    </div>

    <q-space />
  </div>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar'
import { useVaultStore } from 'src/core/stores/vaultStore'
import type { MindscribbleDocument } from 'src/core/types'

const $q = useQuasar()
const vaultStore = useVaultStore()

// Vault operations
async function handleNewVault() {
  try {
    const vaultName = prompt('Enter vault name:', 'My Vault')
    if (!vaultName) return
    
    await vaultStore.createNewVault(vaultName, 'New vault')
    $q.notify({ type: 'positive', message: 'Vault created', timeout: 2000 })
  } catch (error) {
    console.error('Failed to create vault:', error)
    $q.notify({ type: 'error', message: 'Failed to create vault', timeout: 3000 })
  }
}

async function handleOpenVault() {
  try {
    await vaultStore.loadAllVaults()
    const vaults = vaultStore.vaults
    if (vaults.length === 0) {
      $q.notify({ type: 'warning', message: 'No vaults available', timeout: 2000 })
      return
    }
    
    // For now, just open the first vault
    if (vaults.length > 0 && vaults[0]) {
      await vaultStore.activateVault(vaults[0].id)
    }
    
    $q.notify({ type: 'positive', message: 'Vault opened', timeout: 2000 })
  } catch (error) {
    console.error('Failed to open vault:', error)
    $q.notify({ type: 'error', message: 'Failed to open vault', timeout: 3000 })
  }
}

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
    
    await vaultStore.deleteExistingVault(activeVault.id)
    $q.notify({ type: 'positive', message: 'Vault deleted', timeout: 2000 })
  } catch (error) {
    console.error('Failed to delete vault:', error)
    $q.notify({ type: 'error', message: 'Failed to delete vault', timeout: 3000 })
  }
}

// File operations
async function handleAddFile() {
  try {
    await vaultStore.loadAllVaults()
    const activeVault = vaultStore.activeVault
    if (!activeVault) {
      $q.notify({ type: 'warning', message: 'No active vault', timeout: 2000 })
      return
    }
    
    // Create a minimal document for the new file
    const newDocument: MindscribbleDocument = {
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
    
    await vaultStore.createNewFile(null, 'New File', newDocument)
    $q.notify({ type: 'positive', message: 'File created', timeout: 2000 })
  } catch (error) {
    console.error('Failed to create file:', error)
    $q.notify({ type: 'error', message: 'Failed to create file', timeout: 3000 })
  }
}

async function handleAddFolder() {
  try {
    await vaultStore.loadAllVaults()
    const activeVault = vaultStore.activeVault
    if (!activeVault) {
      $q.notify({ type: 'warning', message: 'No active vault', timeout: 2000 })
      return
    }
    
    await vaultStore.createNewFolder(null, 'New Folder')
    $q.notify({ type: 'positive', message: 'Folder created', timeout: 2000 })
  } catch (error) {
    console.error('Failed to create folder:', error)
    $q.notify({ type: 'error', message: 'Failed to create folder', timeout: 3000 })
  }
}

// View operations
function handleExpandAll() {
  // This will be handled by emitting an event to VaultTree
  // since tree expansion is UI state, not store state
  emit('expand-all')
}

function handleCollapseAll() {
  // This will be handled by emitting an event to VaultTree
  // since tree collapse is UI state, not store state
  emit('collapse-all')
}

// Define emits for UI state operations
const emit = defineEmits([
  'expand-all',
  'collapse-all'
])
</script>
```

### Step 2: Update VaultTree.vue to Remove Event Handlers

**Location**: `src/features/vault/components/VaultTree.vue`

**Changes**:

Remove the event handlers from VaultTree.vue since they're now in VaultToolbar.vue:

```vue
<!-- Update VaultTree.vue template -->
<VaultToolbar
  @expand-all="expandAll"
  @collapse-all="collapseAll"
/>
```

Remove the corresponding event handler methods from VaultTree.vue script section.

### Step 3: Add Tree Expansion/Collapse Methods to VaultTree.vue

**Location**: `src/features/vault/components/VaultTree.vue`

**Changes**:

```typescript
// Add these methods to handle tree expansion/collapse
function expandAll() {
  // Expand all nodes in the tree
  if (treeRef.value) {
    treeRef.value.expandAll()
  }
}

function collapseAll() {
  // Collapse all nodes in the tree
  if (treeRef.value) {
    treeRef.value.collapseAll()
  }
}
```

### Step 4: Update VaultStore if Needed

**Location**: `src/core/stores/vaultStore.ts`

**Analysis**:

Check if VaultStore has all the required methods:
- ✅ `createNewVault()`
- ✅ `loadAllVaults()`
- ✅ `activateVault()`
- ✅ `deleteExistingVault()`
- ✅ `createNewFile()`
- ✅ `createNewFolder()`

All required methods appear to be available.

## 🧪 Testing Strategy

### Test Cases to Verify

1. **Vault Operations**:
   - New vault creation works
   - Opening existing vault works
   - Deleting vault works

2. **File Operations**:
   - Adding new file works
   - Adding new folder works

3. **View Operations**:
   - Expand all functionality works
   - Collapse all functionality works

4. **Store Integration**:
   - All operations use VaultStore directly
   - No event emitter dependencies remain
   - Error handling works correctly

### Manual Testing Steps

1. Open application and verify VaultToolbar renders correctly
2. Test vault creation, opening, and deletion
3. Test file and folder creation
4. Test expand/collapse all functionality
5. Check console for any errors
6. Verify no event emitter references remain
7. Verify notifications appear correctly

## 🔍 Verification Checklist

- [ ] VaultToolbar uses VaultStore directly for all operations
- [ ] VaultTree event handlers removed
- [ ] Tree expansion/collapse methods added to VaultTree
- [ ] All imports optimized
- [ ] Error handling works correctly
- [ ] Notifications appear for all operations
- [ ] No console errors
- [ ] No linting warnings
- [ ] Tests passing

## 📊 Expected Outcomes

1. **Complete Migration**: VaultToolbar fully uses VaultStore
2. **No Event Emitter**: All event emitter dependencies removed
3. **Clean Code**: Optimized imports, no unused code
4. **Consistency**: Follows same pattern as VaultTree and VaultTreeItem
5. **Maintainability**: Easier to understand and modify
6. **Better Error Handling**: Consistent error handling across all components

## 🎯 Next Steps

After completing Session 5:
1. Proceed to Session 6: Final integration and testing
2. Test integration between all components
3. Verify complete event flow
4. Update documentation
5. Create summary of all sessions

**Plan Version**: 1.0
**Last Updated**: 2025-12-30
**Author**: AI Assistant