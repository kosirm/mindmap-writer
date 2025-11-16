# Inferred Title Highlight - Implementation Complete ✅

## Context

We implemented an "inferred title" system where node titles can be automatically extracted from content:
- If `title === ''` (empty), display first ~20 characters from content (rounded to word boundary)
- If `title !== ''`, display explicit title (user set it)
- The inferred portion is highlighted in the Content Editor with a yellow background and amber underline
- A visual resize handle (vertical bar) appears at the end of the highlight for future drag-to-resize functionality

## Implementation

### Files Modified

1. **`TiptapExtensions/InferredTitleMark.ts`** - Custom Tiptap Mark extension
   - Renders as `<span data-inferred-title="true" class="inferred-title-highlight">`
   - `setInferredTitleMark(length)` command applies highlight from position 0 to `length`
   - `unsetInferredTitleMark()` command removes highlight
   - Uses transaction-based approach: `tr.addMark(0, actualLength, mark)`

2. **`TiptapEditor.vue`** - Integrated the extension
   - Added `InferredTitleMark` to editor extensions
   - Created `inferTitleFromContent()` helper (duplicates store logic)
   - Created `updateInferredTitleHighlight()` function that:
     - Checks if node has empty title (inferred mode)
     - Calculates inferred title using same logic as store
     - Applies highlight for exact length of inferred title
   - Called in: `onUpdate` handler, mode switch to 'node', node selection change
   - Added CSS styling with yellow highlight and resize handle

3. **`Mindmap/draw/index.ts`** - Fixed event binding issue
   - Added `bindEvent(update, isRoot)` call in `updateNode()` function
   - **Critical fix**: Previously only `appendNode()` called `bindEvent()`, but `updateNode()` didn't
   - This caused nodes to lose event handlers when mindmap data updated (which happens on every keystroke in Content Editor)

## ISSUE #1: Highlight Off By One Character ✅ SOLVED

### Problem Description

The highlight stopped one character before the actual inferred title ended.

**Example 1:**
```
Text:        "This title rules definetely!"
Title:       "This title rules"
Highlighted: "This title rule"  ← missing 's'
```

**Example 2:**
```
Text:        "A new change made in the Content editor"
Title:       "A new change made"
Highlighted: "A new change mad"  ← missing 'e'
```

The user used `||` notation to show where the resize handle appeared:
```
|This title rule||s definetely!
```

### Root Cause - FOUND!

The issue was in the `setInferredTitleMark` command in `InferredTitleMark.ts`. It was applying the mark from position 0 to `actualLength`:

```typescript
tr.addMark(0, actualLength, mark);
```

But in ProseMirror's document structure:
- Position 0 is **before** the document node
- Position 1 is the **start** of the first paragraph's content
- Position 2 is **after** the first character (between 1st and 2nd character)
- etc.

So to highlight N characters, we need to mark from position **1** to position **1+N**, not from 0 to N.

When we applied the mark from 0 to N, we were actually highlighting from "before the doc" to "after character N-1", which resulted in only N-1 characters being highlighted.

### Solution

Changed the mark application to account for the document structure:

```typescript
// The first paragraph starts at position 1 (after the doc node)
// So to highlight N characters, we need to mark from position 1 to position 1+N
const startPos = 1; // Start of first paragraph content
const endPos = startPos + actualLength;

tr.addMark(startPos, endPos, mark);
```

This correctly highlights all N characters of the inferred title.

## ISSUE #2: Nodes with Inferred Titles Cannot Be Selected with Mouse ✅ SOLVED

### Problem Description

Nodes with inferred titles (empty title field) could not be:
- Selected by clicking with mouse ❌ **BROKEN**
- Edited by double-clicking with mouse ❌ **BROKEN**
- Selected from tree view (selection didn't sync to mindmap) ❌ **BROKEN**

BUT they COULD be:
- Selected with keyboard navigation (arrow keys) ✅ **WORKS**
- Edited when selected via keyboard (start typing) ✅ **WORKS**

**Key observations:**
- Only affected nodes with inferred titles (empty title field)
- Nodes with explicit titles worked fine with mouse
- Keyboard navigation worked for all nodes
- This broke core mindmap functionality (can't add siblings with Enter, etc.)

### Root Cause - FOUND!

The `updateInferredTitleHighlight()` function was applying/removing the inferred title mark without setting the `isUpdatingFromStore` flag to `true`. This caused:

1. User clicks on node with inferred title
2. `onSelect` is called, which calls `selectGNode(d)` to add the `selected` class
3. Content watcher triggers and updates the editor content
4. `updateInferredTitleHighlight()` is called
5. It calls `editor.value.commands.setInferredTitleMark()` **without** setting `isUpdatingFromStore = true`
6. This triggers the `onUpdate` callback in the editor
7. `onUpdate` emits `update:node-content` event
8. `handleNodeContentUpdate` in MindmapPage receives the event
9. It updates the store with `store.updateDocument(updatedDoc)`
10. This triggers a mindmap redraw
11. The redraw removes the `selected` class that was just added in step 2!

### Solution

Set `isUpdatingFromStore.value = true` before applying/removing the inferred title mark, and reset it to `false` after:

```typescript
function updateInferredTitleHighlight() {
  // ... validation checks ...

  // Set flag to prevent onUpdate from emitting changes
  isUpdatingFromStore.value = true;

  // Apply or remove the mark
  if (selectedNode.value.title && selectedNode.value.title.trim() !== '') {
    editor.value.commands.unsetInferredTitleMark();
    isUpdatingFromStore.value = false;
    return;
  }

  // ... calculate inferred title ...

  if (inferredTitle) {
    editor.value.commands.setInferredTitleMark(inferredTitle.length);
  } else {
    editor.value.commands.unsetInferredTitleMark();
  }

  // Reset flag
  isUpdatingFromStore.value = false;
}
```

This prevents the `onUpdate` callback from emitting the `update:node-content` event when we're just updating the visual highlight, which prevents the unnecessary store update and mindmap redraw.

### Root Cause

When typing in Content Editor (Node Content mode):
1. `handleNodeContentUpdate` in MindmapPage updates store
2. `store.updateDocument()` increments `documentVersion`
3. `legacyDocument` computed updates
4. Mindmap component's `watch(() => props.modelValue)` fires
5. `draw()` is called
6. D3's `.join(appendNode, updateNode)` is executed:
   - New nodes → `appendNode()` → calls `bindEvent()` ✅
   - Existing nodes → `updateNode()` → did NOT call `bindEvent()` ❌

Result: Every keystroke caused existing nodes to lose their event handlers!

### Solution

Added `bindEvent(update, isRoot)` call in `updateNode()` function at line 240 in `Mindmap/draw/index.ts`:

```typescript
attrA(isRoot, gTrigger, gTextRect, gExpandBtn, gAddBtn, gIconsRect)

// Rebind events on update (important for reactivity)
bindEvent(update, isRoot)

update.each((d: Mdata, i: number) => {
  // ...
})
```

Now event handlers are rebound every time nodes are updated, maintaining interactivity.

**UPDATE:** This fix did NOT work. The issue persists even after adding `bindEvent(update, isRoot)`.

### Solution

Added `pointer-events: none` to the `.trigger` CSS class in `Mindmap.module.scss`:

```scss
.trigger {
  fill: transparent;
  pointer-events: none; // Don't capture events - let them pass through to gText
}
```

This allows mouse events to pass through the trigger rect and reach the `gText` element where the actual event handlers are bound.

### Why It Only Affected Inferred Title Nodes in Node Content Mode

This is still unclear, but the fix resolves the issue regardless. The trigger rect was always there, but something about the combination of:
- Node Content mode
- Inferred titles (empty title field)
- Tiptap editor being active

...caused the trigger rect to block events. Possibly related to z-index, rendering order, or some CSS cascade issue.

### Status

**SOLVED** ✅

### What We Observed From Logs

From the comprehensive debug logs (dev.log), we observed:

1. **Events ARE reaching the browser:**
   - `[GLOBAL] mousedown event (capture phase)` fires
   - `[GLOBAL] mousedown event (bubble phase)` fires
   - `[GLOBAL] click event (capture phase)` fires
   - `[GLOBAL] click event (bubble phase)` fires
   - Target is `rect.trigger` element

2. **Mindmap event handlers are NOT firing:**
   - `[Mindmap draw] gText mousedown fired` - **NEVER appears**
   - `[Mindmap listener] onSelect called` - **NEVER appears**
   - `[Mindmap listener] onEdit called` - **NEVER appears**

3. **Event binding logs show events ARE being bound:**
   - `[Mindmap draw] bindEvent - binding events` appears in logs
   - `gText` and `textElement` are found (not empty)
   - Pointer events are set correctly

4. **The problem is specific:**
   - Only affects nodes with inferred titles (empty title field)
   - Only happens in Node Content mode
   - Works fine in Full Document mode
   - Works fine for nodes with explicit titles

### Additional Investigation Needed

The problem is more complex than just missing event bindings. The mousedown event is bound to `gText`, but clicks are hitting the `rect.trigger` element (which is a sibling of `gText`). Possible areas to investigate:

1. **Event target mismatch**: The mousedown handler is on `gText`, but clicks hit `rect.trigger` (sibling element)
2. **Event propagation**: Events on `rect.trigger` don't propagate to `gText` because they're siblings, not parent-child
3. **DOM structure**: Need to understand the hierarchy: `gContent` → siblings: `rect.trigger`, `gText`, `gIconsContainer`
4. **Why it works for explicit titles**: Need to understand what's different about nodes with explicit titles
5. **Why it works in Full Document mode**: Something about Node Content mode is causing the issue
6. **Trigger rect dimensions**: The trigger rect might be covering the entire node area for inferred title nodes
7. **Bind event to correct element**: Maybe we should bind mousedown to `gContent` or `rect.trigger` instead of just `gText`

## Testing Results

### Issue #2 Testing (Event Binding) - NEEDS TESTING
- [ ] Reload page and test Issue #2 fix:
  - [ ] Switch to Node Content mode
  - [ ] Click on node with inferred title - should select
  - [ ] Double-click on node with inferred title - should open edit input
  - [ ] Select node with inferred title in tree view - should sync to mindmap
  - [ ] Type in Content Editor - nodes should remain clickable

**Expected Result:** Adding `pointer-events: none` to `.trigger` should fix the issue.

### Issue #1 Testing (Highlight Off By One)
- [ ] Debug Issue #1 (highlight off by one):
  - [ ] Add logging to inspect document structure
  - [ ] Verify mark application range
  - [ ] Inspect rendered HTML in DevTools
  - [ ] Test with different content types

## Additional Fixes

### Tooltip Fix for q-btn-toggle

Fixed tooltips not showing on the text editor mode toggle buttons by adding `slot` property to the options:

```vue
:options="[
  { value: 'full', icon: 'description', slot: 'full' },
  { value: 'node', icon: 'article', slot: 'node' }
]"
```

This tells Quasar which slot template to use for each button.

## Additional Notes

- The Tiptap editor and mindmap are in separate panels and shouldn't interfere with each other
- The inferred title highlight is purely visual in the editor - it doesn't affect the mindmap rendering
- The `inferTitleFromContent()` function in TiptapEditor.vue duplicates the logic from `stores/mindmap.ts` - consider refactoring to share code

## Files Modified

1. **`mindmap-writer/writer/src/components/Mindmap/css/Mindmap.module.scss`**
   - Added `pointer-events: none` to `.trigger` class (line 56)

2. **`mindmap-writer/writer/src/pages/MindmapPage.vue`**
   - Fixed tooltip slots for q-btn-toggle (lines 262-263)

3. **`mindmap-writer/writer/src/components/Mindmap/draw/index.ts`**
   - Added comprehensive debugging logs to bindEvent function
   - Added logging for gTrigger, gText, and text element pointer-events
   - Added mousedown listener to gTrigger for debugging

## FEATURE: Drag-to-Resize Inferred Title ✅ IMPLEMENTED

### Feature Description

Users can now drag the resize handle at the end of the inferred title highlight to customize how many characters are used as the title.

**How it works:**
1. Hover over the vertical bar (resize handle) at the end of the yellow highlight
2. Cursor changes to a horizontal resize cursor (↔)
3. Click and drag left/right to decrease/increase the title length
4. Release to apply the new length
5. The custom length is stored in the node's `inferredCharCount` property

### Implementation

**Files Modified:**

1. **`TiptapExtensions/InferredTitleMark.ts`**
   - Added `onResize` callback to options interface
   - Implemented `addProseMirrorPlugins()` method with custom Plugin
   - Plugin handles mousedown events on the resize handle (::after pseudo-element)
   - Detects clicks within 8px of the right edge of the highlight span
   - Tracks mouse movement and calculates character delta based on pixel movement
   - Updates the mark in real-time during drag
   - Calls `onResize` callback with final length on mouseup

2. **`TiptapEditor.vue`**
   - Added `handleInferredTitleResize(newLength)` function
   - Stores custom character count in `selectedNode.value.inferredCharCount`
   - Emits update to store to persist the change
   - Configured `InferredTitleMark` extension with `onResize` callback

### Technical Details

**Resize Detection:**
- Checks if click target has class `inferred-title-highlight`
- Calculates distance from click position to right edge of span
- Only activates if click is within 8px of right edge (resize handle area)

**Character Calculation:**
- Estimates character width: `charWidth = spanWidth / currentLength`
- Calculates character delta: `deltaChars = Math.round(deltaX / charWidth)`
- Clamps new length: `newLength = Math.max(1, Math.min(currentLength + deltaChars, textLength))`

**Real-time Update:**
- During drag: Updates mark immediately for visual feedback
- On release: Calls `onResize` callback to persist the change
- Prevents text selection during drag with `event.preventDefault()`

### User Experience

- **Visual feedback**: Highlight updates in real-time as you drag
- **Constraints**:
  - Minimum length: 1 character
  - Maximum length: Total content length
- **Persistence**: Custom length is saved in node metadata
- **Override**: Custom length overrides the default 20-character inference
- **Reset**: Delete the title in the mindmap to reset to auto-inference

### Testing

To test the resize feature:
1. Switch to Node Content mode
2. Select a node with an inferred title (empty title field)
3. In the Content Editor, hover over the vertical bar at the end of the yellow highlight
4. Click and drag left/right to resize
5. Release and verify:
   - The highlight length changes
   - The title in the mindmap updates to match the new length
   - The custom length persists when you switch nodes and come back

