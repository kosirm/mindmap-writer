import { Node, mergeAttributes } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import MindmapNodeView from './MindmapNodeView.vue';

export interface MindmapNodeAttributes {
  nodeId: string;
  depth: number;
  isInferredTitle: boolean;
}

const dragHandlePluginKey = new PluginKey('mindmapNodeDragHandle');

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mindmapNode: {
      /**
       * Insert a mindmap node
       */
      insertMindmapNode: (attrs: MindmapNodeAttributes) => ReturnType;
      /**
       * Update a mindmap node's depth (for indent/outdent)
       */
      updateMindmapNodeDepth: (nodeId: string, newDepth: number) => ReturnType;
    };
  }
}

/**
 * Custom Tiptap Node extension for representing mindmap nodes in Full Document view.
 * Each node contains a title and content, with visual hierarchy through indentation.
 */
export const MindmapNodeExtension = Node.create({
  name: 'mindmapNode',

  group: 'block',

  content: 'block+', // Can contain multiple paragraphs (title + content)

  draggable: true,

  addAttributes() {
    return {
      nodeId: {
        default: null,
        parseHTML: element => element.getAttribute('data-node-id'),
        renderHTML: attributes => {
          if (!attributes.nodeId) {
            return {};
          }
          return {
            'data-node-id': attributes.nodeId,
          };
        },
      },
      depth: {
        default: 0,
        parseHTML: element => parseInt(element.getAttribute('data-depth') || '0', 10),
        renderHTML: attributes => {
          return {
            'data-depth': attributes.depth,
          };
        },
      },
      isInferredTitle: {
        default: false,
        parseHTML: element => element.getAttribute('data-inferred-title') === 'true',
        renderHTML: attributes => {
          return {
            'data-inferred-title': attributes.isInferredTitle ? 'true' : 'false',
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-mindmap-node]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-mindmap-node': 'true',
        class: 'mindmap-node-block',
      }),
      0, // Content hole
    ];
  },

  addNodeView() {
    return VueNodeViewRenderer(MindmapNodeView);
  },

  addCommands() {
    return {
      insertMindmapNode:
        (attrs: MindmapNodeAttributes) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
            content: [
              {
                type: 'paragraph',
                content: [],
              },
            ],
          });
        },

      updateMindmapNodeDepth:
        (nodeId: string, newDepth: number) =>
        ({ tr, state, dispatch }) => {
          let updated = false;

          state.doc.descendants((node, pos) => {
            if (node.type.name === this.name && node.attrs.nodeId === nodeId) {
              if (dispatch) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  depth: newDepth,
                });
                updated = true;
              }
              return false; // Stop searching
            }
          });

          return updated;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      // Tab: Increase indent (increase depth)
      Tab: () => {
        const { state } = this.editor;
        const { $from } = state.selection;
        const node = $from.node($from.depth);

        if (node.type.name === this.name) {
          const currentDepth = node.attrs.depth || 0;
          return this.editor.commands.updateMindmapNodeDepth(
            node.attrs.nodeId,
            currentDepth + 1
          );
        }

        return false;
      },

      // Shift+Tab: Decrease indent (decrease depth)
      'Shift-Tab': () => {
        const { state } = this.editor;
        const { $from } = state.selection;
        const node = $from.node($from.depth);

        if (node.type.name === this.name) {
          const currentDepth = node.attrs.depth || 0;
          if (currentDepth > 0) {
            return this.editor.commands.updateMindmapNodeDepth(
              node.attrs.nodeId,
              currentDepth - 1
            );
          }
        }

        return false;
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: dragHandlePluginKey,
        props: {
          // Handle drag start to set drag data
          handleDOMEvents: {
            dragstart: (view, event) => {
              const target = event.target as HTMLElement;

              // Only handle drags from our drag handle
              if (!target.closest('[data-drag-handle]')) {
                return false;
              }

              // Find the mindmap node being dragged
              const pos = view.posAtDOM(target, 0);
              const $pos = view.state.doc.resolve(pos);

              // Find the mindmap node
              let nodePos = pos;
              for (let d = $pos.depth; d > 0; d--) {
                const node = $pos.node(d);
                if (node.type.name === 'mindmapNode') {
                  nodePos = $pos.before(d);
                  break;
                }
              }

              // Set drag data
              if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/html', ''); // Required for Firefox
              }

              return false;
            },
          },
        },
      }),
    ];
  },
});

