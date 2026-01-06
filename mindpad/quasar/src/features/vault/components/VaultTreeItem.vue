<template>
  <div
    class="vault-tree-item"
    :class="{
      'is-selected': isSelected,
      'is-hovered': isHovered,
      [triggerClass]: true
    }"
    :data-item-id="item.id"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @click="handleItemClick"
    @dblclick="startEditing"
  >
    <!-- Expand/collapse button for folders -->
    <!-- eslint-disable-next-line vue/no-mutating-props -->
    <div v-if="stat.children.length && item.type !== 'file'" class="expand-toggle" @click.stop="stat.open = !stat.open">
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

    <!-- Item title -->
    <div class="item-title-wrapper">
      <!-- Show editor when editing, otherwise show title -->
      <EditorContent
        v-if="isEditing && titleEditor"
        :editor="titleEditor"
        class="item-title editing"
        @click.stop
      />
      <div
        v-else
        class="item-title"
        v-html="displayTitle"
        tabindex="0"
        @keydown="handleKeydown"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, nextTick, onBeforeUnmount, watch, inject } from 'vue'
import { EditorContent, Editor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useQuasar } from 'quasar'
import type { FileSystemItem } from 'src/core/services/indexedDBService'
import { useVaultStore } from 'src/core/stores/vaultStore'

const props = defineProps<{
  item: FileSystemItem
  stat: {
    children: { length: number }
    open: boolean
  }
  triggerClass: string
  isEditMode?: boolean
}>()

// Vault store
const vaultStore = useVaultStore()

// Quasar instance for notifications
const $q = useQuasar()

// Inject method to update local tree data (to avoid prop mutation)
const updateLocalTreeItemData = inject<(itemId: string, updates: { name?: string }) => void>('updateLocalTreeItemData')

// UI state
const isHovered = ref(false)
const isEditing = ref(false)

// Selection state - computed from vault store
const isSelected = computed(() => {
  if (props.item.type === 'file') {
    return vaultStore.isFileSelected(props.item.id)
  }
  return false // Folders cannot be selected
})

// Rename guard to prevent duplicate renames
const isRenaming = ref(false)

// Display values
const displayTitle = computed(() => props.item.name || '<span class="placeholder">Untitled</span>')

// Tiptap editor - use shallowRef for complex objects like Editor
const titleEditor = shallowRef<Editor | null>(null)


// Click handlers
function handleItemClick() {
  // Only files can be selected
  if (props.item.type === 'file') {
    // Select the file in the vault store
    vaultStore.selectFile(props.item.id, 'vault-tree-item')
  }

  // Focus this item
  void nextTick(() => {
    focusItem(props.item.id)
  })
}

// Keyboard handler
function handleKeydown(event: KeyboardEvent) {
  // F2 key: Start editing
  if (event.key === 'F2') {
    event.preventDefault()
    startEditing()
  }
  // Enter key: Open the item
  else if (event.key === 'Enter') {
    event.preventDefault()
    openItem(props.item)
  }
}

// Start editing (triggered by F2 or double-click)
function startEditing() {
  if (!isEditing.value) {
    openTitleEditor('end')
  }
}

// Focus a specific item
function focusItem(itemId: string) {
  // Find the item element and focus it
  const itemElement = document.querySelector(`[data-item-id="${itemId}"] .item-title`)
  if (itemElement) {
    (itemElement as HTMLElement).focus()

    // Ensure the element is scrollable and visible
    setTimeout(() => {
      itemElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 10)
  }
}

/**
 * Toggle folder expansion state
 * Folder expansion is handled by the tree component's internal state
 * No store interaction needed for UI state changes
 */
function toggleFolder(): void {
  // The tree component (he-tree) handles folder expansion internally
  // through its stat.open property and @click.stop on the expand toggle
  // No action needed here - the tree component manages its own state
}

/**
 * Open the item (file or folder)
 * Files would integrate with document store, folders use tree component UI state
 */
function openItem(item: FileSystemItem) {
  if (item.type === 'file') {
    // Open file - would integrate with unified document store
    console.log('Opening file:', item.name)
    // TODO: Integrate with unified document store
    // vaultStore.openFile(item.id) - would be added to store
  } else if (item.type === 'folder') {
    // Folder toggle is handled by tree component UI
    // No store interaction needed for UI state
  }

// Add toggleFolder to the component's exposed methods
defineExpose({
  toggleFolder
})
}

// Title editor
function openTitleEditor(cursorPosition: 'start' | 'end' = 'end') {
  // Don't open if already editing
  if (isEditing.value) return

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
  titleEditor.value?.destroy()
  titleEditor.value = null
  isEditing.value = false

  // Keep focus on the item after editing
  void nextTick(() => {
    focusItem(props.item.id)
  })
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

    // Update local tree data immediately (like outline does)
    // This prevents the tree from reverting to old name while waiting for store update
    updateLocalTreeItemData?.(itemId, { name: trimmedName })

    // Use VaultStore for rename operation with 'vault-tree' as source
    await vaultStore.renameExistingItem(itemId, trimmedName, 'vault-tree')

    console.log('✅ [VaultTreeItem] Rename completed successfully')

  } catch (error) {
    console.error('❌ [VaultTreeItem] Failed to rename item:', error)

    // On error, the tree will refresh from store to revert changes

    $q.notify({
      type: 'error',
      message: error instanceof Error ? error.message : 'Failed to rename item',
      timeout: 3000
    })
  } finally {
    isRenaming.value = false
  }
}


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
  min-height: 32px;
  position: relative;
  cursor: default; /* Default cursor for the entire item */

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


.item-title-wrapper {
  flex: 1;
  min-width: 0;
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
  cursor: default; /* Always default cursor unless in edit mode */

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
