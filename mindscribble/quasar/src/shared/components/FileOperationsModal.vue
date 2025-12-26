<template>
  <q-dialog v-model="isOpen">
    <q-card class="file-operations-modal" style="min-width: 500px; max-width: 700px;">
      <!-- Header -->
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">
          <q-icon :name="modeIcon" class="q-mr-sm" />
          {{ modeTitle }}
        </div>
      </q-card-section>

      <!-- Save Mode: Name Input -->
      <q-card-section v-if="mode === 'save'" class="q-pt-md">
        <q-input
          v-model="fileName"
          label="Mindmap Name"
          outlined
          dense
          autofocus
          :rules="[val => !!val || 'Name is required']"
          @keydown.enter="handleSave"
        >
          <template #append>
            <span class="text-grey-6">.mindscribble</span>
          </template>
        </q-input>
      </q-card-section>

      <!-- File List -->
      <q-card-section v-if="mode === 'open' || mode === 'manage'" class="q-pt-sm">
        <!-- Search -->
        <q-input
          ref="searchInput"
          v-model="searchQuery"
          placeholder="Search files..."
          outlined
          dense
          class="q-mb-md"
          @keydown="handleSearchKeydown"
        >
          <template #prepend>
            <q-icon name="search" />
          </template>
          <template v-if="searchQuery" #append>
            <q-icon name="close" class="cursor-pointer" @click="searchQuery = ''" />
          </template>
        </q-input>

        <!-- Loading State -->
        <div v-if="driveStore.isLoadingFiles" class="text-center q-pa-lg">
          <q-spinner-dots size="40px" color="primary" />
          <div class="q-mt-sm text-grey-6">Loading files...</div>
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredFiles.length === 0" class="text-center q-pa-lg">
          <q-icon name="folder_open" size="48px" color="grey-5" />
          <div class="q-mt-sm text-grey-6">
            {{ searchQuery ? 'No files match your search' : 'No mindmaps saved yet' }}
          </div>
        </div>

        <!-- File List -->
        <q-list v-else bordered separator class="rounded-borders file-list">
          <q-item
            v-for="file in filteredFiles"
            :key="file.id"
            clickable
            :active="selectedFileId === file.id"
            active-class="bg-primary text-white"
            @click="selectFile(file)"
          >
            <q-item-section avatar>
              <q-icon
                name="description"
                :color="selectedFileId === file.id ? 'white' : 'primary'"
                class="cursor-pointer"
                @click.stop="handleOpen(file)"
              />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ getDisplayName(file.name) }}</q-item-label>
              <q-item-label caption :class="selectedFileId === file.id ? 'text-white' : ''">
                Modified: {{ formatDate(file.modifiedTime) }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn
                flat
                round
                dense
                icon="delete"
                :color="selectedFileId === file.id ? 'white' : 'negative'"
                @click.stop="confirmDelete(file)"
              >
                <q-tooltip>Delete</q-tooltip>
              </q-btn>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <!-- Actions -->
      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat label="Cancel" v-close-popup />
        <q-btn
          v-if="mode === 'save'"
          color="primary"
          label="Save"
          :loading="isSaving"
          :disable="!fileName.trim()"
          @click="handleSave"
        />
        <q-btn
          v-if="mode === 'open'"
          color="primary"
          label="Open"
          :disable="!selectedFileId"
          :loading="isLoading"
          @click="handleOpenSelected"
        />
      </q-card-actions>
    </q-card>

    <!-- Delete Confirmation Dialog -->
    <q-dialog v-model="showDeleteConfirm" persistent>
      <q-card style="min-width: 300px">
        <q-card-section class="row items-center">
          <q-icon name="warning" color="negative" size="md" class="q-mr-sm" />
          <span class="text-h6">Delete File?</span>
        </q-card-section>
        <q-card-section>
          Are you sure you want to delete "{{ fileToDelete?.name }}"?
          <br />
          <span class="text-caption text-grey">This will move the file to Google Drive trash.</span>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn
            flat
            label="Delete"
            color="negative"
            :loading="isDeleting"
            @click="handleDelete"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useQuasar } from 'quasar'
import { useGoogleDriveStore, useAuthStore } from 'src/core/stores'
import { useUnifiedDocumentStore } from 'src/core/stores/unifiedDocumentStore'
import {
  getOrCreateAppFolder,
  listMindmapFiles,
  createMindmapFile,
  updateMindmapFile,
  loadMindmapFile,
  deleteMindmapFile,
  type DriveFileMetadata
} from 'src/core/services/googleDriveService'
import type { MindscribbleDocument } from 'src/core/types'

// Props
const props = defineProps<{
  modelValue: boolean
  mode: 'save' | 'open' | 'manage'
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved', file: DriveFileMetadata): void
  (e: 'opened', payload: { file: DriveFileMetadata; document: MindscribbleDocument }): void
  (e: 'deleted', fileId: string): void
}>()

// Stores
const $q = useQuasar()
const driveStore = useGoogleDriveStore()
const authStore = useAuthStore()
const unifiedStore = useUnifiedDocumentStore()

// State
const fileName = ref('')
const searchQuery = ref('')
const selectedFileId = ref<string | null>(null)
const isSaving = ref(false)
const isLoading = ref(false)
const isDeleting = ref(false)
const showDeleteConfirm = ref(false)
const fileToDelete = ref<DriveFileMetadata | null>(null)

// Refs
const searchInput = ref()

// Computed
const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const modeTitle = computed(() => {
  switch (props.mode) {
    case 'save': return driveStore.hasOpenFile ? 'Save Mindmap' : 'Save Mindmap As'
    case 'open': return 'Open Mindmap'
    case 'manage': return 'Manage Files'
    default: return 'File Operations'
  }
})

const modeIcon = computed(() => {
  switch (props.mode) {
    case 'save': return 'save'
    case 'open': return 'folder_open'
    case 'manage': return 'folder'
    default: return 'insert_drive_file'
  }
})

const filteredFiles = computed(() => {
  if (!searchQuery.value) return driveStore.fileList
  const query = searchQuery.value.toLowerCase()
  return driveStore.fileList.filter(f =>
    f.name.toLowerCase().includes(query)
  )
})

// Watch for dialog open to load files
watch(() => props.modelValue, async (open) => {
  if (open) {
    // Initialize file name from document name if saving
    if (props.mode === 'save') {
      fileName.value = driveStore.currentFileName || unifiedStore.activeDocument?.metadata.name || 'Untitled'
    }
    // Load files if opening or managing
    if (props.mode === 'open' || props.mode === 'manage') {
      await loadFiles()
      // Auto-focus search input and select first item
      await nextTick()
      if (searchInput.value) {
        searchInput.value.focus()
      }
      selectFirstItem()
    }
  } else {
    // Reset state on close
    searchQuery.value = ''
    selectedFileId.value = null
  }
})

// Watch for search query changes to update selection
watch(searchQuery, () => {
  selectFirstItem()
})

// Methods
async function loadFiles() {
  if (!authStore.isSignedIn) return

  driveStore.setLoadingFiles(true)
  try {
    // Ensure app folder exists
    let folderId = driveStore.appFolderId
    if (!folderId) {
      folderId = await getOrCreateAppFolder()
      driveStore.setAppFolderId(folderId)
    }

    // Load files
    const result = await listMindmapFiles(folderId)
    driveStore.setFileList(result.files)
  } catch (error) {
    console.error('Failed to load files:', error)
    $q.notify({
      type: 'negative',
      message: 'Failed to load files from Google Drive'
    })
  } finally {
    driveStore.setLoadingFiles(false)
  }
}

async function handleSave() {
  if (!fileName.value.trim()) return

  isSaving.value = true
  driveStore.setSyncStatus('saving')

  try {
    // Ensure app folder exists
    let folderId = driveStore.appFolderId
    if (!folderId) {
      folderId = await getOrCreateAppFolder()
      driveStore.setAppFolderId(folderId)
    }

    // Get document data from the unified store
    const document = unifiedStore.toDocument()
    console.log('💾 Getting document from unified store:', {
      nodeCount: document?.nodes.length,
      edgeCount: document?.edges.length
    })

    if (!document) {
      throw new Error('No active document to save')
    }

    document.metadata.name = fileName.value.trim()

    // Include child dockview layout from localStorage using document ID
    const documentId = document.metadata.id
    const storageKey = `dockview-child-${documentId}-layout`
    console.log('💾 Document ID:', documentId)
    console.log('💾 Storage key:', storageKey)

    const savedLayout = localStorage.getItem(storageKey)
    if (savedLayout) {
      try {
        document.dockviewLayout = JSON.parse(savedLayout)
        document.dockviewLayoutId = documentId
        console.log('✅ Including dockview layout from localStorage in saved document')
      } catch (error) {
        console.error('Failed to parse layout from localStorage:', error)
      }
    } else {
      console.warn('⚠️ No child layout found in localStorage:', storageKey)
    }

    let savedFile: DriveFileMetadata

    if (driveStore.currentFile) {
      // Update existing file
      savedFile = await updateMindmapFile(
        driveStore.currentFile.id,
        document,
        fileName.value.trim()
      )
      driveStore.updateFileInList(savedFile)
    } else {
      // Create new file
      savedFile = await createMindmapFile(
        folderId,
        fileName.value.trim(),
        document
      )
      driveStore.addFileToList(savedFile)
    }

    driveStore.setCurrentFile(savedFile)

    // Mark document as clean in the unified store
    if (unifiedStore.activeDocumentId) {
      unifiedStore.markClean(unifiedStore.activeDocumentId)
      // Update document name in unified store
      unifiedStore.updateDocumentMetadata(unifiedStore.activeDocumentId, {
        name: fileName.value.trim()
      })
      console.log('✅ Marked document as clean in unified store')
    }

    // Show "synced" status briefly
    driveStore.setSyncStatus('synced')
    setTimeout(() => {
      if (driveStore.syncStatus === 'synced') {
        driveStore.setSyncStatus('idle')
      }
    }, 3000)

    $q.notify({
      type: 'positive',
      message: `Saved "${fileName.value.trim()}"`
    })

    emit('saved', savedFile)
    isOpen.value = false
  } catch (error) {
    console.error('Failed to save file:', error)
    driveStore.setSyncError('Failed to save file')
    $q.notify({
      type: 'negative',
      message: 'Failed to save to Google Drive'
    })
  } finally {
    isSaving.value = false
  }
}

function selectFile(file: DriveFileMetadata) {
  selectedFileId.value = file.id
}

function selectFirstItem() {
  if (filteredFiles.value.length > 0) {
    selectedFileId.value = filteredFiles.value[0]?.id ?? null
  } else {
    selectedFileId.value = null
  }
}

function handleSearchKeydown(event: KeyboardEvent) {
  if (props.mode !== 'open' && props.mode !== 'manage') return

  const files = filteredFiles.value
  if (files.length === 0) return

  const currentIndex = selectedFileId.value
    ? files.findIndex(f => f.id === selectedFileId.value)
    : -1

  switch (event.key) {
    case 'ArrowDown': {
      event.preventDefault()
      const nextIndex = currentIndex < files.length - 1 ? currentIndex + 1 : 0
      selectedFileId.value = files[nextIndex]?.id ?? null
      break
    }
    case 'ArrowUp': {
      event.preventDefault()
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : files.length - 1
      selectedFileId.value = files[prevIndex]?.id ?? null
      break
    }
    case 'Enter': {
      event.preventDefault()
      if (selectedFileId.value) {
        const selectedFile = files.find(f => f.id === selectedFileId.value)
        if (selectedFile) {
          void handleOpen(selectedFile)
        }
      }
      break
    }
  }
}

async function handleOpen(file: DriveFileMetadata) {
  selectedFileId.value = file.id
  await handleOpenSelected()
}

async function handleOpenSelected() {
  if (!selectedFileId.value) return

  const file = driveStore.fileList.find(f => f.id === selectedFileId.value)
  if (!file) return

  isLoading.value = true
  driveStore.setSyncStatus('loading')

  try {
    const content = await loadMindmapFile(file.id) as MindscribbleDocument

    $q.notify({
      type: 'positive',
      message: `Opened "${getDisplayName(file.name)}"`
    })

    // Emit the file and document content to MainLayout
    emit('opened', { file, document: content })
    isOpen.value = false
  } catch (error) {
    console.error('Failed to load file:', error)
    driveStore.setSyncError('Failed to load file')
    $q.notify({
      type: 'negative',
      message: 'Failed to load file from Google Drive'
    })
  } finally {
    isLoading.value = false
    driveStore.setSyncStatus('idle')
  }
}

function confirmDelete(file: DriveFileMetadata) {
  fileToDelete.value = file
  showDeleteConfirm.value = true
}

async function handleDelete() {
  if (!fileToDelete.value) return

  isDeleting.value = true

  try {
    await deleteMindmapFile(fileToDelete.value.id)
    driveStore.removeFileFromList(fileToDelete.value.id)

    // Clear current file if it was deleted
    if (driveStore.currentFile?.id === fileToDelete.value.id) {
      driveStore.clearCurrentFile()
    }

    $q.notify({
      type: 'positive',
      message: `Deleted "${getDisplayName(fileToDelete.value.name)}"`
    })

    emit('deleted', fileToDelete.value.id)
    showDeleteConfirm.value = false
    fileToDelete.value = null
  } catch (error) {
    console.error('Failed to delete file:', error)
    $q.notify({
      type: 'negative',
      message: 'Failed to delete file'
    })
  } finally {
    isDeleting.value = false
  }
}

// Helpers
function getDisplayName(name: string): string {
  return name.replace('.mindscribble', '')
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped lang="scss">
.file-operations-modal {
  .file-list {
    max-height: 400px;
    overflow-y: auto;
  }
}
</style>
