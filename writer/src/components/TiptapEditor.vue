<template>
  <div class="tiptap-editor-container">
    <template v-if="editor">
      <div class="editor-toolbar">
        <q-btn
          flat
          dense
          size="sm"
          icon="format_bold"
          :class="{ 'is-active': editor.isActive('bold') }"
          @click="editor.chain().focus().toggleBold().run()"
        />
        <q-btn
          flat
          dense
          size="sm"
          icon="format_italic"
          :class="{ 'is-active': editor.isActive('italic') }"
          @click="editor.chain().focus().toggleItalic().run()"
        />
        <q-separator vertical inset class="q-mx-sm" />
        <q-btn
          flat
          dense
          size="sm"
          icon="format_list_bulleted"
          :class="{ 'is-active': editor.isActive('bulletList') }"
          @click="editor.chain().focus().toggleBulletList().run()"
        />
        <q-btn
          flat
          dense
          size="sm"
          icon="format_list_numbered"
          :class="{ 'is-active': editor.isActive('orderedList') }"
          @click="editor.chain().focus().toggleOrderedList().run()"
        />
      </div>
      <editor-content :editor="editor" class="editor-content" />
    </template>
    <div v-else class="editor-loading">
      <q-spinner color="primary" size="3em" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import type { MindmapNode } from 'stores/mindmap';

interface Props {
  modelValue: MindmapNode | null;
}

interface Emits {
  (e: 'update:modelValue', value: MindmapNode): void;
  (e: 'node-selected', nodeId: string): void;
}

const props = defineProps<Props>();
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const emit = defineEmits<Emits>();

const isUpdatingFromStore = ref(false);

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

    // TODO: Parse editor content and update store
    // For now, just log the content
    console.log('Editor updated:', editor.getHTML());
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

// Watch for changes from store
watch(() => props.modelValue, (newValue) => {
  if (!editor.value || !newValue) return;

  isUpdatingFromStore.value = true;
  const html = convertNodeToHTML(newValue);
  editor.value.commands.setContent(html);
  isUpdatingFromStore.value = false;
}, { deep: true });

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

