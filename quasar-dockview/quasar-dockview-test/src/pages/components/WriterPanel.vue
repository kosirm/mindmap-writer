<template>
  <div class="writer-panel">
    <div class="writer-header q-pa-md q-pb-sm">
      <div class="text-h6">
        <q-icon name="edit" class="q-mr-sm" />
        Writer View
      </div>
    </div>
    <div class="writer-content q-pa-md">
      <q-editor
        v-model="content"
        :toolbar="toolbar"
        :definitions="editorDefinitions"
        placeholder="Start writing your document..."
        class="writer-editor"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const content = ref(`
<h2>Document Title</h2>
<p>This is a rich text editor powered by Tiptap. You can write documents with full formatting support.</p>

<h3>Features</h3>
<ul>
  <li>Bold, italic, underline text</li>
  <li>Headings and lists</li>
  <li>Links and images</li>
  <li>Code blocks</li>
</ul>

<p><strong>This would integrate with the document store</strong> to provide a full document editing experience.</p>
`)

const toolbar = [
  ['bold', 'italic', 'underline', 'strike'],
  ['unorderedList', 'orderedList'],
  ['link'],
  ['fullscreen']
]

const editorDefinitions = {
  bold: { label: 'Bold', icon: 'format_bold' },
  italic: { label: 'Italic', icon: 'format_italic' },
  underline: { label: 'Underline', icon: 'format_underlined' },
  strike: { label: 'Strikethrough', icon: 'strikethrough_s' },
  unorderedList: { label: 'Bullet List', icon: 'format_list_bulleted' },
  orderedList: { label: 'Numbered List', icon: 'format_list_numbered' },
  link: { label: 'Link', icon: 'link' },
  fullscreen: { label: 'Fullscreen', icon: 'fullscreen' }
}
</script>

<style scoped lang="scss">
.writer-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff3e0;
}

.writer-header {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);

  .body--dark & {
    border-bottom-color: rgba(255, 255, 255, 0.12);
  }
}

.writer-content {
  flex: 1;
  padding: 16px;
  overflow: hidden;
}

.writer-editor {
  height: 100%;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;

  .body--dark & {
    border-color: rgba(255, 255, 255, 0.12);
  }
}
</style>
