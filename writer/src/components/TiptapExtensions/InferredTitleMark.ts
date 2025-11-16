import { Mark, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export interface InferredTitleMarkOptions {
  HTMLAttributes: Record<string, unknown>;
  onResize?: (newLength: number) => void;
}

// Flag to track if we're currently resizing (to prevent triggering onUpdate during visual feedback)
let isResizing = false;

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    inferredTitleMark: {
      /**
       * Set the inferred title mark
       */
      setInferredTitleMark: (length: number) => ReturnType;
      /**
       * Unset the inferred title mark
       */
      unsetInferredTitleMark: () => ReturnType;
      /**
       * Check if currently resizing (returns boolean directly, not a command)
       */
      isResizingInferredTitle: () => ReturnType;
    };
  }
}

/**
 * Custom Tiptap Mark extension to highlight the inferred title portion of content.
 * This mark visually indicates which part of the content is being used as the node title.
 */
export const InferredTitleMark = Mark.create<InferredTitleMarkOptions>({
  name: 'inferredTitleMark',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  // Make the mark non-inclusive so typing at the boundary doesn't extend the mark
  // Setting to false means new content typed at the boundary won't inherit the mark
  inclusive: false,

  // Don't exclude any marks - allow this mark to coexist with others
  excludes: '',

  // Spanning allows the mark to span across multiple nodes if needed
  spanning: true,

  parseHTML() {
    return [
      {
        tag: 'span[data-inferred-title]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-inferred-title': 'true',
        class: 'inferred-title-highlight',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setInferredTitleMark:
        (length: number) =>
        ({ commands, state, tr, dispatch }) => {
          // Remove any existing inferred title marks first
          commands.unsetInferredTitleMark();

          if (length <= 0) return true;

          // Get the text content
          const text = state.doc.textContent;
          if (!text || text.length === 0) return true;

          // The length parameter is the exact length of the inferred title
          // We need to find the position in the document that corresponds to this text length
          const actualLength = Math.min(length, text.length);

          // In ProseMirror, positions are between characters, not at characters
          // Position 0 is before the first character
          // Position 1 is after the first character
          // But we need to account for the document structure (paragraph nodes)
          // The first paragraph starts at position 1 (after the doc node)
          // So to highlight N characters, we need to mark from position 1 to position 1+N
          const startPos = 1; // Start of first paragraph content
          const endPos = startPos + actualLength;

          console.log('[InferredTitleMark] setInferredTitleMark', {
            requestedLength: length,
            actualLength,
            text,
            textLength: text.length,
            textSubstring: text.substring(0, actualLength),
            startPos,
            endPos,
            docSize: state.doc.content.size,
            selectionFrom: state.selection.from,
            selectionTo: state.selection.to,
            isResizing
          });

          // Create the mark
          const mark = this.type.create({});

          // Apply the mark directly to the range without changing selection
          if (dispatch) {
            tr.addMark(startPos, endPos, mark);
            dispatch(tr);
          }

          return true;
        },

      isResizingInferredTitle:
        () =>
        () => {
          return isResizing;
        },

      unsetInferredTitleMark:
        () =>
        ({ state, tr, dispatch }) => {
          console.log('[InferredTitleMark] unsetInferredTitleMark called', {
            docContent: state.doc.textContent,
            docSize: state.doc.content.size,
            selection: { from: state.selection.from, to: state.selection.to }
          });

          // Check if the mark exists in the document
          let hasMarkBefore = false;
          state.doc.descendants((node, pos) => {
            if (node.marks.some(mark => mark.type.name === this.name)) {
              hasMarkBefore = true;
              console.log('[InferredTitleMark] Found mark at position', pos, 'in node:', node.textContent);
            }
          });

          console.log('[InferredTitleMark] Document has mark before removal:', hasMarkBefore);

          if (!hasMarkBefore) {
            console.log('[InferredTitleMark] No mark to remove');
            return true;
          }

          // Manually remove the mark from the entire document
          const markType = state.schema.marks[this.name];
          if (!markType) {
            console.log('[InferredTitleMark] Mark type not found in schema');
            return false;
          }

          // Remove the mark from the entire document (from position 0 to doc.content.size)
          const transaction = tr.removeMark(0, state.doc.content.size, markType);

          console.log('[InferredTitleMark] Created transaction to remove mark');

          if (dispatch) {
            dispatch(transaction);
            console.log('[InferredTitleMark] Transaction dispatched');
          }

          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;

    return [
      new Plugin({
        key: new PluginKey('inferredTitleMarkResize'),
        props: {
          handleDOMEvents: {
            mousedown: (view, event) => {
              const target = event.target as HTMLElement;

              // Check if the mousedown is on the resize handle
              // We detect this by checking if the click is on the highlight span
              // and if the click position is near the right edge OR above it (for the triangle)
              if (!target.classList.contains('inferred-title-highlight')) {
                return false;
              }

              const span = target;
              const rect = span.getBoundingClientRect();
              const clickX = event.clientX;
              const clickY = event.clientY;

              // Check if click is within the resize handle area:
              // - Horizontally: within 12px of the right edge (expanded for triangle)
              // - Vertically: from 10px above the top to the bottom (to catch triangle clicks)
              const isInHorizontalRange = clickX >= rect.right - 12 && clickX <= rect.right + 2;
              const isInVerticalRange = clickY >= rect.top - 10 && clickY <= rect.bottom;

              if (!isInHorizontalRange || !isInVerticalRange) {
                return false;
              }

              console.log('[InferredTitleMark] Resize handle clicked', {
                clickX,
                clickY,
                rectRight: rect.right,
                rectTop: rect.top,
                distanceX: rect.right - clickX,
                distanceY: clickY - rect.top
              });

              // Prevent default text selection
              event.preventDefault();

              // Get the current mark range
              const { state } = view;
              let markStart = -1;
              let markEnd = -1;

              state.doc.descendants((node, pos) => {
                if (node.marks.some(mark => mark.type.name === 'inferredTitleMark')) {
                  if (markStart === -1) markStart = pos;
                  markEnd = pos + node.nodeSize;
                }
              });

              if (markStart === -1) return false;

              const initialLength = markEnd - markStart;
              const startX = clickX;
              let hasMoved = false;

              console.log('[InferredTitleMark] Starting resize', {
                markStart,
                markEnd,
                initialLength,
                startX
              });

              // Set the resizing flag to prevent onUpdate from triggering during visual feedback
              isResizing = true;

              // Handle mouse move - only update visual feedback, don't emit updates
              const handleMouseMove = (moveEvent: MouseEvent) => {
                hasMoved = true;
                const deltaX = moveEvent.clientX - startX;

                // Estimate character width (rough approximation)
                const charWidth = rect.width / initialLength;
                const deltaChars = Math.round(deltaX / charWidth);

                const newLength = Math.max(1, initialLength + deltaChars);
                const text = state.doc.textContent;
                const clampedLength = Math.min(newLength, text.length);

                console.log('[InferredTitleMark] Resizing', {
                  deltaX,
                  charWidth,
                  deltaChars,
                  newLength,
                  clampedLength
                });

                // Update the mark visually (no callback, just visual feedback)
                const markType = view.state.schema.marks.inferredTitleMark;
                if (markType) {
                  view.dispatch(
                    view.state.tr.removeMark(0, view.state.doc.content.size, markType)
                      .addMark(1, 1 + clampedLength, markType.create())
                  );
                }
              };

              // Handle mouse up - only call onResize if the mouse actually moved
              const handleMouseUp = (upEvent: MouseEvent) => {
                console.log('[InferredTitleMark] Resize ended', {
                  hasMoved
                });

                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);

                // Reset the resizing flag
                isResizing = false;

                // Only trigger resize if the mouse actually moved
                if (hasMoved) {
                  // Calculate final length
                  const deltaX = upEvent.clientX - startX;
                  const charWidth = rect.width / initialLength;
                  const deltaChars = Math.round(deltaX / charWidth);
                  const newLength = Math.max(1, initialLength + deltaChars);
                  const text = state.doc.textContent;
                  const clampedLength = Math.min(newLength, text.length);

                  console.log('[InferredTitleMark] Final resize', {
                    finalLength: clampedLength
                  });

                  // Call the onResize callback if provided
                  if (options.onResize) {
                    options.onResize(clampedLength);
                  }
                }
              };

              // Attach event listeners
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);

              return true;
            },
          },
        },
      }),
    ];
  },
});

