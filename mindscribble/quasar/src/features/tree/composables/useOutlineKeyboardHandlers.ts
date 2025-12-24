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

        // Get the DOM coordinates to check if we can move up
        const coordsAtCursor = view.coordsAtPos(currentPos)
        const coordsAtStart = view.coordsAtPos(1) // Position 1 is start of content

        // DEBUG: Enhanced logging
        console.log('🔵 [DEBUG UP ARROW] Detailed analysis:', {
          currentPos,
          parentOffset: $head.parentOffset,
          parentContentSize: $head.parent.content.size,
          parentType: $head.parent.type.name,
          docSize: state.doc.content.size,
          textLength: state.doc.textContent.length,
          coordsAtCursor: { top: coordsAtCursor.top, left: coordsAtCursor.left },
          coordsAtStart: { top: coordsAtStart.top, left: coordsAtStart.left },
          isOnFirstLine: Math.abs(coordsAtCursor.top - coordsAtStart.top) < 5,
          textContent: state.doc.textContent.substring(0, 50) + (state.doc.textContent.length > 50 ? '...' : '')
        })

        // Empty document - always trigger
        if (state.doc.textContent.length === 0) {
          console.log('🔵 [DEBUG UP ARROW] ✅ Empty document - triggering navigation')
          event.preventDefault()
          options.onUpArrowAtFirstLine()
          return true
        }

        // Check if we're on the first line by comparing vertical positions
        // If cursor is on the same line as the start (within 5px tolerance), we're on the first line
        const isOnFirstLine = Math.abs(coordsAtCursor.top - coordsAtStart.top) < 5

        if (isOnFirstLine) {
          console.log('🔵 [DEBUG UP ARROW] ✅ On first line - triggering navigation')
          event.preventDefault()
          options.onUpArrowAtFirstLine()
          return true
        } else {
          console.log('🔵 [DEBUG UP ARROW] ❌ Not on first line, allowing default behavior')
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

        // Get the DOM coordinates to check if we can move down
        const coordsAtCursor = view.coordsAtPos(currentPos)
        const endPos = state.doc.content.size - 1
        const coordsAtEnd = view.coordsAtPos(endPos) // Last position in content

        // DEBUG: Enhanced logging
        console.log('🔴 [DEBUG DOWN ARROW] Detailed analysis:', {
          currentPos,
          endPos,
          parentOffset: $head.parentOffset,
          parentContentSize: $head.parent.content.size,
          parentType: $head.parent.type.name,
          docSize: state.doc.content.size,
          textLength: state.doc.textContent.length,
          coordsAtCursor: { top: coordsAtCursor.top, left: coordsAtCursor.left },
          coordsAtEnd: { top: coordsAtEnd.top, left: coordsAtEnd.left },
          isOnLastLine: Math.abs(coordsAtCursor.top - coordsAtEnd.top) < 5,
          textContent: state.doc.textContent.substring(0, 50) + (state.doc.textContent.length > 50 ? '...' : '')
        })

        // Empty document - always trigger
        if (state.doc.textContent.length === 0) {
          console.log('🔴 [DEBUG DOWN ARROW] ✅ Empty document - triggering navigation')
          event.preventDefault()
          options.onDownArrowAtLastLine()
          return true
        }

        // Check if we're on the last line by comparing vertical positions
        // If cursor is on the same line as the end (within 5px tolerance), we're on the last line
        const isOnLastLine = Math.abs(coordsAtCursor.top - coordsAtEnd.top) < 5

        if (isOnLastLine) {
          console.log('🔴 [DEBUG DOWN ARROW] ✅ On last line - triggering navigation')
          event.preventDefault()
          options.onDownArrowAtLastLine()
          return true
        } else {
          console.log('🔴 [DEBUG DOWN ARROW] ❌ Not on last line, allowing default behavior')
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
