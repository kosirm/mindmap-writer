<template>
  <q-layout view="hHh lpR fFf">
    <!-- Header -->
    <q-header class="bg-primary text-white custom-header">
      <q-toolbar class="custom-toolbar">
        <!-- LEFT SECTION: Menu text -->
        <div class="toolbar-left">
          <span class="menu-text">MindScribble</span>
        </div>

        <!-- CENTER SECTION: Search input -->
        <q-space />
        <q-input
          v-model="searchQuery"
          dense
          borderless
          placeholder="Search..."
          class="search-input"
          style="width: 400px;"
        >
          <template v-slot:prepend>
            <q-icon name="search" />
          </template>
        </q-input>
        <q-space />

        <!-- RIGHT SECTION: Theme + User -->
        <div class="toolbar-right">
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
            <q-avatar
              size="28px"
              :src="authStore.user?.imageUrl"
              @img-error="onImageError"
            >
              <q-icon name="account_circle" />
            </q-avatar>
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
      </q-toolbar>
    </q-header>

    <!-- Mini Mode Sidebar - Always visible, not overlayed -->
    <div class="mini-sidebar">
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
    <transition name="slide-drawer">
      <div
        v-if="drawerExpanded"
        class="drawer-expanded"
        @mouseleave="handleDrawerMouseLeave"
      >
        <q-scroll-area class="drawer-scroll-area-full">
          <q-tab-panels v-model="leftDrawerTab" animated>
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
        </q-scroll-area>
      </div>
    </transition>


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
// import ThreePanelContainer from 'src/shared/components/ThreePanelContainer.vue'
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
const searchQuery = ref('')
const isDev = import.meta.env.DEV
const isMobile = Platform.is.mobile

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

// Handle drawer mouse leave - collapse if not pinned
function handleDrawerMouseLeave() {
  if (!drawerPinned.value) {
    drawerExpanded.value = false
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

// Custom header styling - 30px height
.custom-header {
  min-height: 30px;
  height: 30px;
}

.custom-toolbar {
  min-height: 30px;
  height: 30px;
  padding: 0 12px;
}

.three-panel-layout {
  height: calc(100vh - 30px); // Full viewport height minus header
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
  top: 30px; // Below header
  bottom: 0;
  width: 56px;
  background-color: var(--q-primary);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 0 0 0; // Padding only at top, bottom handled by flex layout
  gap: 8px;
  z-index: 3000; // Above everything to stay visible
  border-right: 1px solid rgba(0, 0, 0, 0.12);
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
  top: 30px; // Below header
  bottom: 0;
  width: 280px;
  background-color: var(--q-dark);
  z-index: 2500; // Below mini sidebar, above content
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  border-top-right-radius: 20px;
}

.drawer-scroll-area-full {
  flex: 1;
  height: 100%;
  background-color: white;
  border-top-right-radius: 20px;
}

// Slide animation for drawer
.slide-drawer-enter-active,
.slide-drawer-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.slide-drawer-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}

.slide-drawer-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

.menu-text {
  font-weight: 500;
  font-size: 1rem;
  color: white;
}

.search-input {
  margin-top: 0px;
  margin-bottom: 1px;

  // Style the outer wrapper with :deep to penetrate component
  :deep(.q-field__control) {
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    // border: 1px solid rgba(255, 255, 255, 0.5);
    transition: all 0.3s ease;
    height: 24px;

    &:before,
    &:after {
      display: none !important;
    }
  }

  &:hover :deep(.q-field__control) {
    background-color: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.7);
  }

  &.q-field--focused :deep(.q-field__control) {
    background-color: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 1);
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.1);
  }

  :deep(.q-field__native) {
    color: white;
    font-size: 14px;
    padding: 0 16px;
    line-height: 30px;
  }

  :deep(.q-field__label) {
    color: rgba(255, 255, 255, 0.7);
    font-size: 14px;
  }

  :deep(.q-field__prepend) {
    color: rgba(255, 255, 255, 0.7);
    padding-left: 12px;
    display: flex;
    align-items: center;
    height: 100%;
  }

  :deep(input::placeholder) {
    color: rgba(255, 255, 255, 0.5);
  }
}

// Adjust main content to account for mini sidebar
.q-page-container {
  padding-left: 56px; // Offset by mini sidebar width
}

</style>
