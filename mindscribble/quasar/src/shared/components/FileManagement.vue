<template>
  <div class="file-management">
    <div class="vault-title text-subtitle2">
      {{ vaultStore.activeVault?.name || 'Vault Management' }}
    </div>

    <!-- Vault Tree Component -->
    <VaultTree class="vault-tree-container" />
  </div>
</template>

<script setup lang="ts">
import { VaultTree } from 'src/features/vault'
import { useVaultStore } from 'src/core/stores/vaultStore'

const vaultStore = useVaultStore()
</script>

<style scoped lang="scss">
.file-management {
  padding: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.vault-title {
  padding: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  background-color: #F3F3F3;
}

.vault-tree-container {
  flex: 1;
  overflow: hidden;
}
</style>
