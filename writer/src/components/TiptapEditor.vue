<template>
  <div class="tiptap-editor-container">
    <template v-if="editor">
      <div class="editor-toolbar">
        <!-- Formatting buttons only -->
        <q-btn
          flat
          dense
          size="sm"
          icon="format_bold"
          :class="{ 'is-active': editor.isActive('bold') }"
          @click="editor.chain().focus().toggleBold().run()"
        >
          <q-tooltip>Bold</q-tooltip>
        </q-btn>
        <q-btn
          flat
          dense
          size="sm"
          icon="format_italic"
          :class="{ 'is-active': editor.isActive('italic') }"
          @click="editor.chain().focus().toggleItalic().run()"
        >
          <q-tooltip>Italic</q-tooltip>
        </q-btn>
        <q-separator vertical inset class="q-mx-sm" />
        <q-btn
          flat
          dense
          size="sm"
          icon="format_list_bulleted"
          :class="{ 'is-active': editor.isActive('bulletList') }"
          @click="editor.chain().focus().toggleBulletList().run()"
        >
          <q-tooltip>Bullet List</q-tooltip>
        </q-btn>
        <q-btn
          flat
          dense
          size="sm"
          icon="format_list_numbered"
          :class="{ 'is-active': editor.isActive('orderedList') }"
          @click="editor.chain().focus().toggleOrderedList().run()"
        >
          <q-tooltip>Numbered List</q-tooltip>
        </q-btn>
      </div>
      <editor-content :editor="editor" class="editor-content" />
    </template>
    <div v-else class="editor-loading">
      <q-spinner color="primary" size="3em" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed, nextTick } from 'vue';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import type { MindmapNode } from 'stores/mindmap';
import { inferTitle } from 'stores/mindmap';
import { useViewSync } from 'src/composables/useViewSync';
import { InferredTitleMark } from './TiptapExtensions/InferredTitleMark';

interface Props {
  modelValue: MindmapNode | null;
  mode?: 'full' | 'node';
}

interface Emits {
  (e: 'update:modelValue', value: MindmapNode): void;
  (e: 'node-selected', nodeId: string): void;
  (e: 'update:node-content', nodeId: string, content: string): void;
  (e: 'update:mode', mode: 'full' | 'node'): void;
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'full'
});
const emit = defineEmits<Emits>();

const isUpdatingFromStore = ref(false);
const editorMode = computed({
  get: () => props.mode,
  set: (value) => emit('update:mode', value)
});
const selectedNodeId = ref<string | null>(null);
const selectedNode = ref<MindmapNode | null>(null);

// Event bus for cross-view synchronization
const viewSync = useViewSync('text');

// Handle resize of inferred title highlight (called on drag END only)
const handleInferredTitleResize = (newLength: number) => {
  console.log('[TiptapEditor] handleInferredTitleResize', {
    newLength,
    selectedNodeId: selectedNodeId.value,
    selectedNode: selectedNode.value
  });

  if (!selectedNode.value) return;

  // Get the actual inferred title with word-boundary rounding
  const text = editor.value?.state.doc.textContent || '';
  const inferredTitle = inferTitle(text, newLength);
  const actualLength = inferredTitle.length;

  console.log('[TiptapEditor] Calculated inferred title', {
    requestedLength: newLength,
    actualLength,
    inferredTitle
  });

  // Store the custom character count in the node
  if (!selectedNode.value.inferredCharCount || selectedNode.value.inferredCharCount !== actualLength) {
    selectedNode.value.inferredCharCount = actualLength;
    selectedNode.value.inferredTitle = inferredTitle;

    // Update the highlight to match the actual length
    isUpdatingFromStore.value = true;
    editor.value?.commands.setInferredTitleMark(actualLength);
    isUpdatingFromStore.value = false;

    // Emit update to store
    if (props.modelValue) {
      emit('update:modelValue', props.modelValue);
    }

    console.log('[TiptapEditor] Updated inferredCharCount and inferredTitle', {
      nodeId: selectedNode.value.id,
      newCharCount: actualLength,
      newInferredTitle: selectedNode.value.inferredTitle
    });
  }
};

// Initialize Tiptap editor
const editor = useEditor({
  extensions: [
    StarterKit,
    Placeholder.configure({
      placeholder: 'Start writing your content here...',
    }),
    InferredTitleMark.configure({
      onResize: handleInferredTitleResize,
    }),
  ],
  content: '',
  editorProps: {
    attributes: {
      class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none',
    },
  },
  onUpdate: ({ editor }) => {
    if (isUpdatingFromStore.value) {
      console.log('[TiptapEditor] onUpdate: Skipping - isUpdatingFromStore is true');
      return;
    }

    if (editorMode.value === 'node' && selectedNodeId.value) {
      // In Node Content mode, emit the content update for the selected node
      const content = editor.getHTML();
      console.log('[TiptapEditor] onUpdate: Node mode - emitting update:node-content', {
        nodeId: selectedNodeId.value,
        htmlContent: content,
        textContent: editor.getText()
      });
      emit('update:node-content', selectedNodeId.value, content);

      // Update inferred title highlight if node has empty title
      updateInferredTitleHighlight();
    } else if (editorMode.value === 'full') {
      // In Full Document mode, parse and update the entire tree
      // TODO: Parse editor content and update store
      console.log('[TiptapEditor] onUpdate: Full document updated:', editor.getHTML());
    }
  },
});

// Convert MindmapNode tree to HTML for display
function convertNodeToHTML(node: MindmapNode | null): string {
  if (!node) return '';

  let html = '';

  // Add current node content (already HTML)
  if (node.content) {
    html += node.content;
  }

  // Recursively add children
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      html += convertNodeToHTML(child);
    }
  }

  return html;
}

// Helper function to find node by ID
function findNodeById(node: MindmapNode | null, id: string): MindmapNode | null {
  if (!node) return null;
  if (node.id === id) return node;

  if (node.children) {
    for (const child of node.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }

  return null;
}

// Update inferred title highlight
function updateInferredTitleHighlight() {
  console.log('[TiptapEditor] updateInferredTitleHighlight START', {
    hasEditor: !!editor.value,
    mode: editorMode.value,
    hasSelectedNode: !!selectedNode.value,
    selectedNodeId: selectedNode.value?.id,
    selectedNodeTitle: selectedNode.value?.title,
    selectedNodeHasInferredTitle: selectedNode.value ? !selectedNode.value.title || selectedNode.value.title.trim() === '' : false
  });

  if (!editor.value) return;
  if (editorMode.value !== 'node') return;
  if (!selectedNode.value) return;

  // Set flag to prevent onUpdate from emitting changes
  isUpdatingFromStore.value = true;

  // Only highlight if node has empty title (inferred mode)
  if (selectedNode.value.title && selectedNode.value.title.trim() !== '') {
    // Node has explicit title - remove highlight
    console.log('[TiptapEditor] Node has explicit title, removing highlight');
    editor.value.commands.unsetInferredTitleMark();
    isUpdatingFromStore.value = false;
    return;
  }

  // Get the plain text content from editor
  const plainText = editor.value.getText();

  // Calculate what the inferred title would be
  const charCount = selectedNode.value.inferredCharCount || 20;
  const inferredTitle = inferTitle(plainText, charCount);

  console.log('[TiptapEditor] Applying inferred title highlight', {
    plainText,
    charCount,
    inferredTitle,
    inferredTitleLength: inferredTitle.length,
    plainTextSubstring: plainText.substring(0, inferredTitle.length),
    match: plainText.substring(0, inferredTitle.length) === inferredTitle
  });

  // Apply highlight for the exact length of the inferred title
  if (inferredTitle) {
    editor.value.commands.setInferredTitleMark(inferredTitle.length);
  } else {
    editor.value.commands.unsetInferredTitleMark();
  }

  // Reset flag
  isUpdatingFromStore.value = false;

  console.log('[TiptapEditor] updateInferredTitleHighlight END');
}

// Watch for changes from store (Full Document mode)
watch(() => props.modelValue, (newValue) => {
  if (!editor.value || !newValue) return;
  if (editorMode.value !== 'full') return; // Only update in full mode

  isUpdatingFromStore.value = true;
  const html = convertNodeToHTML(newValue);
  editor.value.commands.setContent(html);
  isUpdatingFromStore.value = false;
}, { deep: true });

// Watch for mode changes
watch(editorMode, (newMode, oldMode) => {
  console.log('[TiptapEditor] Mode changed', { oldMode, newMode });

  if (!editor.value) return;

  isUpdatingFromStore.value = true;

  if (newMode === 'full') {
    // Switch to Full Document mode
    console.log('[TiptapEditor] Switching to Full Document mode');
    const html = convertNodeToHTML(props.modelValue);
    editor.value.commands.setContent(html);
    editor.value.setOptions({
      editorProps: {
        attributes: {
          class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none',
        },
      },
    });
  } else if (newMode === 'node') {
    // Switch to Node Content mode
    console.log('[TiptapEditor] Switching to Node Content mode', {
      hasSelectedNode: !!selectedNode.value,
      selectedNodeId: selectedNode.value?.id,
      selectedNodeTitle: selectedNode.value?.title
    });

    if (selectedNode.value) {
      editor.value.commands.setContent(selectedNode.value.content || '');
    } else {
      editor.value.commands.setContent('<p>Select a node to edit its content</p>');
    }
    editor.value.setOptions({
      editorProps: {
        attributes: {
          class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none',
        },
      },
    });

    // Apply inferred title highlight
    updateInferredTitleHighlight();
  }

  isUpdatingFromStore.value = false;
  console.log('[TiptapEditor] Mode change complete');
});

// Listen to node selection events from other views
viewSync.onNodeSelected((event) => {
  selectedNodeId.value = event.nodeId;

  // Find the selected node in the tree
  selectedNode.value = findNodeById(props.modelValue, event.nodeId);

  // If in Node Content mode, update the editor
  if (editorMode.value === 'node' && editor.value && selectedNode.value) {
    isUpdatingFromStore.value = true;
    editor.value.commands.setContent(selectedNode.value.content || '');
    isUpdatingFromStore.value = false;

    // Apply inferred title highlight
    updateInferredTitleHighlight();
  }
});

// Watch for changes to the selected node's content (reactivity)
// Watch for changes to the selected node in the store
watch(() => {
  if (selectedNodeId.value && props.modelValue) {
    return findNodeById(props.modelValue, selectedNodeId.value);
  }
  return null;
}, (newNode) => {
  console.log('[TiptapEditor] Selected node watcher triggered', {
    newNodeId: newNode?.id,
    newNodeInferredCharCount: newNode?.inferredCharCount,
    oldNodeId: selectedNode.value?.id,
    oldNodeInferredCharCount: selectedNode.value?.inferredCharCount
  });

  // Update the selectedNode ref to point to the latest version from the store
  if (newNode) {
    selectedNode.value = newNode;
  }
});

watch(() => {
  if (selectedNodeId.value && props.modelValue) {
    const node = findNodeById(props.modelValue, selectedNodeId.value);
    return node?.content;
  }
  return null;
}, (newContent, oldContent) => {
  console.log('[TiptapEditor] Content watcher triggered', {
    newContent,
    oldContent,
    mode: editorMode.value,
    selectedNodeId: selectedNodeId.value
  });

  // Only update if:
  // 1. We're in node mode
  // 2. Editor exists
  // 3. Content actually changed
  // 4. Current editor HTML is different from new content (avoid unnecessary updates)
  if (editorMode.value === 'node' && editor.value && newContent !== oldContent) {
    const currentEditorHTML = editor.value.getHTML();
    const newContentHTML = newContent || '';

    console.log('[TiptapEditor] Comparing editor HTML with new content', {
      currentEditorHTML,
      newContentHTML,
      areEqual: currentEditorHTML === newContentHTML
    });

    // Only update if the HTML is actually different
    if (currentEditorHTML !== newContentHTML) {
      console.log('[TiptapEditor] Updating editor content from store');
      isUpdatingFromStore.value = true;
      editor.value.commands.setContent(newContent || '');
      isUpdatingFromStore.value = false;

      // Update inferred title highlight after content is set
      void nextTick(() => {
        updateInferredTitleHighlight();
      });
    }
  }
});

// Initialize content on mount
onMounted(() => {
  if (editor.value && props.modelValue) {
    const html = convertNodeToHTML(props.modelValue);
    editor.value.commands.setContent(html);
  }

  // Debug: Add global event listeners to track all clicks
  console.log('[TiptapEditor] Adding global event listeners for debugging');

  document.addEventListener('mousedown', (e) => {
    console.log('[GLOBAL] mousedown event (capture phase)', {
      target: e.target,
      targetTagName: (e.target as Element)?.tagName,
      targetClasses: (e.target as Element)?.className,
      targetId: (e.target as Element)?.id,
      timestamp: Date.now()
    });
  }, true); // Capture phase

  document.addEventListener('mousedown', (e) => {
    console.log('[GLOBAL] mousedown event (bubble phase)', {
      target: e.target,
      targetTagName: (e.target as Element)?.tagName,
      targetClasses: (e.target as Element)?.className,
      targetId: (e.target as Element)?.id,
      timestamp: Date.now()
    });
  }, false); // Bubble phase

  document.addEventListener('click', (e) => {
    console.log('[GLOBAL] click event (capture phase)', {
      target: e.target,
      targetTagName: (e.target as Element)?.tagName,
      targetClasses: (e.target as Element)?.className,
      targetId: (e.target as Element)?.id,
      timestamp: Date.now()
    });
  }, true); // Capture phase

  document.addEventListener('click', (e) => {
    console.log('[GLOBAL] click event (bubble phase)', {
      target: e.target,
      targetTagName: (e.target as Element)?.tagName,
      targetClasses: (e.target as Element)?.className,
      targetId: (e.target as Element)?.id,
      timestamp: Date.now()
    });
  }, false); // Bubble phase
});

// Cleanup
onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.destroy();
  }
});
</script>

<style lang="scss" scoped>
.tiptap-editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
  border-left: 1px solid #e0e0e0;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid #e0e0e0;
  background: #f5f5f5;
  flex-shrink: 0;

  .is-active {
    background: rgba(0, 0, 0, 0.1);
  }
}

.editor-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.editor-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.ProseMirror) {
  min-height: 100%;
  outline: none;

  p {
    margin: 0.5em 0;

    &.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      float: left;
      color: #adb5bd;
      pointer-events: none;
      height: 0;
    }
  }

  // Inferred title highlight
  .inferred-title-highlight {
    background-color: rgba(255, 235, 59, 0.3); // Light yellow highlight
    border-bottom: 2px solid rgba(255, 193, 7, 0.6); // Amber underline
    padding: 2px 0;
    padding-right: 4px; // Add padding on the right to prevent covering last character
    position: relative;
    cursor: text; // Default cursor for the text

    // Add a small triangle/tear indicator above the end of the highlight
    &::before {
      content: '';
      position: absolute;
      right: 0px; // Align with the right edge
      top: -10px; // Position above the text
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 10px solid rgba(255, 193, 7, 0.9); // Amber triangle pointing down
      cursor: ew-resize; // Show resize cursor
      z-index: 10; // Ensure it's above other elements
      pointer-events: auto; // Make sure it receives mouse events
    }

    // Show resize cursor when hovering near the right edge
    &:hover {
      cursor: ew-resize;
    }
  }
}
</style>

