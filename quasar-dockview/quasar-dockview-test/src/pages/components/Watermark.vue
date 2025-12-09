<template>
  <div class="watermark">
    <div class="watermark-content">
      <q-icon name="widgets" size="3rem" color="grey-4" class="q-mb-md" />
      <div class="text-h6 text-grey-5 q-mb-sm">Dockview Layout</div>
      <div class="text-body2 text-grey-6 text-center">
        Drag panels here to create tabs<br>
        or dock them to different areas
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Watermark component for empty areas
defineOptions({
  name: 'WatermarkPanel'
})
</script>

<style scoped lang="scss">
.watermark {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffebee; // Light red/pink background for visibility
}

.watermark-content {
  text-align: center;
  opacity: 0.7;
}
</style>
