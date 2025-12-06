# ConceptMap Node Sizing and Title Editing

**Date:** 2025-12-06  
**Status:** 🔄 PARTIALLY COMPLETE

## Achievements

### 1. ✅ Canvas Node Title Editing Keyboard Behavior

Implemented consistent keyboard behavior for editing node titles in both MindMap and ConceptMap:

- **Enter** = Save and exit edit mode
- **Shift+Enter** = New line (multi-line titles)
- **ESC** = Cancel/revert to original title
- **Click outside (blur)** = Save and exit
- **Double-click or F2** = Start editing

**Files changed:**
- `useCanvasNodeEditor.ts` - Added `originalTitle` tracking, callback-based API `{ onSave, onCancel }`
- `CustomNode.vue` - Updated to use new callback API with `localLabelCache` for immediate display
- `ConceptNode.vue` - Same pattern as CustomNode

### 2. ✅ Leaf Node Auto-Sizing

Leaf nodes (nodes without children) now auto-size based on their content:

- Removed fixed `width`/`height`/`style` from leaf nodes in `buildVueFlowNodes()`
- Added CSS rule for VueFlow node wrappers to use `width: auto; height: auto`
- Leaf nodes expand both horizontally and vertically with content

**Key insight:** Only parent nodes need explicit sizing; leaf nodes should auto-size.

### 3. ✅ Parent Node Resizing

Parent nodes now properly resize when:
- Children are added
- Children change size (e.g., multi-line titles)
- Nodes are created from other views (mindmap, writer)

**Implementation:**
- Added `measureNodeDimensions()` - queries DOM via `getBoundingClientRect()`, adjusts for zoom
- Added `updateNodeDimensionsFromDOM()` - measures leaf nodes, stores in `measuredSize`
- Added `measureAndResizeNodes()` - measures then runs AABB + parent resize
- Parent nodes have CSS `width: 100%; height: 100%` to fill their VueFlow wrapper
- Calls `updateNodeInternals()` after size changes to force VueFlow updates

### 4. ✅ AABB Uses Measured Dimensions for Leaf Nodes

Updated `getNodeRect()` in `useConceptMapCollision.ts` with different priority for parent vs leaf:

```typescript
// Parent nodes: conceptMapSize > calculateParentSize > fallback
// Leaf nodes: measuredSize > conceptMapSize > fallback
```

This ensures AABB collision detection uses actual DOM-measured dimensions for leaf nodes.

### 5. ✅ Ellipsis for Parent Node Headers

Parent node headers now show long titles with ellipsis:

- Added `displayLabelPlainText` computed that strips `<br>` and HTML tags
- Parent headers use `v-text` (plain text) instead of `v-html`
- CSS: `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`

**Files changed:**
- `ConceptNode.vue` - Template uses different display for parent vs leaf
- CSS rules for `.is-parent .node-header .node-label`

### 6. ✅ Event-Driven Dimension Updates

Title changes from ANY view (mindmap, writer, concept map) trigger dimension updates:

- Added direct `eventBus.on('store:node-updated', handleNodeUpdated)` listener
- Not using `onStoreEvent` because we need ALL sources, not filtered
- After DOM renders, calls `measureAndResizeNodes()` with 50ms delay

---

## Remaining Problem: Z-Index When Editing Parent Node Header

### Problem Description

When editing a parent node's header (title), the Tiptap editor expands to show multi-line content, but it appears **behind** the child nodes instead of on top.

### Root Cause

VueFlow renders ALL nodes as **DOM siblings**, not nested:

```html
<div class="vue-flow__nodes">
  <!-- Parent node - z-index: 3000 -->
  <div class="vue-flow__node" style="z-index: 3000;">
    <div class="concept-node is-parent">
      <div class="node-header">...</div>  <!-- Editor here -->
      <div class="node-content">...</div>  <!-- Empty - children NOT here -->
    </div>
  </div>
  
  <!-- Child node - z-index: 3001 (HIGHER than parent!) -->
  <div class="vue-flow__node" style="z-index: 3001;">
    <div class="concept-node is-leaf">...</div>
  </div>
</div>
```

**Key insight:** VueFlow automatically gives children higher z-index than parents (parent: 3000, child: 3001). The `.node-content` div inside ConceptNode is **empty** - VueFlow renders children as separate sibling nodes.

### What We Tried

1. **CSS z-index on `.node-header.editing`** - Doesn't work because z-index only affects siblings within the same stacking context. The header is inside the parent's VueFlow node wrapper, which has lower z-index than the child's wrapper.

2. **VueFlow node `zIndex` property** - Set `vfNode.zIndex = 9999` when editing, but VueFlow seems to override or ignore this value. The DOM still shows the original z-index values.

3. **Watch for editing state** - Added watcher for `activeEditingNodeId` to rebuild nodes, but z-index still doesn't update as expected.

### Planned Solution: Popup Modal for Title Editing

**Approach:** Build a small popup/modal that appears at the same position as the title (with ellipsis). The popup will be rendered via Vue's `<Teleport>` outside the VueFlow node hierarchy.

**Benefits:**
- Completely avoids z-index issues (modal is at top level of DOM)
- Clean separation of display (ellipsis) and edit (full content) modes
- Consistent UX pattern
- Can be styled independently

**Implementation (TODO):**
1. Create a `TitleEditPopup.vue` component
2. Use `<Teleport to="body">` to render outside VueFlow
3. Position absolutely based on the clicked node's bounding rect
4. Show Tiptap editor inside the popup
5. Close on Enter (save), ESC (cancel), or click outside

---

## Files Changed

- `mindscribble/quasar/src/features/canvas/components/conceptmap/ConceptMapView.vue`
- `mindscribble/quasar/src/features/canvas/components/conceptmap/ConceptNode.vue`
- `mindscribble/quasar/src/features/canvas/components/mindmap/CustomNode.vue`
- `mindscribble/quasar/src/features/canvas/composables/useCanvasNodeEditor.ts`
- `mindscribble/quasar/src/features/canvas/composables/conceptmap/useConceptMapCollision.ts`
- `mindscribble/quasar/src/features/canvas/components/mindmap/types.ts` (added `measuredSize`)

