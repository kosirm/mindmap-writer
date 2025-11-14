# Tiptap Integration Plan

## Overview
This document outlines the plan for integrating Tiptap text editor into the Mindmap Writer application, creating a synchronized dual-view system where users can work with both mindmap visualization and linear text editing.

## Current State Analysis

### Existing Architecture
- **Framework**: Quasar (Vue 3) with Pinia state management
- **Mindmap View**: Custom vue3-mindmap component (fully functional)
- **Data Model**: Unified `MindmapNode` structure in Pinia store (`stores/mindmap.ts`)
- **Layout**: MainLayout with left drawer (Navigation + Structure tabs), main content area
- **Storage**: LocalStorage with JSON export/import

### Data Structure (Single Source of Truth)
```typescript
interface MindmapNode {
  id: string;              // UUID
  path: string;            // Hierarchical path (e.g., "1-2-3")
  title: string;           // First N words (auto-extracted)
  content: string;         // Full paragraph text
  parentId: string | null;
  order: number;           // Sibling position
  children: MindmapNode[];
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    color?: string;
    collapsed?: boolean;
    left?: boolean;        // For mindmap layout
  };
}
```

## Implementation Plan

### Phase 1: Install Dependencies ✓ NEXT

**Packages to Install:**
```bash
npm install @tiptap/vue-3 @tiptap/starter-kit @tiptap/pm
```

**Optional Extensions (for future):**
```bash
npm install @tiptap/extension-placeholder @tiptap/extension-focus
```

### Phase 2: Create Custom Tiptap Extension

**File**: `src/extensions/MindmapParagraphNode.ts`

**Key Features:**
1. **Custom Node Type**: Each paragraph = one mindmap node
2. **Attributes**: Store `nodeId`, `path`, `order` in node attributes
3. **Auto-Title Extraction**: First 2-3 words become node title
4. **Hierarchical Structure**: Tab/Shift+Tab for indent/outdent
5. **Visual Indicators**: Show path number (1, 1-1, 1-2, etc.)
6. **Keyboard Shortcuts**:
   - Enter: Create sibling paragraph
   - Tab: Indent (make child of previous sibling)
   - Shift+Tab: Outdent (move up hierarchy)
   - Backspace on empty: Delete node and merge with previous

**Technical Approach:**
- Extend Tiptap's `Node` class
- Override `parseHTML`, `renderHTML`, `addNodeView`
- Add custom commands for hierarchy manipulation
- Use ProseMirror transactions for updates

### Phase 3: Create Text Editor Component

**File**: `src/components/TiptapEditor.vue`

**Features:**
- Initialize Tiptap editor with custom extension
- Bind to Pinia store data
- Handle content changes and sync to store
- Display path indicators for each paragraph
- Styling to match app theme

**Props:**
- `modelValue`: MindmapNode (root node)
- `readonly`: boolean (for view-only mode)

**Emits:**
- `update:modelValue`: When content changes
- `node-selected`: When user clicks/focuses a paragraph

### Phase 4: Implement Split View Layout

**Goal**: Create resizable dual-view layout (Mindmap + Text Editor)

**Option A: Side-by-Side in Main Content** (RECOMMENDED)
```
┌─────────────────────────────────────────────┐
│  Left Drawer    │  Mindmap  │  Text Editor  │
│  (Navigation/   │   View    │     View      │
│   Structure)    │           │               │
└─────────────────────────────────────────────┘
```

**Option B: Add Text Tab to Left Drawer** (Per original plan)
```
┌─────────────────────────────────────────────┐
│  Left Drawer    │      Mindmap View         │
│  - Navigation   │                           │
│  - Structure    │                           │
│  - Text Editor  │                           │
└─────────────────────────────────────────────┘
```

**Recommendation**: Option A provides better UX for simultaneous viewing and editing.

**Implementation (Option A):**
1. Modify `MindmapPage.vue` to use split layout
2. Use Quasar's `q-splitter` component for resizable panels
3. Add view mode toggle: "Mindmap Only", "Text Only", "Split View"
4. Store view preference in localStorage

**File Changes:**
- `src/pages/MindmapPage.vue`: Add split layout
- Add toolbar buttons for view mode switching
- Responsive: Stack vertically on mobile

### Phase 5: Bidirectional Sync

**Store → Text Editor:**
- Watch `store.currentDocument` in TiptapEditor
- Convert MindmapNode tree to Tiptap JSON document
- Update editor content when store changes (from mindmap edits)

**Text Editor → Store:**
- Listen to Tiptap `onUpdate` event
- Parse editor content to extract node structure
- Update store with new hierarchy and content
- Debounce updates (300ms) for performance

**Sync Logic:**
```typescript
// In TiptapEditor.vue
const editor = useEditor({
  onUpdate: ({ editor }) => {
    const nodes = extractNodesFromEditor(editor);
    store.updateDocument(nodes);
  }
});

watch(() => store.currentDocument, (newDoc) => {
  if (!isEditorChange) {
    const content = convertNodeToTiptapJSON(newDoc);
    editor.commands.setContent(content);
  }
});
```

**Challenge**: Prevent circular updates
**Solution**: Use flag to track update source

### Phase 6: Selection & Scroll Sync

**Click Node in Mindmap → Highlight in Text:**
- Listen to mindmap node click events
- Find corresponding paragraph in Tiptap by `nodeId`
- Scroll to and highlight the paragraph
- Set editor focus

**Click Paragraph in Text → Highlight in Mindmap:**
- Track current cursor position in Tiptap
- Determine which node is active
- Emit event to mindmap to highlight node
- Center mindmap view on selected node

**Implementation:**
- Use event bus (mitt) or props/emits
- Add CSS classes for highlighting
- Smooth scroll animations

## Technical Considerations

### Performance
- Debounce sync operations (300ms)
- Use virtual scrolling for large documents (future)
- Lazy load collapsed sections

### Data Consistency
- Single source of truth: Pinia store
- Atomic updates: Update store first, then views
- Conflict resolution: Last write wins (for now)

### Undo/Redo
- Tiptap has built-in undo/redo
- Mindmap has snapshot system
- **Decision**: Keep separate for now, unify later

### Edge Cases
- Empty paragraphs: Allow but show placeholder
- Root node: Always exists, cannot be deleted
- Drag-drop in mindmap: Update text editor order
- Copy/paste: Handle rich text and plain text

## File Structure

```
src/
├── extensions/
│   └── MindmapParagraphNode.ts    # Custom Tiptap extension
├── components/
│   ├── TiptapEditor.vue           # Text editor component
│   └── Mindmap/                   # Existing mindmap component
├── pages/
│   └── MindmapPage.vue            # Modified for split view
├── stores/
│   └── mindmap.ts                 # Existing store (minor updates)
└── composables/
    └── useTiptapSync.ts           # Sync logic (optional)
```

## Next Steps

1. ✅ Review and approve this plan
2. Install Tiptap dependencies
3. Create basic MindmapParagraphNode extension
4. Build TiptapEditor component
5. Implement split view layout
6. Add bidirectional sync
7. Implement selection/scroll sync
8. Test and refine

## Open Questions

1. **View Layout**: Option A (side-by-side) or Option B (drawer tab)?
2. **Default View**: Show both views by default or start with mindmap only?
3. **Mobile Experience**: How to handle split view on small screens?
4. **Title Extraction**: 2 words or 3 words for auto-title?
5. **Styling**: Should text editor match mindmap colors for hierarchy levels?


