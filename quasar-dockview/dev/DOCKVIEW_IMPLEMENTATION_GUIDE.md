# Dockview Implementation Guide for MindScribble

This document provides a comprehensive guide for implementing nested Dockview in MindScribble, based on the successful implementation in the test project.

## Architecture Overview

The implementation uses **nested dockview** architecture:
- **Parent Dockview**: Contains file panels (one panel per document/file)
- **Child Dockview**: Each file panel contains its own dockview with view panels (Mindmap, Writer, Outline)

This allows users to:
- Work on multiple files simultaneously
- Each file has its own independent set of views
- Views cannot escape to other files
- Layouts are saved per-file

## Table of Contents
- [Dockview Implementation Guide for MindScribble](#dockview-implementation-guide-for-mindscribble)
  - [Architecture Overview](#architecture-overview)
  - [Table of Contents](#table-of-contents)
  - [1. Installation](#1-installation)
  - [2. Project Structure](#2-project-structure)
  - [3. Core Implementation](#3-core-implementation)
    - [Step 1: Create Boot File](#step-1-create-boot-file)
    - [Step 2: Parent Dockview (IndexPage)](#step-2-parent-dockview-indexpage)
    - [Step 3: File Panel Component](#step-3-file-panel-component)
    - [Step 4: File Controls Component](#step-4-file-controls-component)
  - [4. View Panel Components](#4-view-panel-components)
  - [5. Group Controls](#5-group-controls)
  - [6. Layout Persistence](#6-layout-persistence)
  - [7. Styling](#7-styling)
  - [8. Migration Checklist](#8-migration-checklist)
  - [9. Common Issues](#9-common-issues)
  - [Summary](#summary)

---

## 1. Installation

```bash
npm install dockview-vue dockview-core
```

**Versions used in test project:**
- `dockview-vue`: ^4.11.0
- `dockview-core`: ^1.16.3

---

## 2. Project Structure

```
src/
├── boot/
│   └── dockview.ts                    # NEW: Register all dockview components
├── pages/
│   ├── IndexPage.vue                  # MODIFY: Parent dockview (files)
│   └── components/
│       ├── FilePanel.vue              # NEW: Child dockview container (views per file)
│       ├── FileControls.vue           # NEW: Add View button for file panels
│       ├── GroupControls.vue          # NEW: Float/Maximize buttons
│       ├── MindmapPanel.vue           # MODIFY: Mindmap view
│       ├── WriterPanel.vue            # MODIFY: Writer view
│       └── OutlinePanel.vue           # MODIFY: Outline view
├── layouts/
│   └── MainLayout.vue                 # MODIFY: Add "Add File" button
└── css/
    └── app.scss                       # MODIFY: Critical height fixes
```

---

## 3. Core Implementation

### Step 1: Create Boot File

**File: `src/boot/dockview.ts`**

Register all dockview components globally:

```typescript
import { boot } from 'quasar/wrappers'
import FilePanel from 'src/pages/components/FilePanel.vue'
import FileControls from 'src/pages/components/FileControls.vue'
import GroupControls from 'src/pages/components/GroupControls.vue'
import MindmapPanel from 'src/pages/components/MindmapPanel.vue'
import WriterPanel from 'src/pages/components/WriterPanel.vue'
import OutlinePanel from 'src/pages/components/OutlinePanel.vue'

export default boot(({ app }) => {
  // Parent dockview components (files)
  app.component('file-panel', FilePanel)
  app.component('file-controls', FileControls)

  // Child dockview components (views)
  app.component('mindmap-panel', MindmapPanel)
  app.component('writer-panel', WriterPanel)
  app.component('outline-panel', OutlinePanel)

  // Group controls (Float/Maximize buttons)
  app.component('group-controls', GroupControls)
})
```

**Register in `quasar.config.ts`:**

```typescript
boot: ['dockview']
```

---

### Step 2: Parent Dockview (IndexPage)

**File: `src/pages/IndexPage.vue`**

The parent dockview contains file panels:

```vue
<template>
  <q-page class="dockview-page">
    <div class="dockview-container">
      <DockviewVue
        class="dockview-theme-abyss parent-dockview"
        @ready="onParentReady"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { DockviewVue, type DockviewApi } from 'dockview-vue'

const dockviewApi = ref<DockviewApi>()
let fileCounter = 0

function onParentReady(event: { api: DockviewApi }) {
  dockviewApi.value = event.api

  // Auto-save parent layout
  dockviewApi.value.onDidLayoutChange(() => {
    saveParentLayoutToStorage()
  })

  // Load saved layout or create default
  const loaded = loadParentLayoutFromStorage()
  if (!loaded) {
    addFile() // Create first file
  }
}

function addFile() {
  if (!dockviewApi.value) return

  fileCounter++
  const fileId = `file-${fileCounter}`
  const fileName = `Document ${fileCounter}`

  dockviewApi.value.addPanel({
    id: fileId,
    component: 'file-panel',
    title: `📄 ${fileName}`
  })
}

function saveParentLayoutToStorage() {
  if (!dockviewApi.value) return
  const layout = dockviewApi.value.toJSON()
  localStorage.setItem('dockview-parent-layout', JSON.stringify(layout))
}

function loadParentLayoutFromStorage(): boolean {
  if (!dockviewApi.value) return false
  const saved = localStorage.getItem('dockview-parent-layout')
  if (!saved) return false

  try {
    const layout = JSON.parse(saved)
    dockviewApi.value.fromJSON(layout)

    // Update fileCounter to avoid duplicate IDs
    let maxFileNum = 0
    dockviewApi.value.panels.forEach(panel => {
      const match = panel.id.match(/^file-(\d+)$/)
      if (match && match[1]) {
        const num = parseInt(match[1], 10)
        if (num > maxFileNum) maxFileNum = num
      }
    })
    fileCounter = maxFileNum

    return true
  } catch (error) {
    console.error('Failed to load parent layout:', error)
    return false
  }
}

defineExpose({ addFile })
</script>

<style scoped lang="scss">
.dockview-page {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.dockview-container {
  flex: 1;
  min-height: 0;
  position: relative;
}

:deep(.parent-dockview) {
  height: 100%;
  width: 100%;

  // CRITICAL: Without this fix, panels won't be visible!
  .dv-popover-anchor {
    position: absolute !important;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    z-index: 1000;
    pointer-events: none;
  }

  .dv-grid-view {
    position: absolute !important;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1;
  }
}
</style>
```

---

### Step 3: File Panel Component

**File: `src/pages/components/FilePanel.vue`**

Each file panel contains a nested dockview with view panels:

```vue
<template>
  <div class="file-panel">
    <DockviewVue
      class="dockview-theme-abyss nested-dockview"
      :right-header-actions-component="'group-controls'"
      :left-header-actions-component="'file-controls'"
      @ready="onChildReady"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, provide } from 'vue'
import { DockviewVue, type DockviewApi, type IDockviewPanelProps } from 'dockview-vue'

defineOptions({
  name: 'FilePanelComponent'
})

const props = defineProps<{
  params?: IDockviewPanelProps
}>()

const childDockviewApi = ref<DockviewApi>()
let childPanelCounter = 0

// Create API for child components (FileControls)
const filePanelApi = {
  addChildPanel: (type: string) => addChildPanel(type),
  getOpenChildPanelTypes: () => getOpenChildPanelTypes()
}

provide('filePanelApi', filePanelApi)

function onChildReady(event: { api: DockviewApi }) {
  childDockviewApi.value = event.api
  const fileId = props.params?.api?.id || 'unknown'

  // Auto-save child layout
  childDockviewApi.value.onDidLayoutChange(() => {
    saveChildLayoutToStorage(fileId)
  })

  // Load saved layout or create default
  const loaded = loadChildLayoutFromStorage(fileId)
  if (!loaded) {
    createDefaultChildLayout()
  }
}

function createDefaultChildLayout() {
  if (!childDockviewApi.value) return

  // Create Mindmap | Writer | Outline layout
  const mindmapPanel = childDockviewApi.value.addPanel({
    id: `mindmap-${Date.now()}`,
    component: 'mindmap-panel',
    title: 'Mind Map'
  })

  const writerPanel = childDockviewApi.value.addPanel({
    id: `writer-${Date.now()}`,
    component: 'writer-panel',
    title: 'Writer',
    position: { referencePanel: mindmapPanel, direction: 'right' }
  })

  childDockviewApi.value.addPanel({
    id: `outline-${Date.now()}`,
    component: 'outline-panel',
    title: 'Outline',
    position: { referencePanel: writerPanel, direction: 'right' }
  })
}

function addChildPanel(type: string) {
  if (!childDockviewApi.value) return

  childPanelCounter++
  const panelId = `${type}-${Date.now()}-${childPanelCounter}`

  const titleMap: Record<string, string> = {
    'mindmap-panel': 'Mind Map',
    'writer-panel': 'Writer',
    'outline-panel': 'Outline'
  }

  childDockviewApi.value.addPanel({
    id: panelId,
    component: type,
    title: titleMap[type] || type
  })
}

function getOpenChildPanelTypes(): string[] {
  if (!childDockviewApi.value) return []

  const openTypes = new Set<string>()
  childDockviewApi.value.panels.forEach(panel => {
    const componentName = panel.api.component
    if (componentName) openTypes.add(componentName)
  })

  return Array.from(openTypes)
}

function saveChildLayoutToStorage(fileId: string) {
  if (!childDockviewApi.value) return
  const layout = childDockviewApi.value.toJSON()
  localStorage.setItem(`dockview-file-${fileId}-layout`, JSON.stringify(layout))
}

function loadChildLayoutFromStorage(fileId: string): boolean {
  if (!childDockviewApi.value) return false
  const saved = localStorage.getItem(`dockview-file-${fileId}-layout`)
  if (!saved) return false

  try {
    const layout = JSON.parse(saved)
    childDockviewApi.value.fromJSON(layout)
    return true
  } catch (error) {
    console.error(`Failed to load child layout for file ${fileId}:`, error)
    return false
  }
}
</script>

<style scoped lang="scss">
.file-panel {
  width: 100%;
  height: 100%;
  position: relative;
}

.nested-dockview {
  height: 100%;
  width: 100%;
}
</style>
```

---

### Step 4: File Controls Component

**File: `src/pages/components/FileControls.vue`**

The "Add View" button for file panel headers:

```vue
<template>
  <div class="file-controls" @mousedown.stop="handleMouseDown">
    <q-btn
      flat
      dense
      round
      size="sm"
      icon="add"
      class="file-control-btn"
    >
      <q-tooltip>Add View</q-tooltip>
      <q-menu>
        <q-list style="min-width: 150px">
          <q-item
            clickable
            v-close-popup
            @click="handleAddView('mindmap-panel')"
            :disable="isViewTypeOpen('mindmap-panel')"
          >
            <q-item-section avatar>
              <q-icon name="account_tree" />
            </q-item-section>
            <q-item-section>Mind Map</q-item-section>
          </q-item>

          <q-item
            clickable
            v-close-popup
            @click="handleAddView('writer-panel')"
            :disable="isViewTypeOpen('writer-panel')"
          >
            <q-item-section avatar>
              <q-icon name="edit" />
            </q-item-section>
            <q-item-section>Writer</q-item-section>
          </q-item>

          <q-item
            clickable
            v-close-popup
            @click="handleAddView('outline-panel')"
            :disable="isViewTypeOpen('outline-panel')"
          >
            <q-item-section avatar>
              <q-icon name="list" />
            </q-item-section>
            <q-item-section>Outline</q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-btn>
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue'

defineOptions({
  name: 'FileControlsComponent'
})

interface DockviewPanelApi {
  id: string
  setActive: () => void
}

interface DockviewPanel {
  id: string
  api: DockviewPanelApi
}

interface DockviewGroupPanel {
  id: string
  activePanel?: DockviewPanel
}

interface GroupPanelPartInitParameters {
  group?: DockviewGroupPanel
}

const props = defineProps<{
  params?: GroupPanelPartInitParameters
}>()

interface FilePanelApi {
  addChildPanel: (type: string) => void
  getOpenChildPanelTypes: () => string[]
}

const filePanelApi = inject<FilePanelApi>('filePanelApi', {
  addChildPanel: () => console.warn('filePanelApi not provided'),
  getOpenChildPanelTypes: () => []
})

// Activate group on mousedown so views are added to correct group
function handleMouseDown() {
  if (props.params?.group?.activePanel?.api) {
    props.params.group.activePanel.api.setActive()
  }
}

function handleAddView(type: string) {
  const openTypes = filePanelApi.getOpenChildPanelTypes()
  if (openTypes.includes(type)) return // Already open

  filePanelApi.addChildPanel(type)
}

function isViewTypeOpen(type: string): boolean {
  const openTypes = filePanelApi.getOpenChildPanelTypes()
  return openTypes.includes(type)
}
</script>

<style scoped lang="scss">
.file-controls {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 4px;
}

.file-control-btn {
  color: white !important;
  opacity: 0.7;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
    background-color: rgba(255, 255, 255, 0.1);
  }
}
</style>
```

**Key Feature:** The `@mousedown.stop="handleMouseDown"` activates the group before showing the menu, ensuring views are added to the correct group.

---

## 4. View Panel Components

Each view panel wraps your existing view content.

**Example: `src/pages/components/MindmapPanel.vue`**

```vue
<template>
  <div class="mindmap-panel">
    <!-- Your existing mindmap component goes here -->
    <MindmapView />
  </div>
</template>

<script setup lang="ts">
import MindmapView from 'src/components/MindmapView.vue'

defineOptions({
  name: 'MindmapPanelComponent'
})
</script>

<style scoped lang="scss">
.mindmap-panel {
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: 16px;
}
</style>
```

**Important:**
- Each panel component must have a unique multi-word name (e.g., `MindmapPanelComponent`)
- The component should fill 100% width and height
- Handle overflow appropriately for your content

Repeat this pattern for WriterPanel and OutlinePanel.

---

## 5. Group Controls (Float/Maximize)

Create a component for the group header action buttons.

**File: `src/pages/components/GroupControls.vue`**

```vue
<template>
  <div class="group-controls">
    <q-btn
      flat
      dense
      round
      size="sm"
      icon="open_in_new"
      class="group-control-btn"
      @click="handleFloat"
    >
      <q-tooltip>Float Panel</q-tooltip>
    </q-btn>

    <q-btn
      flat
      dense
      round
      size="sm"
      :icon="isMaximized ? 'fullscreen_exit' : 'fullscreen'"
      class="group-control-btn"
      @click="handleMaximize"
    >
      <q-tooltip>{{ isMaximized ? 'Restore' : 'Maximize' }}</q-tooltip>
    </q-btn>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, watch } from 'vue'

defineOptions({
  name: 'GroupControlsComponent'
})

// Type definitions based on dockview API
interface FloatingGroupOptions {
  position: { top: number; left: number }
  height: number
  width: number
}

interface DockviewPanel {
  id: string
}

interface DockviewGroupPanel {
  id: string
  activeView?: string
  activePanel?: DockviewPanel
}

interface DockviewGroupPanelApi {
  id: string
  isMaximized: () => boolean
  maximize: () => void
  exitMaximized: () => void
  location: { type: string }
  group: DockviewGroupPanel
  accessor: DockviewApi
}

interface DockviewApi {
  addFloatingGroup: (group: DockviewGroupPanel, options?: FloatingGroupOptions) => void
  removePanel: (panel: DockviewPanel) => void
  getPanel: (id: string) => DockviewPanel | undefined
  onDidMaximizedGroupChange: (callback: () => void) => { dispose: () => void }
}

interface GroupPanelPartInitParameters {
  api: DockviewGroupPanelApi
  containerApi: DockviewApi
  group: DockviewGroupPanel
  params?: Record<string, unknown>
}

const props = defineProps<{
  params?: GroupPanelPartInitParameters
}>()

const isMaximized = ref(false)
let disposables: (() => void)[] = []

// Watch for params to be set
watch(() => props.params, (params) => {
  if (params?.containerApi && params?.api) {
    // Listen to the main container API for maximize changes
    const disposable = params.containerApi.onDidMaximizedGroupChange(() => {
      // Check if this specific group is maximized
      isMaximized.value = params.api?.isMaximized() || false
    })
    disposables.push(disposable.dispose.bind(disposable))

    // Set initial state
    isMaximized.value = params.api.isMaximized() || false
  }
}, { immediate: true })

onUnmounted(() => {
  disposables.forEach(dispose => dispose())
})

function handleFloat() {
  if (!props.params?.api || !props.params?.group) {
    console.warn('Missing api or group')
    return
  }

  const location = props.params.api.location

  if (location.type === 'floating') {
    console.log('Group is already floating')
  } else {
    // Make it float
    props.params.containerApi.addFloatingGroup(props.params.group, {
      position: { top: 100, left: 100 },
      height: 400,
      width: 600
    })
  }
}

function handleMaximize() {
  if (!props.params?.api) {
    console.warn('Missing api')
    return
  }

  if (isMaximized.value) {
    props.params.api.exitMaximized()
  } else {
    props.params.api.maximize()
  }
}
</script>

<style scoped lang="scss">
.group-controls {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 4px;
  gap: 2px;
}

.group-control-btn {
  color: white !important;
  opacity: 0.7;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
    background-color: rgba(255, 255, 255, 0.1);
  }

  :deep(.q-icon) {
    color: white;
  }
}
</style>
```

**Key Points:**
- The component receives a `params` prop from dockview containing `api`, `containerApi`, and `group`
- `onDidMaximizedGroupChange` is on the **containerApi** (main DockviewApi), not on the group API
- Float button creates a draggable floating window
- Maximize button toggles full-screen mode with dynamic icon
- Each tab already has its own close button, so we don't need a close button here

---

## 6. Auto-save Layout

The layout is automatically saved to localStorage on every change.

**Implementation (already shown in Step 2):**

```typescript
function onReady(event: { api: DockviewApi }) {
  dockviewApi.value = event.api

  // Set up auto-save on layout changes
  dockviewApi.value.onDidLayoutChange(() => {
    saveLayoutToStorage()
  })

  // Load saved layout or create default
  const loaded = loadLayoutFromStorage()
  if (!loaded) {
    createDefaultLayout()
  }
}

function saveLayoutToStorage() {
  if (!dockviewApi.value) return
  const layout = dockviewApi.value.toJSON()
  localStorage.setItem('dockview-layout', JSON.stringify(layout))
}

function loadLayoutFromStorage(): boolean {
  if (!dockviewApi.value) return false
  const saved = localStorage.getItem('dockview-layout')
  if (!saved) return false

  try {
    const layout = JSON.parse(saved)
    dockviewApi.value.fromJSON(layout)
    return true
  } catch (error) {
    console.error('Failed to load layout:', error)
    return false
  }
}
```

**Key Points:**
- `onDidLayoutChange` fires on any layout change (resize, move, add, remove, etc.)
- Layout is serialized to JSON and saved to localStorage
- On startup, try to load saved layout, otherwise create default
- No manual save buttons needed - it's all automatic!

---

## 7. Add Panel Functionality

Add a dropdown button to the toolbar for adding new panels.

**File: `src/layouts/MainLayout.vue`**

```vue
<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-toolbar-title>MindScribble</q-toolbar-title>

        <!-- Add Panel Dropdown -->
        <q-btn
          flat
          dense
          icon="add"
          label="Add Panel"
        >
          <q-menu>
            <q-list style="min-width: 150px">
              <q-item
                clickable
                v-close-popup
                @click="handleAddPanel('mindmap-panel')"
                :disable="isPanelTypeOpen('mindmap-panel')"
              >
                <q-item-section avatar>
                  <q-icon name="account_tree" />
                </q-item-section>
                <q-item-section>Mind Map</q-item-section>
              </q-item>

              <q-item
                clickable
                v-close-popup
                @click="handleAddPanel('writer-panel')"
                :disable="isPanelTypeOpen('writer-panel')"
              >
                <q-item-section avatar>
                  <q-icon name="edit" />
                </q-item-section>
                <q-item-section>Writer</q-item-section>
              </q-item>

              <q-item
                clickable
                v-close-popup
                @click="handleAddPanel('outline-panel')"
                :disable="isPanelTypeOpen('outline-panel')"
              >
                <q-item-section avatar>
                  <q-icon name="list" />
                </q-item-section>
                <q-item-section>Outline</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view v-slot="{ Component }">
        <component :is="Component" ref="pageRef" />
      </router-view>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface DockviewPageRef {
  addPanel: (type: string) => void
  getOpenPanelTypes: () => string[]
}

const pageRef = ref<DockviewPageRef | null>(null)

function handleAddPanel(type: string) {
  if (pageRef.value && pageRef.value.addPanel) {
    pageRef.value.addPanel(type)
  }
}

function isPanelTypeOpen(type: string): boolean {
  if (pageRef.value && pageRef.value.getOpenPanelTypes) {
    const openTypes = pageRef.value.getOpenPanelTypes()
    return openTypes.includes(type)
  }
  return false
}
</script>
```

**Key Points:**
- The `q-menu` inside `q-btn` automatically shows on click (no manual `v-model` needed)
- `:disable` grays out panel types that are already open
- `v-close-popup` closes the menu after clicking an item
- `pageRef` connects to the IndexPage component via `ref` and `defineExpose`

---

## 8. Styling and Theming

Dockview comes with several built-in themes. We use `dockview-theme-abyss` (dark theme).

**Available themes:**
- `dockview-theme-abyss` (dark)
- `dockview-theme-light`
- `dockview-theme-vs`
- `dockview-theme-replit`

**Apply theme as a class:**

```vue
<DockviewVue class="dockview-theme-abyss" />
```

**Custom styling:**

You can customize colors by overriding CSS variables. See dockview documentation for available variables.

---

## 9. Code to Remove

When migrating to dockview, remove the following from MindScribble:

### 1. **Remove 3-Panel Layout Code**
- Remove the existing 3-panel layout component
- Remove panel resize logic
- Remove panel visibility toggle logic

### 2. **Remove Keyboard Shortcuts for Panel Focus**
- Remove `Alt+1`, `Alt+2`, `Alt+3` keyboard shortcuts
- Remove the panel focus management code
- Dockview handles focus automatically

### 3. **Remove Panel State Management**
- Remove any store code for tracking active panel
- Remove panel visibility state
- Remove panel size state
- Dockview manages all of this internally

### 4. **Update Store Events**
- Instead of watching store state changes between panels, use dockview events:
  - `onDidActivePanelChange` - when active panel changes
  - `onDidAddPanel` - when a panel is added
  - `onDidRemovePanel` - when a panel is removed
  - `onDidLayoutChange` - when layout changes

**Example:**

```typescript
dockviewApi.value.onDidActivePanelChange((panel) => {
  console.log('Active panel changed:', panel?.id)
  // Update your store or trigger actions here
})
```

### 5. **Remove Manual Save/Load Layout Buttons**
- Remove any manual save/load buttons
- Auto-save handles everything

---

## 10. Migration Checklist

Use this checklist to track your migration progress:

### Installation & Setup
- [ ] Install `dockview-vue` and `dockview-core` packages
- [ ] Create `src/boot/dockview.ts` boot file
- [ ] Register boot file in `quasar.config.ts`
- [ ] Register all panel components globally in boot file

### Component Creation
- [ ] Create `GroupControls.vue` component
- [ ] Wrap MindmapView in `MindmapPanel.vue`
- [ ] Wrap WriterView in `WriterPanel.vue`
- [ ] Wrap OutlineView in `OutlinePanel.vue`

### Main Page Implementation
- [ ] Replace 3-panel layout with `DockviewVue` component in IndexPage
- [ ] Implement `onReady` handler
- [ ] Implement `createDefaultLayout` function
- [ ] Implement `addPanel` function
- [ ] Implement `saveLayoutToStorage` function
- [ ] Implement `loadLayoutFromStorage` function
- [ ] Implement `getOpenPanelTypes` function
- [ ] Add CRITICAL CSS fix for `.dv-popover-anchor` and `.dv-grid-view`
- [ ] Set up auto-save with `onDidLayoutChange`

### Toolbar Integration
- [ ] Add "Add Panel" dropdown button to MainLayout
- [ ] Implement `handleAddPanel` function
- [ ] Implement `isPanelTypeOpen` function
- [ ] Connect `pageRef` to IndexPage

### Code Removal
- [ ] Remove old 3-panel layout component
- [ ] Remove `Alt+1`, `Alt+2`, `Alt+3` keyboard shortcuts
- [ ] Remove panel focus management code
- [ ] Remove panel state management from store
- [ ] Remove manual save/load layout buttons
- [ ] Update store event handling to use dockview events

### Testing
- [ ] Test default layout creation
- [ ] Test adding panels via dropdown
- [ ] Test closing panels via tab close buttons
- [ ] Test resizing panels
- [ ] Test dragging panels to reorder
- [ ] Test floating panels (popup button)
- [ ] Test maximizing/restoring panels
- [ ] Test layout persistence (refresh page)
- [ ] Test that already-open panels are disabled in dropdown

---

## Additional Resources

- **Dockview Documentation:** https://dockview.dev/
- **Dockview GitHub:** https://github.com/mathuo/dockview
- **Dockview API Reference:** See `quasar-dockview/dev/api.md`
- **Test Project:** `quasar-dockview/quasar-dockview-test/`

---

## Common Issues and Solutions

### Issue 1: Panels Not Visible
**Symptom:** Dockview renders but panels are not visible.

**Solution:** Add the CSS fix for `.dv-popover-anchor` and `.dv-grid-view` (see Step 2).

### Issue 2: "Failed to find Vue Component" Error
**Symptom:** Console error about missing Vue component.

**Solution:**
- Make sure components are registered globally in boot file using `app.component()`
- Use kebab-case string names (e.g., 'mindmap-panel')
- Do NOT pass components as props to DockviewVue

### Issue 3: TypeScript Errors with Dockview Types
**Symptom:** TypeScript errors about missing types.

**Solution:** Define local interfaces as shown in GroupControls.vue. The dockview-vue package doesn't export all types, so we define minimal interfaces based on the API documentation.

### Issue 4: Layout Not Persisting
**Symptom:** Layout resets on page refresh.

**Solution:**
- Make sure `onDidLayoutChange` is set up in `onReady`
- Check that `loadLayoutFromStorage` is called in `onReady`
- Verify localStorage is working in your browser

### Issue 5: Maximize Button Not Working
**Symptom:** Clicking maximize button does nothing.

**Solution:**
- Make sure you're listening to `containerApi.onDidMaximizedGroupChange`, not `api.onDidMaximizedGroupChange`
- The event is on the main DockviewApi, not the group API

---

## Summary

Dockview provides a professional, feature-rich docking layout system that's far superior to a custom 3-panel implementation. Key benefits:

✅ **Flexible Layout** - Users can arrange panels however they want
✅ **Floating Windows** - Panels can float as draggable windows
✅ **Maximize/Restore** - Full-screen mode for focused work
✅ **Tabbed Groups** - Multiple panels can be tabbed together
✅ **Auto-save** - Layout persists automatically
✅ **Drag & Drop** - Intuitive panel rearrangement
✅ **Resizable** - All panels can be resized
✅ **Professional** - Used by VS Code and other major applications

The implementation is straightforward and the test project demonstrates that it works perfectly with Quasar!

