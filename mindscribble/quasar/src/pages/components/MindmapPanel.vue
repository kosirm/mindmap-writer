<template>
  <div class="mindmap-panel">
    <MindmapView />
  </div>
</template>

<script setup lang="ts">
import MindmapView from 'src/features/canvas/components/MindmapView.vue'

defineOptions({
  name: 'MindmapPanelComponent'
})
</script>

<style scoped lang="scss">
.mindmap-panel {
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: 8px;
  background-color: #1e1e1e;
}
</style>
