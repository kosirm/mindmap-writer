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
            clickable
            v-close-popup
            @click="handleAddView('mindmap-panel')"
            :disable="isViewTypeOpen('mindmap-panel')"
          >
            <q-item-section avatar>
              <q-icon name="account_tree" />
            </q-item-section>
            <q-item-section>Mind Map</q-item-section>
          </q-item>

          <q-item
            clickable
            v-close-popup
            @click="handleAddView('writer-panel')"
            :disable="isViewTypeOpen('writer-panel')"
          >
            <q-item-section avatar>
              <q-icon name="edit" />
            </q-item-section>
            <q-item-section>Writer</q-item-section>
          </q-item>

          <q-item
            clickable
            v-close-popup
            @click="handleAddView('outline-panel')"
            :disable="isViewTypeOpen('outline-panel')"
          >
            <q-item-section avatar>
              <q-icon name="list" />
            </q-item-section>
            <q-item-section>Outline</q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-btn>
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue'

defineOptions({
  name: 'FileControlsComponent'
})

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
</style>
