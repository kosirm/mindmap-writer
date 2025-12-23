<template>
  <div
    class="outline-node"
    :class="{
      'is-selected': isSelected,
      'is-hovered': isHovered
    }"
    :data-node-id="node.id"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @click="handleNodeClick"
  >
    <!-- Expand/collapse button -->
    <!-- eslint-disable-next-line vue/no-mutating-props -->
    <div v-if="stat.children.length" class="expand-toggle" @click.stop="stat.open = !stat.open">
      <q-icon :name="stat.open ? 'expand_more' : 'chevron_right'" size="18px" />
    </div>
    <div v-else class="expand-spacer"></div>

    <!-- Drag handle (shown on hover) -->
    <div class="drag-handle" :class="triggerClass">
      <q-icon name="drag_indicator" size="18px" />
    </div>

    <!-- Node title -->
    <div class="node-title-wrapper">
      <div
        v-if="!isEditing"
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
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, nextTick, onBeforeUnmount, inject } from 'vue'
import { EditorContent, Editor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import type { MindscribbleNode } from '../../../core/types'
import { useDocumentStore } from '../../../core/stores'
import { createKeyboardHandler } from '../composables/useOutlineKeyboardHandlers'
import type { useOutlineNavigation } from '../composables/useOutlineNavigation'

const props = defineProps<{
  node: MindscribbleNode
  stat: {
    children: { length: number }
    open: boolean
  }
  triggerClass: string
}>()

const documentStore = useDocumentStore()
const navigation = inject<ReturnType<typeof useOutlineNavigation>>('outlineNavigation')

// Inject emitter at setup time (inject must be called during setup, not inside functions)
const outlineEmitter = inject<{ emit: (event: string, payload: unknown) => void; on: (event: string, handler: (payload: unknown) => void) => void }>('outlineEmitter')

// UI state
const isHovered = ref(false)
const isEditing = ref(false)

// Selection state
const isSelected = computed(() => documentStore.selectedNodeIds.includes(props.node.id))

// Display values
const displayTitle = computed(() => props.node.data.title || '<span class="placeholder">Untitled</span>')

// Tiptap editor - use shallowRef for complex objects like Editor
const titleEditor = shallowRef<Editor | null>(null)

// Click handlers
function handleNodeClick(event: MouseEvent) {
  if (event.ctrlKey || event.metaKey) {
    // Ctrl+click: Select and navigate
    documentStore.selectNavigateNode(props.node.id, 'outline')
  } else {
    // Regular click: Select without navigation
    documentStore.selectNode(props.node.id, 'outline', false)
  }
}

function handleTitleClick() {
  openTitleEditor('end')
}

// Navigation helper
function navigateToNode(nodeId: string, cursorPosition: 'start' | 'end') {
  documentStore.selectNode(nodeId, 'outline', false)
  void nextTick(() => {
    outlineEmitter?.emit('open-title-editor', { nodeId, cursorPosition })
  })
}

// Title editor
function openTitleEditor(cursorPosition: 'start' | 'end' = 'end') {
  if (isEditing.value) return
  documentStore.selectNode(props.node.id, 'outline', false)
  isEditing.value = true
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
        onEnterKey: (view, event) => {
          // Ctrl+Enter: Add new line to title
          if (event.ctrlKey) {
            // Insert a line break at cursor position
            titleEditor.value?.commands.insertContent({ type: 'text', text: '\n' })
            return true
          }
          // Regular Enter: Finish editing
          destroyTitleEditor()
        },
        onUpArrowAtFirstLine: () => {
          if (navigation) {
            const prevNode = navigation.getPreviousNode(props.node.id)
            if (prevNode) {
              navigateToNode(prevNode.id, 'end')
            }
          }
        },
        onDownArrowAtLastLine: () => {
          if (navigation) {
            const nextNode = navigation.getNextNode(props.node.id)
            if (nextNode) {
              navigateToNode(nextNode.id, 'start')
            }
          }
        },
        onAltLeftArrow: () => {
          // Collapse node if it has children and is expanded
          if (props.stat.children.length > 0) {
            documentStore.collapseNode(props.node.id, 'outline')
          }
        },
        onAltRightArrow: () => {
          // Expand node if it has children and is collapsed
          if (props.stat.children.length > 0) {
            documentStore.expandNode(props.node.id, 'outline')
          }
        }
      })
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      // Strip <p> tags for title
      const text = html.replace(/<\/?p>/g, '')
      documentStore.updateNode(props.node.id, { title: text }, 'outline')
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
  isEditing.value = false
}

// Listen for title editor open events (using the outlineEmitter injected at setup time)
outlineEmitter?.on('open-title-editor', (payload: unknown) => {
  const { nodeId, cursorPosition } = payload as { nodeId: string; cursorPosition: 'start' | 'end' }
  if (nodeId === props.node.id) {
    openTitleEditor(cursorPosition)
  }
})

// Cleanup
onBeforeUnmount(() => {
  destroyTitleEditor()
})
</script>

<style scoped lang="scss">
.outline-node {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 0px;
  border-radius: 4px;
  border: 1px solid transparent;
  transition: all 0.15s ease;
  cursor: default;
  min-height: 32px;
  position: relative;

  &.is-hovered {
    background-color: rgba(0, 0, 0, 0.02);
  }

  &.is-selected {
    border-color: var(--q-primary, #1976d2);
    background-color: rgba(25, 118, 210, 0.05);
  }
}

.expand-toggle {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--ms-text-secondary);
  border-radius: 3px;
  transition: all 0.15s ease;
  margin-right: 2px;

  &:hover {
    background-color: rgba(255, 255, 255, 0.08);
    color: var(--ms-text-primary);
  }
}

.expand-spacer {
  width: 24px;
  flex-shrink: 0;
}

.drag-handle {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
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

  &:hover {
    background-color: rgba(255, 255, 255, 0.08);
    color: var(--ms-text-primary);
  }

  .outline-node.is-hovered &,
  .outline-node.is-selected & {
    opacity: 1;
  }
}

.node-title-wrapper {
  flex: 1;
  min-width: 0;
  padding-right: 32px; // Make space for drag handle
}

.node-title-wrapper {
  flex: 1;
  min-width: 0;
}

.node-title {
  font-weight: 500;
  font-size: 13px;
  line-height: 1.5;
  color: var(--ms-text-primary);
  cursor: text;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

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
  font-weight: 500;
  font-size: 13px;
  line-height: 1.5;
  color: var(--ms-text-primary);
}
</style>
