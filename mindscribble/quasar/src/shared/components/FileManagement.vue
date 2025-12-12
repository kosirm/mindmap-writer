<template>
  <div class="file-management">
    <div class="text-h6 q-mb-md">
      <q-icon name="folder" class="q-mr-sm" />
      File Management
    </div>

    <q-list>
      <q-item-label header>File Operations</q-item-label>

      <q-item clickable v-ripple @click="handleNew">
        <q-item-section avatar>
          <q-icon name="add" />
        </q-item-section>
        <q-item-section>New File</q-item-section>
      </q-item>

      <q-item clickable v-ripple @click="handleOpen">
        <q-item-section avatar>
          <q-icon name="folder_open" />
        </q-item-section>
        <q-item-section>Open File</q-item-section>
      </q-item>

      <q-item clickable v-ripple @click="handleSave">
        <q-item-section avatar>
          <q-icon name="save" />
        </q-item-section>
        <q-item-section>Save</q-item-section>
      </q-item>

      <q-item clickable v-ripple @click="handleSaveAs">
        <q-item-section avatar>
          <q-icon name="save_as" />
        </q-item-section>
        <q-item-section>Save As</q-item-section>
      </q-item>

      <q-item clickable v-ripple @click="handleManage">
        <q-item-section avatar>
          <q-icon name="settings" />
        </q-item-section>
        <q-item-section>Manage Files</q-item-section>
      </q-item>
    </q-list>

    <q-separator class="q-my-md" />

    <div class="text-subtitle2 q-mb-sm">Recent Files</div>
    <q-list v-if="recentFiles.length > 0">
      <q-item
        v-for="file in recentFiles"
        :key="file.id"
        clickable
        v-ripple
        @click="handleOpenRecent(file)"
      >
        <q-item-section avatar>
          <q-icon name="description" />
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ file.name }}</q-item-label>
          <q-item-label caption>{{ formatDate(file.modifiedTime) }}</q-item-label>
        </q-item-section>
      </q-item>
    </q-list>
    <div v-else class="text-grey-6 q-pa-md">
      No recent files
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'src/core/stores/authStore'

const $q = useQuasar()
const authStore = useAuthStore()

interface RecentFile {
  id: string
  name: string
  modifiedTime: string
}

const recentFiles = ref<RecentFile[]>([])

onMounted(() => {
  loadRecentFiles()
})

function loadRecentFiles() {
  // Load recent files from drive store or local storage
  // For now, just show some mock data
  recentFiles.value = [
    { id: '1', name: 'Project Plan.mind', modifiedTime: new Date().toISOString() },
    { id: '2', name: 'Meeting Notes.mind', modifiedTime: new Date(Date.now() - 86400000).toISOString() }
  ]
}

function handleNew() {
  window.dispatchEvent(new CustomEvent('file:new'))
}

function handleOpen() {
  if (!authStore.isSignedIn) {
    $q.notify({ type: 'warning', message: 'Please sign in to open files from Google Drive' })
    return
  }
  window.dispatchEvent(new CustomEvent('file:open'))
}

function handleSave() {
  if (!authStore.isSignedIn) {
    $q.notify({ type: 'warning', message: 'Please sign in to save files to Google Drive' })
    return
  }
  window.dispatchEvent(new CustomEvent('file:save'))
}

function handleSaveAs() {
  if (!authStore.isSignedIn) {
    $q.notify({ type: 'warning', message: 'Please sign in to save files to Google Drive' })
    return
  }
  window.dispatchEvent(new CustomEvent('file:saveAs'))
}

function handleManage() {
  if (!authStore.isSignedIn) {
    $q.notify({ type: 'warning', message: 'Please sign in to manage files' })
    return
  }
  window.dispatchEvent(new CustomEvent('file:manage'))
}

function handleOpenRecent(file: RecentFile) {
  // Implement opening recent file
  console.log('Open recent file:', file)
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString()
}
</script>

<style scoped lang="scss">
.file-management {
  padding: 16px;
}
</style>
