import { boot } from 'quasar/wrappers'

// Import dockview CSS
import 'dockview/dist/styles/dockview.css'

export default boot(({ app }) => {
  // Any additional dockview setup can go here
  console.log('Dockview boot file loaded')
})