import { ref } from 'vue';

/**
 * Composable for handling inferred title resize functionality.
 * Provides drag-to-resize behavior for inferred title highlights.
 */
export function useInferredTitleResize() {
  const isResizing = ref(false);

  /**
   * Attach resize handlers to an element with inferred title highlight.
   *
   * @param element - The HTML element containing the inferred title highlight span
   * @param onResizeComplete - Callback when resize is complete with new character length
   * @returns Cleanup function to remove event listeners
   */
  function attachResizeHandlers(
    element: HTMLElement,
    onResizeComplete: (newLength: number) => void
  ): () => void {
    let mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
    let mouseUpHandler: ((e: MouseEvent) => void) | null = null;

    const mouseDownHandler = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Check if click is on the inferred title highlight
      if (!target.classList.contains('inferred-title-highlight')) {
        return;
      }

      const span = target;
      const rect = span.getBoundingClientRect();
      const clickX = event.clientX;

      // Check if click is within the resize zone: 16px from the right edge
      const distanceFromRight = rect.right - clickX;
      const isInResizeZone = distanceFromRight >= 0 && distanceFromRight <= 16;

      if (!isInResizeZone) {
        return;
      }

      console.log('[useInferredTitleResize] Resize handle clicked', {
        clickX,
        rectRight: rect.right,
        distanceFromRight: distanceFromRight
      });

      // Prevent default text selection
      event.preventDefault();

      // Get the current text content
      const textContent = span.textContent || '';
      const initialLength = textContent.length;
      const startX = clickX;
      let hasMoved = false;

      console.log('[useInferredTitleResize] Starting resize', {
        initialLength,
        startX
      });

      // Set the resizing flag
      isResizing.value = true;

      // Handle mouse move - update visual feedback
      mouseMoveHandler = (moveEvent: MouseEvent) => {
        hasMoved = true;
        const deltaX = moveEvent.clientX - startX;

        // Estimate character width (rough approximation)
        const charWidth = rect.width / initialLength;
        const deltaChars = Math.round(deltaX / charWidth);

        const newLength = Math.max(1, initialLength + deltaChars);
        const fullText = element.textContent || '';
        const clampedLength = Math.min(newLength, fullText.length);

        console.log('[useInferredTitleResize] Resizing', {
          deltaX,
          charWidth,
          deltaChars,
          newLength,
          clampedLength
        });

        // Emit event for visual feedback (parent component should update highlight)
        element.dispatchEvent(new CustomEvent('inferred-title-resize-preview', {
          detail: { length: clampedLength }
        }));
      };

      // Handle mouse up - finalize resize
      mouseUpHandler = (upEvent: MouseEvent) => {
        console.log('[useInferredTitleResize] Resize ended', {
          hasMoved
        });

        document.removeEventListener('mousemove', mouseMoveHandler!);
        document.removeEventListener('mouseup', mouseUpHandler!);

        // Reset the resizing flag
        isResizing.value = false;

        // Only trigger resize if the mouse actually moved
        if (hasMoved) {
          // Calculate final length
          const deltaX = upEvent.clientX - startX;
          const charWidth = rect.width / initialLength;
          const deltaChars = Math.round(deltaX / charWidth);
          const newLength = Math.max(1, initialLength + deltaChars);
          const fullText = element.textContent || '';
          const clampedLength = Math.min(newLength, fullText.length);

          console.log('[useInferredTitleResize] Final resize', {
            finalLength: clampedLength
          });

          // Call the callback with final length
          onResizeComplete(clampedLength);
        }
      };

      // Attach event listeners
      document.addEventListener('mousemove', mouseMoveHandler);
      document.addEventListener('mouseup', mouseUpHandler);
    };

    // Attach mousedown listener to the element
    element.addEventListener('mousedown', mouseDownHandler);

    // Return cleanup function
    return () => {
      element.removeEventListener('mousedown', mouseDownHandler);
      if (mouseMoveHandler) {
        document.removeEventListener('mousemove', mouseMoveHandler);
      }
      if (mouseUpHandler) {
        document.removeEventListener('mouseup', mouseUpHandler);
      }
    };
  }

  /**
   * Attach mousemove handler to show resize cursor only near right edge.
   */
  function attachCursorHandler(element: HTMLElement): () => void {
    const mouseMoveHandler = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Only handle if hovering over the inferred title highlight
      if (!target.classList?.contains('inferred-title-highlight')) {
        return;
      }

      const rect = target.getBoundingClientRect();
      const mouseX = event.clientX;

      // Define resize zone: 16px from the right edge
      const distanceFromRight = rect.right - mouseX;
      const isInResizeZone = distanceFromRight >= 0 && distanceFromRight <= 16;

      // Update cursor based on position
      if (isInResizeZone) {
        target.style.cursor = 'ew-resize';
      } else {
        target.style.cursor = 'text';
      }
    };

    element.addEventListener('mousemove', mouseMoveHandler);

    return () => {
      element.removeEventListener('mousemove', mouseMoveHandler);
    };
  }

  return {
    isResizing,
    attachResizeHandlers,
    attachCursorHandler
  };
}

