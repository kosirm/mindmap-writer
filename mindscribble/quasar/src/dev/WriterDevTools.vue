<template>
  <div class="dev-tools-section">

    <!-- Indent Rainbow Toggle -->
    <div class="text-caption q-mb-xs">Indent Rainbow</div>
    <q-btn-toggle
      v-model="writerSettings.indentRainbowEnabled"
      toggle-color="primary"
      :options="[
        { label: 'ON', value: true },
        { label: 'OFF', value: false }
      ]"
      class="q-mb-sm"
    />
    <div class="text-caption text-grey-6 q-mb-sm">
      <q-icon name="info" size="xs" />
      <strong>ON:</strong> Color indents based on hierarchy level
      <strong>OFF:</strong> No indent coloring
    </div>

    <q-separator class="q-my-sm" />

    <!-- Indentation Width Slider -->
    <div class="text-caption q-mb-xs">Indentation Width</div>
    <div class="q-mb-sm">
      <q-slider
        v-model="writerSettings.indentationWidth"
        :min="1"
        :max="30"
        :step="1"
        label
        :label-value="`${writerSettings.indentationWidth}px`"
        color="primary"
        class="q-mb-xs"
      />
    </div>

    <q-separator class="q-my-sm" />

    <!-- Indent Colors Editor -->
    <div class="text-caption q-mb-xs">Indent Colors</div>
    <div class="color-table-container">
      <div v-for="(color, index) in writerSettings.indentColors" :key="index" class="color-row q-mb-xs">
        <ColorPicker
          v-model="color.rgba"
          @update:model-value="(val) => writerSettings.updateIndentColor(index, String(val || ''))"
        />
        <q-input
          v-model="color.rgba"
          dense
          class="color-input"
          placeholder="rgba(255, 100, 100, 0.1)"
          @update:model-value="(val) => writerSettings.updateIndentColor(index, String(val || ''))"
        />
        <q-btn
          flat
          dense
          icon="delete"
          size="sm"
          color="negative"
          @click="writerSettings.removeIndentColor(index)"
          :disable="writerSettings.indentColors.length <= 1"
        />
      </div>
    </div>

    <q-btn
      outline
      size="sm"
      label="Add Color"
      icon="add"
      color="primary"
      class="full-width q-mb-sm"
      @click="writerSettings.addIndentColor()"
    />

    <q-separator class="q-my-sm" />

    <!-- Reset to Defaults -->
    <q-btn
      outline
      size="sm"
      label="Reset to Defaults"
      icon="restart_alt"
      color="primary"
      class="full-width q-mb-sm"
      @click="writerSettings.resetToDefaults()"
    />

    <!-- Stats -->
    <div class="text-caption">
      <div>Indent Rainbow: {{ writerSettings.indentRainbowEnabled ? 'ON' : 'OFF' }}</div>
      <div>Colors: {{ writerSettings.indentColors.length }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useWriterSettingsStore } from './WriterSettingsStore'
import ColorPicker from './ColorPicker.vue'

const writerSettings = useWriterSettingsStore()
</script>

<style scoped>
.dev-tools-section {
  padding: 8px 0;
}

.color-table-container {
  margin-bottom: 8px;
}

.color-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-preview {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid #ddd;
  flex-shrink: 0;
}

.color-input {
  flex: 1;
  min-width: 0;
}
</style>
