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

// Counter for unique panel IDs
let panelCounter = 0

function onReady(event: { api: DockviewApi }) {
  dockviewApi.value = event.api
  console.log('Dockview API ready', event.api)

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

  // Add initial panels in a default layout
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

  console.log('Default layout created')
}

function addPanel(type: string) {
  if (!dockviewApi.value) return

  panelCounter++
  const panelId = `${type}-${panelCounter}`

  dockviewApi.value.addPanel({
    id: panelId,
    component: type,
    title: type.charAt(0).toUpperCase() + type.slice(1)
  })

  $q.notify({
    type: 'positive',
    message: `${type} panel added`,
    timeout: 1000
  })
}

function saveLayoutToStorage() {
  if (!dockviewApi.value) return

  const layout = dockviewApi.value.toJSON()
  localStorage.setItem('dockview-layout', JSON.stringify(layout))
  console.log('Layout auto-saved to localStorage')
}

function loadLayoutFromStorage(): boolean {
  if (!dockviewApi.value) return false

  const saved = localStorage.getItem('dockview-layout')
  if (!saved) {
    console.log('No saved layout found')
    return false
  }

  try {
    const layout = JSON.parse(saved)
    dockviewApi.value.fromJSON(layout)
    console.log('Layout loaded from localStorage')
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
    // Get the component name from the panel
    const componentName = panel.api.component
    if (componentName) {
      openTypes.add(componentName)
    }
  })

  return Array.from(openTypes)
}

// Expose functions to parent component
defineExpose({
  addPanel,
  getOpenPanelTypes
})
</script>

<style lang="scss">
// Global styles for q-page to ensure full height
.q-page {
  display: flex;
  flex-direction: column;
  height: 100%;
}
</style>

<style scoped lang="scss">
.dockview-page {
  width: 100%;
  height: 100%;
  overflow: hidden;
  padding: 0;
  margin: 0;
}

.dockview-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

// Ensure dockview takes full height
:deep(.dockview-theme-abyss) {
  height: 100%;
  width: 100%;
  position: relative;

  > div {
    height: 100%;
    width: 100%;
  }

  // Fix positioning issue with popover anchor - make it not take up space
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
