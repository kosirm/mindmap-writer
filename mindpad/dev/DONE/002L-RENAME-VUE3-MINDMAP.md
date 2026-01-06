Here's a comprehensive list of all files, folders, imports, and references that need to be renamed from vue3-mindmap/Vue3Mindmap to mindmap/Mindmap:

Files and Folders to Rename:
Files:
mindpad/quasar/src/pages/components/Vue3MindmapPanel.vue → MindmapPanel.vue
mindpad/quasar/src/features/canvas/components/Vue3MindmapView.vue → MindmapView.vue
mindpad/quasar/src/dev/vue3MindmapSettingsStore.ts → mindmapSettingsStore.ts
mindpad/quasar/src/dev/Vue3MindmapDevTools.vue → MindmapDevTools.vue
Folders:
mindpad/quasar/src/features/canvas/components/vue3-mindmap/ → mindmap/


Imports to Update:
Component Imports:
import Vue3MindmapView from 'src/features/canvas/components/Vue3MindmapView.vue' → import MindmapView from 'src/features/canvas/components/MindmapView.vue'
import { useVue3MindmapSettingsStore } from './vue3MindmapSettingsStore' → import { useMindmapSettingsStore } from './mindmapSettingsStore'
import Vue3MindmapDevTools from './Vue3MindmapDevTools.vue' → import MindmapDevTools from './MindmapDevTools.vue'
import MindmapCore from './vue3-mindmap/MindmapCore.vue' → import MindmapCore from './mindmap/MindmapCore.vue'
import type { Data } from '../components/vue3-mindmap/types/mindmap-types' → import type { Data } from '../components/mindmap/types/mindmap-types'
Store Imports:
import { useVue3MindmapSettingsStore } from 'src/dev/vue3MindmapSettingsStore' → import { useMindmapSettingsStore } from 'src/dev/mindmapSettingsStore'
References to Update:
View Type References:
'vue3-mindmap' → 'mindmap' (in view type definitions, active view checks, etc.)
'vue3-mindmap-panel' → 'mindmap-panel' (in component registrations)
Component Names:
defineOptions({ name: 'Vue3MindmapPanelComponent' }) → defineOptions({ name: 'MindmapPanelComponent' })
Class Names:
class="vue3-mindmap-panel" → class="mindmap-panel"
class="vue3-mindmap-view" → class="mindmap-view"
class="vue3-mindmap-container" → class="mindmap-container"
class="vue3-mindmap-svg" → class="mindmap-svg"
CSS Selectors:
.vue3-mindmap-panel → .mindmap-panel
.vue3-mindmap-view → .mindmap-view
.vue3-mindmap-container → .mindmap-container
.vue3-mindmap-svg → .mindmap-svg
Store Names:
useVue3MindmapSettingsStore → useMindmapSettingsStore
defineStore('vue3MindmapSettings' → defineStore('mindmapSettings'
Function Calls:
useViewEvents('vue3-mindmap') → useViewEvents('mindmap')
documentStore.switchView('vue3-mindmap', 'vue3-mindmap') → documentStore.switchView('mindmap', 'mindmap')
documentStore.selectNode(nodeId, 'vue3-mindmap') → documentStore.selectNode(nodeId, 'mindmap')
documentStore.setNodeSide(nodeId, newSide, 'vue3-mindmap') → documentStore.setNodeSide(nodeId, newSide, 'mindmap')
documentStore.removeFromSelection(nodeId, 'vue3-mindmap') → documentStore.removeFromSelection(nodeId, 'mindmap')
documentStore.addToSelection(nodeId, 'vue3-mindmap') → documentStore.addToSelection(nodeId, 'mindmap')
documentStore.selectNodes(selectedNodes, 'vue3-mindmap') → documentStore.selectNodes(selectedNodes, 'mindmap')
documentStore.clearSelection('vue3-mindmap') → documentStore.clearSelection('mindmap')
Type References:
Vue3MindmapViewData → MindmapViewData
vue3mindmap?: Vue3MindmapViewData → mindmap?: MindmapViewData
Comments and Documentation:
// Vue3-Mindmap specific settings → // Mindmap specific settings
// vue3-mindmap uses 'left' boolean → // mindmap uses 'left' boolean
// For vue3-mindmap visualization → // For mindmap visualization
// SIDE MANAGEMENT ACTIONS (for vue3-mindmap) → // SIDE MANAGEMENT ACTIONS (for mindmap)
// Node side changed (for vue3-mindmap) → // Node side changed (for mindmap)
Configuration:
View type in view.ts: 'vue3-mindmap' → 'mindmap'
View configuration labels: 'Vue3 Mindmap' → 'Mindmap'
View descriptions: 'Vue3-based mindmap visualization' → 'Mindmap visualization'
Component registrations: 'vue3-mindmap-panel' → 'mindmap-panel'
Mobile Layout:
View option: { label: 'Mind Map', value: 'mindmap', component: MindmapView } (value was already correct)
This comprehensive list covers all the files, imports, and references that would need to be updated to rename vue3-mindmap to mindmap throughout the codebase.