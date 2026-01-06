<template>
  <div class="q-pa-md">
    <q-layout
      view="hHh Lpr lff"
      container
      style="height: 300px"
      class="shadow-2 rounded-borders"
    >
      <q-header elevated class="bg-black">
        <q-toolbar>
          <q-btn flat @click="drawer = !drawer" round dense icon="menu" />
          <q-toolbar-title>Header</q-toolbar-title>
        </q-toolbar>
      </q-header>

      <q-drawer
        v-model="drawer"
        show-if-above
        :width="drawerWidth"
        :breakpoint="0"
        bordered
      >
        <q-list>
          <q-item v-for="i in 5" :key="i" clickable v-ripple>
            <q-item-section> Menu item {{ i }} </q-item-section>
          </q-item>
        </q-list>
        <!-- NEXT LINE -->
        <div
          autofocus
          tabindex="0"
          v-touch-pan.preserveCursor.prevent.mouse.horizontal="resizeDrawer"
          @keydown="resizeDrawer"
          class="q-drawer__resizer"
        />
      </q-drawer>

      <q-page-container>
        <q-page padding>
          <p v-for="n in 15" :key="n">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Fugit nihil
            praesentium molestias a adipisci, dolore vitae odit, quidem
            consequatur optio voluptates asperiores pariatur eos numquam rerum
            delectus commodi perferendis voluptate?
          </p>
        </q-page>
      </q-page-container>
    </q-layout>
  </div>
</template>

<style>
.q-drawer__resizer {
  position: absolute;
  top: 0;
  bottom: 0;
  right: -2px;
  width: 4px;
  background-color: #999;
  cursor: ew-resize;
}

.q-drawer__resizer:after {
  content: '';
  position: absolute;
  top: 50%;
  height: 30px;
  left: -5px;
  right: -5px;
  transform: translateY(-50%);
  background-color: inherit;
  border-radius: 4px;
}
</style>

<script setup lang="ts">
import { ref } from 'vue';

let initialDrawerWidth;
const drawerWidth = ref(300);
const drawer = ref(true);

function resizeDrawer(ev) {
  if (ev.type === 'keydown') {
    if (ev.code === 'ArrowLeft') {
      drawerWidth.value -= 1;
    } else if (ev.code === 'ArrowRight') {
      drawerWidth.value += 1;
    }
  } else {
    if (ev.isFirst === true) {
      initialDrawerWidth = drawerWidth.value;
    }
    drawerWidth.value = initialDrawerWidth + ev.offset.x;
  }
  drawerWidth.value = initialDrawerWidth + ev.offset.x
}
</script>