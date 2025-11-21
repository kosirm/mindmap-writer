<template>
  <div class="writer-editor">
    <WriterTree
      v-if="treeData.length > 0"
      :source="treeData"
      :depth="0"
      :parent-id="null"
    />
    <div v-else class="empty-state">
      <q-icon name="description" size="48px" color="grey-5" />
      <div class="text-grey-6 q-mt-md">No nodes to display</div>
      <div class="text-grey-5 text-caption">Create nodes in the mindmap to see them here</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Node } from '@vue-flow/core';
import WriterTree, { type TreeItem } from './WriterTree.vue';
import { eventBus } from '../composables/useEventBus';

const props = defineProps<{
  nodes: Node[];
}>();

// Reactive tree data that persists across renders
const treeData = ref<TreeItem[]>([]);

// Function to build tree from Vue Flow nodes
function buildTreeFromNodes(nodes: Node[]): TreeItem[] {
  // Create a map for quick lookup
  const nodeMap = new Map<string, TreeItem>();

  // First pass: Create TreeItem objects
  nodes.forEach(node => {
    nodeMap.set(node.id, {
      id: node.id,
      data: {
        title: node.data.title || '',
        content: node.data.content || '',
        parentId: node.data.parentId,
        order: node.data.order || 0,
      },
      children: [],
    });
  });

  // Second pass: Build hierarchy
  const rootNodes: TreeItem[] = [];
  nodeMap.forEach(treeItem => {
    if (treeItem.data.parentId) {
      const parent = nodeMap.get(treeItem.data.parentId);
      if (parent && parent.children) {
        parent.children.push(treeItem);
      }
    } else {
      rootNodes.push(treeItem);
    }
  });

  // Third pass: Sort children by order
  nodeMap.forEach(treeItem => {
    if (treeItem.children && treeItem.children.length > 0) {
      treeItem.children.sort((a, b) => (a.data.order || 0) - (b.data.order || 0));
    }
  });

  // Sort root nodes by order
  rootNodes.sort((a, b) => (a.data.order || 0) - (b.data.order || 0));

  return rootNodes;
}

// Watch for changes in Vue Flow nodes and rebuild tree
watch(() => props.nodes, (newNodes) => {
  treeData.value = buildTreeFromNodes(newNodes);
}, { immediate: true, deep: true });

// Function to recursively extract hierarchy and order from tree structure
function extractHierarchyAndOrderFromTree(
  items: TreeItem[],
  parentId: string | null = null
): { hierarchy: Map<string, string | null>; orders: Map<string, number> } {
  const hierarchy = new Map<string, string | null>();
  const orders = new Map<string, number>();

  items.forEach((item, index) => {
    hierarchy.set(item.id, parentId);
    orders.set(item.id, index);  // Use array index as the order

    if (item.children && item.children.length > 0) {
      const childData = extractHierarchyAndOrderFromTree(item.children, item.id);
      childData.hierarchy.forEach((childParentId, childId) => {
        hierarchy.set(childId, childParentId);
      });
      childData.orders.forEach((childOrder, childId) => {
        orders.set(childId, childOrder);
      });
    }
  });

  return { hierarchy, orders };
}

// Listen for tree restructuring events
eventBus.on('writer:tree-restructured', ({ draggedNodeIds, newParentId }) => {
  console.log('[WriterEditor] Tree restructured:', { draggedNodeIds, newParentId });

  // Extract the new hierarchy and order from the current tree structure
  const { hierarchy: newHierarchy, orders: newOrders } = extractHierarchyAndOrderFromTree(treeData.value);

  console.log('[WriterEditor] New hierarchy:', newHierarchy);
  console.log('[WriterEditor] New orders:', newOrders);

  // Emit hierarchy and order changes for all nodes
  newHierarchy.forEach((parentId, nodeId) => {
    const order = newOrders.get(nodeId) || 0;
    eventBus.emit('writer:hierarchy-changed', {
      nodeId,
      newParentId: parentId,
      newOrder: order,
    });
  });
});
</script>

<style scoped lang="scss">
.writer-editor {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background-color: #ffffff;
  padding-top: 16px;
  padding-bottom: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
}
</style>

