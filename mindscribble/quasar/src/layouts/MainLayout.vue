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

    <!-- Left Drawer - Tools & Icons -->
    <q-drawer
      v-model="appStore.leftDrawerOpen"
      side="left"
      bordered
      :width="280"
      :breakpoint="700"
    >
      <q-scroll-area class="fit">
        <div class="q-pa-md">
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
        </div>
      </q-scroll-area>
    </q-drawer>

    <!-- Right Drawer - AI Chat -->
    <q-drawer
      v-model="appStore.rightDrawerOpen"
      side="right"
      bordered
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
import { onMounted } from 'vue'
import { useAppStore } from 'src/core/stores/appStore'
import { useDocumentStore } from 'src/core/stores/documentStore'
import { usePanelStore } from 'src/core/stores/panelStore'
import PanelManager from 'src/shared/components/PanelManager.vue'
import ThreePanelContainer from 'src/shared/components/ThreePanelContainer.vue'

const appStore = useAppStore()
const documentStore = useDocumentStore()
const panelStore = usePanelStore()

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
</style>
