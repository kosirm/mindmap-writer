/**
 * Google OAuth Authentication Service
 * Handles token management and authentication state
 */

export class GoogleAuthService {
  private static tokenRefreshTimer: number | null = null
  private static isRefreshing = false

  /**
   * Refresh OAuth token if needed (5 minutes before expiry)
   */
  static async refreshTokenIfNeeded(): Promise<void> {
    if (this.isRefreshing) return

    try {
      this.isRefreshing = true

      const token = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse()
      const expiresIn = token.expires_in

      // Refresh 5 minutes before expiry
      if (expiresIn < 300) {
        console.log('🔑 [GoogleAuth] Refreshing token...')
        await gapi.auth2.getAuthInstance().currentUser.get().reloadAuthResponse()
        console.log('🔑 [GoogleAuth] Token refreshed successfully')
      }

    } catch (error) {
      console.error('🔑 [GoogleAuth] Failed to refresh token:', error)
      throw new Error('Failed to refresh Google OAuth token')
    } finally {
      this.isRefreshing = false
    }
  }

  /**
   * Start automatic token refresh timer (every 50 minutes)
   */
  static startTokenRefreshTimer(): void {
    // Stop existing timer
    if (this.tokenRefreshTimer) {
      window.clearInterval(this.tokenRefreshTimer)
    }

    // Refresh every 50 minutes
    this.tokenRefreshTimer = window.setInterval(() => {
      void this.refreshTokenIfNeeded()
    }, 50 * 60 * 1000) as unknown as number

    console.log('🔑 [GoogleAuth] Started token refresh timer')
  }

  /**
   * Stop token refresh timer
   */
  static stopTokenRefreshTimer(): void {
    if (this.tokenRefreshTimer) {
      window.clearInterval(this.tokenRefreshTimer)
      this.tokenRefreshTimer = null
    }
  }

  /**
   * Check if user is authenticated
   */
  static async ensureAuthenticated(): Promise<boolean> {
    try {
      // Check if already authenticated
      const isSignedIn = gapi.auth2.getAuthInstance().isSignedIn.get()
      if (isSignedIn) {
        await this.refreshTokenIfNeeded()
        return true
      }

      return false

    } catch (error) {
      console.error('🔑 [GoogleAuth] Authentication check failed:', error)
      return false
    }
  }
}
