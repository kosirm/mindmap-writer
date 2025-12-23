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
 * In ProseMirror:
 * - Position `1` is the start of content (position `0` is the doc node)
 * - Maximum cursor position is `doc.content.size - 1` (not `doc.content.size`)
 * - For multi-paragraph content, we need to check absolute position, not parentOffset
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

        // Empty document - always trigger
        if (state.doc.textContent.length === 0) {
          event.preventDefault()
          options.onUpArrowAtFirstLine()
          return true
        }

        // Check if we're at the absolute start of the document (position 1)
        if (currentPos === 1) {
          event.preventDefault()
          options.onUpArrowAtFirstLine()
          return true
        }

        // Check if we're on the first line of the current paragraph
        const paragraphStartPos = $head.before($head.depth) + 1

        // Check if this is the first line by seeing if we're near the paragraph start
        if (currentPos >= paragraphStartPos && currentPos <= paragraphStartPos + 10) {
          // Check if there are multiple lines in this paragraph
          const paragraphEndPos = $head.after($head.depth) - 1

          if (paragraphEndPos > paragraphStartPos + 10) {
            // This paragraph has multiple lines, check if we're on the first line
            const firstLineEndPos = findFirstLineEnd(view, paragraphStartPos, paragraphEndPos)

            if (currentPos <= firstLineEndPos) {
              // We're on the first line, trigger navigation
              event.preventDefault()
              options.onUpArrowAtFirstLine()
              return true
            }
          } else {
            // Single line paragraph, always trigger
            event.preventDefault()
            options.onUpArrowAtFirstLine()
            return true
          }
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

        // Empty document - always trigger
        if (state.doc.textContent.length === 0) {
          event.preventDefault()
          options.onDownArrowAtLastLine()
          return true
        }

        // Check if we're at the absolute end of the document
        if (currentPos >= state.doc.content.size - 1) {
          event.preventDefault()
          options.onDownArrowAtLastLine()
          return true
        }

        // Check if we're on the last line of the current paragraph
        const paragraphEndPos = $head.after($head.depth) - 1

        // Check if this is the last line by seeing if we're near the paragraph end
        if (currentPos >= paragraphEndPos - 10 && currentPos <= paragraphEndPos) {
          // Check if there are multiple lines in this paragraph
          const paragraphStartPos = $head.before($head.depth) + 1

          if (paragraphEndPos > paragraphStartPos + 10) {
            // This paragraph has multiple lines, check if we're on the last line
            const lastLineStartPos = findLastLineStart(view, paragraphStartPos, paragraphEndPos)

            if (currentPos >= lastLineStartPos) {
              // We're on the last line, trigger navigation
              event.preventDefault()
              options.onDownArrowAtLastLine()
              return true
            }
          } else {
            // Single line paragraph, always trigger
            event.preventDefault()
            options.onDownArrowAtLastLine()
            return true
          }
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

/**
 * Find the end position of the first line in a paragraph
 */
function findFirstLineEnd(view: EditorView, startPos: number, endPos: number): number {
  const startCoords = view.coordsAtPos(startPos)

  for (let pos = startPos + 1; pos <= endPos; pos++) {
    try {
      const coords = view.coordsAtPos(pos)
      // If we've moved down more than a line height, we're on the next line
      if (coords.top > startCoords.top + 15) {
        return pos - 1
      }
    } catch {
      continue
    }
  }

  return endPos
}

/**
 * Find the start position of the last line in a paragraph
 */
function findLastLineStart(view: EditorView, startPos: number, endPos: number): number {
  const endCoords = view.coordsAtPos(endPos)

  for (let pos = endPos - 1; pos >= startPos; pos--) {
    try {
      const coords = view.coordsAtPos(pos)
      // If we've moved up more than a line height, we're on the previous line
      if (coords.top < endCoords.top - 15) {
        return pos + 1
      }
    } catch {
      continue
    }
  }

  return startPos
}
