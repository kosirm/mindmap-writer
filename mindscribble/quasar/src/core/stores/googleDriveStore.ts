/**
 * Google Drive Store
 *
 * Manages Google Drive file state:
 * - App folder ID
 * - Current file metadata (when a file is open)
 * - File list cache
 * - Sync status
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DriveFileMetadata } from '../services/googleDriveService'

/**
 * Sync status for the current file
 */
export type SyncStatus = 'idle' | 'saving' | 'loading' | 'synced' | 'error'

export const useGoogleDriveStore = defineStore('googleDrive', () => {
  // ============================================================
  // STATE
  // ============================================================

  /** MindScribble app folder ID in Google Drive */
  const appFolderId = ref<string | null>(null)

  /** Currently open file metadata */
  const currentFile = ref<DriveFileMetadata | null>(null)

  /** Cached list of files in the app folder */
  const fileList = ref<DriveFileMetadata[]>([])

  /** Whether file list is being loaded */
  const isLoadingFiles = ref(false)

  /** Current sync status */
  const syncStatus = ref<SyncStatus>('idle')

  /** Last sync time */
  const lastSyncTime = ref<Date | null>(null)

  /** Error message if sync failed */
  const syncError = ref<string | null>(null)

  /** Whether auto-save is enabled */
  const autoSaveEnabled = ref(true)

  /** Auto-save interval in milliseconds (default: 30 seconds) */
  const autoSaveInterval = ref(30000)

  // ============================================================
  // COMPUTED
  // ============================================================

  /** Whether a file is currently open from Google Drive */
  const hasOpenFile = computed(() => currentFile.value !== null)

  /** Current file name without extension */
  const currentFileName = computed(() => {
    if (!currentFile.value) return null
    return currentFile.value.name.replace('.mindscribble', '')
  })

  /** Whether the app folder is initialized */
  const isAppFolderReady = computed(() => appFolderId.value !== null)

  /** File count in the app folder */
  const fileCount = computed(() => fileList.value.length)

  // ============================================================
  // ACTIONS
  // ============================================================

  function setAppFolderId(id: string | null) {
    appFolderId.value = id
  }

  function setCurrentFile(file: DriveFileMetadata | null) {
    currentFile.value = file
    if (file) {
      syncStatus.value = 'synced'
      lastSyncTime.value = new Date()
      syncError.value = null
    } else {
      syncStatus.value = 'idle'
    }
  }

  function updateCurrentFileMetadata(updates: Partial<DriveFileMetadata>) {
    if (currentFile.value) {
      currentFile.value = { ...currentFile.value, ...updates }
    }
  }

  function setFileList(files: DriveFileMetadata[]) {
    fileList.value = files
  }

  function addFileToList(file: DriveFileMetadata) {
    // Add at the beginning (most recent)
    fileList.value = [file, ...fileList.value]
  }

  function updateFileInList(file: DriveFileMetadata) {
    const index = fileList.value.findIndex(f => f.id === file.id)
    if (index !== -1) {
      fileList.value[index] = file
      // Re-sort by modified time
      fileList.value.sort((a, b) =>
        new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime()
      )
    }
  }

  function removeFileFromList(fileId: string) {
    fileList.value = fileList.value.filter(f => f.id !== fileId)
  }

  function setLoadingFiles(loading: boolean) {
    isLoadingFiles.value = loading
  }

  function setSyncStatus(status: SyncStatus) {
    syncStatus.value = status
    if (status === 'synced') {
      lastSyncTime.value = new Date()
      syncError.value = null
    }
  }

  function setSyncError(error: string | null) {
    syncError.value = error
    if (error) {
      syncStatus.value = 'error'
    }
  }

  function clearCurrentFile() {
    currentFile.value = null
    syncStatus.value = 'idle'
    lastSyncTime.value = null
    syncError.value = null
  }

  function reset() {
    appFolderId.value = null
    currentFile.value = null
    fileList.value = []
    isLoadingFiles.value = false
    syncStatus.value = 'idle'
    lastSyncTime.value = null
    syncError.value = null
  }

  // ============================================================
  // RETURN PUBLIC API
  // ============================================================

  return {
    // State
    appFolderId,
    currentFile,
    fileList,
    isLoadingFiles,
    syncStatus,
    lastSyncTime,
    syncError,
    autoSaveEnabled,
    autoSaveInterval,

    // Computed
    hasOpenFile,
    currentFileName,
    isAppFolderReady,
    fileCount,

    // Actions
    setAppFolderId,
    setCurrentFile,
    updateCurrentFileMetadata,
    setFileList,
    addFileToList,
    updateFileInList,
    removeFileFromList,
    setLoadingFiles,
    setSyncStatus,
    setSyncError,
    clearCurrentFile,
    reset
  }
})
