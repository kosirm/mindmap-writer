<template>
  <div class="dockview-page">
    <div class="dockview-container">
      <DockviewVue
        :class="['parent-dockview', appStore.getDockviewThemeClass()]"
        data-dockview-level="parent"
        @ready="onReady"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
// import { useQuasar } from 'quasar' // Commented out - unused after removing toast notifications
import { DockviewVue } from 'dockview-vue'
import { type DockviewApi } from 'dockview-core'
import { useGoogleDriveStore } from 'src/core/stores/googleDriveStore'
import { useUnifiedDocumentStore } from 'src/core/stores/unifiedDocumentStore'
import { useAppStore } from 'src/core/stores/appStore'
import { eventBus, type FileSelectedPayload } from 'src/core/events'
import type { MindscribbleDocument } from 'src/core/types'
import type { DriveFileMetadata } from 'src/core/services/googleDriveService'
import { getFileContent } from 'src/core/services/fileSystemService'

// const $q = useQuasar() // Commented out - unused after removing toast notifications
const dockviewApi = ref<DockviewApi | null>(null)
const driveStore = useGoogleDriveStore()
const unifiedStore = useUnifiedDocumentStore()
const appStore = useAppStore()
let fileCounter = 0

// Theme is now applied via :class binding in template, no need for updateOptions

function onReady(event: { api: DockviewApi }) {
  dockviewApi.value = event.api

  // Theme is now applied via :class binding in template
  // console.log('🎨 [DockviewLayout] Parent dockview ready, theme applied via template binding')

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
  const now = Date.now()
  const newDocument: MindscribbleDocument = {
    version: '1.0',
    metadata: {
      id: `doc-${now}-${fileCounter}`,
      name: fileName,
      description: '',
      tags: [],
      created: now,
      modified: now,
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

  // Create document instance in unified store
  unifiedStore.createDocument(fileId, newDocument, null, null)

  // Add panel to dockview
  dockviewApi.value.addPanel({
    id: fileId,
    component: 'file-panel',
    title: fileName,
    tabComponent: 'file-tab'
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

  // Create document instance in unified store with Drive file metadata
  // Pass the document ID so FilePanel can use it for localStorage key
  unifiedStore.createDocument(fileId, document, driveFile, null)

  // Add panel to dockview
  dockviewApi.value.addPanel({
    id: fileId,
    component: 'file-panel',
    title: fileName,
    tabComponent: 'file-tab'
  })

  console.log(`✅ Opened file "${fileName}" in new panel ${fileId}`, document.dockviewLayout ? 'with saved layout' : 'without layout')
}

async function openFileFromVault(fileSystemItemId: string, fileName: string) {
  if (!dockviewApi.value) return

  try {
    // Load the document from IndexedDB
    const document = await getFileContent(fileSystemItemId)

    if (!document) {
      console.error(`Failed to load document for file ${fileSystemItemId}`)
      return
    }

    fileCounter++
    const fileId = `file-${fileCounter}`
    const documentId = document.dockviewLayoutId || document.metadata.id

    console.log('📂 Opening file from vault:', fileName)
    console.log('📂 Document ID:', documentId)

    // If document has a saved layout, save it to localStorage using document ID
    if (document.dockviewLayout) {
      const storageKey = `dockview-child-${documentId}-layout`
      localStorage.setItem(storageKey, JSON.stringify(document.dockviewLayout))
      console.log(`✅ Saved layout to localStorage: ${storageKey}`)
    }

    // Create document instance in unified store (no Drive metadata for vault files)
    unifiedStore.createDocument(fileId, document, null, null)

    // Add panel to dockview
    dockviewApi.value.addPanel({
      id: fileId,
      component: 'file-panel',
      title: fileName,
      tabComponent: 'file-tab'
    })

    console.log(`✅ Opened vault file "${fileName}" in new panel ${fileId}`)
  } catch (error) {
    console.error(`Failed to open vault file ${fileSystemItemId}:`, error)
  }
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

    // Update all file panel tabs to use custom tab component
    void nextTick(() => {
      updateFilePanelTabs()
    })

    return true
  } catch (error) {
    console.error('Failed to load parent layout:', error)
    return false
  }
}

/**
 * Update all file panel tabs to use custom tab component
 */
function updateFilePanelTabs() {
  if (!dockviewApi.value) return

  dockviewApi.value.panels.forEach(panel => {
    if (panel.id.startsWith('file-')) {
      // Get the document name from unified store
      const docInstance = unifiedStore.getDocumentInstance(panel.id)
      let cleanTitle = 'Untitled'

      if (docInstance) {
        // Use document name from the document metadata
        cleanTitle = docInstance.document.metadata.name || 'Untitled'
      } else {
        // Fallback: Remove emoji from current title if it exists
        const currentTitle = panel.api.title || 'Untitled'
        cleanTitle = currentTitle.replace('📄 ', '')
      }

      panel.api.setTitle(cleanTitle)
      panel.api.updateParameters({
        tabComponent: 'file-tab'
      })
    }
  })

  // console.log('✅ Updated all file panel tabs to use custom tab component')
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

  // Listen for vault file selection events
  eventBus.on('vault:file-selected', handleVaultFileSelected)

  // Log initial state
  console.log('Drive store state:', {
    hasOpenFile: driveStore.hasOpenFile,
    currentFile: driveStore.currentFile?.name || 'none'
  })
})

onUnmounted(() => {
  window.removeEventListener('store:document-loaded', handleDocumentLoaded)
  window.removeEventListener('beforeunload', clearParentLayoutOnUnload)
  window.removeEventListener('file:close', handleFileClose)

  // Remove vault event listener
  eventBus.off('vault:file-selected', handleVaultFileSelected)
})

// Handle file close events
function handleFileClose() {
  console.log('File close event received in DockviewLayout')
  closeCurrentFile()
}

// Handle vault file selection events
function handleVaultFileSelected(payload: FileSelectedPayload) {
  if (!payload.fileId || !payload.fileName) {
    console.log('No file selected or file deselected')
    return
  }

  console.log('Vault file selected:', payload.fileName, payload.fileId)
  void openFileFromVault(payload.fileId, payload.fileName)
}

function handleDocumentLoaded() {
  console.log('Document loaded event received in DockviewLayout')
  const activeDoc = unifiedStore.activeDocument
  console.log('Loaded document:', activeDoc?.metadata.name)

  // When a document is loaded, update the dockview layout if needed
  if (dockviewApi.value && activeDoc) {
    // Save the current layout state
    const layout = dockviewApi.value.toJSON()
    console.log('Current dockview layout:', layout)

    // Update panel titles to reflect the loaded document
    dockviewApi.value.panels.forEach(panel => {
      if (panel.id.startsWith('file-')) {
        panel.api.setTitle(activeDoc.metadata.name)
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
    background-color: var(--ms-drawer-bg) !important; // Use CSS variable for brand color consistency
    height: 38px !important; // Reduced height
    min-height: 38px !important;
  }

  // Common styles for all file tabs
  .dv-tab {
    border: none !important;
    border-left: none !important; // Remove left border separator
    outline: none !important;
    box-shadow: none !important;
    height: 32px !important;
    margin: 2px 2px 0 2px !important;

    // Remove border from first tab
    &:first-child {
      border-left: none !important;
    }

    // Remove focus styles
    &:focus,
    &:focus-visible {
      outline: none !important;
      box-shadow: none !important;
      border: none !important;
      border-left: none !important;
    }

    // Remove pseudo-element borders/focus indicators
    &::before,
    &::after {
      display: none !important;
      border: none !important;
      outline: none !important;
      box-shadow: none !important;
      background: none !important;
    }
  }

  // Remove tab dividers (separators between tabs) - make them invisible
  .dv-tab-divider {
    display: none !important;
  }

  // Separators/sashes between file panels - match nested dockview style
  .dv-separator {
    background-color: #e0e0e0 !important;
  }

  .dv-sash {
    background-color: #e0e0e0 !important;
  }

  .dv-split-view-container {
    .dv-separator {
      background-color: #e0e0e0 !important;
    }

    .dv-sash {
      background-color: #e0e0e0 !important;
    }
  }

  // INACTIVE FILE TAB - use CSS variable for brand color consistency
  .dv-inactive-tab {
    background-color: var(--ms-drawer-bg) !important;
    color: rgba(255, 255, 255, 0.5) !important;

    &:hover {
      background-color: var(--ms-drawer-bg) !important;
      color: rgba(255, 255, 255, 0.9) !important;
    }
  }

  // ACTIVE FILE TAB - use CSS variable for brand color consistency
  .dv-active-tab {
    background-color: var(--ms-drawer-bg) !important;
    color: white !important;

    &:hover {
      background-color: var(--ms-drawer-bg) !important;
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

// Parent dockview - DARK MODE
:deep(.body--dark [data-dockview-level="parent"]) {
  // Separators/sashes between file panels - match nested dockview dark mode style
  .dv-separator {
    background-color: #3e3e42 !important;
  }

  .dv-sash {
    background-color: #3e3e42 !important;
  }

  .dv-split-view-container {
    .dv-separator {
      background-color: #3e3e42 !important;
    }

    .dv-sash {
      background-color: #3e3e42 !important;
    }
  }

  // Keep the same tab colors for dark mode to match the brand color consistency
  // The tabs should use the CSS variable which changes based on light/dark mode
  .dv-inactive-tab {
    background-color: var(--ms-drawer-bg) !important;
    color: rgba(255, 255, 255, 0.7) !important;

    &:hover {
      background-color: var(--ms-drawer-bg) !important;
      color: rgba(255, 255, 255, 0.9) !important;
    }
  }

  // ACTIVE TAB - slightly lighter for contrast
  .dv-active-tab {
    background-color: var(--ms-drawer-bg) !important;
    color: white !important;
    filter: brightness(1.2) !important; // Make active tab slightly brighter

    &:hover {
      background-color: var(--ms-drawer-bg) !important;
      filter: brightness(1.2) !important;
    }
  }

  // Action buttons in tab bar - dark mode
  .dv-left-actions-container,
  .dv-right-actions-container {
    color: rgba(255, 255, 255, 0.9) !important;

    button {
      color: rgba(255, 255, 255, 0.7) !important;

      &:hover {
        color: white !important;
        background-color: rgba(255, 255, 255, 0.1) !important;
      }
    }
  }
}

// Nested dockview - LIGHT MODE (default)
:deep([data-dockview-level="nested"]) {
  .dv-tabs-and-actions-container {
    background-color: #f3f3f3 !important;
    height: auto !important;
    min-height: auto !important;
  }

  .dv-tab {
    border-top-right-radius: 5px !important;
    border-top-left-radius: 5px !important;
    border: none !important;
    border-left: none !important; // Remove left border separator
    outline: none !important;
    box-shadow: none !important;
    height: auto !important;
    margin: 0 !important;
    // border-radius: 0 !important;

    // Remove focus styles
    &:focus,
    &:focus-visible {
      outline: none !important;
      box-shadow: none !important;
      border: none !important;
      border-left: none !important;
    }

    // Remove pseudo-element borders/focus indicators
    &::before,
    &::after {
      display: none !important;
      border: none !important;
      outline: none !important;
      box-shadow: none !important;
      background: none !important;
    }
  }

  // Separators/sashes between panels (light mode)
  .dv-separator {
    background-color: #e0e0e0 !important;
  }

  .dv-sash {
    background-color: #e0e0e0 !important;
  }

  .dv-split-view-container {
    .dv-separator {
      background-color: #e0e0e0 !important;
    }

    .dv-sash {
      background-color: #e0e0e0 !important;
    }
  }

  // Remove tab dividers (separators between tabs) - make them invisible
  .dv-tab-divider {
    display: none !important;
  }

  // Light mode tab colors
  .dv-inactive-tab {
    background-color: #ececec !important;
    color: #1d1d1d !important;

    &:hover {
      background-color: rgba(0, 0, 0, 0.1) !important;
      color: #1d1d1d !important;
    }
  }

  .dv-active-tab {
    background-color: #ffffff !important;
    color: #1d1d1d !important;

    &:hover {
      background-color: #ffffff !important;
      color: #1d1d1d !important;
    }
  }

  .dv-default-tab-content {
    color: inherit !important;
  }

  .dv-default-tab-action {
    color: inherit !important;
    opacity: 0.7;

    &:hover {
      opacity: 1;
    }
  }

  .dv-left-actions-container,
  .dv-right-actions-container {
    color: #1d1d1d !important;

    button {
      color: #1d1d1d !important;
      opacity: 0.7;

      &:hover {
        opacity: 1;
        background-color: rgba(0, 0, 0, 0.1) !important;
      }
    }
  }
}

// Nested dockview - DARK MODE
:deep(.body--dark [data-dockview-level="nested"]) {
  .dv-tabs-and-actions-container {
    background-color: #252526 !important;
  }

  .dv-tab {
    border-top-right-radius: 5px !important;
    border-top-left-radius: 5px !important;
    border: none !important;
    border-left: none !important; // Remove left border separator
    outline: none !important;
    box-shadow: none !important;

    // Remove focus styles
    &:focus,
    &:focus-visible {
      outline: none !important;
      box-shadow: none !important;
      border: none !important;
      border-left: none !important;
    }

    // Remove pseudo-element borders/focus indicators
    &::before,
    &::after {
      display: none !important;
      border: none !important;
      outline: none !important;
      box-shadow: none !important;
      background: none !important;
    }
  }

  // Remove tab dividers (separators between tabs) - make them invisible
  .dv-tab-divider {
    display: none !important;
  }

  // Dark mode tab colors
  .dv-inactive-tab {
    background-color: #2d2d30 !important;
    color: rgba(255, 255, 255, 0.7) !important;

    &:hover {
      background-color: #3e3e42 !important;
      color: rgba(255, 255, 255, 0.9) !important;
    }
  }

  .dv-active-tab {
    background-color: #1e1e1e !important;
    color: #ffffff !important;

    &:hover {
      background-color: #1e1e1e !important;
      color: #ffffff !important;
    }
  }

  .dv-left-actions-container,
  .dv-right-actions-container {
    color: rgba(255, 255, 255, 0.9) !important;

    button {
      color: rgba(255, 255, 255, 0.7) !important;

      &:hover {
        color: rgba(255, 255, 255, 0.9) !important;
        background-color: rgba(255, 255, 255, 0.1) !important;
      }
    }
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

<style lang="scss">
// Global styles for nested dockview dark mode (must be unscoped to work with .body--dark)
.body--dark [data-dockview-level="nested"] {
  .dv-tabs-and-actions-container {
    background-color: #252526 !important;
  }

  .dv-tab {
    border: none !important;
    border-left: none !important; // Remove left border separator
    outline: none !important;
    box-shadow: none !important;

    // Remove focus styles
    &:focus,
    &:focus-visible {
      outline: none !important;
      box-shadow: none !important;
      border: none !important;
      border-left: none !important;
    }

    // Remove pseudo-element borders/focus indicators
    &::before,
    &::after {
      display: none !important;
      border: none !important;
      outline: none !important;
      box-shadow: none !important;
      background: none !important;
    }
  }

  // Remove tab dividers (separators between tabs) - make them invisible
  .dv-tab-divider {
    display: none !important;
  }

  // Separators/sashes between panels (dark mode)
  .dv-separator {
    background-color: #3e3e42 !important;
  }

  .dv-sash {
    background-color: #3e3e42 !important;
  }

  .dv-split-view-container {
    .dv-separator {
      background-color: #3e3e42 !important;
    }

    .dv-sash {
      background-color: #3e3e42 !important;
    }
  }

  // Dark mode tab colors
  .dv-inactive-tab {
    background-color: #2d2d30 !important;
    color: rgba(255, 255, 255, 0.7) !important;

    &:hover {
      background-color: #3e3e42 !important;
      color: rgba(255, 255, 255, 0.9) !important;
    }
  }

  .dv-active-tab {
    background-color: #1e1e1e !important;
    color: #ffffff !important;

    &:hover {
      background-color: #1e1e1e !important;
      color: #ffffff !important;
    }
  }

  .dv-left-actions-container,
  .dv-right-actions-container {
    color: rgba(255, 255, 255, 0.9) !important;

    button {
      color: rgba(255, 255, 255, 0.7) !important;

      &:hover {
        color: rgba(255, 255, 255, 0.9) !important;
        background-color: rgba(255, 255, 255, 0.1) !important;
      }
    }
  }
}

// Global styles for parent dockview dark mode (must be unscoped to work with .body--dark)
.body--dark [data-dockview-level="parent"] {
  // Separators/sashes between file panels - match nested dockview dark mode style
  .dv-separator {
    background-color: #3e3e42 !important;
  }

  .dv-sash {
    background-color: #3e3e42 !important;
  }

  .dv-split-view-container {
    .dv-separator {
      background-color: #3e3e42 !important;
    }

    .dv-sash {
      background-color: #3e3e42 !important;
    }
  }
}

// Remove all global dark mode tab styling to prevent it from affecting nested dockviews
// Nested dockviews should use their original dark mode styling from lines 672-744
</style>
