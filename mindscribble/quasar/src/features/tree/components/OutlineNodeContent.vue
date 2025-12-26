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
      <!-- Edit mode ON: Show editor when editing, show title when not editing -->
      <template v-if="props.isEditMode">
        <div
          v-if="!isEditing"
          class="node-title edit-mode"
          v-html="displayTitle"
          @click.stop="handleTitleClick"
        ></div>
        <EditorContent
          v-else-if="titleEditor"
          :editor="titleEditor"
          class="node-title editing"
          @click.stop
        />
      </template>

      <!-- Edit mode OFF: Always show title, no editor -->
      <template v-else>
        <div
          class="node-title navigation-mode"
          v-html="displayTitle"
          @keydown="handleNavigationKeydown"
          tabindex="0"
        ></div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, nextTick, onBeforeUnmount, inject, watch } from 'vue'
import { EditorContent, Editor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import type { MindscribbleNode } from '../../../core/types'
import { useUnifiedDocumentStore } from '../../../core/stores/unifiedDocumentStore'
import { createKeyboardHandler, createNavigationHandler } from '../composables/useOutlineKeyboardHandlers'
import type { useOutlineNavigation } from '../composables/useOutlineNavigation'
import type { EventSource } from '../../../core/events'
import type { NodeData } from '../../../core/types'

const props = defineProps<{
  node: MindscribbleNode
  stat: {
    children: { length: number }
    open: boolean
  }
  triggerClass: string
  isEditMode: boolean
}>()

// Unified store
const unifiedStore = useUnifiedDocumentStore()

const navigation = inject<ReturnType<typeof useOutlineNavigation>>('outlineNavigation')

// Inject emitter at setup time (inject must be called during setup, not inside functions)
const outlineEmitter = inject<{ emit: (event: string, payload: unknown) => void; on: (event: string, handler: (payload: unknown) => void) => void }>('outlineEmitter')

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
const isEditing = ref(false)

// Selection state
const isSelected = computed(() => {
  return unifiedStore.selectedNodeIds.includes(props.node.id)
})

// Display values
const displayTitle = computed(() => props.node.data.title || '<span class="placeholder">Untitled</span>')

// Expansion state from store - sync he-tree stat.open with store expansion state
const isNodeExpanded = computed(() => {
  if (props.stat.children.length === 0) return false // No children means effectively expanded
  return unifiedStore.isNodeExpanded(props.node.id)
})

// Sync he-tree stat.open with store expansion state
watch(isNodeExpanded, (expanded) => {
  // Update he-tree's internal state to match store
  // eslint-disable-next-line vue/no-mutating-props
  props.stat.open = expanded
}, { immediate: true })

// Tiptap editor - use shallowRef for complex objects like Editor
const titleEditor = shallowRef<Editor | null>(null)

// Click handlers
function handleNodeClick(event: MouseEvent) {
  if (event.ctrlKey || event.metaKey) {
    // Ctrl+click: Select and navigate
    unifiedStore.selectNode(props.node.id, 'outline', true)
  } else {
    // Regular click: Select and scroll into view in other views
    // The useViewEvents composable will automatically ignore this event in the outline view itself
    selectNode(props.node.id, 'outline', true)

    // If in navigation mode (edit mode OFF), focus this node
    if (!props.isEditMode) {
      void nextTick(() => {
        focusNode(props.node.id)
      })
    }
  }
}

function handleTitleClick() {
  // Only open editor if edit mode is ON
  if (props.isEditMode) {
    openTitleEditor('end')
  }
}

function handleNavigationKeydown(event: KeyboardEvent) {
  // Only handle navigation in edit mode OFF
  if (props.isEditMode) return

  const navigationHandler = createNavigationHandler({
    onUpArrow: () => {
      if (navigation) {
        const prevNode = navigation.getPreviousNode(props.node.id)
        if (prevNode) {
          // Select the previous node and focus it
          selectNode(prevNode.id, 'outline', false)
          void nextTick(() => {
            focusNode(prevNode.id)
          })
        }
      }
    },
    onDownArrow: () => {
      if (navigation) {
        const nextNode = navigation.getNextNode(props.node.id)
        if (nextNode) {
          // Select the next node and focus it
          selectNode(nextNode.id, 'outline', false)
          void nextTick(() => {
            focusNode(nextNode.id)
          })
        }
      }
    },
    onAltLeftArrow: () => {
      // Collapse node if it has children and is expanded
      if (props.stat.children.length > 0) {
        const nodeIdToRefocus = props.node.id
        unifiedStore.collapseNode(props.node.id, 'outline')
        // Refocus this node after collapse to maintain keyboard focus
        // Use setTimeout with 100ms delay to ensure DOM has fully updated after he-tree re-render
        setTimeout(() => {
          focusNode(nodeIdToRefocus)
        }, 100)
      }
    },
    onAltRightArrow: () => {
      // Expand node if it has children and is collapsed
      if (props.stat.children.length > 0) {
        const nodeIdToRefocus = props.node.id
        unifiedStore.expandNode(props.node.id, 'outline')
        // Refocus this node after expand to maintain keyboard focus
        // Use setTimeout with 100ms delay to ensure DOM has fully updated after he-tree re-render
        setTimeout(() => {
          focusNode(nodeIdToRefocus)
        }, 100)
      }
    }
  })

  navigationHandler(event)
}

// Focus a specific node when in navigation mode
function focusNode(nodeId: string) {
  // Find the node element and focus it
  const nodeElement = document.querySelector(`[data-node-id="${nodeId}"] .node-title`)
  if (nodeElement) {
    (nodeElement as HTMLElement).focus()

    // For navigation mode, ensure the element is scrollable and visible
    if (!props.isEditMode) {
      setTimeout(() => {
        nodeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 10)
    }
  }
}

// Navigation helper
function navigateToNode(nodeId: string, cursorPosition: 'start' | 'end') {
  selectNode(nodeId, 'outline', false)
  void nextTick(() => {
    outlineEmitter?.emit('open-title-editor', { nodeId, cursorPosition })
  })
}

// Title editor
function openTitleEditor(cursorPosition: 'start' | 'end' = 'end') {
  // Only open editor if edit mode is ON
  if (!props.isEditMode || isEditing.value) return
  selectNode(props.node.id, 'outline', false)
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
            unifiedStore.collapseNode(props.node.id, 'outline')
          }
        },
        onAltRightArrow: () => {
          // Expand node if it has children and is collapsed
          if (props.stat.children.length > 0) {
            unifiedStore.expandNode(props.node.id, 'outline')
          }
        }
      })
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      // Strip <p> tags for title
      const text = html.replace(/<\/?p>/g, '')

      // Update the store (this will emit an event that other views will receive)
      updateNode(props.node.id, { title: text }, 'outline')

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
  const wasInEditMode = props.isEditMode
  titleEditor.value?.destroy()
  titleEditor.value = null
  isEditing.value = false

  // If we're still in edit mode (just finished editing a node), keep focus on the node
  // If we're exiting edit mode entirely, also keep focus for navigation
  if (wasInEditMode || !props.isEditMode) {
    void nextTick(() => {
      focusNode(props.node.id)
    })
  }
}

// Listen for title editor open events (using the outlineEmitter injected at setup time)
outlineEmitter?.on('open-title-editor', (payload: unknown) => {
  const { nodeId, cursorPosition } = payload as { nodeId: string; cursorPosition: 'start' | 'end' }
  if (nodeId === props.node.id) {
    openTitleEditor(cursorPosition)
  }
})

// Listen for focus-and-edit events
outlineEmitter?.on('focus-and-edit-node', (payload: unknown) => {
  const { nodeId } = payload as { nodeId: string }
  if (nodeId === props.node.id) {
    // Use setTimeout instead of nextTick for more reliable DOM updates
    setTimeout(() => {
      if (props.isEditMode) {
        openTitleEditor('end')
      } else {
        focusNode(props.node.id)
      }
    }, 50)
  }
})

// Watch for edit mode changes - close editor if toggled off
watch(() => props.isEditMode, (newEditMode) => {
  if (!newEditMode && isEditing.value) {
    destroyTitleEditor()
    // When edit mode is turned off, ensure the node keeps focus for navigation
    void nextTick(() => {
      focusNode(props.node.id)
    })
  }
})

// Watch for selection changes - focus node when selected in navigation mode
watch(isSelected, (selected) => {
  if (selected && !props.isEditMode) {
    void nextTick(() => {
      focusNode(props.node.id)
    })
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  outline: none; // Remove default focus outline

  &.navigation-mode {
    cursor: default; // Default cursor in navigation mode
  }

  &.edit-mode {
    cursor: text; // Text cursor in edit mode
  }

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
