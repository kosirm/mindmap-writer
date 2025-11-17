<template>
  <div class="full-document-editor">
    <DocumentTree
      v-if="store.currentDocument"
      :source="[store.currentDocument]"
      :depth="0"
    />
  </div>
</template>

<script setup lang="ts">
import { useMindmapStore } from 'src/stores/mindmap';
import DocumentTree from './FullDocumentTree.vue';

const store = useMindmapStore();
</script>

<style scoped lang="scss">
.full-document-editor {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background-color: #ffffff;
}
.document-nodes {
  max-width: 900px;
  margin: 0 auto;
}
</style>

