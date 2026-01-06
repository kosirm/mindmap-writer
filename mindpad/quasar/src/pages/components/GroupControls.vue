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
import { ref, onUnmounted, watch } from 'vue'
import { type DockviewApi } from 'dockview-core'

defineOptions({
  name: 'GroupControlsComponent'
})


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
  location: { type: string }
  group: DockviewGroupPanel
  accessor: DockviewApi
}


interface GroupPanelPartInitParameters {
  api: DockviewGroupPanelApi
  containerApi: DockviewApi
  group: DockviewGroupPanel
  params?: Record<string, unknown>
}

const props = defineProps<{
  params?: GroupPanelPartInitParameters
}>()

const isMaximized = ref(false)
const disposables: (() => void)[] = []

// Watch for params to be set
watch(() => props.params, (params) => {
  if (params?.containerApi && params?.api) {
    // Listen to the main container API for maximize changes
    const disposable = (params.containerApi as unknown as DockviewApi).onDidMaximizedGroupChange(() => {
      // Check if this specific group is maximized
      isMaximized.value = params.api?.isMaximized() || false
    })
    disposables.push(disposable.dispose.bind(disposable))

    // Set initial state
    isMaximized.value = params.api.isMaximized() || false
  }
}, { immediate: true })

onUnmounted(() => {
  disposables.forEach(dispose => dispose())
})

function handleFloat() {
  if (!props.params?.api || !props.params?.group) {
    console.warn('Missing api or group')
    return
  }

  const location = props.params.api.location

  if (location.type === 'floating') {
    console.log('Group is already floating')
  } else {
    // Make it float - TODO: Implement proper floating group functionality
    console.log('Float functionality not yet implemented')
    // The addFloatingGroup API requires proper DockviewGroupPanel type
    // which needs to be constructed from the dockview-core library
  }
}

function handleMaximize() {
  if (!props.params?.api) {
    console.warn('Missing api')
    return
  }

  if (isMaximized.value) {
    props.params.api.exitMaximized()
  } else {
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
  color: var(--ms-text-primary) !important;
  opacity: 0.7;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
    background-color: rgba(255, 255, 255, 0.1);
  }

  :deep(.q-icon) {
    color: var(--ms-text-primary);
  }
}
</style>
