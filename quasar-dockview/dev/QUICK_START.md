# Dockview Quick Start Guide

This is a condensed version of the full implementation guide. For complete details, see `DOCKVIEW_IMPLEMENTATION_GUIDE.md`.

## Installation

```bash
npm install dockview-vue dockview-core
```

## Minimal Setup (3 Steps)

### 1. Create Boot File

**File: `src/boot/dockview.ts`**

```typescript
import { boot } from 'quasar/wrappers'
import MindmapPanel from 'src/pages/components/MindmapPanel.vue'
import WriterPanel from 'src/pages/components/WriterPanel.vue'
import OutlinePanel from 'src/pages/components/OutlinePanel.vue'
import GroupControls from 'src/pages/components/GroupControls.vue'

export default boot(({ app }) => {
  app.component('mindmap-panel', MindmapPanel)
  app.component('writer-panel', WriterPanel)
  app.component('outline-panel', OutlinePanel)
  app.component('group-controls', GroupControls)
})
```

Register in `quasar.config.ts`:
```typescript
boot: ['dockview']
```

### 2. Replace Layout in IndexPage

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
import { DockviewVue, type DockviewApi } from 'dockview-vue'

const dockviewApi = ref<DockviewApi>()

function onReady(event: { api: DockviewApi }) {
  dockviewApi.value = event.api
  
  // Auto-save on every change
  dockviewApi.value.onDidLayoutChange(() => {
    const layout = dockviewApi.value!.toJSON()
    localStorage.setItem('dockview-layout', JSON.stringify(layout))
  })

  // Load saved layout or create default
  const saved = localStorage.getItem('dockview-layout')
  if (saved) {
    try {
      dockviewApi.value.fromJSON(JSON.parse(saved))
    } catch {
      createDefaultLayout()
    }
  } else {
    createDefaultLayout()
  }
}

function createDefaultLayout() {
  const mindmap = dockviewApi.value!.addPanel({
    id: 'mindmap-1',
    component: 'mindmap-panel',
    title: 'Mind Map'
  })
  
  const writer = dockviewApi.value!.addPanel({
    id: 'writer-1',
    component: 'writer-panel',
    title: 'Writer',
    position: { referencePanel: mindmap, direction: 'right' }
  })
  
  dockviewApi.value!.addPanel({
    id: 'outline-1',
    component: 'outline-panel',
    title: 'Outline',
    position: { referencePanel: writer, direction: 'right' }
  })
}
</script>

<style scoped lang="scss">
.dockview-page {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.dockview-container {
  width: 100%;
  height: 100%;
  position: relative;
}

// CRITICAL FIX - Without this, panels won't be visible!
:deep(.dockview-theme-abyss) {
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

### 3. Create Panel Components

Wrap your existing components:

```vue
<template>
  <div class="mindmap-panel">
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
}
</style>
```

## That's It!

You now have a fully functional dockview layout with:
- ✅ Auto-save
- ✅ Drag & drop
- ✅ Resizable panels
- ✅ Floating windows
- ✅ Maximize/restore

For GroupControls component and Add Panel dropdown, see the full guide.


