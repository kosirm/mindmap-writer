<template>
  <div class="view-tab-wrapper">
    <div class="view-tab-content">
      <q-icon :name="icon" size="18px" class="view-tab-icon" />
      <span class="view-tab-title">{{ title }}</span>
    </div>
    <div class="view-tab-action" @click="handleClose">
      <q-icon name="close" size="14px" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getViewIcon, getViewTitle } from 'src/shared/utils/viewIcons'

interface Props {
  params: {
    api: {
      component: string
      title: string
      close: () => void
    }
  }
}

const props = defineProps<Props>()

const icon = computed(() => {
  return getViewIcon(props.params.api.component)
})

const title = computed(() => {
  return props.params.api.title || getViewTitle(props.params.api.component)
})

function handleClose(event: MouseEvent) {
  event.stopPropagation()
  props.params.api.close()
}
</script>

<style scoped lang="scss">
.view-tab-wrapper {
  display: flex;
  align-items: center;
  height: 100%;
  gap: 4px;
}

.view-tab-content {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.view-tab-icon {
  flex-shrink: 0;
}

.view-tab-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.view-tab-action {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 3px;
  cursor: pointer;
  opacity: 0.7;

  &:hover {
    opacity: 1;
    background-color: rgba(0, 0, 0, 0.1);
  }
}
</style>

