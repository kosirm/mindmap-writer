<template>
  <div class="color-picker-container">
    <q-btn flat dense size="sm" @click="showDialog = true">
      <div class="color-preview" :style="{ backgroundColor: modelValue }"></div>
    </q-btn>

    <q-dialog v-model="showDialog">
      <q-card style="min-width: 300px">
        <q-card-section>
          <div class="text-h6">Color Picker</div>
        </q-card-section>

        <q-card-section>
          <q-color
            v-model="internalValue"
            format-model="rgba"
            default-view="palette"
            class="full-width"
          />

          <q-input
            v-model="internalValue"
            label="Color Value"
            class="q-mt-sm"
            dense
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn flat label="OK" color="primary" @click="applyColor" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits(['update:modelValue'])

const showDialog = ref(false)
const internalValue = ref(props.modelValue)

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
  internalValue.value = newValue
})

function applyColor() {
  emit('update:modelValue', internalValue.value)
}
</script>

<style scoped>
.color-picker-container {
  display: inline-block;
}

.color-preview {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid #ddd;
}
</style>