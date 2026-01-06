/**
 * AI Store - Manages AI chat and operation state
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAIStore = defineStore('ai', () => {
  // AI Chat state
  const isProcessing = ref(false)
  const messages = ref<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const error = ref<string | null>(null)

  // Actions
  function addMessage(role: 'user' | 'assistant', content: string) {
    messages.value.push({ role, content })
  }

  function clearMessages() {
    messages.value = []
  }

  function setProcessing(processing: boolean) {
    isProcessing.value = processing
  }

  function setError(err: string | null) {
    error.value = err
  }

  return {
    // State
    isProcessing,
    messages,
    error,

    // Actions
    addMessage,
    clearMessages,
    setProcessing,
    setError
  }
})

