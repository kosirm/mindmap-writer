# Mindmap Writer - Development Plan

## Project Overview
A writer software combining mindmap visualization with a rich text editor, enabling perfect synchronization between hierarchical mindmap structure and linear text content.

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
- [ ] Implement keyboard shortcuts:
  - [ ] Tab/Shift+Tab: Indent/outdent node
  - [ ] Enter: Create sibling node
  - [ ] Ctrl/Cmd+Enter: Create child node
  - [ ] Delete/Backspace: Delete node
  - [ ] Arrow keys: Navigate between nodes
  - [ ] Ctrl/Cmd+C/V/X: Copy/paste/cut
  - [ ] Escape: Deselect/cancel edit
- [ ] Extend data interface to support:
  - [ ] `content` field (separate from `name`)
  - [ ] `path` field for hierarchical numbering
  - [ ] Extended `metadata` object
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

## Current Focus: Keyboard Shortcuts

### Implementation Plan

1. **Create keyboard listener module**
   - File: `vue3-mindmap/src/components/Mindmap/listener/keyboard.ts`
   - Handle key events on mindmap container
   - Map keys to actions

2. **Add keyboard switcher**
   - Update `switcher.ts` to enable/disable keyboard
   - Connect to `keyboard` prop

3. **Implement actions**
   - Reuse existing functions from `data.ts` (add, del, etc.)
   - Add new navigation functions

4. **Update component**
   - Enable keyboard prop in `Mindmap.vue`
   - Add keyboard event listeners

5. **Test & refine**
   - Test all shortcuts
   - Handle edge cases
   - Update documentation

## Next Steps
1. Implement keyboard shortcuts in vue3-mindmap
2. Test keyboard functionality
3. Extend data model for content support
4. Begin Tiptap extension development

---

**Last Updated**: 2025-11-11

