<template>
  <div class="vault-toolbar">
   <!-- Vault Operations -->
   <div class="toolbar-section">
     <!-- New Vault with Dialog -->
     <q-btn
       flat
       dense
       icon="add"
       size="sm"
       @click="handleCreateVault"
       clickable
     >
       <q-tooltip>New Vault</q-tooltip>
     </q-btn>

     <!-- Open Vault with Dialog -->
     <q-btn
       flat
       dense
       icon="folder_open"
       size="sm"
       @click="handleOpenVault"
       clickable
     >
       <q-tooltip>Open Vault</q-tooltip>
     </q-btn>

     <q-btn flat dense icon="delete" size="sm" @click="handleDeleteVault">
       <q-tooltip>Delete Vault</q-tooltip>
     </q-btn>
   </div>

   <!-- Active Vault Indicator - Removed as per requirements -->
   <!-- <div class="active-vault-indicator" v-if="vaultStore.activeVault">
     <q-icon name="storage" size="16px" />
     <span class="vault-name">{{ vaultStore.activeVault.name }}</span>
   </div> -->

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
import type { MindpadDocument } from 'src/core/types'
import VaultCreationDialog from './VaultCreationDialog.vue'
import VaultSelectionDialog from './VaultSelectionDialog.vue'

console.log('🔧 [VaultToolbar] Component loaded')

const $q = useQuasar()
const vaultStore = useVaultStore()

console.log('🔧 [VaultToolbar] $q:', !!$q, 'vaultStore:', !!vaultStore)

/**
 * Handle vault creation with dialog
 */
async function handleCreateVault() {
  console.log('🔧 [VaultToolbar] handleCreateVault called')
  try {
    // Show vault creation dialog
    console.log('🔧 [VaultToolbar] Opening VaultCreationDialog')
    console.log('🔧 [VaultToolbar] $q.dialog available:', !!$q.dialog)

    const result = await new Promise<{name: string, description: string} | null>((resolve, reject) => {
      try {
        const dialogRef = $q.dialog({
          component: VaultCreationDialog,
          componentProps: {
            // Props will be handled by the dialog component
          },
          cancel: true,
          persistent: true
        })

        console.log('🔧 [VaultToolbar] Dialog created:', !!dialogRef)

        dialogRef.onOk((vaultData: {name: string, description: string}) => {
          console.log('🔧 [VaultToolbar] Dialog OK:', vaultData)
          resolve(vaultData)
        })
        .onCancel(() => {
          console.log('🔧 [VaultToolbar] Dialog cancelled')
          resolve(null)
        })
        .onDismiss(() => {
          console.log('🔧 [VaultToolbar] Dialog dismissed')
          resolve(null)
        })
      } catch (err) {
        console.error('🔧 [VaultToolbar] Error creating dialog:', err)
        reject(new Error('Failed to create dialog'))
      }
    })

    if (!result) return

    const { name, description } = result
    if (!name.trim()) return

    // Show warning about replacing current vault
    const confirm = await new Promise((resolve) => {
      $q.dialog({
        title: 'Replace Current Vault?',
        message: 'Creating a new vault will replace your current vault. All unsaved changes will be lost. Continue?',
        cancel: true,
        persistent: true
      }).onOk(() => resolve(true)).onCancel(() => resolve(false)).onDismiss(() => resolve(false))
    })

    if (!confirm) return

    // Create the vault
    await vaultStore.createNewVault(name.trim(), description.trim())

    $q.notify({
      type: 'positive',
      message: `Vault "${name}" created`,
      timeout: 2000
    })
  } catch (error) {
    console.error('Failed to create vault:', error)
    $q.notify({
      type: 'error',
      message: 'Failed to create vault',
      timeout: 3000
    })
  }
}

/**
 * Handle vault selection with dialog
 */
async function handleOpenVault() {
  console.log('🔧 [VaultToolbar] handleOpenVault called')
  try {
    // Load vaults first
    await vaultStore.loadAllVaults()
    const vaults = vaultStore.vaults
    console.log('🔧 [VaultToolbar] Loaded vaults:', vaults.length)

    if (vaults.length === 0) {
      $q.notify({
        type: 'info',
        message: 'No vaults available',
        timeout: 2000
      })
      return
    }

    // Show vault selection dialog
    const result = await new Promise<string | null>((resolve) => {
      $q.dialog({
        component: VaultSelectionDialog,
        componentProps: {
          vaults: vaults,
          activeVaultId: vaultStore.activeVault?.id || null
        },
        cancel: true,
        persistent: true
      }).onOk((vaultId: string) => resolve(vaultId))
        .onCancel(() => resolve(null))
        .onDismiss(() => resolve(null))
    })

    if (!result) return

    const vaultId = result

    // Show warning about replacing current vault
    const confirm = await new Promise((resolve) => {
      $q.dialog({
        title: 'Replace Current Vault?',
        message: 'Selecting another vault will replace your current vault. All unsaved changes will be lost. Continue?',
        cancel: true,
        persistent: true
      }).onOk(() => resolve(true)).onCancel(() => resolve(false)).onDismiss(() => resolve(false))
    })

    if (!confirm) return

    // Activate the selected vault
    await vaultStore.activateVault(vaultId, 'vault-toolbar')

    $q.notify({
      type: 'positive',
      message: 'Vault activated',
      timeout: 2000
    })
  } catch (error) {
    console.error('Failed to activate vault:', error)
    $q.notify({
      type: 'error',
      message: 'Failed to activate vault',
      timeout: 3000
    })
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

    const confirm = await new Promise((resolve) => {
      $q.dialog({
        title: 'Delete Vault',
        message: `Delete vault "${activeVault.name}"? This will remove it from your vaults list but the actual vault data on Google Drive will be preserved.`,
        cancel: true,
        persistent: true
      }).onOk(() => resolve(true)).onCancel(() => resolve(false)).onDismiss(() => resolve(false))
    })

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
  console.log('🔧 [VaultToolbar] handleAddFile called')
  try {
    await vaultStore.loadAllVaults()
    const activeVault = vaultStore.activeVault
    console.log('🔧 [VaultToolbar] Active vault:', activeVault?.name)
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
  console.log('🔧 [VaultToolbar] handleAddFolder called')
  try {
    await vaultStore.loadAllVaults()
    const activeVault = vaultStore.activeVault
    console.log('🔧 [VaultToolbar] Active vault:', activeVault?.name)
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
