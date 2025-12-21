<template>
  <div class="dev-tools-section">
    <div class="text-subtitle1 q-mb-sm">
      <q-icon name="graph_1" class="q-mr-sm" />
      Vue3-Mindmap
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
          :min="10"
          :max="300"
          :step="1"
          dense
        />
      </div>
      <div class="col-2 text-caption text-right">{{ yGap }}</div>
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

    <!-- Stats -->
    <div class="text-caption">
      <div>Current Settings:</div>
      <div>Branch: {{ branchThickness }}px</div>
      <div>Spacing: {{ xGap }}x{{ yGap }}px</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useVue3MindmapSettingsStore } from './vue3MindmapSettingsStore'

const vue3MindmapSettings = useVue3MindmapSettingsStore()

// Initialize with default values from original vue3-mindmap
const branchThickness = ref(vue3MindmapSettings.branchThickness || 2)
const xGap = ref(vue3MindmapSettings.xGap || 84)
const yGap = ref(vue3MindmapSettings.yGap || 18)

// Watch for changes and update store
watch([branchThickness, xGap, yGap], () => {
  vue3MindmapSettings.setSettings({
    branchThickness: branchThickness.value,
    xGap: xGap.value,
    yGap: yGap.value
  })
}, { immediate: true })

function resetToDefaults() {
  branchThickness.value = 2
  xGap.value = 50
  yGap.value = 150
}
</script>

<style scoped>
.dev-tools-section {
  padding: 8px 0;
}
</style>
