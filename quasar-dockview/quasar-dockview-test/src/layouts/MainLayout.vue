<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title> Dockview Test </q-toolbar-title>

        <!-- Dockview controls -->
        <q-btn
          flat
          dense
          icon="add"
          label="Add Panel"
          @click="showAddPanelMenu = true"
        >
          <q-menu v-model="showAddPanelMenu">
            <q-list style="min-width: 150px">
              <q-item clickable v-close-popup @click="handleAddPanel('default-panel')">
                <q-item-section avatar>
                  <q-icon name="widgets" />
                </q-item-section>
                <q-item-section>Default</q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="handleAddPanel('mindmap-panel')">
                <q-item-section avatar>
                  <q-icon name="account_tree" />
                </q-item-section>
                <q-item-section>Mindmap</q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="handleAddPanel('writer-panel')">
                <q-item-section avatar>
                  <q-icon name="edit" />
                </q-item-section>
                <q-item-section>Writer</q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="handleAddPanel('outline-panel')">
                <q-item-section avatar>
                  <q-icon name="list" />
                </q-item-section>
                <q-item-section>Outline</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>

        <q-separator vertical inset class="q-mx-sm" />

        <q-btn
          flat
          dense
          icon="save"
          label="Save"
          @click="handleSaveLayout"
        />

        <q-btn
          flat
          dense
          icon="folder_open"
          label="Load"
          @click="handleLoadLayout"
        />

        <q-btn
          flat
          dense
          icon="refresh"
          label="Reset"
          @click="handleResetLayout"
        />
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list>
        <q-item-label header> Essential Links </q-item-label>

        <EssentialLink v-for="link in linksList" :key="link.title" v-bind="link" />
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view v-slot="{ Component }">
        <component :is="Component" ref="pageRef" />
      </router-view>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import EssentialLink, { type EssentialLinkProps } from 'components/EssentialLink.vue';

// Define interface for the page component with exposed methods
interface DockviewPageRef {
  addPanel: (type: string) => void;
  saveLayoutToStorage: () => void;
  loadLayoutFromStorage: () => boolean;
  resetLayoutToDefault: () => void;
}

const pageRef = ref<DockviewPageRef | null>(null);
const showAddPanelMenu = ref(false);

const linksList: EssentialLinkProps[] = [
  {
    title: 'Docs',
    caption: 'quasar.dev',
    icon: 'school',
    link: 'https://quasar.dev',
  },
  {
    title: 'Github',
    caption: 'github.com/quasarframework',
    icon: 'code',
    link: 'https://github.com/quasarframework',
  },
  {
    title: 'Discord Chat Channel',
    caption: 'chat.quasar.dev',
    icon: 'chat',
    link: 'https://chat.quasar.dev',
  },
  {
    title: 'Forum',
    caption: 'forum.quasar.dev',
    icon: 'record_voice_over',
    link: 'https://forum.quasar.dev',
  },
  {
    title: 'Twitter',
    caption: '@quasarframework',
    icon: 'rss_feed',
    link: 'https://twitter.quasar.dev',
  },
  {
    title: 'Facebook',
    caption: '@QuasarFramework',
    icon: 'public',
    link: 'https://facebook.quasar.dev',
  },
  {
    title: 'Quasar Awesome',
    caption: 'Community Quasar projects',
    icon: 'favorite',
    link: 'https://awesome.quasar.dev',
  },
];

const leftDrawerOpen = ref(false);

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

// Handler functions for dockview controls
function handleAddPanel(type: string) {
  if (pageRef.value && pageRef.value.addPanel) {
    pageRef.value.addPanel(type);
  }
}

function handleSaveLayout() {
  if (pageRef.value && pageRef.value.saveLayoutToStorage) {
    pageRef.value.saveLayoutToStorage();
  }
}

function handleLoadLayout() {
  if (pageRef.value && pageRef.value.loadLayoutFromStorage) {
    pageRef.value.loadLayoutFromStorage();
  }
}

function handleResetLayout() {
  if (pageRef.value && pageRef.value.resetLayoutToDefault) {
    pageRef.value.resetLayoutToDefault();
  }
}
</script>
