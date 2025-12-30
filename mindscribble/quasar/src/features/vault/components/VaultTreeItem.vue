<template>
  <div
    class="vault-tree-item"
    :class="{
      'is-selected': isSelected,
      'is-hovered': isHovered
    }"
    :data-item-id="item.id"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @click="handleItemClick"
  >
    <!-- Expand/collapse button for folders -->
    <div v-if="stat.children.length && item.type !== 'file'" class="expand-toggle" @click.stop="() => toggleFolder()">
      <q-icon :name="stat.open ? 'expand_more' : 'chevron_right'" size="18px" />
    </div>
    <div v-else class="expand-spacer"></div>

    <!-- Icon based on item type -->
    <div class="item-icon">
      <q-icon
        :name="item.type === 'file' ? 'description' : 'folder'"
        size="18px"
        :color="item.type === 'file' ? 'blue-6' : 'amber-8'"
      />
    </div>

    <!-- Drag handle (shown on hover) -->
    <div class="drag-handle" :class="triggerClass">
      <q-icon name="drag_indicator" size="18px" />
    </div>

    <!-- Item title -->
    <div class="item-title-wrapper">
      <!-- Edit mode ON: Show editor when editing, show title when not editing -->
      <template v-if="props.isEditMode">
        <div
          v-if="!isEditing"
          class="item-title edit-mode"
          v-html="displayTitle"
          @click.stop="handleTitleClick"
        ></div>
        <EditorContent
          v-else-if="titleEditor"
          :editor="titleEditor"
          class="item-title editing"
          @click.stop
        />
      </template>

      <!-- Edit mode OFF: Always show title, no editor -->
      <template v-else>
        <div
          class="item-title navigation-mode"
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
import { useQuasar } from 'quasar'
import type { FileSystemItem } from 'src/core/services/indexedDBService'
import { useFileSystem } from 'src/composables/useFileSystem'

const props = defineProps<{
  item: FileSystemItem
  stat: {
    children: { length: number }
    open: boolean
  }
  triggerClass: string
  isEditMode: boolean
}>()

// File system service
const fileSystemService = useFileSystem()

// Quasar instance for notifications
const $q = useQuasar()

// Inject emitter at setup time
const vaultEmitter = inject<{ emit: (event: string, payload: unknown) => void; on: (event: string, handler: (payload: unknown) => void) => void }>('vaultEmitter')

// Inject method to update local tree data (to avoid prop mutation)
const updateLocalTreeItemData = inject<(itemId: string, updates: { name?: string }) => void>('updateLocalTreeItemData')

// UI state
const isHovered = ref(false)
const isEditing = ref(false)

// Selection state (simplified for now)
const isSelected = ref(false)

// Rename guard to prevent duplicate renames
const isRenaming = ref(false)

// Display values
const displayTitle = computed(() => props.item.name || '<span class="placeholder">Untitled</span>')

// Tiptap editor - use shallowRef for complex objects like Editor
const titleEditor = shallowRef<Editor | null>(null)

// Click handlers
function handleItemClick(event: MouseEvent) {
  if (event.ctrlKey || event.metaKey) {
    // Ctrl+click: Select and navigate
    isSelected.value = true
  } else {
    // Regular click: Select
    isSelected.value = true

    // If in navigation mode (edit mode OFF), focus this item
    if (!props.isEditMode) {
      void nextTick(() => {
        focusItem(props.item.id)
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

  // Basic navigation - would need more sophisticated implementation
  if (event.key === 'Enter') {
    // Open the item
    openItem(props.item)
  }
}

// Focus a specific item when in navigation mode
function focusItem(itemId: string) {
  // Find the item element and focus it
  const itemElement = document.querySelector(`[data-item-id="${itemId}"] .item-title`)
  if (itemElement) {
    (itemElement as HTMLElement).focus()

    // For navigation mode, ensure the element is scrollable and visible
    if (!props.isEditMode) {
      setTimeout(() => {
        itemElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 10)
    }
  }
}

// Folder toggle method
function toggleFolder(): void {
  vaultEmitter?.emit('toggle-folder', { itemId: props.item.id })
}

// Open the item (file or folder)
function openItem(item: FileSystemItem) {
  if (item.type === 'file') {
    // Open file - would integrate with document store
    console.log('Opening file:', item.name)
    // TODO: Integrate with unified document store
  } else if (item.type === 'folder') {
    // Toggle folder expansion
    toggleFolder()
  }

// Add toggleFolder to the component's exposed methods
defineExpose({
  toggleFolder
})
}

// Title editor
function openTitleEditor(cursorPosition: 'start' | 'end' = 'end') {
  // Only open editor if edit mode is ON
  if (!props.isEditMode || isEditing.value) return
  isSelected.value = true
  isEditing.value = true
  void nextTick(() => createTitleEditor(cursorPosition))
}

function createTitleEditor(cursorPosition: 'start' | 'end' = 'end') {
  if (titleEditor.value) return

  const isUntitled = !props.item.name
  const originalName = props.item.name || ''

  titleEditor.value = new Editor({
    extensions: [
      StarterKit.configure({
        heading: false, codeBlock: false, bulletList: false,
        orderedList: false, listItem: false, blockquote: false, horizontalRule: false
      }),
      Placeholder.configure({ placeholder: 'Item name...' })
    ],
    content: originalName,
    autofocus: cursorPosition,
    editorProps: {
      handleKeyDown: (view, event) => {
        // Ctrl+Enter: Add new line to title
        if (event.ctrlKey && event.key === 'Enter') {
          // Insert a line break at cursor position
          titleEditor.value?.commands.insertContent({ type: 'text', text: '\n' })
          return true
        }
        // Regular Enter: Finish editing and save
        if (event.key === 'Enter') {
          event.preventDefault()
          const html = titleEditor.value?.getHTML() || ''
          const text = html.replace(/<\/?p>/g, '').trim()

          // Only rename if the name actually changed
          if (text && text !== originalName) {
            void renameItem(props.item.id, text)
          }

          destroyTitleEditor()
          return true
        }
        // Escape: Cancel editing without saving
        if (event.key === 'Escape') {
          event.preventDefault()
          destroyTitleEditor()
          return true
        }
      }
    },
    onBlur: () => {
      // Save on blur
      const html = titleEditor.value?.getHTML() || ''
      const text = html.replace(/<\/?p>/g, '').trim()

      // Only rename if the name actually changed
      if (text && text !== originalName) {
        void renameItem(props.item.id, text)
      }

      destroyTitleEditor()
    }
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

  // If we're still in edit mode (just finished editing an item), keep focus on the item
  if (wasInEditMode || !props.isEditMode) {
    void nextTick(() => {
      focusItem(props.item.id)
    })
  }
}

// Rename item
async function renameItem(itemId: string, newName: string) {
  console.log('🔍 [VaultTreeItem] Renaming item:', itemId, 'to:', newName, 'from component for item:', props.item.id)

  // Verify we're renaming the correct item
  if (itemId !== props.item.id) {
    console.error('❌ [VaultTreeItem] Item ID mismatch! Trying to rename', itemId, 'but component is for', props.item.id)
    return
  }

  // Guard against duplicate renames
  if (isRenaming.value) {
    console.warn('⚠️ [VaultTreeItem] Rename already in progress for item:', itemId)
    return
  }

  isRenaming.value = true

  try {
    // Validate new name
    const trimmedName = newName.trim()
    if (!trimmedName) {
      console.warn('⚠️ [VaultTreeItem] Empty name provided, skipping rename')
      return
    }

    // Skip if name hasn't changed
    if (trimmedName === props.item.name) {
      console.log('ℹ️ [VaultTreeItem] Name unchanged, skipping rename')
      return
    }

    console.log('✅ [VaultTreeItem] Proceeding with rename from', props.item.name, 'to', trimmedName)

    // Check for duplicates
    const parentId = props.item.parentId
    const exists = await fileSystemService.checkItemExists(parentId, trimmedName)
    if (exists) {
      $q.notify({
        type: 'warning',
        message: `An item named "${trimmedName}" already exists in this location`,
        timeout: 3000
      })
      return
    }

    // Perform rename
    await fileSystemService.renameExistingItem(itemId, trimmedName)

    // Update local tree data immediately to avoid stale data
    updateLocalTreeItemData?.(itemId, { name: trimmedName })

    console.log('✅ [VaultTreeItem] Rename completed successfully')

  } catch (error) {
    console.error('❌ [VaultTreeItem] Failed to rename item:', error)
    $q.notify({
      type: 'error',
      message: error instanceof Error ? error.message : 'Failed to rename item',
      timeout: 3000
    })
  } finally {
    isRenaming.value = false
  }
}

// Listen for title editor open events
vaultEmitter?.on('open-title-editor', (payload: unknown) => {
  const { itemId, cursorPosition } = payload as { itemId: string; cursorPosition: 'start' | 'end' }
  if (itemId === props.item.id) {
    openTitleEditor(cursorPosition)
  }
})

// Listen for focus-and-edit events
vaultEmitter?.on('focus-and-edit-item', (payload: unknown) => {
  const { itemId } = payload as { itemId: string }
  if (itemId === props.item.id) {
    // Use setTimeout instead of nextTick for more reliable DOM updates
    setTimeout(() => {
      if (props.isEditMode) {
        openTitleEditor('end')
      } else {
        focusItem(props.item.id)
      }
    }, 50)
  }
})

// Watch for edit mode changes - close editor if toggled off
watch(() => props.isEditMode, (newEditMode) => {
  if (!newEditMode && isEditing.value) {
    destroyTitleEditor()
    // When edit mode is turned off, ensure the item keeps focus for navigation
    void nextTick(() => {
      focusItem(props.item.id)
    })
  }
})

// Watch for selection changes - focus item when selected in navigation mode
watch(isSelected, (selected) => {
  if (selected && !props.isEditMode) {
    void nextTick(() => {
      focusItem(props.item.id)
    })
  }
})

// Cleanup
onBeforeUnmount(() => {
  destroyTitleEditor()
})
</script>

<style scoped lang="scss">
.vault-tree-item {
  display: flex;
  align-items: center;
  gap: 0px;
  padding: 4px 0px;
  border-radius: 4px;
  transition: all 0.15s ease;
  cursor: default;
  min-height: 32px;
  position: relative;

  &.is-hovered {
    background-color: rgba(0, 0, 0, 0.02);
  }

  &.is-selected {
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

.item-icon {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 4px;
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

  .vault-tree-item.is-hovered &,
  .vault-tree-item.is-selected & {
    opacity: 1;
  }
}

.item-title-wrapper {
  flex: 1;
  min-width: 0;
  padding-right: 32px;
}

.item-title {
  font-weight: 500;
  font-size: 13px;
  line-height: 1.5;
  color: var(--ms-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  outline: none;

  &.navigation-mode {
    cursor: default;
  }

  &.edit-mode {
    cursor: text;
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

.item-title :deep(.ProseMirror) {
  font-weight: 500;
  font-size: 13px;
  line-height: 1.5;
  color: var(--ms-text-primary);
}
</style>
