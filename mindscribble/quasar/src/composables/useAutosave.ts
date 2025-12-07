/**
 * Autosave Composable
 *
 * Provides debounced autosave functionality for Google Drive.
 * Saves automatically when document changes, with configurable delay.
 */

import { ref, watch, onUnmounted } from 'vue'
import { useDocumentStore } from 'src/core/stores/documentStore'
import { useGoogleDriveStore } from 'src/core/stores/googleDriveStore'
import { useAuthStore } from 'src/core/stores/authStore'
import { updateMindmapFile } from 'src/core/services/googleDriveService'

// Default autosave delay (2 seconds after last change)
const DEFAULT_AUTOSAVE_DELAY = 2000

// Minimum time between saves (prevent rapid consecutive saves)
const MIN_SAVE_INTERVAL = 5000

export function useAutosave(delay: number = DEFAULT_AUTOSAVE_DELAY) {
  const documentStore = useDocumentStore()
  const driveStore = useGoogleDriveStore()
  const authStore = useAuthStore()

  // Internal state
  const isAutosaving = ref(false)
  const lastSaveTime = ref<number>(0)
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let statusResetTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * Check if autosave should run
   */
  function shouldAutosave(): boolean {
    // Must be signed in
    if (!authStore.isSignedIn) return false

    // Must have an open file (already saved at least once)
    if (!driveStore.currentFile) return false

    // Document must be dirty
    if (!documentStore.isDirty) return false

    // Autosave must be enabled
    if (!driveStore.autoSaveEnabled) return false

    // Not already saving
    if (driveStore.syncStatus === 'saving') return false

    return true
  }

  /**
   * Perform the actual save
   */
  async function performAutosave(): Promise<void> {
    if (!shouldAutosave()) return

    // Check minimum save interval
    const now = Date.now()
    if (now - lastSaveTime.value < MIN_SAVE_INTERVAL) {
      // Schedule another check after the interval
      scheduleAutosave(MIN_SAVE_INTERVAL - (now - lastSaveTime.value))
      return
    }

    isAutosaving.value = true
    driveStore.setSyncStatus('saving')

    try {
      const document = documentStore.toDocument()
      const currentFile = driveStore.currentFile!

      const savedFile = await updateMindmapFile(
        currentFile.id,
        document,
        documentStore.documentName
      )

      driveStore.updateFileInList(savedFile)
      driveStore.setCurrentFile(savedFile)
      documentStore.markClean()
      lastSaveTime.value = Date.now()

      // Show "synced" status briefly, then return to idle
      driveStore.setSyncStatus('synced')
      statusResetTimer = setTimeout(() => {
        if (driveStore.syncStatus === 'synced') {
          driveStore.setSyncStatus('idle')
        }
      }, 3000)

      console.log('✅ Autosaved successfully')
    } catch (error) {
      console.error('❌ Autosave failed:', error)
      driveStore.setSyncError('Autosave failed')
    } finally {
      isAutosaving.value = false
    }
  }

  /**
   * Schedule an autosave after delay
   */
  function scheduleAutosave(customDelay?: number): void {
    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    debounceTimer = setTimeout(() => {
      void performAutosave()
    }, customDelay ?? delay)
  }

  /**
   * Cancel any pending autosave
   */
  function cancelAutosave(): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  }

  // Watch for document changes (dirty state)
  const stopWatch = watch(
    () => documentStore.isDirty,
    (isDirty) => {
      if (isDirty && shouldAutosave()) {
        scheduleAutosave()
      }
    }
  )

  // Cleanup on unmount
  onUnmounted(() => {
    cancelAutosave()
    if (statusResetTimer) {
      clearTimeout(statusResetTimer)
    }
    stopWatch()
  })

  return {
    isAutosaving,
    scheduleAutosave,
    cancelAutosave,
    performAutosave
  }
}

