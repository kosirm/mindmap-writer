import { boot } from 'quasar/wrappers'

// Import dockview CSS
import 'dockview-vue/dist/styles/dockview.css'

// Import panel components
import DefaultPanel from 'src/pages/components/DefaultPanel.vue'
import MindmapPanel from 'src/pages/components/MindmapPanel.vue'
import WriterPanel from 'src/pages/components/WriterPanel.vue'
import OutlinePanel from 'src/pages/components/OutlinePanel.vue'
import WatermarkPanel from 'src/pages/components/Watermark.vue'

export default boot(({ app }) => {
  // Register dockview panel components globally
  // Using multi-word names to satisfy ESLint vue/multi-word-component-names rule
  app.component('default-panel', DefaultPanel)
  app.component('mindmap-panel', MindmapPanel)
  app.component('writer-panel', WriterPanel)
  app.component('outline-panel', OutlinePanel)
  app.component('watermark-panel', WatermarkPanel)

  console.log('Dockview components registered')
})

