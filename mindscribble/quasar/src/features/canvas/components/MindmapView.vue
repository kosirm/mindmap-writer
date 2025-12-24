<template>
  <div class="mindmap-view">
    <MindmapCore
      :modelValue="mindmapData"
      :branch="branchThickness"
      :x-gap="horizontalSpacing"
      :y-gap="verticalSpacing"
      :group-spacing="groupSpacing"
      :zoom="true"
      @node-select="handleNodeSelect"
      @node-operation="handleNodeOperation"
      @node-side-change="handleNodeSideChange"
      :key="`mindmap-${branchThickness}-${horizontalSpacing}-${verticalSpacing}-${groupSpacing}`"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useMindmapIntegration } from '../composables/useMindmapIntegration'
import MindmapCore from './mindmap/MindmapCore.vue'
import { useMindmapSettingsStore } from 'src/dev/MindmapSettingsStore'

const {
  mindmapData,
  handleNodeSelect,
  handleNodeOperation,
  handleNodeSideChange,
  setupStoreEventListeners
} = useMindmapIntegration()

const mindmapSettings = useMindmapSettingsStore()

// Configuration - use settings from store
const branchThickness = ref(mindmapSettings.branchThickness)
const horizontalSpacing = ref(mindmapSettings.xGap)
const verticalSpacing = ref(mindmapSettings.yGap)
const groupSpacing = ref(mindmapSettings.groupSpacing)

// Watch for settings changes and update local refs
watch(() => mindmapSettings.branchThickness, (newVal) => {
  branchThickness.value = newVal
}, { immediate: true })

watch(() => mindmapSettings.xGap, (newVal) => {
  horizontalSpacing.value = newVal
}, { immediate: true })

watch(() => mindmapSettings.yGap, (newVal) => {
  verticalSpacing.value = newVal
}, { immediate: true })

watch(() => mindmapSettings.groupSpacing, (newVal) => {
  groupSpacing.value = newVal
}, { immediate: true })

onMounted(() => {
  setupStoreEventListeners()
})
</script>

<style scoped>
.mindmap-view {
  width: 100%;
  height: 100%;
  position: relative;
}

:deep(.mindmap-container) {
  width: 100%;
  height: 100%;
}
</style>
