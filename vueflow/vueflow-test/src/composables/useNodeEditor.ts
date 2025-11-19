/**
 * Global state for managing active Tiptap editor in canvas nodes
 * Only ONE node can have an active editor at a time for performance
 *
 * This is a simplified version of useFullDocumentEditor.ts from mindmap-writer/writer
 * adapted for Vue Flow canvas nodes.
 */

import { ref } from 'vue';
import { Editor } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';

/**
 * Currently active node ID (only one node can be edited at a time)
 */
export const activeNodeId = ref<string | null>(null);

/**
 * Active editor instance (only title editor for now, content comes later)
 */
export const activeTitleEditor = ref<Editor | null>(null);

/**
 * Destroy the active editor
 */
export function destroyActiveEditor() {
  if (activeTitleEditor.value) {
    activeTitleEditor.value.destroy();
    activeTitleEditor.value = null;
  }
  activeNodeId.value = null;
}

/**
 * Check if a specific node is currently active
 */
export function isNodeActive(nodeId: string): boolean {
  return activeNodeId.value === nodeId;
}

/**
 * Create a Tiptap editor for a node title
 *
 * @param content - Initial HTML content
 * @param onUpdate - Callback when content changes
 * @param onBlur - Callback when editor loses focus
 * @returns Editor instance
 */
export function createTitleEditor(
  content: string,
  onUpdate: (html: string) => void,
  onBlur: () => void
): Editor {
  // Destroy any existing editor first (but keep activeNodeId)
  if (activeTitleEditor.value) {
    activeTitleEditor.value.destroy();
    activeTitleEditor.value = null;
  }

  const editor = new Editor({
    content,
    extensions: [
      StarterKit.configure({
        // Disable heading, code block, etc. for simple titles
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        // Keep basic formatting (bold, italic, strike, code, hardBreak are enabled by default)
      }),
    ],
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
        spellcheck: 'false',
      },
    },
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML());
    },
    onBlur: () => {
      onBlur();
    },
    // Auto-focus when created
    autofocus: 'end',
  });

  activeTitleEditor.value = editor;
  return editor;
}

/**
 * Set the active node (without creating editor yet)
 * This is called when a node is double-clicked
 */
export function setActiveNode(nodeId: string) {
  if (activeNodeId.value !== nodeId) {
    destroyActiveEditor();
  }
  activeNodeId.value = nodeId;
}

/**
 * Get Tiptap editor configuration options
 * This can be used to create editors with consistent configuration
 */
export function getTiptapConfig() {
  return {
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        // Keep basic formatting (bold, italic, strike, code, hardBreak are enabled by default)
      }),
    ],
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
        spellcheck: 'false',
      },
    },
  };
}

