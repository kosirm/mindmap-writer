<template>
  <div class="custom-node" :class="{ 'potential-parent': data.isPotentialParent }">
    <!-- Node content - static display or Tiptap editor -->
    <div class="node-content" @dblclick.stop="startEditing">
      <!-- Static display when not editing -->
      <div v-if="!isEditing" class="node-label" v-html="displayLabel"></div>

      <!-- Tiptap editor when editing -->
      <div
        v-else
        class="node-editor-wrapper"
        @keydown.stop
        @keyup.stop
        @keypress.stop
      >
        <EditorContent
          v-if="localEditor"
          :editor="(localEditor as Editor)"
          class="node-editor"
        />
      </div>
    </div>

    <!-- Expand/Collapse buttons -->
    <!-- Root nodes: TWO buttons (left + right) with separate counts -->
    <template v-if="data.parentId === null">
      <div
        v-if="data.childCountLeft && data.childCountLeft > 0"
        class="collapse-button left"
        @click.stop="toggleCollapseLeft"
      >
        <span v-if="!data.collapsedLeft" class="icon">−</span>
        <span v-if="data.collapsedLeft" class="badge">{{ data.childCountLeft }}</span>
      </div>
      <div
        v-if="data.childCountRight && data.childCountRight > 0"
        class="collapse-button right"
        @click.stop="toggleCollapseRight"
      >
        <span v-if="!data.collapsedRight" class="icon">−</span>
        <span v-if="data.collapsedRight" class="badge">{{ data.childCountRight }}</span>
      </div>
    </template>

    <!-- Child nodes: ONE button (left or right depending on side) -->
    <div
      v-else-if="data.parentId !== null && data.childCount && data.childCount > 0"
      class="collapse-button"
      :class="{ 'left': data.childrenSide === 'left', 'right': data.childrenSide === 'right' }"
      @click.stop="toggleCollapse"
    >
      <span v-if="!data.collapsed" class="icon">−</span>
      <span v-if="data.collapsed" class="badge">{{ data.childCount }}</span>
    </div>

    <!-- Handles for connections - 4 sides -->
    <!-- Each position has both source and target handles for bi-directional connections -->
    <Handle id="top-target" type="target" :position="Position.Top" class="handle" />
    <Handle id="top-source" type="source" :position="Position.Top" class="handle" />
    <Handle id="bottom-target" type="target" :position="Position.Bottom" class="handle" />
    <Handle id="bottom-source" type="source" :position="Position.Bottom" class="handle" />
    <Handle id="left-target" type="target" :position="Position.Left" class="handle" />
    <Handle id="left-source" type="source" :position="Position.Left" class="handle" />
    <Handle id="right-target" type="target" :position="Position.Right" class="handle" />
    <Handle id="right-source" type="source" :position="Position.Right" class="handle" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { EditorContent } from '@tiptap/vue-3'
import type { Editor } from '@tiptap/vue-3'
import { eventBus } from '../../../../core/events'
import {
  activeEditingNodeId,
  createCanvasTitleEditor,
  destroyActiveEditor,
  useCanvasNodeEditor
} from '../../composables/useCanvasNodeEditor'

interface Props {
  id: string
  data: {
    label: string
    parentId: string | null
    childCount?: number
    childCountLeft?: number
    childCountRight?: number
    collapsed?: boolean
    collapsedLeft?: boolean
    collapsedRight?: boolean
    childrenSide?: 'left' | 'right'
    isPotentialParent?: boolean
  }
}

const props = defineProps<Props>()

const emit = defineEmits<{
  toggleCollapse: []
  toggleCollapseLeft: []
  toggleCollapseRight: []
}>()

const { updateNodeTitle } = useCanvasNodeEditor()

// Local editor instance
const localEditor = ref<Editor | null>(null)

// Local label cache - updated immediately on save before store sync completes
const localLabelCache = ref<string | null>(null)

// Check if this node is being edited
const isEditing = computed(() => activeEditingNodeId.value === props.id)

// Display label - use local cache if available, otherwise props
const displayLabel = computed(() => {
  if (localLabelCache.value !== null) {
    return localLabelCache.value || 'Untitled'
  }
  return props.data.label || 'Untitled'
})

// Clear local cache when props update (store sync completed)
watch(() => props.data.label, () => {
  localLabelCache.value = null
})

/**
 * Start editing this node (called from double-click or F2)
 */
function startEditing() {
  if (isEditing.value) return

  // Set this node as active
  activeEditingNodeId.value = props.id

  void nextTick(() => {
    const isUntitled = displayLabel.value === 'Untitled'

    localEditor.value = createCanvasTitleEditor(
      displayLabel.value,
      {
        onSave: handleSave,
        onCancel: handleCancel
      },
      isUntitled
    )
  })
}

/**
 * Handle F2 key event from parent view
 */
function handleEditStart({ nodeId }: { nodeId: string }) {
  if (nodeId !== props.id) return
  startEditing()
}

/**
 * Handle Save (Enter or blur) - save changes and exit
 */
function handleSave(html: string) {
  // Strip <p> tags to get clean label for display
  const cleanLabel = html.replace(/<\/?p>/g, '')
  // Update local cache immediately so display updates before store sync
  localLabelCache.value = cleanLabel
  // Save to store
  updateNodeTitle(props.id, html, 'mindmap')
  localEditor.value = null
  destroyActiveEditor()
}

/**
 * Handle Cancel (ESC) - revert to original and exit
 */
function handleCancel() {
  // No need to update cache - we're reverting to original which is already in props
  localEditor.value = null
  destroyActiveEditor()
}

function toggleCollapse() {
  emit('toggleCollapse')
}

function toggleCollapseLeft() {
  emit('toggleCollapseLeft')
}

function toggleCollapseRight() {
  emit('toggleCollapseRight')
}

// Listen for edit events
onMounted(() => {
  eventBus.on('canvas:edit-node', handleEditStart)
})

onBeforeUnmount(() => {
  eventBus.off('canvas:edit-node', handleEditStart)
  if (activeEditingNodeId.value === props.id) {
    localEditor.value = null
    destroyActiveEditor()
  }
})

// Watch for external editor destruction
watch(isEditing, (newValue) => {
  if (!newValue && localEditor.value) {
    localEditor.value = null
  }
})
</script>

<style scoped>
.custom-node {
  background: white;
  border: 1px solid rgba(77, 171, 247,.5);
  border-radius: 8px;
  padding-left: 18px;
  padding-right: 18px;
  padding-top: 4px;
  padding-bottom: 2px;
  min-width: 100px;
  min-height: 30px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
  cursor: move;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.custom-node:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  border-color: #339af0;
}

.custom-node.potential-parent {
  background: #d0ebff;
  border-color: #4dabf7;
  border-width: 3px;
  box-shadow: 0 0 0 4px rgba(77, 171, 247, 0.2);
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 4px rgba(77, 171, 247, 0.2);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(77, 171, 247, 0.3);
  }
}

.node-content {
  font-size: 14px;
  font-weight: 500;
  color: #212529;
  text-align: center;
  padding-bottom: 2px;
}

/* Node label - static display */
.node-label {
  line-height: 1.4;
}

/* Remove paragraph margins from HTML content */
.node-label :deep(p) {
  margin: 0;
  padding: 0;
}

/* Editor wrapper - invisible, blends with node */
.node-editor-wrapper {
  /* No visible styles */
}

.node-editor {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  color: #212529;
}

/* Tiptap editor styles - invisible, same as static display */
:deep(.canvas-tiptap-editor) {
  outline: none;
  min-height: 20px;
}

:deep(.canvas-tiptap-editor p) {
  margin: 0;
  padding: 0;
}

:deep(.canvas-tiptap-editor strong) {
  font-weight: 600;
}

:deep(.canvas-tiptap-editor em) {
  font-style: italic;
}

.handle {
  width: 8px;
  height: 8px;
  background: rgba(77, 171, 247, 0);
  border: 2px solid rgba(19, 110, 230, 0);
  border-radius: 50%;
}

.handle:hover {
  background: #339af0;
}

.collapse-button {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  background: #4dabf7;
  border: 2px solid white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 10;
}

.collapse-button.left {
  left: -12px;
}

.collapse-button.right {
  right: -12px;
}

.collapse-button:hover {
  background: #228be6;
}

.collapse-button .icon {
  color: white;
  font-size: 18px;
  font-weight: bold;
  line-height: 1;
  user-select: none;
}

.collapse-button .badge {
  color: white;
  font-size: 11px;
  font-weight: bold;
  border-radius: 10px;
  min-width: 15px;
  text-align: center;
}

/* Dark mode */
.body--dark .custom-node {
  background: #2d3748;
  border-color: rgba(77, 171, 247, 0.4);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.body--dark .custom-node .node-content {
  color: #e2e8f0;
}

.body--dark .custom-node:hover {
  border-color: #4dabf7;
}

.body--dark .custom-node.potential-parent {
  background: #2c5282;
  border-color: #63b3ed;
}
</style>

