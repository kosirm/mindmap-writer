<template>
  <q-layout view="hHh lpR fFf">
    <!-- Header -->
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <!-- Left drawer toggle -->
        <q-btn
          flat
          dense
          round
          icon="widgets"
          aria-label="Tools"
          @click="appStore.toggleLeftDrawer"
        />

        <!-- Document title -->
        <q-toolbar-title class="text-center">
          <span class="document-title">{{ documentStore.documentName }}</span>
          <q-icon
            v-if="documentStore.isDirty"
            name="fiber_manual_record"
            size="8px"
            class="q-ml-xs"
          />
        </q-toolbar-title>

        <!-- Panel Manager -->
        <PanelManager />

        <!-- Dark mode toggle -->
        <q-btn
          flat
          dense
          round
          :icon="appStore.isDarkMode ? 'light_mode' : 'dark_mode'"
          :aria-label="appStore.isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'"
          @click="appStore.toggleDarkMode"
        >
          <q-tooltip>{{ appStore.isDarkMode ? 'Light mode' : 'Dark mode' }}</q-tooltip>
        </q-btn>

        <!-- Right drawer toggle -->
        <q-btn
          flat
          dense
          round
          icon="smart_toy"
          aria-label="AI Assistant"
          @click="appStore.toggleRightDrawer"
        />
      </q-toolbar>
    </q-header>

    <!-- Left Drawer - Tools & Dev -->
    <q-drawer
      v-model="appStore.leftDrawerOpen"
      side="left"
      bordered
      overlay
      :width="280"
      :breakpoint="700"
    >
      <div class="drawer-content">
        <!-- Tabs Header -->
        <q-tabs
          v-model="leftDrawerTab"
          dense
          class="text-grey"
          active-color="primary"
          indicator-color="primary"
          align="justify"
        >
          <q-tab name="tools" icon="build" label="Tools" />
          <q-tab v-if="isDev" name="dev" icon="code" label="Dev" />
        </q-tabs>

        <q-separator />

        <!-- Tab Panels -->
        <q-scroll-area class="drawer-scroll-area">
          <q-tab-panels v-model="leftDrawerTab" animated>
            <!-- Tools Tab -->
            <q-tab-panel name="tools" class="q-pa-md">
              <div class="text-h6 q-mb-md">Tools</div>
              <q-list>
                <q-item-label header>Node Actions</q-item-label>
                <q-item clickable v-ripple>
                  <q-item-section avatar>
                    <q-icon name="event" />
                  </q-item-section>
                  <q-item-section>Date</q-item-section>
                </q-item>
                <q-item clickable v-ripple>
                  <q-item-section avatar>
                    <q-icon name="priority_high" />
                  </q-item-section>
                  <q-item-section>Priority</q-item-section>
                </q-item>
                <q-item clickable v-ripple>
                  <q-item-section avatar>
                    <q-icon name="label" />
                  </q-item-section>
                  <q-item-section>Tags</q-item-section>
                </q-item>
                <q-item clickable v-ripple>
                  <q-item-section avatar>
                    <q-icon name="palette" />
                  </q-item-section>
                  <q-item-section>Color</q-item-section>
                </q-item>
              </q-list>
            </q-tab-panel>

            <!-- Dev Tab (only in development) -->
            <q-tab-panel v-if="isDev" name="dev" class="q-pa-none">
              <DevPanel />
            </q-tab-panel>
          </q-tab-panels>
        </q-scroll-area>
      </div>
    </q-drawer>

    <!-- Right Drawer - AI Chat -->
    <q-drawer
      v-model="appStore.rightDrawerOpen"
      side="right"
      bordered
      overlay
      :width="350"
      :breakpoint="700"
    >
      <q-scroll-area class="fit">
        <div class="q-pa-md">
          <div class="text-h6 q-mb-md">
            <q-icon name="smart_toy" class="q-mr-sm" />
            AI Assistant
          </div>
          <div class="text-grey-6">
            AI chat will be implemented here.
          </div>
        </div>
      </q-scroll-area>
    </q-drawer>

    <!-- Main Content - 3 Panel Layout -->
    <q-page-container>
      <q-page class="three-panel-layout">
        <ThreePanelContainer />
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, onMounted, defineAsyncComponent } from 'vue'
import { useAppStore } from 'src/core/stores/appStore'
import { useDocumentStore } from 'src/core/stores/documentStore'
import { usePanelStore } from 'src/core/stores/panelStore'
import PanelManager from 'src/shared/components/PanelManager.vue'
import ThreePanelContainer from 'src/shared/components/ThreePanelContainer.vue'

// Dev tools - only imported in development mode (lazy loaded)
const DevPanel = import.meta.env.DEV
  ? defineAsyncComponent(() => import('src/dev/DevPanel.vue'))
  : null

const appStore = useAppStore()
const documentStore = useDocumentStore()
const panelStore = usePanelStore()

// Left drawer tab state
const leftDrawerTab = ref('tools')
const isDev = import.meta.env.DEV

onMounted(() => {
  // Initialize online status listeners
  appStore.initOnlineListeners()

  // Load saved panel layout
  panelStore.loadLayout()
})
</script>

<style scoped lang="scss">
.document-title {
  font-weight: 500;
  font-size: 1rem;
}

.three-panel-layout {
  height: calc(100vh - 50px); // Full viewport height minus header
  overflow: hidden;
}

.drawer-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.drawer-scroll-area {
  flex: 1;
  height: calc(100% - 48px); // Full height minus tabs header
}
</style>
