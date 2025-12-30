<template>
  <div class="file-management">
    <div class="text-h6 q-mb-md">
      <q-icon name="folder" class="q-mr-sm" />
      Vault Management
    </div>

    <!-- Vault Tree Component -->
    <VaultTree class="vault-tree-container" />
  </div>
</template>

<script setup lang="ts">
import { VaultTree } from 'src/features/vault'
</script>

<style scoped lang="scss">
.file-management {
  padding: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.vault-tree-container {
  flex: 1;
  overflow: hidden;
}
</style>
