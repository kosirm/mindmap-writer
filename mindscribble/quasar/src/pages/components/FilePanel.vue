<template>
  <div class="file-panel">
    <DockviewVue
      class="nested-dockview"
      data-dockview-level="nested"
      :right-header-actions-component="'group-controls'"
      :left-header-actions-component="'file-controls'"
      @ready="onChildReady"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted, provide, watch } from 'vue'
import { DockviewVue } from 'dockview-vue'
import { type IDockviewPanelProps, type DockviewApi } from 'dockview-core'
import { useDocumentStore } from 'src/core/stores/documentStore'
import { useGoogleDriveStore } from 'src/core/stores/googleDriveStore'
import { useMultiDocumentStore } from 'src/core/stores/multiDocumentStore'
import { useAppStore } from 'src/core/stores/appStore'

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
const appStore = useAppStore()

// Watch for dark mode changes and update dockview theme using updateOptions API
watch(() => appStore.isDarkMode, (isDark) => {
  console.log('🎨 [FilePanel] Dark mode changed to:', isDark)

  // Use dockview API to update theme
  if (childDockviewApi.value) {
    const themeClass = isDark ? 'dockview-theme-abyss' : 'dockview-theme-light'
    childDockviewApi.value.updateOptions({ className: themeClass })
    console.log('🎨 [FilePanel] Updated nested dockview theme to:', themeClass)
  } else {
    console.error('🎨 [FilePanel] childDockviewApi.value is null')
  }
})

// Get file panel ID
const filePanelId = ref<string>('')

// Flag to prevent saving during layout restoration (currently unused - layout save/restore disabled)
// const isRestoringLayout = ref<boolean>(false)

// Shield overlay state - show during dockview panel drag to prevent interference from child components
// This will be provided to child view panels (WriterPanel, MindmapPanel, OutlinePanel)
const isDraggingPanel = ref(false)

// Create the API object that will be provided to child components
const filePanelApi = {
  addChildPanel: (type: string) => addChildPanel(type),
  getOpenChildPanelTypes: () => getOpenChildPanelTypes()
}

// Provide the API to descendant components (including FileControls)
provide('filePanelApi', filePanelApi)

// Provide the drag state to child view panels so they can show shields
provide('isDraggingPanel', isDraggingPanel)

// Global mouseup listener to ensure shield is always removed (safety fallback)
function onGlobalMouseUp() {
  if (isDraggingPanel.value) {
    console.log('🛡️ Global mouseup - hiding shield (fallback)')
    isDraggingPanel.value = false
  }
}

onMounted(() => {
  // Add global mouseup listener as fallback
  document.addEventListener('mouseup', onGlobalMouseUp)
})

onUnmounted(() => {
  // Remove global mouseup listener
  document.removeEventListener('mouseup', onGlobalMouseUp)
})

onUnmounted(() => {
  // Component unmounted
})

function onChildReady(event: { api: DockviewApi }) {
  childDockviewApi.value = event.api

  // CRITICAL: Set theme immediately on initialization
  const initialThemeClass = appStore.getDockviewThemeClass()
  console.log('🎨 [FilePanel] Setting initial nested dockview theme to:', initialThemeClass)

  // Try multiple approaches to ensure theme is set
  // 1. Set immediately
  childDockviewApi.value.updateOptions({ className: initialThemeClass })

  // 2. Set in nextTick to ensure DOM is ready
  void nextTick(() => {
    childDockviewApi.value?.updateOptions({ className: initialThemeClass })
    console.log('🎨 [FilePanel] Theme set in nextTick')
  })

  // 3. Set with a small delay as fallback
  setTimeout(() => {
    childDockviewApi.value?.updateOptions({ className: initialThemeClass })
    console.log('🎨 [FilePanel] Theme set in setTimeout')
  }, 0)

  // Get the file panel ID from the parent panel's ID
  filePanelId.value = props.params?.api?.id || 'unknown'

  // Set active file panel in multi-document store
  multiDocStore.setActiveFilePanel(filePanelId.value)

  // Load document for this file panel
  loadDocumentForPanel()

  // Get the document ID for localStorage key
  const docInstance = multiDocStore.getDocument(filePanelId.value)
  const documentId = docInstance?.document.dockviewLayoutId || docInstance?.document.metadata.id || filePanelId.value
  console.log('📂 FilePanel ready - File Panel ID:', filePanelId.value, 'Document ID:', documentId)

  // Try to load saved layout, otherwise create default
  const layoutLoaded = loadChildLayoutFromStorage(documentId)
  if (!layoutLoaded) {
    console.log('📂 No saved layout found, creating default layout')
    createDefaultChildLayout()
  }

  // Shield overlay: Show during panel drag to prevent interference from child components
  childDockviewApi.value?.onWillDragPanel(() => {
    console.log('🛡️ Panel drag started - showing shield')
    isDraggingPanel.value = true
  })

  // Hide shield on drop
  childDockviewApi.value?.onDidDrop(() => {
    console.log('🛡️ Panel dropped - hiding shield (onDidDrop)')
    isDraggingPanel.value = false
  })

  // Monitor dockview layout changes
  childDockviewApi.value?.onDidLayoutChange(() => {
    // Hide shield when layout changes (panel was moved)
    if (isDraggingPanel.value) {
      console.log('🛡️ Layout changed - hiding shield (onDidLayoutChange)')
      isDraggingPanel.value = false
    }

    // Auto-save layout to localStorage when it changes
    const docInstance = multiDocStore.getDocument(filePanelId.value)
    if (docInstance) {
      const documentId = docInstance.document.dockviewLayoutId || docInstance.document.metadata.id
      saveChildLayoutToStorage(documentId)
    }

    const width = childDockviewApi.value?.width || 0
    const height = childDockviewApi.value?.height || 0
    const layout = childDockviewApi.value?.toJSON()
    console.log('🔍 Dockview layout changed! Size:', width, 'x', height)
    console.log('🔍 Layout structure:', JSON.stringify(layout, null, 2))
  })

  // DEBUGGING: Add global function to dump layout
  interface WindowWithDebug extends Window {
    dumpLayout?: () => unknown
  }
  ;(window as WindowWithDebug).dumpLayout = () => {
    if (childDockviewApi.value) {
      const layout = childDockviewApi.value.toJSON()
      console.log('📊 LAYOUT DUMP:', JSON.stringify(layout, null, 2))
      return layout
    }
    return null
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

  console.log('🔧 Creating default child layout...')

  // Create default 3-panel layout: Outline | Mindmap | Writer (left to right)
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

  console.log('✅ Default child layout created')
  console.log('📊 Current layout:', childDockviewApi.value.toJSON())
}

function addChildPanel(type: string) {
  if (!childDockviewApi.value) return

  childPanelCounter++
  const panelId = `${type}-${Date.now()}-${childPanelCounter}`

  const titleMap: Record<string, string> = {
    'mindmap-panel': 'Mind Map',
    'writer-panel': 'Writer',
    'outline-panel': 'Outline',
    'concept-map-panel': 'Concept Map'
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
 * Save child dockview layout to localStorage
 * This is called when the layout changes (panels moved, resized, etc.)
 */
function saveChildLayoutToStorage(documentId: string) {
  if (!childDockviewApi.value) return

  const layout = childDockviewApi.value.toJSON()

  // Don't save layouts with 0x0 dimensions
  if (layout.grid && (layout.grid.width === 0 || layout.grid.height === 0)) {
    console.warn('⚠️ Skipping save - layout has 0x0 dimensions:', layout.grid.width, 'x', layout.grid.height)
    return
  }

  const storageKey = `dockview-child-${documentId}-layout`
  localStorage.setItem(storageKey, JSON.stringify(layout))
  console.log(`💾 Saved child layout to localStorage: ${storageKey} (${layout.grid.width}x${layout.grid.height})`)
}

/**
 * Load child dockview layout from localStorage
 * This is called when opening a file to restore the saved panel arrangement
 */
function loadChildLayoutFromStorage(documentId: string): boolean {
  if (!childDockviewApi.value) return false

  const storageKey = `dockview-child-${documentId}-layout`
  const saved = localStorage.getItem(storageKey)
  if (!saved) {
    console.log(`📂 No saved layout found in localStorage: ${storageKey}`)
    return false
  }

  try {
    const layout = JSON.parse(saved)
    console.log(`📂 Layout to restore (original):`, layout)

    // Remove width/height from grid to let dockview calculate sizes dynamically
    // This prevents issues when restoring layouts in different window sizes
    if (layout.grid) {
      delete layout.grid.width
      delete layout.grid.height
      console.log(`📂 Layout to restore (cleaned):`, layout)
    }

    childDockviewApi.value.fromJSON(layout)
    console.log(`✅ Loaded child layout from localStorage: ${storageKey}`)
    return true
  } catch (error) {
    console.error(`❌ Failed to load child layout for document ${documentId}:`, error)
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
