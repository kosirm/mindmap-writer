import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useVue3MindmapSettingsStore = defineStore('vue3MindmapSettings', () => {
  // Vue3-Mindmap specific settings
  const branchThickness = ref(2)
  const xGap = ref(50)
  const yGap = ref(150)

  function setSettings(settings: {
    branchThickness?: number
    xGap?: number
    yGap?: number
  }) {
    if (settings.branchThickness !== undefined) {
      branchThickness.value = settings.branchThickness
    }
    if (settings.xGap !== undefined) {
      xGap.value = settings.xGap
    }
    if (settings.yGap !== undefined) {
      yGap.value = settings.yGap
    }
  }

  function resetToDefaults() {
    branchThickness.value = 2
    xGap.value = 50
    yGap.value = 150
  }

  return {
    branchThickness,
    xGap,
    yGap,
    setSettings,
    resetToDefaults
  }
})
