/**
 * Composable for vault operations with reactive state
 */

import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import {
  getAllVaults,
  getVault,
  createVault,
  deleteVault,
  setActiveVault,
  getActiveVault,
  renameVault,
  updateVaultDescription,
  incrementVaultFileCount,
  decrementVaultFileCount
} from '../core/services/vaultService'
import type { VaultMetadata } from '../core/services/indexedDBService'

export function useVault() {
  const $q = useQuasar()

  // State
  const vaults = ref<VaultMetadata[]>([])
  const activeVault = ref<VaultMetadata | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Load all vaults
   */
  async function loadVaults() {
    try {
      isLoading.value = true
      error.value = null

      const loadedVaults = await getAllVaults()
      vaults.value = loadedVaults

      // Load active vault
      const active = await getActiveVault()
      activeVault.value = active

      return loadedVaults
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load vaults'
      $q.notify({
        type: 'negative',
        message: error.value
      })
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Create a new vault
   */
  async function createNewVault(name: string, description: string = '') {
    try {
      isLoading.value = true
      error.value = null

      const newVault = await createVault(name, description)

      // Refresh vaults list
      await loadVaults()

      $q.notify({
        type: 'positive',
        message: `Vault "${name}" created successfully`
      })

      return newVault
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create vault'
      $q.notify({
        type: 'negative',
        message: error.value
      })
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Delete a vault
   */
  async function deleteExistingVault(vaultId: string) {
    try {
      isLoading.value = true
      error.value = null

      const vaultToDelete = vaults.value.find(v => v.id === vaultId)
      if (!vaultToDelete) {
        throw new Error('Vault not found')
      }

      await deleteVault(vaultId)

      // Refresh vaults list
      await loadVaults()

      $q.notify({
        type: 'positive',
        message: `Vault "${vaultToDelete.name}" deleted successfully`
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete vault'
      $q.notify({
        type: 'negative',
        message: error.value
      })
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Set active vault
   */
  async function setCurrentVault(vaultId: string) {
    try {
      isLoading.value = true
      error.value = null

      await setActiveVault(vaultId)

      // Refresh active vault
      const active = await getActiveVault()
      activeVault.value = active

      $q.notify({
        type: 'positive',
        message: 'Vault activated successfully'
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to set active vault'
      $q.notify({
        type: 'negative',
        message: error.value
      })
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Rename a vault
   */
  async function renameExistingVault(vaultId: string, newName: string) {
    try {
      isLoading.value = true
      error.value = null

      const updatedVault = await renameVault(vaultId, newName)

      // Update local state
      const index = vaults.value.findIndex(v => v.id === vaultId)
      if (index !== -1) {
        vaults.value[index] = updatedVault
      }

      // If this was the active vault, update it
      if (activeVault.value?.id === vaultId) {
        activeVault.value = updatedVault
      }

      $q.notify({
        type: 'positive',
        message: 'Vault renamed successfully'
      })

      return updatedVault
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to rename vault'
      $q.notify({
        type: 'negative',
        message: error.value
      })
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Update vault description
   */
  async function updateVaultDesc(vaultId: string, newDescription: string) {
    try {
      isLoading.value = true
      error.value = null

      const updatedVault = await updateVaultDescription(vaultId, newDescription)

      // Update local state
      const index = vaults.value.findIndex(v => v.id === vaultId)
      if (index !== -1) {
        vaults.value[index] = updatedVault
      }

      // If this was the active vault, update it
      if (activeVault.value?.id === vaultId) {
        activeVault.value = updatedVault
      }

      return updatedVault
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update vault description'
      $q.notify({
        type: 'negative',
        message: error.value
      })
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Increment file count for active vault
   */
  async function incrementFileCount() {
    if (!activeVault.value) {
      throw new Error('No active vault')
    }

    try {
      await incrementVaultFileCount(activeVault.value.id)

      // Update local state
      if (activeVault.value) {
        activeVault.value.fileCount += 1
        activeVault.value.modified = Date.now()
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to increment file count'
      throw err
    }
  }

  /**
   * Decrement file count for active vault
   */
  async function decrementFileCount() {
    if (!activeVault.value) {
      throw new Error('No active vault')
    }

    try {
      await decrementVaultFileCount(activeVault.value.id)

      // Update local state
      if (activeVault.value) {
        activeVault.value.fileCount = Math.max(0, activeVault.value.fileCount - 1)
        activeVault.value.modified = Date.now()
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to decrement file count'
      throw err
    }
  }

  /**
   * Get vault by ID
   */
  async function getVaultById(vaultId: string): Promise<VaultMetadata | null> {
    try {
      return await getVault(vaultId)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to get vault'
      throw err
    }
  }

  // Computed properties
  const hasVaults = computed(() => vaults.value.length > 0)
  const hasActiveVault = computed(() => activeVault.value !== null)

  return {
    // State
    vaults,
    activeVault,
    isLoading,
    error,

    // Computed
    hasVaults,
    hasActiveVault,

    // Methods
    loadVaults,
    createNewVault,
    deleteExistingVault,
    setCurrentVault,
    renameExistingVault,
    updateVaultDesc,
    incrementFileCount,
    decrementFileCount,
    getVaultById
  }
}
