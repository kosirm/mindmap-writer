# Nested Dockview Quick Start Guide

Quick guide for implementing nested dockview in MindScribble. For complete details, see `NESTED_DOCKVIEW_GUIDE.md`.

## Architecture

**Nested Dockview** = Parent dockview (files) → Child dockview (views per file)

## Installation

```bash
npm install dockview-vue dockview-core
```

## Setup Steps

### 1. Boot File + CSS Fixes

**File: `src/boot/dockview.ts`**

```typescript
import { boot } from 'quasar/wrappers'
import FilePanel from 'src/pages/components/FilePanel.vue'
import FileControls from 'src/pages/components/FileControls.vue'
import GroupControls from 'src/pages/components/GroupControls.vue'
import MindmapPanel from 'src/pages/components/MindmapPanel.vue'
import WriterPanel from 'src/pages/components/WriterPanel.vue'
import OutlinePanel from 'src/pages/components/OutlinePanel.vue'

export default boot(({ app }) => {
  app.component('file-panel', FilePanel)
  app.component('file-controls', FileControls)
  app.component('mindmap-panel', MindmapPanel)
  app.component('writer-panel', WriterPanel)
  app.component('outline-panel', OutlinePanel)
  app.component('group-controls', GroupControls)
})
```

**File: `src/css/app.scss`** (CRITICAL!)

```scss
html, body, #q-app {
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.q-layout {
  height: 100vh;
}

.q-page-container {
  height: 100%;
}
```

Register in `quasar.config.ts`:
```typescript
boot: ['dockview']
```

### 2. IndexPage (Parent Dockview)

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

  dockviewApi.value.onDidLayoutChange(() => {
    const layout = dockviewApi.value!.toJSON()
    localStorage.setItem('dockview-parent-layout', JSON.stringify(layout))
  })

  const saved = localStorage.getItem('dockview-parent-layout')
  if (saved) {
    try {
      dockviewApi.value.fromJSON(JSON.parse(saved))
      // Update fileCounter to avoid duplicate IDs
      let maxFileNum = 0
      dockviewApi.value.panels.forEach(panel => {
        const match = panel.id.match(/^file-(\d+)$/)
        if (match) maxFileNum = Math.max(maxFileNum, parseInt(match[1]))
      })
      fileCounter = maxFileNum
    } catch {
      addFile()
    }
  } else {
    addFile()
  }
}

function addFile() {
  fileCounter++
  dockviewApi.value!.addPanel({
    id: `file-${fileCounter}`,
    component: 'file-panel',
    title: `📄 Document ${fileCounter}`
  })
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

### 3. FilePanel (Child Dockview)

See `NESTED_DOCKVIEW_GUIDE.md` for complete FilePanel.vue code (~130 lines).

**Key points:**
- Contains nested DockviewVue
- Creates default Mindmap | Writer | Outline layout
- Saves layout to `dockview-file-{fileId}-layout`
- Provides API to FileControls via inject/provide

### 4. FileControls (Add View Button)

See `NESTED_DOCKVIEW_GUIDE.md` for complete FileControls.vue code (~140 lines).

**Key points:**
- Left header action for file panels
- Dropdown menu to add views
- Activates group on mousedown
- Disables already-open views

### 5. GroupControls (Float/Maximize)

See test project for complete GroupControls.vue code (~180 lines).

**Key points:**
- Right header action for view groups
- Float and Maximize buttons
- Buttons hidden when panel is floating

### 6. View Panels

Simple wrappers:

```vue
<template>
  <div class="mindmap-panel">
    <MindmapView />
  </div>
</template>

<script setup lang="ts">
import MindmapView from 'src/components/MindmapView.vue'
defineOptions({ name: 'MindmapPanelComponent' })
</script>

<style scoped lang="scss">
.mindmap-panel {
  width: 100%;
  height: 100%;
  overflow: auto;
}
</style>
```

## That's It!

You now have nested dockview with:
- ✅ Multiple files
- ✅ Independent view layouts per file
- ✅ Auto-save (parent + per-file)
- ✅ Drag & drop
- ✅ Floating windows
- ✅ Maximize/restore

**See test project:** `quasar-dockview/quasar-dockview-test/`


