# Mindmap Writer - Implementation Status

**Last Updated**: 2025-11-16  
**Status**: Core features implemented and working

---

## 1. Inferred Title System ✅ COMPLETE

### Overview
Nodes can have **inferred titles** automatically extracted from their content when the title field is empty. This provides a seamless UX where users can start typing content without manually setting a title.

### How It Works

1. **Empty Title Detection**: When `node.title` is empty or contains only empty HTML tags (e.g., `<p style="margin: 0px; padding: 0px;"></p>`), the system treats it as "inferred mode"

2. **Title Inference**: 
   - Extract first ~20 characters from content (rounded to word boundary)
   - Store as `node.inferredTitle` (HTML) and `node.inferredCharCount` (number)
   - Display in mindmap with visual distinction (gray background, 0.7 opacity)

3. **Content Highlighting**:
   - Highlight the inferred portion in Content Editor with yellow background
   - Custom Tiptap mark extension: `InferredTitleMark`
   - User can drag the highlight edge to resize the inferred title

4. **Conversion to Manual Title**:
   - Double-click inferred title in mindmap to edit
   - Type new title and press Enter
   - System clears `inferredTitle` and `inferredCharCount` fields
   - Highlight immediately disappears from Content Editor

5. **Conversion Back to Inferred**:
   - Delete all characters from manual title
   - System automatically re-infers title from content
   - Highlight reappears in Content Editor

### Key Implementation Details

**Store Functions** (`mindmap.ts`):
- `inferTitle(content: string, charCount: number)`: Extract title from HTML content
- `getDisplayTitle(node: MindmapNode)`: Get title to display (explicit or inferred)
- `updateInferredTitles(node: MindmapNode)`: Recursively update all inferred titles
- `updateNodeFromLegacy(node, legacy)`: Sync changes from mindmap back to store

**Text Content Extraction**:
```typescript
// Check if title has actual text content (not just empty HTML tags)
let titleHasContent = false;
if (node.title && node.title.trim() !== '') {
  const tmp = document.createElement('div');
  tmp.innerHTML = node.title;
  const textContent = tmp.textContent || '';
  titleHasContent = textContent.trim() !== '';
}
```

**Tiptap Editor** (`TiptapEditor.vue`):
- `updateInferredTitleHighlight()`: ALWAYS fetches latest node from store using `findNodeById()` to avoid stale data
- Watches title changes and updates highlight reactively
- Uses `isUpdatingFromStore` flag to prevent circular updates

**Tiptap Extension** (`InferredTitleMark.ts`):
- `setInferredTitleMark(length)`: Apply highlight to first N characters
- `unsetInferredTitleMark()`: Remove highlight using manual transaction dispatch
- Drag-to-resize functionality with visual handle

**Visual Distinction** (`set.ts`):
```typescript
.attr('fill', (d) => d.isInferredTitle ? '#f0f0f0' : 'white')
.attr('fill-opacity', (d) => d.isInferredTitle ? 0.7 : 1)
```

### Critical Bug Fixes

1. **Highlight not removed when adding manual title**: Fixed by fetching latest node from store instead of using cached `selectedNode.value`

2. **`unsetMark` command not working**: Fixed by manually creating and dispatching transaction:
```typescript
const transaction = tr.removeMark(0, state.doc.content.size, markType);
if (dispatch) dispatch(transaction);
```

---

## 2. Node Orientation System ✅ COMPLETE

### Overview
Mindmap supports 4 orientation modes that control how child nodes are arranged around the root.

### Orientation Modes

```
Clockwise: 6→1→2→3 (top-right, clockwise)
| 6 |      | 1 |
| 5 | root | 2 |
| 4 |      | 3 |

AntiClockwise: 1→6→5→4 (top-left, counter-clockwise)
| 1 |      | 6 |
| 2 | root | 5 |
| 3 |      | 4 |

LeftRight: Left side fills first (1,2,3), then right (4,5,6)
| 1 |      | 4 |
| 2 | root | 5 |
| 3 |      | 6 |

RightLeft: Right side fills first (1,2,3), then left (4,5,6)
| 4 |      | 1 |
| 5 | root | 2 |
| 6 |      | 3 |
```

### Implementation

**Key Principle**: Orientation is a VIEW layer only - the store keeps data in a stable order, and orientation just changes how it's displayed.

**Functions** (`Mindmap/index.ts`):
- `applyOrientation(data, orientation)`: Transform data structure for display
- `getVisualChildren(node, orientation)`: Get children in visual order
- `reverseOrientation(data, orientation)`: Convert visual order back to store order

**Store Integration**:
- Store always keeps children in original order
- `node.metadata.left` determines which side a node appears on
- Orientation only affects visual display, not data structure

---

## 3. Drag-and-Drop with Side Switching ✅ COMPLETE

### Overview
Users can drag nodes to reorder them or move them between left/right sides of the mindmap.

### Features

1. **Same-Side Reordering**: Drag node up/down on same side to reorder
2. **Side Switching**: Drag node across center to switch from left↔right
3. **Orientation-Aware**: Works correctly with all 4 orientation modes

### Implementation

**Drag Detection** (`listener.ts`):
```typescript
// Side change detection
const xToCenter = d.x - rootWidth / 2;
const isCrossing = xToCenter * (xToCenter + d.px) < 0;

// Same-side reorder detection
const dropY = currentY + d.py;
// Find insertion point based on dropY
```

**Key Functions**:
- `onDragMove`: Track drag position, show visual feedback
- `onDragEnd`: Determine if side change or reorder, update store
- `handleSideChange`: Move node to opposite side
- `handleSameSideReorder`: Reorder nodes on same side

**Critical Fixes**:
1. **Wrong node moved**: Fixed by using `rawData` reference instead of positional ID
2. **Incorrect insertion position**: Fixed by calculating correct index based on visual order and orientation
3. **Children disappearing**: Fixed by properly preserving `node.metadata.left` during orientation changes

---

## 4. Content Editor Improvements ✅ COMPLETE

### Fixed Issues (2025-11-16)

1. **Visual Feedback During Resize Drag** ✅
   - Problem: Highlight was updating on drag end only, not following mouse cursor
   - Solution: Added `isResizing` flag to prevent `onUpdate` from triggering during visual feedback
   - The highlight now follows the mouse smoothly during drag, but only updates the store on drag end
   - Implementation: `InferredTitleMark.ts` sets `isResizing = true` during drag, and `TiptapEditor.vue` checks this flag in `onUpdate`

2. **Double-Space Issue in Highlighted Text** ✅
   - Problem: Space key had to be pressed twice when typing within highlighted (inferred title) area
   - Root Cause: `updateInferredTitleHighlight()` was being called on every keystroke, constantly reapplying the mark
   - Solution: Added check to only update mark when length actually changes
   - Implementation: Compare current mark length with calculated length before reapplying

3. **Paragraph Breaks Not Persisting** ✅
   - Problem: Multi-line content became single line after reload
   - Root Cause: `cleanNodeHtml()` function was stripping ALL HTML tags (including `<p>` tags) when loading from localStorage
   - Solution: Removed calls to `cleanNodeHtml()` in `loadFromLocalStorage()` and `importFromJSON()`
   - Now HTML formatting is preserved: paragraphs, bold, italic, etc.

### Technical Details

**Resize Visual Feedback:**
```typescript
// InferredTitleMark.ts
isResizing = true; // Set before drag starts
// ... visual updates during drag ...
isResizing = false; // Reset on drag end

// TiptapEditor.vue
if (editor.commands.isResizingInferredTitle()) {
  return; // Skip onUpdate during visual feedback
}
```

**Smart Mark Updates:**
```typescript
// Only update if length changed
let currentMarkLength = 0;
state.doc.descendants((node) => {
  if (node.marks.some(mark => mark.type.name === 'inferredTitleMark')) {
    currentMarkLength += node.nodeSize - 1;
  }
});

if (currentMarkLength !== inferredTitleLength) {
  // Apply mark only when needed
  editor.value.commands.setInferredTitleMark(inferredTitleLength);
}
```

**HTML Preservation:**
```typescript
// Removed this call:
// cleanNodeHtml(restoredData); // Was stripping all HTML tags

// Now content keeps HTML: <p>, <strong>, <em>, etc.
```

### Future Enhancements
- Export to various formats (PDF, PNG, Markdown)
- Google Drive integration for file storage
- Collaborative editing
- Advanced node styling options
- Tiptap FloatingMenu extension for enhanced editing capabilities

---

## 5. Architecture Notes

### Data Flow
```
Store (Single Source of Truth)
  ↓
legacyDocument (computed, adds orientation)
  ↓
Mindmap Component (visual display)
  ↓
User Interaction (drag, edit)
  ↓
Store Update (via updateDocumentFromLegacy)
  ↓
Reactivity triggers re-render
```

### Key Patterns

1. **Stable References**: Use `rawData` for node identity, not positional IDs
2. **Internal Update Flag**: Prevent circular updates when changes originate from mindmap
3. **Document Version**: Increment to force reactivity when needed
4. **Always Fetch Latest**: Don't cache nodes - always get from store to avoid stale data

### Important Files

- `mindmap-writer/writer/src/stores/mindmap.ts` - Core state management
- `mindmap-writer/writer/src/components/TiptapEditor.vue` - Content editor
- `mindmap-writer/writer/src/components/Mindmap/Mindmap.vue` - Main mindmap component
- `mindmap-writer/writer/src/components/Mindmap/index.ts` - D3 rendering logic
- `mindmap-writer/writer/src/components/Mindmap/listener.ts` - Drag-drop handlers
- `mindmap-writer/writer/src/components/TiptapExtensions/InferredTitleMark.ts` - Highlight extension

---

## 6. Testing Checklist

### Inferred Titles
- ✅ Empty title → auto-infer from content
- ✅ Highlight appears in Content Editor
- ✅ Drag highlight edge to resize
- ✅ Changes reflect in mindmap title
- ✅ Double-click inferred title → edit → highlight disappears
- ✅ Delete manual title → auto-infer again
- ✅ Visual distinction in mindmap (gray background)

### Orientation
- ✅ Switch between 4 modes
- ✅ Children appear in correct positions
- ✅ Drag-drop works in all modes
- ✅ Data preserved across orientation changes

### Drag-Drop
- ✅ Same-side reordering
- ✅ Side switching (left↔right)
- ✅ Correct node moved (not sibling)
- ✅ Correct insertion position
- ✅ Children preserved during moves

---

## 7. Files Modified (2025-11-16)

### Content Editor Fixes

1. **`mindmap-writer/writer/src/components/TiptapExtensions/InferredTitleMark.ts`**
   - Added `isResizing` flag to track drag state
   - Added `isResizingInferredTitle()` command to check resize state
   - Set `isResizing = true` at start of drag, `false` on drag end
   - Prevents onUpdate from triggering during visual feedback

2. **`mindmap-writer/writer/src/components/TiptapEditor.vue`**
   - Added check for `isResizingInferredTitle()` in `onUpdate` handler
   - Added smart mark update logic to only reapply when length changes
   - Prevents unnecessary mark updates that caused double-space issue

3. **`mindmap-writer/writer/src/stores/mindmap.ts`**
   - Removed calls to `cleanNodeHtml()` in `loadFromLocalStorage()` and `importFromJSON()`
   - Added comments explaining why HTML tags are now preserved
   - Kept `stripHtmlTags()` function for potential future use

---

**Status**: All core features working. Content editor issues resolved. Ready for next phase of development.

