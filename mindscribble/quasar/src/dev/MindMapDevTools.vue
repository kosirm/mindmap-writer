<template>
  <div class="dev-tools-section">
    <div class="text-subtitle1 q-mb-sm">
      <q-icon name="graph_1" class="q-mr-sm" />
      Mindmap
    </div>

    <!-- Branch Settings -->
    <div class="text-caption q-mb-xs">Branch Settings</div>
    <div class="row items-center q-mb-sm">
      <div class="col-4 text-caption">Branch Thickness:</div>
      <div class="col">
        <q-slider
          v-model="branchThickness"
          :min="1"
          :max="6"
          :step="1"
          dense
        />
      </div>
      <div class="col-2 text-caption text-right">{{ branchThickness }}</div>
    </div>

    <q-separator class="q-my-sm" />

    <!-- Spacing Settings -->
    <div class="text-caption q-mb-xs">Node Spacing (px)</div>
    <div class="row items-center q-mb-xs">
      <div class="col-4 text-caption">Horizontal (x-gap):</div>
      <div class="col">
        <q-slider
          v-model="xGap"
          :min="20"
          :max="200"
          :step="1"
          dense
        />
      </div>
      <div class="col-2 text-caption text-right">{{ xGap }}</div>
    </div>
    <div class="row items-center q-mb-sm">
      <div class="col-4 text-caption">Vertical (y-gap):</div>
      <div class="col">
        <q-slider
          v-model="yGap"
          :min="100"
          :max="300"
          :step="1"
          dense
        />
      </div>
      <div class="col-2 text-caption text-right">{{ yGap }}</div>
    </div>
    <div class="row items-center q-mb-sm">
      <div class="col-4 text-caption">Group Spacing:</div>
      <div class="col">
        <q-slider
          v-model="groupSpacing"
          :min="100"
          :max="500"
          :step="1"
          dense
        />
      </div>
      <div class="col-2 text-caption text-right">{{ groupSpacing }}</div>
    </div>

    <q-separator class="q-my-sm" />

    <!-- Reset to Defaults -->
    <q-btn
      outline
      size="sm"
      label="Reset to Defaults"
      icon="restart_alt"
      color="primary"
      class="full-width q-mb-sm"
      @click="resetToDefaults"
    />

    <!-- Select and Navigate Toggle -->
    <div class="text-caption q-mb-xs">Select & Navigate</div>
    <q-btn-toggle
      v-model="devSettings.selectNavigate"
      toggle-color="primary"
      :options="[
        { label: 'ON', value: true },
        { label: 'OFF', value: false }
      ]"
      class="full-width q-mb-sm"
      @click="devSettings.toggleSelectNavigate"
    />
    <div class="text-caption text-grey-6 q-mb-sm">
      <q-icon name="info" size="xs" />
      <strong>ON:</strong> All selections pan node to center<br>
      <strong>OFF:</strong> Only explicit clicks pan node (navigation/editing just highlights)
    </div>

    <!-- Stats -->
    <div class="text-caption">
      <div>Current Settings:</div>
      <div>Branch: {{ branchThickness }}px</div>
      <div>Spacing: {{ xGap }}x{{ yGap }}px</div>
      <div>Group Spacing: {{ groupSpacing }}px</div>
      <div>Select & Navigate: {{ devSettings.selectNavigate ? 'ON' : 'OFF' }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useMindmapSettingsStore } from './MindmapSettingsStore'
import { useDevSettingsStore } from './devSettingsStore'

const mindmapSettings = useMindmapSettingsStore()
const devSettings = useDevSettingsStore()

// Initialize with default values from original mindmap
const branchThickness = ref(mindmapSettings.branchThickness || 2)
const xGap = ref(mindmapSettings.xGap || 84)
const yGap = ref(mindmapSettings.yGap || 18)
const groupSpacing = ref(mindmapSettings.groupSpacing || 150)

// Watch for changes and update store
watch([branchThickness, xGap, yGap, groupSpacing], () => {
  mindmapSettings.setSettings({
    branchThickness: branchThickness.value,
    xGap: xGap.value,
    yGap: yGap.value,
    groupSpacing: groupSpacing.value
  })
}, { immediate: true })

function resetToDefaults() {
  branchThickness.value = 2
  xGap.value = 50
  yGap.value = 150
  groupSpacing.value = 150
}
</script>

<style scoped>
.dev-tools-section {
  padding: 8px 0;
}
</style>
