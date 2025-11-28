<template>
  <div class="custom-node" :class="{ 'potential-parent': data.isPotentialParent }">
    <div class="node-content">
      {{ data.label }}
    </div>

    <!-- Expand/Collapse button (only if node has children) -->
    <div
      v-if="data.childCount && data.childCount > 0"
      class="collapse-button"
      :class="{ 'left': data.childrenSide === 'left', 'right': data.childrenSide === 'right' }"
      @click.stop="toggleCollapse"
    >
      <span v-if="!data.collapsed" class="icon">−</span>
      <span v-if="data.collapsed" class="badge">{{ data.childCount }}</span>
    </div>

    <!-- Handles for connections - 4 sides -->
    <Handle
      id="top"
      type="target"
      :position="Position.Top"
      class="handle"
    />
    <Handle
      id="bottom"
      type="source"
      :position="Position.Bottom"
      class="handle"
    />
    <Handle
      id="left"
      type="target"
      :position="Position.Left"
      class="handle"
    />
    <Handle
      id="right"
      type="source"
      :position="Position.Right"
      class="handle"
    />
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

interface Props {
  data: {
    label: string
    parentId: string | null
    childCount?: number
    collapsed?: boolean
    childrenSide?: 'left' | 'right'
    isPotentialParent?: boolean
  }
}

defineProps<Props>()

const emit = defineEmits<{
  toggleCollapse: []
}>()

function toggleCollapse() {
  emit('toggleCollapse')
}
</script>

<style scoped>
.custom-node {
  background: white;
  border: 2px solid #4dabf7;
  border-radius: 8px;
  padding: 12px 16px;
  min-width: 150px;
  min-height: 50px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
  cursor: move;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.custom-node:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  border-color: #339af0;
}

.custom-node.potential-parent {
  background: #d0ebff;
  border-color: #4dabf7;
  border-width: 3px;
  box-shadow: 0 0 0 4px rgba(77, 171, 247, 0.2);
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 4px rgba(77, 171, 247, 0.2);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(77, 171, 247, 0.3);
  }
}

.node-content {
  font-size: 14px;
  font-weight: 500;
  color: #212529;
  text-align: center;
}

.handle {
  width: 10px;
  height: 10px;
  background: #4dabf7;
  border: 2px solid white;
  border-radius: 50%;
}

.handle:hover {
  background: #339af0;
}

.collapse-button {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  background: #4dabf7;
  border: 2px solid white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 10;
}

.collapse-button.left {
  left: -32px;
}

.collapse-button.right {
  right: -32px;
}

.collapse-button:hover {
  background: #228be6;
}

.collapse-button .icon {
  color: white;
  font-size: 18px;
  font-weight: bold;
  line-height: 1;
  user-select: none;
  padding-bottom: 2.3px;
}

.collapse-button .badge {
  color: white;
  font-size: 11px;
  font-weight: bold;
  border-radius: 10px;
  min-width: 15px;
  text-align: center;
  padding-bottom: 1px;
}

/* Selected state */
:deep(.vue-flow__node.selected) .custom-node {
  border-color: #ff6b6b;
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.2);
}
</style>

