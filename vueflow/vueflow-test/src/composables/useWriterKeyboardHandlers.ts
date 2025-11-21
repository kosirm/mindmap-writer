import type { EditorView } from '@tiptap/pm/view';

/**
 * Keyboard handler options for Tiptap editors in Writer view
 */
export interface KeyboardHandlerOptions {
  onEnterKey?: () => void;
  onLeftArrowAtStart?: () => void;
  onRightArrowAtEnd?: () => void;
  onUpArrowAtFirstLine?: () => void;
  onDownArrowAtLastLine?: () => void;
}

/**
 * Create keyboard event handler for Tiptap editor
 * Handles arrow key navigation between fields
 * 
 * @param options - Callback functions for different keyboard events
 * @returns handleKeyDown function for Tiptap editorProps
 */
export function createKeyboardHandler(options: KeyboardHandlerOptions) {
  return (view: EditorView, event: KeyboardEvent): boolean => {
    // Handle Enter key (without Shift) - move to content
    if (event.key === 'Enter' && !event.shiftKey && options.onEnterKey) {
      event.preventDefault();
      options.onEnterKey();
      return true;
    }

    // Handle Right arrow at end - move to next field
    if (event.key === 'ArrowRight' && !event.shiftKey && options.onRightArrowAtEnd) {
      const { state } = view;
      const { selection } = state;

      // Check if selection is collapsed (no text selected) and at the end
      if (selection.empty) {
        const { $head } = selection;

        // Check if editor is empty (check both textContent and parent content size)
        // Empty editor has parent.content.size of 0
        const isEmpty = $head.parent.content.size === 0;

        // Check if we're at the end of the document
        const isAtEnd = $head.parentOffset === $head.parent.content.size;
        console.log('[KeyboardHandler] Right arrow - parentOffset:', $head.parentOffset, 'parent.content.size:', $head.parent.content.size, 'isEmpty:', isEmpty, 'isAtEnd:', isAtEnd, 'textContent:', state.doc.textContent);

        if (isAtEnd || isEmpty) {
          console.log('[KeyboardHandler] Right arrow at end - triggering navigation');
          event.preventDefault();
          options.onRightArrowAtEnd();
          return true;
        }
      }
    }

    // Handle Left arrow at start - move to previous field
    if (event.key === 'ArrowLeft' && !event.shiftKey && options.onLeftArrowAtStart) {
      const { state } = view;
      const { selection } = state;

      // Check if selection is collapsed (no text selected) and at the start
      if (selection.empty) {
        const { $head } = selection;
        // Check if we're at the start of the document
        const isAtStart = $head.parentOffset === 0 && $head.pos === 1;

        if (isAtStart) {
          event.preventDefault();
          options.onLeftArrowAtStart();
          return true;
        }
      }
    }

    // Handle Up arrow at first line - move to previous field
    if (event.key === 'ArrowUp' && !event.shiftKey && options.onUpArrowAtFirstLine) {
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

        if (isOnFirstLine) {
          event.preventDefault();
          options.onUpArrowAtFirstLine();
          return true;
        }
      }
    }

    // Handle Down arrow at last line - move to next field
    if (event.key === 'ArrowDown' && !event.shiftKey && options.onDownArrowAtLastLine) {
      const { state } = view;
      const { selection } = state;

      if (selection.empty) {
        const { $head } = selection;
        const currentPos = $head.pos;

        // Check if editor is empty (check parent content size)
        // Empty editor has parent.content.size of 0
        const isEmpty = $head.parent.content.size === 0;

        if (isEmpty) {
          // If empty, we're always on the last line
          console.log('[KeyboardHandler] Down arrow in empty editor - triggering navigation');
          event.preventDefault();
          options.onDownArrowAtLastLine();
          return true;
        }

        // Get current cursor coordinates
        const currentCoords = view.coordsAtPos(currentPos);

        // Try to find a position one line below by checking coordinates
        let foundPositionBelow = false;

        // Check positions after the current one to see if any are on a different line
        // Important: Don't check the very last position (doc.content.size) as it's the closing position
        // and will have different coordinates even though it's not a real line below
        const maxPos = state.doc.content.size - 1; // Exclude the closing position
        console.log('[KeyboardHandler] Down arrow - currentPos:', currentPos, 'maxPos:', maxPos, 'doc.content.size:', state.doc.content.size);
        for (let pos = currentPos + 1; pos <= maxPos; pos++) {
          try {
            const coords = view.coordsAtPos(pos);
            // If we find a position with a larger top coordinate, we're not on the last line
            if (coords.top > currentCoords.top + 5) { // 5px threshold for line height differences
              foundPositionBelow = true;
              break;
            }
            // If we've gone too far forward (more than 200 chars), stop checking
            if (pos - currentPos > 200) break;
          } catch {
            // Position might be invalid, continue
            continue;
          }
        }

        const isOnLastLine = !foundPositionBelow;
        console.log('[KeyboardHandler] Down arrow - isOnLastLine:', isOnLastLine, 'foundPositionBelow:', foundPositionBelow);

        if (isOnLastLine) {
          console.log('[KeyboardHandler] Down arrow at last line - triggering navigation');
          event.preventDefault();
          options.onDownArrowAtLastLine();
          return true;
        }
      }
    }

    return false;
  };
}

