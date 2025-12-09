<template>
  <div class="mindmap-panel">
    <div class="mindmap-header q-pa-md q-pb-sm">
      <div class="text-h6">
        <q-icon name="account_tree" class="q-mr-sm" />
        Mind Map View
      </div>
      <div class="mindmap-toolbar q-mt-sm">
        <q-btn-group flat>
          <q-btn
            icon="add"
            label="Add Node"
            size="sm"
            @click="addNode"
          />
          <q-btn
            icon="zoom_in"
            label="Zoom In"
            size="sm"
            @click="zoomIn"
          />
          <q-btn
            icon="zoom_out"
            label="Zoom Out"
            size="sm"
            @click="zoomOut"
          />
          <q-btn
            icon="center_focus_strong"
            label="Fit View"
            size="sm"
            @click="fitView"
          />
        </q-btn-group>
      </div>
    </div>
    <div class="mindmap-canvas" ref="canvasRef">
      <div class="canvas-placeholder">
        <q-icon name="account_tree" size="4rem" color="grey-4" class="q-mb-md" />
        <div class="text-h6 text-grey-5 q-mb-sm">Mind Map Canvas</div>
        <div class="text-body2 text-grey-6 text-center">
          VueFlow canvas would be integrated here<br>
          with custom nodes and layout engine
        </div>
        <q-btn
          color="primary"
          label="Initialize Canvas"
          class="q-mt-md"
          @click="initializeCanvas"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const canvasRef = ref<HTMLElement>()

function addNode() {
  $q.notify({
    type: 'info',
    message: 'Add Node clicked',
    timeout: 1000
  })
}

function zoomIn() {
  $q.notify({
    type: 'info',
    message: 'Zoom In',
    timeout: 1000
  })
}

function zoomOut() {
  $q.notify({
    type: 'info',
    message: 'Zoom Out',
    timeout: 1000
  })
}

function fitView() {
  $q.notify({
    type: 'info',
    message: 'Fit View',
    timeout: 1000
  })
}

function initializeCanvas() {
  $q.notify({
    type: 'positive',
    message: 'Canvas initialized!',
    timeout: 2000
  })
}
</script>

<style scoped lang="scss">
.mindmap-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #e3f2fd; // Light blue background for visibility
}

.mindmap-header {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);

  .body--dark & {
    border-bottom-color: rgba(255, 255, 255, 0.12);
  }
}

.mindmap-toolbar {
  display: flex;
  gap: 8px;
}

.mindmap-canvas {
  flex: 1;
  position: relative;
  background: rgba(0, 0, 0, 0.02);

  .body--dark & {
    background: rgba(255, 255, 255, 0.02);
  }
}

.canvas-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
}
</style>
