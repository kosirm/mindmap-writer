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
import { useMultiDocumentStore } from 'src/core/stores/multiDocumentStore'

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
const multiDocStore = useMultiDocumentStore()

// Get file panel ID
const filePanelId = ref<string>('')

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

  // Get the file panel ID from the parent panel's ID
  filePanelId.value = props.params?.api?.id || 'unknown'

  // Set active file panel in multi-document store
  multiDocStore.setActiveFilePanel(filePanelId.value)

  // Load document for this file panel
  loadDocumentForPanel()

  // Set up auto-save for this file's layout
  childDockviewApi.value?.onDidLayoutChange(() => {
    saveChildLayoutToMultiDocStore()
  })

  // Try to load saved layout from multi-doc store, then localStorage, otherwise create default
  const loaded = loadChildLayoutFromMultiDocStore() || loadChildLayoutFromStorage(filePanelId.value)
  if (!loaded) {
    createDefaultChildLayout()
  }

  // Set up watchers for document changes
  setupDocumentWatchers()

  // Listen for panel activation to switch active document
  props.params?.api?.onDidActiveChange(() => {
    if (props.params?.api?.isActive) {
      multiDocStore.setActiveFilePanel(filePanelId.value)
      loadDocumentForPanel()
    }
  })
}

// Set up watchers for document store changes
function setupDocumentWatchers() {
  // Watch for changes to THIS file panel's document in the multi-doc store
  watch(() => {
    const docInstance = multiDocStore.getDocument(filePanelId.value)
    return docInstance?.document.metadata.name
  }, (newName) => {
    if (newName && props.params?.api) {
      props.params.api.setTitle(`📄 ${newName}`)
    }
  })

  // Watch for active view changes to update panel content
  watch(() => documentStore.activeView, (newView) => {
    console.log('Active view changed to:', newView)
  })

  // Watch for node count changes
  watch(() => documentStore.nodeCount, (newCount) => {
    console.log('Node count changed to:', newCount)
  })
}



function createDefaultChildLayout() {
  if (!childDockviewApi.value) return

  // Create default 3-panel layout: Outline (20%) | Mindmap (40%) | Writer (40%)
  const outlinePanel = childDockviewApi.value.addPanel({
    id: `outline-${Date.now()}`,
    component: 'outline-panel',
    title: 'Outline'
  })

  const mindmapPanel = childDockviewApi.value.addPanel({
    id: `mindmap-${Date.now()}`,
    component: 'mindmap-panel',
    title: 'Mind Map',
    position: { referencePanel: outlinePanel, direction: 'right' }
  })

  childDockviewApi.value.addPanel({
    id: `writer-${Date.now()}`,
    component: 'writer-panel',
    title: 'Writer',
    position: { referencePanel: mindmapPanel, direction: 'right' }
  })

  // Set sizes after panels are created
  setTimeout(() => {
    if (childDockviewApi.value) {
      const containerWidth = childDockviewApi.value.width
      console.log('Container width:', containerWidth)

      const outlineWidth = Math.floor(containerWidth * 0.2)
      const mindmapWidth = Math.floor(containerWidth * 0.4)

      console.log('Setting outline width to:', outlineWidth)
      console.log('Setting mindmap width to:', mindmapWidth)

      outlinePanel.api.setSize({ width: outlineWidth })
      mindmapPanel.api.setSize({ width: mindmapWidth })
      // Writer panel will automatically take the remaining space
    }
  }, 100)
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



/**
 * Load document from multi-document store into the main documentStore
 */
function loadDocumentForPanel() {
  const docInstance = multiDocStore.getDocument(filePanelId.value)
  if (docInstance) {
    // Load document into the main document store
    documentStore.fromDocument(docInstance.document, 'store')

    // Update drive store if this document has a drive file
    if (docInstance.driveFile) {
      driveStore.setCurrentFile(docInstance.driveFile)
    } else {
      driveStore.clearCurrentFile()
    }
  }
}

/**
 * Save child dockview layout to multi-document store
 */
function saveChildLayoutToMultiDocStore() {
  if (!childDockviewApi.value) return

  const layout = childDockviewApi.value.toJSON()
  multiDocStore.updateChildLayout(filePanelId.value, layout)
}

/**
 * Load child dockview layout from multi-document store
 */
function loadChildLayoutFromMultiDocStore(): boolean {
  if (!childDockviewApi.value) return false

  const docInstance = multiDocStore.getDocument(filePanelId.value)
  if (!docInstance || !docInstance.childLayoutState) {
    return false
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    childDockviewApi.value.fromJSON(docInstance.childLayoutState as any)
    return true
  } catch (error) {
    console.error(`Failed to load child layout from multi-doc store:`, error)
    return false
  }
}

/**
 * Load child layout from localStorage (fallback/legacy)
 */
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
