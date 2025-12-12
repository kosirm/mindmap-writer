import { boot } from 'quasar/wrappers'
import { defineAsyncComponent } from 'vue'

// Import dockview CSS
import 'dockview-vue/dist/styles/dockview.css'

// Import panel components
import FilePanel from 'src/pages/components/FilePanel.vue'
import FileControls from 'src/pages/components/FileControls.vue'
import GroupControls from 'src/pages/components/GroupControls.vue'

// Lazy load view components - they'll only be loaded when actually used
const MindmapPanel = defineAsyncComponent(() =>
  import('src/pages/components/MindmapPanel.vue')
)

const WriterPanel = defineAsyncComponent(() =>
  import('src/pages/components/WriterPanel.vue')
)

const OutlinePanel = defineAsyncComponent(() =>
  import('src/pages/components/OutlinePanel.vue')
)

const ConceptMapPanel = defineAsyncComponent(() =>
  import('src/pages/components/ConceptMapPanel.vue')
)

export default boot(({ app }) => {
  // Register child panel components (views)
  app.component('mindmap-panel', MindmapPanel)
  app.component('writer-panel', WriterPanel)
  app.component('outline-panel', OutlinePanel)
  app.component('concept-map-panel', ConceptMapPanel)

  // Register parent panel component (file)
  app.component('file-panel', FilePanel)

  // Register control components
  app.component('group-controls', GroupControls)
  app.component('file-controls', FileControls)

  console.log('Dockview components registered with lazy loading')
})
