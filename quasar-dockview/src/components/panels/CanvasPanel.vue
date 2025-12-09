<template>
  <div class="canvas-panel q-pa-md">
    <div class="text-h6 q-mb-md">Canvas Drawing Area</div>

    <div class="canvas-container q-pa-md">
      <svg
        ref="svgRef"
        :width="canvasWidth"
        :height="canvasHeight"
        class="canvas"
        @mousedown="startDrawing"
        @mousemove="draw"
        @mouseup="stopDrawing"
        @mouseleave="stopDrawing"
      >
        <rect
          v-for="shape in shapes"
          :key="shape.id"
          :x="shape.x"
          :y="shape.y"
          :width="shape.width"
          :height="shape.height"
          :fill="shape.color"
          :stroke="'#333'"
          :stroke-width="2"
        />
      </svg>
    </div>

    <div class="controls q-mt-md">
      <q-btn-group>
        <q-btn
          color="primary"
          label="Rectangle"
          :outline="tool !== 'rectangle'"
          @click="tool = 'rectangle'"
        />
        <q-btn
          color="secondary"
          label="Circle"
          :outline="tool !== 'circle'"
          @click="tool = 'circle'"
        />
      </q-btn-group>

      <q-space />

      <q-btn
        color="negative"
        label="Clear"
        @click="clearCanvas"
        flat
      />
    </div>

    <div class="text-caption q-mt-sm">
      Click and drag to draw shapes. Total shapes: {{ shapes.length }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'

interface Shape {
  id: number
  x: number
  y: number
  width: number
  height: number
  color: string
}

const canvasWidth = 600
const canvasHeight = 400
const tool = ref<'rectangle' | 'circle'>('rectangle')
const shapes = ref<Shape[]>([])
const isDrawing = ref(false)
const startX = ref(0)
const startY = ref(0)
const svgRef = ref<SVGElement>()

let shapeId = 0

const colors = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0']

const startDrawing = (event: MouseEvent) => {
  if (!svgRef.value) return

  const rect = svgRef.value.getBoundingClientRect()
  startX.value = event.clientX - rect.left
  startY.value = event.clientY - rect.top
  isDrawing.value = true
}

const draw = (event: MouseEvent) => {
  if (!isDrawing.value || !svgRef.value) return

  // For demo, we'll just show a preview
  // In a real implementation, you'd update a temporary shape
}

const stopDrawing = (event: MouseEvent) => {
  if (!isDrawing.value || !svgRef.value) return

  const rect = svgRef.value.getBoundingClientRect()
  const endX = event.clientX - rect.left
  const endY = event.clientY - rect.top

  const width = Math.abs(endX - startX.value)
  const height = Math.abs(endY - startY.value)

  if (width > 10 && height > 10) {
    shapes.value.push({
      id: ++shapeId,
      x: Math.min(startX.value, endX),
      y: Math.min(startY.value, endY),
      width,
      height,
      color: colors[Math.floor(Math.random() * colors.length)]
    })
  }

  isDrawing.value = false
}

const clearCanvas = () => {
  shapes.value = []
}
</script>

<style scoped>
.canvas-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.canvas-container {
  border: 1px solid var(--q-separator);
  border-radius: 4px;
  background: white;
  flex: 1;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.canvas {
  cursor: crosshair;
  background: #f5f5f5;
}

.controls {
  display: flex;
  align-items: center;
}
</style>