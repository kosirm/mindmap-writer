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
        const isEmpty = $head.parent.content.size === 0
        const isAtEnd = $head.parentOffset === $head.parent.content.size

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
        const isAtStart = $head.parentOffset === 0 && $head.pos === 1

        if (isAtStart) {
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
        const isEmpty = $head.parent.content.size === 0

        if (isEmpty) {
          event.preventDefault()
          options.onDownArrowAtLastLine()
          return true
        }

        const currentCoords = view.coordsAtPos(currentPos)
        let foundPositionBelow = false
        const maxPos = state.doc.content.size - 1

        for (let pos = currentPos + 1; pos <= maxPos; pos++) {
          try {
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

