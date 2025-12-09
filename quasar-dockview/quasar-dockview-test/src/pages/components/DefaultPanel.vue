<template>
  <div class="default-panel q-pa-md">
    <div class="text-h6 q-mb-md">Default Panel</div>
    <q-card class="q-mb-md">
      <q-card-section>
        <div class="text-h6">Welcome to Dockview</div>
        <div class="text-subtitle2">This is a default panel component</div>
      </q-card-section>
    </q-card>
    <q-btn color="primary" label="Click me" @click="onClick" />
  </div>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar'

const $q = useQuasar()

function onClick() {
  $q.notify({
    type: 'positive',
    message: 'Button clicked!',
    timeout: 1000
  })
}
</script>

<style scoped lang="scss">
.default-panel {
  height: 100%;
  background: #e8f5e9; // Light green background for visibility
}
</style>
