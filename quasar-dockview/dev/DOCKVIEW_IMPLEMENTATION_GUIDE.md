# Dockview Implementation Guide for MindScribble

This document provides a comprehensive guide for replacing the existing 3-panel layout in MindScribble with Dockview, based on the successful implementation in the test project.

## Table of Contents
- [Dockview Implementation Guide for MindScribble](#dockview-implementation-guide-for-mindscribble)
  - [Table of Contents](#table-of-contents)
  - [1. Installation](#1-installation)
    - [Install Dependencies](#install-dependencies)
  - [2. Project Structure](#2-project-structure)
    - [Files to Create/Modify](#files-to-createmodify)
  - [3. Core Implementation](#3-core-implementation)
    - [Step 1: Create Boot File for Component Registration](#step-1-create-boot-file-for-component-registration)
    - [Step 2: Main Page Implementation](#step-2-main-page-implementation)
  - [4. Panel Components](#4-panel-components)
  - [5. Group Controls (Float/Maximize)](#5-group-controls-floatmaximize)
  - [6. Auto-save Layout](#6-auto-save-layout)
  - [7. Add Panel Functionality](#7-add-panel-functionality)
  - [8. Styling and Theming](#8-styling-and-theming)
  - [9. Code to Remove](#9-code-to-remove)
    - [1. **Remove 3-Panel Layout Code**](#1-remove-3-panel-layout-code)
    - [2. **Remove Keyboard Shortcuts for Panel Focus**](#2-remove-keyboard-shortcuts-for-panel-focus)
    - [3. **Remove Panel State Management**](#3-remove-panel-state-management)
    - [4. **Update Store Events**](#4-update-store-events)
    - [5. **Remove Manual Save/Load Layout Buttons**](#5-remove-manual-saveload-layout-buttons)
  - [10. Migration Checklist](#10-migration-checklist)
    - [Installation \& Setup](#installation--setup)
    - [Component Creation](#component-creation)
    - [Main Page Implementation](#main-page-implementation)
    - [Toolbar Integration](#toolbar-integration)
    - [Code Removal](#code-removal)
    - [Testing](#testing)
  - [Additional Resources](#additional-resources)
  - [Common Issues and Solutions](#common-issues-and-solutions)
    - [Issue 1: Panels Not Visible](#issue-1-panels-not-visible)
    - [Issue 2: "Failed to find Vue Component" Error](#issue-2-failed-to-find-vue-component-error)
    - [Issue 3: TypeScript Errors with Dockview Types](#issue-3-typescript-errors-with-dockview-types)
    - [Issue 4: Layout Not Persisting](#issue-4-layout-not-persisting)
    - [Issue 5: Maximize Button Not Working](#issue-5-maximize-button-not-working)
  - [Summary](#summary)

---

## 1. Installation

### Install Dependencies

```bash
npm install dockview-vue dockview-core
```

**Versions used in test project:**
- `dockview-vue`: ^4.11.0
- `dockview-core`: ^1.16.3

---

## 2. Project Structure

### Files to Create/Modify

```
src/
├── boot/
│   └── dockview.ts                    # NEW: Register dockview components globally
├── pages/
│   ├── IndexPage.vue                  # MODIFY: Replace 3-panel layout with DockviewVue
│   └── components/
│       ├── GroupControls.vue          # NEW: Float/Maximize buttons for group headers
│       ├── MindmapPanel.vue           # MODIFY: Wrap existing mindmap in dockview panel
│       ├── WriterPanel.vue            # MODIFY: Wrap existing writer in dockview panel
│       └── OutlinePanel.vue           # MODIFY: Wrap existing outline in dockview panel
└── layouts/
    └── MainLayout.vue                 # MODIFY: Add "Add Panel" button to toolbar
```

---

## 3. Core Implementation

### Step 1: Create Boot File for Component Registration

**File: `src/boot/dockview.ts`**

Dockview-vue requires all panel components to be registered globally using `app.component()`.

```typescript
import { boot } from 'quasar/wrappers'
import MindmapPanel from 'src/pages/components/MindmapPanel.vue'
import WriterPanel from 'src/pages/components/WriterPanel.vue'
import OutlinePanel from 'src/pages/components/OutlinePanel.vue'
import GroupControls from 'src/pages/components/GroupControls.vue'

export default boot(({ app }) => {
  // Register dockview panel components globally
  app.component('mindmap-panel', MindmapPanel)
  app.component('writer-panel', WriterPanel)
  app.component('outline-panel', OutlinePanel)
  
  // Register group controls component
  app.component('group-controls', GroupControls)
  
  console.log('Dockview components registered')
})
```

**Important:**
- Component names MUST be kebab-case strings (e.g., 'mindmap-panel')
- Do NOT pass components as props to DockviewVue - this will not work
- Register the boot file in `quasar.config.ts`:

```typescript
boot: [
  'dockview'  // Add this
]
```

---

### Step 2: Main Page Implementation

**File: `src/pages/IndexPage.vue`**

Replace the existing 3-panel layout with DockviewVue component.

```vue
<template>
  <q-page class="dockview-page">
    <div class="dockview-container">
      <DockviewVue
        class="dockview-theme-abyss"
        :right-header-actions-component="'group-controls'"
        @ready="onReady"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { DockviewVue, type DockviewApi } from 'dockview-vue'

const $q = useQuasar()
const dockviewApi = ref<DockviewApi>()
let panelCounter = 0

function onReady(event: { api: DockviewApi }) {
  dockviewApi.value = event.api

  // Set up auto-save on layout changes
  dockviewApi.value.onDidLayoutChange(() => {
    saveLayoutToStorage()
  })

  // Try to load saved layout, otherwise create default
  const loaded = loadLayoutFromStorage()
  if (!loaded) {
    createDefaultLayout()
  }
}

function createDefaultLayout() {
  if (!dockviewApi.value) return

  // Add initial panels (left to right: Mindmap | Writer | Outline)
  const mindmapPanel = dockviewApi.value.addPanel({
    id: 'mindmap-1',
    component: 'mindmap-panel',
    title: 'Mind Map'
  })

  const writerPanel = dockviewApi.value.addPanel({
    id: 'writer-1',
    component: 'writer-panel',
    title: 'Writer',
    position: { referencePanel: mindmapPanel, direction: 'right' }
  })

  dockviewApi.value.addPanel({
    id: 'outline-1',
    component: 'outline-panel',
    title: 'Outline',
    position: { referencePanel: writerPanel, direction: 'right' }
  })
}

function addPanel(type: string) {
  if (!dockviewApi.value) return

  panelCounter++
  const panelId = `${type}-${panelCounter}`

  const titleMap: Record<string, string> = {
    'mindmap-panel': 'Mind Map',
    'writer-panel': 'Writer',
    'outline-panel': 'Outline'
  }

  const title = titleMap[type] || type

  dockviewApi.value.addPanel({
    id: panelId,
    component: type,
    title: title
  })
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

function getOpenPanelTypes(): string[] {
  if (!dockviewApi.value) return []
  const openTypes = new Set<string>()
  dockviewApi.value.panels.forEach(panel => {
    const componentName = panel.api.component
    if (componentName) {
      openTypes.add(componentName)
    }
  })
  return Array.from(openTypes)
}

defineExpose({
  addPanel,
  getOpenPanelTypes
})
</script>
```

**CRITICAL CSS Fix** - Add this to the scoped styles:

```scss
:deep(.dockview-theme-abyss) {
  height: 100%;
  width: 100%;

  // WITHOUT THIS FIX, PANELS WON'T BE VISIBLE!
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
```

---

## 4. Panel Components

Each panel component should be a simple Vue component that wraps your existing panel content.

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

