# Migration Checklist: vueflow-design → MindScribble

## Overview
This checklist helps you integrate the layout engine from `vueflow-design` into your Quasar-based `mindscribble` project.

---

## Phase 1: Setup & Dependencies

### ☐ Install Dependencies
```bash
cd mindmap-writer/mindscribble
npm install @vue-flow/core @vue-flow/background
```

### ☐ Copy Core Files
Copy these files from `vueflow-design/src/` to `mindscribble/src/`:

- [ ] `types.ts` → `src/types/mindmap.ts`
- [ ] `layout.ts` → `src/utils/layout.ts`
- [ ] `layout-rbush.ts` → `src/utils/layout-rbush.ts` (optional)
- [ ] `components/CustomNode.vue` → `src/components/mindmap/CustomNode.vue`
- [ ] `components/LodBadgeNode.vue` → `src/components/mindmap/LodBadgeNode.vue`

---

## Phase 2: Extract Core Logic from App.vue

### ☐ Create Composable: `useMindmapLayout.ts`

Create `src/composables/useMindmapLayout.ts` and extract:

#### Data Management
- [ ] `nodes` ref (NodeData[])
- [ ] `edges` ref
- [ ] `vueFlowNodes` ref
- [ ] `nodeCounter` variable

#### LOD System
- [ ] `lodEnabled` ref
- [ ] `lodThresholds` ref
- [ ] `maxZoom` computed
- [ ] `currentLodLevel` computed
- [ ] `maxTreeDepth` computed

#### Core Functions
- [ ] `syncToVueFlow()`
- [ ] `syncFromVueFlow()`
- [ ] `getVisibleNodesForLOD()`
- [ ] `handleZoomChange()`
- [ ] `resolveOverlapsIncremental()`

#### Helper Functions
- [ ] `getNodeDepth(nodeId)`
- [ ] `getRootNode(nodeId)`
- [ ] `getDirectChildren(nodeId)`
- [ ] `calculateHiddenChildrenBounds()`

#### Node Operations
- [ ] `createNode()`
- [ ] `addNode()`
- [ ] `deleteNode()`
- [ ] `toggleCollapse()`
- [ ] `toggleCollapseLeft()`
- [ ] `toggleCollapseRight()`

#### LOD Controls
- [ ] `addLodLevel()`
- [ ] `resetLodLevels()`

#### Drag Handlers
- [ ] `onNodeDragStart()`
- [ ] `onNodeDrag()`
- [ ] `onNodeDragStop()`

---

## Phase 3: Create Mindmap Component

### ☐ Create `MindmapCanvas.vue`

Create `src/components/mindmap/MindmapCanvas.vue`:

```vue
<template>
  <div class="mindmap-canvas">
    <VueFlow
      :nodes="vueFlowNodes"
      :edges="visibleEdges"
      :default-viewport="{ zoom: 0.3, x: 400, y: 300 }"
      :min-zoom="0.05"
      :max-zoom="maxZoom"
      :only-render-visible-elements="true"
      @node-drag-start="onNodeDragStart"
      @node-drag="onNodeDrag"
      @node-drag-stop="onNodeDragStop"
    >
      <Background />
      
      <template #node-custom="{ data, id }">
        <CustomNode
          :data="data"
          @toggle-collapse="toggleCollapse(id)"
          @toggle-collapse-left="toggleCollapseLeft(id)"
          @toggle-collapse-right="toggleCollapseRight(id)"
        />
      </template>
      
      <template #node-lod-badge="{ data }">
        <LodBadgeNode :data="data" />
      </template>
    </VueFlow>
  </div>
</template>

<script setup lang="ts">
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import CustomNode from './CustomNode.vue'
import LodBadgeNode from './LodBadgeNode.vue'
import { useMindmapLayout } from '@/composables/useMindmapLayout'

const { viewport } = useVueFlow()
const {
  vueFlowNodes,
  visibleEdges,
  maxZoom,
  onNodeDragStart,
  onNodeDrag,
  onNodeDragStop,
  toggleCollapse,
  toggleCollapseLeft,
  toggleCollapseRight
} = useMindmapLayout()
</script>
```

- [ ] Component created
- [ ] Imports added
- [ ] Template structure complete
- [ ] Script setup complete

---

## Phase 4: Create LOD Controls Component

### ☐ Create `LodControls.vue`

Create `src/components/mindmap/LodControls.vue`:

```vue
<template>
  <div class="lod-controls">
    <h3>LOD (Level of Detail)</h3>
    
    <q-checkbox v-model="lodEnabled" label="Enable LOD System" />
    
    <div v-if="lodEnabled" class="lod-info">
      <p>Max depth: {{ maxTreeDepth }} | Zoom: {{ zoomPercent }}% | LOD: {{ currentLodLevel }}</p>
    </div>
    
    <div v-if="lodEnabled" class="lod-thresholds">
      <h4>Zoom Thresholds:</h4>
      <div v-for="(threshold, index) in lodThresholds" :key="index">
        <label>
          LOD {{ index + 1 }}: Zoom &lt;
          <q-input
            v-model.number="lodThresholds[index]"
            type="number"
            :min="10"
            :max="500"
            :step="10"
            dense
          />
          %
        </label>
      </div>
      
      <q-btn @click="addLodLevel" label="+ Add Level" size="sm" />
      <q-btn @click="resetLodLevels" label="Reset" size="sm" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useVueFlow } from '@vue-flow/core'
import { useMindmapLayout } from '@/composables/useMindmapLayout'

const { viewport } = useVueFlow()
const {
  lodEnabled,
  lodThresholds,
  maxTreeDepth,
  currentLodLevel,
  addLodLevel,
  resetLodLevels
} = useMindmapLayout()

const zoomPercent = computed(() => (viewport.value.zoom * 100).toFixed(0))
</script>
```

- [ ] Component created
- [ ] Quasar components used (q-checkbox, q-input, q-btn)
- [ ] Styling adapted for Quasar

---

## Phase 5: Setup Watchers & Lifecycle

### ☐ Add Watchers in Composable

In `useMindmapLayout.ts`:

```typescript
// Watch zoom changes for LOD
watch(() => viewport.value.zoom, (newZoom, oldZoom) => {
  if (lodEnabled.value) {
    const zoomChanged = Math.abs(newZoom - (oldZoom || 1)) > 0.01
    if (zoomChanged) {
      handleZoomChange(newZoom)
    }
  }
})

// Watch LOD enabled/disabled
watch(lodEnabled, () => {
  syncToVueFlow()
})

// Watch tree depth changes (auto-add LOD levels)
watch(maxTreeDepth, (newDepth, oldDepth) => {
  if (newDepth > (oldDepth || 0)) {
    while (lodThresholds.value.length < newDepth) {
      const nextThreshold = 10 + lodThresholds.value.length * 20
      lodThresholds.value.push(nextThreshold)
    }
  }
})
```

- [ ] Zoom watcher added
- [ ] LOD enabled watcher added
- [ ] Tree depth watcher added

### ☐ Add Keyboard Shortcuts (Optional)

```typescript
import { onMounted, onUnmounted } from 'vue'

function handleKeyDown(event: KeyboardEvent) {
  if (event.ctrlKey && (event.key === '+' || event.key === '=')) {
    event.preventDefault()
    const newZoom = Math.min(viewport.value.zoom + 0.01, maxZoom.value)
    setViewport({ x: viewport.value.x, y: viewport.value.y, zoom: newZoom })
  }
  if (event.ctrlKey && event.key === '-') {
    event.preventDefault()
    const newZoom = Math.max(viewport.value.zoom - 0.01, 0.05)
    setViewport({ x: viewport.value.x, y: viewport.value.y, zoom: newZoom })
  }
}

onMounted(() => window.addEventListener('keydown', handleKeyDown))
onUnmounted(() => window.removeEventListener('keydown', handleKeyDown))
```

- [ ] Keyboard handler added
- [ ] Event listeners registered

---

## Phase 6: Initialize Layout

### ☐ Set Default Spacing

In your main component or composable initialization:

```typescript
import { setLayoutSpacing } from '@/utils/layout'

// Set default spacing (0px for tight layout)
setLayoutSpacing(0, 0)
```

- [ ] Layout spacing initialized

---

## Phase 7: Testing

### ☐ Basic Functionality
- [ ] Nodes render correctly
- [ ] Edges render correctly
- [ ] Drag and drop works
- [ ] Collapse/expand works

### ☐ LOD System
- [ ] LOD can be enabled/disabled
- [ ] Nodes hide/show based on zoom
- [ ] Badges appear for hidden children
- [ ] Badge count is correct
- [ ] Badge positioning is correct

### ☐ Performance
- [ ] Test with 100 nodes
- [ ] Test with 500 nodes
- [ ] Test with 1000 nodes
- [ ] Zoom in/out is smooth
- [ ] Drag is smooth

### ☐ Edge Cases
- [ ] Deep trees (10+ levels)
- [ ] Wide trees (100+ children)
- [ ] Enable/disable LOD multiple times
- [ ] Collapse/expand with LOD enabled
- [ ] Drag nodes with LOD enabled

---

## Phase 8: Integration with MindScribble

### ☐ Integrate with Existing Features
- [ ] Connect to text editor panel
- [ ] Connect to tree view panel
- [ ] Sync selection between views
- [ ] Sync content changes
- [ ] Save/load mindmap data

### ☐ Adapt Styling for Quasar
- [ ] Use Quasar color palette
- [ ] Use Quasar spacing system
- [ ] Use Quasar typography
- [ ] Responsive layout

---

## Phase 9: Documentation

### ☐ Update Project Documentation
- [ ] Add mindmap layout section
- [ ] Document LOD configuration
- [ ] Document performance tips
- [ ] Add troubleshooting guide

---

## Verification Checklist

Before considering migration complete:

- [ ] All core files copied
- [ ] All functions extracted
- [ ] All watchers set up
- [ ] All tests passing
- [ ] Performance is acceptable (1000 nodes smooth)
- [ ] LOD system works correctly
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Documentation updated

---

## Notes

- **Exclude stress testing code** - Only for development testing
- **Keep layout algorithm modular** - Easy to swap/improve later
- **Use Quasar components** - Replace HTML inputs with q-input, q-btn, etc.
- **Test incrementally** - Don't migrate everything at once

---

**Estimated Time:** 4-6 hours

**Priority:** High (core feature)

**Dependencies:** @vue-flow/core, @vue-flow/background

---

For detailed documentation, see `DOCUMENTATION.md` and `QUICK_REFERENCE.md`.

