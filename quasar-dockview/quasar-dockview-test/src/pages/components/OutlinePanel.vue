<template>
  <div class="outline-panel">
    <div class="outline-header q-pa-md q-pb-sm">
      <div class="text-h6">
        <q-icon name="list" class="q-mr-sm" />
        Outline View
      </div>
    </div>
    <div class="outline-content q-pa-md">
      <q-tree
        :nodes="outlineNodes"
        node-key="id"
        label-key="label"
        children-key="children"
        class="outline-tree"
        @update:selected="onNodeSelected"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()

const outlineNodes = ref([
  {
    id: '1',
    label: 'Root Node',
    children: [
      {
        id: '1.1',
        label: 'Child Node 1',
        children: [
          { id: '1.1.1', label: 'Grandchild 1' },
          { id: '1.1.2', label: 'Grandchild 2' }
        ]
      },
      {
        id: '1.2',
        label: 'Child Node 2',
        children: [
          { id: '1.2.1', label: 'Grandchild 3' }
        ]
      }
    ]
  },
  {
    id: '2',
    label: 'Another Root',
    children: [
      { id: '2.1', label: 'Simple Child' }
    ]
  }
])

function onNodeSelected(selected: string[]) {
  if (selected.length > 0) {
    $q.notify({
      type: 'info',
      message: `Selected: ${selected[0]}`,
      timeout: 1000
    })
  }
}
</script>

<style scoped lang="scss">
.outline-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f3e5f5; // Light purple background for visibility
}

.outline-header {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);

  .body--dark & {
    border-bottom-color: rgba(255, 255, 255, 0.12);
  }
}

.outline-content {
  flex: 1;
  overflow: auto;
}

.outline-tree {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;

  .body--dark & {
    border-color: rgba(255, 255, 255, 0.12);
  }
}
</style>
