<template>
  <q-layout view="hHh lpR fFf">

    <!-- Mini Mode Sidebar - Always visible, not overlayed -->
    <div class="mini-sidebar"
         @mouseenter="handleMiniSidebarMouseEnter"
         @mouseleave="mouseOverMiniDrawer = false">
      <div class="mini-sidebar-main">
        <q-btn
          flat
          dense
          round
          icon="folder"
          class="mini-btn"
          :class="{ active: leftDrawerTab === 'files', pinned: drawerPinned && leftDrawerTab === 'files' }"
          @mouseenter="handleMiniHover('files')"
          @click="handleMiniClick('files')"
        >
          <q-tooltip anchor="center right" self="center left" :offset="[10, 0]">Files</q-tooltip>
        </q-btn>
        <q-btn
          flat
          dense
          round
          icon="build"
          class="mini-btn"
          :class="{ active: leftDrawerTab === 'tools', pinned: drawerPinned && leftDrawerTab === 'tools' }"
          @mouseenter="handleMiniHover('tools')"
          @click="handleMiniClick('tools')"
        >
          <q-tooltip anchor="center right" self="center left" :offset="[10, 0]">Tools</q-tooltip>
        </q-btn>
        <q-btn
          v-if="isDev"
          flat
          dense
          round
          icon="code"
          class="mini-btn"
          :class="{ active: leftDrawerTab === 'dev', pinned: drawerPinned && leftDrawerTab === 'dev' }"
          @mouseenter="handleMiniHover('dev')"
          @click="handleMiniClick('dev')"
        >
          <q-tooltip anchor="center right" self="center left" :offset="[10, 0]">Dev</q-tooltip>
        </q-btn>
        <q-btn
          flat
          dense
          round
          icon="smart_toy"
          class="mini-btn"
          :class="{ active: leftDrawerTab === 'ai', pinned: drawerPinned && leftDrawerTab === 'ai' }"
          @mouseenter="handleMiniHover('ai')"
          @click="handleMiniClick('ai')"
        >
          <q-tooltip anchor="center right" self="center left" :offset="[10, 0]">AI</q-tooltip>
        </q-btn>
      </div>

      <!-- Bottom section with theme and auth buttons -->
      <div class="mini-sidebar-bottom">
        <!-- Dark mode toggle -->
        <q-btn
          flat
          dense
          round
          :icon="appStore.isDarkMode ? 'light_mode' : 'dark_mode'"
          class="mini-btn"
          :aria-label="appStore.isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'"
          @click="appStore.toggleDarkMode"
        >
          <q-tooltip anchor="center right" self="center left" :offset="[10, 0]">{{ appStore.isDarkMode ? 'Light mode' : 'Dark mode' }}</q-tooltip>
        </q-btn>

        <!-- User authentication -->
        <q-btn
          v-if="!authStore.isSignedIn"
          flat
          dense
          round
          icon="login"
          class="mini-btn"
          aria-label="Sign in with Google"
          :loading="authStore.isLoading"
          @click="handleSignIn"
        >
          <q-tooltip anchor="center right" self="center left" :offset="[10, 0]">Sign in with Google</q-tooltip>
        </q-btn>

        <q-btn
          v-else
          flat
          dense
          round
          class="mini-btn"
          aria-label="User menu"
        >
          <q-avatar
            size="28px"
            :src="authStore.user?.imageUrl"
            @img-error="onImageError"
          >
            <q-icon name="account_circle" />
          </q-avatar>
          <q-tooltip anchor="center right" self="center left" :offset="[10, 0]">User menu</q-tooltip>
          <q-menu>
            <q-list style="min-width: 200px">
              <q-item>
                <q-item-section avatar>
                  <q-avatar size="40px" :src="authStore.user?.imageUrl">
                    <q-icon name="account_circle" />
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
    </div>

    <!-- Expanded Drawer Content - Positioned to the right of mini sidebar -->
    <div
      v-if="drawerExpanded"
      class="drawer-expanded"
      @mouseleave="handleDrawerMouseLeave"
    >
      <q-scroll-area class="drawer-scroll-area-full">
        <transition name="fade-drawer" mode="out-in">
          <q-tab-panels v-model="leftDrawerTab" :key="leftDrawerTab">
            <!-- Files Tab -->
            <q-tab-panel name="files" class="q-pa-none">
              <FileManagement />
            </q-tab-panel>

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

            <!-- AI Tab -->
            <q-tab-panel name="ai" class="q-pa-none">
              <AIChat />
            </q-tab-panel>
          </q-tab-panels>
        </transition>
      </q-scroll-area>
    </div>


    <!-- Main Content - Platform-specific Layout -->
    <q-page-container>
      <div class="main-layout">
        <!-- Dockview layout for desktop -->
        <DockviewLayout v-if="!isMobile" ref="dockviewLayoutRef" />

        <!-- Mobile layout for mobile devices -->
        <MobileLayout v-else />
      </div>
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
import { useQuasar, Platform } from 'quasar'
import { useAppStore } from 'src/core/stores/appStore'
import { useAuthStore } from 'src/core/stores/authStore'
import { useDocumentStore } from 'src/core/stores/documentStore'
import { useGoogleDriveStore } from 'src/core/stores/googleDriveStore'
import { usePanelStore } from 'src/core/stores/panelStore'
import { useMultiDocumentStore } from 'src/core/stores/multiDocumentStore'
import DockviewLayout from './DockviewLayout.vue'
import MobileLayout from './MobileLayout.vue'
import CommandPalette from 'src/shared/components/CommandPalette.vue'
import FileOperationsModal from 'src/shared/components/FileOperationsModal.vue'
import FileManagement from 'src/shared/components/FileManagement.vue'
import AIChat from 'src/features/ai/components/AIChat.vue'
import { registerCommands, handleKeyboardEvent, initCommandAPI, updateContext } from 'src/core/commands'
import { allCommands } from 'src/core/commands/definitions'
import { signIn, signOut } from 'src/boot/google-api'
import { useAutosave } from 'src/composables/useAutosave'
import {
  updateMindmapFile,
  type DriveFileMetadata
} from 'src/core/services/googleDriveService'
import type { MindscribbleDocument } from 'src/core/types'

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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const multiDocStore = useMultiDocumentStore()

// Initialize autosave (2 second debounce)
useAutosave(2000)

// Left drawer state
const leftDrawerTab = ref('tools')
const drawerExpanded = ref(false)
const drawerPinned = ref(false)
const isDev = import.meta.env.DEV
const isMobile = Platform.is.mobile
const mouseOverMiniDrawer = ref(false)
let closeDrawerTimeout: ReturnType<typeof setTimeout> | null = null

// File operations modal state
const showFileModal = ref(false)
const fileModalMode = ref<'save' | 'open' | 'manage'>('save')

// Dockview layout reference (for file operations)
const dockviewLayoutRef = ref<{
  addFile: () => void
  openFileFromDrive: (document: MindscribbleDocument, driveFile: DriveFileMetadata) => void
} | null>(null)

// Handle mini sidebar hover - expand drawer temporarily
function handleMiniHover(tab: string) {
  if (!drawerPinned.value) {
    leftDrawerTab.value = tab
    // Always set to true to keep drawer open when hovering between buttons
    drawerExpanded.value = true
  }
}

// Handle mini sidebar click - toggle pin/unpin
function handleMiniClick(tab: string) {
  // If clicking the same tab that's already pinned, unpin it
  if (drawerPinned.value && leftDrawerTab.value === tab) {
    drawerPinned.value = false
    drawerExpanded.value = false
  } else {
    // Otherwise, switch to this tab and pin it
    leftDrawerTab.value = tab
    drawerExpanded.value = true
    drawerPinned.value = true
  }
}

// Handle mini sidebar mouse enter - cancel drawer close timeout
function handleMiniSidebarMouseEnter() {
  mouseOverMiniDrawer.value = true
  // Cancel any pending drawer close timeout
  if (closeDrawerTimeout) {
    clearTimeout(closeDrawerTimeout)
    closeDrawerTimeout = null
  }
}

// Handle drawer mouse leave - collapse if not pinned (with delay)
function handleDrawerMouseLeave() {
  if (!drawerPinned.value) {
    // Set a timeout to close the drawer after a brief delay
    closeDrawerTimeout = setTimeout(() => {
      if (!mouseOverMiniDrawer.value) {
        drawerExpanded.value = false
      }
    }, 100)
  }
}

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

// Handle profile image loading errors
function onImageError() {
  console.warn('Profile image failed to load, showing fallback icon')
  // q-avatar will automatically show the slot content (account_circle icon)
}

// File operation handlers
function onFileNew() {
  // Create a new file in dockview instead of clearing the current document
  if (dockviewLayoutRef.value) {
    dockviewLayoutRef.value.addFile()
  }
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

function onFileOpened(payload: { file: DriveFileMetadata; document: MindscribbleDocument }) {
  console.log('✅ File opened:', payload.file.name)

  // Open the file in a new dockview panel
  if (dockviewLayoutRef.value) {
    dockviewLayoutRef.value.openFileFromDrive(payload.document, payload.file)
  }
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

.save-status-container {
  width: 100px; // Fixed width to prevent layout shift
  display: flex;
  justify-content: flex-start;
}

.save-status {
  font-size: 0.75rem;
  opacity: 0.7;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}

.three-panel-layout {
  height: 100vh; // Full viewport height
  overflow: hidden;
}

.main-layout {
  height: 100%;
  display: flex;
  flex-direction: column;
}

// Mini sidebar - always visible on the left
.mini-sidebar {
  position: fixed;
  left: 0;
  top: 0; // Start from top of screen
  bottom: 0;
  width: 56px;
  background-color: var(--ms-drawer-bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 90px 0 0 0; // Reduced padding since no header
  gap: 8px;
  z-index: 3000; // Above everything to stay visible
  // border-right: 1px solid rgba(0, 0, 0, 0.12);
}

.mini-sidebar-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding-bottom: 12px;
}

.mini-sidebar-bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 12px 0;
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}

.mini-btn {
  width: 40px;
  height: 40px;
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: white;
  }

  &.active {
    background-color: rgba(255, 255, 255, 0.2);
    color: white;
  }

  &.pinned {
    background-color: rgba(255, 255, 255, 0.3);
    color: white;
    border-right: 3px solid rgba(255, 255, 255, 0.712);
  }
}

// Expanded drawer - positioned to the right of mini sidebar
.drawer-expanded {
  position: fixed;
  left: 56px; // Right next to mini sidebar
  top: 0; // Start from top of screen
  bottom: 0;
  width: 280px;
  background-color: var(--ms-drawer-expanded-bg);
  z-index: 2500; // Below mini sidebar, above content
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
}

.drawer-scroll-area-full {
  flex: 1;
  height: 100%;
  background-color: var(--ms-drawer-expanded-bg);
}

// Fade animation for drawer
.fade-drawer-enter-active,
.fade-drawer-leave-active {
  transition: opacity 0.1s ease-in-out;
}

.fade-drawer-enter-from {
  opacity: 0;
  // transform: translateX(10px);
}

.fade-drawer-leave-to {
  opacity: 0;
  // transform: translateX(10px);
}

.menu-text {
  font-weight: 500;
  font-size: 1rem;
  color: white;
}


// Adjust main content to account for mini sidebar
.q-page-container {
  padding-left: 56px; // Offset by mini sidebar width
}

</style>
