<template>
  <div
    class="lod-badge-node"
    :style="{
      width: data.width + 'px',
      height: data.height + 'px'
    }"
  >
    <svg
      class="badge-svg"
      :viewBox="`0 0 ${data.width} ${data.height}`"
      preserveAspectRatio="xMidYMid meet"
    >
      <text
        :x="data.width / 2"
        :y="data.height / 2"
        text-anchor="middle"
        dominant-baseline="central"
        class="badge-text"
      >
        {{ data.count }}
      </text>
    </svg>
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
  width: 100%;
  height: 100%;
  padding: 10%;
}

.badge-svg {
  width: 100%;
  height: 100%;
}

.badge-text {
  font-size: 100px;
  font-weight: bold;
  fill: #6c757d;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>

