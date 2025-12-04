<template>
  <div class="panel-manager row items-center q-gutter-xs">
    <!-- Left Panel Button -->
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
      <q-menu context-menu>
        <q-list style="min-width: 150px">
          <q-item-label header>Load View</q-item-label>
          <q-item
            v-for="view in availableViews"
            :key="view.type"
            clickable
            v-close-popup
            @click="panelStore.setPanelView('left', view.type)"
          >
            <q-item-section avatar>
              <q-icon :name="view.icon" />
            </q-item-section>
            <q-item-section>{{ view.label }}</q-item-section>
          </q-item>
        </q-list>
      </q-menu>
      <q-tooltip>{{ getViewLabel('left') }} (Left Panel)</q-tooltip>
    </q-btn>

    <!-- Center Panel Button -->
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
      <q-menu context-menu>
        <q-list style="min-width: 150px">
          <q-item-label header>Load View</q-item-label>
          <q-item
            v-for="view in availableViews"
            :key="view.type"
            clickable
            v-close-popup
            @click="panelStore.setPanelView('center', view.type)"
          >
            <q-item-section avatar>
              <q-icon :name="view.icon" />
            </q-item-section>
            <q-item-section>{{ view.label }}</q-item-section>
          </q-item>
        </q-list>
      </q-menu>
      <q-tooltip>{{ getViewLabel('center') }} (Center Panel)</q-tooltip>
    </q-btn>

    <!-- Right Panel Button -->
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
      <q-menu context-menu>
        <q-list style="min-width: 150px">
          <q-item-label header>Load View</q-item-label>
          <q-item
            v-for="view in availableViews"
            :key="view.type"
            clickable
            v-close-popup
            @click="panelStore.setPanelView('right', view.type)"
          >
            <q-item-section avatar>
              <q-icon :name="view.icon" />
            </q-item-section>
            <q-item-section>{{ view.label }}</q-item-section>
          </q-item>
        </q-list>
      </q-menu>
      <q-tooltip>{{ getViewLabel('right') }} (Right Panel)</q-tooltip>
    </q-btn>

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
</style>

