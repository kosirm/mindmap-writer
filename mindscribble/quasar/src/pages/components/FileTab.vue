<template>
  <div class="file-tab-wrapper">
    <div class="file-tab-content">
      <q-icon name="description" size="16px" class="file-tab-icon" />
      <span class="file-tab-title">{{ title }}</span>
    </div>
    <div class="file-tab-action" @click="handleClose">
      <q-icon name="close" size="14px" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

interface DockviewPanelApi {
  title?: string
  getTitle?: () => string
  _title?: string
  onDidTitleChange?: (callback: () => void) => void
  close: () => void
}

interface Props {
  params: {
    api: DockviewPanelApi
  }
}

const props = defineProps<Props>()
const title = ref('Untitled')

onMounted(() => {
  // Get initial title
  updateTitle()

  // Watch for title changes
  if (props.params.api.onDidTitleChange) {
    props.params.api.onDidTitleChange(() => {
      updateTitle()
    })
  }
})

function updateTitle() {
  // Try different ways to get the title from dockview API
  const apiTitle = props.params.api.title ||
                   props.params.api.getTitle?.() ||
                   props.params.api._title ||
                   'Untitled'

  // Remove the 📄 emoji if it exists
  title.value = apiTitle.replace('📄 ', '')
}

function handleClose(event: MouseEvent) {
  event.stopPropagation()
  props.params.api.close()
}
</script>

<style scoped lang="scss">
.file-tab-wrapper {
  display: flex;
  align-items: center;
  height: 100%;
  gap: 4px;
  color: inherit;
}

.file-tab-content {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  color: inherit;
}

.file-tab-icon {
  flex-shrink: 0;
  color: inherit;
}

.file-tab-title {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: inherit;
}

.file-tab-action {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 3px;
  cursor: pointer;
  opacity: 0.7;
  color: inherit;

  &:hover {
    opacity: 1;
    background-color: rgba(255, 255, 255, 0.2);
  }
}
</style>

