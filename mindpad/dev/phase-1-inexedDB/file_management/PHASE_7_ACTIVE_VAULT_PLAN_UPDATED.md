# Phase 7: Active Vault UI Implementation Plan (UPDATED)

## 🎯 Overview

**IMPORTANT UPDATE**: This document has been revised based on new understanding of the system architecture. The key insight is that **only one vault is stored in IndexedDB at a time**, and vault switching involves replacing the entire vault content.

### System Architecture Clarification

```
Google Drive Structure:
┌───────────────────────────────────────────────────────────────┐
│ Mindpad Folder (on Google Drive)                          │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ .vaults (index file)                                    │  │
│  │ - Contains metadata about all available vaults          │  │
│  │ - Vault names, creation dates, etc.                     │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Vault 1 (folder)                                        │  │
│  │  - vault.json (metadata)                                │  │
│  │  - files/ (all files in this vault)                     │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Vault 2 (folder)                                        │  │
│  │  - vault.json (metadata)                                │  │
│  │  - files/ (all files in this vault)                     │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ... (more vaults)                                         │  │
└───────────────────────────────────────────────────────────────┘

IndexedDB Structure:
┌───────────────────────────────────────────────────────────────┐
│ IndexedDB (Local Storage)                                    │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ .vaults (index file - downloaded from Google Drive)    │  │
│  │ - Contains metadata about all available vaults          │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Active Vault (only ONE vault at a time)                 │  │
│  │  - vaultMetadata (current vault info)                   │  │
│  │  - fileSystem (files and folders of active vault)       │  │
│  │  - documents (document content of active vault)         │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

### Key System Behaviors

1. **App Startup**: Last used vault is loaded from IndexedDB and shown in UI
2. **Vault Selection**: When user selects another vault:
   - Current vault is REPLACED in IndexedDB
   - Selected vault is downloaded from Google Drive to IndexedDB
   - UI shows the newly loaded vault
3. **New Vault Creation**: When user creates new vault:
   - Current vault is REPLACED in IndexedDB
   - New empty vault is created in IndexedDB
   - UI shows the new empty vault
4. **IndexedDB Limitation**: Only one vault fits in IndexedDB due to size constraints

## 🔍 Current State Analysis

### Current UI Structure

- **VaultToolbar.vue**: Contains buttons for vault operations
- **VaultTree.vue**: Main tree component that displays vault structure
- **VaultTreeItem.vue**: Individual tree items

### Current Issues

- ❌ Uses `prompt()` for vault name input (bad UX)
- ❌ Uses `alert()`/`confirm()` for vault operations (bad UX)
- ❌ No visual indication of available vaults for selection
- ❌ No dropdown menus for better UX
- ❌ No clear indication of which vault is currently active

### Existing Vault Store Capabilities

The vault store provides:
- ✅ `createNewVault(name, description)` - Create new vault (replaces current)
- ✅ `loadAllVaults()` - Load vault metadata from .vaults file
- ✅ `activateVault(vaultId)` - Download and activate selected vault
- ✅ `vaults` - Reactive array of all available vaults (from .vaults)
- ✅ `activeVault` - Reactive reference to currently active vault

## 🏗️ Updated Implementation Plan

### Step 1: Create Vault Metadata Service

Since we need to work with the `.vaults` index file, we need a service to manage vault metadata:

**File**: `src/core/services/vaultMetadataService.ts`

```typescript
import { db } from './indexedDBService'
import { eventBus } from '../events'

export interface VaultMetadata {
  id: string
  name: string
  description: string
  created: number
  modified: number
  googleDriveId?: string // For Phase 8
}

export interface VaultsIndex {
  version: string
  vaults: VaultMetadata[]
  lastUpdated: number
}

export class VaultMetadataService {
  static async getVaultsIndex(): Promise<VaultsIndex> {
    try {
      const index = await db.vaultsIndex.get('vaults')
      if (!index) {
        // Create default empty index
        const defaultIndex: VaultsIndex = {
          version: '1.0',
          vaults: [],
          lastUpdated: Date.now()
        }
        await db.vaultsIndex.put(defaultIndex, 'vaults')
        return defaultIndex
      }
      return index
    } catch (error) {
      console.error('Failed to get vaults index:', error)
      throw new Error('Failed to get vaults index')
    }
  }

  static async updateVaultsIndex(index: VaultsIndex): Promise<void> {
    try {
      index.lastUpdated = Date.now()
      await db.vaultsIndex.put(index, 'vaults')
      eventBus.emit('vaults:index-updated', { index })
    } catch (error) {
      console.error('Failed to update vaults index:', error)
      throw new Error('Failed to update vaults index')
    }
  }

  static async addVaultToIndex(vault: VaultMetadata): Promise<void> {
    const index = await this.getVaultsIndex()
    // Check if vault already exists
    const existingIndex = index.vaults.findIndex(v => v.id === vault.id)
    
    if (existingIndex !== -1) {
      // Update existing vault
      index.vaults[existingIndex] = vault
    } else {
      // Add new vault
      index.vaults.push(vault)
    }
    
    await this.updateVaultsIndex(index)
  }

  static async removeVaultFromIndex(vaultId: string): Promise<void> {
    const index = await this.getVaultsIndex()
    index.vaults = index.vaults.filter(v => v.id !== vaultId)
    await this.updateVaultsIndex(index)
  }
}
```

### Step 2: Update Vault Store for Single Vault Architecture

The vault store needs to be updated to handle the single vault architecture:

```typescript
// In vaultStore.ts

/**
 * Create new vault - REPLACES current vault in IndexedDB
 */
async function createNewVault(
  name: string,
  description: string = '',
  source: EventSource = 'store'
) {
  try {
    isLoading.value = true
    error.value = null

    // Create new vault metadata
    const newVault: VaultMetadata = {
      id: `vault-${Date.now()}`,
      name,
      description,
      created: Date.now(),
      modified: Date.now()
    }

    // Add to vaults index
    await VaultMetadataService.addVaultToIndex(newVault)

    // Clear current vault data from IndexedDB
    await clearCurrentVaultData()

    // Set as active vault
    activeVault.value = newVault
    vaultStructure.value = [] // Empty structure for new vault

    // Emit events
    eventBus.emit('vault:created', { vaultId: newVault.id, vault: newVault, source })
    eventBus.emit('vault:activated', { vaultId: newVault.id, previousVaultId: null, source })

    vaultRevision.value++
    return newVault
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to create vault'
    eventBus.emit('vault:error', { error: err as Error, operation: 'createNewVault', source })
    throw err
  } finally {
    isLoading.value = false
  }
}

/**
 * Activate vault - REPLACES current vault in IndexedDB with selected vault
 */
async function activateVault(vaultId: string, source: EventSource = 'store') {
  try {
    isLoading.value = true
    error.value = null

    const previousVaultId = activeVault.value?.id || null

    // For Phase 7: We get vault metadata from .vaults index
    // In Phase 8: We will download the actual vault content from Google Drive
    const vaultsIndex = await VaultMetadataService.getVaultsIndex()
    const vaultMetadata = vaultsIndex.vaults.find(v => v.id === vaultId)
    
    if (!vaultMetadata) {
      throw new Error(`Vault ${vaultId} not found in vaults index`)
    }

    // Clear current vault data from IndexedDB
    await clearCurrentVaultData()

    // Set as active vault (for Phase 7, we create empty structure)
    activeVault.value = vaultMetadata
    vaultStructure.value = [] // Empty structure, will be populated when files are created

    // Emit events
    eventBus.emit('vault:activated', { vaultId, previousVaultId, source })
    eventBus.emit('vault:loaded', { vaultId, vault: vaultMetadata, source })

    vaultRevision.value++
    return vaultMetadata
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to activate vault'
    eventBus.emit('vault:error', { error: err as Error, operation: 'activateVault', source })
    throw err
  } finally {
    isLoading.value = false
  }
}

/**
 * Load all vaults metadata from .vaults index
 */
async function loadAllVaults(source: EventSource = 'store') {
  try {
    isLoading.value = true
    error.value = null

    const vaultsIndex = await VaultMetadataService.getVaultsIndex()
    vaults.value = vaultsIndex.vaults

    // Load active vault if not already loaded
    if (!activeVault.value && vaultsIndex.vaults.length > 0) {
      // For Phase 7: Use first vault as default
      // In Phase 8: Load last used vault from preferences
      await activateVault(vaultsIndex.vaults[0].id, source)
    }

    vaultRevision.value++
    return vaultsIndex.vaults
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load vaults'
    eventBus.emit('vault:error', { error: err as Error, operation: 'loadAllVaults', source })
    throw err
  } finally {
    isLoading.value = false
  }
}

/**
 * Clear current vault data from IndexedDB
 */
async function clearCurrentVaultData() {
  // Clear file system
  await db.fileSystem.clear()
  // Clear documents
  await db.documents.clear()
  // Clear any other vault-specific data
}
```

### Step 3: Create Updated UI Components

#### 3.1 VaultCreationDropdown.vue (Updated)

```vue
<template>
  <q-menu ref="menuRef" :model-value="showDropdown" @update:model-value="updateShowDropdown">
    <q-card style="width: 300px; max-width: 80vw;">
      <q-card-section>
        <div class="text-h6">Create New Vault</div>
        <div class="text-caption text-grey-6">
          This will replace your current vault with a new empty vault.
        </div>
      </q-card-section>

      <q-card-section>
        <q-input
          v-model="vaultName"
          label="Vault Name"
          dense
          autofocus
          @keyup.enter="createVault"
          :rules="[val => !!val.trim() || 'Vault name is required']"
        />
        <q-input
          v-model="vaultDescription"
          label="Description (optional)"
          dense
          class="q-mt-sm"
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" @click="cancel" />
        <q-btn 
          color="primary" 
          label="Create"
          @click="createVault"
          :disable="!vaultName.trim()"
        />
      </q-card-actions>
    </q-card>
  </q-menu>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useVaultStore } from 'src/core/stores/vaultStore'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits(['update:modelValue', 'created'])

const $q = useQuasar()
const vaultStore = useVaultStore()

const vaultName = ref('')
const vaultDescription = ref('')
const showDropdown = ref(props.modelValue)

watch(() => props.modelValue, (value) => {
  showDropdown.value = value
  if (value) {
    // Reset form when opened
    vaultName.value = ''
    vaultDescription.value = ''
  }
})

function updateShowDropdown(value: boolean) {
  showDropdown.value = value
  emit('update:modelValue', value)
}

async function createVault() {
  if (!vaultName.value.trim()) return
  
  try {
    // Show warning about replacing current vault
    const confirm = await $q.dialog({
      title: 'Replace Current Vault?',
      message: 'Creating a new vault will replace your current vault. All unsaved changes will be lost. Continue?',
      cancel: true,
      persistent: true
    })
    
    if (!confirm) return

    await vaultStore.createNewVault(vaultName.value.trim(), vaultDescription.value.trim())
    $q.notify({ 
      type: 'positive', 
      message: `Vault "${vaultName.value}" created`, 
      timeout: 2000 
    })
    emit('created')
    updateShowDropdown(false)
  } catch (error) {
    console.error('Failed to create vault:', error)
    $q.notify({ 
      type: 'error', 
      message: 'Failed to create vault', 
      timeout: 3000 
    })
  }
}

function cancel() {
  updateShowDropdown(false)
}
</script>
```

#### 3.2 VaultSelectionDropdown.vue (Updated)

```vue
<template>
  <q-menu ref="menuRef" :model-value="showDropdown" @update:model-value="updateShowDropdown">
    <q-card style="width: 300px; max-width: 80vw;">
      <q-card-section>
        <div class="text-h6">Select Vault</div>
        <div class="text-caption text-grey-6">
          Selecting a vault will replace your current vault.
        </div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-list dense>
          <q-item 
            v-for="vault in vaults" 
            :key="vault.id"
            clickable
            @click="selectVault(vault.id)"
            :active="vault.id === activeVaultId"
            active-class="bg-primary text-white"
          >
            <q-item-section avatar>
              <q-icon name="storage" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ vault.name }}</q-item-label>
              <q-item-label caption v-if="vault.description">
                {{ vault.description }}
              </q-item-label>
              <q-item-label caption>
                Created: {{ new Date(vault.created).toLocaleDateString() }}
              </q-item-label>
            </q-item-section>
            <q-item-section side v-if="vault.id === activeVaultId">
              <q-icon name="check" color="positive" />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-card-actions align="right" class="q-pa-sm">
        <q-btn flat label="Cancel" @click="cancel" />
      </q-card-actions>
    </q-card>
  </q-menu>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useVaultStore } from 'src/core/stores/vaultStore'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits(['update:modelValue', 'selected'])

const $q = useQuasar()
const vaultStore = useVaultStore()

const showDropdown = ref(props.modelValue)

// Load vaults when component is mounted
onMounted(async () => {
  await vaultStore.loadAllVaults()
})

const vaults = computed(() => vaultStore.vaults)
const activeVaultId = computed(() => vaultStore.activeVault?.id || null)

watch(() => props.modelValue, (value) => {
  showDropdown.value = value
})

function updateShowDropdown(value: boolean) {
  showDropdown.value = value
  emit('update:modelValue', value)
}

async function selectVault(vaultId: string) {
  try {
    // Show warning about replacing current vault
    const confirm = await $q.dialog({
      title: 'Replace Current Vault?',
      message: 'Selecting another vault will replace your current vault. All unsaved changes will be lost. Continue?',
      cancel: true,
      persistent: true
    })
    
    if (!confirm) return

    await vaultStore.activateVault(vaultId, 'vault-selection-dropdown')
    $q.notify({ 
      type: 'positive', 
      message: 'Vault activated', 
      timeout: 2000 
    })
    emit('selected')
    updateShowDropdown(false)
  } catch (error) {
    console.error('Failed to activate vault:', error)
    $q.notify({ 
      type: 'error', 
      message: 'Failed to activate vault', 
      timeout: 3000 
    })
  }
}

function cancel() {
  updateShowDropdown(false)
}
</script>
```

### Step 4: Update VaultToolbar.vue

```vue
<template>
  <div class="vault-toolbar">
    <!-- Vault Operations -->
    <div class="toolbar-section">
      <!-- New Vault with Dropdown -->
      <q-btn flat dense icon="add" size="sm">
        <q-tooltip>New Vault</q-tooltip>
        <q-menu anchor="bottom middle" self="top middle">
          <VaultCreationDropdown 
            v-model="showNewVaultDropdown" 
            @created="onVaultCreated"
          />
        </q-menu>
      </q-btn>

      <!-- Open Vault with Dropdown -->
      <q-btn flat dense icon="folder_open" size="sm">
        <q-tooltip>Open Vault</q-tooltip>
        <q-menu anchor="bottom middle" self="top middle">
          <VaultSelectionDropdown 
            v-model="showOpenVaultDropdown" 
            @selected="onVaultSelected"
          />
        </q-menu>
      </q-btn>

      <q-btn flat dense icon="delete" size="sm" @click="handleDeleteVault">
        <q-tooltip>Delete Vault</q-tooltip>
      </q-btn>
    </div>

    <!-- Active Vault Indicator -->
    <div class="active-vault-indicator" v-if="vaultStore.activeVault">
      <q-icon name="storage" size="16px" />
      <span class="vault-name">{{ vaultStore.activeVault.name }}</span>
    </div>

    <!-- Rest of the toolbar remains the same -->
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
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { useVaultStore } from 'src/core/stores/vaultStore'
import VaultCreationDropdown from './VaultCreationDropdown.vue'
import VaultSelectionDropdown from './VaultSelectionDropdown.vue'
import type { MindpadDocument } from 'src/core/types'

const $q = useQuasar()
const vaultStore = useVaultStore()

// Dropdown state
const showNewVaultDropdown = ref(false)
const showOpenVaultDropdown = ref(false)

// Vault operations
async function handleDeleteVault() {
  try {
    await vaultStore.loadAllVaults()
    const activeVault = vaultStore.activeVault
    if (!activeVault) {
      $q.notify({ type: 'warning', message: 'No active vault', timeout: 2000 })
      return
    }

    const confirm = await $q.dialog({
      title: 'Delete Vault',
      message: `Delete vault "${activeVault.name}"? This will remove it from your vaults list but the actual vault data on Google Drive will be preserved.`,
      cancel: true,
      persistent: true
    })
    
    if (!confirm) return

    await vaultStore.deleteExistingVault(activeVault.id)
    $q.notify({ type: 'positive', message: 'Vault deleted', timeout: 2000 })
  } catch (error) {
    console.error('Failed to delete vault:', error)
    $q.notify({ type: 'error', message: 'Failed to delete vault', timeout: 3000 })
  }
}

function onVaultCreated() {
  // Refresh vault list if needed
  showNewVaultDropdown.value = false
}

function onVaultSelected() {
  // Vault selection handled by dropdown
  showOpenVaultDropdown.value = false
}

// File operations remain the same
async function handleAddFile() {
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

// View operations remain the same
function handleExpandAll() {
  emit('expand-all')
}

function handleCollapseAll() {
  emit('collapse-all')
}

const emit = defineEmits([
  'expand-all',
  'collapse-all'
])
</script>

<style scoped lang="scss">
.vault-toolbar {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  background: rgba(0, 0, 0, 0.02);

  .body--dark & {
    border-bottom-color: rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.02);
  }
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 2px;
}

.active-vault-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  margin-left: 8px;
  border-left: 1px solid rgba(0, 0, 0, 0.1);
  
  .body--dark & {
    border-left-color: rgba(255, 255, 255, 0.1);
  }
}

.vault-name {
  font-size: 13px;
  font-weight: 500;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
```

### Step 5: Update Vault Store for Delete Operation

```typescript
/**
 * Delete a vault - removes from vaults index but doesn't delete actual vault data
 * (Actual vault deletion will be implemented in Phase 8 with Google Drive integration)
 */
async function deleteExistingVault(vaultId: string, source: EventSource = 'store') {
  try {
    isLoading.value = true
    error.value = null

    // Remove from vaults index
    await VaultMetadataService.removeVaultFromIndex(vaultId)

    // If this was the active vault, we need to handle it
    if (activeVault.value?.id === vaultId) {
      // Clear active vault
      activeVault.value = null
      vaultStructure.value = []
      
      // If there are other vaults, activate the first one
      const vaultsIndex = await VaultMetadataService.getVaultsIndex()
      if (vaultsIndex.vaults.length > 0) {
        await activateVault(vaultsIndex.vaults[0].id, source)
      }
    }

    // Update local state
    await loadAllVaults(source)

    vaultRevision.value++

    // Emit event
    eventBus.emit('vault:deleted', { vaultId, source })
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to delete vault'
    eventBus.emit('vault:error', { error: err as Error, operation: 'deleteExistingVault', source })
    throw err
  } finally {
    isLoading.value = false
  }
}
```

## 📁 File Structure Changes

```
src/
├── core/
│   ├── services/
│   │   ├── vaultMetadataService.ts    ← NEW: Vault metadata management
│   │   └── vaultStore.ts             ← UPDATED: Single vault architecture
│   │
│   └── stores/
│       └── vaultStore.ts             ← UPDATED: Single vault architecture
│
└── features/
    └── vault/
        └── components/
            ├── VaultToolbar.vue              ← UPDATED with dropdowns
            ├── VaultTree.vue                ← Minor updates
            ├── VaultTreeItem.vue            ← No changes needed
            ├── VaultCreationDropdown.vue    ← NEW
            └── VaultSelectionDropdown.vue   ← NEW
```

## 🧪 Testing Plan

### Updated Test Cases

1. **Vault Creation Test**
   - Verify warning is shown about replacing current vault
   - Verify new vault is created
   - Verify old vault data is cleared
   - Verify new vault appears in vaults list

2. **Vault Selection Test**
   - Create multiple vaults
   - Verify warning is shown about replacing current vault
   - Select different vault
   - Verify active vault changes
   - Verify old vault data is cleared

3. **Vault Deletion Test**
   - Create multiple vaults
   - Delete a vault
   - Verify vault is removed from vaults list
   - Verify if active vault was deleted, another vault becomes active

4. **Single Vault Constraint Test**
   - Verify only one vault exists in IndexedDB at a time
   - Verify vault switching replaces IndexedDB content
   - Verify new vault creation replaces IndexedDB content

## 🎯 Success Criteria (Updated)

### Core Functionality
- [ ] ✅ Only one vault stored in IndexedDB at a time
- [ ] ✅ Vault switching replaces IndexedDB content
- [ ] ✅ New vault creation replaces IndexedDB content
- [ ] ✅ Vaults index (.vaults) contains metadata for all vaults

### UI/UX Improvements
- [ ] ✅ No browser popups used for vault operations
- [ ] ✅ Dropdown menus for new vault creation
- [ ] ✅ Dropdown menus for vault selection
- [ ] ✅ Visual indication of active vault
- [ ] ✅ Warnings about data loss when switching/creating vaults
- [ ] ✅ Better user experience overall

### Technical Requirements
- [ ] ✅ Uses vault metadata service for .vaults management
- [ ] ✅ Proper event handling for vault changes
- [ ] ✅ Type-safe components
- [ ] ✅ Responsive design
- [ ] ✅ Accessibility compliant
- [ ] ✅ No breaking changes to existing functionality

### Phase 8 Preparation
- [ ] ✅ Architecture ready for Google Drive integration
- [ ] ✅ Vault metadata service can be extended for cloud sync
- [ ] ✅ Vault activation can be extended to download from Google Drive

## 📊 Estimated Timeline (Updated)

| Task | Estimated Time |
|------|---------------|
| Create VaultMetadataService | 2-3 hours |
| Update VaultStore for single vault | 3-4 hours |
| Create VaultCreationDropdown.vue | 1-2 hours |
| Create VaultSelectionDropdown.vue | 1-2 hours |
| Update VaultToolbar.vue | 1 hour |
| Update VaultTree.vue | 1 hour |
| Write unit tests | 3-4 hours |
| Integration testing | 2-3 hours |
| Manual testing | 1-2 hours |
| Documentation | 1 hour |

**Total**: 15-22 hours

## 🔮 Future Considerations

### Phase 8 Integration Points

1. **Google Drive Vault Download**: The `activateVault` method will be extended to:
   - Download vault content from Google Drive
   - Store in IndexedDB
   - Update vault metadata

2. **Vault Upload**: When creating new vaults, the content will be:
   - Created in IndexedDB
   - Uploaded to Google Drive
   - Added to .vaults index

3. **Sync Status**: The UI will show:
   - Sync status indicators
   - Last sync time
   - Sync errors

### Potential Enhancements

1. **Vault Cache**: Consider caching recently used vaults (within IndexedDB limits)
2. **Vault Preview**: Show preview of vault content before switching
3. **Vault Backup**: Add backup/restore functionality
4. **Vault Export/Import**: Add export to file and import from file

## ✅ Conclusion

This updated plan reflects the correct system architecture where only one vault is stored in IndexedDB at a time. The implementation focuses on:

1. **Single Vault Management**: Proper handling of vault replacement in IndexedDB
2. **Vault Metadata**: Management of .vaults index file
3. **User Experience**: Better UI with dropdowns and warnings
4. **Phase 8 Preparation**: Architecture ready for Google Drive integration

**Key Differences from Original Plan**:
- Vault switching now involves replacing IndexedDB content
- Vault metadata is managed separately in .vaults index
- Warnings about data loss are crucial
- Architecture is prepared for Phase 8 sync

**Next Steps**:
1. Implement VaultMetadataService
2. Update VaultStore for single vault architecture
3. Create new dropdown components
4. Update existing UI components
5. Write comprehensive tests
6. Perform manual testing
7. Document the changes

**Priority**: Medium-High (Should be done before Phase 8 - Sync)