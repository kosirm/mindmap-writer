<template>
  <div class="dockview-page">
    <div class="dockview-container">
      <DockviewVue
        class="dockview-theme-abyss parent-dockview"
        data-dockview-level="parent"
        @ready="onReady"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
// import { useQuasar } from 'quasar' // Commented out - unused after removing toast notifications
import { DockviewVue } from 'dockview-vue'
import { type DockviewApi } from 'dockview-core'
import { useDocumentStore } from 'src/core/stores/documentStore'
import { useGoogleDriveStore } from 'src/core/stores/googleDriveStore'
import { useMultiDocumentStore } from 'src/core/stores/multiDocumentStore'
import type { MindscribbleDocument } from 'src/core/types'
import type { DriveFileMetadata } from 'src/core/services/googleDriveService'

// const $q = useQuasar() // Commented out - unused after removing toast notifications
const dockviewApi = ref<DockviewApi | null>(null)
const documentStore = useDocumentStore()
const driveStore = useGoogleDriveStore()
const multiDocStore = useMultiDocumentStore()
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

function createDefaultLayout() {
  if (!dockviewApi.value) return

  // Add initial file panel
  addFile()
}

function addFile() {
  if (!dockviewApi.value) return

  fileCounter++
  const fileId = `file-${fileCounter}`
  const fileName = `Untitled ${fileCounter}`

  // Create a new empty document
  const newDocument: MindscribbleDocument = {
    version: '1.0',
    metadata: {
      id: `doc-${Date.now()}-${fileCounter}`,
      name: fileName,
      description: '',
      tags: [],
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      searchableText: '',
      nodeCount: 0,
      edgeCount: 0,
      maxDepth: 0
    },
    nodes: [],
    edges: [],
    interMapLinks: [],
    layout: {
      activeView: 'mindmap',
      orientationMode: 'anticlockwise',
      lodEnabled: true,
      lodThresholds: [10, 30, 50, 70, 90],
      horizontalSpacing: 50,
      verticalSpacing: 20
    }
  }

  // Create document instance in multi-document store
  multiDocStore.createDocument(fileId, newDocument, null, null)

  // Add panel to dockview
  dockviewApi.value.addPanel({
    id: fileId,
    component: 'file-panel',
    title: `📄 ${fileName}`
  })

// Toast message commented out - can be re-enabled in settings later
  /* $q.notify({
    type: 'positive',
    message: `${fileName} created`,
    timeout: 1000
  }) */
}

function openFileFromDrive(document: MindscribbleDocument, driveFile: DriveFileMetadata) {
  if (!dockviewApi.value) return

  fileCounter++
  const fileId = `file-${fileCounter}`
  const fileName = document.metadata.name || driveFile.name.replace('.mindscribble', '')
  const documentId = document.dockviewLayoutId || document.metadata.id

  console.log('📂 Opening file from Drive:', fileName)
  console.log('📂 Document ID:', documentId)
  console.log('📂 Document has dockviewLayout?', !!document.dockviewLayout)

  // If document has a saved layout, save it to localStorage using document ID
  if (document.dockviewLayout) {
    const storageKey = `dockview-child-${documentId}-layout`
    localStorage.setItem(storageKey, JSON.stringify(document.dockviewLayout))
    console.log(`✅ Saved layout to localStorage: ${storageKey}`)
  }

  // Create document instance in multi-document store with Drive file metadata
  // Pass the document ID so FilePanel can use it for localStorage key
  multiDocStore.createDocument(fileId, document, driveFile, null)

  // Add panel to dockview
  dockviewApi.value.addPanel({
    id: fileId,
    component: 'file-panel',
    title: `📄 ${fileName}`
  })

  console.log(`✅ Opened file "${fileName}" in new panel ${fileId}`, document.dockviewLayout ? 'with saved layout' : 'without layout')
}

function saveParentLayoutToStorage() {
  if (!dockviewApi.value) return

  const layout = dockviewApi.value.toJSON()
  localStorage.setItem('dockview-parent-layout', JSON.stringify(layout))
}

function loadParentLayoutFromStorage(): boolean {
  if (!dockviewApi.value) return false

  const saved = localStorage.getItem('dockview-parent-layout')
  if (!saved) {
    return false
  }

  try {
    const layout = JSON.parse(saved)
    dockviewApi.value.fromJSON(layout)

    // Update fileCounter to avoid duplicate IDs
    let maxFileNum = 0
    dockviewApi.value?.panels.forEach((panel: { id: string }) => {
      const match = panel.id.match(/^file-(\d+)$/)
      if (match && match[1]) {
        const num = parseInt(match[1], 10)
        if (num > maxFileNum) {
          maxFileNum = num
        }
      }
    })
    fileCounter = maxFileNum

    return true
  } catch (error) {
    console.error('Failed to load parent layout:', error)
    return false
  }
}

// Expose functions to parent component (MainLayout)
defineExpose({
  addFile,
  openFileFromDrive,
  closeCurrentFile
})

function closeCurrentFile() {
  if (!dockviewApi.value) return

// Get the active panel
  const activePanel = dockviewApi.value.activePanel
  if (!activePanel) {
    // Toast message commented out - can be re-enabled in settings later
    /* $q.notify({
      type: 'warning',
      message: 'No active file to close',
      timeout: 1500
    }) */
    return
  }

// Check if it's a file panel (starts with 'file-')
  if (!activePanel.id.startsWith('file-')) {
    // Toast message commented out - can be re-enabled in settings later
    /* $q.notify({
      type: 'warning',
      message: 'Can only close file tabs',
      timeout: 1500
    }) */
    return
  }

  // Close the panel
  activePanel.api.close()

  // Toast message commented out - can be re-enabled in settings later
  /* $q.notify({
    type: 'positive',
    message: 'File closed',
    timeout: 1000
  }) */
}

// Clear parent layout and all child layouts on page unload
function clearParentLayoutOnUnload() {
  // Clear parent layout
  localStorage.removeItem('dockview-parent-layout')

  // Clear all child layouts (they start with 'dockview-child-')
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('dockview-child-')) {
      keysToRemove.push(key)
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key))

  console.log('✅ Cleared parent layout and', keysToRemove.length, 'child layouts from localStorage on page unload')
}

// Listen for document loaded events
onMounted(() => {
  window.addEventListener('store:document-loaded', handleDocumentLoaded)
  window.addEventListener('beforeunload', clearParentLayoutOnUnload)
  window.addEventListener('file:close', handleFileClose)

  // Log initial state
  console.log('DockviewLayout mounted. Current document:', documentStore.documentName)
  console.log('Drive store state:', {
    hasOpenFile: driveStore.hasOpenFile,
    currentFile: driveStore.currentFile?.name || 'none'
  })
})

onUnmounted(() => {
  window.removeEventListener('store:document-loaded', handleDocumentLoaded)
  window.removeEventListener('beforeunload', clearParentLayoutOnUnload)
  window.removeEventListener('file:close', handleFileClose)
})

// Handle file close events
function handleFileClose() {
  console.log('File close event received in DockviewLayout')
  closeCurrentFile()
}

function handleDocumentLoaded() {
  console.log('Document loaded event received in DockviewLayout')
  console.log('Loaded document:', documentStore.documentName)

  // When a document is loaded, update the dockview layout if needed
  if (dockviewApi.value) {
    // Save the current layout state
    const layout = dockviewApi.value.toJSON()
    console.log('Current dockview layout:', layout)

    // Update panel titles to reflect the loaded document
    dockviewApi.value.panels.forEach(panel => {
      if (panel.id.startsWith('file-')) {
        panel.api.setTitle(`📄 ${documentStore.documentName}`)
      }
    })
  }
}
</script>

<style scoped lang="scss">
.dockview-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding: 0;
  margin: 0;
}

.dockview-container {
  flex: 1;
  min-height: 0;
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

// Style ONLY file tabs (parent dockview), NOT view tabs (nested dockview)
// Use data attribute to distinguish parent from nested dockviews
:deep([data-dockview-level="parent"]) {
  .dv-tabs-and-actions-container {
    background-color: #1976d2 !important; // Match Quasar primary color
    height: 32px !important; // Reduced height
    min-height: 32px !important;
  }

  // Common styles for all file tabs
  .dv-tab {
    border: none !important;
    height: 28px !important;
    margin: 2px 2px 0 2px !important;
    border-radius: 4px 4px 0 0 !important;
  }

  // INACTIVE FILE TAB - customize colors here
  .dv-inactive-tab {
    background-color: rgba(255, 255, 255, 0) !important;
    border-left-color: rgba(255, 255, 255, 0) !important;
    color: rgba(255, 255, 255, 0.5) !important;

    &:hover {
      background-color: rgba(255, 255, 255, 0.15) !important;
      color: rgba(255, 255, 255, 0.9) !important;
    }
  }

  // ACTIVE FILE TAB - customize colors here
  .dv-active-tab {
    background-color: #1976d2 !important;
    color: white !important;

    &:hover {
      background-color: #1976d2 !important;
    }
  }

  .dv-default-tab-content {
    color: inherit !important;
    font-size: 13px !important;
  }

  .dv-default-tab-action {
    color: inherit !important;
    opacity: 0.7;

    &:hover {
      opacity: 1;
    }
  }

  // Style action buttons in tab bar
  .dv-left-actions-container,
  .dv-right-actions-container {
    color: white !important;

    button {
      color: rgba(255, 255, 255, 0.7) !important;

      &:hover {
        color: white !important;
        background-color: rgba(255, 255, 255, 0.1) !important;
      }
    }
  }
}

// Ensure nested dockview tabs are NOT styled
:deep([data-dockview-level="nested"]) {
  .dv-tabs-and-actions-container {
    background-color: var(--dv-tabs-and-actions-container-background-color) !important;
    color: rgb(255, 255, 255,.7);
    height: auto !important;
    min-height: auto !important;
  }

  .dv-tab {
    background-color: var(--dv-tabs-container-background-color) !important;
    color: var(--dv-tabs-container-color) !important;
    border: var(--dv-separator-border) !important;
    height: auto !important;
    margin: 0 !important;
    border-radius: 0 !important;
  }

  .dv-inactive-tab,
  .dv-active-tab {
    // Let dockview theme handle these
    background-color: var(--dv-tabs-container-background-color) !important;
    color: unset !important;
    color: rgb(255, 255, 255, 1) !important;
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
