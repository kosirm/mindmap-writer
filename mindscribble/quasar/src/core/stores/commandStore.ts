/**
 * Command Store - Persisted command preferences and state
 *
 * This store handles:
 * - Starred (pinned) commands persistence
 * - Recent commands persistence
 * - Command context synchronization with other stores
 */

import { defineStore } from 'pinia'
import { ref, watch, computed } from 'vue'
import { LocalStorage } from 'quasar'
import {
  updateContext,
  toggleStarred as toggleStarredCommand,
  isStarred as isStarredCommand,
  getStarredCommands as getStarredCommandsList,
  getRecentCommands as getRecentCommandsList,
} from '../commands'
import type { CommandContext } from '../commands/types'

// LocalStorage keys
const STARRED_COMMANDS_KEY = 'mindpad-starred-commands'
const RECENT_COMMANDS_KEY = 'mindpad-recent-commands'

export const useCommandStore = defineStore('command', () => {
  // ============================================================================
  // State
  // ============================================================================

  /** Starred command IDs (persisted) */
  const starredIds = ref<string[]>(
    LocalStorage.getItem(STARRED_COMMANDS_KEY) || []
  )

  /** Recent command IDs (persisted) */
  const recentIds = ref<string[]>(
    LocalStorage.getItem(RECENT_COMMANDS_KEY) || []
  )

  /** Command palette search query */
  const searchQuery = ref('')

  /** Command palette mode: 'commands' or 'nodes' */
  const paletteMode = ref<'commands' | 'nodes'>('commands')

  // ============================================================================
  // Computed
  // ============================================================================

  const starredCommands = computed(() => getStarredCommandsList())
  const recentCommands = computed(() => getRecentCommandsList())

  // ============================================================================
  // Persistence
  // ============================================================================

  watch(
    starredIds,
    (newValue) => {
      LocalStorage.set(STARRED_COMMANDS_KEY, newValue)
    },
    { deep: true }
  )

  watch(
    recentIds,
    (newValue) => {
      LocalStorage.set(RECENT_COMMANDS_KEY, newValue)
    },
    { deep: true }
  )

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Toggle starred status of a command
   */
  function toggleStarred(commandId: string): void {
    toggleStarredCommand(commandId)
    const idx = starredIds.value.indexOf(commandId)
    if (idx >= 0) {
      starredIds.value.splice(idx, 1)
    } else {
      starredIds.value.push(commandId)
    }
  }

  /**
   * Check if a command is starred
   */
  function isStarred(commandId: string): boolean {
    return isStarredCommand(commandId)
  }

  /**
   * Set palette mode
   */
  function setPaletteMode(mode: 'commands' | 'nodes'): void {
    paletteMode.value = mode
  }

  /**
   * Set search query
   */
  function setSearchQuery(query: string): void {
    searchQuery.value = query
  }

  /**
   * Clear search query
   */
  function clearSearchQuery(): void {
    searchQuery.value = ''
  }

  /**
   * Sync command context with app state
   * Call this when relevant app state changes
   */
  function syncContext(updates: Partial<CommandContext>): void {
    updateContext(updates)
  }

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    starredIds,
    recentIds,
    searchQuery,
    paletteMode,

    // Computed
    starredCommands,
    recentCommands,

    // Actions
    toggleStarred,
    isStarred,
    setPaletteMode,
    setSearchQuery,
    clearSearchQuery,
    syncContext,
  }
})

