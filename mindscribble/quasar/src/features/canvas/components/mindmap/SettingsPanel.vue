<template>
  <div class="settings-panel">
    <!-- Basic Controls -->
    <q-btn color="primary" label="Add Root Node" @click="$emit('add-root-node')" class="full-width q-mb-sm" />
    <q-btn outline label="Toggle Bounding Boxes" @click="$emit('toggle-bounding-boxes')" class="full-width q-mb-sm" />
    <q-btn outline label="Resolve Overlaps" @click="$emit('resolve-overlaps')" class="full-width q-mb-sm" />
    <q-btn color="secondary" label="Generate Test Data (50)" @click="$emit('generate-test-data')" class="full-width q-mb-md" />

    <q-separator class="q-my-md" />

    <!-- Layout Spacing -->
    <div class="text-subtitle2 q-mb-sm">Layout Spacing</div>
    <div class="q-mb-sm">
      <div class="text-caption">Horizontal: {{ horizontalSpacing }}px</div>
      <q-slider v-model="horizontalSpacing" :min="0" :max="50" :step="1" label @update:model-value="$emit('spacing-change', { horizontal: horizontalSpacing, vertical: verticalSpacing })" />
    </div>
    <div class="q-mb-md">
      <div class="text-caption">Vertical: {{ verticalSpacing }}px</div>
      <q-slider v-model="verticalSpacing" :min="0" :max="50" :step="1" label @update:model-value="$emit('spacing-change', { horizontal: horizontalSpacing, vertical: verticalSpacing })" />
    </div>

    <q-separator class="q-my-md" />

    <!-- Stress Test -->
    <div class="text-subtitle2 q-mb-sm">Stress Test</div>
    <q-input v-model.number="stressTestNodeCount" type="number" label="Node Count" dense outlined class="q-mb-sm" />
    <q-btn color="warning" label="Run Stress Test" @click="$emit('run-stress-test', stressTestNodeCount)" class="full-width q-mb-sm" />
    <q-btn color="negative" label="Clear All" @click="$emit('clear-all')" class="full-width q-mb-sm" />
    <q-btn outline label="Zoom to Fit" @click="$emit('zoom-to-fit')" class="full-width q-mb-sm" />

    <div class="q-mb-sm">
      <q-option-group v-model="algorithm" :options="algorithmOptions" dense inline @update:model-value="$emit('algorithm-change', algorithm)" />
    </div>

    <div class="row q-gutter-xs q-mb-md">
      <q-btn size="sm" outline label="500" @click="$emit('run-stress-test', 500)" />
      <q-btn size="sm" outline label="1K" @click="$emit('run-stress-test', 1000)" />
      <q-btn size="sm" outline label="2K" @click="$emit('run-stress-test', 2000)" />
      <q-btn size="sm" outline label="5K" @click="$emit('run-stress-test', 5000)" />
    </div>

    <q-separator class="q-my-md" />

    <!-- LOD Configuration -->
    <div class="text-subtitle2 q-mb-sm">LOD (Level of Detail)</div>
    <q-toggle v-model="lodEnabled" label="Enable LOD System" @update:model-value="$emit('lod-toggle', lodEnabled)" />
    <q-toggle v-model="showMinimap" label="Show Minimap" @update:model-value="$emit('minimap-toggle', showMinimap)" />

    <template v-if="lodEnabled">
      <div class="q-mt-sm text-caption">
        Max depth: {{ maxTreeDepth }} | Zoom: {{ zoomPercent }}% | LOD: {{ currentLodLevel }}
      </div>
      <q-input v-model.number="lodStartPercent" type="number" label="Start LOD at %" dense outlined class="q-mt-sm" @update:model-value="$emit('lod-config-change', { start: lodStartPercent, increment: lodIncrementPercent })" />
      <q-input v-model.number="lodIncrementPercent" type="number" label="Increment by %" dense outlined class="q-mt-sm" @update:model-value="$emit('lod-config-change', { start: lodStartPercent, increment: lodIncrementPercent })" />
    </template>

    <q-separator class="q-my-md" />

    <!-- Display Options -->
    <div class="text-subtitle2 q-mb-sm">Display Options</div>
    <q-toggle v-model="showCanvasCenter" label="Show Canvas Center" @update:model-value="$emit('canvas-center-toggle', showCanvasCenter)" />
    <q-toggle v-model="showZoomIndicator" label="Show Zoom Indicator" @update:model-value="$emit('zoom-indicator-toggle', showZoomIndicator)" />
    <q-select v-model="edgeType" :options="edgeTypeOptions" label="Edge Type" dense outlined emit-value map-options class="q-mt-sm" @update:model-value="$emit('edge-type-change', edgeType)" />

    <q-separator class="q-my-md" />

    <!-- Stats -->
    <div class="text-subtitle2 q-mb-sm">Stats</div>
    <div class="text-caption">Total Nodes: {{ totalNodes }}</div>
    <div class="text-caption">Root Nodes: {{ rootNodes }}</div>
    <div class="text-caption">Rendered Nodes: {{ renderedNodes }}</div>
    <div class="text-caption">Algorithm: {{ algorithm.toUpperCase() }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// Props for display values
defineProps<{
  totalNodes: number
  rootNodes: number
  renderedNodes: number
  maxTreeDepth: number
  zoomPercent: number
  currentLodLevel: number
}>()

// Emits
defineEmits<{
  'add-root-node': []
  'toggle-bounding-boxes': []
  'resolve-overlaps': []
  'generate-test-data': []
  'spacing-change': [{ horizontal: number; vertical: number }]
  'run-stress-test': [nodeCount: number]
  'clear-all': []
  'zoom-to-fit': []
  'algorithm-change': [algorithm: string]
  'lod-toggle': [enabled: boolean]
  'minimap-toggle': [show: boolean]
  'lod-config-change': [{ start: number; increment: number }]
  'canvas-center-toggle': [show: boolean]
  'zoom-indicator-toggle': [show: boolean]
  'edge-type-change': [type: string]
}>()

// Local state
const horizontalSpacing = ref(0)
const verticalSpacing = ref(0)
const stressTestNodeCount = ref(500)
const algorithm = ref('aabb')
const lodEnabled = ref(false)
const showMinimap = ref(true)
const lodStartPercent = ref(10)
const lodIncrementPercent = ref(20)
const showCanvasCenter = ref(false)
const showZoomIndicator = ref(true)
const edgeType = ref('default')

const algorithmOptions = [
  { label: 'AABB (O(n²))', value: 'aabb' },
  { label: 'RBush (O(n log n))', value: 'rbush' }
]

const edgeTypeOptions = [
  { label: 'Default', value: 'default' },
  { label: 'Straight', value: 'straight' },
  { label: 'Step', value: 'step' },
  { label: 'Smooth Step', value: 'smoothstep' },
  { label: 'Simple Bezier', value: 'simplebezier' }
]
</script>

<style scoped>
.settings-panel {
  padding: 8px;
}
</style>

