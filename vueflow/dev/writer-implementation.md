# Writer Implementation Documentation

## Overview
The Writer view is a Full Document Editor that displays all mindmap nodes as editable text blocks in a hierarchical tree structure. It provides an alternative way to edit the mindmap content alongside the visual canvas and tree views.

## Architecture

### Components Structure
```
WriterEditor.vue (Main container)
└── WriterTree.vue (Recursive tree renderer)
    └── WriterDraggable.vue (Individual editable node)
```

### Key Features
1. **Hierarchical Display**: Nodes are indented by 10px per level to show parent-child relationships
2. **Lazy-Loaded Editors**: Tiptap editors are only created when user clicks to edit (performance optimization)
3. **Invisible Editor Switch**: Switching between HTML display and Tiptap editor is seamless (no visual change)
4. **Drag & Drop**: Full support for reordering nodes and changing hierarchy
5. **Selection Sync**: Selection is synchronized across all three views (canvas, tree, writer)

## Data Model

### Node Structure
```typescript
interface TreeItem {
  id: string;
  title: string;        // Node title (can be empty for inferred titles)
  content: string;      // Node content (HTML)
  parentId: string | null;
  order: number;        // Sibling order within parent
  children: TreeItem[];
}
```

### Order Field
- **Purpose**: Track the order of sibling nodes within the same parent
- **Type**: `number` (numeric index)
- **Usage**: When reordering via drag-drop, all affected siblings get their `order` updated
- **Sorting**: Nodes are always sorted by `order` when building tree structures

## Event System

### Event Bus Architecture
We use `mitt` for cross-component communication with three main selection events:

```typescript
// Event types
'canvas:node-selected': { nodeId: string }
'tree:node-selected': { nodeId: string | null }
'writer:node-selected': { nodeId: string | null; scrollIntoView: boolean; source: 'writer' | 'canvas' | 'tree' }
```

### Selection Synchronization Rules

**When node selected in Canvas:**
- ❌ Don't move or zoom canvas (node already visible)
- ✅ Scroll node into view in tree
- ✅ Scroll node into view in writer

**When node selected in Tree:**
- ✅ Center node in canvas (pan only, preserve zoom)
- ❌ Don't scroll tree (already visible)
- ✅ Scroll node into view in writer

**When node selected in Writer:**
- ✅ Center node in canvas (pan only, preserve zoom)
- ✅ Scroll node into view in tree
- ❌ Don't scroll writer (already visible)

### Event Flow Example
```
User clicks node in canvas
  → onNodeClick() emits 'canvas:node-selected'
  → handleCanvasNodeSelected() updates tree selection
  → handleCanvasNodeSelected() emits 'writer:node-selected' with source='canvas'
  → WriterDraggable receives event and scrolls itself into view
  → handleCanvasNodeSelected() calls scrollTreeNodeIntoView()
```

## Critical Implementation Details

### 1. Preventing Circular Event Loops
**Problem**: Canvas selection → Tree update → Tree emits event → Canvas centers → Infinite loop

**Solution**: Use `isTreeSelectionProgrammatic` flag with `nextTick()`
```typescript
// Set flag before programmatic update
isTreeSelectionProgrammatic.value = true;
selectedTreeNodeIds.value = [nodeId];

// Reset flag AFTER Vue updates (critical!)
void nextTick(() => {
  isTreeSelectionProgrammatic.value = false;
});
```

**Lesson**: Vue's reactivity is batched. Resetting flags immediately doesn't work - must use `nextTick()`.

### 2. Event Source Tracking
**Problem**: Same event (`writer:node-selected`) used for both directions caused unwanted behavior

**Solution**: Add `source` field to track event origin
```typescript
'writer:node-selected': { 
  nodeId: string | null; 
  scrollIntoView: boolean; 
  source: 'writer' | 'canvas' | 'tree' 
}
```

**Lesson**: When events flow bidirectionally, always track the source to prevent handlers from acting on their own emissions.

### 3. Invisible Editor Switching
**Problem**: Tiptap editor had blue border, padding, and different styling than HTML display

**Solution**: Match all styling exactly
```css
/* Remove all Tiptap default styling */
:deep(.ProseMirror) {
  outline: none;
  padding: 0;
  border: none;
  background-color: transparent;
  border-radius: 0;
}

/* Match font styling per context */
.node-title :deep(.ProseMirror) {
  font-weight: 600;
  font-size: 14px;
  line-height: 1.4;
  color: rgba(0, 0, 0, 0.87);
}
```

**Lesson**: For seamless transitions, every CSS property must match (padding, border, background, font, line-height, color).

### 4. Viewport Height Management
**Problem**: Using `height: 100vh` caused double scrollbars (page + writer)

**Solution**: Use `calc(100vh - 50px)` to account for toolbar
```vue
<q-page style="height: calc(100vh - 50px)">
```

**Lesson**: In Quasar layouts, pages need explicit height calculation to avoid overflow.

### 5. Drag & Drop with Placeholder
**Problem**: Users couldn't see where dragged item would land

**Solution**: Use `@vue-dnd-kit/core` with CSS placeholder
```css
.placeholder-box {
  height: 40px;
  border: 2px dashed #1976d2;
  background-color: rgba(25, 118, 210, 0.05);
  border-radius: 4px;
  margin: 4px 0;
}
```

**Lesson**: Visual feedback during drag operations significantly improves UX.

## Performance Optimizations

### 1. Lazy Editor Loading
Tiptap editors are only created when user clicks to edit:
```typescript
async function handleTitleClick() {
  if (!titleEditor.value) {
    await createTitleEditor();
  }
  isTitleEditing.value = true;
}
```

**Benefit**: Faster initial render, lower memory usage with many nodes

### 2. HTML Storage
Store HTML throughout the app (not plain text):
- Store: HTML
- Tiptap: HTML
- Display: HTML (via `v-html`)

**Benefit**: No conversion overhead, single source of truth

## Common Pitfalls & Solutions

### Pitfall 1: Tree Selection Not Working on First Click
**Cause**: `isTreeSelectionProgrammatic` flag reset too early
**Fix**: Use `nextTick()` to reset flag after Vue updates

### Pitfall 2: Canvas Centering When It Shouldn't
**Cause**: Event handler responding to its own emitted events
**Fix**: Add `source` field to events and check before acting

### Pitfall 3: Text Selection in Tree During Multi-Select
**Cause**: Default browser text selection behavior
**Fix**: Add `user-select: none` CSS to tree view

### Pitfall 4: Double Scrollbars
**Cause**: Page height = 100vh includes toolbar
**Fix**: Use `calc(100vh - toolbar_height)`

## Future Enhancements

1. **Inferred Titles**: Auto-generate titles from first 2-3 words of content
2. **Keyboard Navigation**: Arrow keys to move between nodes
3. **Bulk Operations**: Multi-select and batch edit
4. **Undo/Redo**: History management across all views
5. **Floating Menu**: Tiptap FloatingMenu extension for formatting

## Testing Checklist

- [ ] Click node in canvas → Tree and writer scroll to node
- [ ] Click node in tree → Canvas centers, writer scrolls
- [ ] Click node in writer → Canvas centers, tree scrolls
- [ ] Drag node in writer → Placeholder shows drop location
- [ ] Edit title → Switch to Tiptap is invisible
- [ ] Edit content → Switch to Tiptap is invisible
- [ ] Shift-select in canvas → No text selection in tree
- [ ] Many nodes → Only writer scrolls, not page

