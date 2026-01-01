# Phase 7: Active Vault UI Implementation Plan

## 🎯 Overview

This document outlines the implementation plan for Phase 7: Active Vault UI changes, which focuses on improving the user experience for vault management by replacing browser popups with dropdown menus and providing better vault selection functionality.

### Key Changes Required

1. **Replace browser popup for new vault creation** with a dropdown input field under the + button
2. **Replace browser popup for vault selection** with a dropdown showing all vaults from IndexedDB
3. **Leverage the existing vault store** for all communication with IndexedDB
4. **Prepare for Phase 8 (Sync)** by ensuring the UI can handle Google Drive vault loading

## 🔍 Current State Analysis

### Current UI Structure

- **VaultToolbar.vue**: Contains buttons for vault operations (New Vault, Open Vault, Delete Vault)
- **VaultTree.vue**: Main tree component that displays vault structure
- **VaultTreeItem.vue**: Individual tree items

### Current Issues

- ❌ Uses `prompt()` for vault name input (bad UX)
- ❌ Uses `alert()`/`confirm()` for vault operations (bad UX)
- ❌ No visual indication of available vaults for selection
- ❌ No dropdown menus for better UX

### Existing Vault Store Capabilities

The vault store provides:
- ✅ `createNewVault(name, description)` - Create new vault
- ✅ `loadAllVaults()` - Load all vaults from IndexedDB
- ✅ `activateVault(vaultId)` - Set active vault
- ✅ `vaults` - Reactive array of all vaults
- ✅ `activeVault` - Reactive reference to active vault

## 🏗️ Implementation Plan

### Step 1: Create New UI Components

#### 1.1 VaultCreationDropdown.vue

**Location**: `src/features/vault/components/VaultCreationDropdown.vue`

**Purpose**: Replace browser popup with a dropdown input for new vault creation

```vue
<template>
  <q-menu ref="menuRef" :model-value="showDropdown" @update:model-value="updateShowDropdown">
    <q-card style="width: 300px; max-width: 80vw;">
      <q-card-section>
        <div class="text-h6">Create New Vault</div>
      </q-card-section>

      <q-card-section>
        <q-input
          v-model="vaultName"
          label="Vault Name"
          dense
          autofocus
          @keyup.enter="createVault"
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

#### 1.2 VaultSelectionDropdown.vue

**Location**: `src/features/vault/components/VaultSelectionDropdown.vue`

**Purpose**: Replace browser popup with a dropdown showing all available vaults

```vue
<template>
  <q-menu ref="menuRef" :model-value="showDropdown" @update:model-value="updateShowDropdown">
    <q-card style="width: 300px; max-width: 80vw;">
      <q-card-section>
        <div class="text-h6">Select Vault</div>
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

### Step 2: Update VaultToolbar.vue

**Changes needed**:

1. Replace `prompt()` calls with dropdown components
2. Add state management for dropdown visibility
3. Update button click handlers

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
import type { MindscribbleDocument } from 'src/core/types'

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

    const confirm = window.confirm(`Delete vault "${activeVault.name}"? This cannot be undone.`)
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
```

### Step 3: Update VaultTree.vue for Active Vault Indication

Add visual indication for the active vault in the tree header:

```vue
<!-- Add to VaultTree.vue template, above the tree -->
<div class="vault-header" v-if="vaultStore.activeVault">
  <q-icon name="storage" size="20px" color="teal-6" />
  <span class="vault-name">{{ vaultStore.activeVault.name }}</span>
  <q-badge color="positive" label="Active" class="active-badge" />
  <q-btn 
    flat dense round 
    icon="edit" 
    @click="renameActiveVault"
    class="rename-btn"
  />
</div>

<!-- Add corresponding CSS -->
.vault-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--ms-border);
  background-color: var(--ms-surface);
  font-weight: 600;
  color: var(--ms-text-primary);
}

.vault-name {
  flex: 1;
  font-size: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.active-badge {
  margin-left: 8px;
  font-size: 11px;
  padding: 2px 6px;
}

.rename-btn {
  opacity: 0.7;
  transition: opacity 0.2s;
}

.rename-btn:hover {
  opacity: 1;
}
```

### Step 4: Add Vault Renaming Functionality

Add a method to VaultTree.vue for renaming the active vault:

```typescript
async function renameActiveVault() {
  const activeVault = vaultStore.activeVault
  if (!activeVault) return
  
  const newName = prompt('Rename vault:', activeVault.name)
  if (!newName || newName === activeVault.name) return
  
  try {
    await vaultStore.renameExistingVault(activeVault.id, newName)
    $q.notify({ 
      type: 'positive', 
      message: 'Vault renamed successfully', 
      timeout: 2000 
    })
  } catch (error) {
    console.error('Failed to rename vault:', error)
    $q.notify({ 
      type: 'error', 
      message: 'Failed to rename vault', 
      timeout: 3000 
    })
  }
}
```

### Step 5: Update Event Handling

Ensure proper event handling for vault changes:

```typescript
// In VaultTree.vue onMounted
onMounted(() => {
  // Listen to vault events
  eventBus.on('vault:created', () => {
    void buildTreeFromVault(false)
  })

  eventBus.on('vault:activated', () => {
    void buildTreeFromVault(false)
  })

  eventBus.on('vault:renamed', () => {
    void buildTreeFromVault(false)
  })

  // Initial load
  void buildTreeFromVault(true)
})

onUnmounted(() => {
  // Clean up event listeners
  eventBus.off('vault:created')
  eventBus.off('vault:activated')
  eventBus.off('vault:renamed')
})
```

## 📁 File Structure Changes

```
src/features/vault/components/
├── VaultToolbar.vue              ← Updated with dropdowns
├── VaultTree.vue                ← Added active vault header
├── VaultTreeItem.vue            ← No changes needed
├── VaultCreationDropdown.vue    ← NEW
└── VaultSelectionDropdown.vue   ← NEW
```

## 🧪 Testing Plan

### Unit Tests

1. **VaultCreationDropdown.spec.ts**
   - Test dropdown visibility
   - Test vault creation with valid name
   - Test validation (empty name)
   - Test event emission

2. **VaultSelectionDropdown.spec.ts**
   - Test dropdown visibility
   - Test vault list loading
   - Test vault selection
   - Test active vault indication

3. **VaultToolbar.spec.ts**
   - Test dropdown state management
   - Test button click handlers
   - Test event propagation

### Integration Tests

1. **Vault Creation Flow**
   - Click New Vault button
   - Enter vault name
   - Verify vault is created
   - Verify vault appears in selection dropdown

2. **Vault Selection Flow**
   - Create multiple vaults
   - Click Open Vault button
   - Select different vault
   - Verify active vault changes
   - Verify tree updates

3. **Active Vault Indication**
   - Verify active vault badge is shown
   - Verify vault name is displayed
   - Verify rename functionality works

### Manual Testing

- [ ] Create new vault using dropdown
- [ ] Select vault using dropdown
- [ ] Verify active vault indication
- [ ] Rename active vault
- [ ] Delete vault
- [ ] Verify no browser popups are used
- [ ] Verify responsive design
- [ ] Test on mobile devices

## 🎯 Success Criteria

### UI/UX Improvements
- [ ] ✅ No browser popups used for vault operations
- [ ] ✅ Dropdown menus for new vault creation
- [ ] ✅ Dropdown menus for vault selection
- [ ] ✅ Visual indication of active vault
- [ ] ✅ Vault renaming functionality
- [ ] ✅ Better user experience overall

### Technical Requirements
- [ ] ✅ Uses existing vault store
- [ ] ✅ Proper event handling
- [ ] ✅ Type-safe components
- [ ] ✅ Responsive design
- [ ] ✅ Accessibility compliant
- [ ] ✅ No breaking changes to existing functionality

### Testing
- [ ] ✅ All unit tests pass
- [ ] ✅ All integration tests pass
- [ ] ✅ Manual testing completed
- [ ] ✅ No regressions in existing functionality

## 📊 Estimated Timeline

| Task | Estimated Time |
|------|---------------|
| Create VaultCreationDropdown.vue | 1-2 hours |
| Create VaultSelectionDropdown.vue | 1-2 hours |
| Update VaultToolbar.vue | 1 hour |
| Update VaultTree.vue | 1 hour |
| Add event handling | 1 hour |
| Write unit tests | 2-3 hours |
| Integration testing | 1-2 hours |
| Manual testing | 1 hour |
| Documentation | 1 hour |

**Total**: 9-14 hours

## 🔮 Future Considerations

### Phase 8 Preparation

The current implementation is designed to be easily extended for Phase 8 (Sync):

1. **Google Drive Integration**: The vault selection dropdown can be extended to show vaults from Google Drive
2. **Sync Status**: Active vault header can show sync status indicators
3. **Cloud Icons**: Vault items can show cloud sync icons when Google Drive integration is added

### Potential Enhancements

1. **Vault Search**: Add search functionality to vault selection dropdown
2. **Vault Tags**: Add tagging system for better vault organization
3. **Vault Sorting**: Add sorting options (name, date, size)
4. **Vault Favorites**: Add favorite vaults for quick access

## ✅ Conclusion

This plan provides a comprehensive approach to implementing Phase 7: Active Vault UI changes while leveraging the existing vault store infrastructure. The implementation focuses on improving user experience by replacing browser popups with modern dropdown menus and providing better visual feedback for vault management operations.

**Next Steps**:
1. Implement the new dropdown components
2. Update the toolbar and tree components
3. Write comprehensive tests
4. Perform manual testing
5. Document the changes

**Priority**: Medium-High (Should be done before Phase 8 - Sync)