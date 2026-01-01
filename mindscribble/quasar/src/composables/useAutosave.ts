// mindpad/quasar/src/composables/useAutosave.ts
import { ref, watch } from 'vue';
import { syncManager } from '../core/services/syncManager';
import type { MindpadDocument } from '../core/types';
import type { Ref } from 'vue';

/**
 * Auto-save composable with debouncing
 */
export function useAutosave(document: Ref<MindpadDocument>, delay = 2000) {
  const isSaving = ref(false);
  const lastSaved = ref<number | null>(null);
  let saveTimeout: NodeJS.Timeout | null = null;

  /**
   * Save document with debouncing
   */
  async function save() {
    if (isSaving.value) return;

    isSaving.value = true;
    try {
      await syncManager.saveDocument(document.value);
      lastSaved.value = Date.now();
    } catch (error) {
      console.error('Auto-save failed:', error);
      throw error;
    } finally {
      isSaving.value = false;
    }
  }

  /**
   * Debounced save
   */
  function debouncedSave() {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    saveTimeout = setTimeout(() => {
      save().catch(error => {
        console.error('Debounced save failed:', error);
      });
    }, delay);
  }

  /**
   * Watch document for changes and auto-save
   */
  watch(
    () => document.value,
    () => {
      debouncedSave();
    },
    { deep: true }
  );

  /**
   * Force immediate save (e.g., on window close)
   */
  async function forceSave() {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    await save();
  }

  return {
    isSaving,
    lastSaved,
    forceSave
  };
}
