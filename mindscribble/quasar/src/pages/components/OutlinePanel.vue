<template>
  <div class="outline-panel">
    <OutlineView />
  </div>
</template>

<script setup lang="ts">
import OutlineView from 'src/features/tree/components/OutlineView.vue'

defineOptions({
  name: 'OutlinePanelComponent'
})
</script>

<style scoped lang="scss">
.outline-panel {
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: 8px;
  background-color: #1e1e1e;
}
</style>
