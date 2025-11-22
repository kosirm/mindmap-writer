<template>
  <div
    v-if="visible"
    class="center-marker"
    :style="{
      position: 'absolute',
      left: `${screenX}px`,
      top: `${screenY}px`,
      pointerEvents: 'none',
      zIndex: 0,
      opacity: opacity,
    }"
  >
    <!-- Horizontal line -->
    <div
      :style="{
        position: 'absolute',
        width: `${size}px`,
        height: `${lineWidth}px`,
        background: color,
        left: `${-size / 2}px`,
        top: `${-lineWidth / 2}px`,
        borderRadius: `${lineWidth / 2}px`,
      }"
    />
    <!-- Vertical line -->
    <div
      :style="{
        position: 'absolute',
        width: `${lineWidth}px`,
        height: `${size}px`,
        background: color,
        left: `${-lineWidth / 2}px`,
        top: `${-size / 2}px`,
        borderRadius: `${lineWidth / 2}px`,
      }"
    />
    <!-- Center circle -->
    <div
      v-if="showCircle"
      :style="{
        position: 'absolute',
        width: `${circleSize}px`,
        height: `${circleSize}px`,
        background: color,
        borderRadius: '50%',
        left: `${-circleSize / 2}px`,
        top: `${-circleSize / 2}px`,
      }"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useVueFlow } from '@vue-flow/core';

// Props for customization
interface Props {
  visible?: boolean;
  color?: string;
  size?: number;
  lineWidth?: number;
  circleSize?: number;
  showCircle?: boolean;
  opacity?: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const props = withDefaults(defineProps<Props>(), {
  visible: true,
  color: '#999',
  size: 40,
  lineWidth: 2,
  circleSize: 6,
  showCircle: true,
  opacity: 1,
});

// Get viewport information from Vue Flow
const { getViewport } = useVueFlow();

// Calculate screen position of flow coordinates (0, 0)
const screenX = computed(() => {
  const viewport = getViewport();
  return viewport.x;
});

const screenY = computed(() => {
  const viewport = getViewport();
  return viewport.y;
});
</script>

<style scoped>
.center-marker {
  /* No additional styles needed - all inline for reactivity */
}
</style>

