<template>
  <div class="panel-manager row items-center q-gutter-xs">
    <!-- Left Panel Button with Dropdown -->
    <q-btn-group dense class="panel-btn-group">
      <q-btn
        :flat="panelStore.leftPanel.isCollapsed"
        :unelevated="!panelStore.leftPanel.isCollapsed"
        dense
        :color="panelStore.leftPanel.isCollapsed ? 'grey-7' : 'white'"
        :text-color="panelStore.leftPanel.isCollapsed ? 'white' : 'primary'"
        :icon="getViewIcon('left')"
        size="sm"
        @click="panelStore.togglePanel('left')"
      >
        <q-tooltip>{{ getViewLabel('left') }} - Click to toggle</q-tooltip>
      </q-btn>
      <q-btn
        :flat="panelStore.leftPanel.isCollapsed"
        :unelevated="!panelStore.leftPanel.isCollapsed"
        dense
        :color="panelStore.leftPanel.isCollapsed ? 'grey-7' : 'white'"
        :text-color="panelStore.leftPanel.isCollapsed ? 'white' : 'primary'"
        size="sm"
        icon="arrow_drop_down"
        class="dropdown-arrow"
      >
        <q-menu auto-close>
          <q-list style="min-width: 150px">
            <q-item-label header>Select View</q-item-label>
            <q-item
              v-for="view in availableViews"
              :key="view.type"
              clickable
              :active="panelStore.leftPanel.viewType === view.type"
              @click="panelStore.setPanelView('left', view.type)"
            >
              <q-item-section avatar>
                <q-icon :name="view.icon" />
              </q-item-section>
              <q-item-section>{{ view.label }}</q-item-section>
              <q-item-section side v-if="panelStore.leftPanel.viewType === view.type">
                <q-icon name="check" color="primary" size="xs" />
              </q-item-section>
            </q-item>
          </q-list>
        </q-menu>
        <q-tooltip>Change view</q-tooltip>
      </q-btn>
    </q-btn-group>

    <!-- Center Panel Button with Dropdown -->
    <q-btn-group dense class="panel-btn-group">
      <q-btn
        :flat="panelStore.centerPanel.isCollapsed"
        :unelevated="!panelStore.centerPanel.isCollapsed"
        dense
        :color="panelStore.centerPanel.isCollapsed ? 'grey-7' : 'white'"
        :text-color="panelStore.centerPanel.isCollapsed ? 'white' : 'primary'"
        :icon="getViewIcon('center')"
        size="sm"
        @click="panelStore.togglePanel('center')"
      >
        <q-tooltip>{{ getViewLabel('center') }} - Click to toggle</q-tooltip>
      </q-btn>
      <q-btn
        :flat="panelStore.centerPanel.isCollapsed"
        :unelevated="!panelStore.centerPanel.isCollapsed"
        dense
        :color="panelStore.centerPanel.isCollapsed ? 'grey-7' : 'white'"
        :text-color="panelStore.centerPanel.isCollapsed ? 'white' : 'primary'"
        size="sm"
        icon="arrow_drop_down"
        class="dropdown-arrow"
      >
        <q-menu auto-close>
          <q-list style="min-width: 150px">
            <q-item-label header>Select View</q-item-label>
            <q-item
              v-for="view in availableViews"
              :key="view.type"
              clickable
              :active="panelStore.centerPanel.viewType === view.type"
              @click="panelStore.setPanelView('center', view.type)"
            >
              <q-item-section avatar>
                <q-icon :name="view.icon" />
              </q-item-section>
              <q-item-section>{{ view.label }}</q-item-section>
              <q-item-section side v-if="panelStore.centerPanel.viewType === view.type">
                <q-icon name="check" color="primary" size="xs" />
              </q-item-section>
            </q-item>
          </q-list>
        </q-menu>
        <q-tooltip>Change view</q-tooltip>
      </q-btn>
    </q-btn-group>

    <!-- Right Panel Button with Dropdown -->
    <q-btn-group dense class="panel-btn-group">
      <q-btn
        :flat="panelStore.rightPanel.isCollapsed"
        :unelevated="!panelStore.rightPanel.isCollapsed"
        dense
        :color="panelStore.rightPanel.isCollapsed ? 'grey-7' : 'white'"
        :text-color="panelStore.rightPanel.isCollapsed ? 'white' : 'primary'"
        :icon="getViewIcon('right')"
        size="sm"
        @click="panelStore.togglePanel('right')"
      >
        <q-tooltip>{{ getViewLabel('right') }} - Click to toggle</q-tooltip>
      </q-btn>
      <q-btn
        :flat="panelStore.rightPanel.isCollapsed"
        :unelevated="!panelStore.rightPanel.isCollapsed"
        dense
        :color="panelStore.rightPanel.isCollapsed ? 'grey-7' : 'white'"
        :text-color="panelStore.rightPanel.isCollapsed ? 'white' : 'primary'"
        size="sm"
        icon="arrow_drop_down"
        class="dropdown-arrow"
      >
        <q-menu auto-close>
          <q-list style="min-width: 150px">
            <q-item-label header>Select View</q-item-label>
            <q-item
              v-for="view in availableViews"
              :key="view.type"
              clickable
              :active="panelStore.rightPanel.viewType === view.type"
              @click="panelStore.setPanelView('right', view.type)"
            >
              <q-item-section avatar>
                <q-icon :name="view.icon" />
              </q-item-section>
              <q-item-section>{{ view.label }}</q-item-section>
              <q-item-section side v-if="panelStore.rightPanel.viewType === view.type">
                <q-icon name="check" color="primary" size="xs" />
              </q-item-section>
            </q-item>
          </q-list>
        </q-menu>
        <q-tooltip>Change view</q-tooltip>
      </q-btn>
    </q-btn-group>

    <q-separator vertical inset class="q-mx-xs" />

    <!-- Focus Mode Button -->
    <q-btn
      flat
      dense
      round
      :icon="panelStore.isFocusMode ? 'fullscreen_exit' : 'fullscreen'"
      size="sm"
      @click="panelStore.toggleFocusMode"
    >
      <q-tooltip>{{ panelStore.isFocusMode ? 'Exit Focus Mode' : 'Focus Mode' }}</q-tooltip>
    </q-btn>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePanelStore } from 'src/core/stores/panelStore'
import { VIEW_CONFIGS, type PanelPosition } from 'src/core/types'

const panelStore = usePanelStore()

const availableViews = computed(() => Object.values(VIEW_CONFIGS))

function getViewIcon(position: PanelPosition): string {
  const panel = panelStore.getPanel(position)
  return VIEW_CONFIGS[panel.viewType]?.icon || 'help'
}

function getViewLabel(position: PanelPosition): string {
  const panel = panelStore.getPanel(position)
  return VIEW_CONFIGS[panel.viewType]?.label || 'Unknown'
}
</script>

<style scoped lang="scss">
.panel-manager {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 2px 4px;
}

.panel-btn-group {
  // Remove gap between buttons in group
  .q-btn {
    border-radius: 0;
  }

  .q-btn:first-child {
    padding: 4px 10px;
    border-radius: 4px 0 0 4px;
  }

  .q-btn:last-child {
    border-radius: 0 4px 4px 0;
  }
}

.dropdown-arrow {
  padding: 0 2px !important;
  min-width: 20px !important;

  :deep(.q-icon) {
    font-size: 18px;
  }
}
</style>

