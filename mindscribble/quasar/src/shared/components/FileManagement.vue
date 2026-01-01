<template>
  <div class="file-management">
    <div class="vault-title text-h6 q-mb-md">
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
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.vault-tree-container {
  flex: 1;
  overflow: hidden;
}
</style>
