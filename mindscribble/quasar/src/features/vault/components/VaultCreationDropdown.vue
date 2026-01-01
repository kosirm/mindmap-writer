<template>
  <q-menu ref="menuRef" :model-value="showDropdown" @update:model-value="updateShowDropdown" auto-close>
    <q-card style="width: 300px; max-width: 80vw;">
      <q-card-section>
        <div class="text-h6">Create New Vault</div>
        <div class="text-caption text-grey-6">
          This will replace your current vault with a new empty vault.
        </div>
      </q-card-section>

      <q-card-section>
        <q-input
          v-model="vaultName"
          label="Vault Name"
          dense
          autofocus
          @keyup.enter="createVault"
          :rules="[val => !!val.trim() || 'Vault name is required']"
        />
        <q-input
          v-model="vaultDescription"
          label="Description (optional)"
          dense
          class="q-mt-sm"
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" @click="cancel" />
        <q-btn
          color="primary"
          label="Create"
          @click="createVault"
          :disable="!vaultName.trim()"
        />
      </q-card-actions>
    </q-card>
  </q-menu>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useVaultStore } from 'src/core/stores/vaultStore'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits(['update:modelValue', 'created'])

const $q = useQuasar()
const vaultStore = useVaultStore()

const vaultName = ref('')
const vaultDescription = ref('')
const showDropdown = ref(props.modelValue)

watch(() => props.modelValue, (value) => {
  showDropdown.value = value
  if (value) {
    // Reset form when opened
    vaultName.value = ''
    vaultDescription.value = ''
  }
})

function updateShowDropdown(value: boolean) {
  showDropdown.value = value
  emit('update:modelValue', value)
}

async function createVault() {
  if (!vaultName.value.trim()) return

  try {
    // Show warning about replacing current vault
    const confirm = await new Promise((resolve) => {
      $q.dialog({
        title: 'Replace Current Vault?',
        message: 'Creating a new vault will replace your current vault. All unsaved changes will be lost. Continue?',
        cancel: true,
        persistent: true
      }).onOk(() => resolve(true)).onCancel(() => resolve(false)).onDismiss(() => resolve(false))
    })

    if (!confirm) return

    // Use the updated vaultStore method that handles everything
    await vaultStore.createNewVault(vaultName.value.trim(), vaultDescription.value.trim())

    $q.notify({
      type: 'positive',
      message: `Vault "${vaultName.value}" created`,
      timeout: 2000
    })

    emit('created')
    updateShowDropdown(false)
  } catch (error) {
    console.error('Failed to create vault:', error)
    $q.notify({
      type: 'error',
      message: 'Failed to create vault',
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
