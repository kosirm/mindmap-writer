# VaultStore Quick Reference Guide

## 🚀 Quick Start

### Import and Use

```typescript
import { useVaultStore } from 'src/core/stores'
import { eventBus } from 'src/core/events'

const vaultStore = useVaultStore()
```

---

## 📦 Store State

### Reactive Properties

| Property | Type | Description |
|----------|------|-------------|
| `vaults` | `VaultMetadata[]` | All available vaults |
| `activeVault` | `VaultMetadata \| null` | Currently active vault |
| `vaultStructure` | `FileSystemItem[]` | Files and folders in active vault |
| `selectedItems` | `Set<string>` | Currently selected item IDs |
| `isLoading` | `boolean` | Loading state |
| `error` | `string \| null` | Error message |

### Computed Properties

| Property | Type | Description |
|----------|------|-------------|
| `hasVaults` | `boolean` | Whether any vaults exist |
| `hasActiveVault` | `boolean` | Whether an active vault is set |
| `rootFiles` | `FileSystemItem[]` | Files at root level |
| `rootFolders` | `FileSystemItem[]` | Folders at root level |
| `allFiles` | `FileSystemItem[]` | All files in vault |
| `allFolders` | `FileSystemItem[]` | All folders in vault |
| `hasItems` | `boolean` | Whether vault has any items |

---

## 🎬 Store Actions

### Vault Operations

```typescript
// Load all vaults
await vaultStore.loadAllVaults('my-component')

// Load vault structure
await vaultStore.loadVaultStructure('vault-id', 'my-component')

// Activate a vault
await vaultStore.activateVault('vault-id', 'my-component')

// Create a new vault
const vault = await vaultStore.createNewVault('My Vault', 'Description', 'my-component')

// Delete a vault
await vaultStore.deleteExistingVault('vault-id', 'my-component')

// Rename a vault
await vaultStore.renameExistingVault('vault-id', 'New Name', 'my-component')
```

### File/Folder Operations

```typescript
// Create a file
const file = await vaultStore.createNewFile(
  parentId,           // string | null
  'File Name',        // string
  documentContent,    // MindscribbleDocument
  'my-component'      // EventSource
)

// Create a folder
const folder = await vaultStore.createNewFolder(
  parentId,           // string | null
  'Folder Name',      // string
  'my-component'      // EventSource
)

// Rename an item
await vaultStore.renameExistingItem(
  'item-id',          // string
  'New Name',         // string
  'my-component'      // EventSource
)

// Delete an item
await vaultStore.deleteExistingItem(
  'item-id',          // string
  'my-component'      // EventSource
)

// Move an item
await vaultStore.moveExistingItem(
  'item-id',          // string
  'new-parent-id',    // string | null
  'my-component'      // EventSource
)
```

### Selection Operations

```typescript
// Select an item
vaultStore.selectItem('item-id', 'my-component')

// Deselect all
vaultStore.selectItem(null, 'my-component')

// Toggle selection
vaultStore.toggleItemSelection('item-id')

// Check if selected
const isSelected = vaultStore.isItemSelected('item-id')
```

### Helper Functions

```typescript
// Find an item by ID
const item = vaultStore.findItem('item-id')

// Check if item exists
const exists = await vaultStore.checkItemExists(parentId, 'Item Name')
```

---

## 📡 Events

### Vault Events

| Event | Payload | When Emitted |
|-------|---------|--------------|
| `vault:loaded` | `{ vaultId, vault, source }` | Vault loaded successfully |
| `vault:created` | `{ vaultId, vault, source }` | New vault created |
| `vault:activated` | `{ vaultId, previousVaultId, source }` | Vault activated |
| `vault:deleted` | `{ vaultId, source }` | Vault deleted |
| `vault:renamed` | `{ vaultId, newName, source }` | Vault renamed |
| `vault:structure-refreshed` | `{ vaultId, itemCount, source }` | Structure reloaded |
| `vault:error` | `{ error, operation, source }` | Error occurred |

### File/Folder Events

| Event | Payload | When Emitted |
|-------|---------|--------------|
| `file:created` | `{ fileId, file, parentId, source }` | File created |
| `file:opened` | `{ fileId, source }` | File opened |
| `file:closed` | `{ fileId, source }` | File closed |
| `folder:created` | `{ folderId, folder, parentId, source }` | Folder created |

### Item Events

| Event | Payload | When Emitted |
|-------|---------|--------------|
| `item:renamed` | `{ itemId, oldName, newName, source }` | Item renamed |
| `item:deleted` | `{ itemId, deletedIds, source }` | Item deleted |
| `item:moved` | `{ itemId, oldParentId, newParentId, source }` | Item moved |
| `item:selected` | `{ itemId, source }` | Item selected |

### Listening to Events

```typescript
import { eventBus } from 'src/core/events'
import { onMounted, onUnmounted } from 'vue'

onMounted(() => {
  // Listen to file creation
  eventBus.on('file:created', ({ fileId, file, source }) => {
    if (source !== 'my-component') {
      console.log('File created by another component:', file.name)
    }
  })
  
  // Listen to item rename
  eventBus.on('item:renamed', ({ itemId, newName, source }) => {
    console.log(`Item ${itemId} renamed to ${newName}`)
  })
})

onUnmounted(() => {
  // Clean up listeners
  eventBus.off('file:created')
  eventBus.off('item:renamed')
})
```

---

## 🎯 Common Patterns

### Pattern 1: Display Vault Structure

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useVaultStore } from 'src/core/stores'

const vaultStore = useVaultStore()

const rootItems = computed(() => [
  ...vaultStore.rootFolders,
  ...vaultStore.rootFiles
])
</script>

<template>
  <div v-for="item in rootItems" :key="item.id">
    {{ item.name }}
  </div>
</template>
```

### Pattern 2: Create File with Validation

```typescript
async function createFile(name: string) {
  if (!vaultStore.activeVault) {
    console.error('No active vault')
    return
  }
  
  // Check if file already exists
  const exists = await vaultStore.checkItemExists(null, name)
  if (exists) {
    console.error('File already exists')
    return
  }
  
  // Create file
  const document = createEmptyDocument()
  await vaultStore.createNewFile(null, name, document, 'my-component')
}
```

### Pattern 3: React to Changes from Other Components

```typescript
onMounted(() => {
  eventBus.on('file:created', ({ file, source }) => {
    // Only react if created by another component
    if (source !== 'my-component') {
      showNotification(`New file created: ${file.name}`)
    }
  })
})
```

---

## ⚠️ Important Notes

### 1. Always Specify Source
```typescript
// ✅ GOOD
await vaultStore.createNewFile(null, 'File', doc, 'my-component')

// ❌ BAD
await vaultStore.createNewFile(null, 'File', doc)
```

### 2. Clean Up Event Listeners
```typescript
// ✅ GOOD
onMounted(() => eventBus.on('file:created', handler))
onUnmounted(() => eventBus.off('file:created', handler))

// ❌ BAD - Memory leak
onMounted(() => eventBus.on('file:created', handler))
```

### 3. Use Store Actions, Not Direct Mutation
```typescript
// ✅ GOOD
await vaultStore.createNewFile(null, 'File', doc, 'my-component')

// ❌ BAD
vaultStore.vaultStructure.push(newFile)
```

### 4. Check Source to Avoid Circular Updates
```typescript
// ✅ GOOD
eventBus.on('file:created', ({ source }) => {
  if (source !== 'my-component') {
    updateUI()
  }
})

// ❌ BAD - May cause circular updates
eventBus.on('file:created', () => {
  updateUI()
})
```

---

## 🔄 Migration from Composables

### Before (useVault + useFileSystem)
```typescript
import { useVault } from 'src/composables/useVault'
import { useFileSystem } from 'src/composables/useFileSystem'

const vaultService = useVault()
const fileSystemService = useFileSystem()

const activeVault = vaultService.activeVault.value
await fileSystemService.createNewFile(activeVault.id, null, 'File', doc)
```

### After (VaultStore)
```typescript
import { useVaultStore } from 'src/core/stores'

const vaultStore = useVaultStore()

const activeVault = vaultStore.activeVault
await vaultStore.createNewFile(null, 'File', doc, 'my-component')
```

---

**Quick Reference Version:** 1.0  
**Last Updated:** 2025-12-30
