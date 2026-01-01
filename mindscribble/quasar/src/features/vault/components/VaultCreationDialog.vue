<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card style="width: 350px; max-width: 80vw;">
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
        <q-btn flat label="Cancel" @click="onCancelClick" />
        <q-btn
          color="primary"
          label="Create"
          @click="createVault"
          :disable="!vaultName.trim()"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useDialogPluginComponent } from 'quasar'

const vaultName = ref('')
const vaultDescription = ref('')

// Use Quasar's dialog plugin component composable
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

// Emit events for parent component
defineEmits([
  ...useDialogPluginComponent.emits
])

function createVault() {
  if (!vaultName.value.trim()) return

  onDialogOK({
    name: vaultName.value.trim(),
    description: vaultDescription.value.trim()
  })
}

function onCancelClick() {
  onDialogCancel()
}
</script>

<style scoped>
/* Add any component-specific styles here */
</style>
