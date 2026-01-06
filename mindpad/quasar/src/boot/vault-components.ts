import { boot } from 'quasar/wrappers'
import VaultCreationDialog from 'src/features/vault/components/VaultCreationDialog.vue'
import VaultSelectionDialog from 'src/features/vault/components/VaultSelectionDialog.vue'

/**
 * Boot file to register vault dialog components globally
 * This allows them to be used with $q.dialog({ component: 'VaultCreationDialog' })
 */
export default boot(({ app }) => {
  // console.log('🔧 [Boot] Registering vault dialog components...')

  // Register vault dialog components
  app.component('VaultCreationDialog', VaultCreationDialog)
  app.component('VaultSelectionDialog', VaultSelectionDialog)

  // console.log('🔧 [Boot] Vault dialog components registered:', {
  //   VaultCreationDialog: !!app.component('VaultCreationDialog'),
  //   VaultSelectionDialog: !!app.component('VaultSelectionDialog')
  // })
})

