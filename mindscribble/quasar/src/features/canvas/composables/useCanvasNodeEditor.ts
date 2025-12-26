/**
 * Global state for managing active Tiptap editor in canvas nodes (mindmap, concept map)
 * Only ONE node can have an active editor at a time for performance
 */

import { ref } from 'vue'
import { Editor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { useUnifiedDocumentStore } from '../../../core/stores'

/**
 * Currently active node ID (only one node can be edited at a time)
 */
export const activeEditingNodeId = ref<string | null>(null)

/**
 * Active editor instance
 */
export const activeEditor = ref<Editor | null>(null)

/**
 * Original title when editing started (for ESC to revert)
 */
export const originalTitle = ref<string>('')

/**
 * Destroy the active editor
 */
export function destroyActiveEditor() {
  if (activeEditor.value) {
    activeEditor.value.destroy()
    activeEditor.value = null
  }
  activeEditingNodeId.value = null
  originalTitle.value = ''
}

/**
 * Check if a specific node is currently being edited
 */
export function isNodeEditing(nodeId: string): boolean {
  return activeEditingNodeId.value === nodeId
}

/**
 * Editor callbacks interface
 */
interface EditorCallbacks {
  onSave: (html: string) => void
  onCancel: () => void
}

/**
 * Create a Tiptap editor for a node title
 *
 * Enter = Save and exit
 * Shift+Enter = New line
 * ESC = Cancel/revert
 * Blur = Save and exit
 *
 * @param content - Initial HTML content
 * @param callbacks - Save and cancel callbacks
 * @param selectAll - If true, select all text when editor is created (for "Untitled" nodes)
 * @returns Editor instance
 */
export function createCanvasTitleEditor(
  content: string,
  callbacks: EditorCallbacks,
  selectAll = false
): Editor {
  // Destroy any existing editor first
  if (activeEditor.value) {
    activeEditor.value.destroy()
    activeEditor.value = null
  }

  // Store original title for ESC revert
  originalTitle.value = content

  // Track current content for blur save
  let currentContent = content

  // Guard flag to prevent multiple save/cancel calls
  let isClosing = false

  const editor = new Editor({
    content,
    extensions: [
      StarterKit.configure({
        // Disable heading, code block, etc. for simple titles
        heading: false,
        codeBlock: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        horizontalRule: false
      })
    ],
    editorProps: {
      attributes: {
        class: 'canvas-tiptap-editor',
        spellcheck: 'false'
      },
      handleKeyDown: (_view, event) => {
        // Enter (without Shift) = Save and exit
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault()
          if (!isClosing) {
            isClosing = true
            callbacks.onSave(currentContent)
          }
          return true
        }
        // Shift+Enter = Allow new line (default Tiptap behavior)

        // Escape = Cancel and revert
        if (event.key === 'Escape') {
          event.preventDefault()
          if (!isClosing) {
            isClosing = true
            callbacks.onCancel()
          }
          return true
        }
        return false
      }
    },
    onUpdate: ({ editor: ed }) => {
      currentContent = ed.getHTML()
    },
    onBlur: () => {
      // Blur = Save and exit (only if not already closing)
      if (!isClosing) {
        isClosing = true
        callbacks.onSave(currentContent)
      }
    },
    autofocus: 'end',
    onCreate: ({ editor: ed }) => {
      if (selectAll) {
        ed.commands.selectAll()
      }
    }
  })

  activeEditor.value = editor
  return editor
}

/**
 * Start editing a node - called from F2 key handler or double-click
 */
export function startEditingNode(nodeId: string): void {
  // If already editing this node, do nothing
  if (activeEditingNodeId.value === nodeId) return

  // Destroy any existing editor
  destroyActiveEditor()

  // Set the new active node
  activeEditingNodeId.value = nodeId
}

/**
 * Stop editing and save changes
 */
export function stopEditing(): void {
  destroyActiveEditor()
}

/**
 * Composable for canvas node editing
 * Provides reactive state and methods for use in components
 */
export function useCanvasNodeEditor() {
  const unifiedStore = useUnifiedDocumentStore()

  function updateNodeTitle(nodeId: string, title: string, source: 'mindmap' | 'd3-concept-map') {
    // Strip <p> tags from title
    const cleanTitle = title.replace(/<\/p>/g, '')
    unifiedStore.updateNode(nodeId, { title: cleanTitle }, source)
  }

  return {
    activeEditingNodeId,
    activeEditor,
    isNodeEditing,
    createCanvasTitleEditor,
    startEditingNode,
    stopEditing,
    destroyActiveEditor,
    updateNodeTitle
  }
}
