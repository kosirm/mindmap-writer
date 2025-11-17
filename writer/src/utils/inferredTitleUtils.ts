/**
 * Utility functions for working with inferred title highlights in content HTML
 */

/**
 * Extract the inferred title highlight length from content HTML
 * Returns the plain text length of the highlighted span
 *
 * @param contentHtml - The content HTML that may contain an inferred title highlight
 * @returns The length of the highlighted text, or null if no highlight found
 */
export function extractInferredTitleLength(contentHtml: string): number | null {
  if (!contentHtml) return null;

  // Parse the HTML
  const tmp = document.createElement('div');
  tmp.innerHTML = contentHtml;

  // Find the span with inferred-title-highlight class
  const highlightSpan = tmp.querySelector('span.inferred-title-highlight[data-inferred-title="true"]');

  if (!highlightSpan) return null;

  // Extract plain text (strips all HTML tags like <strong>, <i>, etc.)
  const plainText = highlightSpan.textContent || '';

  return plainText.length;
}

/**
 * Extract the inferred title text from content HTML (plain text, no HTML)
 *
 * @param contentHtml - The content HTML that may contain an inferred title highlight
 * @returns The plain text of the highlighted portion, or null if no highlight found
 */
export function extractInferredTitleText(contentHtml: string): string | null {
  if (!contentHtml) return null;

  // Parse the HTML
  const tmp = document.createElement('div');
  tmp.innerHTML = contentHtml;

  // Find the span with inferred-title-highlight class
  const highlightSpan = tmp.querySelector('span.inferred-title-highlight[data-inferred-title="true"]');

  if (!highlightSpan) return null;

  // Extract plain text (strips all HTML tags like <strong>, <i>, etc.)
  const plainText = highlightSpan.textContent || '';

  return plainText.trim();
}

/**
 * Update the inferred title highlight length in content HTML
 * This modifies the existing highlight span to cover a different number of characters
 *
 * @param contentHtml - The content HTML with existing highlight
 * @param newLength - The new length for the highlight (in plain text characters)
 * @returns Updated HTML with new highlight length, or original HTML if no highlight found
 */
export function updateInferredTitleLength(contentHtml: string, newLength: number): string {
  if (!contentHtml) return contentHtml;

  // Parse the HTML
  const tmp = document.createElement('div');
  tmp.innerHTML = contentHtml;

  // Find the first paragraph (where inferred title should be)
  const firstParagraph = tmp.querySelector('p');
  if (!firstParagraph) return contentHtml;

  // Get all text content from the first paragraph
  const fullText = firstParagraph.textContent || '';

  // Clamp the new length to valid range
  const clampedLength = Math.max(1, Math.min(newLength, fullText.length));

  // We need to rebuild the first paragraph with the new highlight
  // This is complex because we need to preserve formatting within the highlight
  // For now, let's extract the text and rebuild with simple structure

  // Get the text to highlight
  const textToHighlight = fullText.substring(0, clampedLength);
  const remainingText = fullText.substring(clampedLength);

  // Create new paragraph structure
  const newParagraph = document.createElement('p');

  // Create highlight span
  const highlightSpan = document.createElement('span');
  highlightSpan.setAttribute('data-inferred-title', 'true');
  highlightSpan.className = 'inferred-title-highlight';
  highlightSpan.textContent = textToHighlight;

  newParagraph.appendChild(highlightSpan);

  // Add remaining text if any
  if (remainingText) {
    newParagraph.appendChild(document.createTextNode(remainingText));
  }

  // Replace the first paragraph
  if (firstParagraph.parentNode) {
    firstParagraph.parentNode.replaceChild(newParagraph, firstParagraph);
  }

  return tmp.innerHTML;
}

/**
 * Check if content HTML has an inferred title highlight
 *
 * @param contentHtml - The content HTML to check
 * @returns True if content has inferred title highlight
 */
export function hasInferredTitleHighlight(contentHtml: string): boolean {
  if (!contentHtml) return false;

  const tmp = document.createElement('div');
  tmp.innerHTML = contentHtml;

  const highlightSpan = tmp.querySelector('span.inferred-title-highlight[data-inferred-title="true"]');

  return highlightSpan !== null;
}

/**
 * Remove inferred title highlight from content HTML
 * Converts highlighted text back to plain text
 *
 * @param contentHtml - The content HTML with highlight
 * @returns HTML with highlight removed
 */
export function removeInferredTitleHighlight(contentHtml: string): string {
  if (!contentHtml) return contentHtml;

  const tmp = document.createElement('div');
  tmp.innerHTML = contentHtml;

  const highlightSpan = tmp.querySelector('span.inferred-title-highlight[data-inferred-title="true"]');

  if (highlightSpan) {
    // Replace the span with its text content
    const textNode = document.createTextNode(highlightSpan.textContent || '');
    if (highlightSpan.parentNode) {
      highlightSpan.parentNode.replaceChild(textNode, highlightSpan);
    }
  }

  return tmp.innerHTML;
}

/**
 * Ensure content HTML has inferred title highlight with the specified length
 * If highlight doesn't exist, create it. If it exists, update it.
 *
 * @param contentHtml - The content HTML
 * @param targetLength - Target character count for the highlight (default: 20)
 * @returns The content HTML with the highlight applied
 */
export function ensureInferredTitleHighlight(contentHtml: string, targetLength: number = 20): string {
  if (!contentHtml || !contentHtml.trim()) return contentHtml;

  // Check if highlight already exists
  const existingLength = extractInferredTitleLength(contentHtml);

  if (existingLength !== null) {
    // Highlight exists - update it if length is different
    if (existingLength !== targetLength) {
      return updateInferredTitleLength(contentHtml, targetLength);
    }
    return contentHtml;
  }

  // No highlight exists - we need to add the highlight to the HTML
  // Use updateInferredTitleLength which handles adding highlight to plain HTML
  return updateInferredTitleLength(contentHtml, targetLength);
}

