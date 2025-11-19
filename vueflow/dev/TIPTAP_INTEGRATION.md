# Tiptap Integration - Canvas Node Editing

**Status:** ✅ FULLY WORKING (Phase 3 complete)
**Last Updated:** 2025-11-19
**Library:** [Tiptap](https://tiptap.dev/) - Rich text editor for Vue 3

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [How It Works](#how-it-works)
4. [Usage](#usage)
5. [Event Flow](#event-flow)
6. [Configuration](#configuration)
7. [Critical Lessons Learned](#critical-lessons-learned)
8. [Future Enhancements](#future-enhancements)

---

## Overview

Tiptap is integrated into canvas nodes to enable rich text editing of node titles. The implementation uses **lazy loading** - Tiptap editors are only created when needed (on E key press) and destroyed when editing is complete (on blur).

**Key Features:**
- ✅ **Lazy Loading:** Editors created on-demand, destroyed on blur
- ✅ **Single Active Editor:** Only one node can be edited at a time (performance)
- ✅ **Rich Text:** Bold, italic, strike, code formatting
- ✅ **Event-Driven:** Uses event bus for communication
- ✅ **Auto-Save:** Changes saved automatically on blur
- ✅ **Seamless UX:** Press E to edit, click away to save
- ✅ **Event Isolation:** Keyboard events don't bubble to Vue Flow
- ✅ **Invisible Handles:** Transparent connection handles with crosshair cursor

---

## Architecture

### File Structure

```
src/
├── composables/
│   ├── useEventBus.ts          # Event bus (includes node editing events)
│   └── useNodeEditor.ts        # Global Tiptap editor state management
├── components/
│   └── CustomNode.vue          # Node component with lazy Tiptap
└── pages/
    └── VueFlowTest.vue         # Main page (uses CustomNode)
```

### Component Hierarchy

```
VueFlowTest.vue
  └── VueFlow
      └── CustomNode.vue (for each node)
          ├── Static HTML (default)
          └── EditorContent (when editing)
```

---

## How It Works

### 1. Default State (Not Editing)

- Node displays static HTML (`v-html="displayTitle"`)
- No Tiptap editor instance exists
- Minimal memory footprint

### 2. Press E Key to Edit

1. User selects a node (clicks on it)
2. User presses E key
3. `VueFlowTest.onKeyDown()` detects E key
4. Emits `node:edit-start` event with selected node ID
5. `CustomNode.handleEditStart()` receives event
6. Sets `activeNodeId` to this node's ID
7. Creates Tiptap editor with `createTitleEditor()` in `nextTick()`
8. Editor auto-focuses at end of content
9. Component switches to `<EditorContent>` view

**Why E key instead of double-click?**
- Vue Flow intercepts double-click for zoom functionality
- Alt+Click conflicts with Alt+Drag for reference connections
- E key (for Edit) is intuitive and doesn't conflict

### 3. Editing

- User types and formats text
- `onUpdate` callback fires on every keystroke
- Updates node data via `emit('update:data')`
- Emits `node:title-updated` event

### 4. Blur (Save and Exit)

1. User clicks away or presses Escape
2. `onBlur` callback fires
3. Destroys Tiptap editor with `destroyActiveEditor()`
4. Emits `node:edit-end` event
5. Component switches back to static HTML view

---

## Usage

### For Users

1. **Start Editing:**
   - Click on a node to select it
   - Press **E** key to start editing
2. **Format Text:**
   - `Ctrl+B` - Bold
   - `Ctrl+I` - Italic
   - `Ctrl+Shift+X` - Strike
   - `Ctrl+E` - Code (Note: E key alone starts editing, Ctrl+E formats as code)
   - `Shift+Enter` - Line break
   - `Backspace` - Delete characters (won't delete the node)
3. **Save:** Click away or press Escape

### For Developers

**Creating a Node:**

```typescript
const newNode = createNode(x, y, 'Initial Title');
nodes.value.push(newNode);
```

**Listening to Edit Events:**

```typescript
eventBus.on('node:edit-start', ({ nodeId }) => {
  console.log('Started editing:', nodeId);
});

eventBus.on('node:title-updated', ({ nodeId, title }) => {
  console.log('Title updated:', nodeId, title);
});

eventBus.on('node:edit-end', ({ nodeId }) => {
  console.log('Finished editing:', nodeId);
});
```

---

## Event Flow

### Edit Start Flow

```
User clicks node to select it
  ↓
User presses E key
  ↓
VueFlowTest.onKeyDown() detects E key
  ↓
eventBus.emit('node:edit-start', { nodeId })
  ↓
CustomNode.handleEditStart() receives event
  ↓
activeNodeId.value = nodeId
  ↓
nextTick() waits for reactivity
  ↓
createTitleEditor(content, onUpdate, onBlur)
  ↓
Editor created and focused
```

### Update Flow

```
User types in editor
  ↓
Tiptap onUpdate callback
  ↓
handleTitleUpdate(html)
  ↓
emit('update:data', { ...data, title: html })
  ↓
eventBus.emit('node:title-updated', { nodeId, title })
  ↓
VueFlowTest.updateNodeData(nodeId, newData)
  ↓
Node data updated in store
```

### Blur Flow

```
User clicks away
  ↓
Tiptap onBlur callback
  ↓
handleBlur()
  ↓
destroyActiveEditor()
  ↓
eventBus.emit('node:edit-end', { nodeId })
  ↓
Editor destroyed, memory freed
```

---

## Configuration

### Tiptap Extensions

Currently enabled in `useNodeEditor.ts`:

```typescript
StarterKit.configure({
  // Disabled (not needed for simple titles)
  heading: false,
  codeBlock: false,
  blockquote: false,
  horizontalRule: false,
  
  // Enabled (basic formatting)
  bold: true,
  italic: true,
  strike: true,
  code: true,
  hardBreak: true,  // Shift+Enter for line breaks
})
```

### Editor Props

```typescript
editorProps: {
  attributes: {
    class: 'tiptap-editor',
    spellcheck: 'false',  // Disabled for cleaner UX
  },
}
```

---

## Critical Lessons Learned

### 🔴 Problem 1: Vue Reactivity with Computed Properties

**Issue:** The `isEditing` computed property wasn't reacting to changes in `activeNodeId`.

**Root Cause:** Using a function call `isNodeActive(props.id)` inside the computed prevented Vue from tracking the dependency on `activeNodeId.value`.

**Solution:**
```typescript
// ❌ WRONG - Function call breaks reactivity tracking
const isEditing = computed(() => isNodeActive(props.id));

// ✅ CORRECT - Direct reference enables reactivity
const isEditing = computed(() => activeNodeId.value === props.id);
```

**Lesson:** Always directly reference reactive values in computed properties, don't wrap them in function calls.

---

### 🔴 Problem 2: Circular Dependency in Computed

**Issue:** `isEditing` computed checked both `activeNodeId` AND `localEditor`, creating timing issues.

**Root Cause:** The computed was checking `localEditor.value !== null`, but `localEditor` was set AFTER the computed ran, so it never updated.

**Solution:**
```typescript
// ❌ WRONG - Circular dependency
const isEditing = computed(() => {
  return activeNodeId.value === props.id && localEditor.value !== null;
});

// ✅ CORRECT - Only depend on activeNodeId
const isEditing = computed(() => {
  return activeNodeId.value === props.id;
});
```

**Lesson:** Keep computed properties simple. Don't create circular dependencies between computed and refs.

---

### 🔴 Problem 3: destroyActiveEditor() Clearing activeNodeId

**Issue:** After creating the editor, `activeNodeId` was immediately set back to `null`, destroying the editor.

**Root Cause:** `createTitleEditor()` called `destroyActiveEditor()` at the start, which always set `activeNodeId.value = null`.

**Solution:**
```typescript
// ❌ WRONG - Always clears activeNodeId
export function createTitleEditor(...) {
  destroyActiveEditor();  // This sets activeNodeId = null!
  // ...
}

// ✅ CORRECT - Only destroy editor, keep activeNodeId
export function createTitleEditor(...) {
  if (activeTitleEditor.value) {
    activeTitleEditor.value.destroy();
    activeTitleEditor.value = null;
  }
  // Don't touch activeNodeId here!
  // ...
}
```

**Lesson:** Be careful with cleanup functions that modify global state. Only clean up what's necessary.

---

### 🔴 Problem 4: Event Bubbling to Vue Flow

**Issue:** Typing "e" or pressing Backspace in the editor triggered Vue Flow actions (start editing again, delete node).

**Root Cause:** Keyboard events from the editor were bubbling up to Vue Flow's keyboard handlers.

**Solution:**
```vue
<!-- ✅ CORRECT - Stop event propagation -->
<div
  v-else
  @keydown.stop
  @keyup.stop
  @keypress.stop
  class="node-title-editor-wrapper"
>
  <EditorContent :editor="localEditor" />
</div>
```

**Lesson:** Always use `.stop` modifier on keyboard events in nested components to prevent bubbling.

---

### 🔴 Problem 5: Double-Click Conflicts with Vue Flow

**Issue:** Double-click on nodes triggered Vue Flow's zoom functionality instead of editing.

**Root Cause:** Vue Flow intercepts double-click events for its own features.

**Attempted Solutions:**
- ❌ Alt+Click - Conflicts with Alt+Drag for reference connections
- ❌ Ctrl+Click - Already used for creating nodes

**Final Solution:** ✅ **E key** when node is selected
- Intuitive (E for Edit)
- No conflicts with existing shortcuts
- Works perfectly

**Lesson:** When integrating with libraries like Vue Flow, keyboard shortcuts are often safer than mouse events.

---

### 🔴 Problem 6: Async Event Handlers and ESLint

**Issue:** ESLint error: "Promise returned in function argument where a void return was expected"

**Root Cause:** Event bus expects void return, but `async` functions return Promises.

**Solution:**
```typescript
// ❌ WRONG - async returns Promise
async function handleEditStart({ nodeId }: { nodeId: string }) {
  await nextTick();
  // ...
}
eventBus.on('node:edit-start', handleEditStart);  // ESLint error!

// ✅ CORRECT - Use void operator or callback
function handleEditStart({ nodeId }: { nodeId: string }) {
  void nextTick(() => {
    // ...
  });
}
eventBus.on('node:edit-start', handleEditStart);  // No error!
```

**Lesson:** Use `void` operator with Promises in event handlers, or use callbacks instead of async/await.

---

### 🟢 Success: Connection Handle Styling

**Achievement:** Made connection handles invisible while keeping functionality.

**Implementation:**
```css
.center-handle {
  width: 24px !important;
  height: 24px !important;
  background: transparent !important;
  border: none !important;
  opacity: 0 !important;
  cursor: crosshair !important;
}
```

**Result:** Clean UI with crosshair cursor indicating draggable area, no visible blue dot.

**Lesson:** Use `!important` to override library styles when necessary. Larger invisible handles are easier to target.

---

### 🟢 Success: Straight Connection Preview

**Achievement:** Made connection preview line straight to match final connections.

**Implementation:**
```vue
<VueFlow
  connection-line-type="straight"
  :default-edge-options="{ type: 'straight' }"
>
```

**Lesson:** Vue Flow has separate props for preview (`connection-line-type`) and final edges (`default-edge-options`).

---

### 🟢 Success: HTML Paragraph Margin Removal

**Achievement:** Made static HTML display match Tiptap editor styling perfectly.

**Implementation:**
```css
/* Remove default paragraph margins from HTML content */
.node-title :deep(p) {
  margin: 0;
  padding: 0;
}
```

**Lesson:** Use `:deep()` to style HTML content rendered with `v-html`.

---

## Future Enhancements

### Planned Features

1. **Auto-Resize Nodes**
   - Detect multi-line titles
   - Emit `node:resize-requested` event
   - Adjust node height dynamically

2. **Content Field**
   - Add second field for longer content
   - Separate title (short) and content (long)
   - Expand/collapse content in canvas

3. **Keyboard Navigation**
   - Enter: Create new connected node
   - Tab: Navigate to next node
   - Shift+Tab: Navigate to previous node

4. **Advanced Formatting**
   - Links
   - Highlights
   - Text colors
   - Lists (bullet, numbered)

5. **Collaborative Editing**
   - Real-time collaboration with Yjs
   - Show who's editing which node
   - Conflict resolution

---

## Related Documentation

- **Event Bus:** `EVENT_BUS_ARCHITECTURE.md` - Event system documentation
- **MVP Documentation:** `MVP_DOCUMENTATION.md` - Current MVP features
- **Quick Reference:** `QUICK_REFERENCE.md` - Common patterns
- **Lessons Learned:** `LESSONS_LEARNED.md` - Problems from first iteration

---

**Last Updated:** 2025-11-19
**Author:** Milan Košir
**Status:** ✅ FULLY WORKING - Tiptap integration complete with all critical issues resolved

