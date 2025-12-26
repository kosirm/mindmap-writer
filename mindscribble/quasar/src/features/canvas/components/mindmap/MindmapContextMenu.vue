<template>
  <q-menu
    v-model="showMenu"
    :position="menuPosition"
    context-menu
    @hide="onMenuHide"
  >
    <q-list dense style="min-width: 200px">
      <q-item clickable @click="addChildNode">
        <q-item-section avatar>
          <q-icon name="add" />
        </q-item-section>
        <q-item-section>Add Child</q-item-section>
      </q-item>

      <q-item clickable @click="addSiblingNode">
        <q-item-section avatar>
          <q-icon name="add" />
        </q-item-section>
        <q-item-section>Add Sibling</q-item-section>
      </q-item>

      <q-item clickable @click="addParentNode">
        <q-item-section avatar>
          <q-icon name="add" />
        </q-item-section>
        <q-item-section>Add Parent</q-item-section>
      </q-item>

      <q-separator />

      <q-item clickable @click="deleteNode" class="text-negative">
        <q-item-section avatar>
          <q-icon name="delete" />
        </q-item-section>
        <q-item-section>Delete</q-item-section>
      </q-item>
    </q-list>
  </q-menu>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useUnifiedDocumentStore } from 'src/core/stores/unifiedDocumentStore'

const props = defineProps<{
  modelValue: boolean
  position: { x: number, y: number }
  nodeId: string | null
}>()

const emit = defineEmits(['update:modelValue', 'node-action'])

const showMenu = ref(props.modelValue)
const menuPosition = ref(props.position)

const unifiedStore = useUnifiedDocumentStore()

// Watch for prop changes
watch(() => props.modelValue, (val: boolean) => {
  showMenu.value = val
})

watch(() => props.position, (val: { x: number, y: number }) => {
  menuPosition.value = val
})

function onMenuHide() {
  emit('update:modelValue', false)
}

function addChildNode() {
  if (!props.nodeId) return

  const parentNode = unifiedStore.getNodeById(props.nodeId)
  if (parentNode) {
    const newNode = unifiedStore.addNode(
      props.nodeId,
      'New Child',
      '',
      undefined,
      'mindmap'
    )
    if (newNode) {
      emit('node-action', { action: 'add-child', nodeId: newNode.id })
    }
  }
  onMenuHide()
}

function addSiblingNode() {
  if (!props.nodeId) return

  const node = unifiedStore.getNodeById(props.nodeId)
  if (node) {
    const parentId = node.data.parentId
    const newNode = unifiedStore.addNode(
      parentId,
      'New Sibling',
      '',
      undefined,
      'mindmap'
    )
    if (newNode) {
      emit('node-action', { action: 'add-sibling', nodeId: newNode.id })
    }
  }
  onMenuHide()
}

function addParentNode() {
  if (!props.nodeId) return

  const node = unifiedStore.getNodeById(props.nodeId)
  if (node) {
    const parentId = node.data.parentId
    const newParent = unifiedStore.addNode(
      parentId,
      'New Parent',
      '',
      undefined,
      'mindmap'
    )

    if (newParent) {
      // Move the current node to be a child of the new parent
      unifiedStore.moveNode(
        props.nodeId,
        newParent.id,
        0,
        'mindmap'
      )

      emit('node-action', { action: 'add-parent', nodeId: newParent.id })
    }
  }
  onMenuHide()
}

function deleteNode() {
  if (!props.nodeId) return

  unifiedStore.deleteNode(props.nodeId, true, 'mindmap')
  emit('node-action', { action: 'delete', nodeId: props.nodeId })
  onMenuHide()
}
</script>

<style scoped>
/* Add any custom styling here if needed */
</style>
