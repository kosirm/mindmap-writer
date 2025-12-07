<template>
  <div
    class="concept-node"
    :class="{
      'is-parent': isParent,
      'is-leaf': !isParent,
      'is-editing': isEditing
    }"
  >
    <!-- Node header/label -->
    <div ref="headerRef" class="node-header" :class="{ 'editing': isEditing }" @dblclick.stop="handleDblClick">
      <!-- Static display when not editing -->
      <!-- Parent nodes: plain text with ellipsis -->
      <span v-if="isParent" class="node-label" @mousedown="hideTooltip">
        {{ displayLabelPlainText }}
        <q-tooltip
          v-if="hasMultipleLines"
          ref="tooltipRef"
          :delay="400"
          anchor="top middle"
          self="bottom middle"
        >
          <span v-html="fullTitleHtml"></span>
        </q-tooltip>
      </span>
      <!-- Leaf nodes: full HTML when not editing, editor when editing -->
      <span v-else-if="!isEditing" class="node-label" v-html="displayLabel"></span>

      <!-- Tiptap editor when editing (leaf nodes only) -->
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

    <!-- Content area for child nodes (rendered by VueFlow's nested node system) -->
    <div v-if="isParent" class="node-content">
      <!-- Children are automatically rendered here by VueFlow -->
    </div>

    <!-- Handles for connections - 4 sides (matching mindmap node) -->
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

interface NodeDataProps {
  label: string
  isParent?: boolean
}

const props = defineProps<{
  data: NodeDataProps
  nodeId: string
  isParent: boolean
}>()

const emit = defineEmits<{
  (e: 'open-title-popup', payload: { nodeId: string; label: string; rect: DOMRect }): void
}>()

const { updateNodeTitle } = useCanvasNodeEditor()

// Ref to the header element for getting position
const headerRef = ref<HTMLElement | null>(null)

// Ref to tooltip for programmatic hide
const tooltipRef = ref<{ hide: () => void } | null>(null)

// Local editor instance (for leaf nodes only)
const localEditor = ref<Editor | null>(null)

// Local label cache - updated immediately on save before store sync completes
const localLabelCache = ref<string | null>(null)

// Check if this node is being edited (leaf nodes only - parent nodes use popup)
const isEditing = computed(() => !props.isParent && activeEditingNodeId.value === props.nodeId)

// Display label - use local cache if available, otherwise props
const displayLabel = computed(() => {
  if (localLabelCache.value !== null) {
    return localLabelCache.value || 'Untitled'
  }
  return props.data.label || 'Untitled'
})

// Check if title has multiple lines (contains <br>)
const hasMultipleLines = computed(() => {
  return /<br\s*\/?>/i.test(displayLabel.value)
})

// For parent node headers: show first line only, truncate at <br>
const displayLabelPlainText = computed(() => {
  const html = displayLabel.value
  // Take only content before first <br> tag
  const firstLine = html.split(/<br\s*\/?>/i)[0] || ''
  // Strip any remaining HTML tags and clean up whitespace
  const text = firstLine
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  // Add ellipsis indicator if there were more lines
  return (text || 'Untitled') + (hasMultipleLines.value ? ' …' : '')
})

// Full title HTML for tooltip (keep <br> tags, strip other HTML)
const fullTitleHtml = computed(() => {
  const html = displayLabel.value
  // Keep <br> tags, strip other HTML tags (like <p>)
  return html
    .replace(/<(?!br\s*\/?)[^>]+>/gi, '')
    .trim() || 'Untitled'
})

// Clear local cache when props update (store sync completed)
watch(() => props.data.label, () => {
  localLabelCache.value = null
})

/**
 * Hide tooltip on mousedown (before drag starts)
 */
function hideTooltip() {
  tooltipRef.value?.hide()
}

/**
 * Handle double-click - parent nodes open popup, leaf nodes edit inline
 */
function handleDblClick() {
  if (props.isParent) {
    // Parent nodes: emit event to open popup
    if (headerRef.value) {
      const rect = headerRef.value.getBoundingClientRect()
      emit('open-title-popup', {
        nodeId: props.nodeId,
        label: props.data.label || 'Untitled',
        rect
      })
    }
  } else {
    // Leaf nodes: edit inline
    startEditing()
  }
}

/**
 * Start editing this node (leaf nodes only)
 */
function startEditing() {
  if (isEditing.value || props.isParent) return

  // Set this node as active
  activeEditingNodeId.value = props.nodeId

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
  if (nodeId !== props.nodeId) return
  handleDblClick() // Use same logic as double-click
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
  updateNodeTitle(props.nodeId, html, 'concept-map')
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

// Listen for edit events
onMounted(() => {
  eventBus.on('canvas:edit-node', handleEditStart)
})

onBeforeUnmount(() => {
  eventBus.off('canvas:edit-node', handleEditStart)
  if (activeEditingNodeId.value === props.nodeId) {
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
/* Base node style - matching mindmap CustomNode */
.concept-node {
  background: white;
  border: 1px solid rgba(77, 171, 247, 0.5);
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

.concept-node:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  border-color: #339af0;
}

/* Parent nodes (containers) - dashed border to indicate they contain children */
/* Parent nodes MUST have width/height 100% to fill their VueFlow wrapper */
.concept-node.is-parent {
  width: 100%;
  height: 100%;
  background: #f8f9fa;
  border-color: rgba(77, 171, 247, 0.5);
  border-width: 2px;
  border-style: dashed;
}

/* Leaf nodes - auto-size based on content (no width/height: 100%) */
.concept-node.is-leaf {
  background: white;
}

.node-header {
  font-weight: 500;
  font-size: 14px;
  color: #212529;
  text-align: center;
  padding-bottom: 2px;
}

.is-parent .node-header {
  background: #e9ecef;
  color: #495057;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  position: relative;
}

/* Ellipsis for long titles in parent nodes (when NOT editing) */
.is-parent .node-header .node-label {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* Strip HTML tags for ellipsis display - show plain text */
.is-parent .node-header .node-label :deep(p) {
  display: inline;
  margin: 0;
}

.node-content {
  position: relative;
  flex: 1;
  min-height: 60px;
}

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

/* Handles - matching mindmap node handles */
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

/* Dark mode */
:global(.body--dark) .concept-node {
  background: #2d3748;
  border-color: rgba(77, 171, 247, 0.4);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

:global(.body--dark) .concept-node .node-header {
  color: #e2e8f0;
}

:global(.body--dark) .concept-node:hover {
  border-color: #4dabf7;
}

:global(.body--dark) .concept-node.is-parent {
  background: #1e1e1e;
  border-color: rgba(77, 171, 247, 0.4);
}

:global(.body--dark) .is-parent .node-header {
  background: #333;
  color: #e0e0e0;
}

</style>

