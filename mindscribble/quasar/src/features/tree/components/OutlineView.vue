<template>
  <div class="outline-view">
    <!-- Toolbar -->
    <div class="outline-toolbar">
      <q-btn flat dense icon="add" size="sm" @click="addRootNode">
        <q-tooltip>Add root node</q-tooltip>
      </q-btn>
      <q-btn flat dense icon="unfold_more" size="sm" @click="expandAll">
        <q-tooltip>Expand all</q-tooltip>
      </q-btn>
      <q-btn flat dense icon="unfold_less" size="sm" @click="collapseAll">
        <q-tooltip>Collapse all</q-tooltip>
      </q-btn>
      <q-separator vertical inset class="q-mx-sm" />
<q-btn
        flat
        dense
        :icon="isEditMode ? 'edit' : 'edit_note'"
        :color="isEditMode ? 'primary' : 'grey-6'"
        size="sm"
        @click="toggleEditMode"
      >
        <q-tooltip>{{ isEditMode ? 'Edit mode (ON) - Press F2 to toggle' : 'Edit mode (OFF) - Press F2 to toggle' }}</q-tooltip>
      </q-btn>
      <q-space />
      <span class="text-caption text-grey-6">{{ nodeCount }} nodes</span>
    </div>

    <!-- Tree -->
    <div class="outline-tree-container">
      <Draggable
        v-if="treeData.length > 0"
        ref="treeRef"
        v-model="treeData"
        class="outline-tree"
        :indent="16"
        :triggerClass="TRIGGER_CLASS"
        :rootDroppable="true"
        treeLine
        @change="onTreeChange"
      >
<template #default="{ node, stat }">
          <OutlineNodeContent
            :node="node.node"
            :stat="stat"
            :trigger-class="TRIGGER_CLASS"
            :is-edit-mode="isEditMode"
          />
        </template>
      </Draggable>

      <!-- Empty state -->
      <div v-else class="outline-empty">
        <q-icon name="format_list_bulleted" size="48px" color="grey-4" />
        <div class="text-body2 text-grey-6 q-mt-md">No nodes yet</div>
        <q-btn
          flat
          color="primary"
          label="Add root node"
          icon="add"
          class="q-mt-sm"
          @click="addRootNode"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, provide, reactive, onMounted, onUnmounted } from 'vue'
import { Draggable } from '@he-tree/vue'
import { useQuasar } from 'quasar'
import '@he-tree/vue/style/default.css'
import '@he-tree/vue/style/material-design.css'
import OutlineNodeContent from './OutlineNodeContent.vue'
import { useUnifiedDocumentStore } from 'src/core/stores/unifiedDocumentStore'
import { useViewEvents } from 'src/core/events'
import { useOutlineNavigation } from '../composables/useOutlineNavigation'
import type { MindpadNode } from 'src/core/types'

const TRIGGER_CLASS = 'drag-handle'
const $q = useQuasar()

// Unified store for document-level operations
const unifiedStore = useUnifiedDocumentStore()

const { onStoreEvent, source } = useViewEvents('outline')


// Edit mode state (default: OFF)
const isEditMode = ref(false)

// Tree reference
const treeRef = ref<InstanceType<typeof Draggable> | null>(null)

// Tree data for he-tree
interface OutlineTreeItem {
  id: string
  text: string
  node: MindpadNode
  children: OutlineTreeItem[]
}

const treeData = ref<OutlineTreeItem[]>([])

// Simple event emitter for child components
const outlineEmitter = reactive({
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

// Provide emitter and navigation to children
provide('outlineEmitter', outlineEmitter)
const navigation = useOutlineNavigation(treeData)
provide('outlineNavigation', navigation)

// Provide method to update local tree data (to avoid prop mutation)
const updateLocalNodeData = (nodeId: string, updates: { title?: string; content?: string }) => {
  const updateItem = (items: OutlineTreeItem[]): boolean => {
    for (const item of items) {
      if (item.id === nodeId) {
        if (updates.title !== undefined) {
          item.text = updates.title
          item.node.data.title = updates.title
        }
        if (updates.content !== undefined) {
          item.node.data.content = updates.content
        }
        return true
      }
      if (updateItem(item.children)) return true
    }
    return false
  }
  updateItem(treeData.value)
}
provide('updateLocalNodeData', updateLocalNodeData)

/**
 * Build tree structure from store nodes
 */
function buildTreeFromStore(): OutlineTreeItem[] {
  const nodeMap = new Map<string, OutlineTreeItem>()

  // Get nodes from unified store
  const nodes = unifiedStore.activeDocument?.nodes || []

  // First pass: Create tree items
  nodes.forEach(node => {
    nodeMap.set(node.id, {
      id: node.id,
      text: node.data.title || 'Untitled',
      node: node,
      children: []
    })
  })

  // Second pass: Build hierarchy
  const rootItems: OutlineTreeItem[] = []
  nodeMap.forEach(item => {
    const parentId = item.node.data.parentId
    if (parentId) {
      const parent = nodeMap.get(parentId)
      if (parent) {
        parent.children.push(item)
      }
    } else {
      rootItems.push(item)
    }
  })

  // Third pass: Sort children by order
  nodeMap.forEach(item => {
    item.children.sort((a, b) => a.node.data.order - b.node.data.order)
  })
  rootItems.sort((a, b) => a.node.data.order - b.node.data.order)

  return rootItems
}

/**
 * Extract hierarchy and order from current tree structure
 */
function extractHierarchyFromTree(
  items: OutlineTreeItem[],
  parentId: string | null = null
): Map<string, { parentId: string | null; order: number }> {
  const result = new Map<string, { parentId: string | null; order: number }>()

  items.forEach((item, index) => {
    result.set(item.id, { parentId, order: index })

    if (item.children.length > 0) {
      const childData = extractHierarchyFromTree(item.children, item.id)
      childData.forEach((value, key) => result.set(key, value))
    }
  })

  return result
}

/**
 * Handle tree changes from drag-and-drop
 */
function onTreeChange() {
  const newHierarchy = extractHierarchyFromTree(treeData.value)

  // Group changes by type: reparenting vs sibling reordering
  const reparentedNodes: Array<{ nodeId: string; parentId: string | null; order: number }> = []
  const orderChanges: Map<string | null, Map<string, number>> = new Map() // parentId -> (nodeId -> order)

  newHierarchy.forEach(({ parentId, order }, nodeId) => {
    const node = unifiedStore.getNodeById(nodeId)

    if (node) {
      const oldParentId = node.data.parentId

      if (oldParentId !== parentId) {
        // Parent changed - this is a reparent operation
        reparentedNodes.push({ nodeId, parentId, order })
      } else if (node.data.order !== order) {
        // Same parent, order changed - this is a sibling reorder
        if (!orderChanges.has(parentId)) {
          orderChanges.set(parentId, new Map())
        }
        orderChanges.get(parentId)!.set(nodeId, order)
      }
    }
  })

  // Handle reparenting first (uses moveNode)
  for (const { nodeId, parentId, order } of reparentedNodes) {
    unifiedStore.moveNode(nodeId, parentId, order, 'outline')
  }

  // Handle sibling reordering (uses reorderSiblings - emits store:siblings-reordered)
  for (const [parentId, nodeOrders] of orderChanges) {
    unifiedStore.reorderSiblings(parentId, nodeOrders, 'outline')
  }
}

// Actions
function addRootNode() {
  // Check if there's an active document, if not create one
  if (!unifiedStore.activeDocumentId) {
    const newDocument = unifiedStore.createEmptyDocument('Untitled')
    unifiedStore.addDocument(newDocument)
    unifiedStore.setActiveDocument(newDocument.metadata.id)
  }

  const newNode = unifiedStore.addNode(null, 'New Node', '', undefined, source)
  if (newNode) {
    unifiedStore.selectNode(newNode.id, source, true)
  }
}

function expandAll() {
  // Expand all nodes using store methods
  const nodesWithChildren = treeData.value.filter(item => item.children.length > 0)
  nodesWithChildren.forEach(item => {
    unifiedStore.expandNode(item.id, 'outline')
  })
}

function collapseAll() {
  // Collapse all nodes using store methods
  const nodesWithChildren = treeData.value.filter(item => item.children.length > 0)
  nodesWithChildren.forEach(item => {
    unifiedStore.collapseNode(item.id, 'outline')
  })
}

function toggleEditMode() {
  const wasEditMode = isEditMode.value
  isEditMode.value = !isEditMode.value

  // Show brief notification
  $q.notify({
    message: `Edit mode ${isEditMode.value ? 'ON' : 'OFF'}`,
    icon: isEditMode.value ? 'edit' : 'edit_note',
    color: isEditMode.value ? 'primary' : 'grey',
    timeout: 1000,
    position: 'bottom'
  })

  // If entering edit mode, focus the selected node for immediate editing
  if (isEditMode.value && !wasEditMode) {
    const selectedNodeId = unifiedStore.selectedNodeIds[0]
    if (selectedNodeId) {
      // Use a slight delay to ensure the DOM is fully updated
      setTimeout(() => {
        outlineEmitter.emit('focus-and-edit-node', { nodeId: selectedNodeId })
      }, 50)
    }
  }
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
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown)
})

// Initial load
treeData.value = buildTreeFromStore()

// Watch store for changes
watch(() => {
  return unifiedStore.activeDocument?.nodes.length || 0
}, () => {
  treeData.value = buildTreeFromStore()
})

// Listen for store events from other views
onStoreEvent('store:node-created', () => {
  treeData.value = buildTreeFromStore()
})

onStoreEvent('store:node-deleted', () => {
  treeData.value = buildTreeFromStore()
})

onStoreEvent('store:node-updated', ({ nodeId, changes }) => {
  // Update local tree item
  const updateItem = (items: OutlineTreeItem[]): boolean => {
    for (const item of items) {
      if (item.id === nodeId) {
        if (changes.title !== undefined) {
          item.text = changes.title
          // Also update the node reference so the component displays the updated title
          item.node.data.title = changes.title
        }
        if (changes.content !== undefined) {
          // Update content if changed
          item.node.data.content = changes.content
        }
        return true
      }
      if (updateItem(item.children)) return true
    }
    return false
  }
  updateItem(treeData.value)
})

onStoreEvent('store:node-reparented', () => {
  treeData.value = buildTreeFromStore()
})

onStoreEvent('store:siblings-reordered', () => {
  treeData.value = buildTreeFromStore()
})

// Listen to node selection events from other views
onStoreEvent('store:node-selected', ({ nodeId, scrollIntoView }) => {
  // Scroll the node into view if requested and not from this view
  if (nodeId && scrollIntoView) {
    setTimeout(() => {
      const outlineView = document.querySelector('.outline-view')
      if (outlineView) {
        const nodeElement = outlineView.querySelector(`[data-node-id="${nodeId}"]`)
        if (nodeElement) {
          nodeElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    }, 100)
  }
})

const nodeCount = computed(() => {
  return unifiedStore.activeDocument?.nodes.length || 0
})
</script>

<style scoped lang="scss">
.outline-view {
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

.outline-toolbar {
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

.outline-tree-container {
  flex: 1;
  padding: 8px;
  overflow-y: auto;
}

.outline-tree {
  padding: 4px 0;
}

.outline-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 32px;
}

// Override he-tree default styles for outline view
:deep(.he-tree) {
  .tree-node {
    margin-bottom: 0; // Remove gaps between tree nodes
  }

  // Show tree lines for outline view
  .tree-line {
    display: block;
    border-color: rgba(0, 0, 0, 0.1);
    margin: 0; // Ensure no margins on tree lines
    padding: 0; // Ensure no padding on tree lines

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

