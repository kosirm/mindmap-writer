<template>
  <div
    ref="editorContainer"
    class="mindmap-inline-editor"
    @mousedown.stop
    @click.stop
    @dblclick.stop
  >
    <editor-content v-if="editor" :editor="editor" />
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount, watch } from 'vue';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';

interface Props {
  modelValue: string;
  visible: boolean;
}

interface Emits {
  (e: 'update:modelValue', value: string): void;
  (e: 'save', value: string): void;
  (e: 'cancel'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const editorContainer = ref<HTMLDivElement>();

// Create Tiptap editor instance
const editor = useEditor({
  extensions: [
    StarterKit.configure({
      // Disable features we don't need for inline editing
      heading: false,
      blockquote: false,
      codeBlock: false,
      horizontalRule: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      // Keep paragraph but prevent multiple paragraphs
      paragraph: {
        HTMLAttributes: {
          style: 'margin: 0; padding: 0;'
        }
      },
    }),
  ],
  content: props.modelValue,
  editorProps: {
    attributes: {
      class: 'mindmap-inline-editor-content',
      style: 'outline: none; white-space: nowrap; overflow: hidden;'
    },
    // Prevent Enter key from creating new paragraphs
    handleKeyDown: (view, event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        // Save on Enter
        if (editor.value) {
          emit('save', editor.value.getHTML());
        }
        return true;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        emit('cancel');
        return true;
      }
      return false;
    },
    // Stop propagation of mouse events to prevent SVG from handling them
    handleDOMEvents: {
      mousedown: (view, event) => {
        event.stopPropagation();
        return false; // Let ProseMirror handle the event
      },
      click: (view, event) => {
        event.stopPropagation();
        return false; // Let ProseMirror handle the event
      },
      dblclick: (view, event) => {
        event.stopPropagation();
        return false; // Let ProseMirror handle the event
      }
    }
  },
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML());
  },
  autofocus: 'end',
  editable: true,
});

// Watch for visibility changes
watch(() => props.visible, (newVisible) => {
  console.log('[MindmapInlineEditor] Visibility changed', { newVisible, hasEditor: !!editor.value, modelValue: props.modelValue });
  if (newVisible && editor.value) {
    // Set content when becoming visible
    editor.value.commands.setContent(props.modelValue);
    console.log('[MindmapInlineEditor] Content set, focusing editor');
    // Just focus at the end, don't select all
    setTimeout(() => {
      editor.value?.commands.focus('end');
      console.log('[MindmapInlineEditor] Editor focused');
    }, 10);
  }
});

// Watch for content changes from outside
watch(() => props.modelValue, (newValue) => {
  if (editor.value && props.visible) {
    const currentContent = editor.value.getHTML();
    if (currentContent !== newValue) {
      editor.value.commands.setContent(newValue);
    }
  }
});

onBeforeUnmount(() => {
  editor.value?.destroy();
});
</script>

<style scoped>
.mindmap-inline-editor {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  font-family: inherit;
  font-size: inherit;
  line-height: 1.2;
}

.mindmap-inline-editor :deep(.ProseMirror) {
  outline: none;
  white-space: nowrap;
  overflow: visible;
  padding: 0;
  margin: 0;
  min-height: auto;
}

.mindmap-inline-editor :deep(.ProseMirror p) {
  margin: 0;
  padding: 0;
  display: inline;
}

.mindmap-inline-editor :deep(.ProseMirror strong) {
  font-weight: bold;
}

.mindmap-inline-editor :deep(.ProseMirror em) {
  font-style: italic;
}

.mindmap-inline-editor :deep(.ProseMirror code) {
  background-color: rgba(0, 0, 0, 0.1);
  padding: 0.1em 0.3em;
  border-radius: 3px;
  font-family: monospace;
}
</style>

