# Mindmap Writer - Development Plan

## Project Overview
A writer software combining mindmap visualization with a rich text editor, enabling perfect synchronization between hierarchical mindmap structure and linear text content.

### Architecture Philosophy: Data-Centric Multi-View Design

**Core Principle**: Single source of truth (unified data model) with multiple **views** that render and interact with the same data.

**Primary Views**:
- **Text View** (Tiptap): Linear document view for writing and editing
- **Mindmap View** (vue3-mindmap): Hierarchical visual view for structure and organization

**Future Extensible Views**:
- **Circle Pack View**: D3-based circular hierarchy visualization
- **Tree View**: Traditional outline/tree structure
- **Timeline View**: Chronological organization
- **Kanban View**: Task/project management perspective
- **Graph View**: Network/relationship visualization

**Final Output**: The primary output is structured text (for books, articles, novels, documentation). The mindmap and other views serve as powerful tools for organizing, structuring, and navigating content during the creative process.

## Tech Stack
- **Framework**: Quasar (Vue 3)
- **Mindmap**: vue3-mindmap (customized)
- **Text Editor**: Tiptap (with custom extensions)
- **Backend**: Supabase
- **AI Integration**: n8n workflows
- **State Management**: Pinia

## Core Concept

### Data Model
- **Unified tree structure** as single source of truth
- Each node has:
  - `id`: UUID
  - `path`: Hierarchical path (e.g., "1-2-3")
  - `title`: First N words (default: 3)
  - `content`: Full paragraph text
  - `parentId`: Reference to parent
  - `order`: Sibling position
  - `metadata`: Styling, color, etc.

### Sync Strategy
- Both mindmap and text editor are **reactive views** of the same data
- Changes in either view update the central store
- Store updates trigger re-render in both views

## Development Phases

### Phase 1: Enhance vue3-mindmap ✓ (Current)
**Goal**: Add keyboard shortcuts and prepare for extended data model

#### Tasks:
- [x] Set up project structure
- [x] Fix TypeScript warnings
- [x] Implement keyboard shortcuts:
  - [x] Tab/Shift+Tab: Indent/outdent node
  - [x] Enter: Create sibling node
  - [x] Ctrl/Cmd+Enter: Create child node
  - [x] Delete/Backspace: Delete node
  - [x] Arrow keys: Navigate between nodes
  - [x] Ctrl/Cmd+C/V/X: Copy/paste/cut
  - [x] Escape: Deselect/cancel edit
- [x] Extend data interface to support:
  - [x] `content` field (separate from `name`)
  - [x] `path` field for hierarchical numbering
  - [x] Extended `metadata` object
- [ ] Add text content indicator icon
- [ ] Add expandable text view in mindmap

### Phase 2: Create Tiptap Custom Extension
**Goal**: Build custom node type for mindmap integration

#### Tasks:
- [ ] Set up Tiptap development environment
- [ ] Create `MindmapNode` extension:
  - [ ] Node definition with attributes (id, path, metadata)
  - [ ] Title extraction logic (first N words)
  - [ ] Custom rendering (with path indicator)
  - [ ] Keyboard shortcuts (Tab, Shift+Tab, Enter, etc.)
  - [ ] Drag handle for reordering
- [ ] Implement collapsible sections
- [ ] Add visual hierarchy indicators
- [ ] Test extension independently

### Phase 3: Build Quasar App Structure
**Goal**: Set up main application framework

#### Tasks:
- [ ] Initialize Quasar project
- [ ] Set up Pinia store with tree data model
- [ ] Create layout with split view (mindmap + editor)
- [ ] Implement basic routing
- [ ] Set up Supabase connection
- [ ] Create database schema

### Phase 4: Integration & Sync
**Goal**: Connect mindmap and text editor with bidirectional sync

#### Tasks:
- [ ] Integrate vue3-mindmap component
- [ ] Integrate Tiptap editor with custom extension
- [ ] Implement sync logic:
  - [ ] Text changes → Store → Mindmap update
  - [ ] Mindmap changes → Store → Text update
  - [ ] Selection sync (click node → highlight text)
  - [ ] Scroll sync
- [ ] Handle edge cases (conflicts, undo/redo)
- [ ] Add debouncing for performance

### Phase 5: Import/Export & Persistence
**Goal**: Enable data import/export and cloud storage

#### Tasks:
- [ ] Import plain text (paragraph → nodes)
- [ ] Export formats:
  - [ ] JSON
  - [ ] Markdown
  - [ ] PDF (future)
- [ ] Supabase real-time sync
- [ ] Conflict resolution
- [ ] Version history

### Phase 6: Advanced Features
**Goal**: Add power-user features

#### Tasks:
- [ ] Multi-level navigation (zoom into nodes)
- [ ] Node styling & customization
- [ ] Templates
- [ ] Search & filter
- [ ] Collaborative editing
- [ ] AI integration (n8n workflows)

### Phase 7: Polish & Launch
**Goal**: Production-ready application

#### Tasks:
- [ ] Performance optimization
- [ ] Comprehensive testing
- [ ] Documentation
- [ ] Onboarding flow
- [ ] Monetization setup
- [ ] Deploy to production

## Current Status: Phase 1 Completed ✅

### Completed Features
- ✅ **Keyboard Navigation**: Full arrow key navigation (up/down/left/right)
  - Left/Right: Navigate between depth levels (hierarchy)
  - Up/Down: Navigate within same depth level (all nodes at same depth)
  - Works consistently across all orientations
- ✅ **Orientation System**: Four orientation modes working perfectly
  - `right-left`: Default, nodes flow left to right
  - `left-right`: Nodes flow right to left
  - `clockwise`: Nodes arranged in clockwise circle
  - `anticlockwise`: Nodes arranged in anticlockwise circle
  - Visual ordering respects orientation at ALL depth levels
  - Data structure remains immutable (orientation only affects display)
- ✅ **Data Architecture**: Clean separation between data and view
  - Clone-Layout-Copy pattern: Clone data → Apply transformations → Copy positions back
  - Canonical data order never mutated by orientation
  - Visual order computed based on orientation
- ✅ **Document Management**: Full CRUD operations
  - Create, save, load, delete documents
  - LocalStorage persistence
  - Document list in navigation drawer
  - Auto-save functionality
  - Last opened document remembered

### Key Technical Achievements
1. **Orientation Fix**: Recursive reversal of children at all depths for layout calculation while preserving original data structure
2. **Navigation Enhancement**: Depth-based navigation that feels natural in all orientations
3. **Reactivity**: Proper Vue 3 reactivity with watchers for document changes and saves

## Next Steps: Three-View System

### Priority 1: Tiptap Integration (NEXT)
**Goal**: Add text editor view with custom Tiptap nodes

#### Implementation Plan:
1. **Install Tiptap**
   ```bash
   npm install @tiptap/vue-3 @tiptap/starter-kit @tiptap/extension-document
   ```

2. **Create Custom Tiptap Node Extension**
   - File: `src/extensions/MindmapParagraphNode.ts`
   - Each paragraph = one mindmap node
   - Auto-extract first 2-3 words as node title
   - Store full content in node's `content` field
   - Hierarchical structure using Tab/Shift+Tab for indentation
   - Path-based structure (1, 1-1, 1-2, etc.)

3. **Add Text View to Layout**
   - Add third tab in left drawer: "Text View"
   - Or add as separate panel/view mode
   - Bidirectional sync: Text ↔ Store ↔ Mindmap

4. **Sync Logic**
   - Text changes → Update store → Mindmap updates
   - Mindmap changes → Update store → Text updates
   - Selection sync: Click node → Highlight paragraph
   - Scroll sync between views

#### Three Views Architecture:
```
┌─────────────────────────────────────────────────────┐
│  Left Drawer                                        │
│  ┌──────────────────────────────────────────────┐  │
│  │ Tabs: Navigation | Structure | Text          │  │
│  ├──────────────────────────────────────────────┤  │
│  │ [Navigation Tab]                             │  │
│  │   - Home                                     │  │
│  │   - Mindmap                                  │  │
│  │   - Saved Mindmaps (list)                    │  │
│  ├──────────────────────────────────────────────┤  │
│  │ [Structure Tab]                              │  │
│  │   - Tree view (q-tree)                       │  │
│  │   - Hierarchical outline                     │  │
│  ├──────────────────────────────────────────────┤  │
│  │ [Text Tab] ← NEW                             │  │
│  │   - Tiptap editor                            │  │
│  │   - Linear document view                     │  │
│  │   - Each paragraph = one node                │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                        │
                        ↓
            ┌───────────────────────┐
            │   Pinia Store         │
            │   (Single Source of   │
            │    Truth)             │
            └───────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────┐
│  Main Content Area                                  │
│  ┌──────────────────────────────────────────────┐  │
│  │  Mindmap View (vue3-mindmap)                 │  │
│  │  - Visual hierarchical structure             │  │
│  │  - Four orientation modes                    │  │
│  │  - Keyboard navigation                       │  │
│  │  - Drag & drop (future: manual layout)       │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Priority 2: Manual Layout Mode (AFTER Tiptap)
**Goal**: Allow users to manually position nodes in mindmap view

#### Design Decisions (from conversation):
1. **Layout Mode Toggle**
   - Add switch in Mindmap Settings: "Automatic Layout" / "Manual Layout"
   - Default: Automatic mode
   - Future: Add proper toolbar in mindmap window

2. **Automatic Mode** (Current behavior)
   - Flextree algorithm calculates positions
   - Orientation determines visual ordering
   - No manual positioning allowed

3. **Manual Mode** (To be implemented)
   - Start with automatic layout as initial state
   - Add `position: { x: number, y: number }` property to each node
   - When user drags node → Store position in node data
   - On subsequent renders → Use stored position instead of calculated position
   - Orientation still affects initial layout and new node placement

#### Implementation Plan:

**Step 1: Add Layout Mode to Data Model**
```typescript
// In stores/mindmap.ts
interface MindmapNode {
  // ... existing fields
  metadata: {
    // ... existing metadata
    position?: { x: number; y: number } | undefined;  // Manual position
  };
}

// Add layout mode to store
const layoutMode = ref<'automatic' | 'manual'>('automatic');
```

**Step 2: Add UI Toggle**
- Add switch in Mindmap Settings drawer
- Save preference per document (in document metadata)
- Or global preference in localStorage

**Step 3: Modify Drag Behavior**
```typescript
// In draw/drag.ts
function handleDragEnd(d: Mdata) {
  if (layoutMode === 'manual') {
    // Store the new position in node metadata
    d.metadata.position = { x: d.x, y: d.y };
    // Emit change to store
    emitDataChange();
  } else {
    // Automatic mode: drag moves node in hierarchy (existing behavior)
    // ... existing drag logic
  }
}
```

**Step 4: Modify Layout Calculation**
```typescript
// In data/ImData.ts
private l(data: Mdata): Mdata {
  if (layoutMode === 'automatic') {
    // Use flextree algorithm (current behavior)
    const { left, right } = separateLeftAndRight(data);
    this.layout.layout(left);
    this.layout.layout(right);
    copyLayoutPositions(left, data);
    copyLayoutPositions(right, data);
  } else {
    // Manual mode: Use stored positions
    applyManualPositions(data);
  }
  return data;
}

function applyManualPositions(node: Mdata) {
  if (node.metadata.position) {
    node.x = node.metadata.position.x;
    node.y = node.metadata.position.y;
  }
  // Recursively apply to children
  if (node.children) {
    node.children.forEach(child => applyManualPositions(child));
  }
}
```

**Step 5: Handle New Nodes in Manual Mode**
- When adding new node in manual mode:
  - Calculate initial position based on parent + orientation
  - Store as manual position
  - User can then drag to adjust

**Step 6: Add "Reset to Automatic" Button**
- Clear all manual positions
- Recalculate using flextree
- Useful if manual layout becomes messy

#### Orientation + Layout Mode Matrix:
```
┌─────────────────┬──────────────────────┬──────────────────────┐
│                 │   Automatic Mode     │    Manual Mode       │
├─────────────────┼──────────────────────┼──────────────────────┤
│ Right-Left      │ Flextree + visual    │ Stored positions     │
│                 │ ordering             │                      │
├─────────────────┼──────────────────────┼──────────────────────┤
│ Left-Right      │ Flextree + visual    │ Stored positions     │
│                 │ ordering             │                      │
├─────────────────┼──────────────────────┼──────────────────────┤
│ Clockwise       │ Flextree + visual    │ Stored positions     │
│                 │ ordering             │                      │
├─────────────────┼──────────────────────┼──────────────────────┤
│ Anticlockwise   │ Flextree + visual    │ Stored positions     │
│                 │ ordering             │                      │
└─────────────────┴──────────────────────┴──────────────────────┘
```

#### Key Considerations:
1. **Orientation in Manual Mode**:
   - Orientation setting still matters for initial layout of new nodes
   - When switching from automatic → manual, current positions are "frozen"
   - When switching from manual → automatic, positions are recalculated

2. **Collision Detection** (Future enhancement):
   - In manual mode, nodes can overlap
   - Future: Add collision detection and auto-adjustment
   - Or: Add grid snapping

3. **Reordering in Manual Mode**:
   - Drag to reorder in hierarchy (change parent/sibling order) vs.
   - Drag to reposition visually (change x/y coordinates)
   - Solution: Use modifier key (e.g., Ctrl+Drag for repositioning)

4. **Performance**:
   - Manual positions stored in node metadata
   - No layout calculation needed in manual mode
   - Should be faster than automatic mode

---

**Last Updated**: 2025-11-13

