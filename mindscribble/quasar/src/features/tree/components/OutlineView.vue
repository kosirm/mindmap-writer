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
      <q-space />
      <span class="text-caption text-grey-6">{{ nodeCount }} nodes</span>
    </div>

    <!-- Tree -->
    <q-scroll-area class="outline-tree-container">
      <q-tree
        v-if="treeNodes.length > 0"
        ref="treeRef"
        :nodes="treeNodes"
        node-key="id"
        :selected="selectedNodeId"
        :expanded="expandedNodeIds"
        default-expand-all
        dense
        @update:selected="onNodeSelected"
        @update:expanded="onNodeExpanded"
      >
        <template #default-header="prop">
          <div
            class="outline-node-header"
            :class="{
              'outline-node-selected': selectedNodeIds.includes(prop.node.id),
              'outline-node-root': prop.node.isRoot
            }"
            :data-node-id="prop.node.id"
            @click="onNodeClick($event, prop.node.id)"
            @dblclick="onNodeDoubleClick(prop.node.id)"
          >
            <q-icon
              :name="prop.node.icon || 'circle'"
              size="xs"
              class="q-mr-xs"
              :color="selectedNodeIds.includes(prop.node.id) ? 'primary' : 'grey-6'"
            />
            <span class="outline-node-title">{{ prop.node.label }}</span>
            <q-badge
              v-if="prop.node.childCount > 0"
              color="grey-4"
              text-color="grey-8"
              class="q-ml-sm"
            >
              {{ prop.node.childCount }}
            </q-badge>
          </div>
        </template>
      </q-tree>

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
    </q-scroll-area>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import type { QTree } from 'quasar'
import { useDocumentStore } from 'src/core/stores/documentStore'
import { useViewEvents } from 'src/core/events'

// ============================================================
// STORE & EVENTS
// ============================================================

const documentStore = useDocumentStore()
const { onStoreEvent, source } = useViewEvents('outline')

// ============================================================
// LOCAL STATE
// ============================================================

const treeRef = ref<InstanceType<typeof QTree> | null>(null)
const expandedNodeIds = ref<string[]>([])
const selectedNodeId = ref<string | null>(null)
const selectedNodeIds = ref<string[]>([]) // For multi-selection visual feedback

// ============================================================
// COMPUTED
// ============================================================

interface TreeNode {
  id: string
  label: string
  icon?: string
  isRoot: boolean
  childCount: number
  children?: TreeNode[]
}

/**
 * Convert flat nodes to hierarchical tree structure for q-tree
 */
const treeNodes = computed<TreeNode[]>(() => {
  const nodes = documentStore.nodes

  // Build lookup map
  const nodeMap = new Map<string, TreeNode>()
  const rootNodes: TreeNode[] = []

  // Helper to strip HTML tags for clean navigation display
  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').trim()

  // First pass: create tree nodes
  for (const node of nodes) {
    const childCount = nodes.filter((n) => n.data.parentId === node.id).length
    nodeMap.set(node.id, {
      id: node.id,
      label: stripHtml(node.data.title) || 'Untitled',
      icon: node.data.parentId === null ? 'star' : 'circle',
      isRoot: node.data.parentId === null,
      childCount,
      children: []
    })
  }

  // Second pass: build hierarchy
  for (const node of nodes) {
    const treeNode = nodeMap.get(node.id)!
    if (node.data.parentId === null) {
      rootNodes.push(treeNode)
    } else {
      const parent = nodeMap.get(node.data.parentId)
      if (parent) {
        parent.children!.push(treeNode)
      }
    }
  }

  // Sort children by order
  function sortChildren(treeNode: TreeNode) {
    if (treeNode.children && treeNode.children.length > 0) {
      treeNode.children.sort((a, b) => {
        const nodeA = nodes.find((n) => n.id === a.id)
        const nodeB = nodes.find((n) => n.id === b.id)
        return (nodeA?.data.order ?? 0) - (nodeB?.data.order ?? 0)
      })
      treeNode.children.forEach(sortChildren)
    }
  }

  // Sort root nodes and their children
  rootNodes.sort((a, b) => {
    const nodeA = nodes.find((n) => n.id === a.id)
    const nodeB = nodes.find((n) => n.id === b.id)
    return (nodeA?.data.order ?? 0) - (nodeB?.data.order ?? 0)
  })
  rootNodes.forEach(sortChildren)

  return rootNodes
})

const nodeCount = computed(() => documentStore.nodeCount)

// ============================================================
// EVENT HANDLERS - Store events (from other views)
// ============================================================

// Listen to single selection changes from other views
onStoreEvent('store:node-selected', ({ nodeId, scrollIntoView }) => {
  selectedNodeId.value = nodeId
  selectedNodeIds.value = nodeId ? [nodeId] : []

  // Expand parent path to make node visible
  if (nodeId && scrollIntoView) {
    expandToNode(nodeId)
  }
})

// Listen to multi-selection changes from other views
onStoreEvent('store:nodes-selected', ({ nodeIds }) => {
  selectedNodeIds.value = nodeIds
  // Update single selection to first item (q-tree only supports single selection natively)
  selectedNodeId.value = nodeIds.length > 0 ? nodeIds[0]! : null

  // Expand parent paths for all selected nodes
  nodeIds.forEach(nodeId => {
    expandToNode(nodeId)
  })
})

// Listen to select-navigate events from other views
onStoreEvent('store:select-navigate', ({ nodeId }) => {
  selectedNodeId.value = nodeId
  selectedNodeIds.value = nodeId ? [nodeId] : []

  // Expand parent path and scroll into view
  if (nodeId) {
    expandToNode(nodeId)
    // Scroll the node into view after next DOM update
    void nextTick(() => {
      const nodeElement = document.querySelector(`[data-node-id="${nodeId}"]`)
      if (nodeElement) {
        nodeElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    })
  }
})

// Listen to node creation
onStoreEvent('store:node-created', ({ parentId }) => {
  // Auto-expand parent when child is added
  if (parentId && !expandedNodeIds.value.includes(parentId)) {
    expandedNodeIds.value.push(parentId)
  }
})

// Listen to document load
onStoreEvent('store:document-loaded', () => {
  // Expand all on document load
  expandAll()
})

// ============================================================
// EVENT HANDLERS - User interactions
// ============================================================

function onNodeClick(event: MouseEvent, nodeId: string) {
  if (event.ctrlKey || event.metaKey) {
    // Ctrl+click: Select and navigate
    documentStore.selectNavigateNode(nodeId, source)
  } else {
    // Regular click: Select without navigation
    onNodeSelected(nodeId)
  }
}

function onNodeSelected(nodeId: string | null) {
  selectedNodeId.value = nodeId
  selectedNodeIds.value = nodeId ? [nodeId] : []
  // Update store with this view as source
  documentStore.selectNode(nodeId, source, false)
}

function onNodeExpanded(nodeIds: readonly string[]) {
  expandedNodeIds.value = [...nodeIds]
}

function onNodeDoubleClick(nodeId: string) {
  // Emit edit start event (for future Tiptap integration)
  console.log('Double click on node:', nodeId)
}

// ============================================================
// ACTIONS
// ============================================================

function addRootNode() {
  const newNode = documentStore.addNode(null, 'New Node', '', undefined, source)
  // Select the new node
  documentStore.selectNode(newNode.id, source, true)
}

function expandAll() {
  // Collect all node IDs
  const allIds = documentStore.nodes.map((n) => n.id)
  expandedNodeIds.value = allIds
}

function collapseAll() {
  expandedNodeIds.value = []
}

function expandToNode(nodeId: string) {
  // Get path to node and expand all ancestors
  const path = documentStore.getNodePath(nodeId)
  for (const node of path) {
    if (!expandedNodeIds.value.includes(node.id)) {
      expandedNodeIds.value.push(node.id)
    }
  }
}

// ============================================================
// SYNC WITH STORE
// ============================================================

// Sync selection from store on mount
onMounted(() => {
  const storeSelectedIds = documentStore.selectedNodeIds
  if (storeSelectedIds.length > 0) {
    selectedNodeIds.value = [...storeSelectedIds]
    selectedNodeId.value = storeSelectedIds[0] ?? null
  }
  // Expand all initially
  expandAll()
})

// Watch for external selection changes (fallback)
watch(
  () => documentStore.selectedNodeIds,
  (newIds) => {
    selectedNodeIds.value = [...newIds]
    if (newIds.length > 0) {
      selectedNodeId.value = newIds[0] ?? null
    } else {
      selectedNodeId.value = null
    }
  }
)
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
}

.outline-node-header {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.15s ease;

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);

    .body--dark & {
      background-color: rgba(255, 255, 255, 0.05);
    }
  }
}

.outline-node-selected {
  background-color: rgba(25, 118, 210, 0.1);

  .outline-node-title {
    color: #1976d2;
    font-weight: 500;
  }

  .body--dark & {
    background-color: rgba(25, 118, 210, 0.2);

    .outline-node-title {
      color: #42a5f5;
    }
  }
}

.outline-node-root {
  .outline-node-title {
    font-weight: 600;
  }
}

.outline-node-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.outline-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 32px;
}
</style>

