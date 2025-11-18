# Vue Flow Mindmap - Quick Reference

## Essential Code Snippets

### 1. Basic Setup

```typescript
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { VueFlow, useVueFlow, Handle, Position } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import type { Node, Edge } from '@vue-flow/core';
import * as d3 from 'd3-force';
import { Notify } from 'quasar';

import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';

// Get Vue Flow instance
const { project, vueFlowRef, connectionStartHandle, getSelectedNodes, getSelectedEdges, addSelectedNodes, removeSelectedNodes } = useVueFlow();

// State
const nodes = ref<Node[]>([]);
const edges = ref<Edge[]>([]);
```

### 2. Node Creation

```typescript
function createNode(x: number, y: number, label?: string, parentId?: string): Node {
  const id = String(nodeCounter++);
  return {
    id,
    type: 'custom',
    position: { x, y },
    data: { 
      label: label || `Node ${id}`,
      parentId: parentId || null,
      content: '',
      title: '',
    },
  };
}

// Ctrl+Click to create node
function onPaneClick(event: MouseEvent) {
  if (event.ctrlKey && vueFlowRef.value) {
    const bounds = vueFlowRef.value.getBoundingClientRect();
    const position = project({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
    
    const newNode = createNode(position.x, position.y);
    nodes.value.push(newNode);
  }
}
```

### 3. Edge Creation (Two Types)

```typescript
function createEdge(sourceId: string, targetId: string, edgeType: 'hierarchy' | 'reference' = 'hierarchy'): Edge {
  return {
    id: `e${sourceId}-${targetId}`,
    source: sourceId,
    target: targetId,
    sourceHandle: 'center',
    targetHandle: 'center',
    type: 'straight',
    class: `edge-${edgeType}`,
    data: {
      edgeType: edgeType,
    },
  };
}
```

### 4. Shift+Drag Reparenting (CRITICAL!)

```typescript
const isShiftPressed = ref(false);

// Track Shift key during connection drag
function onConnectStart(connectionEvent: any) {
  isDraggingConnection.value = true;
  isShiftPressed.value = connectionEvent?.event?.shiftKey || false;
}

function onConnect(params: { source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null }) {
  isDraggingConnection.value = false;

  // IMPORTANT: Vue Flow reports backwards! Swap them:
  const parentId = params.target;  // The node you dragged FROM
  const childId = params.source;   // The node you dragged TO

  if (isShiftPressed.value) {
    // HIERARCHY CONNECTION
    
    // Check circular reference
    if (wouldCreateCircularReference(parentId, childId)) {
      Notify.create({
        type: 'negative',
        message: 'Cannot create hierarchy: This would create a circular reference!',
        position: 'top',
        timeout: 3000,
      });
      isShiftPressed.value = false;
      return;
    }

    const childNode = nodes.value.find(n => n.id === childId);
    const oldParentId = childNode?.data?.parentId;

    if (oldParentId) {
      // REPARENTING
      removeOldParentRelationship(childId);
      if (childNode) childNode.data.parentId = parentId;
      edges.value.push(createEdge(parentId, childId, 'hierarchy'));
      
      Notify.create({
        type: 'info',
        message: `Node ${childId} reconnected from Node ${oldParentId} to Node ${parentId}`,
      });
    } else {
      // NEW PARENT
      if (childNode) childNode.data.parentId = parentId;
      edges.value.push(createEdge(parentId, childId, 'hierarchy'));
      
      Notify.create({
        type: 'positive',
        message: `Node ${childId} is now a child of Node ${parentId}`,
      });
    }

    isShiftPressed.value = false;
    return;
  }

  // REFERENCE CONNECTION (no Shift key)
  const connectionExists = edges.value.some(edge =>
    (edge.source === params.source && edge.target === params.target) ||
    (edge.source === params.target && edge.target === params.source)
  );

  if (!connectionExists) {
    edges.value.push(createEdge(params.source, params.target, 'reference'));
  }
}
```

### 5. Circular Reference Prevention

```typescript
function wouldCreateCircularReference(parentId: string, childId: string): boolean {
  let currentId: string | null = parentId;
  const visited = new Set<string>();

  while (currentId) {
    if (currentId === childId) {
      return true;  // Circular reference detected!
    }

    if (visited.has(currentId)) {
      break;
    }
    visited.add(currentId);

    const currentNode = nodes.value.find(n => n.id === currentId);
    currentId = currentNode?.data?.parentId || null;
  }

  return false;
}
```

### 6. Remove Old Parent (REACTIVITY FIX!)

```typescript
function removeOldParentRelationship(childId: string): string | null {
  const childNode = nodes.value.find(n => n.id === childId);
  if (!childNode || !childNode.data.parentId) {
    return null;
  }

  const oldParentId = childNode.data.parentId;

  // IMPORTANT: Use filter() instead of splice() for reactivity!
  edges.value = edges.value.filter(edge =>
    !(edge.data?.edgeType === 'hierarchy' &&
      edge.source === oldParentId &&
      edge.target === childId)
  );

  childNode.data.parentId = null;
  return oldParentId;
}
```

### 7. Tree View Building

```typescript
interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[] | undefined;
  childCount: number;
}

const treeData = computed(() => {
  function buildTree(parentId: string | null): TreeNode[] {
    const children = nodes.value.filter(node => node.data.parentId === parentId);

    return children.map(node => {
      const nodeChildren = buildTree(node.id);
      const treeNode: TreeNode = {
        id: node.id,
        label: node.data.label || `Node ${node.id}`,
        childCount: nodeChildren.length,
      };

      if (nodeChildren.length > 0) {
        treeNode.children = nodeChildren;
      }

      return treeNode;
    });
  }

  return buildTree(null);
});
```

### 8. Bidirectional Selection

```typescript
const selectedTreeNodeIds = ref<string[]>([]);

// Canvas → Tree
watch(getSelectedNodes, (selectedNodes) => {
  selectedTreeNodeIds.value = selectedNodes.map(node => node.id);
}, { deep: true });

// Tree → Canvas
function onTreeNodeSelected(nodeId: string | null) {
  if (!nodeId) {
    removeSelectedNodes(nodes.value as any);
    return;
  }

  const node = nodes.value.find(n => n.id === nodeId);
  if (node) {
    addSelectedNodes([node as any]);
  }
}
```

### 9. Custom Node Template

```vue
<template #node-custom="{ data }">
  <div class="custom-node">
    {{ data.label }}

    <!-- Center handle for connections -->
    <Handle
      id="center"
      type="source"
      :position="Position.Top"
      class="center-handle"
      :style="{ left: '50%', top: '50%' }"
    />
    <Handle
      id="center"
      type="target"
      :position="Position.Top"
      class="center-handle"
      :style="{ left: '50%', top: '50%' }"
    />
  </div>
</template>
```

### 10. Essential Styling

```css
/* Selected node */
.custom-node {
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
}

:deep(.vue-flow__node.selected) .custom-node {
  background: #e3f2fd;
  box-shadow: 0 0 0 2px #1976d2;
}

/* Hierarchy edges - solid blue */
:deep(.vue-flow__edge.edge-hierarchy .vue-flow__edge-path) {
  stroke: #1976d2 !important;
  stroke-width: 2px !important;
}

/* Reference edges - dashed orange */
:deep(.vue-flow__edge.edge-reference .vue-flow__edge-path) {
  stroke: #ff9800 !important;
  stroke-width: 2px !important;
  stroke-dasharray: 5, 5 !important;
}

/* Tree selection */
.tree-node-selected {
  background-color: #e3f2fd !important;
}
```

## Critical Gotchas

### ❌ DON'T: Use splice() for edges
```typescript
edges.value.splice(edgeIndex, 1);  // Won't update visually!
```

### ✅ DO: Use filter() for edges
```typescript
edges.value = edges.value.filter((_, index) => index !== edgeIndex);
```

### ❌ DON'T: Trust Vue Flow connection direction
```typescript
const parentId = params.source;  // WRONG!
const childId = params.target;   // WRONG!
```

### ✅ DO: Swap source and target
```typescript
const parentId = params.target;  // Correct!
const childId = params.source;   // Correct!
```

## Quick Start Commands

```bash
# Navigate to test project
cd mindmap-writer/vueflow/vueflow-test

# Install dependencies
npm install

# Run dev server
npm run dev
```

## Key Packages

```bash
npm install @vue-flow/core @vue-flow/background @vue-flow/controls
npm install d3-force
npm install quasar
```


