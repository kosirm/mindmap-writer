import { computed } from 'vue';
import { useMindmapStore } from 'src/stores/mindmap';
import type { MindmapNode } from 'src/stores/mindmap';

/**
 * Represents an editable field in the flattened document
 */
export interface EditableField {
  nodeId: string;
  field: 'title' | 'content';
  node: MindmapNode;
}

/**
 * Flatten the tree into a linear sequence of editable fields
 * This creates a depth-first traversal of all editable fields
 */
function flattenTree(node: MindmapNode, result: EditableField[] = []): EditableField[] {
  // Add title field (only if it's a manual title - not inferred)
  const isInferredTitle = !node.title || node.title.trim() === '';
  if (!isInferredTitle) {
    result.push({
      nodeId: node.id,
      field: 'title',
      node,
    });
  }

  // Add content field (only if it has actual text content)
  // For navigation purposes, we skip empty content fields
  // We need to check the actual text content, not just the HTML
  const hasContent = node.content && (() => {
    const tmp = document.createElement('div');
    tmp.innerHTML = node.content;
    const textContent = tmp.textContent || '';
    return textContent.trim() !== '';
  })();

  if (hasContent) {
    result.push({
      nodeId: node.id,
      field: 'content',
      node,
    });
  }

  // Recursively process children (depth-first)
  if (node.children && node.children.length > 0) {
    // Only process children if node is not collapsed
    if (!node.metadata.collapsed) {
      for (const child of node.children) {
        flattenTree(child, result);
      }
    }
  }

  return result;
}

/**
 * Composable for document-wide navigation between editable fields
 */
export function useDocumentNavigation() {
  const store = useMindmapStore();

  /**
   * Get flattened list of all editable fields in the document
   */
  const flattenedFields = computed<EditableField[]>(() => {
    if (!store.currentDocument) {
      return [];
    }
    return flattenTree(store.currentDocument);
  });

  /**
   * Find the index of a specific field in the flattened list
   */
  function findFieldIndex(nodeId: string, field: 'title' | 'content'): number {
    return flattenedFields.value.findIndex(
      (f) => f.nodeId === nodeId && f.field === field
    );
  }

  /**
   * Get the next editable field (for Right arrow navigation)
   */
  function getNextField(nodeId: string, field: 'title' | 'content'): EditableField | null {
    const currentIndex = findFieldIndex(nodeId, field);
    console.log('[useDocumentNavigation] getNextField - nodeId:', nodeId, 'field:', field, 'currentIndex:', currentIndex);
    console.log('[useDocumentNavigation] Total flattened fields:', flattenedFields.value.length);
    console.log('[useDocumentNavigation] Flattened fields:', flattenedFields.value.map(f => `${f.nodeId}:${f.field}`));

    if (currentIndex === -1 || currentIndex === flattenedFields.value.length - 1) {
      console.log('[useDocumentNavigation] No next field (at end or not found)');
      return null; // No next field
    }
    const nextField = flattenedFields.value[currentIndex + 1] ?? null;
    console.log('[useDocumentNavigation] Next field:', nextField);
    return nextField;
  }

  /**
   * Get the previous editable field (for Left arrow navigation)
   */
  function getPreviousField(nodeId: string, field: 'title' | 'content'): EditableField | null {
    const currentIndex = findFieldIndex(nodeId, field);
    console.log('[useDocumentNavigation] getPreviousField - nodeId:', nodeId, 'field:', field, 'currentIndex:', currentIndex);
    console.log('[useDocumentNavigation] Total flattened fields:', flattenedFields.value.length);
    console.log('[useDocumentNavigation] Flattened fields:', flattenedFields.value.map(f => `${f.nodeId}:${f.field}`));

    if (currentIndex === -1 || currentIndex === 0) {
      console.log('[useDocumentNavigation] No previous field (at start or not found)');
      return null; // No previous field
    }
    const prevField = flattenedFields.value[currentIndex - 1] ?? null;
    console.log('[useDocumentNavigation] Previous field:', prevField);
    return prevField;
  }

  return {
    flattenedFields,
    findFieldIndex,
    getNextField,
    getPreviousField,
  };
}

