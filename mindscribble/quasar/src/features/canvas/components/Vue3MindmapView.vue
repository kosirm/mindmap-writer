<template>
  <div class="vue3-mindmap-view">
    <MindmapCore
      :modelValue="mindmapData"
      :branch="branchThickness"
      :x-gap="horizontalSpacing"
      :y-gap="verticalSpacing"
      :zoom="true"
      @node-select="handleNodeSelect"
      @node-operation="handleNodeOperation"
      @node-side-change="handleNodeSideChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useVue3MindmapIntegration } from '../composables/useVue3MindmapIntegration'
import MindmapCore from './vue3-mindmap/MindmapCore.vue'

const {
  mindmapData,
  handleNodeSelect,
  handleNodeOperation,
  handleNodeSideChange,
  setupStoreEventListeners
} = useVue3MindmapIntegration()

// Configuration
const branchThickness = ref(2)
const horizontalSpacing = ref(84)
const verticalSpacing = ref(18)

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
