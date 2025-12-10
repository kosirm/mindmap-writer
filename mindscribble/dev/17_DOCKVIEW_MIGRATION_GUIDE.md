# Dockview Migration Guide for MindScribble

## Overview
This document provides a comprehensive guide for integrating the quasar-dockview functionality into MindScribble, including platform-specific implementations for desktop and mobile.

## Migration Phases

### Phase 1: Preparation ✅ COMPLETED
- [x] Create dockview boot file ✅
- [x] Update Quasar configuration ✅
- [x] Create layout components ✅
- [x] Create panel wrapper components ✅
- [x] Create control components ✅

### Phase 2: Desktop Integration ✅ COMPLETED
- [x] Implement DockviewLayout ✅
- [x] Update MainLayout for desktop ✅
- [x] Fix TypeScript and ESLint errors ✅
- [x] Fix all compilation errors ✅
- [x] Integrate with existing views ✅
- [x] Implement layout persistence (auto-save) ✅
- [x] Add "Add File" button to toolbar ✅
- [ ] Add keyboard shortcuts ❌ (Future enhancement)

### Phase 3: Mobile Integration ❌ NOT STARTED
- [ ] Implement MobileLayout ❌
- [ ] Create mobile-specific components ❌
- [ ] Add touch gesture support ❌
- [ ] Implement mobile navigation ❌
- [ ] Optimize for small screens ❌

### Phase 4: Testing and Validation ❌ NOT STARTED
- [ ] Test desktop functionality ❌
- [ ] Test mobile functionality ❌
- [ ] Test platform switching ❌
- [ ] Test layout persistence ❌
- [ ] Test error handling ❌

## Detailed Implementation Steps

### Step 1: Create Dockview Boot File
**File:** `src/boot/dockview.ts`

**Action:** Create new file with the following content:

```typescript
import { boot } from 'quasar/wrappers'
import { Platform } from 'quasar'

// Import dockview CSS
import 'dockview-vue/dist/styles/dockview.css'

// Import panel components
import FilePanel from 'src/pages/components/FilePanel.vue'
import FileControls from 'src/pages/components/FileControls.vue'
import GroupControls from 'src/pages/components/GroupControls.vue'
import MindmapPanel from 'src/pages/components/MindmapPanel.vue'
import WriterPanel from 'src/pages/components/WriterPanel.vue'
import OutlinePanel from 'src/pages/components/OutlinePanel.vue'

export default boot(({ app }) => {
  // Register child panel components (views)
  app.component('mindmap-panel', MindmapPanel)
  app.component('writer-panel', WriterPanel)
  app.component('outline-panel', OutlinePanel)

  // Register parent panel component (file)
  app.component('file-panel', FilePanel)

  // Register control components
  app.component('group-controls', GroupControls)
  app.component('file-controls', FileControls)

  console.log('Dockview components registered')
})
Step 2: Update Quasar Configuration
File: quasar.config.ts

Action: Add 'dockview' to the boot array:

boot: [
  'i18n',
  'axios',
  'google-api',
  'dockview' // Add this line
]
Step 3: Create Dockview Layout Components
File: src/layouts/DockviewLayout.vue

Action: Create new file with dockview implementation:

<template>
  <q-page class="dockview-page">
    <div class="dockview-container">
      <DockviewVue
        class="dockview-theme-abyss parent-dockview"
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
let fileCounter = 0

function onReady(event: { api: DockviewApi }) {
  dockviewApi.value = event.api

  // Set up auto-save on parent layout changes
  dockviewApi.value.onDidLayoutChange(() => {
    saveParentLayoutToStorage()
  })

  // Try to load saved parent layout, otherwise create default
  const loaded = loadParentLayoutFromStorage()
  if (!loaded) {
    createDefaultLayout()
  }
}

// ... rest of the implementation from test project
</script>
Step 4: Create Mobile Layout Component
File: src/layouts/MobileLayout.vue

Action: Create new file with mobile-specific implementation:

<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn v-if="showBack" flat round dense icon="arrow_back" @click="goBack" />
        <q-select
          v-model="currentFile"
          :options="fileOptions"
          label="Current File"
          dense
          borderless
          @update:model-value="loadFile"
          style="min-width: 150px"
        />
        <q-space />
        <q-select
          v-model="currentView"
          :options="viewOptions"
          label="Current View"
          dense
          borderless
          @update:model-value="loadView"
          style="min-width: 120px"
        />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <q-page class="mobile-page">
        <component :is="currentViewComponent" :file-id="currentFile.id" />
      </q-page>
    </q-page-container>
  </q-layout>
</template>
Step 5: Update Main Layout
File: src/layouts/MainLayout.vue

Action: Modify to include platform detection and conditional rendering:

<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated v-if="!isMobile">
      <q-toolbar>
        <q-toolbar-title>MindScribble</q-toolbar-title>
        <q-btn flat dense icon="add" label="Add File" @click="handleAddFile" />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <DockviewLayout v-if="!isMobile" />
      <MobileLayout v-else />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { Platform } from 'quasar'
import DockviewLayout from './DockviewLayout.vue'
import MobileLayout from './MobileLayout.vue'

const isMobile = Platform.is.mobile
</script>