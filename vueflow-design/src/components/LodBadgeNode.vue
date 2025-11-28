<template>
  <div 
    class="lod-badge-node" 
    :style="{
      width: data.width + 'px',
      height: data.height + 'px'
    }"
  >
    <div class="badge-content">
      <div class="badge-icon">⋯</div>
      <div class="badge-count">{{ data.count }}</div>
      <div class="badge-hint">hidden nodes</div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  data: {
    count: number
    width: number
    height: number
  }
}

defineProps<Props>()
</script>

<style scoped>
.lod-badge-node {
  background: linear-gradient(135deg, rgba(236, 236, 233, 0.9) 0%, rgba(236, 236, 234, 0.9) 100%);
  border: 3px solid hsl(42, 13%, 74%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  cursor: help;
  pointer-events: none;
  min-width: 100px;
  min-height: 60px;
}

.badge-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #862e9c;
  text-align: center;
}

/* Icon: "⋯" - Tweak this for the ellipsis */
.badge-icon {
  font-size: 48px;
  font-weight: bold;
  line-height: 1;
}

/* Count: The number - THIS IS THE MOST IMPORTANT - make it LARGE */
.badge-count {
  font-size: 64px;
  font-weight: bold;
  line-height: 1;
}

/* Hint: "hidden nodes" text - Tweak this for the label */
.badge-hint {
  font-size: 18px;
  font-weight: 600;
  opacity: 0.9;
  line-height: 1;
}
</style>

