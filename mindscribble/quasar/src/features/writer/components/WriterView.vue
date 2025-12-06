<template>
  <div class="writer-view">
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
import { useDocumentStore } from '../../../core/stores'
import { useViewEvents } from '../../../core/events'
import { useWriterNavigation, type WriterTreeItem } from '../composables/useWriterNavigation'

const TRIGGER_CLASS = 'drag-handle'

const documentStore = useDocumentStore()
const { onStoreEvent } = useViewEvents('writer')

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

/**
 * Build tree structure from store nodes
 */
function buildTreeFromStore(): WriterTreeItem[] {
  const nodeMap = new Map<string, WriterTreeItem>()

  // First pass: Create tree items
  documentStore.nodes.forEach(node => {
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
    const node = documentStore.getNodeById(nodeId)
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
    documentStore.moveNode(nodeId, parentId, order, 'writer')
  }

  // Handle sibling reordering (uses reorderSiblings - emits store:siblings-reordered)
  for (const [parentId, nodeOrders] of orderChanges) {
    documentStore.reorderSiblings(parentId, nodeOrders, 'writer')
  }
}

// Initial load
treeData.value = buildTreeFromStore()

// Watch store for changes
watch(() => documentStore.nodes.length, () => {
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
</script>

<style scoped lang="scss">
.writer-view {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background-color: #ffffff;
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

