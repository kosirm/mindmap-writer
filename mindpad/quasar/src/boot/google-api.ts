/**
 * Google API Boot File
 *
 * Uses the new Google Identity Services (GIS) library for OAuth 2.0
 * and the gapi client for Google Drive API access.
 *
 * GIS replaces the deprecated gapi.auth2 library.
 * See: https://developers.google.com/identity/gsi/web/guides/migration
 */

import { defineBoot } from '#q-app/wrappers'
import { useAuthStore } from '../core/stores'
import type { TokenClient, TokenResponse } from '../core/types/google-identity'

// Google API configuration
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string

// Scopes needed:
// - drive.file: Access to files created by the app
// - userinfo.email: User's email address
// - userinfo.profile: User's basic profile (name, picture)
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
].join(' ')

// Global state
let tokenClient: TokenClient | null = null
let gapiInited = false
let gisInited = false

// Pending sign-in promise resolver
let pendingSignInResolve: ((value: void) => void) | null = null
let pendingSignInReject: ((reason: Error) => void) | null = null

// Token refresh timer
let tokenRefreshTimer: ReturnType<typeof setTimeout> | null = null

// Refresh token 5 minutes before expiry
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000

/**
 * Load a script dynamically
 */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
    document.head.appendChild(script)
  })
}

/**
 * Initialize the gapi client for Drive API
 */
async function initGapiClient(): Promise<void> {
  await loadScript('https://apis.google.com/js/api.js')

  return new Promise((resolve, reject) => {
    gapi.load('client', () => {
      gapi.client.init({
        apiKey: GOOGLE_API_KEY,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
      }).then(() => {
        gapiInited = true
        console.log('✅ GAPI client initialized')
        resolve()
      }).catch((error: unknown) => {
        reject(error instanceof Error ? error : new Error(String(error)))
      })
    })
  })
}

/**
 * Initialize Google Identity Services (GIS) for OAuth
 */
async function initGisClient(): Promise<void> {
  await loadScript('https://accounts.google.com/gsi/client')

  const authStore = useAuthStore()

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: SCOPES,
    callback: (tokenResponse: TokenResponse) => {
      if (tokenResponse.error) {
        console.error('❌ Token error:', tokenResponse.error)
        authStore.setError(tokenResponse.error_description || tokenResponse.error)
        pendingSignInReject?.(new Error(tokenResponse.error))
        pendingSignInResolve = null
        pendingSignInReject = null
        return
      }

      // Store the access token with expiry time
      authStore.updateAccessToken(tokenResponse.access_token, tokenResponse.expires_in)

      // Set token for gapi client
      gapi.client.setToken({ access_token: tokenResponse.access_token })

      // Fetch user info (only if we don't have it yet)
      if (!authStore.user) {
        void fetchUserInfo(tokenResponse.access_token)
      }

      // Schedule automatic token refresh
      scheduleTokenRefresh(tokenResponse.expires_in)

      console.log('✅ Token received, expires in', tokenResponse.expires_in, 'seconds')
      pendingSignInResolve?.()
      pendingSignInResolve = null
      pendingSignInReject = null
    }
  })

  gisInited = true
  console.log('✅ GIS client initialized')
}

/**
 * Fetch user profile information
 */
async function fetchUserInfo(accessToken: string): Promise<void> {
  const authStore = useAuthStore()

  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch user info')
    }

    const userInfo = await response.json()

    authStore.setUserFromGIS({
      id: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      imageUrl: userInfo.picture
    })

    console.log('✅ User info fetched:', userInfo.email)
  } catch (error) {
    console.error('❌ Failed to fetch user info:', error)
  }
}

/**
 * Schedule automatic token refresh before expiry
 */
function scheduleTokenRefresh(expiresInSeconds: number): void {
  // Clear any existing timer
  if (tokenRefreshTimer) {
    clearTimeout(tokenRefreshTimer)
    tokenRefreshTimer = null
  }

  // Calculate when to refresh (5 minutes before expiry)
  const refreshInMs = (expiresInSeconds * 1000) - TOKEN_REFRESH_BUFFER_MS

  // Only schedule if we have enough time
  if (refreshInMs <= 0) {
    console.log('⚠️ Token expires too soon, attempting immediate refresh')
    void silentTokenRefresh()
    return
  }

  console.log(`🔄 Token refresh scheduled in ${Math.round(refreshInMs / 60000)} minutes`)

  tokenRefreshTimer = setTimeout(() => {
    void silentTokenRefresh()
  }, refreshInMs)
}

/**
 * Silently refresh the token without user interaction
 */
async function silentTokenRefresh(): Promise<boolean> {
  const authStore = useAuthStore()

  if (!authStore.isSignedIn || !tokenClient) {
    return false
  }

  console.log('🔄 Attempting silent token refresh...')

  return new Promise((resolve) => {
    // Set up a timeout in case the silent refresh doesn't work
    const timeoutId = setTimeout(() => {
      console.log('⚠️ Silent token refresh timed out')
      pendingSignInResolve = null
      pendingSignInReject = null
      resolve(false)
    }, 10000) // 10 second timeout

    pendingSignInResolve = () => {
      clearTimeout(timeoutId)
      console.log('✅ Token refreshed silently')
      resolve(true)
    }
    pendingSignInReject = () => {
      clearTimeout(timeoutId)
      console.log('⚠️ Silent token refresh failed')
      resolve(false)
    }

    // Try silent refresh with empty prompt (no popup)
    tokenClient?.requestAccessToken({ prompt: '' })
  })
}

/**
 * Clear token refresh timer (call on sign out)
 */
function clearTokenRefreshTimer(): void {
  if (tokenRefreshTimer) {
    clearTimeout(tokenRefreshTimer)
    tokenRefreshTimer = null
  }
}

/**
 * Initialize Google API (both gapi and GIS)
 */
export async function initGoogleAPI(): Promise<void> {
  const authStore = useAuthStore()

  if (gapiInited && gisInited) {
    return
  }

  try {
    authStore.setLoading(true)
    authStore.setError(null)

    await Promise.all([initGapiClient(), initGisClient()])

    authStore.setInitialized(true)
    console.log('✅ Google API fully initialized')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to initialize Google API'
    authStore.setError(message)
    console.error('❌ Google API initialization failed:', error)
    throw error
  } finally {
    authStore.setLoading(false)
  }
}


/**
 * Sign in with Google - shows consent popup
 */
export async function signIn(): Promise<void> {
  await initGoogleAPI()

  const authStore = useAuthStore()
  authStore.setLoading(true)
  authStore.setError(null)

  return new Promise((resolve, reject) => {
    pendingSignInResolve = () => {
      authStore.setLoading(false)
      resolve()
    }
    pendingSignInReject = (error) => {
      authStore.setLoading(false)
      reject(error)
    }

    // Request access token - shows consent popup
    tokenClient?.requestAccessToken({ prompt: 'consent' })
  })
}

/**
 * Try to restore a previous session from localStorage
 * Returns true if session was restored, false otherwise
 */
export async function tryRestoreSession(): Promise<boolean> {
  const authStore = useAuthStore()

  // First, try to restore from localStorage (instant, no network)
  const remainingSeconds = authStore.tryRestoreFromStorage()
  if (remainingSeconds > 0) {
    // We have a valid token from storage, initialize gapi and set the token
    try {
      await initGoogleAPI()

      // Ensure gapi client is fully initialized before setting token
      if (!gapi.client || !gapiInited) {
        throw new Error('GAPI client not initialized')
      }

      const token = authStore.accessToken
      if (!token) {
        throw new Error('No access token available')
      }

      gapi.client.setToken({ access_token: token })
      console.log('✅ Token set for gapi client:', token.substring(0, 20) + '...')

      // Verify token works by making a test call
      try {
        await gapi.client.drive.files.list({
          pageSize: 1,
          fields: 'files(id)'
        })
        console.log('✅ Token verified - Drive API accessible')
      } catch (error) {
        console.error('❌ Token verification failed, attempting silent refresh:', error)
        // Token is invalid, try silent refresh
        const refreshed = await silentTokenRefresh()
        if (!refreshed) {
          console.error('❌ Silent refresh failed, clearing auth')
          authStore.clearAuth()
          return false
        }
        console.log('✅ Token refreshed successfully')
      }

      // Schedule refresh for the remaining token lifetime
      scheduleTokenRefresh(remainingSeconds)

      console.log('✅ Session restored from storage, token valid for', Math.round(remainingSeconds / 60), 'minutes')
      return true
    } catch (error) {
      console.error('❌ Failed to initialize Google API after storage restore:', error)
      authStore.clearAuth()
      return false
    }
  }

  return false
}

/**
 * Sign out from Google
 */
export function signOut(): void {
  const authStore = useAuthStore()
  const token = authStore.accessToken

  // Clear refresh timer
  clearTokenRefreshTimer()

  if (token) {
    // Revoke the token
    google.accounts.oauth2.revoke(token, () => {
      console.log('✅ Token revoked')
    })
  }

  // Clear gapi token
  gapi.client.setToken(null)

  // Clear auth store
  authStore.clearAuth()

  console.log('✅ Sign-out successful')
}

/**
 * Check if user has a valid token (for session restoration)
 */
export function hasValidToken(): boolean {
  const authStore = useAuthStore()
  return !!authStore.accessToken
}

/**
 * Boot file export - attempts to restore previous session on app start
 */
export default defineBoot(() => {
  console.log('🔌 Google API boot file loaded')

  // Attempt to restore session if user was previously signed in
  // This is done asynchronously so it doesn't block app startup
  void tryRestoreSession()
})

