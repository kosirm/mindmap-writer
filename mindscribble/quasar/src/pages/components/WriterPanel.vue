<template>
  <div class="writer-panel">
    <WriterView />
  </div>
</template>

<script setup lang="ts">
import WriterView from 'src/features/writer/components/WriterView.vue'

defineOptions({
  name: 'WriterPanelComponent'
})
</script>

<style scoped lang="scss">
.writer-panel {
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: 8px;
  background-color: #1e1e1e;
}
</style>
