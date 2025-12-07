/**
 * Google Identity Services (GIS) TypeScript declarations
 *
 * These types cover the OAuth 2.0 token client used for Google Drive access.
 * See: https://developers.google.com/identity/oauth2/web/reference/js-reference
 */

export interface TokenClientConfig {
  client_id: string
  scope: string
  callback: (tokenResponse: TokenResponse) => void
  error_callback?: (error: ErrorResponse) => void
  prompt?: string
  hint?: string
  hosted_domain?: string
  state?: string
}

export interface TokenResponse {
  access_token: string
  expires_in: number
  scope: string
  token_type: string
  error?: string
  error_description?: string
  error_uri?: string
}

export interface ErrorResponse {
  type: string
  message: string
}

export interface TokenClient {
  requestAccessToken(config?: { prompt?: string; hint?: string }): void
}

export interface GoogleAccountsOAuth2 {
  initTokenClient(config: TokenClientConfig): TokenClient
  revoke(token: string, callback?: () => void): void
  hasGrantedAllScopes(tokenResponse: TokenResponse, ...scopes: string[]): boolean
  hasGrantedAnyScope(tokenResponse: TokenResponse, ...scopes: string[]): boolean
}

export interface GoogleAccounts {
  oauth2: GoogleAccountsOAuth2
}

export interface Google {
  accounts: GoogleAccounts
}

// Extend the global scope
declare global {
  const google: Google
}

