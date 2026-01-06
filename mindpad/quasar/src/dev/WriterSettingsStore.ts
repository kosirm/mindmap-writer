import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface IndentColor {
  color: string
  rgba: string
}

export const useWriterSettingsStore = defineStore('writerSettings', () => {
  // Indent rainbow settings
  const indentRainbowEnabled = ref(true)
  const indentColors = ref<IndentColor[]>([
    { color: 'rgba(255, 100, 100, 0.1)', rgba: 'rgba(255, 100, 100, 0.1)' },
    { color: 'rgba(100, 255, 100, 0.1)', rgba: 'rgba(100, 255, 100, 0.1)' },
    { color: 'rgba(100, 100, 255, 0.1)', rgba: 'rgba(100, 100, 255, 0.1)' }
  ])

  // Indentation width setting (min 1px, max 30px, step 1px)
  const indentationWidth = ref(5)

  // Add a new color to the rainbow
  function addIndentColor() {
    const defaultColors = [
      'rgba(255, 255, 100, 0.1)',
      'rgba(255, 100, 255, 0.1)',
      'rgba(100, 255, 255, 0.1)',
      'rgba(200, 200, 200, 0.1)'
    ]

    // Find the first color not already in use
    const existingColors = indentColors.value.map(c => c.rgba)
    const newColor = defaultColors.find(color => !existingColors.includes(color)) ||
                    'rgba(200, 200, 200, 0.1)'

    indentColors.value.push({ color: newColor, rgba: newColor })
  }

  // Remove a color from the rainbow
  function removeIndentColor(index: number) {
    if (indentColors.value.length > 1) {
      indentColors.value.splice(index, 1)
    }
  }

  // Update a color in the rainbow
  function updateIndentColor(index: number, color: string) {
    if (index >= 0 && index < indentColors.value.length) {
      const colorObj = indentColors.value[index]
      if (colorObj) {
        colorObj.color = color
        colorObj.rgba = color
      }
    }
  }

  // Reset to default colors
  function resetToDefaults() {
    indentColors.value = [
      { color: 'rgba(255, 100, 100, 0.1)', rgba: 'rgba(255, 100, 100, 0.1)' },
      { color: 'rgba(100, 255, 100, 0.1)', rgba: 'rgba(100, 255, 100, 0.1)' },
      { color: 'rgba(100, 100, 255, 0.1)', rgba: 'rgba(100, 100, 255, 0.1)' }
    ]
  }

  // Get color for a specific indent level
  function getColorForIndentLevel(level: number): string {
    if (!indentRainbowEnabled.value || indentColors.value.length === 0) {
      return 'transparent'
    }

    const colors = indentColors.value
    const index = level % colors.length
    return colors[index]?.rgba || 'transparent'
  }

  return {
    indentRainbowEnabled,
    indentColors,
    indentationWidth,
    addIndentColor,
    removeIndentColor,
    updateIndentColor,
    resetToDefaults,
    getColorForIndentLevel
  }
})
