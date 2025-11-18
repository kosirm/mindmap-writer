# Vue Flow Mindmap MVP Documentation

## Overview

This is a comprehensive test implementation of a mindmap application using **Vue Flow** library. It demonstrates all the core features needed for the official mindmap project, including free node positioning, hierarchical relationships, reference connections, D3-force collision avoidance, and synchronized tree view.

## Why Vue Flow?

We switched from `vue3-mindmap` library because:
- **vue3-mindmap limitations**: Fixed tree layout, nodes cannot be freely positioned, not robust enough
- **Our requirements**: Concept mapping and spatial thinking (whiteboard-style)
  - Non-tree structures with multiple root nodes
  - Free positioning where nodes can be manually placed anywhere
  - Flexible connections that aren't strictly parent-child
  - Ability to create floating notes that aren't connected to the main mindmap
  - Spatial organization where position matters (like paper mindmaps)

**Vue Flow** is the best Vue 3-compatible library for building custom mindmap solutions with these requirements.

## Tech Stack

- **Vue 3** with Composition API
- **Quasar Framework** for UI components
- **Vue Flow** for flow/diagram functionality
- **D3-Force** for collision avoidance physics simulation
- **TypeScript** for type safety

## Core Features Implemented

### 1. Node Management

#### Creating Nodes
- **Ctrl + Click** on empty canvas → Create new node at click position
- **Ctrl + Arrow Keys** → Create new child node in the arrow direction (fixed distance)
- **Alt + Drag from node to empty space** → Create new child node at drop position

#### Node Structure
```typescript
{
  id: string,
  type: 'custom',
  position: { x: number, y: number },
  data: {
    label: string,        // Node display label
    parentId: string | null,  // For hierarchy - which node is the parent
    content: string,      // Rich text content (will be HTML from Tiptap)
    title: string,        // Node title (can be empty for inferred titles)
  }
}
```

### 2. Connection System

We implemented **TWO types of connections**:

#### A. Hierarchy Connections (Blue Solid Lines)
- Represents parent-child relationships
- Each node can have **at most ONE parent**
- Created by:
  - Ctrl + Arrow keys
  - Alt + Drag to empty space
  - **Shift + Drag from one node to another** (reparenting)

#### B. Reference Connections (Orange Dashed Lines)
- Represents cross-references between nodes
- No restrictions on quantity
- Created by: Manual drag from node to node (without Shift)

#### Edge Structure
```typescript
{
  id: string,
  source: string,       // Source node ID
  target: string,       // Target node ID
  sourceHandle: 'center',
  targetHandle: 'center',
  type: 'straight',
  class: 'edge-hierarchy' | 'edge-reference',
  data: {
    edgeType: 'hierarchy' | 'reference'
  }
}
```

### 3. Shift+Drag Reparenting

**Most important feature for hierarchy management!**

When you **Shift + Drag FROM node A TO node B**:
1. Makes node B a child of node A
2. If node B already has a parent, automatically removes the old parent relationship
3. Prevents circular references (can't make node A a child of node B if node B is already a descendant of node A)
4. Shows toast notifications explaining what happened

**Critical Implementation Detail:**
- Vue Flow reports connections **backwards**!
- When dragging FROM node 2 TO node 3:
  - `params.source` = 3 (the node you dropped on)
  - `params.target` = 2 (the node you started from)
- **Solution**: Swap them in the code to get correct parent-child relationship

**Reactivity Fix:**
- Use `edges.value = edges.value.filter(...)` instead of `edges.value.splice(...)`
- This ensures Vue Flow properly updates the visual display

### 4. D3-Force Collision Avoidance

Three simulation states:

#### OFF
- D3 completely disabled
- Full manual control
- Nodes can overlap freely

#### Manual
- Run D3 simulation on demand via button
- Prevents collisions once
- Simulation stops after nodes settle

#### Auto
- Automatic simulation runs on every change
- Continuously prevents collisions
- Runs when: creating nodes, dragging nodes, etc.

**Implementation:**
```typescript
// D3 forces configuration
const simulation = d3.forceSimulation()
  .force('charge', d3.forceManyBody().strength(-300))
  .force('collision', d3.forceCollide().radius(60))
  .force('center', d3.forceCenter(0, 0).strength(0.05));
```

### 5. Tree View with Bidirectional Selection

**Features:**
- Hierarchical tree display showing parent-child relationships
- Child count badges on each node
- Auto-expand all nodes by default
- Empty state message when no nodes exist

**Bidirectional Selection:**
- **Click node in tree** → Node highlights on canvas with light blue background
- **Click node(s) on canvas** → Corresponding node(s) highlight in tree
- **Multi-selection support**: Select multiple nodes on canvas (Shift+drag or Ctrl+click) → All highlighted in tree
- **Visual consistency**: Same light blue background (`#e3f2fd`) for both canvas and tree

**Implementation:**
```typescript
// Watch canvas selection changes → sync to tree
watch(getSelectedNodes, (selectedNodes) => {
  selectedTreeNodeIds.value = selectedNodes.map(node => node.id);
}, { deep: true });

// Handle tree selection → sync to canvas
function onTreeNodeSelected(nodeId: string | null) {
  const node = nodes.value.find(n => n.id === nodeId);
  if (node) {
    addSelectedNodes([node as any]);
  }
}
```

### 6. Node Deletion

**Delete key behavior:**
- Deletes selected nodes and edges
- When deleting hierarchy edge: Clears child's `parentId`
- When deleting parent node: Clears `parentId` for all its children
- Automatically removes all connected edges

## Key Implementation Details

### Center-to-Center Connections

**Design Decision:**
- Use a single invisible handle at the center of each node
- Connections go from center to center (straight lines)
- Clean visual appearance

**Trade-off:**
- Edge reconnection doesn't work with center-positioned handles
- Accepted as a reasonable trade-off for clean aesthetics

**Implementation:**
```vue
<Handle
  id="center"
  type="source"
  :position="Position.Top"
  class="center-handle"
  :style="{ left: '50%', top: '50%' }"
/>
```

### Coordinate Transformation

**Critical for Ctrl+Click node creation:**

When creating nodes on click, must transform screen coordinates to flow coordinates:

```typescript
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

### Circular Reference Prevention

**Algorithm:**
```typescript
function wouldCreateCircularReference(parentId: string, childId: string): boolean {
  let currentId: string | null = parentId;
  const visited = new Set<string>();

  while (currentId) {
    if (currentId === childId) {
      return true;  // Circular reference detected!
    }

    if (visited.has(currentId)) {
      break;  // Prevent infinite loop
    }
    visited.add(currentId);

    const currentNode = nodes.value.find(n => n.id === currentId);
    currentId = currentNode?.data?.parentId || null;
  }

  return false;
}
```

### Tree Data Structure Building

**Recursive algorithm to build tree from flat node array:**

```typescript
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

  // Start with root nodes (nodes with no parent)
  return buildTree(null);
});
```

## UI/UX Features

### Drawer with Icon Tabs

Four tabs for different views:
1. **Tree** (🌳) - Hierarchical tree view
2. **Data** (📊) - JSON data inspection
3. **D3** (⚙️) - D3 simulation controls
4. **Instructions** (📖) - Help and keyboard shortcuts

### Visual Styling

**Selected Nodes:**
```css
.custom-node {
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
}

:deep(.vue-flow__node.selected) .custom-node {
  background: #e3f2fd;
  box-shadow: 0 0 0 2px #1976d2;
}
```

**Edge Styling:**
```css
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
```

**Tree Selection:**
```css
.tree-node-selected {
  background-color: #e3f2fd !important;
}
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Ctrl + Click** | Create new node at cursor position |
| **Ctrl + Arrow Keys** | Create child node in arrow direction |
| **Alt + Drag** from node to empty space | Create child node at drop position |
| **Shift + Drag** from node to node | Create hierarchy connection (reparenting) |
| **Drag** from node to node (no Shift) | Create reference connection |
| **Delete / Backspace** | Delete selected nodes/edges |
| **Shift + Drag** over nodes | Multi-select nodes |
| **Ctrl + Click** on nodes | Add/remove from selection |

## Common Patterns & Solutions

### Problem: Vue Flow Connection Direction is Backwards

**Issue:** When dragging FROM node 2 TO node 3, Vue Flow reports:
- `params.source = 3` (target)
- `params.target = 2` (source)

**Solution:** Swap them in the code:
```typescript
const parentId = params.target;  // The node you dragged FROM
const childId = params.source;   // The node you dragged TO
```

### Problem: Edges Not Updating Visually After Modification

**Issue:** Using `splice()` doesn't trigger Vue Flow's reactivity

**Solution:** Create a new array:
```typescript
// ❌ Wrong
edges.value.splice(edgeIndex, 1);

// ✅ Correct
edges.value = edges.value.filter((_, index) => index !== edgeIndex);
```

### Problem: TypeScript Errors with Vue Flow Types

**Issue:** Complex Vue Flow types cause TypeScript errors

**Solution:** Use `any` with ESLint disable:
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
addSelectedNodes([node as any]);
```

### Problem: Quasar Notify Not Working

**Issue:** `Notify.create is not a function`

**Solution:**
1. Add to `quasar.config.ts`:
```typescript
framework: {
  plugins: ['Notify'],
}
```

2. Import directly:
```typescript
import { Notify } from 'quasar';
```

## Data Export/Import

**Export to JSON:**
```typescript
function exportJSON() {
  const dataModel = {
    nodes: nodes.value,
    edges: edges.value,
  };

  const jsonString = JSON.stringify(dataModel, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `mindmap-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
```

## Next Steps for Official Project

### 1. Tiptap Integration
- Make nodes editable with rich text
- Implement inferred titles (auto-generate from first 2-3 words)
- Support empty titles with auto-inference
- Use `foreignObject` in SVG for rich text display

### 2. Full Document View
- Display all nodes as editable text blocks
- Show hierarchy with indentation (10px per level)
- Hover borders for node boundaries
- Drag handles for reordering
- Sync with mindmap view

### 3. Content Mode
- Edit individual node content
- Full Tiptap editor for rich text
- Sync with mindmap and Full Document views

### 4. Data Persistence
- Store mindmap JSON in Google Drive
- Use Supabase only for user metadata (login, preferences, payment)
- No mindmap data on our servers

### 5. Node Ordering
- Add `order` field to node data
- Implement drag-drop reordering in tree view
- Sort children by order field

## File Structure

```
mindmap-writer/vueflow/vueflow-test/
├── src/
│   └── pages/
│       └── VueFlowTest.vue    # Main implementation (1300+ lines)
├── quasar.config.ts           # Quasar configuration (Notify plugin)
└── package.json               # Dependencies
```

## Dependencies

```json
{
  "dependencies": {
    "@vue-flow/background": "^1.3.0",
    "@vue-flow/controls": "^1.1.1",
    "@vue-flow/core": "^1.33.5",
    "d3-force": "^3.0.0",
    "quasar": "^2.12.0",
    "vue": "^3.3.4"
  }
}
```

## Testing Checklist

- [ ] Create nodes with Ctrl+Click
- [ ] Create child nodes with Ctrl+Arrow keys
- [ ] Create child nodes with Alt+Drag to empty space
- [ ] Create hierarchy connections with Shift+Drag between nodes
- [ ] Create reference connections by dragging between nodes
- [ ] Reparent nodes (Shift+Drag from new parent to existing child)
- [ ] Verify circular reference prevention
- [ ] Delete nodes and edges with Delete key
- [ ] Multi-select nodes with Shift+drag
- [ ] Verify tree view shows correct hierarchy
- [ ] Click node in tree → highlights on canvas
- [ ] Click node on canvas → highlights in tree
- [ ] Multi-select on canvas → all highlighted in tree
- [ ] Test D3 collision avoidance (OFF/Manual/Auto modes)
- [ ] Export JSON and verify data structure

## Conclusion

This MVP successfully demonstrates all core features needed for the official mindmap project:
- ✅ Free node positioning (whiteboard-style)
- ✅ Multiple root nodes support
- ✅ Hierarchical relationships with single parent rule
- ✅ Reference connections for cross-references
- ✅ Smart reparenting with circular reference prevention
- ✅ D3-force collision avoidance
- ✅ Tree view with bidirectional multi-selection
- ✅ Clean visual design with proper styling

**Ready to move forward with Tiptap integration and Full Document view!** 🚀


