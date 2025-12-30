<template>
  <div class="vault-toolbar">
    <!-- Vault Operations -->
    <div class="toolbar-section">
      <q-btn flat dense icon="add" size="sm" @click="$emit('new-vault')">
        <q-tooltip>New Vault</q-tooltip>
      </q-btn>
      <q-btn flat dense icon="folder_open" size="sm" @click="$emit('open-vault')">
        <q-tooltip>Open Vault</q-tooltip>
      </q-btn>
      <q-btn flat dense icon="delete" size="sm" @click="$emit('delete-vault')">
        <q-tooltip>Delete Vault</q-tooltip>
      </q-btn>
    </div>

    <q-separator vertical inset class="q-mx-sm" />

    <!-- File Operations -->
    <div class="toolbar-section">
      <q-btn flat dense icon="note_add" size="sm" @click="$emit('add-file')">
        <q-tooltip>Add File</q-tooltip>
      </q-btn>
      <q-btn flat dense icon="create_new_folder" size="sm" @click="$emit('add-folder')">
        <q-tooltip>Add Folder</q-tooltip>
      </q-btn>
    </div>

    <q-separator vertical inset class="q-mx-sm" />

    <!-- View Controls -->
    <div class="toolbar-section">
      <q-btn flat dense icon="unfold_more" size="sm" @click="$emit('expand-all')">
        <q-tooltip>Expand all</q-tooltip>
      </q-btn>
      <q-btn flat dense icon="unfold_less" size="sm" @click="$emit('collapse-all')">
        <q-tooltip>Collapse all</q-tooltip>
      </q-btn>
    </div>

    <q-space />

    <!-- Edit Mode Toggle -->
    <q-btn
      flat
      dense
      :icon="isEditMode ? 'edit' : 'edit_note'"
      :color="isEditMode ? 'primary' : 'grey-6'"
      size="sm"
      @click="toggleEditMode"
    >
      <q-tooltip>{{ isEditMode ? 'Edit mode (ON) - Press F2 to toggle' : 'Edit mode (OFF) - Press F2 to toggle' }}</q-tooltip>
    </q-btn>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()

const isEditMode = ref(false)

function toggleEditMode() {
  isEditMode.value = !isEditMode.value

  // Show brief notification
  $q.notify({
    message: `Edit mode ${isEditMode.value ? 'ON' : 'OFF'}`,
    icon: isEditMode.value ? 'edit' : 'edit_note',
    color: isEditMode.value ? 'primary' : 'grey',
    timeout: 1000,
    position: 'bottom'
  })
}

defineEmits([
  'new-vault',
  'open-vault',
  'delete-vault',
  'add-file',
  'add-folder',
  'expand-all',
  'collapse-all'
])
</script>

<style scoped lang="scss">
.vault-toolbar {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  background: rgba(0, 0, 0, 0.02);

  .body--dark & {
    border-bottom-color: rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.02);
  }
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 2px;
}
</style>
