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
 * FIXED VERSION - Addresses the navigation redundancy issues:
 * 1. Replaces "absolute position" detection with proper paragraph boundary detection
 * 2. Only triggers navigation at actual node boundaries (first/last paragraph of document)
 * 3. Prevents redundant navigation triggers
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

        console.log('🔵 [FIXED DEBUG UP] Cursor position:', {
          currentPos,
          parentOffset: $head.parentOffset,
          parentContentSize: $head.parent.content.size,
          parentType: $head.parent.type.name,
          docSize: state.doc.content.size,
          $headBefore: $head.before(),
          $headAfter: $head.after()
        })

        // Empty document - always trigger
        if (state.doc.textContent.length === 0) {
          console.log('🔵 [FIXED DEBUG UP] Empty document - triggering navigation')
          event.preventDefault()
          options.onUpArrowAtFirstLine()
          return true
        }

        // FIXED: Check if we're at the start of the FIRST paragraph of the document
        // This ensures we only trigger navigation when actually at the document start
        if ($head.parentOffset === 0 && $head.before() <= 1) {
          console.log('🔵 [FIXED DEBUG UP] At start of first paragraph - triggering navigation')
          event.preventDefault()
          options.onUpArrowAtFirstLine()
          return true
        } else {
          console.log('🔵 [FIXED DEBUG UP] Not at start of first paragraph, staying in current node')
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

        console.log('🔴 [FIXED DEBUG DOWN] Cursor position:', {
          currentPos,
          parentOffset: $head.parentOffset,
          parentContentSize: $head.parent.content.size,
          parentType: $head.parent.type.name,
          docSize: state.doc.content.size,
          $headBefore: $head.before(),
          $headAfter: $head.after()
        })

        // Empty document - always trigger
        if (state.doc.textContent.length === 0) {
          console.log('🔴 [FIXED DEBUG DOWN] Empty document - triggering navigation')
          event.preventDefault()
          options.onDownArrowAtLastLine()
          return true
        }

        // FIXED: Check if we're at the end of the LAST paragraph of the document
        // This ensures we only trigger navigation when actually at the document end
        if ($head.parentOffset === $head.parent.content.size && $head.after() >= state.doc.content.size) {
          console.log('🔴 [FIXED DEBUG DOWN] At end of last paragraph - triggering navigation')
          event.preventDefault()
          options.onDownArrowAtLastLine()
          return true
        } else {
          console.log('🔴 [FIXED DEBUG DOWN] Not at end of last paragraph, staying in current node')
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
