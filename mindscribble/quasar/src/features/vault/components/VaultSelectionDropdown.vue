<template>
  <q-menu ref="menuRef" :model-value="showDropdown" @update:model-value="updateShowDropdown" auto-close>
    <q-card style="width: 300px; max-width: 80vw;">
      <q-card-section>
        <div class="text-h6">Select Vault</div>
        <div class="text-caption text-grey-6">
          Selecting a vault will replace your current vault.
        </div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-list dense>
          <q-item
            v-for="vault in vaults"
            :key="vault.id"
            clickable
            @click="selectVault(vault.id)"
            :active="vault.id === activeVaultId"
            active-class="bg-primary text-white"
          >
            <q-item-section avatar>
              <q-icon name="storage" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ vault.name }}</q-item-label>
              <q-item-label caption v-if="vault.description">
                {{ vault.description }}
              </q-item-label>
              <q-item-label caption>
                Created: {{ new Date(vault.created).toLocaleDateString() }}
              </q-item-label>
            </q-item-section>
            <q-item-section side v-if="vault.id === activeVaultId">
              <q-icon name="check" color="positive" />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-card-actions align="right" class="q-pa-sm">
        <q-btn flat label="Cancel" @click="cancel" />
      </q-card-actions>
    </q-card>
  </q-menu>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useVaultStore } from 'src/core/stores/vaultStore'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits(['update:modelValue', 'selected'])

const $q = useQuasar()
const vaultStore = useVaultStore()

const showDropdown = ref(props.modelValue)

// Load vaults when component is mounted
onMounted(async () => {
  await loadVaults()
})

const vaults = computed(() => vaultStore.vaults)
const activeVaultId = computed(() => vaultStore.activeVault?.id || null)

async function loadVaults() {
  try {
    await vaultStore.loadAllVaults()
  } catch (error) {
    console.error('Failed to load vaults:', error)
    $q.notify({
      type: 'error',
      message: 'Failed to load vaults',
      timeout: 3000
    })
  }
}

watch(() => props.modelValue, (value) => {
  showDropdown.value = value
  if (value) {
    // Refresh vaults list when dropdown is opened
    void loadVaults()
  }
})

function updateShowDropdown(value: boolean) {
  showDropdown.value = value
  emit('update:modelValue', value)
}

async function selectVault(vaultId: string) {
 try {
   // Show warning about replacing current vault
   const confirm = await new Promise((resolve) => {
     $q.dialog({
       title: 'Replace Current Vault?',
       message: 'Selecting another vault will replace your current vault. All unsaved changes will be lost. Continue?',
       cancel: true,
       persistent: true
     }).onOk(() => resolve(true)).onCancel(() => resolve(false)).onDismiss(() => resolve(false))
   })

   if (!confirm) return

   // Use the updated vaultStore method that handles everything
   await vaultStore.activateVault(vaultId, 'vault-toolbar')

   $q.notify({
     type: 'positive',
     message: 'Vault activated',
     timeout: 2000
   })

   emit('selected')
   updateShowDropdown(false)
 } catch (error) {
   console.error('Failed to activate vault:', error)
   $q.notify({
     type: 'error',
     message: 'Failed to activate vault',
     timeout: 3000
   })
 }
}

function cancel() {
  updateShowDropdown(false)
}
</script>

<style scoped>
/* Add any component-specific styles here */
</style>
