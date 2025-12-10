import { boot } from 'quasar/wrappers'

// Import dockview CSS
import 'dockview-vue/dist/styles/dockview.css'

// Import panel components
import DefaultPanel from 'src/pages/components/DefaultPanel.vue'
import MindmapPanel from 'src/pages/components/MindmapPanel.vue'
import WriterPanel from 'src/pages/components/WriterPanel.vue'
import OutlinePanel from 'src/pages/components/OutlinePanel.vue'
import WatermarkPanel from 'src/pages/components/Watermark.vue'
import GroupControls from 'src/pages/components/GroupControls.vue'
import FilePanel from 'src/pages/components/FilePanel.vue'
import FileControls from 'src/pages/components/FileControls.vue'

export default boot(({ app }) => {
  // Register child panel components (views)
  app.component('default-panel', DefaultPanel)
  app.component('mindmap-panel', MindmapPanel)
  app.component('writer-panel', WriterPanel)
  app.component('outline-panel', OutlinePanel)
  app.component('watermark-panel', WatermarkPanel)

  // Register parent panel component (file)
  app.component('file-panel', FilePanel)

  // Register control components
  app.component('group-controls', GroupControls)
  app.component('file-controls', FileControls)

  // console.log('Dockview components registered (nested mode)')
})

