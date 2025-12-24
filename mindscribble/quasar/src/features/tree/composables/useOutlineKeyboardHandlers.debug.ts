import type { EditorView } from '@tiptap/pm/view'

/**
 * Keyboard handler options for Tiptap editors in Outline view
 */
export interface KeyboardHandlerOptions {
  onEnterKey?: (view: EditorView, event: KeyboardEvent) => void
  onUpArrowAtFirstLine?: () => void
  onDownArrowAtLastLine?: () => void
  onAltLeftArrow?: () => void
  onAltRightArrow?: () => void
}

/**
 * Keyboard handler options for navigation-only mode (no editor)
 */
export interface NavigationHandlerOptions {
  onUpArrow?: () => void
  onDownArrow?: () => void
  onAltLeftArrow?: () => void
  onAltRightArrow?: () => void
}

/**
 * Create keyboard event handler for Tiptap editor in Outline view
 * Handles arrow key navigation between nodes
 *
 * Uses ProseMirror API for reliable line detection without pixel dependencies:
 * - $head.parentOffset === 0: At start of paragraph
 * - $head.parentOffset === $head.parent.content.size: At end of paragraph
 * - $head.after() >= state.doc.content.size: In last paragraph
 *
 * @param options - Callback functions for different keyboard events
 * @returns handleKeyDown function for Tiptap editorProps
 */
export function createKeyboardHandler(options: KeyboardHandlerOptions) {
  return (view: EditorView, event: KeyboardEvent): boolean => {
    // Handle Enter key (without Shift) - add new line to title
    if (event.key === 'Enter' && !event.shiftKey && options.onEnterKey) {
      event.preventDefault()
      options.onEnterKey(view, event)
      return true
    }

    // Handle Alt+Left arrow - collapse node
    if (event.key === 'ArrowLeft' && event.altKey && options.onAltLeftArrow) {
      event.preventDefault()
      options.onAltLeftArrow()
      return true
    }

    // Handle Alt+Right arrow - expand node
    if (event.key === 'ArrowRight' && event.altKey && options.onAltRightArrow) {
      event.preventDefault()
      options.onAltRightArrow()
      return true
    }

    // Handle Up arrow at first line - move to previous node
    if (event.key === 'ArrowUp' && !event.shiftKey && options.onUpArrowAtFirstLine) {
      const { state } = view
      const { selection } = state

      if (selection.empty) {
        const { $head } = selection
        const currentPos = $head.pos

        // DEBUG: Log cursor position and paragraph info
        console.log('🔵 [DEBUG UP ARROW] Cursor position:', {
          currentPos,
          parentOffset: $head.parentOffset,
          parentContentSize: $head.parent.content.size,
          parentType: $head.parent.type.name,
          docSize: state.doc.content.size,
          textLength: state.doc.textContent.length,
          $headAfter: $head.after(),
          $headBefore: $head.before(),
          selectionFrom: selection.from,
          selectionTo: selection.to
        })

        // Empty document - always trigger
        if (state.doc.textContent.length === 0) {
          console.log('🔵 [DEBUG UP ARROW] Empty document - triggering navigation')
          event.preventDefault()
          options.onUpArrowAtFirstLine()
          return true
        }

        // Check if we're at the absolute start of the document (position 1)
        if (currentPos === 1) {
          console.log('🔵 [DEBUG UP ARROW] At absolute start of document - triggering navigation')
          event.preventDefault()
          options.onUpArrowAtFirstLine()
          return true
        }

        // Check if we're at the start of the current paragraph (reliable ProseMirror approach)
        if ($head.parentOffset === 0) {
          console.log('🔵 [DEBUG UP ARROW] At start of paragraph - triggering navigation')
          event.preventDefault()
          options.onUpArrowAtFirstLine()
          return true
        } else {
          console.log('🔵 [DEBUG UP ARROW] Not at start of paragraph, staying in current node')
        }
      }
    }

    // Handle Down arrow at last line - move to next node
    if (event.key === 'ArrowDown' && !event.shiftKey && options.onDownArrowAtLastLine) {
      const { state } = view
      const { selection } = state

      if (selection.empty) {
        const { $head } = selection
        const currentPos = $head.pos

        // DEBUG: Log cursor position and paragraph info
        console.log('🔴 [DEBUG DOWN ARROW] Cursor position:', {
          currentPos,
          parentOffset: $head.parentOffset,
          parentContentSize: $head.parent.content.size,
          parentType: $head.parent.type.name,
          docSize: state.doc.content.size,
          textLength: state.doc.textContent.length,
          $headAfter: $head.after(),
          $headBefore: $head.before(),
          selectionFrom: selection.from,
          selectionTo: selection.to
        })

        // Empty document - always trigger
        if (state.doc.textContent.length === 0) {
          console.log('🔴 [DEBUG DOWN ARROW] Empty document - triggering navigation')
          event.preventDefault()
          options.onDownArrowAtLastLine()
          return true
        }

        // Check if we're at the absolute end of the document
        if (currentPos >= state.doc.content.size - 1) {
          console.log('🔴 [DEBUG DOWN ARROW] At absolute end of document - triggering navigation')
          event.preventDefault()
          options.onDownArrowAtLastLine()
          return true
        }

        // Check if we're at the end of the current paragraph (reliable ProseMirror approach)
        // This works for 1-line, 2-line, and 3+ line content without any pixel dependencies
        if ($head.parentOffset === $head.parent.content.size) {
          console.log('🔴 [DEBUG DOWN ARROW] At end of paragraph - triggering navigation')
          event.preventDefault()
          options.onDownArrowAtLastLine()
          return true
        } else {
          console.log('🔴 [DEBUG DOWN ARROW] Not at end of paragraph, staying in current node')
        }
      }
    }

    return false
  }
}

/**
 * Create keyboard event handler for navigation-only mode (when edit mode is OFF)
 * Handles arrow key navigation without requiring Tiptap editor
 *
 * @param options - Callback functions for different keyboard events
 * @returns handleKeyDown function for regular DOM element
 */
export function createNavigationHandler(options: NavigationHandlerOptions) {
  return (event: KeyboardEvent): boolean => {
    // Handle Up arrow - move to previous node
    if (event.key === 'ArrowUp' && !event.shiftKey && !event.ctrlKey && !event.metaKey && options.onUpArrow) {
      event.preventDefault()
      options.onUpArrow()
      return true
    }

    // Handle Down arrow - move to next node
    if (event.key === 'ArrowDown' && !event.shiftKey && !event.ctrlKey && !event.metaKey && options.onDownArrow) {
      event.preventDefault()
      options.onDownArrow()
      return true
    }

    // Handle Alt+Left arrow - collapse node
    if (event.key === 'ArrowLeft' && event.altKey && options.onAltLeftArrow) {
      event.preventDefault()
      options.onAltLeftArrow()
      return true
    }

    // Handle Alt+Right arrow - expand node
    if (event.key === 'ArrowRight' && event.altKey && options.onAltRightArrow) {
      event.preventDefault()
      options.onAltRightArrow()
      return true
    }

    return false
  }
}
