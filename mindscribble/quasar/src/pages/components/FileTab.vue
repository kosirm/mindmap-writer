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
import { computed } from 'vue'

interface Props {
  params: {
    api: {
      title: string
      close: () => void
    }
  }
}

const props = defineProps<Props>()

const title = computed(() => {
  // Remove the 📄 emoji if it exists in the title
  return props.params.api.title?.replace('📄 ', '') || 'Untitled'
})

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

