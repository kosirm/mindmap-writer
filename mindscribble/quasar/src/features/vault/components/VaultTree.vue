<template>
  <div class="vault-tree">
    <!-- Vault Toolbar -->
    <VaultToolbar
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
        <div class="text-body2 text-grey-6 q-mt-md">
          {{ vaultStore.vaults.length === 0 ? 'No vaults yet' : 'Vault is empty' }}
        </div>
        <q-btn
          v-if="vaultStore.vaults.length === 0"
          flat
          color="primary"
          label="Create Vault"
          icon="add"
          class="q-mt-sm"
          @click="createNewVault"
        />
        <div v-else class="text-caption text-grey-6 q-mt-sm">
          Use the toolbar to add files and folders
        </div>
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
import type { VaultStructureRefreshedPayload, ItemRenamedPayload, ItemDeletedPayload, ItemMovedPayload, FileSelectedPayload } from 'src/core/events'

const TRIGGER_CLASS = 'item-title-wrapper'
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
    console.log('🌳 [VaultTree] Building tree from vault, forceReload:', forceReload)

    // Only load vaults if not already loaded or if forced
    if (forceReload || vaultStore.vaults.length === 0) {
      console.log('🌳 [VaultTree] Loading all vaults...')
      await vaultStore.loadAllVaults()
    }

    const vaults = vaultStore.vaults
    const activeVault = vaultStore.activeVault
    console.log('🌳 [VaultTree] Vaults loaded:', vaults.length, 'Active vault:', activeVault?.name)

    // If no vaults exist, show empty state
    if (vaults.length === 0) {
      console.log('🌳 [VaultTree] No vaults found, showing empty state')
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
      console.log('🌳 [VaultTree] Loading vault structure...')
      await vaultStore.loadVaultStructure()
    }
    const vaultStructure = vaultStore.vaultStructure
    console.log('🌳 [VaultTree] Vault structure loaded:', vaultStructure.length, 'items')

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
 * Validate drop operation using he-tree's dragContext
 * Prevent files from being dropped into other files
 */
function validateDrop() {
  // Use he-tree's dragContext to get the drag and drop information
  // Import dragContext from '@he-tree/vue' to access:
  // - dragContext.dragNode: the node being dragged
  // - dragContext.targetInfo: information about the drop target
  // - dragContext.closestNode: the closest node being hovered over

  // For now, we'll handle validation in onTreeChange where we have
  // full access to the tree structure and can fix invalid hierarchies
  return true
}

/**
 * Handle tree changes from drag-and-drop
 */
async function onTreeChange() {
  console.log('🔍 [onTreeChange] Tree structure changed, extracting hierarchy')

  // First, fix any invalid hierarchies (files containing other files)
  const fixInvalidHierarchies = (items: VaultTreeItem[]): boolean => {
    let fixedSomething = false

    items.forEach((item, index) => {
      // If this is a file with children, move all children to be siblings
      if (item.type === 'file' && item.children.length > 0) {
        console.log(`🔍 [fixInvalidHierarchies] Found file with children: ${item.text} (${item.id})`)

        // Move all children to be siblings after this file
        const childrenToMove = [...item.children]
        item.children = [] // Clear the children from the file

        // Insert children after the current item
        items.splice(index + 1, 0, ...childrenToMove)
        fixedSomething = true

        console.log(`🔍 [fixInvalidHierarchies] Moved ${childrenToMove.length} children to be siblings`)
      }

      // Recursively check children
      if (item.children.length > 0) {
        const childrenFixed = fixInvalidHierarchies(item.children)
        if (childrenFixed) {
          fixedSomething = true
        }
      }
    })

    return fixedSomething
  }

  // Apply the fix
  const hierarchiesFixed = fixInvalidHierarchies(treeData.value)
  if (hierarchiesFixed) {
    console.log('🔍 [onTreeChange] Fixed invalid hierarchies, re-extracting structure')
  }

  // Extract hierarchy from current tree structure
  const extractHierarchy = (
    items: VaultTreeItem[],
    parentId: string | null = null
  ): Array<{ itemId: string; parentId: string | null; order: number }> => {
    const result: Array<{ itemId: string; parentId: string | null; order: number }> = []

    items.forEach((item, index) => {
      console.log(`🔍 [extractHierarchy] Item: ${item.text} (${item.type}), parent: ${parentId || 'root'}, order: ${index}`)
      result.push({ itemId: item.id, parentId, order: index })

      if (item.children.length > 0) {
        const childData = extractHierarchy(item.children, item.id)
        result.push(...childData)
      }
    })

    return result
  }

  const newHierarchy = extractHierarchy(treeData.value)
  console.log('🔍 [onTreeChange] Extracted hierarchy:', newHierarchy)

  // Apply changes to file system
  for (const { itemId, parentId, order } of newHierarchy) {
    try {
      console.log(`🔍 [onTreeChange] Moving item ${itemId} to parent ${parentId || 'root'}, order ${order}`)
      await vaultStore.moveExistingItem(itemId, parentId, order, 'vault-tree')
    } catch (error) {
      console.error(`Failed to move item ${itemId}:`, error)
      // Rebuild tree to revert changes - reload from database
      await buildTreeFromVault(true)
      break
    }
  }
}

/**
 * Create a new vault
 */
async function createNewVault() {
  try {
    // Use Quasar dialog instead of browser prompt
    const result = await new Promise<string | null>((resolve) => {
      $q.dialog({
        title: 'Create New Vault',
        message: 'Enter vault name:',
        prompt: {
          model: 'My Vault',
          type: 'text'
        },
        cancel: true,
        persistent: true
      }).onOk((vaultName: string) => resolve(vaultName))
        .onCancel(() => resolve(null))
        .onDismiss(() => resolve(null))
    })

    if (!result) return

    const vaultName = result.trim()
    if (!vaultName) return

    await vaultStore.createNewVault(vaultName, 'New vault')
    await buildTreeFromVault(true)

    $q.notify({ type: 'positive', message: 'Vault created', timeout: 2000 })
  } catch (error) {
    console.error('Failed to create vault:', error)
    $q.notify({ type: 'error', message: 'Failed to create vault', timeout: 3000 })
  }
}

function expandAll() {
  // Expand all nodes in the tree
  // The tree component (he-tree) handles expansion state internally
  // This is a placeholder for future implementation if needed
  console.log('Expand all functionality - tree component manages its own state')
}

function collapseAll() {
  // Collapse all nodes in the tree
  // The tree component (he-tree) handles collapse state internally
  // This is a placeholder for future implementation if needed
  console.log('Collapse all functionality - tree component manages its own state')
}



// Event handlers for vault events
function handleStructureRefresh(payload: VaultStructureRefreshedPayload) {
  // Ignore events from vault-tree source (this view)
  if (payload.source === 'vault-tree') {
    return
  }

  console.log('🌳 [VaultTree] Structure refresh event received, rebuilding tree from store data')

  // Just rebuild the tree from the already-loaded vaultStore.vaultStructure
  // Don't call buildTreeFromVault() to avoid triggering loadVaultStructure() again
  const vaultStructure = vaultStore.vaultStructure

  if (vaultStructure.length === 0) {
    treeData.value = []
    return
  }

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

function handleFileCreated() {
  console.log('🌳 [VaultTree] File created event received, rebuilding tree')
  // Rebuild tree from the already-updated store data
  void buildTreeFromVault(false)
}

function handleFolderCreated() {
  console.log('🌳 [VaultTree] Folder created event received, rebuilding tree')
  // Rebuild tree from the already-updated store data
  void buildTreeFromVault(false)
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
/**
 * Handle vault created event
 */
function handleVaultCreated() {
  console.log('🌳 [VaultTree] Vault created, rebuilding tree')
  void buildTreeFromVault(true)
}

/**
 * Handle vault activated event
 */
function handleVaultActivated() {
  console.log('🌳 [VaultTree] Vault activated, rebuilding tree')
  void buildTreeFromVault(true)
}

onMounted(() => {
  // Add vault event listeners
  eventBus.on('vault:structure-refreshed', handleStructureRefresh)
  eventBus.on('vault:item-renamed', handleItemRenamed)
  eventBus.on('vault:item-deleted', handleItemDeleted)
  eventBus.on('vault:item-moved', handleItemMoved)
  eventBus.on('vault:file-created', handleFileCreated)
  eventBus.on('vault:folder-created', handleFolderCreated)
  eventBus.on('vault:created', handleVaultCreated)
  eventBus.on('vault:activated', handleVaultActivated)

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
  eventBus.off('vault:file-created', handleFileCreated)
  eventBus.off('vault:folder-created', handleFolderCreated)
  eventBus.off('vault:created', handleVaultCreated)
  eventBus.off('vault:activated', handleVaultActivated)

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

// Remove red circle indicator during drag operations
:deep(.he-tree-drag-over) {
  position: relative;
}

:deep(.he-tree-drag-over::before) {
  display: none !important;
}

:deep(.he-tree-drag-over-circle) {
  display: none !important;
}
</style>
