<template>
  <div
    class="concept-node"
    :class="{
      'is-parent': isParent,
      'is-leaf': !isParent
    }"
  >
    <!-- Node header/label -->
    <div class="node-header">
      <span class="node-label">{{ data.label }}</span>
    </div>

    <!-- Content area for child nodes (rendered by VueFlow's nested node system) -->
    <div v-if="isParent" class="node-content">
      <!-- Children are automatically rendered here by VueFlow -->
    </div>

    <!-- Handles for connections - 4 sides (matching mindmap node) -->
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

interface NodeDataProps {
  label: string
  isParent?: boolean
}

defineProps<{
  data: NodeDataProps
  nodeId: string
  isParent: boolean
}>()
</script>

<style scoped>
/* Base node style - matching mindmap CustomNode */
.concept-node {
  width: 100%;
  height: 100%;
  min-width: 100px;
  min-height: 30px;
  background: white;
  border: 1px solid rgba(77, 171, 247, 0.5);
  border-radius: 8px;
  padding: 2px 18px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.concept-node:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  border-color: #339af0;
}

/* Parent nodes (containers) - dashed border to indicate they contain children */
.concept-node.is-parent {
  background: #f8f9fa;
  border-color: rgba(77, 171, 247, 0.5);
  border-width: 2px;
  border-style: dashed;
}

/* Leaf nodes - same style as mindmap nodes */
.concept-node.is-leaf {
  background: white;
}

.node-header {
  font-weight: 500;
  font-size: 14px;
  color: #212529;
  text-align: center;
}

.is-parent .node-header {
  background: #e9ecef;
  color: #495057;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.is-leaf .node-header {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding-bottom: 2px;
}

.node-content {
  position: relative;
  flex: 1;
  min-height: 60px;
}

.node-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Handles - matching mindmap node handles */
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

/* Dark mode */
:global(.body--dark) .concept-node {
  background: #2d3748;
  border-color: rgba(77, 171, 247, 0.4);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

:global(.body--dark) .concept-node .node-header {
  color: #e2e8f0;
}

:global(.body--dark) .concept-node:hover {
  border-color: #4dabf7;
}

:global(.body--dark) .concept-node.is-parent {
  background: #1e1e1e;
  border-color: rgba(77, 171, 247, 0.4);
}

:global(.body--dark) .is-parent .node-header {
  background: #333;
  color: #e0e0e0;
}
</style>

