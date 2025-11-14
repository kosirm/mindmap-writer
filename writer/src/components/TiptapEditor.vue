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
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import type { MindmapNode } from 'stores/mindmap';
import { useViewSync } from 'src/composables/useViewSync';

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

// Initialize Tiptap editor
const editor = useEditor({
  extensions: [
    StarterKit,
    Placeholder.configure({
      placeholder: 'Start writing your content here...',
    }),
  ],
  content: '',
  editorProps: {
    attributes: {
      class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none',
    },
  },
  onUpdate: ({ editor }) => {
    if (isUpdatingFromStore.value) return;

    if (editorMode.value === 'node' && selectedNodeId.value) {
      // In Node Content mode, emit the content update for the selected node
      const content = editor.getHTML();
      emit('update:node-content', selectedNodeId.value, content);
    } else if (editorMode.value === 'full') {
      // In Full Document mode, parse and update the entire tree
      // TODO: Parse editor content and update store
      console.log('Full document updated:', editor.getHTML());
    }
  },
});

// Convert MindmapNode tree to HTML for display
function convertNodeToHTML(node: MindmapNode | null): string {
  if (!node) return '';

  let html = '';

  // Add current node content
  if (node.content) {
    html += `<p data-node-id="${node.id}" data-path="${node.path}">${node.content}</p>`;
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
watch(editorMode, (newMode) => {
  if (!editor.value) return;

  isUpdatingFromStore.value = true;

  if (newMode === 'full') {
    // Switch to Full Document mode
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
  }

  isUpdatingFromStore.value = false;
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
  }
});

// Initialize content on mount
onMounted(() => {
  if (editor.value && props.modelValue) {
    const html = convertNodeToHTML(props.modelValue);
    editor.value.commands.setContent(html);
  }
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
}
</style>

