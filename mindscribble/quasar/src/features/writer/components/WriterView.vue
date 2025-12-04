<template>
  <div class="writer-view">
    <div class="placeholder-content">
      <q-icon name="edit_note" size="64px" color="accent" />
      <div class="text-h6 q-mt-md">Writer View</div>
      <div class="text-body2 text-grey-6 q-mt-sm">
        Full document writing view with Tiptap editor.
      </div>
      <div class="text-caption text-grey-5 q-mt-lg">
        Coming from: vueflow-test
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// WriterView component
// Will be implemented with Tiptap from vueflow-test
</script>

<style scoped lang="scss">
.writer-view {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f3e5f5 0%, #ce93d8 100%);
}

.placeholder-content {
  text-align: center;
  padding: 24px;
}
</style>

