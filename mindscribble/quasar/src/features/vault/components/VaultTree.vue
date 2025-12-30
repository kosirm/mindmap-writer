<template>
  <div class="vault-tree">
    <!-- Vault Toolbar -->
    <VaultToolbar
      @add-file="addFileToRoot"
      @add-folder="addFolderToRoot"
      @new-vault="handleNewVault"
      @open-vault="handleOpenVault"
      @delete-vault="handleDeleteVault"
      @expand-all="expandAll"
      @collapse-all="collapseAll"
    />

    <!-- Tree -->
    <div class="vault-tree-container">
      <Draggable
        v-if="treeData.length > 0"
        ref="treeRef"
        v-model="treeData"
        class="vault-tree-content"
        :indent="16"
        :triggerClass="TRIGGER_CLASS"
        :rootDroppable="true"
        treeLine
        @change="onTreeChange"
        @drop="validateDrop"
      >
        <template #default="{ node, stat }">
          <VaultTreeItem
            :item="node.item"
            :stat="stat"
            :trigger-class="TRIGGER_CLASS"
          />
        </template>
      </Draggable>

      <!-- Empty state -->
      <div v-else class="vault-empty">
        <q-icon name="folder" size="48px" color="grey-4" />
        <div class="text-body2 text-grey-6 q-mt-md">No vaults yet</div>
        <q-btn
          flat
          color="primary"
          label="Create Vault"
          icon="add"
          class="q-mt-sm"
          @click="handleNewVault"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, provide } from 'vue'
import { Draggable } from '@he-tree/vue'
import { useQuasar } from 'quasar'
import '@he-tree/vue/style/default.css'
import '@he-tree/vue/style/material-design.css'
import VaultTreeItem from './VaultTreeItem.vue'
import VaultToolbar from './VaultToolbar.vue'
import { useVaultStore } from 'src/core/stores/vaultStore'
import { eventBus } from 'src/core/events'
import type { FileSystemItem } from 'src/core/services/indexedDBService'
import type { MindscribbleDocument } from 'src/core/types'
import type { VaultStructureRefreshedPayload, ItemRenamedPayload, ItemDeletedPayload, ItemMovedPayload, FileSelectedPayload } from 'src/core/events'

const TRIGGER_CLASS = 'drag-handle'
const $q = useQuasar()

// Vault store
const vaultStore = useVaultStore()

// Tree reference
const treeRef = ref<InstanceType<typeof Draggable> | null>(null)

// Tree data for he-tree
interface VaultTreeItem {
  id: string
  text: string
  item: FileSystemItem
  children: VaultTreeItem[]
  type: 'vault' | 'folder' | 'file'
}

const treeData = ref<VaultTreeItem[]>([])

// Guard to prevent infinite loops during initialization
const isInitializing = ref(false)

// Centralized selection state
const selectedItemId = ref<string | null>(null)

// Provide method to select an item (deselects all others)
const selectItem = (itemId: string | null) => {
  selectedItemId.value = itemId
}
provide('selectedItemId', selectedItemId)
provide('selectItem', selectItem)

// Provide method to update local tree data (to avoid prop mutation)
const updateLocalTreeItemData = (itemId: string, updates: { name?: string }) => {
  const updateItem = (items: VaultTreeItem[]): boolean => {
    for (const item of items) {
      if (item.id === itemId) {
        if (updates.name !== undefined) {
          item.text = updates.name
          item.item.name = updates.name
          item.item.modified = Date.now()
        }
        return true
      }
      if (updateItem(item.children)) return true
    }
    return false
  }
  updateItem(treeData.value)
}
provide('updateLocalTreeItemData', updateLocalTreeItemData)

/**
 * Build tree structure from vault store
 */
async function buildTreeFromVault(forceReload = false) {
  // Prevent infinite loops during initialization
  if (isInitializing.value && !forceReload) {
    console.log('⚠️ [VaultTree] Skipping buildTreeFromVault - already initializing')
    return
  }

  try {
    isInitializing.value = true

    // Only load vaults if not already loaded or if forced
    if (forceReload || vaultStore.vaults.length === 0) {
      await vaultStore.loadAllVaults()
    }

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
    // Only reload from database if forced or if structure is empty
    if (forceReload || vaultStore.vaultStructure.length === 0) {
      await vaultStore.loadVaultStructure()
    }
    const vaultStructure = vaultStore.vaultStructure

    // Build tree structure from vault items
    const buildTreeFromVaultStructure = (): VaultTreeItem[] => {
      const itemMap = new Map<string, VaultTreeItem>()

      // First pass: Create tree items for all items
      vaultStructure.forEach(item => {
        itemMap.set(item.id, {
          id: item.id,
          text: item.name,
          item: item,
          type: item.type === 'file' ? 'file' : 'folder',
          children: []
        })
      })

      // Second pass: Build hierarchy
      const rootItems: VaultTreeItem[] = []
      itemMap.forEach(treeItem => {
        const parentId = treeItem.item.parentId
        if (parentId) {
          const parent = itemMap.get(parentId)
          if (parent) {
            parent.children.push(treeItem)
          }
        } else {
          rootItems.push(treeItem)
        }
      })

      // Third pass: Sort children by sortOrder
      const sortChildren = (items: VaultTreeItem[]) => {
        items.sort((a, b) => (a.item.sortOrder ?? 0) - (b.item.sortOrder ?? 0))
        items.forEach(item => {
          if (item.children.length > 0) {
            sortChildren(item.children)
          }
        })
      }
      sortChildren(rootItems)

      return rootItems
    }

    treeData.value = buildTreeFromVaultStructure()

  } catch (error) {
    console.error('Failed to build vault tree:', error)
    $q.notify({
      type: 'error',
      message: 'Failed to load vault structure',
      timeout: 3000
    })
    treeData.value = []
  } finally {
    isInitializing.value = false
  }
}

/**
 * Validate drop operation - files can only be dropped into folders
 */
function validateDrop(dropInfo: { targetId: string; sourceId: string; dropPosition: string }) {
  const { targetId, sourceId, dropPosition } = dropInfo

  // Find target and source items
  const findItem = (items: VaultTreeItem[]): VaultTreeItem | null => {
    for (const item of items) {
      if (item.id === targetId || item.id === sourceId) return item
      const found = findItem(item.children)
      if (found) return found
    }
    return null
  }

  const targetItem = findItem(treeData.value)
  const sourceItem = findItem(treeData.value)

  if (!targetItem || !sourceItem) return false

  // Cannot drop files into other files
  if (targetItem.type === 'file' && dropPosition === 'inside') {
    $q.notify({
      type: 'warning',
      message: 'Cannot drop files into other files',
      timeout: 2000
    })
    return false
  }

  // Cannot drop vaults (they are root level only)
  if (sourceItem.type === 'vault') {
    $q.notify({
      type: 'warning',
      message: 'Vaults cannot be moved',
      timeout: 2000
    })
    return false
  }

  return true
}

/**
 * Handle tree changes from drag-and-drop
 */
async function onTreeChange() {
  // Extract hierarchy from current tree structure
  const extractHierarchy = (
    items: VaultTreeItem[],
    parentId: string | null = null
  ): Array<{ itemId: string; parentId: string | null; order: number }> => {
    const result: Array<{ itemId: string; parentId: string | null; order: number }> = []

    items.forEach((item, index) => {
      result.push({ itemId: item.id, parentId, order: index })

      if (item.children.length > 0) {
        const childData = extractHierarchy(item.children, item.id)
        result.push(...childData)
      }
    })

    return result
  }

  const newHierarchy = extractHierarchy(treeData.value)

  // Apply changes to file system
  for (const { itemId, parentId, order } of newHierarchy) {
    try {
      await vaultStore.moveExistingItem(itemId, parentId, order)
    } catch (error) {
      console.error(`Failed to move item ${itemId}:`, error)
      // Rebuild tree to revert changes - reload from database
      await buildTreeFromVault(true)
      break
    }
  }
}

// Actions
async function addFileToRoot() {
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
    await buildTreeFromVault(true)

    $q.notify({ type: 'positive', message: 'File created', timeout: 2000 })
  } catch (error) {
    console.error('Failed to create file:', error)
    $q.notify({ type: 'error', message: 'Failed to create file', timeout: 3000 })
  }
}

async function addFolderToRoot() {
  try {
    await vaultStore.loadAllVaults()
    const activeVault = vaultStore.activeVault
    if (!activeVault) {
      $q.notify({ type: 'warning', message: 'No active vault', timeout: 2000 })
      return
    }

    await vaultStore.createNewFolder(null, 'New Folder')
    await buildTreeFromVault(true)

    $q.notify({ type: 'positive', message: 'Folder created', timeout: 2000 })
  } catch (error) {
    console.error('Failed to create folder:', error)
    $q.notify({ type: 'error', message: 'Failed to create folder', timeout: 3000 })
  }
}

async function handleNewVault() {
  try {
    const vaultName = prompt('Enter vault name:', 'My Vault')
    if (!vaultName) return

    await vaultStore.createNewVault(vaultName, 'New vault')
    await buildTreeFromVault(true)

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
    await buildTreeFromVault(true)

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
    await buildTreeFromVault(true)

    $q.notify({ type: 'positive', message: 'Vault deleted', timeout: 2000 })
  } catch (error) {
    console.error('Failed to delete vault:', error)
    $q.notify({ type: 'error', message: 'Failed to delete vault', timeout: 3000 })
  }
}

function expandAll() {
  // Expand all nodes
  const expandAllNodes = (items: VaultTreeItem[]) => {
    items.forEach(item => {
      if (item.children.length > 0) {
        // This would be handled by the tree component's internal state
      }
      expandAllNodes(item.children)
    })
  }
  expandAllNodes(treeData.value)
}

function collapseAll() {
  // Collapse all nodes
  const collapseAllNodes = (items: VaultTreeItem[]) => {
    items.forEach(item => {
      if (item.children.length > 0) {
        // This would be handled by the tree component's internal state
      }
      collapseAllNodes(item.children)
    })
  }
  collapseAllNodes(treeData.value)
}



// Event handlers for vault events
function handleStructureRefresh(payload: VaultStructureRefreshedPayload) {
  // Ignore events from vault-tree source (this view)
  if (payload.source === 'vault-tree') {
    return
  }

  // For events from store, just rebuild from the already-loaded store data
  // Don't reload from database to avoid circular dependency
  void buildTreeFromVault(false)
}

function handleItemRenamed(payload: ItemRenamedPayload) {
  // Ignore events from vault-tree source (this view)
  if (payload.source === 'vault-tree') {
    return
  }

  // For events from other sources, update the local tree item
  updateLocalTreeItemData(payload.itemId, { name: payload.newName })
}

function handleItemDeleted(payload: ItemDeletedPayload) {
  if (payload.source !== 'vault-tree') {
    // Don't reload from database - use the already updated store data
    void buildTreeFromVault(false)
  }
}

function handleItemMoved(payload: ItemMovedPayload) {
  if (payload.source !== 'vault-tree') {
    // Don't reload from database - use the already updated store data
    void buildTreeFromVault(false)
  }
}

function handleDockviewFileActivated(payload: FileSelectedPayload) {
  // When a file is activated in dockview, select it in the vault tree
  if (payload.fileId) {
    console.log('📂 Dockview file activated, selecting in vault:', payload.fileName, payload.fileId)
    // Use the selectItem function to highlight the file in the tree
    selectItem(payload.fileId)
    // Also update the vault store selection (but don't emit event to avoid loop)
    // The 'dockview' source will prevent the vault store from emitting another event
    vaultStore.selectFile(payload.fileId, 'dockview')
  }
}

// Mount and unmount event listeners
onMounted(() => {
  // Add vault event listeners
  eventBus.on('vault:structure-refreshed', handleStructureRefresh)
  eventBus.on('vault:item-renamed', handleItemRenamed)
  eventBus.on('vault:item-deleted', handleItemDeleted)
  eventBus.on('vault:item-moved', handleItemMoved)

  // Add dockview event listener
  eventBus.on('dockview:file-activated', handleDockviewFileActivated)

  // Initial load - force reload from database
  void buildTreeFromVault(true)
})

onUnmounted(() => {
  // Clean up vault event listeners
  eventBus.off('vault:structure-refreshed', handleStructureRefresh)
  eventBus.off('vault:item-renamed', handleItemRenamed)
  eventBus.off('vault:item-deleted', handleItemDeleted)
  eventBus.off('vault:item-moved', handleItemMoved)

  // Clean up dockview event listener
  eventBus.off('dockview:file-activated', handleDockviewFileActivated)
})

// Note: We removed the watchers for vaultStructure and activeVault
// because they were causing circular dependencies.
// We rely on events (vault:structure-refreshed, vault:item-renamed, etc.)
// and the initial load in onMounted() instead.
</script>

<style scoped lang="scss">
.vault-tree {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  color: #1d1d1d;

  // Dark mode
  .body--dark & {
    background: #1d1d1d;
    color: #ffffff;
  }
}

.vault-tree-container {
  flex: 1;
  padding: 8px;
  overflow-y: auto;
}

.vault-tree-content {
  padding: 4px 0;
}

.vault-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 32px;
}

// Override he-tree default styles for vault view
:deep(.he-tree) {
  .tree-node {
    margin-bottom: 0;
  }

  // Show tree lines for vault view
  .tree-line {
    display: block;
    border-color: rgba(0, 0, 0, 0.1);
    margin: 0;
    padding: 0;

    .body--dark & {
      border-color: rgba(255, 255, 255, 0.1);
    }
  }
}

// Drag placeholder styling
:deep(.he-tree-drag-placeholder) {
  background-color: rgba(25, 118, 210, 0.1);
  border: 2px dashed rgba(25, 118, 210, 0.4);
  border-radius: 4px;
  min-height: 32px;
}
</style>
