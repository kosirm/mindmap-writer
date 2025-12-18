<template>
  <div class="dagre-test-controls">
    <div class="text-subtitle1 q-mb-sm">
      <q-icon name="hub" class="q-mr-sm" />
      Dagre Layout Testing
    </div>

    <!-- Layout Direction Controls -->
    <div class="text-caption q-mb-xs">Layout Direction</div>
    <div class="row q-gutter-xs q-mb-sm">
      <q-btn
        size="sm"
        icon="arrow_downward"
        label="TB"
        @click="applyDagreLayout('TB')"
        :disable="!canApplyLayout"
        dense
        flat
        title="Top to Bottom"
        class="col"
      />
      <q-btn
        size="sm"
        icon="arrow_upward"
        label="BT"
        @click="applyDagreLayout('BT')"
        :disable="!canApplyLayout"
        dense
        flat
        title="Bottom to Top"
        class="col"
      />
      <q-btn
        size="sm"
        icon="arrow_forward"
        label="LR"
        @click="applyDagreLayout('LR')"
        :disable="!canApplyLayout"
        dense
        flat
        title="Left to Right"
        class="col"
      />
      <q-btn
        size="sm"
        icon="arrow_back"
        label="RL"
        @click="applyDagreLayout('RL')"
        :disable="!canApplyLayout"
        dense
        flat
        title="Right to Left"
        class="col"
      />
    </div>

    <q-separator class="q-my-sm" />

    <!-- Dagre Parameters -->
    <div class="text-caption q-mb-xs">Layout Parameters</div>

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
        :min="50"
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
        :min="20"
        :max="100"
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
        :min="5"
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
      class="full-width q-mb-sm"
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
import { useDagreService, type DagreParams } from 'src/services/dagreService'

const $q = useQuasar()
const route = useRoute()
const dagreService = useDagreService()

// Use the service's parameters
const dagreParams = dagreService.currentParams

// Target layout selection
const targetLayout = ref<'mindmap' | 'conceptmap'>('mindmap')

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

// Update parameters in service when UI changes
function updateParams() {
  dagreService.setParams(dagreParams.value)
  console.log('Dagre params updated in service:', dagreParams.value)
}

// Apply dagre layout with current parameters
function applyDagreLayout(direction: 'TB' | 'BT' | 'LR' | 'RL') {
  dagreParams.value.rankdir = direction
  applyLayoutToCurrentPage(direction)
}

// Apply to selected node
function applyToSelectedNode() {
  applyLayoutToCurrentPage(dagreParams.value.rankdir)
}

// Apply to entire graph
function applyToEntireGraph() {
  // Broadcast event to apply layout to entire graph
  broadcastDagreLayout('entire-graph', dagreParams.value)
}

// Helper function to apply layout based on current route
function applyLayoutToCurrentPage(direction: 'TB' | 'BT' | 'LR' | 'RL') {
  const currentPath = route.path

  if (currentPath.includes('/test-mindmap')) {
    // Broadcast event for mindmap page
    broadcastDagreLayout('selected-node', dagreParams.value)
    
    $q.notify({
      type: 'positive',
      message: `Applied ${direction} layout to MindMap`,
      timeout: 1000,
    })
  } else if (currentPath.includes('/test-conceptmap')) {
    // Broadcast event for conceptmap page
    broadcastDagreLayout('selected-node', dagreParams.value)
    
    $q.notify({
      type: 'positive',
      message: `Applied ${direction} layout to ConceptMap`,
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

// Broadcast dagre layout event
function broadcastDagreLayout(target: 'selected-node' | 'entire-graph', params: DagreParams) {
  const event = new CustomEvent('dagre-layout-request', {
    detail: {
      target,
      params,
      timestamp: Date.now()
    }
  })
  window.dispatchEvent(event)
  console.log('Broadcasted dagre layout event:', { target, params })
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