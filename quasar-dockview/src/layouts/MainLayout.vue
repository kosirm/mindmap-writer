<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-toolbar-title>Quasar + Dockview Experiment</q-toolbar-title>
        <q-space />
        <q-btn flat round icon="settings" @click="showSettings = true" />
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" side="left" overlay behavior="mobile" elevated>
      <q-list>
        <q-item-label header>Navigation</q-item-label>
        <q-item clickable @click="addPanel('welcome')">
          <q-item-section avatar>
            <q-icon name="home" />
          </q-item-section>
          <q-item-section>Welcome</q-item-section>
        </q-item>
        <q-item clickable @click="addPanel('editor')">
          <q-item-section avatar>
            <q-icon name="edit" />
          </q-item-section>
          <q-item-section>Editor</q-item-section>
        </q-item>
        <q-item clickable @click="addPanel('canvas')">
          <q-item-section avatar>
            <q-icon name="palette" />
          </q-item-section>
          <q-item-section>Canvas</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <q-page class="flex flex-center">
        <div class="dockview-container">
          <DockviewVue
            ref="dockviewRef"
            :api="dockviewApi"
            :components="panelComponents"
            :layout="layout"
            class="dockview-theme"
            @ready="onReady"
          />
        </div>
      </q-page>
    </q-page-container>

    <!-- Settings Dialog -->
    <q-dialog v-model="showSettings">
      <q-card>
        <q-card-section class="row items-center">
          <div class="text-h6">Dockview Settings</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section>
          <q-toggle v-model="darkMode" label="Dark Mode" />
          <q-select
            v-model="theme"
            :options="themeOptions"
            label="Dockview Theme"
            class="q-mt-md"
          />
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { DockviewVue, type IDockviewComponent } from 'dockview-vue'
import WelcomePanel from '../components/panels/WelcomePanel.vue'
import EditorPanel from '../components/panels/EditorPanel.vue'
import CanvasPanel from '../components/panels/CanvasPanel.vue'

const leftDrawerOpen = ref(false)
const showSettings = ref(false)
const darkMode = ref(false)
const theme = ref('vs-dark')

const themeOptions = [
  { label: 'VS Dark', value: 'vs-dark' },
  { label: 'VS Light', value: 'vs-light' },
  { label: 'High Contrast', value: 'hc-black' }
]

const dockviewRef = ref<IDockviewComponent>()
const dockviewApi = ref()
const layout = ref({
  views: [],
  activeView: undefined
})

const panelComponents = {
  welcome: WelcomePanel,
  editor: EditorPanel,
  canvas: CanvasPanel
}

const onReady = (event: any) => {
  dockviewApi.value = event.api

  // Add initial welcome panel
  addPanel('welcome')
}

const addPanel = (type: string) => {
  if (!dockviewApi.value) return

  const panelId = `${type}-${Date.now()}`
  const panel = dockviewApi.value.addPanel({
    id: panelId,
    component: type,
    title: type.charAt(0).toUpperCase() + type.slice(1),
    params: {}
  })

  // Focus the new panel
  panel.focus()
}
</script>

<style scoped>
.dockview-container {
  width: 100%;
  height: 100vh;
  position: relative;
}

/* Dockview theme integration */
.dockview-theme {
  --dv-background-color: var(--q-background);
  --dv-border-color: var(--q-separator);
  --dv-active-border-color: var(--q-primary);
  --dv-text-color: var(--q-primary-text);
  --dv-tab-background-color: var(--q-card-background);
  --dv-tab-text-color: var(--q-primary-text);
  --dv-tab-active-background-color: var(--q-primary);
  --dv-tab-active-text-color: white;
}
</style>