<template>
  <div class="dagre-test-controls">
    <div class="text-subtitle1 q-mb-sm">
      <q-icon name="hub" class="q-mr-sm" />
      Dagre Layout Testing
    </div>

    <!-- Generation-based Node Coloring Toggle -->
    <div class="q-mb-sm">
      <q-toggle
        v-model="generationColoringEnabled"
        label="Color Nodes by Generation"
        dense
        @update:model-value="onGenerationColoringChange"
      />
      <div class="text-caption text-grey-6 q-ml-lg">
        Different colors for each generation level
      </div>
    </div>

    <q-separator class="q-my-sm" />

    <!-- Layout Type Selection -->
    <div class="text-caption q-mb-xs">Layout Type</div>
    <q-select
      v-model="currentLayoutType"
      :options="[
        { label: 'Tree', value: 'tree', icon: 'account_tree' },
        { label: 'Circular', value: 'circular', icon: 'circle' },
        { label: 'MindMap', value: 'mindmap', icon: 'arrow_left' },
        { label: 'Boxes', value: 'boxes', icon: 'view_quilt' }
      ]"
      label="Select Layout Type"
      dense
      class="full-width q-mb-sm"
      @update:model-value="onLayoutTypeChange"
      option-value="value"
      option-label="label"
      option-icon="icon"
      emit-value
      map-options
    />

    <q-separator class="q-my-sm" />

    <!-- Layout-Specific Parameters -->
    <div class="text-caption q-mb-xs">Layout Parameters</div>

    <!-- Tree Layout Parameters (Dagre) -->
    <div v-if="currentLayoutType === 'tree'">
      <div class="q-mb-sm">
        <div class="text-caption">rankdir: {{ dagreParams.rankdir }}</div>
        <q-select
          v-model="dagreParams.rankdir"
          :options="['TB', 'BT', 'LR', 'RL']"
          dense
          size="sm"
          class="full-width"
          @update:model-value="updateParams"
        />
      </div>

      <div class="q-mb-sm">
        <div class="text-caption">ranksep: {{ dagreParams.ranksep }}px</div>
        <q-slider
          v-model="dagreParams.ranksep"
          :min="0"
          :max="200"
          :step="10"
          dense
          class="full-width"
          @change="updateParams"
        />
      </div>

      <div class="q-mb-sm">
        <div class="text-caption">nodesep: {{ dagreParams.nodesep }}px</div>
        <q-slider
          v-model="dagreParams.nodesep"
          :min="0"
          :max="300"
          :step="5"
          dense
          class="full-width"
          @change="updateParams"
        />
      </div>

      <div class="q-mb-sm">
        <div class="text-caption">edgesep: {{ dagreParams.edgesep }}px</div>
        <q-slider
          v-model="dagreParams.edgesep"
          :min="0"
          :max="50"
          :step="5"
          dense
          class="full-width"
          @change="updateParams"
        />
      </div>

      <div class="q-mb-sm">
        <div class="text-caption">align: {{ dagreParams.align }}</div>
        <q-select
          v-model="dagreParams.align"
          :options="['UL', 'UR', 'DL', 'DR']"
          dense
          size="sm"
          class="full-width"
          @update:model-value="updateParams"
        />
      </div>
    </div>

    <!-- Circular Layout Parameters -->
    <div v-if="currentLayoutType === 'circular'">
      <div class="q-mb-sm">
        <div class="text-caption">Inner Radius: {{ circularParams.innerRadius }}px</div>
        <q-slider
          v-model="circularParams.innerRadius"
          :min="50"
          :max="300"
          :step="10"
          dense
          class="full-width"
          @change="updateCircularParams"
        />
      </div>

      <div class="q-mb-sm">
        <div class="text-caption">Level Spacing: {{ circularParams.levelSpacing }}px</div>
        <q-slider
          v-model="circularParams.levelSpacing"
          :min="80"
          :max="200"
          :step="10"
          dense
          class="full-width"
          @change="updateCircularParams"
        />
      </div>

      <div class="q-mb-sm">
        <div class="text-caption">Start Angle: {{ circularParams.startAngle }}°</div>
        <q-slider
          v-model="circularParams.startAngle"
          :min="-180"
          :max="180"
          :step="1"
          dense
          class="full-width"
          @change="updateCircularParams"
        />
      </div>

      <div class="q-mb-sm">
        <div class="text-caption">Minimum Sector Angle: {{ circularParams.minSectorAngle }}°</div>
        <q-slider
          v-model="circularParams.minSectorAngle"
          :min="15"
          :max="90"
          :step="5"
          dense
          class="full-width"
          @change="updateCircularParams"
        />
      </div>

      <div class="q-mb-sm">
        <div class="text-caption">Spacing Ratio: {{ circularParams.spacingRatio }}</div>
        <q-slider
          v-model="circularParams.spacingRatio"
          :min="-30"
          :max="30.0"
          :step="0.01"
          dense
          class="full-width"
          @change="updateCircularParams"
        />
        <div class="text-caption text-grey-6 q-ml-lg">
          North/South vs East/West spacing ratio
        </div>
      </div>

      <div class="q-mb-sm">
        <div class="text-caption">Direction: {{ circularParams.clockwise ? 'Clockwise' : 'Counter-clockwise' }}</div>
        <q-toggle
          v-model="circularParams.clockwise"
          label="Clockwise"
          dense
          @update:model-value="updateCircularParams"
        />
      </div>
    </div>

    <!-- MindMap Layout Parameters -->
    <div v-if="currentLayoutType === 'mindmap'">
      <div class="q-mb-sm">
        <div class="text-caption">Side: {{ mindmapParams.side }}</div>
        <q-select
          v-model="mindmapParams.side"
          :options="['left', 'right']"
          dense
          size="sm"
          class="full-width"
          @update:model-value="updateMindMapParams"
        />
      </div>

      <div class="q-mb-sm">
        <div class="text-caption">Branch Spacing: {{ mindmapParams.branchSpacing }}px</div>
        <q-slider
          v-model="mindmapParams.branchSpacing"
          :min="30"
          :max="150"
          :step="5"
          dense
          class="full-width"
          @change="updateMindMapParams"
        />
      </div>

      <div class="q-mb-sm">
        <div class="text-caption">Level Distance: {{ mindmapParams.levelDistance }}px</div>
        <q-slider
          v-model="mindmapParams.levelDistance"
          :min="50"
          :max="300"
          :step="10"
          dense
          class="full-width"
          @change="updateMindMapParams"
        />
      </div>
    </div>

    <!-- Box Layout Parameters -->
    <div v-if="currentLayoutType === 'boxes'">
      <div class="q-mb-sm">
        <div class="text-caption">Box Width: {{ boxParams.boxWidth }}px</div>
        <q-slider
          v-model="boxParams.boxWidth"
          :min="100"
          :max="300"
          :step="10"
          dense
          class="full-width"
          @change="updateBoxParams"
        />
      </div>

      <div class="q-mb-sm">
        <div class="text-caption">Box Height: {{ boxParams.boxHeight }}px</div>
        <q-slider
          v-model="boxParams.boxHeight"
          :min="80"
          :max="250"
          :step="10"
          dense
          class="full-width"
          @change="updateBoxParams"
        />
      </div>

      <div class="q-mb-sm">
        <div class="text-caption">Padding: {{ boxParams.padding }}px</div>
        <q-slider
          v-model="boxParams.padding"
          :min="10"
          :max="50"
          :step="5"
          dense
          class="full-width"
          @change="updateBoxParams"
        />
      </div>
    </div>

    <!-- Center Cross Toggle -->
    <div class="q-mb-sm">
      <q-toggle
        v-model="showCenterCross"
        label="Show Center Cross"
        dense
        @update:model-value="onCenterCrossToggle"
      />
      <div class="text-caption text-grey-6 q-ml-lg">
        Visual indicator of canvas center
      </div>
    </div>

    <q-separator class="q-my-sm" />

    <!-- Apply to Selection -->
    <q-btn
      outline
      size="sm"
      label="Apply to Selected Node"
      icon="play_arrow"
      class="full-width q-mb-xs"
      @click="applyToSelectedNode"
      :disable="!canApplyLayout"
    />

    <q-btn
      outline
      size="sm"
      label="Apply to Entire Graph"
      icon="play_circle"
      class="full-width q-mb-xs"
      @click="applyToEntireGraph"
      :disable="!canApplyLayout"
    />

    <q-separator class="q-my-sm" />

    <!-- Target Selection -->
    <div class="text-caption q-mb-xs">Target Layout</div>
    <q-btn-toggle
      v-model="targetLayout"
      :options="[
        { label: 'MindMap', value: 'mindmap' },
        { label: 'ConceptMap', value: 'conceptmap' }
      ]"
      size="sm"
      dense
      no-caps
      class="q-mb-sm"
    />

    <div class="text-caption text-grey-6">
      Current route: {{ currentRoute }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { useDagreService, type LayoutType, type LayoutConfig, type DagreParams, type CircularLayoutParams, type MindMapLayoutParams, type BoxLayoutParams } from 'src/services/dagreService'

const $q = useQuasar()
const route = useRoute()
const dagreService = useDagreService()

// Use the service's parameters
const dagreParams = dagreService.currentParams
const circularParams = dagreService.currentCircularParams
const mindmapParams = dagreService.currentMindMapParams
const boxParams = dagreService.currentBoxParams
const currentLayoutType = dagreService.currentLayoutType

// Target layout selection
const targetLayout = ref<'mindmap' | 'conceptmap'>('mindmap')

// Generation-based node coloring toggle
const generationColoringEnabled = ref(false)

// Center cross visibility toggle
const showCenterCross = ref(false)

// Current route for debugging
const currentRoute = computed(() => route.path)

// Check if we can apply layout (need to be on a test page)
const canApplyLayout = computed(() => {
  return currentRoute.value.includes('/test-')
})

// Watch for target layout changes
watch(targetLayout, (newTarget) => {
  console.log('Target layout changed to:', newTarget)
})

// Layout type change handler
function onLayoutTypeChange(newType: LayoutType) {
  dagreService.setLayoutType(newType)
  console.log('Layout type changed to:', newType)
}

// Generation coloring change handler
function onGenerationColoringChange(enabled: boolean) {
  // Broadcast the generation coloring setting to the graph component
  const event = new CustomEvent('generation-coloring-toggle', {
    detail: {
      enabled,
      timestamp: Date.now()
    }
  })
  window.dispatchEvent(event)
  console.log('Generation coloring changed to:', enabled)
}

// Center cross toggle handler
function onCenterCrossToggle(enabled: boolean) {
  // Broadcast the center cross visibility setting to the graph component
  const event = new CustomEvent('center-cross-toggle', {
    detail: {
      enabled,
      timestamp: Date.now()
    }
  })
  window.dispatchEvent(event)
  console.log('Center cross visibility changed to:', enabled)
}

// Update parameters in service when UI changes
function updateParams() {
  dagreService.setParams(dagreParams.value)
  console.log('Dagre params updated in service:', dagreParams.value)
}

function updateCircularParams() {
  dagreService.setCircularParams(circularParams.value)
  console.log('Circular params updated:', circularParams.value)
}

function updateMindMapParams() {
  dagreService.setMindMapParams(mindmapParams.value)
  console.log('MindMap params updated:', mindmapParams.value)
}

function updateBoxParams() {
  dagreService.setBoxParams(boxParams.value)
  console.log('Box params updated:', boxParams.value)
}

// Apply layout with current configuration
function applyLayoutToCurrentPage() {
  const config = dagreService.getCurrentLayoutConfig()
  console.log('Applying layout with config:', config)
  
  const currentPath = route.path
  
  if (currentPath.includes('/test-mindmap')) {
    broadcastLayoutRequest('selected-node', config)
    
    $q.notify({
      type: 'positive',
      message: `Applied ${config.type} layout to MindMap`,
      timeout: 1000,
    })
  } else if (currentPath.includes('/test-conceptmap')) {
    broadcastLayoutRequest('selected-node', config)
    
    $q.notify({
      type: 'positive',
      message: `Applied ${config.type} layout to ConceptMap`,
      timeout: 1000,
    })
  } else {
    $q.notify({
      type: 'warning',
      message: 'Not on a supported test page',
      timeout: 1000,
    })
  }
}

// Apply to selected node
function applyToSelectedNode() {
  applyLayoutToCurrentPage()
}

// Apply to entire graph
function applyToEntireGraph() {
  const config = dagreService.getCurrentLayoutConfig()
  broadcastLayoutRequest('entire-graph', config)
}

// Broadcast layout request event
function broadcastLayoutRequest(target: 'selected-node' | 'entire-graph', config: LayoutConfig) {
  // Extract the correct parameters based on layout type
  let params: DagreParams | CircularLayoutParams | MindMapLayoutParams | BoxLayoutParams | undefined
  
  switch (config.type) {
    case 'tree':
      params = config.dagreParams
      break
    case 'circular':
      params = config.circularParams
      break
    case 'mindmap':
      params = config.mindmapParams
      break
    case 'boxes':
      params = config.boxParams
      break
    default:
      params = dagreService.currentParams.value // fallback
  }
  
  const event = new CustomEvent('dagre-layout-request', {
    detail: {
      target,
      params,  // Use 'params' for backward compatibility
      config,  // Also include full config for future use
      timestamp: Date.now()
    }
  })
  window.dispatchEvent(event)
  console.log('Broadcasted dagre layout request event:', { target, params, config })
}

onMounted(() => {
  console.log('DagreTestControls mounted, ready to broadcast layout events')
})
</script>

<style scoped>
.dagre-test-controls {
  padding: 8px 0;
}

.text-caption {
  font-size: 0.75rem;
  color: #666;
  margin-bottom: 4px;
}
</style>
