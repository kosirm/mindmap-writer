<template>
  <div
    class="writer-node"
    :class="{
      'is-selected': isSelected,
      'is-hovered': isHovered
    }"
    :data-node-id="node.id"
    :data-indent-level="indentLevel"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @click="handleNodeClick"
  >
    <!-- Drag handle (shown on hover) -->
    <div class="drag-handle" :class="triggerClass">
      <q-icon name="drag_indicator" size="18px" />
    </div>

    <!-- Node content -->
    <div class="node-content">
      <!-- Title -->
      <div class="title-wrapper">
        <div
          v-if="!isTitleEditing"
          class="node-title"
          v-html="displayTitle"
          @click.stop="handleTitleClick"
        ></div>
        <EditorContent
          v-else-if="titleEditor"
          :editor="titleEditor"
          class="node-title editing"
          @click.stop
        />
      </div>

      <!-- Content -->
      <div class="content-wrapper">
        <div
          v-if="!isContentEditing"
          class="node-body"
          v-html="displayContent"
          @click.stop="handleContentClick"
        ></div>
        <EditorContent
          v-else-if="contentEditor"
          :editor="contentEditor"
          class="node-body editing"
          @click.stop
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, nextTick, onBeforeUnmount, inject, watch } from 'vue'
import { EditorContent, Editor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import type { MindscribbleNode, NodeData } from '../../../core/types'
import type { EventSource } from '../../../core/events'
import { useUnifiedDocumentStore } from '../../../core/stores/unifiedDocumentStore'
import { createKeyboardHandler } from '../composables/useWriterKeyboardHandlers'
import type { useWriterNavigation } from '../composables/useWriterNavigation'

const props = defineProps<{
  node: MindscribbleNode
  stat: unknown // he-tree stat object
  triggerClass: string
  indentLevel?: number
}>()

// Unified store
const unifiedStore = useUnifiedDocumentStore()

const navigation = inject<ReturnType<typeof useWriterNavigation>>('writerNavigation')

// Inject emitter at setup time (inject must be called during setup, not inside functions)
const writerEmitter = inject<{ emit: (event: string, payload: unknown) => void; on: (event: string, handler: (payload: unknown) => void) => void }>('writerEmitter')

// Inject method to update local tree data (to avoid prop mutation)
const updateLocalNodeData = inject<(nodeId: string, updates: { title?: string; content?: string }) => void>('updateLocalNodeData')

// Helper functions to call the appropriate store
function selectNode(nodeId: string, source: EventSource, scrollIntoView: boolean) {
  unifiedStore.selectNode(nodeId, source, scrollIntoView)
}

function updateNode(nodeId: string, updates: Partial<NodeData>, source: EventSource) {
  unifiedStore.updateNode(nodeId, updates, source)
}

// UI state
const isHovered = ref(false)
const isTitleEditing = ref(false)
const isContentEditing = ref(false)

// Selection state
const isSelected = computed(() => {
  return unifiedStore.selectedNodeIds.includes(props.node.id)
})

// Indent level calculation - based on the stat object from he-tree
// The stat object typically contains information about the node's position in the tree
const indentLevel = computed(() => {
  // Try to extract depth from the stat object
  // he-tree typically provides depth information in the stat object
  if (props.stat && typeof props.stat === 'object') {
    console.log('Stat object for node', props.node.id, ':', props.stat)
    
    // Check for common depth properties
    if ('depth' in props.stat) {
      const depth = props.stat.depth as number
      console.log('Using depth:', depth)
      return depth
    } else if ('level' in props.stat) {
      const level = props.stat.level as number
      console.log('Using level:', level)
      return level
    } else if ('path' in props.stat && Array.isArray(props.stat.path)) {
      const pathLength = props.stat.path.length - 1
      console.log('Using path length:', pathLength)
      return pathLength
    } else if ('indent' in props.stat) {
      // Some tree components use 'indent' to indicate depth
      const indent = props.stat.indent as number
      console.log('Using indent:', indent)
      return indent
    } else if ('treeDepth' in props.stat) {
      const treeDepth = props.stat.treeDepth as number
      console.log('Using treeDepth:', treeDepth)
      return treeDepth
    }
  }
  console.log('No depth info found, defaulting to 0')
  return 0 // default to 0 if we can't determine the level
})


// Display values
const displayTitle = computed(() => props.node.data.title || '<span class="placeholder">Untitled</span>')
const displayContent = computed(() => {
  const content = props.node.data.content
  if (!content || content.trim() === '' || content === '<p></p>') {
    return '<p class="placeholder">Click to add content...</p>'
  }
  return content
})

// Tiptap editors - use shallowRef for complex objects like Editor
const titleEditor = shallowRef<Editor | null>(null)
const contentEditor = shallowRef<Editor | null>(null)

// Click handlers
function handleNodeClick(event: MouseEvent) {
  if (event.ctrlKey || event.metaKey) {
    // Ctrl+click: Select and navigate
    unifiedStore.selectNode(props.node.id, 'writer', true)
  } else {
    // Regular click: Select and scroll into view in other views
    // The useViewEvents composable will automatically ignore this event in the writer view itself
    selectNode(props.node.id, 'writer', true)
  }
}

function handleTitleClick() {
  openTitleEditor('end')
}

function handleContentClick() {
  openContentEditor('end')
}

// Navigation helper
function navigateToField(nodeId: string, field: 'title' | 'content', cursorPosition: 'start' | 'end') {
  selectNode(nodeId, 'writer', false)
  void nextTick(() => {
    writerEmitter?.emit('open-field', { nodeId, field, cursorPosition })
  })
}

// Title editor
function openTitleEditor(cursorPosition: 'start' | 'end' = 'end') {
  if (isTitleEditing.value) return
  selectNode(props.node.id, 'writer', false)
  isTitleEditing.value = true
  void nextTick(() => createTitleEditor(cursorPosition))
}

function createTitleEditor(cursorPosition: 'start' | 'end' = 'end') {
  if (titleEditor.value) return

  const isUntitled = !props.node.data.title

  titleEditor.value = new Editor({
    extensions: [
      StarterKit.configure({
        heading: false, codeBlock: false, bulletList: false,
        orderedList: false, listItem: false, blockquote: false, horizontalRule: false
      }),
      Placeholder.configure({ placeholder: 'Node title...' })
    ],
    content: props.node.data.title || '',
    autofocus: cursorPosition,
    editorProps: {
      handleKeyDown: createKeyboardHandler({
        onEnterKey: () => openContentEditor('start'),
        onRightArrowAtEnd: () => openContentEditor('start'),
        onLeftArrowAtStart: () => {
          if (navigation) {
            const prevField = navigation.getPreviousField(props.node.id, 'title')
            if (prevField) {
              navigateToField(prevField.nodeId, prevField.field === 'title' ? 'content' : prevField.field, 'end')
            }
          }
        },
        onUpArrowAtFirstLine: () => {
          if (navigation) {
            const prevField = navigation.getPreviousField(props.node.id, 'title')
            if (prevField) {
              navigateToField(prevField.nodeId, prevField.field === 'title' ? 'content' : prevField.field, 'end')
            }
          }
        },
        onDownArrowAtLastLine: () => openContentEditor('start')
      })
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      // Strip <p> tags for title
      const text = html.replace(/<\/?p>/g, '')

      // Update the store (this will emit an event that other views will receive)
      updateNode(props.node.id, { title: text }, 'writer')

      // Also update the local tree data immediately to avoid stale data
      // This is necessary because the store creates new node objects for reactivity
      updateLocalNodeData?.(props.node.id, { title: text })
    },
    onBlur: () => destroyTitleEditor()
  })

  if (isUntitled) {
    void nextTick(() => titleEditor.value?.commands.selectAll())
  }
}

function destroyTitleEditor() {
  titleEditor.value?.destroy()
  titleEditor.value = null
  isTitleEditing.value = false
}

// Content editor
function openContentEditor(cursorPosition: 'start' | 'end' = 'end') {
  if (isContentEditing.value) return
  selectNode(props.node.id, 'writer', false)
  isContentEditing.value = true
  void nextTick(() => createContentEditor(cursorPosition))
}

function createContentEditor(cursorPosition: 'start' | 'end' = 'end') {
  if (contentEditor.value) return

  contentEditor.value = new Editor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Node content...' })
    ],
    content: props.node.data.content || '',
    autofocus: cursorPosition,
    editorProps: {
      handleKeyDown: createKeyboardHandler({
        onLeftArrowAtStart: () => openTitleEditor('end'),
        onRightArrowAtEnd: () => {
          if (navigation) {
            const hasContent = props.node.data.content && (() => {
              const tmp = document.createElement('div')
              tmp.innerHTML = props.node.data.content
              return (tmp.textContent || '').trim() !== ''
            })()
            const currentField = hasContent ? 'content' : 'title'
            const nextField = navigation.getNextField(props.node.id, currentField)
            if (nextField) {
              navigateToField(nextField.nodeId, nextField.field, 'start')
            }
          }
        },
        onUpArrowAtFirstLine: () => openTitleEditor('end'),
        onDownArrowAtLastLine: () => {
          if (navigation) {
            const hasContent = props.node.data.content && (() => {
              const tmp = document.createElement('div')
              tmp.innerHTML = props.node.data.content
              return (tmp.textContent || '').trim() !== ''
            })()
            const currentField = hasContent ? 'content' : 'title'
            const nextField = navigation.getNextField(props.node.id, currentField)
            if (nextField) {
              navigateToField(nextField.nodeId, nextField.field, 'start')
            }
          }
        }
      })
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()

      // Update the store (this will emit an event that other views will receive)
      updateNode(props.node.id, { content: html }, 'writer')

      // Also update the local tree data immediately to avoid stale data
      // This is necessary because the store creates new node objects for reactivity
      updateLocalNodeData?.(props.node.id, { content: html })
    },
    onBlur: () => destroyContentEditor()
  })
}

function destroyContentEditor() {
  contentEditor.value?.destroy()
  contentEditor.value = null
  isContentEditing.value = false
}

// Listen for field open events (using the writerEmitter injected at setup time)
writerEmitter?.on('open-field', (payload: unknown) => {
  const { nodeId, field, cursorPosition } = payload as { nodeId: string; field: 'title' | 'content'; cursorPosition: 'start' | 'end' }
  if (nodeId === props.node.id) {
    if (field === 'title') {
      openTitleEditor(cursorPosition)
    } else {
      openContentEditor(cursorPosition)
    }
  }
})

// Watch for external selection changes to scroll into view
watch(() => unifiedStore.selectedNodeIds, (newIds) => {
  if (newIds.includes(props.node.id)) {
    // Could scroll into view here if needed
  }
})

// Cleanup
onBeforeUnmount(() => {
  destroyTitleEditor()
  destroyContentEditor()
})
</script>

<style scoped lang="scss">
.writer-node {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  padding: 6px 8px;
  margin: 0;
  border-radius: 4px;
  border: 1px solid transparent;
  transition: all 0.15s ease;
  cursor: default;

  &.is-hovered {
    background-color: rgba(0, 0, 0, 0.02);
  }

  &.is-selected {
    border-color: var(--q-primary, #1976d2);
    background-color: rgba(25, 118, 210, 0.05);
  }
}

// Indent rainbow styling - simple colored left border based on indent level
.indent-rainbow-enabled .writer-node {
  // Level 1 - Red
  &[data-indent-level="1"] {
    border-left: 3px solid rgba(255, 100, 100, 0.4);
  }

  // Level 2 - Green
  &[data-indent-level="2"] {
    border-left: 3px solid rgba(100, 255, 100, 0.4);
  }

  // Level 3 - Blue
  &[data-indent-level="3"] {
    border-left: 3px solid rgba(100, 100, 255, 0.4);
  }

  // Level 4 - Yellow
  &[data-indent-level="4"] {
    border-left: 3px solid rgba(255, 255, 100, 0.4);
  }

  // Level 5+ - Cycle back to red
  &[data-indent-level="5"] {
    border-left: 3px solid rgba(255, 100, 100, 0.4);
  }
}

.drag-handle {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  color: var(--ms-text-secondary);
  border-radius: 3px;
  opacity: 0;
  transition: all 0.15s ease;
  margin-top: 2px;

  &:hover {
    background-color: rgba(255, 255, 255, 0.08);
    color: var(--ms-text-primary);
  }

  .writer-node.is-hovered &,
  .writer-node.is-selected & {
    opacity: 1;
  }
}

.node-content {
  flex: 1;
  min-width: 0;
}

.title-wrapper {
  margin-bottom: 2px;
}

.node-title {
  font-weight: 600;
  font-size: 14px;
  line-height: 1.5;
  color: var(--ms-text-primary);
  cursor: text;

  :deep(.placeholder) {
    color: var(--ms-text-secondary);
    font-style: italic;
    font-weight: normal;
    opacity: 0.7;
  }

  :deep(p) {
    margin: 0;
  }
}

.node-body {
  font-size: 13px;
  line-height: 1.6;
  color: var(--ms-text-secondary);
  cursor: text;

  :deep(p) {
    margin: 0 0 6px 0;
    &:last-child { margin-bottom: 0; }
    &.placeholder {
      color: var(--ms-text-secondary);
      font-style: italic;
      opacity: 0.6;
    }
  }
}

// Tiptap editor styles
:deep(.ProseMirror) {
  outline: none;
  padding: 0;
  border: none;
  background-color: transparent;
  color: var(--ms-text-primary);

  p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    float: left;
    color: var(--ms-text-secondary);
    pointer-events: none;
    height: 0;
    font-style: italic;
    opacity: 0.7;
  }
}

.node-title :deep(.ProseMirror) {
  font-weight: 600;
  font-size: 14px;
  line-height: 1.5;
  color: var(--ms-text-primary);
}

.node-body :deep(.ProseMirror) {
  font-size: 13px;
  line-height: 1.6;
  color: var(--ms-text-secondary);
}
</style>

