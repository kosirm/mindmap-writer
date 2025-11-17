# Tiptap Integration - Implementation Status

## ✅ Completed (Phase 1)

### 1. Dependencies Installed
- ✅ `@tiptap/vue-3` - Vue 3 integration
- ✅ `@tiptap/starter-kit` - Basic extensions bundle
- ✅ `@tiptap/pm` - ProseMirror core
- ✅ `@tiptap/extension-placeholder` - Placeholder text
- ✅ `@tiptap/extension-document` - Document node
- ✅ `@tiptap/extension-paragraph` - Paragraph node
- ✅ `@tiptap/extension-text` - Text node

### 2. Split View Layout Implemented
**File**: `src/pages/MindmapPage.vue`

**Features**:
- ✅ Three view modes with toggle buttons:
  - **Mindmap Only**: Full-screen mindmap view
  - **Split View**: Resizable side-by-side panels (default)
  - **Text Only**: Full-screen text editor view
- ✅ Resizable splitter using Quasar's `q-splitter`
- ✅ Maximize/restore buttons in each panel header
- ✅ View preferences saved to localStorage
- ✅ Splitter position saved to localStorage
- ✅ Clean panel headers with titles

**Layout Structure**:
```
┌─────────────────────────────────────────────┐
│  View Controls (top-right)                  │
│  [Mindmap] [Split] [Text]                   │
├──────────────────┬──────────────────────────┤
│  Mindmap Panel   │  Text Editor Panel       │
│  [Header]        │  [Header]                │
│  [Maximize btn]  │  [Maximize btn]          │
│                  │                          │
│  [Mindmap View]  │  [Tiptap Editor]         │
│                  │                          │
└──────────────────┴──────────────────────────┘
```

### 3. Basic Tiptap Editor Component
**File**: `src/components/TiptapEditor.vue`

**Features**:
- ✅ Basic Tiptap editor with StarterKit
- ✅ Toolbar with formatting buttons (bold, italic, lists)
- ✅ Placeholder text support
- ✅ Props: `modelValue` (MindmapNode)
- ✅ Emits: `update:modelValue`, `node-selected`
- ✅ Basic HTML conversion from MindmapNode tree
- ✅ Watches store changes and updates editor content
- ✅ Prevents circular updates with flag

**Current Behavior**:
- Displays all nodes as paragraphs with `data-node-id` and `data-path` attributes
- Recursively converts node tree to HTML
- Updates when store changes (from mindmap edits)

## 🚧 In Progress / TODO

### 4. Custom Tiptap Extension (Next Priority)
**File**: `src/extensions/MindmapParagraphNode.ts` (to be created)

**Requirements**:
- [ ] Custom paragraph node with hierarchy support
- [ ] Store node metadata: `id`, `path`, `parentId`, `order`
- [ ] Visual path indicators (1, 1-1, 1-2, etc.)
- [ ] Tab/Shift+Tab for indent/outdent
- [ ] Enter for new sibling
- [ ] Backspace on empty to delete and merge
- [ ] Auto-title extraction logic (first 2-3 words)
- [ ] Distinguish between explicit title and auto-generated title

### 5. Bidirectional Sync
**Status**: Placeholder implemented, needs full logic

**TODO**:
- [ ] Parse Tiptap content back to MindmapNode structure
- [ ] Update store when text editor changes
- [ ] Handle hierarchy changes (indent/outdent)
- [ ] Debounce updates (300ms)
- [ ] Proper conflict resolution
- [ ] Update mindmap view when text changes

### 6. Selection & Scroll Sync
**TODO**:
- [ ] Click node in mindmap → scroll to paragraph in text
- [ ] Click paragraph in text → highlight node in mindmap
- [ ] Smooth scroll animations
- [ ] Highlight active node/paragraph

### 7. Title Auto-Generation Logic
**Concept** (from discussion):
```typescript
// If node.title is empty or matches first N words of content
if (!node.title || node.title === extractFirstWords(node.content, 3)) {
  // Display auto-generated title in different color
  // Make it non-editable in mindmap (edit content instead)
  displayTitle = extractFirstWords(node.content, 3);
  isAutoTitle = true;
} else {
  // Display explicit title
  displayTitle = node.title;
  isAutoTitle = false;
}
```

**Features to implement**:
- [ ] Helper function: `extractFirstWords(text: string, count: number): string`
- [ ] Visual distinction in mindmap (different color for auto-titles)
- [ ] Click to "promote" auto-title to explicit title
- [ ] Delete title → revert to auto-generation
- [ ] Settings option for word count (2 or 3 words)

## 📁 File Structure

```
src/
├── components/
│   ├── TiptapEditor.vue          ✅ Created
│   └── Mindmap/                  ✅ Existing
├── extensions/
│   └── MindmapParagraphNode.ts   ⏳ TODO
├── pages/
│   └── MindmapPage.vue           ✅ Updated (split view)
├── stores/
│   └── mindmap.ts                ✅ Existing (no changes needed yet)
└── composables/
    └── useTiptapSync.ts          ⏳ TODO (optional)
```

## 🎯 Next Steps

1. **Test Current Implementation**
   - Run `npm run dev`
   - Test view mode switching
   - Test splitter resizing
   - Verify localStorage persistence
   - Check that mindmap still works correctly

2. **Create Custom Extension**
   - Implement `MindmapParagraphNode.ts`
   - Add hierarchy support (Tab/Shift+Tab)
   - Add visual path indicators
   - Test independently

3. **Implement Sync Logic**
   - Parse Tiptap content to node structure
   - Update store from text editor
   - Handle edge cases

4. **Add Selection Sync**
   - Implement click handlers
   - Add scroll synchronization
   - Add visual highlights

5. **Implement Auto-Title Logic**
   - Add helper functions
   - Update mindmap display logic
   - Add settings for word count

## 🐛 Known Issues / Considerations

- **Circular Updates**: Currently prevented with `isUpdatingFromStore` flag
- **Performance**: May need debouncing for large documents
- **Undo/Redo**: Separate systems in mindmap and text editor (to be unified later)
- **Root Node**: Always exists, special handling needed
- **Empty Paragraphs**: Currently allowed, may need placeholder logic

## 💡 Design Decisions

1. **View Mode Default**: Split view (can be changed in code)
2. **Splitter Default**: 50/50 split (adjustable by user)
3. **Persistence**: View preferences saved to localStorage
4. **Panel Headers**: Always visible with maximize buttons
5. **View Controls**: Floating buttons in top-right corner

## 📝 Notes

- The data structure already supports everything we need (id, path, title, content)
- Tree view in left drawer remains the source of truth
- Split view is purely for visualization and editing
- All changes flow through Pinia store
- Mindmap and text editor are just different views of the same data

---

**Last Updated**: 2025-11-13
**Status**: Phase 1 Complete - Ready for Testing

