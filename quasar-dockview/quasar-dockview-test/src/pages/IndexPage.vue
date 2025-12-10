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

// Counter for unique file IDs
let fileCounter = 0

function onReady(event: { api: DockviewApi }) {
  dockviewApi.value = event.api
  // console.log('Parent Dockview API ready', event.api)

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

function createDefaultLayout() {
  if (!dockviewApi.value) return

  // Add initial file panel
  addFile()

  // console.log('Default parent layout created')
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

  $q.notify({
    type: 'positive',
    message: `${fileName} opened`,
    timeout: 1000
  })

  // console.log(`Added file panel: ${fileName}`)
}

function saveParentLayoutToStorage() {
  if (!dockviewApi.value) return

  const layout = dockviewApi.value.toJSON()
  localStorage.setItem('dockview-parent-layout', JSON.stringify(layout))
  // console.log('Parent layout auto-saved to localStorage')
}

function loadParentLayoutFromStorage(): boolean {
  if (!dockviewApi.value) return false

  const saved = localStorage.getItem('dockview-parent-layout')
  if (!saved) {
    // console.log('No saved parent layout found')
    return false
  }

  try {
    const layout = JSON.parse(saved)
    dockviewApi.value.fromJSON(layout)

    // Update fileCounter to avoid duplicate IDs
    // Find the highest file number in existing panels
    let maxFileNum = 0
    dockviewApi.value.panels.forEach(panel => {
      const match = panel.id.match(/^file-(\d+)$/)
      if (match && match[1]) {
        const num = parseInt(match[1], 10)
        if (num > maxFileNum) {
          maxFileNum = num
        }
      }
    })
    fileCounter = maxFileNum

    // console.log('Parent layout loaded from localStorage, fileCounter:', fileCounter)
    return true
  } catch (error) {
    console.error('Failed to load parent layout:', error)
    return false
  }
}

// Expose functions to parent component (MainLayout)
defineExpose({
  addFile
})
</script>

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

// Parent dockview styles
:deep(.parent-dockview) {
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

// Nested dockview styles (inside FilePanel)
:deep(.nested-dockview) {
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
