import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { InferredTitleMark } from 'src/components/TiptapExtensions/InferredTitleMark';
import type { Extensions } from '@tiptap/core';

/**
 * Shared Tiptap configuration for different editor types
 * This ensures consistent behavior across Content mode and Full Document mode
 */

export type EditorType = 'inferred-content' | 'manual-title' | 'manual-content';

export interface TiptapConfigOptions {
  /**
   * Callback when inferred title is resized (only for inferred-content type)
   */
  onInferredTitleResize?: (newLength: number) => void;

  /**
   * Placeholder text for empty editors
   */
  placeholder?: string;
}

/**
 * Get Tiptap extensions configuration based on editor type
 */
export function getTiptapExtensions(
  type: EditorType,
  options: TiptapConfigOptions = {}
): Extensions {
  const baseExtensions: Extensions = [
    StarterKit.configure({
      // Disable features we don't need in node editors
      heading: false,
      codeBlock: false,
      blockquote: false,
      horizontalRule: false,
    }),
  ];

  // Add placeholder if provided
  if (options.placeholder) {
    baseExtensions.push(
      Placeholder.configure({
        placeholder: options.placeholder,
      })
    );
  }

  // For inferred title content, add the InferredTitleMark extension
  if (type === 'inferred-content') {
    // Only configure InferredTitleMark if onResize callback is provided
    if (options.onInferredTitleResize) {
      baseExtensions.push(
        InferredTitleMark.configure({
          onResize: options.onInferredTitleResize,
        })
      );
    } else {
      baseExtensions.push(InferredTitleMark);
    }
  }

  return baseExtensions;
}

/**
 * Get complete Tiptap editor options based on editor type
 */
export function getTiptapEditorOptions(
  type: EditorType,
  content: string,
  options: TiptapConfigOptions = {}
) {
  return {
    extensions: getTiptapExtensions(type, options),
    content,
    editorProps: {
      attributes: {
        class: getEditorClass(type),
      },
    },
    // Don't auto-focus - we'll handle focus manually
    autofocus: false,
  };
}

/**
 * Get CSS class for editor based on type
 */
function getEditorClass(type: EditorType): string {
  const baseClass = 'tiptap-editor';

  switch (type) {
    case 'inferred-content':
      return `${baseClass} tiptap-inferred-content`;
    case 'manual-title':
      return `${baseClass} tiptap-manual-title`;
    case 'manual-content':
      return `${baseClass} tiptap-manual-content`;
    default:
      return baseClass;
  }
}

/**
 * Get default placeholder text based on editor type
 */
export function getDefaultPlaceholder(type: EditorType): string {
  switch (type) {
    case 'manual-title':
      return 'Enter title...';
    case 'manual-content':
    case 'inferred-content':
      return 'Add content...';
    default:
      return '';
  }
}

