import { boot } from 'quasar/wrappers'
import { defineAsyncComponent } from 'vue'

// Import dockview CSS
import 'dockview-vue/dist/styles/dockview.css'

// Import panel components
import FilePanel from 'src/pages/components/FilePanel.vue'
import FileControls from 'src/pages/components/FileControls.vue'
import GroupControls from 'src/pages/components/GroupControls.vue'
import ViewTab from 'src/pages/components/ViewTab.vue'
import FileTab from 'src/pages/components/FileTab.vue'

// Lazy load view components - they'll only be loaded when actually used
const MindmapPanel = defineAsyncComponent(() =>
  import('src/pages/components/Vue3MindmapPanel.vue')
)

const WriterPanel = defineAsyncComponent(() =>
  import('src/pages/components/WriterPanel.vue')
)

const OutlinePanel = defineAsyncComponent(() =>
  import('src/pages/components/OutlinePanel.vue')
)


const D3MindmapPanel = defineAsyncComponent(() =>
  import('src/pages/components/D3MindmapPanel.vue')
)

const D3ConceptMapPanel = defineAsyncComponent(() =>
  import('src/pages/components/D3ConceptMapPanel.vue')
)

const Vue3MindmapPanel = defineAsyncComponent(() =>
  import('src/pages/components/Vue3MindmapPanel.vue')
)

export default boot(({ app }) => {
  // Register child panel components (views)
  app.component('mindmap-panel', MindmapPanel)
  app.component('writer-panel', WriterPanel)
  app.component('outline-panel', OutlinePanel)
  app.component('d3-mindmap-panel', D3MindmapPanel)
  app.component('d3-concept-map-panel', D3ConceptMapPanel)
  app.component('vue3-mindmap-panel', Vue3MindmapPanel)

  // Register parent panel component (file)
  app.component('file-panel', FilePanel)

  // Register control components
  app.component('group-controls', GroupControls)
  app.component('file-controls', FileControls)

  // Register custom tab components
  app.component('view-tab', ViewTab)
  app.component('file-tab', FileTab)

  // console.log('Dockview components registered with lazy loading')
})
