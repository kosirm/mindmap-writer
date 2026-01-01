<template>
  <div class="file-management">
    <div class="vault-title text-subtitle2 q-mb-md">
      <q-icon :name="vaultManagementIcon" class="q-mr-sm" />
      {{ vaultStore.activeVault?.name || 'Vault Management' }}
    </div>

    <!-- Vault Tree Component -->
    <VaultTree class="vault-tree-container" />
  </div>
</template>

<script setup lang="ts">
import { VaultTree } from 'src/features/vault'
import { useVaultStore } from 'src/core/stores/vaultStore'
import { getVaultIcon } from 'src/shared/utils/vaultIcons'

const vaultStore = useVaultStore()
const vaultManagementIcon = getVaultIcon('vault-management')
</script>

<style scoped lang="scss">
.file-management {
  padding: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.vault-title {
  padding-top: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  margin-bottom: 0px; // gap between title and tree toolbar
}

.vault-tree-container {
  flex: 1;
  overflow: hidden;
}
</style>
