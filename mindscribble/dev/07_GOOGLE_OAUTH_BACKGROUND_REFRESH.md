# Google OAuth Background Token Refresh

## Problem
Current implementation uses timer-based token refresh that only works while the app is active. If users leave the app for more than 1 hour, they need to re-login when returning.

## Current Implementation
- Access tokens expire after 1 hour
- `scheduleTokenRefresh()` in `google-api.ts` sets a timeout to refresh 5 minutes before expiry
- `silentTokenRefresh()` attempts refresh without user interaction
- Timer stops when app is closed/inactive

## Solution: Service Worker for Background Refresh

### Overview
Implement a Service Worker (SW) to handle token refresh in the background, enabling seamless sessions even when the app isn't active. Since MindScribble is a PWA, SWs can run independently of the main app.

### Implementation Steps

#### 1. Create Service Worker (`public/sw.js`)
```javascript
// Register periodic sync if supported, fallback to setInterval
self.addEventListener('install', (event) => {
  console.log('SW installed')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('SW activated')
  // Start periodic token check
  startTokenCheck()
})

function startTokenCheck() {
  // Check every 30 minutes
  setInterval(async () => {
    await checkAndRefreshToken()
  }, 30 * 60 * 1000)
}

async function checkAndRefreshToken() {
  try {
    // Load token expiry from IndexedDB
    const expiry = await getStoredTokenExpiry()
    const now = Date.now()
    const remainingMs = expiry - now

    // Refresh if less than 10 minutes remaining
    if (remainingMs < 10 * 60 * 1000) {
      const success = await refreshTokenInBackground()
      if (!success) {
        console.log('Background refresh failed')
      }
    }
  } catch (error) {
    console.error('Token check failed:', error)
  }
}

async function refreshTokenInBackground() {
  // Fetch to a background endpoint that handles refresh
  const response = await fetch('/api/auth/refresh-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })
  return response.ok
}
```

#### 2. Register Service Worker
Add to `MainLayout.vue` or `App.vue`:
```typescript
import { register } from 'register-service-worker'

if ('serviceWorker' in navigator) {
  register('/sw.js', {
    ready() {
      console.log('SW ready')
    },
    error(error) {
      console.error('SW registration failed:', error)
    }
  })
}
```

#### 3. Background Refresh Endpoint
Create `backgroundTokenRefresh()` in `google-api.ts`:
```typescript
async function backgroundTokenRefresh(): Promise<boolean> {
  // Use stored refresh token if available, otherwise silent refresh
  const refreshToken = await getStoredRefreshToken()

  if (refreshToken) {
    // Use refresh token to get new access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET, // If available
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    })

    if (response.ok) {
      const data = await response.json()
      authStore.updateAccessToken(data.access_token, data.expires_in)
      scheduleTokenRefresh(data.expires_in)
      return true
    }
  }

  // Fallback to silent refresh
  return silentTokenRefresh()
}
```

#### 4. Obtain Refresh Tokens
Modify initial OAuth flow in `google-api.ts`:
```typescript
tokenClient = google.accounts.oauth2.initTokenClient({
  client_id: GOOGLE_CLIENT_ID,
  scope: SCOPES,
  access_type: 'offline', // Request refresh token
  prompt: 'consent',      // Force consent on first login
  callback: (tokenResponse) => {
    // Store refresh token if provided
    if (tokenResponse.refresh_token) {
      storeRefreshToken(tokenResponse.refresh_token)
    }
    // ... rest of callback
  }
})
```

#### 5. Storage Upgrade
- Store refresh tokens in IndexedDB for SW access
- Update `authStore.ts` to handle refresh tokens
- Use IndexedDB instead of localStorage for better SW compatibility

### Benefits
- Seamless sessions without re-login
- Works when app is closed or in background
- Maintains user experience for long sessions

### Considerations
- Test on PWA installs (mobile/desktop)
- SW support varies across browsers
- Handle refresh token revocation
- Fallback to re-login if background refresh fails

### Files to Modify
- `public/sw.js` (new)
- `src/boot/google-api.ts`
- `src/core/stores/authStore.ts`
- `MainLayout.vue` or `App.vue`

### Testing
- Install as PWA
- Leave app inactive for >1 hour
- Return and verify automatic login
- Test on different browsers/devices