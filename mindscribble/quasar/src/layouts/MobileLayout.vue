<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn v-if="showBack" flat round dense icon="arrow_back" @click="goBack" />
        <q-select
          v-model="currentFile"
          :options="fileOptions"
          label="Current File"
          dense
          borderless
          @update:model-value="loadFile"
          style="min-width: 150px"
        />
        <q-space />
        <q-select
          v-model="currentView"
          :options="viewOptions"
          label="Current View"
          dense
          borderless
          @update:model-value="loadView"
          style="min-width: 120px"
        />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <q-page class="mobile-page">
        <component :is="currentViewComponent" :file-id="currentFile?.id" />
      </q-page>
    </q-page-container>

    <q-footer elevated>
      <q-toolbar>
        <q-btn flat round dense icon="menu" @click="showMenu = true" />
        <q-space />
        <q-btn flat round dense icon="add" @click="showAddMenu = true" />
      </q-toolbar>
    </q-footer>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

// View components
import Vue3MindmapView from 'src/features/canvas/components/Vue3MindmapView.vue'
import WriterView from 'src/features/writer/components/WriterView.vue'
import OutlineView from 'src/features/tree/components/OutlineView.vue'
import type { Component } from 'vue'

const router = useRouter()
const showBack = ref(false)
const showMenu = ref(false)
const showAddMenu = ref(false)

interface FileOption {
  id: string
  label: string
  value: string
}

interface ViewOption {
  label: string
  value: string
  component: Component
}

const currentFile = ref<FileOption | null>(null)
const currentView = ref<string>('mindmap')

const fileOptions = ref<FileOption[]>([
  { id: 'file-1', label: 'Document 1', value: 'file-1' }
])

const viewOptions = ref<ViewOption[]>([
  { label: 'Mind Map', value: 'mindmap', component: Vue3MindmapView },
  { label: 'Writer', value: 'writer', component: WriterView },
  { label: 'Outline', value: 'outline', component: OutlineView }
])

const currentViewComponent = computed(() => {
  const view = viewOptions.value.find(v => v.value === currentView.value)
  return view?.component || Vue3MindmapView
})

function goBack() {
  router.go(-1)
}

function loadFile(fileId: string) {
  console.log('Loading file:', fileId)
  // TODO: Implement file loading logic
}

function loadView(viewType: string) {
  console.log('Loading view:', viewType)
  // TODO: Implement view loading logic
}

// Initialize with default file
currentFile.value = fileOptions.value[0] || null
</script>

<style scoped lang="scss">
.mobile-page {
  padding: 0;
  margin: 0;
  height: 100%;
  overflow: hidden;
}

:deep(.q-header) {
  background-color: #1e1e1e;
  color: white;
}

:deep(.q-footer) {
  background-color: #1e1e1e;
  color: white;
}

:deep(.q-select) {
  color: white;
}

:deep(.q-btn) {
  color: white;
}
</style>
