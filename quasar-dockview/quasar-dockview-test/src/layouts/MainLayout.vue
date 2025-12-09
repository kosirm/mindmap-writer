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
        >
          <q-menu>
            <q-list style="min-width: 150px">
              <q-item
                clickable
                v-close-popup
                @click="handleAddPanel('default-panel')"
                :disable="isPanelTypeOpen('default-panel')"
              >
                <q-item-section avatar>
                  <q-icon name="widgets" />
                </q-item-section>
                <q-item-section>Default</q-item-section>
              </q-item>
              <q-item
                clickable
                v-close-popup
                @click="handleAddPanel('mindmap-panel')"
                :disable="isPanelTypeOpen('mindmap-panel')"
              >
                <q-item-section avatar>
                  <q-icon name="account_tree" />
                </q-item-section>
                <q-item-section>Mindmap</q-item-section>
              </q-item>
              <q-item
                clickable
                v-close-popup
                @click="handleAddPanel('writer-panel')"
                :disable="isPanelTypeOpen('writer-panel')"
              >
                <q-item-section avatar>
                  <q-icon name="edit" />
                </q-item-section>
                <q-item-section>Writer</q-item-section>
              </q-item>
              <q-item
                clickable
                v-close-popup
                @click="handleAddPanel('outline-panel')"
                :disable="isPanelTypeOpen('outline-panel')"
              >
                <q-item-section avatar>
                  <q-icon name="list" />
                </q-item-section>
                <q-item-section>Outline</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
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
  getOpenPanelTypes: () => string[];
}

const pageRef = ref<DockviewPageRef | null>(null);

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

function isPanelTypeOpen(type: string): boolean {
  if (pageRef.value && pageRef.value.getOpenPanelTypes) {
    const openTypes = pageRef.value.getOpenPanelTypes();
    return openTypes.includes(type);
  }
  return false;
}
</script>
