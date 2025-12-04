<template>
  <div
    class="concept-node"
    :class="{
      'is-parent': isParent,
      'is-leaf': !isParent
    }"
    :style="nodeStyle"
  >
    <!-- Node header/label -->
    <div class="node-header">
      <span class="node-label">{{ data.label }}</span>
    </div>

    <!-- Content area for child nodes (rendered by VueFlow's nested node system) -->
    <div v-if="isParent" class="node-content">
      <!-- Children are automatically rendered here by VueFlow -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface NodeDataProps {
  label: string
  isParent: boolean
  width: number
  height: number
}

const props = defineProps<{
  data: NodeDataProps
  nodeId: string
  isParent: boolean
}>()

const nodeStyle = computed(() => ({
  width: `${props.data.width}px`,
  height: `${props.data.height}px`,
  minWidth: props.isParent ? '200px' : '150px',
  minHeight: props.isParent ? '100px' : '50px'
}))
</script>

<style scoped>
.concept-node {
  background: white;
  border: 2px solid #4a90d9;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: box-shadow 0.2s ease;
}

.concept-node:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.concept-node.is-parent {
  background: #f8f9fa;
  border-color: #6c757d;
  border-width: 2px;
  border-style: dashed;
}

.concept-node.is-leaf {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.node-header {
  padding: 8px 12px;
  font-weight: 500;
  font-size: 14px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.is-parent .node-header {
  background: #e9ecef;
  color: #495057;
}

.is-leaf .node-header {
  border-bottom: none;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
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
</style>

