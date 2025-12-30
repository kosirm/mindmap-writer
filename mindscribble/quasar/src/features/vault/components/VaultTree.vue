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
            :is-edit-mode="isEditMode"
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
import { ref, watch, provide, reactive, onMounted, onUnmounted } from 'vue'
import { Draggable } from '@he-tree/vue'
import { useQuasar } from 'quasar'
import '@he-tree/vue/style/default.css'
import '@he-tree/vue/style/material-design.css'
import VaultTreeItem from './VaultTreeItem.vue'
import VaultToolbar from './VaultToolbar.vue'
import { useVault } from 'src/composables/useVault'
import { useFileSystem } from 'src/composables/useFileSystem'
import type { FileSystemItem } from 'src/core/services/indexedDBService'
import type { MindscribbleDocument } from 'src/core/types'

const TRIGGER_CLASS = 'drag-handle'
const $q = useQuasar()

// Vault and file system services
const vaultService = useVault()
const fileSystemService = useFileSystem()

// Edit mode state (default: OFF)
const isEditMode = ref(false)

// Tree reference
const treeRef = ref<InstanceType<typeof Draggable> | null>(null)

// Tree data for he-tree
interface VaultTreeItem {
  id: string
  text: string
  item: FileSystemItem
  children: VaultTreeItem[]
  type: 'vault' | 'folder' | 'file'
  stat: {
    children: { length: number }
    open: boolean
  }
}

const treeData = ref<VaultTreeItem[]>([])

// Simple event emitter for child components
const vaultEmitter = reactive({
  handlers: new Map<string, Set<(payload: unknown) => void>>(),
  emit(event: string, payload: unknown) {
    this.handlers.get(event)?.forEach(handler => handler(payload))
  },
  on(event: string, handler: (payload: unknown) => void) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler)
  }
})

// Provide emitter to children
provide('vaultEmitter', vaultEmitter)

// Provide method to update local tree data (to avoid prop mutation)
const updateLocalTreeItemData = (itemId: string, updates: { name?: string }) => {
  const updateItem = (items: VaultTreeItem[]): boolean => {
    for (const item of items) {
      if (item.id === itemId) {
        if (updates.name !== undefined) {
          item.text = updates.name
          item.item.name = updates.name
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

// Handle folder toggle events from children
vaultEmitter.on('toggle-folder', (payload: unknown) => {
  const { itemId } = payload as { itemId: string }
  toggleFolderInTree(itemId)
})

// Handle refresh tree events from children (e.g., after rename)
vaultEmitter.on('refresh-tree', () => {
  void buildTreeFromVault()
})

/**
 * Build tree structure from vault and file system
 */
async function buildTreeFromVault() {
  try {
    // Load vaults first
    await vaultService.loadVaults()

    const vaults = vaultService.vaults.value
    const activeVault = vaultService.activeVault.value

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
        await vaultService.setCurrentVault(firstVault.id)
      }
    }

    if (!vaultToUse) {
      treeData.value = []
      return
    }

    // Get the complete vault structure
    await fileSystemService.loadStructure(vaultToUse.id)
    const vaultStructure = fileSystemService.vaultStructure.value

    // Build tree items
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

/**
 * Toggle folder expansion in tree
 */
function toggleFolderInTree(itemId: string) {
  const findAndToggleItem = (items: VaultTreeItem[]): boolean => {
    for (const item of items) {
      if (item.id === itemId) {
        item.stat.open = !item.stat.open
        return true
      }
      if (item.children.length > 0) {
        if (findAndToggleItem(item.children)) return true
      }
    }
    return false
  }

  findAndToggleItem(treeData.value)
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
  for (const { itemId, parentId } of newHierarchy) {
    try {
      await fileSystemService.moveExistingItem(itemId, parentId)
    } catch (error) {
      console.error(`Failed to move item ${itemId}:`, error)
      // Rebuild tree to revert changes
      await buildTreeFromVault()
      break
    }
  }
}

// Actions
async function addFileToRoot() {
  try {
    await vaultService.loadVaults()
    const activeVault = vaultService.activeVault.value
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

    await fileSystemService.createNewFile(activeVault.id, null, 'New File', newDocument)
    await buildTreeFromVault()

    $q.notify({ type: 'positive', message: 'File created', timeout: 2000 })
  } catch (error) {
    console.error('Failed to create file:', error)
    $q.notify({ type: 'error', message: 'Failed to create file', timeout: 3000 })
  }
}

async function addFolderToRoot() {
  try {
    await vaultService.loadVaults()
    const activeVault = vaultService.activeVault.value
    if (!activeVault) {
      $q.notify({ type: 'warning', message: 'No active vault', timeout: 2000 })
      return
    }

    await fileSystemService.createNewFolder(activeVault.id, null, 'New Folder')
    await buildTreeFromVault()

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

    await vaultService.createNewVault(vaultName, 'New vault')
    await buildTreeFromVault()

    $q.notify({ type: 'positive', message: 'Vault created', timeout: 2000 })
  } catch (error) {
    console.error('Failed to create vault:', error)
    $q.notify({ type: 'error', message: 'Failed to create vault', timeout: 3000 })
  }
}

async function handleOpenVault() {
  try {
    await vaultService.loadVaults()
    const vaults = vaultService.vaults.value
    if (vaults.length === 0) {
      $q.notify({ type: 'warning', message: 'No vaults available', timeout: 2000 })
      return
    }

    // For now, just open the first vault
    if (vaults.length > 0 && vaults[0]) {
      await vaultService.setCurrentVault(vaults[0].id)
    }
    await buildTreeFromVault()

    $q.notify({ type: 'positive', message: 'Vault opened', timeout: 2000 })
  } catch (error) {
    console.error('Failed to open vault:', error)
    $q.notify({ type: 'error', message: 'Failed to open vault', timeout: 3000 })
  }
}

async function handleDeleteVault() {
  try {
    await vaultService.loadVaults()
    const activeVault = vaultService.activeVault.value
    if (!activeVault) {
      $q.notify({ type: 'warning', message: 'No active vault', timeout: 2000 })
      return
    }

    const confirm = window.confirm(`Delete vault "${activeVault.name}"? This cannot be undone.`)
    if (!confirm) return

    await vaultService.deleteExistingVault(activeVault.id)
    await buildTreeFromVault()

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

function toggleEditMode() {
  isEditMode.value = !isEditMode.value

  // Show brief notification
  $q.notify({
    message: `Edit mode ${isEditMode.value ? 'ON' : 'OFF'}`,
    icon: isEditMode.value ? 'edit' : 'edit_note',
    color: isEditMode.value ? 'primary' : 'grey',
    timeout: 1000,
    position: 'bottom'
  })
}

// Global keyboard handler for F2 toggle
function handleGlobalKeydown(event: KeyboardEvent) {
  if (event.key === 'F2') {
    event.preventDefault()
    toggleEditMode()
  }
}

// Mount and unmount global keyboard listener
onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeydown)
  void buildTreeFromVault()
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown)
})

// Watch for file system changes
watch(() => fileSystemService.vaultStructure, () => {
  void buildTreeFromVault()
}, { deep: true })
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
