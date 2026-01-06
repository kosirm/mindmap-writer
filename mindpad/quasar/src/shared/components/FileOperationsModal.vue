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
            <span class="text-grey-6">.mindpad</span>
          </template>
        </q-input>
      </q-card-section>

      <!-- Vault/Folder Browser -->
      <q-card-section v-if="mode === 'open' || mode === 'manage'" class="q-pt-sm">
        <!-- Vault Selector -->
        <div class="q-mb-md">
          <q-select
            v-model="selectedVault"
            :options="vaultOptions"
            label="Vault"
            outlined
            dense
            emit-value
            map-options
            @update:model-value="loadVaultStructure"
          />
        </div>

        <!-- Folder Browser -->
        <div class="folder-browser">
          <!-- Navigation Path -->
          <div class="navigation-path q-mb-sm">
            <q-breadcrumbs>
              <q-breadcrumbs-el
                v-for="(crumb, index) in navigationPath"
                :key="index"
                :label="crumb.name"
                :icon="index === 0 ? 'folder' : ''"
                @click="navigateTo(crumb)"
                :class="{ 'text-primary': index < navigationPath.length - 1 }"
              />
            </q-breadcrumbs>
          </div>

          <!-- File List -->
          <q-list bordered separator class="file-list">
            <!-- Loading State -->
            <div v-if="isLoadingFiles" class="text-center q-pa-lg">
              <q-spinner-dots size="40px" color="primary" />
              <div class="q-mt-sm text-grey-6">Loading files...</div>
            </div>

            <!-- Empty State -->
            <div v-else-if="currentItems.length === 0" class="text-center q-pa-lg">
              <q-icon name="folder_open" size="48px" color="grey-5" />
              <div class="q-mt-sm text-grey-6">No items in this folder</div>
            </div>

            <!-- Items -->
            <template v-else>
              <!-- Folders -->
              <q-item
                v-for="folder in currentFolders"
                :key="folder.id"
                clickable
                @click="openFolder(folder)"
              >
                <q-item-section avatar>
                  <q-icon name="folder" color="amber-8" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ folder.name }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-btn flat round dense icon="chevron_right" />
                </q-item-section>
              </q-item>

              <!-- Files -->
              <q-item
                v-for="file in currentFiles"
                :key="file.id"
                clickable
                :active="selectedFileId === file.id"
                active-class="bg-primary text-white"
                @click="selectFile(file)"
              >
                <q-item-section avatar>
                  <q-icon name="description" color="blue-6" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ getDisplayName(file.name) }}</q-item-label>
                  <q-item-label caption>
                    Modified: {{ formatDate(file.modified) }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-btn
                    flat
                    round
                    dense
                    icon="delete"
                    color="negative"
                    @click.stop="confirmDelete(file)"
                  >
                    <q-tooltip>Delete</q-tooltip>
                  </q-btn>
                </q-item-section>
              </q-item>
            </template>
          </q-list>
        </div>
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
          <span class="text-caption text-grey">This will remove the file from your vault.</span>
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
import { useVault } from 'src/composables/useVault'
import { useFileSystem } from 'src/composables/useFileSystem'
import { useUnifiedDocumentStore } from 'src/core/stores/unifiedDocumentStore'
import type { FileSystemItem } from 'src/core/services/indexedDBService'
import type { MindpadDocument } from 'src/core/types'

// Props
const props = defineProps<{
  modelValue: boolean
  mode: 'save' | 'open' | 'manage'
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved', file: FileSystemItem): void
  (e: 'opened', payload: { file: FileSystemItem; document: MindpadDocument }): void
  (e: 'deleted', fileId: string): void
}>()

// Stores and services
const $q = useQuasar()
const vaultService = useVault()
const fileSystemService = useFileSystem()
const unifiedStore = useUnifiedDocumentStore()

// State
const fileName = ref('')
const selectedFileId = ref<string | null>(null)
const isSaving = ref(false)
const isLoading = ref(false)
const isDeleting = ref(false)
const showDeleteConfirm = ref(false)
const fileToDelete = ref<FileSystemItem | null>(null)
const isLoadingFiles = ref(false)

// Vault and navigation state
const selectedVault = ref<string | null>(null)
const vaultOptions = ref<{ label: string; value: string }[]>([])
const currentFolderId = ref<string | null>(null)
const currentItems = ref<FileSystemItem[]>([])
const navigationPath = ref<{ id: string | null; name: string }[]>([])

// Computed
const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const modeTitle = computed(() => {
  switch (props.mode) {
    case 'save': return vaultService.hasActiveVault ? 'Save Mindmap' : 'Save Mindmap As'
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

const currentFolders = computed(() => {
  return currentItems.value.filter(item => item.type === 'folder')
})

const currentFiles = computed(() => {
  return currentItems.value.filter(item => item.type === 'file')
})

// Watch for dialog open to load files
watch(() => props.modelValue, async (open) => {
  if (open) {
    // Initialize file name from document name if saving
    if (props.mode === 'save') {
      fileName.value = unifiedStore.activeDocument?.metadata.name || 'Untitled'
    }

    // Load vaults and structure if opening or managing
    if (props.mode === 'open' || props.mode === 'manage') {
      await loadVaults()
      await nextTick()
      if (vaultOptions.value.length > 0 && vaultOptions.value[0]) {
        selectedVault.value = vaultOptions.value[0].value
        await loadVaultStructure()
      }
    }
  } else {
    // Reset state on close
    selectedFileId.value = null
    fileToDelete.value = null
  }
})

// Methods
async function loadVaults() {
  try {
    await vaultService.loadVaults()
    const vaults = vaultService.vaults.value
    vaultOptions.value = vaults.map(vault => ({
      label: vault.name,
      value: vault.id
    }))
  } catch (error) {
    console.error('Failed to load vaults:', error)
    $q.notify({
      type: 'negative',
      message: 'Failed to load vaults'
    })
  }
}

async function loadVaultStructure() {
  if (!selectedVault.value) return

  isLoadingFiles.value = true
  try {
    // Reset navigation
    currentFolderId.value = null
    navigationPath.value = [{ id: null, name: 'Root' }]

    // Load vault structure
    await fileSystemService.loadStructure(selectedVault.value)
    const structure = fileSystemService.vaultStructure.value
    currentItems.value = structure.filter(item => item.parentId === null)

  } catch (error) {
    console.error('Failed to load vault structure:', error)
    $q.notify({
      type: 'negative',
      message: 'Failed to load vault structure'
    })
    currentItems.value = []
  } finally {
    isLoadingFiles.value = false
  }
}

async function openFolder(folder: FileSystemItem) {
  isLoadingFiles.value = true
  try {
    // Update navigation path
    navigationPath.value.push({ id: folder.id, name: folder.name })
    currentFolderId.value = folder.id

    // Load folder contents
    const structure = await fileSystemService.getVaultStructureById(selectedVault.value || '')
    currentItems.value = structure.filter((item: FileSystemItem) => item.parentId === folder.id)

  } catch (error) {
    console.error('Failed to open folder:', error)
    $q.notify({
      type: 'negative',
      message: 'Failed to open folder'
    })
  } finally {
    isLoadingFiles.value = false
  }
}

function navigateTo(crumb: { id: string | null; name: string }) {
  // Find the index of the crumb in the path
  const index = navigationPath.value.findIndex(p => p.id === crumb.id)
  if (index >= 0) {
    // Truncate path to this point
    navigationPath.value = navigationPath.value.slice(0, index + 1)
    currentFolderId.value = crumb.id

    // Reload items for this folder
    if (selectedVault.value) {
      void fileSystemService.getVaultStructureById(selectedVault.value).then((structure: FileSystemItem[]) => {
        currentItems.value = structure.filter((item: FileSystemItem) => item.parentId === crumb.id)
      })
    }
  }
}

async function handleSave() {
  if (!fileName.value.trim()) return

  isSaving.value = true

  try {
    // Get active vault
    await vaultService.loadVaults()
    const activeVault = vaultService.activeVault.value
    if (!activeVault) {
      throw new Error('No active vault')
    }

    // Get document data from the unified store
    const document = unifiedStore.toDocument()

    if (!document) {
      throw new Error('No active document to save')
    }

    document.metadata.name = fileName.value.trim()

    // Save to file system
    const savedFile = await fileSystemService.createNewFile(
      activeVault.id,
      currentFolderId.value,
      fileName.value.trim(),
      document
    )

    // Update vault file count
    await vaultService.incrementFileCount()

    $q.notify({
      type: 'positive',
      message: `Saved "${fileName.value.trim()}"`
    })

    emit('saved', savedFile)
    isOpen.value = false
  } catch (error) {
    console.error('Failed to save file:', error)
    $q.notify({
      type: 'negative',
      message: 'Failed to save file'
    })
  } finally {
    isSaving.value = false
  }
}

function selectFile(file: FileSystemItem) {
  selectedFileId.value = file.id
}

async function handleOpenSelected() {
  if (!selectedFileId.value) return

  const file = currentItems.value.find(f => f.id === selectedFileId.value)
  if (!file || file.type !== 'file') return

  isLoading.value = true

  try {
    // Get file content
    const content = await fileSystemService.getFileContentFromItem(file.id)
    if (!content) {
      throw new Error('Failed to get file content')
    }

    $q.notify({
      type: 'positive',
      message: `Opened "${getDisplayName(file.name)}"`
    })

    // Emit the file and document content
    emit('opened', { file, document: content })
    isOpen.value = false
  } catch (error) {
    console.error('Failed to load file:', error)
    $q.notify({
      type: 'negative',
      message: 'Failed to load file'
    })
  } finally {
    isLoading.value = false
  }
}

function confirmDelete(file: FileSystemItem) {
  fileToDelete.value = file
  showDeleteConfirm.value = true
}

async function handleDelete() {
  if (!fileToDelete.value) return

  isDeleting.value = true

  try {
    // Delete the file
    await fileSystemService.deleteExistingItem(fileToDelete.value.id)

    // Get active vault and decrement file count
    const activeVault = vaultService.activeVault.value
    if (activeVault) {
      await vaultService.decrementFileCount()
    }

    $q.notify({
      type: 'positive',
      message: `Deleted "${getDisplayName(fileToDelete.value.name)}"`
    })

    emit('deleted', fileToDelete.value.id)
    showDeleteConfirm.value = false
    fileToDelete.value = null

    // Refresh the current view
    await loadVaultStructure()
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
  return name.replace('.mindpad', '')
}

function formatDate(dateStr: string | number): string {
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

  .folder-browser {
    display: flex;
    flex-direction: column;
    height: 400px;
  }

  .navigation-path {
    padding: 8px;
    background: rgba(0, 0, 0, 0.02);
    border-radius: 4px;
  }
}

.body--dark {
  .folder-browser {
    background: rgba(255, 255, 255, 0.02);
  }
}
</style>
