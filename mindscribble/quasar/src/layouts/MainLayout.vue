<template>
  <q-layout view="hHh lpR fFf">
    <!-- Header -->
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <!-- Left drawer toggle -->
        <q-btn
          flat
          dense
          round
          icon="widgets"
          aria-label="Tools"
          @click="appStore.toggleLeftDrawer"
        />

        <!-- LEFT SECTION: Document title + Save status -->
        <div class="toolbar-left q-ml-md">
          <span class="document-title">{{ documentStore.documentName }}</span>
          <span class="save-status q-ml-sm">
            <template v-if="driveStore.syncStatus === 'saving'">
              <q-spinner-dots size="14px" color="white" class="q-mr-xs" />
              Saving...
            </template>
            <template v-else-if="driveStore.syncStatus === 'synced'">
              <q-icon name="cloud_done" size="14px" class="q-mr-xs" />
              Saved
            </template>
            <template v-else-if="driveStore.syncStatus === 'error'">
              <q-icon name="cloud_off" size="14px" class="q-mr-xs" />
              Save failed
            </template>
            <template v-else-if="documentStore.isDirty && driveStore.hasOpenFile">
              <q-icon name="fiber_manual_record" size="8px" class="q-mr-xs" />
              Unsaved
            </template>
          </span>
        </div>

        <!-- CENTER SECTION: Panel Manager -->
        <q-space />
        <PanelManager />
        <q-space />

        <!-- RIGHT SECTION: Theme + User + Right drawer -->
        <div class="toolbar-right q-mr-md">
          <!-- Dark mode toggle -->
          <q-btn
            flat
            dense
            round
            :icon="appStore.isDarkMode ? 'light_mode' : 'dark_mode'"
            :aria-label="appStore.isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'"
            @click="appStore.toggleDarkMode"
          >
            <q-tooltip>{{ appStore.isDarkMode ? 'Light mode' : 'Dark mode' }}</q-tooltip>
          </q-btn>

          <!-- User authentication -->
          <q-btn
            v-if="!authStore.isSignedIn"
            flat
            dense
            round
            icon="login"
            aria-label="Sign in with Google"
            :loading="authStore.isLoading"
            @click="handleSignIn"
          >
            <q-tooltip>Sign in with Google</q-tooltip>
          </q-btn>

          <q-btn
            v-else
            flat
            dense
            round
            aria-label="User menu"
          >
            <q-avatar size="28px">
              <img v-if="authStore.user?.imageUrl" :src="authStore.user.imageUrl" />
              <q-icon v-else name="account_circle" />
            </q-avatar>
            <q-menu>
              <q-list style="min-width: 200px">
                <q-item>
                  <q-item-section avatar>
                    <q-avatar>
                      <img v-if="authStore.user?.imageUrl" :src="authStore.user.imageUrl" />
                      <q-icon v-else name="account_circle" size="40px" />
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ authStore.user?.name }}</q-item-label>
                    <q-item-label caption>{{ authStore.user?.email }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-separator />
                <q-item clickable v-close-popup @click="handleSignOut">
                  <q-item-section avatar>
                    <q-icon name="logout" />
                  </q-item-section>
                  <q-item-section>Sign out</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
        </div>

        <!-- Right drawer toggle -->
        <q-btn
          flat
          dense
          round
          icon="smart_toy"
          aria-label="AI Assistant"
          @click="appStore.toggleRightDrawer"
        />
      </q-toolbar>
    </q-header>

    <!-- Left Drawer - Tools & Dev -->
    <q-drawer
      v-model="appStore.leftDrawerOpen"
      side="left"
      bordered
      overlay
      :width="280"
      :breakpoint="700"
    >
      <div class="drawer-content">
        <!-- Tabs Header -->
        <q-tabs
          v-model="leftDrawerTab"
          dense
          class="text-grey"
          active-color="primary"
          indicator-color="primary"
          align="justify"
        >
          <q-tab name="tools" icon="build" label="Tools" />
          <q-tab v-if="isDev" name="dev" icon="code" label="Dev" />
        </q-tabs>

        <q-separator />

        <!-- Tab Panels -->
        <q-scroll-area class="drawer-scroll-area">
          <q-tab-panels v-model="leftDrawerTab" animated>
            <!-- Tools Tab -->
            <q-tab-panel name="tools" class="q-pa-md">
              <div class="text-h6 q-mb-md">Tools</div>
              <q-list>
                <q-item-label header>Node Actions</q-item-label>
                <q-item clickable v-ripple>
                  <q-item-section avatar>
                    <q-icon name="event" />
                  </q-item-section>
                  <q-item-section>Date</q-item-section>
                </q-item>
                <q-item clickable v-ripple>
                  <q-item-section avatar>
                    <q-icon name="priority_high" />
                  </q-item-section>
                  <q-item-section>Priority</q-item-section>
                </q-item>
                <q-item clickable v-ripple>
                  <q-item-section avatar>
                    <q-icon name="label" />
                  </q-item-section>
                  <q-item-section>Tags</q-item-section>
                </q-item>
                <q-item clickable v-ripple>
                  <q-item-section avatar>
                    <q-icon name="palette" />
                  </q-item-section>
                  <q-item-section>Color</q-item-section>
                </q-item>
              </q-list>
            </q-tab-panel>

            <!-- Dev Tab (only in development) -->
            <q-tab-panel v-if="isDev" name="dev" class="q-pa-none">
              <DevPanel />
            </q-tab-panel>
          </q-tab-panels>
        </q-scroll-area>
      </div>
    </q-drawer>

    <!-- Right Drawer - AI Chat -->
    <q-drawer
      v-model="appStore.rightDrawerOpen"
      side="right"
      bordered
      overlay
      :width="350"
      :breakpoint="700"
    >
      <q-scroll-area class="fit">
        <div class="q-pa-md">
          <div class="text-h6 q-mb-md">
            <q-icon name="smart_toy" class="q-mr-sm" />
            AI Assistant
          </div>
          <div class="text-grey-6">
            AI chat will be implemented here.
          </div>
        </div>
      </q-scroll-area>
    </q-drawer>

    <!-- Main Content - 3 Panel Layout -->
    <q-page-container>
      <q-page class="three-panel-layout">
        <ThreePanelContainer />
      </q-page>
    </q-page-container>

    <!-- Command Palette (global) -->
    <CommandPalette />

    <!-- File Operations Modal -->
    <FileOperationsModal
      v-model="showFileModal"
      :mode="fileModalMode"
      @saved="onFileSaved"
      @opened="onFileOpened"
      @deleted="onFileDeleted"
    />
  </q-layout>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import { useQuasar } from 'quasar'
import { useAppStore } from 'src/core/stores/appStore'
import { useAuthStore } from 'src/core/stores/authStore'
import { useDocumentStore } from 'src/core/stores/documentStore'
import { useGoogleDriveStore } from 'src/core/stores/googleDriveStore'
import { usePanelStore } from 'src/core/stores/panelStore'
import PanelManager from 'src/shared/components/PanelManager.vue'
import ThreePanelContainer from 'src/shared/components/ThreePanelContainer.vue'
import CommandPalette from 'src/shared/components/CommandPalette.vue'
import FileOperationsModal from 'src/shared/components/FileOperationsModal.vue'
import { registerCommands, handleKeyboardEvent, initCommandAPI, updateContext } from 'src/core/commands'
import { allCommands } from 'src/core/commands/definitions'
import { signIn, signOut } from 'src/boot/google-api'
import { useAutosave } from 'src/composables/useAutosave'
import {
  updateMindmapFile,
  type DriveFileMetadata
} from 'src/core/services/googleDriveService'

// Dev tools - only imported in development mode (lazy loaded)
const DevPanel = import.meta.env.DEV
  ? defineAsyncComponent(() => import('src/dev/DevPanel.vue'))
  : null

const $q = useQuasar()
const appStore = useAppStore()
const authStore = useAuthStore()
const documentStore = useDocumentStore()
const driveStore = useGoogleDriveStore()
const panelStore = usePanelStore()

// Initialize autosave (2 second debounce)
useAutosave(2000)

// Left drawer tab state
const leftDrawerTab = ref('tools')
const isDev = import.meta.env.DEV

// File operations modal state
const showFileModal = ref(false)
const fileModalMode = ref<'save' | 'open' | 'manage'>('save')

// Global keyboard event handler
function onKeyDown(event: KeyboardEvent) {
  handleKeyboardEvent(event)
}

// Listen for command events
function onCommandPaletteOpen() {
  appStore.openCommandPalette()
}

function onThemeToggle() {
  appStore.toggleDarkMode()
}

function onLeftDrawerToggle() {
  appStore.toggleLeftDrawer()
}

function onRightDrawerToggle() {
  appStore.toggleRightDrawer()
}

// Google authentication handlers
async function handleSignIn() {
  try {
    await signIn()
    $q.notify({
      type: 'positive',
      message: `Signed in as ${authStore.user?.name}`,
      timeout: 2000
    })
  } catch {
    $q.notify({
      type: 'negative',
      message: authStore.error || 'Sign-in failed',
      timeout: 3000
    })
  }
}

function handleSignOut() {
  try {
    signOut()
    // Reset Drive store on sign out
    driveStore.reset()
    $q.notify({
      type: 'info',
      message: 'Signed out',
      timeout: 2000
    })
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Sign-out failed',
      timeout: 3000
    })
  }
}

// File operation handlers
function onFileNew() {
  documentStore.clearDocument()
  driveStore.clearCurrentFile()
}

function onFileOpen() {
  if (!authStore.isSignedIn) {
    $q.notify({ type: 'warning', message: 'Please sign in to open files from Google Drive' })
    return
  }
  fileModalMode.value = 'open'
  showFileModal.value = true
}

function onFileSave() {
  if (!authStore.isSignedIn) {
    $q.notify({ type: 'warning', message: 'Please sign in to save files to Google Drive' })
    return
  }

  console.log('onFileSave - currentFile:', driveStore.currentFile, 'hasOpenFile:', driveStore.hasOpenFile)

  // If we have a current file, save directly without modal
  if (driveStore.hasOpenFile) {
    void saveCurrentFile()
    return
  }

  // No current file - open Save As modal
  fileModalMode.value = 'save'
  showFileModal.value = true
}

async function saveCurrentFile() {
  if (!driveStore.currentFile) return

  driveStore.setSyncStatus('saving')
  try {
    const document = documentStore.toDocument()
    document.metadata.name = driveStore.currentFileName || documentStore.documentName || 'Untitled'

    const savedFile = await updateMindmapFile(
      driveStore.currentFile.id,
      document,
      document.metadata.name
    )
    driveStore.updateFileInList(savedFile)
    driveStore.setCurrentFile(savedFile)
    documentStore.markClean()

    // Show "synced" status briefly
    driveStore.setSyncStatus('synced')
    setTimeout(() => {
      if (driveStore.syncStatus === 'synced') {
        driveStore.setSyncStatus('idle')
      }
    }, 3000)

    $q.notify({
      type: 'positive',
      message: `Saved "${document.metadata.name}"`,
      timeout: 1500
    })
  } catch (error) {
    console.error('Failed to save file:', error)
    driveStore.setSyncError('Failed to save file')
    $q.notify({
      type: 'negative',
      message: 'Failed to save to Google Drive'
    })
  }
}

function onFileSaveAs() {
  if (!authStore.isSignedIn) {
    $q.notify({ type: 'warning', message: 'Please sign in to save files to Google Drive' })
    return
  }
  // Clear current file so it saves as new
  driveStore.clearCurrentFile()
  fileModalMode.value = 'save'
  showFileModal.value = true
}

function onFileManage() {
  if (!authStore.isSignedIn) {
    $q.notify({ type: 'warning', message: 'Please sign in to manage files' })
    return
  }
  fileModalMode.value = 'manage'
  showFileModal.value = true
}

// File modal event handlers
function onFileSaved(file: DriveFileMetadata) {
  console.log('✅ File saved:', file.name)
}

function onFileOpened(file: DriveFileMetadata) {
  console.log('✅ File opened:', file.name)
}

function onFileDeleted(fileId: string) {
  console.log('✅ File deleted:', fileId)
}

// Update command context when auth state changes
function updateCommandContext() {
  updateContext({
    isAuthenticated: authStore.isSignedIn,
    documentId: driveStore.currentFile?.id || null,
    hasUnsavedChanges: documentStore.isDirty
  })
}

// Watch auth state changes to update command context
watch(
  () => authStore.isSignedIn,
  () => {
    updateCommandContext()
  }
)

// Watch document changes to update command context
watch(
  () => [driveStore.currentFile, documentStore.isDirty],
  () => {
    updateCommandContext()
  }
)

onMounted(() => {
  // Register all commands
  registerCommands(allCommands)

  // Initialize command API for external agents (n8n, etc.)
  initCommandAPI()

  // Initialize online status listeners
  appStore.initOnlineListeners()

  // Load saved panel layout
  panelStore.loadLayout()

  // Add global keyboard listener with capture to intercept browser shortcuts like Ctrl+S
  window.addEventListener('keydown', onKeyDown, { capture: true })

  // Listen for command events (from command execution)
  window.addEventListener('command:palette.open', onCommandPaletteOpen)
  window.addEventListener('command:view.theme.toggle', onThemeToggle)
  window.addEventListener('command:view.drawer.left.toggle', onLeftDrawerToggle)
  window.addEventListener('command:view.drawer.right.toggle', onRightDrawerToggle)

  // Listen for file operation events
  window.addEventListener('file:new', onFileNew)
  window.addEventListener('file:open', onFileOpen)
  window.addEventListener('file:save', onFileSave)
  window.addEventListener('file:saveAs', onFileSaveAs)
  window.addEventListener('file:manage', onFileManage)

  // Initial command context update
  updateCommandContext()
})

onUnmounted(() => {
  // Remove global keyboard listener
  window.removeEventListener('keydown', onKeyDown, { capture: true })

  // Remove command event listeners
  window.removeEventListener('command:palette.open', onCommandPaletteOpen)
  window.removeEventListener('command:view.theme.toggle', onThemeToggle)
  window.removeEventListener('command:view.drawer.left.toggle', onLeftDrawerToggle)
  window.removeEventListener('command:view.drawer.right.toggle', onRightDrawerToggle)

  // Remove file operation listeners
  window.removeEventListener('file:new', onFileNew)
  window.removeEventListener('file:open', onFileOpen)
  window.removeEventListener('file:save', onFileSave)
  window.removeEventListener('file:saveAs', onFileSaveAs)
  window.removeEventListener('file:manage', onFileManage)
})
</script>

<style scoped lang="scss">
.toolbar-left {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.toolbar-right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 4px;
}

.document-title {
  font-weight: 500;
  font-size: 1rem;
}

.save-status {
  font-size: 0.75rem;
  opacity: 0.7;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}

.three-panel-layout {
  height: calc(100vh - 50px); // Full viewport height minus header
  overflow: hidden;
}

.drawer-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.drawer-scroll-area {
  flex: 1;
  height: calc(100% - 48px); // Full height minus tabs header
}
</style>
