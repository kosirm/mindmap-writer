<template>
  <div class="custom-node">
    <!-- Vue Flow handles (invisible, center-positioned) -->
    <Handle
      type="source"
      :position="Position.Top"
      id="center"
      class="center-handle"
      :style="{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }"
    />
    <Handle
      type="target"
      :position="Position.Top"
      id="center"
      class="center-handle"
      :style="{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }"
    />

    <!-- Node content -->
    <div
      class="node-content"
    >
      <!-- Static HTML (when not editing) -->
      <div
        v-if="!isEditing"
        class="node-title"
        v-html="displayTitle"
      ></div>

      <!-- Tiptap Editor (when editing) -->
      <div
        v-else
        @keydown.stop
        @keyup.stop
        @keypress.stop
        class="node-title-editor-wrapper"
      >
        <EditorContent
          v-if="localEditor"
          :editor="(localEditor as any)"
          class="node-title-editor"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { Handle, Position } from '@vue-flow/core';
import { EditorContent, type Editor } from '@tiptap/vue-3';
import { eventBus } from '../composables/useEventBus';
import {
  activeNodeId,
  createTitleEditor,
  destroyActiveEditor,
} from '../composables/useNodeEditor';

// Props from Vue Flow
interface Props {
  id: string;
  data: {
    title: string;
    content: string;
    parentId: string | null;
  };
}

const props = defineProps<Props>();

// Emit to update node data
const emit = defineEmits<{
  'update:data': [data: Props['data']];
}>();

// Local state
const localEditor = ref<Editor | null>(null);
const isEditing = computed(() => {
  const active = activeNodeId.value === props.id;
  // console.log('[CustomNode] isEditing computed for node:', props.id, 'active:', active, 'activeNodeId:', activeNodeId.value);
  return active;
});

// Display title (use title field - it should always have a value now)
const displayTitle = computed(() => {
  return props.data.title || 'Untitled';
});

/**
 * Handle edit start event (triggered by E key)
 */
function handleEditStart({ nodeId }: { nodeId: string }) {
  // Only handle if this is the node being edited
  if (nodeId !== props.id) return;

  // console.log('[CustomNode] Edit start for node:', props.id, 'displayTitle:', displayTitle.value);

  // Set this node as active
  activeNodeId.value = props.id;

  // console.log('[CustomNode] Set activeNodeId to:', activeNodeId.value);

  // Wait for reactivity to update and create editor
  void nextTick(() => {
    // console.log('[CustomNode] After nextTick, isEditing:', isEditing.value, 'for node:', props.id);
    // console.log('[CustomNode] activeNodeId.value:', activeNodeId.value, 'props.id:', props.id, 'equal?', activeNodeId.value === props.id);

    // Create Tiptap editor and store it locally
    localEditor.value = createTitleEditor(
      displayTitle.value,
      handleTitleUpdate,
      handleBlur
    );

    // console.log('[CustomNode] Editor created:', localEditor.value);
    // console.log('[CustomNode] localEditor.value:', localEditor.value, 'isEditing:', isEditing.value);
  });
}

/**
 * Handle title update (called on every keystroke)
 */
function handleTitleUpdate(html: string) {
  // Update node data
  emit('update:data', {
    ...props.data,
    title: html,
  });

  // Emit event
  eventBus.emit('node:title-updated', { nodeId: props.id, title: html });
}

/**
 * Handle blur (when editor loses focus)
 */
function handleBlur() {
  // Clear local editor reference
  localEditor.value = null;

  // Destroy editor
  destroyActiveEditor();

  // Emit event
  eventBus.emit('node:edit-end', { nodeId: props.id });
}

// Listen for edit start events
onMounted(() => {
  eventBus.on('node:edit-start', handleEditStart);
});

// Clean up on unmount
onBeforeUnmount(() => {
  eventBus.off('node:edit-start', handleEditStart);

  if (activeNodeId.value === props.id) {
    localEditor.value = null;
    destroyActiveEditor();
  }
});

// Watch for external editor destruction (e.g., another node was double-clicked)
watch(isEditing, (newValue) => {
  // console.log('[CustomNode] isEditing changed:', newValue, 'for node:', props.id);
  if (!newValue && localEditor.value) {
    // This node is no longer active, clear local editor
    localEditor.value = null;
  }
});

// Watch localEditor changes
// watch(localEditor, (newValue) => {
//   console.log('[CustomNode] localEditor changed:', newValue, 'for node:', props.id);
// });

// // Watch activeNodeId changes
// watch(activeNodeId, (newValue) => {
//   console.log('[CustomNode] activeNodeId changed:', newValue, 'for node:', props.id);
// });
</script>

<style scoped>
.custom-node {
  position: relative;
  background: white;
  border: 2px solid #1976d2;
  border-radius: 8px;
  padding: 4px 12px;
  /* min-width: 120px; */
  max-width: 300px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s;
}

.custom-node:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.center-handle {
  width: 12px !important;
  height: 12px !important;
  background: transparent !important;
  border: none !important;
  opacity: 0 !important;
  cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><line x1="8" y1="0" x2="8" y2="16" stroke="%231976D2" stroke-width="3"/><line x1="0" y1="8" x2="16" y2="8" stroke="%231976D2" stroke-width="3"/></svg>') 8 8, crosshair !important;
}

/* Keep it invisible even on hover */
.custom-node:hover .center-handle {
  opacity: 0 !important;
  background: transparent !important;
}

.node-content {
  cursor: hand;
}

.node-title {
  font-size: 14px;
  line-height: 1.4;
  color: #333;
  word-wrap: break-word;
}

/* Remove default paragraph margins from HTML content */
.node-title :deep(p) {
  margin: 0;
  padding: 0;
}

.node-title-editor-wrapper {
  /* Transparent wrapper that blends with the node */
}

.node-title-editor {
  font-size: 14px;
  line-height: 1.4;
  color: #333;
}

/* Tiptap editor styles */
:deep(.tiptap-editor) {
  outline: none;
  min-height: 20px;
}

:deep(.tiptap-editor p) {
  margin: 0;
  padding: 0;
}

:deep(.tiptap-editor strong) {
  font-weight: 600;
}

:deep(.tiptap-editor em) {
  font-style: italic;
}

:deep(.tiptap-editor code) {
  background: #f5f5f5;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 0.9em;
}
</style>

