import { ref, watch } from 'vue';

/**
 * Application settings interface
 */
export interface AppSettings {
  mindmap: {
    centerOnSelection: boolean;
    showCenterMarker: boolean;
    defaultZoom: number;
    minZoom: number;
    maxZoom: number;
  };
  writer: {
    indentationSize: number;
    autoSave: boolean;
  };
  general: {
    theme: 'light' | 'dark' | 'auto';
  };
}

/**
 * Default settings
 */
const defaultSettings: AppSettings = {
  mindmap: {
    centerOnSelection: true, // Controls whether mindmap centers on selected node
    showCenterMarker: false, // Show marker at canvas center (0, 0)
    defaultZoom: 1,
    minZoom: 0.2,
    maxZoom: 4,
  },
  writer: {
    indentationSize: 10, // px per level
    autoSave: true,
  },
  general: {
    theme: 'light',
  },
};

const STORAGE_KEY = 'mindmap-writer-settings';

/**
 * Load settings from localStorage
 */
function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure all properties exist
      return {
        mindmap: { ...defaultSettings.mindmap, ...parsed.mindmap },
        writer: { ...defaultSettings.writer, ...parsed.writer },
        general: { ...defaultSettings.general, ...parsed.general },
      };
    }
  } catch (error) {
    // console.error('[Settings] Failed to load settings from localStorage:', error);
  }
  return defaultSettings;
}

/**
 * Save settings to localStorage
 */
function saveSettings(settings: AppSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    // console.log('[Settings] Saved to localStorage');
  } catch (error) {
    // console.error('[Settings] Failed to save settings to localStorage:', error);
  }
}

// Reactive settings
const settings = ref<AppSettings>(loadSettings());

// Watch for changes and save to localStorage
watch(settings, (newSettings) => {
  saveSettings(newSettings);
}, { deep: true });

/**
 * Composable for managing application settings
 */
export function useSettings() {
  /**
   * Reset all settings to defaults
   */
  function resetToDefaults() {
    settings.value = JSON.parse(JSON.stringify(defaultSettings));
    // console.log('[Settings] Reset to defaults');
  }

  /**
   * Reset a specific section to defaults
   */
  function resetSection(section: keyof AppSettings) {
    settings.value[section] = JSON.parse(JSON.stringify(defaultSettings[section]));
    // console.log(`[Settings] Reset ${section} to defaults`);
  }

  /**
   * Export settings as JSON
   */
  function exportSettings(): string {
    return JSON.stringify(settings.value, null, 2);
  }

  /**
   * Import settings from JSON
   */
  function importSettings(json: string): boolean {
    try {
      const parsed = JSON.parse(json);
      settings.value = {
        mindmap: { ...defaultSettings.mindmap, ...parsed.mindmap },
        writer: { ...defaultSettings.writer, ...parsed.writer },
        general: { ...defaultSettings.general, ...parsed.general },
      };
      // console.log('[Settings] Imported settings');
      return true;
    } catch (error) {
      // console.error('[Settings] Failed to import settings:', error);
      return false;
    }
  }

  return {
    settings,
    resetToDefaults,
    resetSection,
    exportSettings,
    importSettings,
  };
}

