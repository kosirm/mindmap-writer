# Inferred Titles Architecture

## Overview

The mindmap writer app supports **inferred titles** - when a node has an empty `title` field, the first few words of the content are automatically used as the title. Users can:
- See the inferred title highlighted in the content
- Resize the highlight by dragging the right edge
- Convert to manual title by typing in the title field

## Data Model

### MindmapNode Interface

```typescript
interface MindmapNode {
  title: string;              // Manual title (empty = use inferred)
  content: string;            // Content HTML with highlight: <span data-inferred-title>
  inferredCharCount?: number; // CACHE: length of highlighted portion
  // ... other fields
}
```

### Hybrid Architecture

**Single Source of Truth**: The highlight is stored in the `content` HTML as:
```html
<p><span data-inferred-title="true" class="inferred-title-highlight">First few words</span> rest of content...</p>
```

**Performance Cache**: `inferredCharCount` stores the length of the highlighted portion for fast access (avoids parsing HTML every time).

**Why Both?**
- `content` HTML = single source of truth (what is highlighted)
- `inferredCharCount` = performance optimization (how many characters are highlighted)

## Key Components

### 1. InferredTitleMark Extension (`TiptapExtensions/InferredTitleMark.ts`)

Custom Tiptap Mark extension that:
- Renders the highlight as `<span data-inferred-title="true" class="inferred-title-highlight">`
- Handles drag-to-resize functionality
- Provides visual feedback during resize (updates mark in real-time)
- Calls `onResize` callback only on mouseup (to update store)

**Key Features**:
- `isResizing` flag prevents `onUpdate` from firing during resize
- `parseHTML()` automatically applies mark when loading HTML with `<span data-inferred-title>`
- Resize zone: 16px from right edge of highlight

### 2. Utility Functions (`utils/inferredTitleUtils.ts`)

```typescript
// Extract plain text length from HTML highlight (strips all formatting)
extractInferredTitleLength(contentHtml: string): number | null

// Extract plain text from HTML highlight
extractInferredTitleText(contentHtml: string): string | null

// Update highlight length in HTML
updateInferredTitleLength(contentHtml: string, newLength: number): string

// Check if highlight exists
hasInferredTitleHighlight(contentHtml: string): boolean

// Remove highlight from HTML
removeInferredTitleHighlight(contentHtml: string): string

// Ensure highlight exists with specified length
ensureInferredTitleHighlight(contentHtml: string, targetLength: number): string
```

### 3. Content Editor (`TiptapEditor.vue`)

**Typing Behavior**:
- In `onUpdate` callback: Check if node has empty title
- If empty title: Apply highlight mark up to 20 characters as user types
- Use `isUpdatingFromStore` flag to prevent recursion

**Resize Behavior**:
- `handleInferredTitleResize(newLength)` callback:
  1. Get current HTML from editor
  2. Update HTML with new highlight length
  3. Update `node.content` and `node.inferredCharCount`
  4. Call `editor.commands.setContent(updatedHtml)` to refresh editor
  5. Update store

### 4. Full Document Editor (`useFullDocumentEditor.ts` + `FullDocumentDraggable.vue`)

**Typing Behavior**:
- In `onUpdate` callback: Check `isResizingInferredTitle()` to avoid interference
- If not resizing and node has empty title: Apply highlight mark up to 20 characters

**Resize Behavior**:
- `onInferredTitleResize(newLength)` callback:
  1. Get current HTML from editor
  2. Update HTML with new highlight length
  3. Update `node.content` and `node.inferredCharCount`
  4. **DON'T** call `setContent()` - the InferredTitleMark extension already updated the visual
  5. Update store

**Key Difference from Content Editor**: Don't call `setContent()` after resize because the mark is already visually updated.

## Data Flow

### When User Types (Empty Title Node)

1. User types character → `onUpdate` fires
2. Check if title is empty → Yes
3. Calculate target length: `Math.min(20, plainText.length)`
4. Apply mark: `editor.commands.setInferredTitleMark(targetLength)`
5. Save HTML to `node.content`
6. Update `node.inferredCharCount` cache

### When User Resizes Highlight

1. User drags right edge → `mousemove` events
2. InferredTitleMark extension updates mark visually (no callback)
3. User releases mouse → `mouseup` event
4. InferredTitleMark calls `onResize(newLength)` callback
5. Callback updates `node.content` HTML and `node.inferredCharCount`
6. Store is updated
7. **Content Editor**: Call `setContent()` to refresh
8. **Full Document**: Don't call `setContent()` (already updated)

### When Displaying in Mindmap

1. Call `getDisplayTitle(node)`
2. Check if `node.title` has content → No (empty)
3. Use `node.inferredCharCount` as hint
4. Call `extractInferredTitleText(node.content)` to parse HTML
5. Return plain text wrapped in `<p><span>`

## Performance Considerations

**Mindmap Display**:
- **Cost**: O(n) where n = content length (HTML parsing)
- **Frequency**: Once per node when rendering mindmap
- **Optimization**: `inferredCharCount` provides hint for how much to extract

**Typing**:
- **Cost**: O(1) - just applying mark to known range
- **Frequency**: Every keystroke
- **Optimization**: `isUpdatingFromStore` flag prevents recursion

**Resizing**:
- **Cost**: O(1) during drag (just updating mark), O(n) on mouseup (updating HTML)
- **Frequency**: Many times during drag, once on mouseup
- **Optimization**: Visual feedback during drag doesn't trigger callbacks

## Known Issues / TODO

1. **Full Document Resize**: Currently not working correctly - needs investigation
   - Visual feedback during resize may not be showing
   - Editor may not update after resize completes
   
2. **Default Highlight Length**: Currently hardcoded to 20 characters
   - Should be configurable in settings
   
3. **Word Boundary Snapping**: When reaching 20 characters mid-word
   - Should drop the last partial word
   - Currently not implemented

## Files to Check

- `src/components/TiptapExtensions/InferredTitleMark.ts` - Core resize logic
- `src/utils/inferredTitleUtils.ts` - HTML manipulation utilities
- `src/components/TiptapEditor.vue` - Content editor implementation
- `src/composables/useFullDocumentEditor.ts` - Full document editor factory
- `src/components/FullDocumentDraggable.vue` - Full document node component
- `src/stores/mindmap.ts` - `getDisplayTitle()` function

