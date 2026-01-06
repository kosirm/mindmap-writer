<template>
  <div class="file-controls" @mousedown.stop="handleMouseDown">
    <q-btn
      flat
      dense
      round
      size="sm"
      icon="add"
      class="file-control-btn"
    >
      <q-tooltip>Add View</q-tooltip>
      <q-menu>
        <q-list style="min-width: 150px">
          <!-- Only show available views based on subscription -->
          <q-item
            v-for="viewType in subscriptionAvailableViews"
            :key="viewType"
            clickable
            v-close-popup
            @click="handleAddView(viewType)"
            :disable="isViewTypeOpen(viewType)"
          >
            <q-item-section avatar>
              <q-icon :name="getViewIcon(viewType)" />
            </q-item-section>
            <q-item-section>{{ getViewTitle(viewType) }}</q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-btn>
  </div>
</template>

<script setup lang="ts">
import { inject, ref, onMounted, watch } from 'vue'
import { getViewIcon, getViewTitle } from 'src/shared/utils/viewIcons'
import { viewAvailabilityManager } from 'src/core/services/viewAvailabilityManager'
import { useAppStore } from 'src/core/stores/appStore'
import { useQuasar } from 'quasar'
import type { ViewType } from 'src/core/types/view'

defineOptions({
  name: 'FileControlsComponent'
})

const $q = useQuasar()

// Define available view types in the order they should appear in the menu
const availableViews = [
  'mindmap-panel',        // Vue3 Mind Map (default)
  'd3-mindmap-panel',
  'writer-panel',
  'outline-panel',
  'd3-concept-map-panel'
]

// Store available views based on subscription
const subscriptionAvailableViews = ref<string[]>([])

// Load available views based on subscription
async function loadAvailableViews() {
  try {
    const available = await viewAvailabilityManager.getAvailableViews()

    // Map view types to panel component names
    const viewTypeToPanelMap: Record<ViewType, string> = {
      'outline': 'outline-panel',
      'mindmap': 'mindmap-panel',
      'writer': 'writer-panel',
      'kanban': 'kanban-panel',
      'timeline': 'timeline-panel',
      'circle-pack': 'circle-pack-panel',
      'sunburst': 'sunburst-panel',
      'treemap': 'treemap-panel',
      'd3-mindmap': 'd3-mindmap-panel',
      'd3-concept-map': 'd3-concept-map-panel'
    }

    // Filter available views to only include those that are in our availableViews list
    subscriptionAvailableViews.value = available
      .map(viewType => viewTypeToPanelMap[viewType])
      .filter(panelName => availableViews.includes(panelName))

  } catch (error) {
    console.error('Failed to load available views:', error)
    // Fallback: show all views if there's an error
    subscriptionAvailableViews.value = availableViews
  }
}

// Setup appStore and watch for subscription changes
const appStore = useAppStore()

// Load available views when component mounts
onMounted(async () => {
  await loadAvailableViews()
})

// Watch for subscription plan changes
watch(() => appStore.currentSubscriptionPlan, async () => {
  await loadAvailableViews()
}, { immediate: false })

interface DockviewPanelApi {
  id: string
  setActive: () => void
}

interface DockviewPanel {
  id: string
  api: DockviewPanelApi
}

interface DockviewGroupPanel {
  id: string
  activePanel?: DockviewPanel
}

interface DockviewApi {
  getPanel: (id: string) => DockviewPanel | undefined
}

interface DockviewGroupPanelApi {
  id: string
}

interface GroupPanelPartInitParameters {
  api?: DockviewGroupPanelApi
  containerApi?: DockviewApi
  group?: DockviewGroupPanel
}

interface FilePanelApi {
  addChildPanel: (type: string) => void
  getOpenChildPanelTypes: () => string[]
}

const props = defineProps<{
  params?: GroupPanelPartInitParameters
}>()

// Inject the FilePanel API provided by the parent FilePanel component
const filePanelApi = inject<FilePanelApi>('filePanelApi', {
  addChildPanel: () => console.warn('filePanelApi not provided'),
  getOpenChildPanelTypes: () => []
})

// Activate the group's active panel on mousedown
function handleMouseDown() {
  // When clicking the + button, activate the group's active panel
  // This ensures views are added to the correct group
  if (props.params?.group?.activePanel?.api) {
    const activePanel = props.params.group.activePanel
    activePanel.api.setActive()
  }
}

function handleAddView(type: string) {
  // Check if the view is already open before adding
  const openTypes = filePanelApi.getOpenChildPanelTypes()

  if (openTypes.includes(type)) {
    // View is already open, don't add a duplicate
    return
  }

  // Check if the view is available for current subscription
  const panelName = type
  const isAvailable = subscriptionAvailableViews.value.includes(panelName)

  if (!isAvailable) {
    // Show upsell notification for premium views
    $q.notify({
      type: 'warning',
      message: 'This view requires a premium subscription',
      caption: 'Upgrade to access advanced views',
      timeout: 3000,
      actions: [
        {
          label: 'Upgrade',
          color: 'yellow',
          handler: () => {
            // TODO: Navigate to subscription page
            console.log('Navigate to subscription upgrade page')
          }
        }
      ]
    })
    return
  }

  // Add the view to the file panel
  filePanelApi.addChildPanel(type)
}

function isViewTypeOpen(type: string): boolean {
  if (filePanelApi && filePanelApi.getOpenChildPanelTypes) {
    const openTypes = filePanelApi.getOpenChildPanelTypes()
    const isOpen = openTypes.includes(type)
    return isOpen
  }
  return false
}
</script>

<style scoped lang="scss">
.file-controls {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 4px;
}

// Dark mode styles (default)
.dockview-theme-dark .file-control-btn,
.file-control-btn {
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

// Light mode styles
.dockview-theme-light .file-control-btn {
  color: rgba(0, 0, 0, 0.87) !important;
  opacity: 0.7;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
    background-color: rgba(0, 0, 0, 0.1);
  }

  :deep(.q-icon) {
    color: rgba(0, 0, 0, 0.87);
  }
}
</style>
