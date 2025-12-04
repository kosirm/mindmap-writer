<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />
        <q-toolbar-title>MindScribble</q-toolbar-title>
        <q-btn flat dense round icon="dark_mode" @click="toggleDarkMode" />
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered :width="320" class="settings-drawer">
      <q-scroll-area class="fit">
        <div class="q-pa-sm">
          <div class="text-h6 q-mb-md q-px-sm">Settings</div>
          <SettingsPanel
            :total-nodes="mindmapStats.totalNodes"
            :root-nodes="mindmapStats.rootNodes"
            :rendered-nodes="mindmapStats.renderedNodes"
            :max-tree-depth="mindmapStats.maxTreeDepth"
            :zoom-percent="mindmapStats.zoomPercent"
            :current-lod-level="mindmapStats.currentLodLevel"
            @add-root-node="onAddRootNode"
            @toggle-bounding-boxes="onToggleBoundingBoxes"
            @resolve-overlaps="onResolveOverlaps"
            @generate-test-data="onGenerateTestData"
            @spacing-change="onSpacingChange"
            @run-stress-test="onRunStressTest"
            @clear-all="onClearAll"
            @zoom-to-fit="onZoomToFit"
            @algorithm-change="onAlgorithmChange"
            @lod-toggle="onLodToggle"
            @minimap-toggle="onMinimapToggle"
            @lod-config-change="onLodConfigChange"
            @canvas-center-toggle="onCanvasCenterToggle"
            @zoom-indicator-toggle="onZoomIndicatorToggle"
            @edge-type-change="onEdgeTypeChange"
          />
        </div>
      </q-scroll-area>
    </q-drawer>

    <q-page-container>
      <router-view v-slot="{ Component }">
        <component :is="Component" ref="pageRef" />
      </router-view>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import SettingsPanel from 'src/components/mindmap/SettingsPanel.vue'

const $q = useQuasar()
const leftDrawerOpen = ref(true)

// Get ref to the page component (IndexPage)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pageRef = ref<any>(null)

// Get mindmap ref from page component
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mindmapRef = computed<any>(() => pageRef.value?.mindmapRef)

// Computed stats from mindmap
const mindmapStats = computed(() => {
  const mm = mindmapRef?.value
  if (!mm) return { totalNodes: 0, rootNodes: 0, renderedNodes: 0, maxTreeDepth: 0, zoomPercent: 100, currentLodLevel: 0 }
  return {
    totalNodes: mm.nodes?.length ?? 0,
    rootNodes: mm.rootNodes?.length ?? 0,
    renderedNodes: mm.renderedNodeCount ?? 0,
    maxTreeDepth: mm.maxTreeDepth ?? 0,
    zoomPercent: mm.zoomPercent ?? 100,
    currentLodLevel: mm.currentLodLevel ?? 0
  }
})

function toggleLeftDrawer() { leftDrawerOpen.value = !leftDrawerOpen.value }
function toggleDarkMode() { $q.dark.toggle() }

// Event handlers - delegate to mindmap
function onAddRootNode() { mindmapRef?.value?.addRootNode?.() }
function onToggleBoundingBoxes() { if (mindmapRef?.value) mindmapRef.value.showBoundingBoxes = !mindmapRef.value.showBoundingBoxes }
function onResolveOverlaps() { mindmapRef?.value?.resolveAllOverlaps?.() }
function onGenerateTestData() {
  // Use the page-level generateTestData which handles both views
  if (pageRef.value?.generateTestData) {
    void pageRef.value.generateTestData()
  } else {
    // Fallback to direct mindmap call
    mindmapRef?.value?.generateNodeTree?.()
  }
}
function onSpacingChange(spacing: { horizontal: number; vertical: number }) { mindmapRef?.value?.setSpacing?.(spacing.horizontal, spacing.vertical) }
function onRunStressTest(count: number) {
  console.log('onRunStressTest called with count:', count, 'mindmapRef:', mindmapRef?.value)
  if (mindmapRef?.value) {
    console.log('Setting generatorNodeCount to', count)
    mindmapRef.value.generatorNodeCount = count
    console.log('Calling generateAndLayoutMindmap')
    mindmapRef.value.generateAndLayoutMindmap?.()
  }
}
function onClearAll() { mindmapRef?.value?.clearAllNodes?.() }
function onZoomToFit() { mindmapRef?.value?.fitView?.() }
function onAlgorithmChange(algo: string) { if (mindmapRef?.value) mindmapRef.value.algorithm = algo }
function onLodToggle(enabled: boolean) { if (mindmapRef?.value) mindmapRef.value.lodEnabled = enabled }
function onMinimapToggle(show: boolean) {
  console.log('onMinimapToggle called with:', show, 'mindmapRef:', !!mindmapRef?.value)
  if (mindmapRef?.value) {
    console.log('Setting showMinimap to', show, 'was:', mindmapRef.value.showMinimap)
    mindmapRef.value.showMinimap = show
  }
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function onLodConfigChange(config: { start: number; increment: number }) { /* TODO: implement */ }
function onCanvasCenterToggle(show: boolean) { if (mindmapRef?.value) mindmapRef.value.showCanvasCenter = show }
function onZoomIndicatorToggle(show: boolean) { if (mindmapRef?.value) mindmapRef.value.showZoomIndicator = show }
function onEdgeTypeChange(type: string) { if (mindmapRef?.value) mindmapRef.value.edgeType = type }
</script>

<style lang="scss">
.settings-drawer {
  .q-scroll-area {
    height: 100%;
  }
}
</style>
