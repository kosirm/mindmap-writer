<template>
  <div class="welcome-panel q-pa-md">
    <div class="text-h4 q-mb-md">Welcome to Quasar + Dockview</div>
    <div class="text-body1 q-mb-lg">
      This is an experimental integration of Quasar UI framework with Dockview panel management.
    </div>

    <q-card class="q-mb-md">
      <q-card-section>
        <div class="text-h6">Features Demonstrated</div>
      </q-card-section>
      <q-card-section>
        <q-list>
          <q-item>
            <q-item-section avatar>
              <q-icon name="widgets" color="primary" />
            </q-item-section>
            <q-item-section>Drag & Drop Panel Management</q-item-section>
          </q-item>
          <q-item>
            <q-item-section avatar>
              <q-icon name="palette" color="primary" />
            </q-item-section>
            <q-item-section>Quasar Theme Integration</q-item-section>
          </q-item>
          <q-item>
            <q-item-section avatar>
              <q-icon name="tab" color="primary" />
            </q-item-section>
            <q-item-section>Tabbed Interface</q-item-section>
          </q-item>
          <q-item>
            <q-item-section avatar>
              <q-icon name="open_in_new" color="primary" />
            </q-item-section>
            <q-item-section>Floating Panels (Electron-ready)</q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>

    <q-btn
      color="primary"
      label="Add Editor Panel"
      @click="$emit('addPanel', 'editor')"
      class="q-mr-sm"
    />
    <q-btn
      color="secondary"
      label="Add Canvas Panel"
      @click="$emit('addPanel', 'canvas')"
    />
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  addPanel: [type: string]
}>()
</script>

<style scoped>
.welcome-panel {
  height: 100%;
  overflow-y: auto;
}
</style>