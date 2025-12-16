<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title> v-network-graph POC </q-toolbar-title>

        <div>v{{ $q.version }}</div>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-tabs v-model="drawerTab" dense class="text-grey" active-color="primary" indicator-color="primary" align="justify">
        <q-tab name="navigation" label="Navigation" />
        <q-tab name="tests" label="Tests" />
      </q-tabs>

      <q-separator />

      <q-tab-panels v-model="drawerTab" animated>
        <q-tab-panel name="navigation">
          <q-list>
            <q-item-label header>Test Pages</q-item-label>
            <q-item clickable v-ripple to="/test1">
              <q-item-section avatar>
                <q-icon name="circle" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Test 1: Basic</q-item-label>
              </q-item-section>
            </q-item>
            <q-item clickable v-ripple to="/test2">
              <q-item-section avatar>
                <q-icon name="palette" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Test 2: Custom Nodes</q-item-label>
              </q-item-section>
            </q-item>
            <q-item clickable v-ripple to="/test3">
              <q-item-section avatar>
                <q-icon name="pan_tool" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Test 3: Drag Layout</q-item-label>
              </q-item-section>
            </q-item>
            <q-item clickable v-ripple to="/test4">
              <q-item-section avatar>
                <q-icon name="speed" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Test 4: Performance</q-item-label>
              </q-item-section>
            </q-item>
            <q-item clickable v-ripple to="/test5">
              <q-item-section avatar>
                <q-icon name="map" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Test 5: Minimap</q-item-label>
              </q-item-section>
            </q-item>
            <q-item clickable v-ripple to="/test6">
              <q-item-section avatar>
                <q-icon name="zoom_in" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Test 6: Zoom Controls</q-item-label>
              </q-item-section>
            </q-item>
            <q-item clickable v-ripple to="/test7">
              <q-item-section avatar>
                <q-icon name="menu" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Test 7: Context Menu</q-item-label>
              </q-item-section>
            </q-item>
            <q-item clickable v-ripple to="/test8">
              <q-item-section avatar>
                <q-icon name="unfold_less" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Test 8: Collapse</q-item-label>
              </q-item-section>
            </q-item>
            <q-item clickable v-ripple to="/test9">
              <q-item-section avatar>
                <q-icon name="warning" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Test 9: Stress Test</q-item-label>
              </q-item-section>
            </q-item>
            <q-separator class="q-my-md" />
            <q-item clickable v-ripple to="/test-mindmap">
              <q-item-section avatar>
                <q-icon name="account_tree" color="primary" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-primary text-weight-bold">MindMap Features</q-item-label>
              </q-item-section>
            </q-item>
            <q-item clickable v-ripple to="/test-conceptmap">
              <q-item-section avatar>
                <q-icon name="schema" color="secondary" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-secondary text-weight-medium">ConceptMap Test</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-tab-panel>

        <q-tab-panel name="tests">
          <q-list>
            <q-item-label header>Test Controls</q-item-label>
            <q-item>
              <q-item-section>
                <q-item-label caption>Future test controls will go here</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-tab-panel>
      </q-tab-panels>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const leftDrawerOpen = ref(false);
const drawerTab = ref('navigation');

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}
</script>
