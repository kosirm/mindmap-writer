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
import { ref, onMounted, onUnmounted, provide, watch } from 'vue'
import { DockviewVue } from 'dockview-vue'
import { type IDockviewPanelProps, type DockviewApi } from 'dockview-core'
import { useDocumentStore } from 'src/core/stores/documentStore'
import { useGoogleDriveStore } from 'src/core/stores/googleDriveStore'

defineOptions({
  name: 'FilePanelComponent'
})

const props = defineProps<{
  params?: IDockviewPanelProps
}>()

const childDockviewApi = ref<DockviewApi | null>(null)
let childPanelCounter = 0

// Stores
const documentStore = useDocumentStore()
const driveStore = useGoogleDriveStore()

// Create the API object that will be provided to child components
const filePanelApi = {
  addChildPanel: (type: string) => addChildPanel(type),
  getOpenChildPanelTypes: () => getOpenChildPanelTypes()
}

// Provide the API to descendant components (including FileControls)
provide('filePanelApi', filePanelApi)

onMounted(() => {
  // Component mounted
})

onUnmounted(() => {
  // Component unmounted
})

function onChildReady(event: { api: DockviewApi }) {
  childDockviewApi.value = event.api

  // Set up auto-save for this file's layout
  // Get the file ID from the parent panel's ID
  const fileId = props.params?.api?.id || 'unknown'

  childDockviewApi.value?.onDidLayoutChange(() => {
    saveChildLayoutToStorage(fileId)
  })

  // Try to load saved layout, otherwise create default
  const loaded = loadChildLayoutFromStorage(fileId)
  if (!loaded) {
    createDefaultChildLayout()
  }

  // Set up watchers for document changes
  setupDocumentWatchers()
}

// Set up watchers for document store changes
function setupDocumentWatchers() {
  // Watch for document changes to update panel titles
  watch(() => documentStore.documentName, () => {
    updatePanelContent()
  })

  // Watch for active view changes to update panel content
  watch(() => documentStore.activeView, (newView) => {
    console.log('Active view changed to:', newView)
    updatePanelContent()
  })

  // Watch for node count changes
  watch(() => documentStore.nodeCount, (newCount) => {
    console.log('Node count changed to:', newCount)
    updatePanelContent()
  })

  // Watch for drive store changes
  watch(() => driveStore.currentFile, (newFile) => {
    console.log('Current file changed:', newFile?.name || 'none')
    updatePanelContent()
  })
}

// Listen for document loaded events
onMounted(() => {
  window.addEventListener('store:document-loaded', handleDocumentLoaded)
})

onUnmounted(() => {
  window.removeEventListener('store:document-loaded', handleDocumentLoaded)
})

function handleDocumentLoaded() {
  console.log('Document loaded event received in FilePanel')
  // When a document is loaded, update the panel title with the document name
  if (props.params?.api && documentStore.documentName) {
    props.params.api.setTitle(`📄 ${documentStore.documentName}`)
  }
}

function createDefaultChildLayout() {
  if (!childDockviewApi.value) return

  // Create default 3-panel layout for this file
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

  const title = titleMap[type] || type

  childDockviewApi.value.addPanel({
    id: panelId,
    component: type,
    title: title
  })
}

function getOpenChildPanelTypes(): string[] {
  if (!childDockviewApi.value) return []

  const openTypes = new Set<string>()
  childDockviewApi.value?.panels.forEach((panel: { api: { component: string } }) => {
    const componentName = panel.api.component
    if (componentName) {
      openTypes.add(componentName)
    }
  })

  return Array.from(openTypes)
}

// Add a method to update panel content based on document changes
function updatePanelContent() {
  console.log('Updating panel content for document:', documentStore.documentName)

  // Update the file panel title to show the document name
  if (props.params?.api) {
    props.params.api.setTitle(`📄 ${documentStore.documentName}`)
  }

  // Log current document state
  console.log('Document state:', {
    nodes: documentStore.nodeCount,
    edges: documentStore.edges.length,
    activeView: documentStore.activeView
  })
}

function saveChildLayoutToStorage(fileId: string) {
  if (!childDockviewApi.value) return

  const layout = childDockviewApi.value.toJSON()
  localStorage.setItem(`dockview-file-${fileId}-layout`, JSON.stringify(layout))
}

function loadChildLayoutFromStorage(fileId: string): boolean {
  if (!childDockviewApi.value) return false

  const saved = localStorage.getItem(`dockview-file-${fileId}-layout`)
  if (!saved) {
    return false
  }

  try {
    const layout = JSON.parse(saved)
    childDockviewApi.value.fromJSON(layout)
    return true
  } catch (error) {
    console.error(`Failed to load child layout for file ${fileId}:`, error)
    return false
  }
}

// Expose methods to FileControls component
defineExpose({
  addChildPanel,
  getOpenChildPanelTypes
})
</script>

<style scoped lang="scss">
.file-panel {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #1e1e1e;
  position: relative;
}

.nested-dockview {
  width: 100%;
  height: 100%;
  position: relative;

  :deep(> div) {
    height: 100%;
    width: 100%;
  }

  // CRITICAL FIX: Fix positioning issue with popover anchor
  :deep(.dv-popover-anchor) {
    position: absolute !important;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    z-index: 1000;
    pointer-events: none;
  }

  :deep(.dv-grid-view) {
    position: absolute !important;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1;
  }
}
</style>
