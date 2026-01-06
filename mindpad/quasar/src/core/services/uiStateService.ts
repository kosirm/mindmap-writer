/**
 * UI State Service for Phase 5
 * Manages UI state persistence including open files and dockview layouts
 */

import { db } from './indexedDBService'
import type { UIState, FileLayout } from './indexedDBService'

export class UIStateService {
  /**
   * Save which files are currently open
   */
  static async saveOpenFiles(fileIds: string[], activeFileId: string | null): Promise<void> {
    const uiState: UIState = {
      id: 'ui-state',
      openFiles: fileIds,
      activeFileId,
      lastUpdated: Date.now()
    }
    await db.uiState.put(uiState)
    console.log('💾 [UIState] Saved open files:', fileIds)
  }

  /**
   * Get which files should be open on app start
   */
  static async getOpenFiles(): Promise<{ fileIds: string[], activeFileId: string | null }> {
    const uiState = await db.uiState.get('ui-state')
    if (!uiState) {
      return { fileIds: [], activeFileId: null }
    }
    return { fileIds: uiState.openFiles, activeFileId: uiState.activeFileId }
  }

  /**
   * Save dockview layout for a specific file
   */
  static async saveFileLayout(fileId: string, layout: unknown): Promise<void> {
    const fileLayout: FileLayout = {
      fileId,
      layout,
      lastUpdated: Date.now()
    }
    await db.fileLayouts.put(fileLayout)
    console.log('💾 [UIState] Saved layout for file:', fileId)
  }

  /**
   * Get dockview layout for a specific file
   */
  static async getFileLayout(fileId: string): Promise<Record<string, unknown> | null> {
    const fileLayout = await db.fileLayouts.get(fileId)
    return fileLayout?.layout as Record<string, unknown> || null
  }

  /**
   * Clear UI state (when switching vaults)
   */
  static async clearUIState(): Promise<void> {
    await db.uiState.clear()
    await db.fileLayouts.clear()
    console.log('🗑️ [UIState] Cleared UI state')
  }
}
