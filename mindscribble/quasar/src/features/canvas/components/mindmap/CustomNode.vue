<template>
  <div class="custom-node" :class="{ 'potential-parent': data.isPotentialParent }">
    <div class="node-content">
      {{ data.label }}
    </div>

    <!-- Expand/Collapse buttons -->
    <!-- Root nodes: TWO buttons (left + right) with separate counts -->
    <template v-if="data.parentId === null">
      <div
        v-if="data.childCountLeft && data.childCountLeft > 0"
        class="collapse-button left"
        @click.stop="toggleCollapseLeft"
      >
        <span v-if="!data.collapsedLeft" class="icon">−</span>
        <span v-if="data.collapsedLeft" class="badge">{{ data.childCountLeft }}</span>
      </div>
      <div
        v-if="data.childCountRight && data.childCountRight > 0"
        class="collapse-button right"
        @click.stop="toggleCollapseRight"
      >
        <span v-if="!data.collapsedRight" class="icon">−</span>
        <span v-if="data.collapsedRight" class="badge">{{ data.childCountRight }}</span>
      </div>
    </template>

    <!-- Child nodes: ONE button (left or right depending on side) -->
    <div
      v-else-if="data.parentId !== null && data.childCount && data.childCount > 0"
      class="collapse-button"
      :class="{ 'left': data.childrenSide === 'left', 'right': data.childrenSide === 'right' }"
      @click.stop="toggleCollapse"
    >
      <span v-if="!data.collapsed" class="icon">−</span>
      <span v-if="data.collapsed" class="badge">{{ data.childCount }}</span>
    </div>

    <!-- Handles for connections - 4 sides -->
    <!-- Each position has both source and target handles for bi-directional connections -->
    <Handle id="top-target" type="target" :position="Position.Top" class="handle" />
    <Handle id="top-source" type="source" :position="Position.Top" class="handle" />
    <Handle id="bottom-target" type="target" :position="Position.Bottom" class="handle" />
    <Handle id="bottom-source" type="source" :position="Position.Bottom" class="handle" />
    <Handle id="left-target" type="target" :position="Position.Left" class="handle" />
    <Handle id="left-source" type="source" :position="Position.Left" class="handle" />
    <Handle id="right-target" type="target" :position="Position.Right" class="handle" />
    <Handle id="right-source" type="source" :position="Position.Right" class="handle" />
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

interface Props {
  data: {
    label: string
    parentId: string | null
    childCount?: number
    childCountLeft?: number
    childCountRight?: number
    collapsed?: boolean
    collapsedLeft?: boolean
    collapsedRight?: boolean
    childrenSide?: 'left' | 'right'
    isPotentialParent?: boolean
  }
}

defineProps<Props>()

const emit = defineEmits<{
  toggleCollapse: []
  toggleCollapseLeft: []
  toggleCollapseRight: []
}>()

function toggleCollapse() {
  emit('toggleCollapse')
}

function toggleCollapseLeft() {
  emit('toggleCollapseLeft')
}

function toggleCollapseRight() {
  emit('toggleCollapseRight')
}
</script>

<style scoped>
.custom-node {
  background: white;
  border: 1px solid rgba(77, 171, 247,.5);
  border-radius: 8px;
  padding: 2px 18px;
  min-width: 100px;
  min-height: 30px;
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
  padding-bottom: 2px;
}

.handle {
  width: 8px;
  height: 8px;
  background: rgba(77, 171, 247, 0.2);
  border: 2px solid rgba(19, 110, 230, 0.2);
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
  left: -12px;
}

.collapse-button.right {
  right: -12px;
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

/* Dark mode */
.body--dark .custom-node {
  background: #2d3748;
  border-color: rgba(77, 171, 247, 0.4);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.body--dark .custom-node .node-content {
  color: #e2e8f0;
}

.body--dark .custom-node:hover {
  border-color: #4dabf7;
}

.body--dark .custom-node.potential-parent {
  background: #2c5282;
  border-color: #63b3ed;
}
</style>

