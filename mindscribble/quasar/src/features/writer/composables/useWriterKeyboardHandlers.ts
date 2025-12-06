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
    const isArrowKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)

    // Debug logging for arrow keys
    if (isArrowKey) {
      const { state } = view
      const { selection } = state
      const { $head } = selection
      console.log(`[KeyboardHandler] ========== ${event.key} PRESSED ==========`)
      console.log(`[KeyboardHandler] selection.empty: ${selection.empty}`)
      console.log(`[KeyboardHandler] $head.pos: ${$head.pos}`)
      console.log(`[KeyboardHandler] $head.parentOffset: ${$head.parentOffset}`)
      console.log(`[KeyboardHandler] $head.parent.content.size: ${$head.parent.content.size}`)
      console.log(`[KeyboardHandler] $head.after(): ${$head.after()}`)
      console.log(`[KeyboardHandler] state.doc.content.size: ${state.doc.content.size}`)
      console.log(`[KeyboardHandler] state.doc.textContent: "${state.doc.textContent}"`)
      console.log(`[KeyboardHandler] state.doc.textContent.length: ${state.doc.textContent.length}`)
    }

    // Handle Enter key (without Shift) - move to content
    if (event.key === 'Enter' && !event.shiftKey && options.onEnterKey) {
      console.log('[KeyboardHandler] ✅ Enter key - triggering onEnterKey')
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

        console.log(`[KeyboardHandler] ArrowRight - isEmpty: ${isEmpty}, isInLastParagraph: ${isInLastParagraph}, isAtEndOfParagraph: ${isAtEndOfParagraph}, isAtEnd: ${isAtEnd}`)

        if (isAtEnd || isEmpty) {
          console.log('[KeyboardHandler] ✅ ArrowRight at end - triggering navigation')
          event.preventDefault()
          options.onRightArrowAtEnd()
          return true
        } else {
          console.log('[KeyboardHandler] ❌ ArrowRight NOT at end - not triggering')
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

        console.log(`[KeyboardHandler] ArrowLeft - isAtAbsoluteStart: ${isAtAbsoluteStart}`)

        if (isAtAbsoluteStart) {
          console.log('[KeyboardHandler] ✅ ArrowLeft at start - triggering navigation')
          event.preventDefault()
          options.onLeftArrowAtStart()
          return true
        } else {
          console.log('[KeyboardHandler] ❌ ArrowLeft NOT at start - not triggering')
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
          console.log('[KeyboardHandler] ✅ ArrowUp in empty doc - triggering navigation')
          event.preventDefault()
          options.onUpArrowAtFirstLine()
          return true
        }

        const currentCoords = view.coordsAtPos(currentPos)
        console.log(`[KeyboardHandler] ArrowUp - currentCoords.top: ${currentCoords.top}`)

        let foundPositionAbove = false
        for (let pos = currentPos - 1; pos >= 1; pos--) {
          try {
            const coords = view.coordsAtPos(pos)
            if (coords.top < currentCoords.top - 5) {
              foundPositionAbove = true
              console.log(`[KeyboardHandler] ArrowUp - found position above at pos ${pos}, coords.top: ${coords.top}`)
              break
            }
            if (currentPos - pos > 200) break
          } catch {
            continue
          }
        }

        console.log(`[KeyboardHandler] ArrowUp - foundPositionAbove: ${foundPositionAbove}, isOnFirstLine: ${!foundPositionAbove}`)

        if (!foundPositionAbove) {
          console.log('[KeyboardHandler] ✅ ArrowUp on first line - triggering navigation')
          event.preventDefault()
          options.onUpArrowAtFirstLine()
          return true
        } else {
          console.log('[KeyboardHandler] ❌ ArrowUp NOT on first line - not triggering')
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
          console.log('[KeyboardHandler] ✅ ArrowDown in empty doc - triggering navigation')
          event.preventDefault()
          options.onDownArrowAtLastLine()
          return true
        }

        // Check if we're in the last text block by checking if there are more paragraphs after
        const isInLastBlock = $head.after() >= state.doc.content.size
        console.log(`[KeyboardHandler] ArrowDown - isInLastBlock: ${isInLastBlock}`)

        if (isInLastBlock) {
          // We're in the last paragraph, so definitely on last line
          console.log('[KeyboardHandler] ✅ ArrowDown in last block - triggering navigation')
          event.preventDefault()
          options.onDownArrowAtLastLine()
          return true
        }

        // Not in last block - check coordinates for multi-paragraph content
        const currentCoords = view.coordsAtPos(currentPos)
        console.log(`[KeyboardHandler] ArrowDown - currentCoords.top: ${currentCoords.top}`)

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
              console.log(`[KeyboardHandler] ArrowDown - found new paragraph at pos ${pos}`)
              break
            }

            const coords = view.coordsAtPos(pos)
            if (coords.top > currentCoords.top + 5) {
              foundPositionBelow = true
              console.log(`[KeyboardHandler] ArrowDown - found position below at pos ${pos}, coords.top: ${coords.top}`)
              break
            }
            if (pos - currentPos > 200) break
          } catch {
            continue
          }
        }

        console.log(`[KeyboardHandler] ArrowDown - foundPositionBelow: ${foundPositionBelow}, isOnLastLine: ${!foundPositionBelow}`)

        if (!foundPositionBelow) {
          console.log('[KeyboardHandler] ✅ ArrowDown on last line - triggering navigation')
          event.preventDefault()
          options.onDownArrowAtLastLine()
          return true
        } else {
          console.log('[KeyboardHandler] ❌ ArrowDown NOT on last line - not triggering')
        }
      }
    }

    return false
  }
}

