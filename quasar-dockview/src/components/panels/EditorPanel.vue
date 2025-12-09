<template>
  <div class="editor-panel q-pa-md">
    <div class="text-h6 q-mb-md">Rich Text Editor</div>

    <q-editor
      v-model="content"
      :definitions="definitions"
      :toolbar="toolbar"
      placeholder="Start typing..."
      class="editor"
    />

    <q-separator class="q-my-md" />

    <div class="text-caption">Character count: {{ content.length }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const content = ref(`
<h2>Rich Text Editor Panel</h2>
<p>This demonstrates Quasar components inside Dockview panels.</p>
<ul>
  <li>Bullet points</li>
  <li>Formatted text</li>
  <li>Links and images</li>
</ul>
`)

const toolbar = [
  ['bold', 'italic', 'underline', 'strike'],
  ['unordered', 'ordered'],
  ['link'],
  ['fullscreen']
]

const definitions = {
  bold: { label: 'Bold', icon: 'format_bold' },
  italic: { label: 'Italic', icon: 'format_italic' },
  underline: { label: 'Underline', icon: 'format_underlined' },
  strike: { label: 'Strikethrough', icon: 'strikethrough_s' },
  unordered: { label: 'Bullet List', icon: 'format_list_bulleted' },
  ordered: { label: 'Numbered List', icon: 'format_list_numbered' },
  link: { label: 'Link', icon: 'link' },
  fullscreen: { label: 'Fullscreen', icon: 'fullscreen' }
}
</script>

<style scoped>
.editor-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.editor {
  flex: 1;
  min-height: 300px;
}
</style>