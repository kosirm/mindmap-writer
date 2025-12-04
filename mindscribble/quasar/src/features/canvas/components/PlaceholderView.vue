<template>
  <div class="placeholder-view">
    <div class="placeholder-content">
      <q-icon name="construction" size="64px" color="warning" />
      <div class="text-h6 q-mt-md">Coming Soon</div>
      <div class="text-body2 text-grey-6 q-mt-sm">
        This view is under development.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// PlaceholderView component for views not yet implemented
</script>

<style scoped lang="scss">
.placeholder-view {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #fff3e0 0%, #ffcc80 100%);
}

.placeholder-content {
  text-align: center;
  padding: 24px;
}
</style>

