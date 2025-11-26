<template>
  <q-dialog
    v-model="isOpen"
    maximized
    transition-show="slide-up"
    transition-hide="slide-down"
  >
    <q-card class="settings-card">
      <!-- Header -->
      <q-card-section class="settings-header">
        <div class="settings-title">
          <q-icon name="settings" size="32px" color="primary" />
          <h4 class="q-ma-none q-ml-md">Settings</h4>
        </div>
        <q-btn
          flat
          round
          dense
          icon="close"
          v-close-popup
        >
          <q-tooltip>Close</q-tooltip>
        </q-btn>
      </q-card-section>

      <!-- Search bar -->
      <q-card-section class="settings-search">
        <q-input
          v-model="searchQuery"
          outlined
          dense
          placeholder="Search settings..."
          clearable
        >
          <template #prepend>
            <q-icon name="search" />
          </template>
        </q-input>
      </q-card-section>

      <!-- Tabs -->
      <q-tabs
        v-model="activeTab"
        dense
        class="text-grey"
        active-color="primary"
        indicator-color="primary"
        align="left"
      >
        <q-tab name="settings" label="Settings" />
        <q-tab name="shortcuts" label="Keyboard Shortcuts" />
      </q-tabs>

      <q-separator />

      <!-- Tab Panels -->
      <q-tab-panels v-model="activeTab" animated class="settings-content q-pa-none">
        <!-- Settings Tab -->
        <q-tab-panel name="settings">
          <div class="settings-sections">
            <!-- Mindmap Settings -->
            <div v-if="showSection('mindmap')" class="settings-section">
              <div class="section-header">
                <q-icon name="account_tree" size="24px" color="primary" />
                <h6 class="q-ma-none q-ml-sm">Mindmap</h6>
              </div>

              <q-list>
                <q-item v-if="showSetting('Center on selection')" tag="label">
                  <q-item-section>
                    <q-item-label>Center on selection</q-item-label>
                    <q-item-label caption>
                      Automatically center the mindmap when selecting a node from Writer
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-toggle v-model="settings.mindmap.centerOnSelection" />
                  </q-item-section>
                </q-item>

                <q-item v-if="showSetting('Show center marker')" tag="label">
                  <q-item-section>
                    <q-item-label>Show center marker</q-item-label>
                    <q-item-label caption>
                      Display a marker at the canvas center (0, 0)
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-toggle v-model="settings.mindmap.showCenterMarker" />
                  </q-item-section>
                </q-item>
              </q-list>
            </div>

            <!-- Writer Settings -->
            <div v-if="showSection('writer')" class="settings-section">
              <div class="section-header">
                <q-icon name="edit" size="24px" color="primary" />
                <h6 class="q-ma-none q-ml-sm">Writer</h6>
              </div>

              <q-list>
                <q-item v-if="showSetting('Indentation size')">
                  <q-item-section>
                    <q-item-label>Indentation size</q-item-label>
                    <q-item-label caption>
                      Pixels per indentation level (default: 10px)
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side style="min-width: 100px;">
                    <q-input
                      v-model.number="settings.writer.indentationSize"
                      type="number"
                      dense
                      outlined
                      suffix="px"
                      :min="5"
                      :max="50"
                    />
                  </q-item-section>
                </q-item>

                <q-item v-if="showSetting('Auto save')" tag="label">
                  <q-item-section>
                    <q-item-label>Auto save</q-item-label>
                    <q-item-label caption>
                      Automatically save changes to localStorage
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-toggle v-model="settings.writer.autoSave" />
                  </q-item-section>
                </q-item>
              </q-list>
            </div>

            <!-- No results -->
            <div v-if="searchQuery && !hasResults" class="no-results">
              <q-icon name="search_off" size="48px" color="grey-5" />
              <div class="text-grey-6 q-mt-md">No settings found</div>
              <div class="text-grey-5 text-caption">Try a different search term</div>
            </div>
          </div>
        </q-tab-panel>

        <!-- Keyboard Shortcuts Tab -->
        <q-tab-panel name="shortcuts">
          <div class="shortcuts-content">
            <p class="text-grey-7">Keyboard shortcuts will be displayed here.</p>
            <p class="text-caption text-grey-6">Coming soon...</p>
          </div>
        </q-tab-panel>
      </q-tab-panels>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSettings } from '../composables/useSettings';

const { settings } = useSettings();

// Dialog model
const isOpen = defineModel<boolean>({ required: true });

const activeTab = ref('settings');
const searchQuery = ref('');

// Search filtering
const normalizedSearch = computed(() => searchQuery.value.toLowerCase().trim());

function showSection(section: string): boolean {
  if (!searchQuery.value) return true;

  // Check if section name matches
  if (section.toLowerCase().includes(normalizedSearch.value)) return true;

  // Check if any setting in this section matches
  const sectionSettings = getSectionSettings(section);
  return sectionSettings.some(setting =>
    setting.toLowerCase().includes(normalizedSearch.value)
  );
}

function showSetting(settingName: string): boolean {
  if (!searchQuery.value) return true;
  return settingName.toLowerCase().includes(normalizedSearch.value);
}

function getSectionSettings(section: string): string[] {
  const settingsMap: Record<string, string[]> = {
    mindmap: ['Center on selection', 'Show center marker'],
    writer: ['Indentation size', 'Auto save'],
  };
  return settingsMap[section] || [];
}

const hasResults = computed(() => {
  if (!searchQuery.value) return true;
  return showSection('mindmap') || showSection('writer');
});


</script>

<style scoped>
.settings-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: white;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  background-color: white;
}

.settings-title {
  display: flex;
  align-items: center;
}

.settings-search {
  padding: 16px 24px;
  background-color: #fafafa;
}

.settings-content {
  flex: 1;
  background-color: white;
  overflow-y: auto;
}

.settings-sections {
  padding: 16px 0;
}

.settings-section {
  margin-bottom: 32px;
}

.section-header {
  display: flex;
  align-items: center;
  padding: 8px 24px;
  background-color: #fafafa;
  border-left: 4px solid #1976d2;
  margin-bottom: 8px;
}

.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  text-align: center;
}

.shortcuts-content {
  padding: 24px;
}
</style>


