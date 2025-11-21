import { computed } from 'vue';
import type { TreeItem } from '../components/WriterTree.vue';

/**
 * Represents an editable field in the flattened document
 */
export interface EditableField {
  nodeId: string;
  field: 'title' | 'content';
  node: TreeItem;
}

/**
 * Flatten the tree into a linear sequence of editable fields
 * This creates a depth-first traversal of all editable fields
 * 
 * @param nodes - Array of tree nodes to flatten
 * @param result - Accumulator for the flattened fields
 * @returns Array of editable fields in document order
 */
function flattenTree(nodes: TreeItem[], result: EditableField[] = []): EditableField[] {
  for (const node of nodes) {
    // Always add title field (all nodes have titles in this iteration)
    result.push({
      nodeId: node.id,
      field: 'title',
      node,
    });

    // Add content field (only if it has actual text content)
    // For navigation purposes, we skip empty content fields
    const hasContent = node.data.content && (() => {
      const tmp = document.createElement('div');
      tmp.innerHTML = node.data.content;
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
      flattenTree(node.children, result);
    }
  }

  return result;
}

/**
 * Composable for document-wide navigation between editable fields in Writer view
 * 
 * @param nodes - Reactive reference to the tree nodes
 * @returns Navigation functions for keyboard navigation
 */
export function useWriterNavigation(nodes: () => TreeItem[]) {
  /**
   * Get flattened list of all editable fields in the document
   */
  const flattenedFields = computed<EditableField[]>(() => {
    return flattenTree(nodes());
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
    console.log('[useWriterNavigation] getNextField - nodeId:', nodeId, 'field:', field, 'currentIndex:', currentIndex);
    console.log('[useWriterNavigation] Total flattened fields:', flattenedFields.value.length);
    console.log('[useWriterNavigation] Flattened fields:', flattenedFields.value.map(f => `${f.nodeId}:${f.field}`));

    if (currentIndex === -1 || currentIndex === flattenedFields.value.length - 1) {
      console.log('[useWriterNavigation] No next field (at end or not found)');
      return null; // No next field
    }
    const nextField = flattenedFields.value[currentIndex + 1] ?? null;
    console.log('[useWriterNavigation] Next field:', nextField);
    return nextField;
  }

  /**
   * Get the previous editable field (for Left arrow navigation)
   */
  function getPreviousField(nodeId: string, field: 'title' | 'content'): EditableField | null {
    const currentIndex = findFieldIndex(nodeId, field);
    console.log('[useWriterNavigation] getPreviousField - nodeId:', nodeId, 'field:', field, 'currentIndex:', currentIndex);
    console.log('[useWriterNavigation] Total flattened fields:', flattenedFields.value.length);
    console.log('[useWriterNavigation] Flattened fields:', flattenedFields.value.map(f => `${f.nodeId}:${f.field}`));

    if (currentIndex === -1 || currentIndex === 0) {
      console.log('[useWriterNavigation] No previous field (at start or not found)');
      return null; // No previous field
    }
    const prevField = flattenedFields.value[currentIndex - 1] ?? null;
    console.log('[useWriterNavigation] Previous field:', prevField);
    return prevField;
  }

  return {
    flattenedFields,
    findFieldIndex,
    getNextField,
    getPreviousField,
  };
}

