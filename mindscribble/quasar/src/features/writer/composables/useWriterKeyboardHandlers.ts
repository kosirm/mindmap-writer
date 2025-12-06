import type { EditorView } from '@tiptap/pm/view'

/**
 * Keyboard handler options for Tiptap editors in Writer view
 */
export interface KeyboardHandlerOptions {
  onEnterKey?: () => void
  onLeftArrowAtStart?: () => void
  onRightArrowAtEnd?: () => void
  onUpArrowAtFirstLine?: () => void
  onDownArrowAtLastLine?: () => void
}

/**
 * Create keyboard event handler for Tiptap editor
 * Handles arrow key navigation between fields
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
    // Handle Enter key (without Shift) - move to content
    if (event.key === 'Enter' && !event.shiftKey && options.onEnterKey) {
      event.preventDefault()
      options.onEnterKey()
      return true
    }

    // Handle Right arrow at end - move to next field
    if (event.key === 'ArrowRight' && !event.shiftKey && options.onRightArrowAtEnd) {
      const { state } = view
      const { selection } = state

      if (selection.empty) {
        const { $head } = selection
        const isEmpty = state.doc.content.size === 0 || state.doc.textContent.length === 0

        // Check if we're at the absolute end of the document
        const isInLastParagraph = $head.after() >= state.doc.content.size
        const isAtEndOfParagraph = $head.parentOffset === $head.parent.content.size
        const isAtEnd = isInLastParagraph && isAtEndOfParagraph

        if (isAtEnd || isEmpty) {
          event.preventDefault()
          options.onRightArrowAtEnd()
          return true
        }
      }
    }

    // Handle Left arrow at start - move to previous field
    if (event.key === 'ArrowLeft' && !event.shiftKey && options.onLeftArrowAtStart) {
      const { state } = view
      const { selection } = state

      if (selection.empty) {
        const { $head } = selection
        const isAtAbsoluteStart = $head.pos === 1

        if (isAtAbsoluteStart) {
          event.preventDefault()
          options.onLeftArrowAtStart()
          return true
        }
      }
    }

    // Handle Up arrow at first line - move to previous field
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

        const currentCoords = view.coordsAtPos(currentPos)

        let foundPositionAbove = false
        for (let pos = currentPos - 1; pos >= 1; pos--) {
          try {
            const coords = view.coordsAtPos(pos)
            if (coords.top < currentCoords.top - 5) {
              foundPositionAbove = true
              break
            }
            if (currentPos - pos > 200) break
          } catch {
            continue
          }
        }

        if (!foundPositionAbove) {
          event.preventDefault()
          options.onUpArrowAtFirstLine()
          return true
        }
      }
    }

    // Handle Down arrow at last line - move to next field
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

        // Check if we're in the last text block by checking if there are more paragraphs after
        const isInLastBlock = $head.after() >= state.doc.content.size

        if (isInLastBlock) {
          // We're in the last paragraph, so definitely on last line
          event.preventDefault()
          options.onDownArrowAtLastLine()
          return true
        }

        // Not in last block - check coordinates for multi-paragraph content
        const currentCoords = view.coordsAtPos(currentPos)

        // Only check positions that are actually in text content (not at block boundaries)
        let foundPositionBelow = false
        const maxPos = state.doc.content.size - 1 // Exclude final position (after last paragraph)

        for (let pos = currentPos + 1; pos <= maxPos; pos++) {
          try {
            // Skip positions at block boundaries
            const resolvedPos = state.doc.resolve(pos)
            if (resolvedPos.parentOffset === 0 && pos > currentPos + 1) {
              // This is start of a new paragraph - definitely has content below
              foundPositionBelow = true
              break
            }

            const coords = view.coordsAtPos(pos)
            if (coords.top > currentCoords.top + 5) {
              foundPositionBelow = true
              break
            }
            if (pos - currentPos > 200) break
          } catch {
            continue
          }
        }

        if (!foundPositionBelow) {
          event.preventDefault()
          options.onDownArrowAtLastLine()
          return true
        }
      }
    }

    return false
  }
}

