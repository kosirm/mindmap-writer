# Keyboard Navigation & Lazy Tiptap Loading

## Overview

This document describes the implementation of keyboard navigation and lazy Tiptap editor loading in the Full Document view. The system allows seamless navigation through the entire document using arrow keys while maintaining performance through on-demand editor instantiation.

## Key Achievements

### 1. Lazy Tiptap Loading Strategy
**Problem**: Loading Tiptap editors for all nodes at once causes performance issues with large documents.

**Solution**: Lazy loading with single active editor constraint:
- Display static HTML by default (read-only view)
- Load Tiptap editors on-demand when user clicks a field
- **Only ONE node can have active editors at a time** (global state management)
- Automatically destroy previous editors when activating new ones

### 2. Seamless Keyboard Navigation
**Achievement**: Navigate through the entire document using only arrow keys:
- **Left/Right arrows**: Navigate between fields at start/end of text
- **Up/Down arrows**: Navigate between fields at first/last line of multi-line text
- **Enter key**: Navigate from title to content
- Works across all nodes in the document tree

### 3. Automatic Editor Activation
**Key Feature**: Editors activate automatically during keyboard navigation:
- When navigating to a new field, the system automatically loads the Tiptap editor
- Cursor is positioned correctly (start/end based on navigation direction)
- Previous editors are cleaned up automatically

## Architecture

### Core Components

#### 1. `useFullDocumentEditor.ts` - Global Editor State Management
**Purpose**: Manages the single active editor instance globally

**Key Functions**:
- `createTitleEditor()` - Creates title editor with keyboard handlers
- `createContentEditor()` - Creates content editor with keyboard handlers
- `setActiveNode()` - Ensures only one node has active editors
- `clearActiveEditors()` - Cleans up editors when switching nodes

**Global State**:
```typescript
const activeNodeId = ref<string | null>(null);
```

**Keyboard Event Handlers**:
- `onEnterKey` - Navigate from title to content
- `onLeftArrowAtStart` - Navigate to previous field
- `onRightArrowAtEnd` - Navigate to next field
- `onUpArrowAtFirstLine` - Navigate to previous field (multi-line)
- `onDownArrowAtLastLine` - Navigate to next field (multi-line)

#### 2. `useDocumentNavigation.ts` - Tree Flattening & Navigation Logic
**Purpose**: Flattens the hierarchical tree into a linear sequence of editable fields

**Key Concept**: Depth-first traversal creates a linear navigation path:
```
Root Title → Root Content → Child1 Title → Child1 Content → Child2 Title → ...
```

**Key Functions**:
- `flattenTree()` - Converts tree to linear sequence
- `getNextField()` - Returns next editable field
- `getPreviousField()` - Returns previous editable field

**Important**: Uses Vue `computed` property for automatic reactivity:
```typescript
const flattenedFields = computed<EditableField[]>(() => {
  return flattenTree(store.currentDocument);
});
```
This ensures the flattened tree automatically updates when nodes are dragged/reordered.

#### 3. `FullDocumentDraggable.vue` - Individual Node Component
**Purpose**: Renders individual nodes with lazy Tiptap loading

**Lazy Loading Pattern**:
```typescript
// Default: Show static HTML
<div v-if="!isTitleEditing" @click="handleTitleClick">
  <div v-html="displayTitle"></div>
</div>

// On-demand: Load Tiptap editor
<div v-else>
  <TiptapEditor :editor="activeTitleEditor" />
</div>
```

**Event Bus Integration**:
```typescript
fieldNavigationBus.on('open-field', (event) => {
  if (event.nodeId === props.node.id) {
    // Activate editor and set cursor position
  }
});
```

### Event Bus Communication

**Purpose**: Cross-component communication for field navigation

**Implementation**: Uses `mitt` library
```typescript
export const fieldNavigationBus = mitt<{
  'open-field': { nodeId: string; field: 'title' | 'content'; cursorPosition: 'start' | 'end' };
}>();
```

**Flow**:
1. User presses arrow key in Editor A
2. Keyboard handler determines next field
3. Emits `'open-field'` event with target field info
4. Target component receives event
5. Activates editor and positions cursor

## Technical Implementation Details

### Left/Right Arrow Detection (Start/End of Text)

**Challenge**: Detect when cursor is at absolute start/end of entire content (not just a paragraph)

**Solution**: Use absolute position checking
```typescript
// At start
const isAtAbsoluteStart = $head.pos === 1;

// At end (note: max position is doc.content.size - 1)
const isAtAbsoluteEnd = $head.pos >= state.doc.content.size - 1;
```

**Key Insight**: In ProseMirror:
- Position `1` is the start of content (position `0` is the doc node)
- Maximum cursor position is `doc.content.size - 1` (not `doc.content.size`)

### Up/Down Arrow Detection (First/Last Line)

**Challenge**: Detect when cursor is on first/last line of multi-line text

**Solution**: Coordinate-based detection
```typescript
const currentCoords = view.coordsAtPos(currentPos);

// Check if there's a position above with different vertical coordinate
let foundPositionAbove = false;
for (let pos = currentPos - 1; pos >= 1; pos--) {
  const coords = view.coordsAtPos(pos);
  if (coords.top < currentCoords.top - 5) { // 5px threshold
    foundPositionAbove = true;
    break;
  }
  if (currentPos - pos > 200) break; // Performance limit
}

const isOnFirstLine = !foundPositionAbove;
```

**Critical Fix**: Exclude document closing position
```typescript
// WRONG: Includes closing position (always on "new line")
const maxPos = state.doc.content.size;

// CORRECT: Exclude closing position
const maxPos = state.doc.content.size - 1;
```

**Why**: ProseMirror places the closing position (`doc.content.size`) on a virtual "new line" below the last character, causing false positives.

### Empty Content Handling

**Challenge**: Avoid creating/navigating to empty content fields

**Solution**: Parse HTML to check actual text content
```typescript
const hasContent = node.content && (() => {
  const tmp = document.createElement('div');
  tmp.innerHTML = node.content;
  const textContent = tmp.textContent || '';
  return textContent.trim() !== '';
})();
```

**Why**: HTML like `<p></p>` or `<p><br></p>` appears non-empty but has no actual text.

**Applied in**:
- `flattenTree()` - Only includes content fields with actual text
- Navigation handlers - Only navigates to existing content

### Automatic Editor Cleanup

**Pattern**: Clean up empty content when navigating away
```typescript
function cleanupEmptyContent() {
  if (activeContentEditor.value) {
    const html = activeContentEditor.value.getHTML();
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const textContent = tmp.textContent || '';

    if (textContent.trim() === '') {
      // Remove empty content from store
      store.updateNodeContent(props.node.id, '');
    }
  }
}
```

**When**: Called before navigating away from content field with up/left arrows

## Navigation Flow Examples

### Example 1: Right Arrow at End of Title
```
User: [Title text|] → Press Right Arrow
         ↓
Check: isAtAbsoluteEnd ($head.pos >= doc.content.size - 1)
         ↓
Handler: onRightArrowAtEnd()
         ↓
Check: Does node have content?
         ↓ YES
Navigate: Open content editor, cursor at start
         ↓ NO
Navigate: Get next field, open that editor
```

### Example 2: Down Arrow in Multi-line Content
```
User: Line 1
      Line 2
      Line 3|  → Press Down Arrow
         ↓
Check: Is cursor on last line? (coordinate-based)
         ↓
Coordinates: Check positions after current for larger top value
         ↓
Result: No position below found → isOnLastLine = true
         ↓
Handler: onDownArrowAtLastLine()
         ↓
Navigate: Get next field, open that editor, cursor at start
```

### Example 3: Click to Activate Editor
```
User: Click on static HTML title
         ↓
Event: handleTitleClick()
         ↓
Global State: setActiveNode(nodeId) - clears other editors
         ↓
Create: activeTitleEditor = createTitleEditor(...)
         ↓
Render: Show Tiptap editor component
         ↓
Focus: Editor focuses automatically
```

## Key Design Decisions

### 1. Single Active Editor Constraint
**Decision**: Only one node can have active editors at a time

**Rationale**:
- Performance: Reduces memory usage and DOM complexity
- UX: Clear focus - user knows which node is being edited
- Simplicity: Easier state management

**Implementation**: Global `activeNodeId` ref in `useFullDocumentEditor.ts`

### 2. Automatic Reactivity for Tree Changes
**Decision**: Use Vue `computed` for flattened fields

**Rationale**:
- Drag/drop reordering automatically updates navigation
- No manual refresh needed
- Always synchronized with store

**Implementation**: `flattenedFields = computed(() => flattenTree(store.currentDocument))`

### 3. Event Bus for Cross-Component Communication
**Decision**: Use `mitt` event bus for field navigation

**Rationale**:
- Decoupled components
- Easy to emit from keyboard handlers
- Easy to listen in target components

**Alternative Considered**: Direct component refs - rejected due to complexity with dynamic node list

### 4. Coordinate-Based Line Detection
**Decision**: Use `view.coordsAtPos()` for up/down arrow detection

**Rationale**:
- `view.endOfTextblock()` checks paragraph boundaries, not line boundaries
- Coordinates accurately reflect visual line positions
- Works with any text layout (wrapping, etc.)

**Trade-off**: Slightly more complex, but accurate

## Performance Considerations

### 1. Lazy Loading Benefits
- **Memory**: Only 1-2 Tiptap instances active vs. potentially hundreds
- **Initial Render**: Fast - just static HTML
- **Interaction**: Instant - editor loads on-demand

### 2. Coordinate Checking Optimization
```typescript
// Limit search range to prevent performance issues
if (currentPos - pos > 200) break; // Don't check more than 200 chars
```

### 3. Computed Property Caching
Vue's computed properties cache results until dependencies change, so `flattenedFields` is only recalculated when the tree structure changes.

## Future Considerations for Mindmap View

### Applying Similar Pattern to Mindmap

**Current Full Document Pattern**:
1. Display static HTML by default
2. Load Tiptap on click
3. Single active editor constraint
4. Keyboard navigation with automatic editor activation

**Adapting for Mindmap**:
1. **Display**: Show static HTML in `foreignObject` elements
2. **Activation**: Click node to activate editor (same pattern)
3. **Global State**: Reuse `useFullDocumentEditor` for consistency
4. **Navigation**: Arrow keys navigate between connected nodes
5. **Cleanup**: Clicking outside or pressing Escape deactivates editor

**Key Differences**:
- Navigation is spatial (up/down/left/right in 2D space) vs. linear
- Need to determine "next node" based on visual position, not tree order
- May need different keyboard shortcuts (e.g., Tab to navigate, Enter to edit)

**Shared Code**:
- `useFullDocumentEditor.ts` - Global state management (reusable)
- `createTitleEditor()` / `createContentEditor()` - Editor creation (reusable)
- Event bus pattern - Cross-component communication (reusable)

**New Requirements**:
- Spatial navigation logic (which node is "above" current node?)
- Visual focus indicator (highlight active node in mindmap)
- Click-outside detection (deactivate when clicking empty space)

## Testing Checklist

### Left/Right Arrow Navigation
- [ ] Left arrow at start of title navigates to previous field
- [ ] Right arrow at end of title navigates to content (if exists) or next field
- [ ] Left arrow at start of content navigates to title (if exists) or previous field
- [ ] Right arrow at end of content navigates to next field
- [ ] Navigation skips empty content fields
- [ ] Navigation works across multiple nodes

### Up/Down Arrow Navigation
- [ ] Up arrow on first line navigates to previous field
- [ ] Down arrow on last line navigates to next field
- [ ] Up/down arrows work normally within multi-line text
- [ ] Single-line text: down arrow navigates to next field
- [ ] Works in both title and content editors

### Editor Activation
- [ ] Clicking title activates title editor
- [ ] Clicking content activates content editor
- [ ] Only one node has active editors at a time
- [ ] Previous editors are cleaned up when switching nodes
- [ ] Cursor position is correct after navigation (start/end)

### Edge Cases
- [ ] Navigation at document boundaries (first/last field)
- [ ] Empty content is cleaned up when navigating away
- [ ] Drag/drop reordering updates navigation order
- [ ] Collapsed nodes are excluded from navigation
- [ ] Inferred title nodes (no title field) work correctly

## Important: Store Updates for Cross-View Synchronization

When updating node properties (like `inferredCharCount` or `inferredTitle`), you MUST call `store.updateDocument()` to trigger reactivity across all views:

```typescript
// Update the node properties
node.inferredCharCount = newLength;
node.inferredTitle = inferTitle(node.content, newLength);
node.updatedAt = new Date();

// CRITICAL: Trigger reactivity by updating the document in the store
// This ensures the change is reflected in all views (Full Document, Mindmap, Node Content, etc.)
if (store.currentDocument) {
  store.updateDocument(store.currentDocument);
}
```

**Why this is necessary**:
- Vue's reactivity system needs to be notified of deep object changes
- Without `store.updateDocument()`, changes in one view won't be reflected in other views
- This applies to ALL property updates, not just inferred titles

**Where this is used**:
- `FullDocumentDraggable.vue` - When resizing inferred title in Full Document view
- `TiptapEditor.vue` - When resizing inferred title in Node Content view
- Any component that modifies node properties

## Conclusion

This implementation provides a seamless editing experience with excellent performance characteristics. The lazy loading pattern and keyboard navigation can be adapted to the mindmap view with minimal changes to the core architecture.

**Key Takeaways**:
1. **Lazy loading** is essential for performance with large documents
2. **Global state management** simplifies editor lifecycle
3. **Event bus** enables clean cross-component communication
4. **Coordinate-based detection** is accurate for line boundaries
5. **Automatic reactivity** keeps navigation synchronized with data changes
6. **Store updates** are critical for cross-view synchronization

Good luck with the mindmap view implementation! 🚀


