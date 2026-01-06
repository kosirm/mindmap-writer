import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useMindmapSettingsStore = defineStore('mindmapSettings', () => {
  // Mindmap specific settings
  const branchThickness = ref(2)
  const xGap = ref(50)
  const yGap = ref(150)
  const groupSpacing = ref(150)

  function setSettings(settings: {
    branchThickness?: number
    xGap?: number
    yGap?: number
    groupSpacing?: number
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
    if (settings.groupSpacing !== undefined) {
      groupSpacing.value = settings.groupSpacing
    }
  }

  function resetToDefaults() {
    branchThickness.value = 2
    xGap.value = 50
    yGap.value = 150
    groupSpacing.value = 150
  }

  return {
    branchThickness,
    xGap,
    yGap,
    groupSpacing,
    setSettings,
    resetToDefaults
  }
})
