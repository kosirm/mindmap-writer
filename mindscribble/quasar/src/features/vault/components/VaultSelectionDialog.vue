<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card style="width: 350px; max-width: 80vw;">
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
        <q-btn flat label="Cancel" @click="onCancelClick" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar'

const { vaults, activeVaultId } = defineProps<{
  vaults: Array<{
    id: string
    name: string
    description: string
    created: number
  }>
  activeVaultId: string | null
}>()

// Use Quasar's dialog plugin component composable
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

// Emit events for parent component
defineEmits([
  ...useDialogPluginComponent.emits
])

function selectVault(vaultId: string) {
  onDialogOK(vaultId)
}

function onCancelClick() {
  onDialogCancel()
}
</script>

<style scoped>
/* Add any component-specific styles here */
</style>
