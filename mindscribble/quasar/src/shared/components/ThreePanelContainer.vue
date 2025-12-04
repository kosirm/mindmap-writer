<template>
  <div class="three-panel-container">
    <!-- Left Panel -->
    <div
      v-show="!panelStore.leftPanel.isCollapsed"
      class="panel left-panel"
      :style="getLeftPanelStyle()"
    >
      <div class="panel-header">
        <q-icon :name="getViewIcon('left')" size="xs" class="q-mr-xs" />
        <span class="panel-title">{{ getViewLabel('left') }}</span>
        <q-space />
        <q-btn flat dense round size="xs" icon="close" @click="panelStore.collapsePanel('left')" />
      </div>
      <div class="panel-content">
        <component :is="getViewComponent('left')" />
      </div>
      <!-- Resize handle (only show when center is visible) -->
      <div
        v-if="!panelStore.centerPanel.isCollapsed"
        class="resize-handle resize-handle-right"
        @mousedown="startResize('left', $event)"
      />
    </div>

    <!-- Center Panel -->
    <div
      v-show="!panelStore.centerPanel.isCollapsed"
      class="panel center-panel"
    >
      <div class="panel-header">
        <q-icon :name="getViewIcon('center')" size="xs" class="q-mr-xs" />
        <span class="panel-title">{{ getViewLabel('center') }}</span>
      </div>
      <div class="panel-content">
        <component :is="getViewComponent('center')" />
      </div>
    </div>

    <!-- Right Panel -->
    <div
      v-show="!panelStore.rightPanel.isCollapsed"
      class="panel right-panel"
      :style="getRightPanelStyle()"
    >
      <!-- Resize handle (only show when center is visible) -->
      <div
        v-if="!panelStore.centerPanel.isCollapsed"
        class="resize-handle resize-handle-left"
        @mousedown="startResize('right', $event)"
      />
      <div class="panel-header">
        <q-icon :name="getViewIcon('right')" size="xs" class="q-mr-xs" />
        <span class="panel-title">{{ getViewLabel('right') }}</span>
        <q-space />
        <q-btn flat dense round size="xs" icon="close" @click="panelStore.collapsePanel('right')" />
      </div>
      <div class="panel-content">
        <component :is="getViewComponent('right')" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineAsyncComponent, type Component } from 'vue'
import { usePanelStore } from 'src/core/stores/panelStore'
import { VIEW_CONFIGS, type PanelPosition, type ViewType } from 'src/core/types'

const panelStore = usePanelStore()

// Lazy-loaded view components
const viewComponents: Record<ViewType, Component> = {
  outline: defineAsyncComponent(() => import('src/features/tree/components/OutlineView.vue')),
  mindmap: defineAsyncComponent(() => import('src/features/canvas/components/MindmapView.vue')),
  'concept-map': defineAsyncComponent(() => import('src/features/canvas/components/ConceptMapView.vue')),
  writer: defineAsyncComponent(() => import('src/features/writer/components/WriterView.vue')),
  'circle-pack': defineAsyncComponent(() => import('src/features/canvas/components/PlaceholderView.vue')),
  sunburst: defineAsyncComponent(() => import('src/features/canvas/components/PlaceholderView.vue')),
  treemap: defineAsyncComponent(() => import('src/features/canvas/components/PlaceholderView.vue')),
  timeline: defineAsyncComponent(() => import('src/features/canvas/components/PlaceholderView.vue'))
}

function getViewIcon(position: PanelPosition): string {
  const panel = panelStore.getPanel(position)
  return VIEW_CONFIGS[panel.viewType]?.icon || 'help'
}

function getViewLabel(position: PanelPosition): string {
  const panel = panelStore.getPanel(position)
  return VIEW_CONFIGS[panel.viewType]?.label || 'Unknown'
}

function getViewComponent(position: PanelPosition): Component {
  const panel = panelStore.getPanel(position)
  return viewComponents[panel.viewType]
}

// Dynamic panel styles based on collapse state
function getLeftPanelStyle(): Record<string, string> {
  const leftCollapsed = panelStore.leftPanel.isCollapsed
  const centerCollapsed = panelStore.centerPanel.isCollapsed
  const rightCollapsed = panelStore.rightPanel.isCollapsed

  // If only left panel is visible, take full width
  if (!leftCollapsed && centerCollapsed && rightCollapsed) {
    return { flex: '1' }
  }
  // If center is collapsed but right is visible, left takes remaining space
  if (!leftCollapsed && centerCollapsed && !rightCollapsed) {
    return { flex: '1' }
  }
  // Normal case: fixed width
  return { width: panelStore.leftPanel.width + 'px' }
}

function getRightPanelStyle(): Record<string, string> {
  const leftCollapsed = panelStore.leftPanel.isCollapsed
  const centerCollapsed = panelStore.centerPanel.isCollapsed
  const rightCollapsed = panelStore.rightPanel.isCollapsed

  // If only right panel is visible, take full width
  if (leftCollapsed && centerCollapsed && !rightCollapsed) {
    return { flex: '1' }
  }
  // If center is collapsed but left is visible, right takes remaining space
  if (!leftCollapsed && centerCollapsed && !rightCollapsed) {
    return { flex: '1' }
  }
  // Normal case: fixed width
  return { width: panelStore.rightPanel.width + 'px' }
}

// Resize functionality
const isResizing = ref(false)
const resizingPanel = ref<'left' | 'right' | null>(null)
const startX = ref(0)
const startWidth = ref(0)

function startResize(panel: 'left' | 'right', event: MouseEvent) {
  isResizing.value = true
  resizingPanel.value = panel
  startX.value = event.clientX
  startWidth.value = panelStore.getPanel(panel).width

  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function onResize(event: MouseEvent) {
  if (!isResizing.value || !resizingPanel.value) return

  const delta = event.clientX - startX.value
  const newWidth = resizingPanel.value === 'left'
    ? startWidth.value + delta
    : startWidth.value - delta

  panelStore.setPanelWidth(resizingPanel.value, newWidth)
}

function stopResize() {
  isResizing.value = false
  resizingPanel.value = null
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''

  // Save layout after resize
  panelStore.saveLayout()
}
</script>

<style scoped lang="scss">
.three-panel-container {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.panel {
  display: flex;
  flex-direction: column;
  position: relative;
  height: 100%;
  background: var(--q-dark-page, white);
  border: 1px solid rgba(0, 0, 0, 0.12);
}

.left-panel,
.right-panel {
  flex-shrink: 0;
  min-width: 200px;
}

.center-panel {
  flex: 1;
  min-width: 200px;
}

.panel-header {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.03);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  font-size: 0.8rem;
  font-weight: 500;
  flex-shrink: 0;
}

.panel-title {
  color: rgba(0, 0, 0, 0.7);
}

.panel-content {
  flex: 1;
  overflow: auto;
  height: 0; // Important: allows flex to calculate height properly
}

.resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: col-resize;
  background: transparent;
  z-index: 10;

  &:hover {
    background: rgba(var(--q-primary-rgb), 0.3);
  }
}

.resize-handle-right {
  right: 0;
}

.resize-handle-left {
  left: 0;
}
</style>

