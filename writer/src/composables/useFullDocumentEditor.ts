import { ref } from 'vue';
import { Editor } from '@tiptap/vue-3';
import { getTiptapEditorOptions, getDefaultPlaceholder } from './useTiptapConfig';
import type { TiptapConfigOptions } from './useTiptapConfig';
import mitt, { type Emitter } from 'mitt';

/**
 * Global state for managing active Tiptap editors in Full Document view
 * Only ONE node can have active editors at a time for performance
 */

// Currently active node ID
export const activeNodeId = ref<string | null>(null);

// Active editor instances (max 2: title + content)
export const activeTitleEditor = ref<Editor | null>(null);
export const activeContentEditor = ref<Editor | null>(null);

// Which field is currently being edited
export const activeField = ref<'title' | 'content' | null>(null);

// Event bus for field navigation
type FieldNavigationEvents = {
  'open-field': {
    nodeId: string;
    field: 'title' | 'content';
    cursorPosition: 'start' | 'end';
  };
};

export const fieldNavigationBus: Emitter<FieldNavigationEvents> = mitt<FieldNavigationEvents>();

/**
 * Destroy all active editors
 */
export function destroyActiveEditors() {
  if (activeTitleEditor.value) {
    activeTitleEditor.value.destroy();
    activeTitleEditor.value = null;
  }

  if (activeContentEditor.value) {
    activeContentEditor.value.destroy();
    activeContentEditor.value = null;
  }

  activeNodeId.value = null;
  activeField.value = null;
}

/**
 * Check if a specific node is currently active
 */
export function isNodeActive(nodeId: string): boolean {
  return activeNodeId.value === nodeId;
}

/**
 * Check if a specific field of a node is currently active
 */
export function isFieldActive(nodeId: string, field: 'title' | 'content'): boolean {
  return activeNodeId.value === nodeId && activeField.value === field;
}

/**
 * Set the active node (without creating editors yet)
 */
export function setActiveNode(nodeId: string) {
  if (activeNodeId.value !== nodeId) {
    destroyActiveEditors();
  }
  activeNodeId.value = nodeId;
}

/**
 * Create a Tiptap editor for a title field
 */
export function createTitleEditor(
  content: string,
  onUpdate: (html: string) => void,
  options: TiptapConfigOptions & {
    onEnterKey?: () => void;
    onRightArrowAtEnd?: () => void;
    onLeftArrowAtStart?: () => void;
    onUpArrowAtFirstLine?: () => void;
    onDownArrowAtLastLine?: () => void;
  } = {}
): Editor {
  const editorOptions = getTiptapEditorOptions('manual-title', content, {
    placeholder: options.placeholder || getDefaultPlaceholder('manual-title'),
    ...options,
  });

  return new Editor({
    ...editorOptions,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML());
    },
    editorProps: {
      handleKeyDown: (view, event) => {
        // Handle Enter key (without Shift) - move to content
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          if (options.onEnterKey) {
            options.onEnterKey();
          }
          return true;
        }

        // Handle Right arrow at end of title - move to content or next field
        if (event.key === 'ArrowRight' && !event.shiftKey) {
          const { state } = view;
          const { selection } = state;

          // Check if selection is collapsed (no text selected) and at the end
          if (selection.empty) {
            const { $head } = selection;
            // Check if we're at the end of the document
            // Use $head.parentOffset and parent node size to detect end
            const isAtEnd = $head.parentOffset === $head.parent.content.size;

            if (isAtEnd) {
              event.preventDefault();
              if (options.onRightArrowAtEnd) {
                options.onRightArrowAtEnd();
              }
              return true;
            }
          }
        }

        // Handle Left arrow at start of title - move to previous field
        if (event.key === 'ArrowLeft' && !event.shiftKey) {
          const { state } = view;
          const { selection } = state;

          // Check if selection is collapsed (no text selected) and at the start
          if (selection.empty) {
            const { $head } = selection;
            // Check if we're at the start of the document
            const isAtStart = $head.parentOffset === 0 && $head.pos === 1;

            if (isAtStart) {
              event.preventDefault();
              if (options.onLeftArrowAtStart) {
                options.onLeftArrowAtStart();
              }
              return true;
            }
          }
        }

        // Shift+Enter creates line break (default behavior)
        // Handle Up arrow at first line - move to previous field
        if (event.key === 'ArrowUp' && !event.shiftKey) {
          const { state } = view;
          const { selection } = state;

          if (selection.empty) {
            const { $head } = selection;
            const currentPos = $head.pos;

            // Get current cursor coordinates
            const currentCoords = view.coordsAtPos(currentPos);

            // Try to find a position one line above by checking coordinates
            // We'll look for a position with a smaller top coordinate
            let foundPositionAbove = false;

            // Check positions before the current one to see if any are on a different line
            for (let pos = currentPos - 1; pos >= 1; pos--) {
              try {
                const coords = view.coordsAtPos(pos);
                // If we find a position with a smaller top coordinate, we're not on the first line
                if (coords.top < currentCoords.top - 5) { // 5px threshold for line height differences
                  foundPositionAbove = true;
                  break;
                }
                // If we've gone too far back (more than 200 chars), stop checking
                if (currentPos - pos > 200) break;
              } catch {
                // Position might be invalid, continue
                continue;
              }
            }

            const isOnFirstLine = !foundPositionAbove;
            console.log('[useFullDocumentEditor] Up arrow in title - isOnFirstLine:', isOnFirstLine, 'pos:', currentPos);

            if (isOnFirstLine) {
              event.preventDefault();
              if (options.onUpArrowAtFirstLine) {
                options.onUpArrowAtFirstLine();
              }
              return true;
            }
          }
        }

        // Handle Down arrow at last line - move to next field
        if (event.key === 'ArrowDown' && !event.shiftKey) {
          const { state } = view;
          const { selection } = state;

          if (selection.empty) {
            const { $head } = selection;
            const currentPos = $head.pos;

            // Get current cursor coordinates
            const currentCoords = view.coordsAtPos(currentPos);
            console.log('[useFullDocumentEditor] Down arrow in title - currentPos:', currentPos, 'currentCoords.top:', currentCoords.top);

            // Try to find a position one line below by checking coordinates
            // We'll look for a position with a larger top coordinate
            let foundPositionBelow = false;

            // Check positions after the current one to see if any are on a different line
            // Important: Don't check the very last position (doc.content.size) as it's the closing position
            // and will have different coordinates even though it's not a real line below
            const maxPos = state.doc.content.size - 1; // Exclude the closing position
            console.log('[useFullDocumentEditor] Down arrow in title - maxPos:', maxPos, 'doc.content.size:', state.doc.content.size, 'checking positions from', currentPos + 1, 'to', Math.min(maxPos, currentPos + 200));

            for (let pos = currentPos + 1; pos <= maxPos; pos++) {
              try {
                const coords = view.coordsAtPos(pos);
                console.log('[useFullDocumentEditor] Down arrow in title - checking pos:', pos, 'coords.top:', coords.top, 'diff:', coords.top - currentCoords.top);
                // If we find a position with a larger top coordinate, we're not on the last line
                if (coords.top > currentCoords.top + 5) { // 5px threshold for line height differences
                  foundPositionBelow = true;
                  console.log('[useFullDocumentEditor] Down arrow in title - found position below at pos:', pos);
                  break;
                }
                // If we've gone too far forward (more than 200 chars), stop checking
                if (pos - currentPos > 200) {
                  console.log('[useFullDocumentEditor] Down arrow in title - stopped checking after 200 chars');
                  break;
                }
              } catch {
                // Position might be invalid, continue
                continue;
              }
            }

            const isOnLastLine = !foundPositionBelow;
            console.log('[useFullDocumentEditor] Down arrow in title - isOnLastLine:', isOnLastLine, 'foundPositionBelow:', foundPositionBelow);

            if (isOnLastLine) {
              event.preventDefault();
              if (options.onDownArrowAtLastLine) {
                options.onDownArrowAtLastLine();
              }
              return true;
            }
          }
        }

        return false;
      },
    },
  });
}

/**
 * Create a Tiptap editor for a content field
 */
export function createContentEditor(
  content: string,
  isInferredTitle: boolean,
  onUpdate: (html: string) => void,
  options: TiptapConfigOptions & {
    onLeftArrowAtStart?: () => void;
    onRightArrowAtEnd?: () => void;
    onUpArrowAtFirstLine?: () => void;
    onDownArrowAtLastLine?: () => void;
  } = {}
): Editor {
  const type = isInferredTitle ? 'inferred-content' : 'manual-content';
  const editorOptions = getTiptapEditorOptions(type, content, {
    placeholder: options.placeholder || getDefaultPlaceholder(type),
    ...options,
  });

  // Track if we're updating from internal logic (to prevent recursion)
  let isUpdatingInternally = false;

  const editorInstance = new Editor({
    ...editorOptions,
    onUpdate: ({ editor }) => {
      if (isUpdatingInternally) {
        return;
      }

      // Check if we're currently resizing (to prevent interfering with resize)
      if (editor.commands.isResizingInferredTitle()) {
        return;
      }

      // For inferred title nodes, apply highlight as user types
      if (isInferredTitle) {
        const plainText = editor.getText();
        const targetLength = Math.min(20, plainText.length);

        if (targetLength > 0) {
          // Apply the highlight mark
          isUpdatingInternally = true;
          editor.commands.setInferredTitleMark(targetLength);
          isUpdatingInternally = false;
        }
      }

      onUpdate(editor.getHTML());
    },
    editorProps: {
      handleKeyDown: (view, event) => {
        // Handle Left arrow at start of content - move to title or previous field
        if (event.key === 'ArrowLeft' && !event.shiftKey) {
          const { state } = view;
          const { selection } = state;

          // Check if selection is collapsed (no text selected) and at the start
          if (selection.empty) {
            const { $head } = selection;
            // Check if we're at the ABSOLUTE start of the entire document (not just a paragraph)
            // $head.pos === 1 means we're at position 1 (right after the doc node at position 0)
            // This ensures we only navigate when at the very beginning, not at the start of any paragraph
            const isAtAbsoluteStart = $head.pos === 1;
            console.log('[useFullDocumentEditor] Left arrow - parentOffset:', $head.parentOffset, 'pos:', $head.pos, 'isAtAbsoluteStart:', isAtAbsoluteStart);

            if (isAtAbsoluteStart) {
              console.log('[useFullDocumentEditor] At absolute start of content, triggering navigation');
              event.preventDefault();
              if (options.onLeftArrowAtStart) {
                options.onLeftArrowAtStart();
              }
              return true;
            }
          }
        }

        // Handle Right arrow at end of content - move to next field
        if (event.key === 'ArrowRight' && !event.shiftKey) {
          const { state } = view;
          const { selection } = state;

          // Check if selection is collapsed (no text selected) and at the end
          if (selection.empty) {
            const { $head } = selection;
            // Check if we're at the ABSOLUTE end of the entire document (not just a paragraph)
            // In ProseMirror, the last valid cursor position is doc.nodeSize - 2
            // (doc.nodeSize includes the doc node itself, so we subtract 2 for the closing tag)
            // Alternatively, we can check if we're at the end of the last paragraph
            const isAtAbsoluteEnd = $head.pos >= state.doc.content.size - 1;
            console.log('[useFullDocumentEditor] Right arrow - pos:', $head.pos, 'doc.content.size:', state.doc.content.size, 'doc.nodeSize:', state.doc.nodeSize, 'isAtAbsoluteEnd:', isAtAbsoluteEnd);

            if (isAtAbsoluteEnd) {
              console.log('[useFullDocumentEditor] At absolute end of content, triggering navigation');
              event.preventDefault();
              if (options.onRightArrowAtEnd) {
                options.onRightArrowAtEnd();
              }
              return true;
            }
          }
        }

        // Handle Up arrow at first line - move to previous field
        if (event.key === 'ArrowUp' && !event.shiftKey) {
          const { state } = view;
          const { selection } = state;

          if (selection.empty) {
            const { $head } = selection;
            const currentPos = $head.pos;

            // Get current cursor coordinates
            const currentCoords = view.coordsAtPos(currentPos);

            // Try to find a position one line above by checking coordinates
            let foundPositionAbove = false;

            // Check positions before the current one to see if any are on a different line
            for (let pos = currentPos - 1; pos >= 1; pos--) {
              try {
                const coords = view.coordsAtPos(pos);
                // If we find a position with a smaller top coordinate, we're not on the first line
                if (coords.top < currentCoords.top - 5) { // 5px threshold
                  foundPositionAbove = true;
                  break;
                }
                // If we've gone too far back (more than 200 chars), stop checking
                if (currentPos - pos > 200) break;
              } catch {
                continue;
              }
            }

            const isOnFirstLine = !foundPositionAbove;
            console.log('[useFullDocumentEditor] Up arrow in content - isOnFirstLine:', isOnFirstLine, 'pos:', currentPos);

            if (isOnFirstLine) {
              event.preventDefault();
              if (options.onUpArrowAtFirstLine) {
                options.onUpArrowAtFirstLine();
              }
              return true;
            }
          }
        }

        // Handle Down arrow at last line - move to next field
        if (event.key === 'ArrowDown' && !event.shiftKey) {
          const { state } = view;
          const { selection } = state;

          if (selection.empty) {
            const { $head } = selection;
            const currentPos = $head.pos;

            // Get current cursor coordinates
            const currentCoords = view.coordsAtPos(currentPos);

            // Try to find a position one line below by checking coordinates
            let foundPositionBelow = false;

            // Check positions after the current one to see if any are on a different line
            // Important: Don't check the very last position (doc.content.size) as it's the closing position
            const maxPos = state.doc.content.size - 1; // Exclude the closing position
            for (let pos = currentPos + 1; pos <= maxPos; pos++) {
              try {
                const coords = view.coordsAtPos(pos);
                // If we find a position with a larger top coordinate, we're not on the last line
                if (coords.top > currentCoords.top + 5) { // 5px threshold
                  foundPositionBelow = true;
                  break;
                }
                // If we've gone too far forward (more than 200 chars), stop checking
                if (pos - currentPos > 200) break;
              } catch {
                continue;
              }
            }

            const isOnLastLine = !foundPositionBelow;
            console.log('[useFullDocumentEditor] Down arrow in content - isOnLastLine:', isOnLastLine, 'pos:', currentPos, 'foundPositionBelow:', foundPositionBelow);

            if (isOnLastLine) {
              event.preventDefault();
              if (options.onDownArrowAtLastLine) {
                options.onDownArrowAtLastLine();
              }
              return true;
            }
          }
        }

        return false;
      },
    },
  });

  return editorInstance;
}

