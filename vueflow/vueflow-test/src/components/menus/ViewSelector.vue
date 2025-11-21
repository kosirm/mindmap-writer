<template>
  <q-btn-dropdown
    flat
    dense
    no-caps
    :icon="currentViewIcon"
    :label="currentViewLabel"
    class="view-selector"
  >
    <q-list dense>
      <q-item
        v-for="view in availableViews"
        :key="view.id"
        clickable
        v-close-popup
        :active="modelValue === view.id"
        @click="selectView(view.id)"
      >
        <q-item-section avatar>
          <q-icon :name="view.icon" size="20px" />
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ view.label }}</q-item-label>
          <q-item-label v-if="view.description" caption>
            {{ view.description }}
          </q-item-label>
        </q-item-section>
        <q-item-section side v-if="modelValue === view.id">
          <q-icon name="check" color="primary" />
        </q-item-section>
      </q-item>
    </q-list>
  </q-btn-dropdown>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useViewRegistry } from '../../composables/useViewRegistry';

interface Props {
  modelValue: string;
}

interface Emits {
  (e: 'update:modelValue', value: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { getAllViews, getView } = useViewRegistry();

const availableViews = computed(() => getAllViews());

const currentView = computed(() => getView(props.modelValue));

const currentViewLabel = computed(() => currentView.value?.label || 'Select View');

const currentViewIcon = computed(() => currentView.value?.icon || 'view_module');

function selectView(viewId: string) {
  emit('update:modelValue', viewId);
}
</script>

<style scoped lang="scss">
.view-selector {
  font-size: 13px;
  padding: 2px 8px;
  min-height: 28px;
}

.view-selector :deep(.q-btn__content) {
  gap: 6px;
}

.view-selector :deep(.q-icon) {
  font-size: 18px;
}
</style>

