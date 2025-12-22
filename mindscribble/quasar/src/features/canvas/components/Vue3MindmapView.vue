<template>
  <div class="vue3-mindmap-view">
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
import { useVue3MindmapIntegration } from '../composables/useVue3MindmapIntegration'
import MindmapCore from './vue3-mindmap/MindmapCore.vue'
import { useVue3MindmapSettingsStore } from 'src/dev/vue3MindmapSettingsStore'

const {
  mindmapData,
  handleNodeSelect,
  handleNodeOperation,
  handleNodeSideChange,
  setupStoreEventListeners
} = useVue3MindmapIntegration()

const vue3MindmapSettings = useVue3MindmapSettingsStore()

// Configuration - use settings from store
const branchThickness = ref(vue3MindmapSettings.branchThickness)
const horizontalSpacing = ref(vue3MindmapSettings.xGap)
const verticalSpacing = ref(vue3MindmapSettings.yGap)
const groupSpacing = ref(vue3MindmapSettings.groupSpacing)

// Watch for settings changes and update local refs
watch(() => vue3MindmapSettings.branchThickness, (newVal) => {
  branchThickness.value = newVal
}, { immediate: true })

watch(() => vue3MindmapSettings.xGap, (newVal) => {
  horizontalSpacing.value = newVal
}, { immediate: true })

watch(() => vue3MindmapSettings.yGap, (newVal) => {
  verticalSpacing.value = newVal
}, { immediate: true })

watch(() => vue3MindmapSettings.groupSpacing, (newVal) => {
  groupSpacing.value = newVal
}, { immediate: true })

onMounted(() => {
  setupStoreEventListeners()
})
</script>

<style scoped>
.vue3-mindmap-view {
  width: 100%;
  height: 100%;
  position: relative;
}

:deep(.vue3-mindmap-container) {
  width: 100%;
  height: 100%;
}
</style>
