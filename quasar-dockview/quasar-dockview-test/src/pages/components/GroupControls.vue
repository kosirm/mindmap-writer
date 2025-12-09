<template>
  <div class="group-controls">
    <q-btn
      flat
      dense
      round
      size="sm"
      icon="open_in_new"
      class="group-control-btn"
      @click="handleFloat"
    >
      <q-tooltip>Float Panel</q-tooltip>
    </q-btn>

    <q-btn
      flat
      dense
      round
      size="sm"
      :icon="isMaximized ? 'fullscreen_exit' : 'fullscreen'"
      class="group-control-btn"
      @click="handleMaximize"
    >
      <q-tooltip>{{ isMaximized ? 'Restore' : 'Maximize' }}</q-tooltip>
    </q-btn>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

defineOptions({
  name: 'GroupControlsComponent'
})

// Define minimal types for the props we receive
// The actual types come from dockview-core but we define them here to avoid import issues
interface FloatingGroupOptions {
  position: { top: number; left: number }
  height: number
  width: number
}

interface DockviewPanel {
  id: string
}

interface DockviewGroupPanel {
  id: string
  activeView?: string
  activePanel?: DockviewPanel
}

interface DockviewGroupPanelApi {
  id: string
  isMaximized: () => boolean
  maximize: () => void
  exitMaximized: () => void
  onDidMaximizedGroupChange: (callback: () => void) => { dispose: () => void }
  location: { type: string }
  group: DockviewGroupPanel
  accessor: DockviewApi
}

interface DockviewApi {
  addFloatingGroup: (group: DockviewGroupPanel, options?: FloatingGroupOptions) => void
  removePanel: (panel: DockviewPanel) => void
  getPanel: (id: string) => DockviewPanel | undefined
  onDidMaximizedGroupChange: (callback: () => void) => { dispose: () => void }
}

interface GroupPanelPartInitParameters {
  api: DockviewGroupPanelApi
  containerApi: DockviewApi
  group: DockviewGroupPanel
  params?: Record<string, unknown>
}

// The component receives params prop which contains api and containerApi
const props = defineProps<{
  params?: GroupPanelPartInitParameters
}>()

const isMaximized = ref(false)
let disposables: (() => void)[] = []

// Watch for params to be set
watch(() => props.params, (params) => {
  console.log('GroupControls params changed', params)

  if (params?.containerApi && params?.api) {
    // Listen to the main container API for maximize changes
    const disposable = params.containerApi.onDidMaximizedGroupChange(() => {
      // Check if this specific group is maximized
      isMaximized.value = params.api?.isMaximized() || false
    })
    disposables.push(disposable.dispose.bind(disposable))

    // Set initial state
    isMaximized.value = params.api.isMaximized() || false
  }
}, { immediate: true })

onMounted(() => {
  console.log('GroupControls mounted', { params: props.params })
})

onUnmounted(() => {
  disposables.forEach(dispose => dispose())
  disposables = []
})

function handleFloat() {
  console.log('handleFloat clicked', { params: props.params })

  if (!props.params?.api || !props.params?.group) {
    console.warn('Missing api or group')
    return
  }

  const location = props.params.api.location

  if (location.type === 'floating') {
    // Already floating, do nothing or could dock it back
    console.log('Group is already floating')
  } else {
    // Make it float
    console.log('Making group float', props.params.group)
    props.params.containerApi.addFloatingGroup(props.params.group, {
      position: { top: 100, left: 100 },
      height: 400,
      width: 600
    })
  }
}

function handleMaximize() {
  console.log('handleMaximize clicked', { params: props.params, isMaximized: isMaximized.value })

  if (!props.params?.api) {
    console.warn('Missing api')
    return
  }

  if (isMaximized.value) {
    console.log('Exiting maximized')
    props.params.api.exitMaximized()
  } else {
    console.log('Maximizing')
    props.params.api.maximize()
  }
}
</script>

<style scoped lang="scss">
.group-controls {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 4px;
  gap: 2px;
}

.group-control-btn {
  color: white !important;
  opacity: 0.7;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
    background-color: rgba(255, 255, 255, 0.1);
  }

  :deep(.q-icon) {
    color: white;
  }
}
</style>

