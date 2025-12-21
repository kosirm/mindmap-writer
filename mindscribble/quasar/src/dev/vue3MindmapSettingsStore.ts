import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useVue3MindmapSettingsStore = defineStore('vue3MindmapSettings', () => {
  // Vue3-Mindmap specific settings
  const branchThickness = ref(2)
  const xGap = ref(84)
  const yGap = ref(18)

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
    xGap.value = 84
    yGap.value = 18
  }

  return {
    branchThickness,
    xGap,
    yGap,
    setSettings,
    resetToDefaults
  }
})
