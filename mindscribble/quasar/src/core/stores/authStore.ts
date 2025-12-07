/**
 * Auth Store - Google OAuth authentication state
 *
 * Manages:
 * - Google sign-in state
 * - User profile information
 * - OAuth tokens for Google Drive API access
 * - Session persistence (remembers sign-in across page reloads)
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// LocalStorage keys for session persistence
const STORAGE_KEY_ACCESS_TOKEN = 'mindscribble:accessToken'
const STORAGE_KEY_TOKEN_EXPIRY = 'mindscribble:tokenExpiry'
const STORAGE_KEY_USER = 'mindscribble:user'

export interface GoogleUser {
  id: string
  email: string
  name: string
  imageUrl: string
}

export const useAuthStore = defineStore('auth', () => {
  // ============================================================
  // STATE
  // ============================================================

  /** Whether Google API is initialized */
  const isInitialized = ref(false)

  /** Whether user is signed in */
  const isSignedIn = ref(false)

  /** Whether sign-in is in progress */
  const isLoading = ref(false)

  /** Whether we're attempting silent sign-in on page load */
  const isRestoringSession = ref(false)

  /** Current user profile */
  const user = ref<GoogleUser | null>(null)

  /** OAuth access token for API calls */
  const accessToken = ref<string | null>(null)

  /** Error message if sign-in fails */
  const error = ref<string | null>(null)

  // ============================================================
  // COMPUTED
  // ============================================================

  /** Whether user can access Google Drive */
  const canAccessDrive = computed(() => isSignedIn.value && !!accessToken.value)

  /** User's display name or email */
  const displayName = computed(() => user.value?.name || user.value?.email || 'Guest')

  // ============================================================
  // ACTIONS
  // ============================================================

  function setInitialized(value: boolean) {
    isInitialized.value = value
  }

  function setLoading(value: boolean) {
    isLoading.value = value
  }

  function setError(message: string | null) {
    error.value = message
  }

  function setRestoringSession(value: boolean) {
    isRestoringSession.value = value
  }

  /**
   * Set user from Google Identity Services response
   */
  function setUserFromGIS(userInfo: GoogleUser) {
    user.value = userInfo
    isSignedIn.value = true
    error.value = null
    // Persist user info for session restoration
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userInfo))
    console.log('✅ User signed in:', user.value.email)
  }

  /**
   * Update access token and persist it with expiry time
   * @param token - The access token
   * @param expiresInSeconds - Token lifetime in seconds (default 3600 = 1 hour)
   */
  function updateAccessToken(token: string | null, expiresInSeconds = 3600) {
    accessToken.value = token

    if (token) {
      // Store token and calculate expiry time
      const expiryTime = Date.now() + (expiresInSeconds * 1000)
      localStorage.setItem(STORAGE_KEY_ACCESS_TOKEN, token)
      localStorage.setItem(STORAGE_KEY_TOKEN_EXPIRY, expiryTime.toString())

      if (!isSignedIn.value) {
        isSignedIn.value = true
      }
    } else {
      localStorage.removeItem(STORAGE_KEY_ACCESS_TOKEN)
      localStorage.removeItem(STORAGE_KEY_TOKEN_EXPIRY)
    }
  }

  function clearAuth() {
    user.value = null
    accessToken.value = null
    isSignedIn.value = false
    error.value = null
    // Clear all persisted auth data
    localStorage.removeItem(STORAGE_KEY_ACCESS_TOKEN)
    localStorage.removeItem(STORAGE_KEY_TOKEN_EXPIRY)
    localStorage.removeItem(STORAGE_KEY_USER)
  }

  /**
   * Try to restore session from localStorage
   * Returns remaining token lifetime in seconds if restored, 0 otherwise
   */
  function tryRestoreFromStorage(): number {
    const storedToken = localStorage.getItem(STORAGE_KEY_ACCESS_TOKEN)
    const storedExpiry = localStorage.getItem(STORAGE_KEY_TOKEN_EXPIRY)
    const storedUser = localStorage.getItem(STORAGE_KEY_USER)

    if (!storedToken || !storedExpiry || !storedUser) {
      return 0
    }

    const expiryTime = parseInt(storedExpiry, 10)
    const now = Date.now()
    const remainingMs = expiryTime - now

    // Check if token is still valid (with 5 minute buffer)
    if (remainingMs < 5 * 60 * 1000) {
      console.log('ℹ️ Stored token expired or expiring soon')
      clearAuth()
      return 0
    }

    try {
      const userInfo = JSON.parse(storedUser) as GoogleUser
      user.value = userInfo
      accessToken.value = storedToken
      isSignedIn.value = true
      console.log('✅ Session restored from storage:', userInfo.email)
      // Return remaining time in seconds
      return Math.floor(remainingMs / 1000)
    } catch {
      console.error('❌ Failed to parse stored user info')
      clearAuth()
      return 0
    }
  }

  /**
   * Check if there's a stored session that might be restorable
   */
  function hasStoredSession(): boolean {
    return !!localStorage.getItem(STORAGE_KEY_ACCESS_TOKEN)
  }

  // ============================================================
  // RETURN PUBLIC API
  // ============================================================

  return {
    // State
    isInitialized,
    isSignedIn,
    isLoading,
    isRestoringSession,
    user,
    accessToken,
    error,

    // Computed
    canAccessDrive,
    displayName,

    // Actions
    setInitialized,
    setLoading,
    setRestoringSession,
    setError,
    setUserFromGIS,
    updateAccessToken,
    clearAuth,
    tryRestoreFromStorage,
    hasStoredSession
  }
})

