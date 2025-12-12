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
          <q-item
            v-for="viewType in availableViews"
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
import { inject } from 'vue'
import { getViewIcon, getViewTitle } from 'src/shared/utils/viewIcons'

defineOptions({
  name: 'FileControlsComponent'
})

// Define available view types in the order they should appear in the menu
const availableViews = [
  'mindmap-panel',
  'writer-panel',
  'outline-panel',
  'concept-map-panel'
]

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
