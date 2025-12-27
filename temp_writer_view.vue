<template>
  <div
    class="writer-view"
  >
    <Draggable
      v-if="treeData.length > 0"
      ref="treeRef"
      v-model="treeData"
      class="writer-tree"
      :indent="16"
      :triggerClass="TRIGGER_CLASS"
      :rootDroppable="true"
      @change="onTreeChange"
    >
      <template #default="{ node, stat }">
        <WriterNodeContent
          :node="node.node"
          :stat="stat"
          :trigger-class="TRIGGER_CLASS"
        />
      </template>
    </Draggable>

    <div v-else class="empty-state">
      <q-icon name="description" size="48px" color="grey-5" />
      <div class="text-grey-6 q-mt-md">No nodes to display</div>
      <div class="text-grey-5 text-caption">Create nodes in the mindmap to see them here</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, provide, reactive } from 'vue'
import { Draggable } from '@he-tree/vue'
import '@he-tree/vue/style/default.css'
import WriterNodeContent from './WriterNodeContent.vue'
import { useUnifiedDocumentStore } from '../../../core/stores/unifiedDocumentStore'
import { useViewEvents } from '../../../core/events'
import { useWriterNavigation, type WriterTreeItem } from '../composables/useWriterNavigation'

const TRIGGER_CLASS = 'drag-handle'

// Unified store
const unifiedStore = useUnifiedDocumentStore()

const { onStoreEvent } = useViewEvents('writer')

// console.log('🔍 WriterView.vue script setup running')

// onMounted(() => {
//   console.log('🔍 WriterView.vue mounted!')
//   console.log('🔍 Initial treeData length:', treeData.value.length)
// })

// Tree reference
const treeRef = ref<InstanceType<typeof Draggable> | null>(null)

// Tree data for he-tree
const treeData = ref<WriterTreeItem[]>([])

// Simple event emitter for child components
const writerEmitter = reactive({
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
provide('writerEmitter', writerEmitter)
const navigation = useWriterNavigation(treeData)
provide('writerNavigation', navigation)

// Provide method to update local tree data (to avoid prop mutation)
const updateLocalNodeData = (nodeId: string, updates: { title?: string; content?: string }) => {
  const updateItem = (items: WriterTreeItem[]): boolean => {
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
function buildTreeFromStore(): WriterTreeItem[] {
  const nodeMap = new Map<string, WriterTreeItem>()

  // Get nodes from the unified store
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
  const rootItems: WriterTreeItem[] = []
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
  items: WriterTreeItem[],
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
    unifiedStore.moveNode(nodeId, parentId, order, 'writer')
  }

  // Handle sibling reordering (uses reorderSiblings - emits store:siblings-reordered)
  for (const [parentId, nodeOrders] of orderChanges) {
    unifiedStore.reorderSiblings(parentId, nodeOrders, 'writer')
  }
}

// DEBUG: Drag event handlers
// function onDragStart(event: DragEvent) {
//   console.log('🔍 WriterView dragstart:', event.target)
//   console.log('🔍 Target draggable attr:', (event.target as HTMLElement)?.getAttribute('draggable'))
// }

// function onDrag() {
//   // Too noisy, comment out
//   // console.log('🔍 WriterView drag:', event.target)
// }

// function onDragEnd(event: DragEvent) {
//   console.log('🔍 WriterView dragend:', event.target)
// }

// function onDragOver() {
//   // Too noisy, comment out
//   // console.log('🔍 WriterView dragover:', event.target)
// }

// function onDrop(event: DragEvent) {
//   console.log('🔍 WriterView drop:', event.target)
// }

// DEBUG: Check what he-tree is doing
// watch(() => treeData.value.length, (newLength) => {
//   console.log('🔍 TreeData length changed to:', newLength)
//   setTimeout(() => {
//     const draggableElements = document.querySelectorAll('[draggable="true"]')
//     console.log('🔍 Found', draggableElements.length, 'draggable elements in document')
//     draggableElements.forEach(el => {
//       console.log('🔍 Draggable element:', el.className, el.tagName)
//     })
//   }, 100)
// }, { immediate: true })

// Initial load
treeData.value = buildTreeFromStore()

// Watch store for changes
watch(() => unifiedStore.activeDocument?.nodes.length || 0, () => {
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
  const updateItem = (items: WriterTreeItem[]): boolean => {
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
onStoreEvent('store:node-selected', ({ nodeId, source, scrollIntoView }) => {
  console.log('WriterView: node-selected received for node:', nodeId, 'from source:', source, 'scrollIntoView:', scrollIntoView)
  // Scroll the node into view if requested and not from this view
  if (nodeId && scrollIntoView) {
    setTimeout(() => {
      // Try to find within the writer view container
      const writerView = document.querySelector('.writer-view')
      console.log('WriterView: writer view element:', writerView)
      if (writerView) {
        const nodeElement = writerView.querySelector(`[data-node-id="${nodeId}"]`)
        // console.log('WriterView: found element in writer view:', nodeElement)
        if (nodeElement) {
          // console.log('WriterView: scrolling element into view')
          nodeElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        } else {
          // console.log('WriterView: element not found in writer view')
        }
      }
    }, 100)
  }
})
</script>

<style scoped lang="scss">
.writer-view {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background-color: #ffffff;

  // Dark mode
  .body--dark & {
    background-color: #1d1d1d;
  }
}

.writer-tree {
  padding: 16px 8px;
  min-height: 100%;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
}

// Override he-tree default styles for seamless look
:deep(.he-tree) {
  .tree-node {
    margin-bottom: 2px;
  }

  // Hide tree lines - we want a document-like appearance
  .tree-line {
    display: none;
  }
}

// Drag placeholder styling
:deep(.he-tree-drag-placeholder) {
  background-color: rgba(25, 118, 210, 0.1);
  border: 2px dashed rgba(25, 118, 210, 0.4);
  border-radius: 4px;
  min-height: 40px;
}
</style>

