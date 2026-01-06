# Sync Strategy Guide

## 🎯 Overview

The sync strategy system provides **environment-aware syncing** that automatically chooses the best sync method based on the runtime environment:

- **Development Mode**: Direct async functions (no service worker needed)
- **Production with HTTPS**: Service Worker with Background Sync API
- **Fallback**: Polling strategy for unsupported environments

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  (Components, Stores, Services)                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Sync Strategy Interface                     │
│  - syncVault(vaultId)                                        │
│  - syncFile(vaultId, fileId)                                 │
│  - syncAll()                                                 │
│  - getStatus()                                               │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Direct    │  │   Service   │  │   Polling   │
│   Async     │  │   Worker    │  │   Strategy  │
│  Strategy   │  │   Strategy  │  │             │
│             │  │             │  │             │
│ (Dev Mode)  │  │ (Production)│  │ (Fallback)  │
└─────────────┘  └─────────────┘  └─────────────┘
```

## 🚀 Usage

### 1. Initialize Sync Strategy (Boot File)

Create or update `src/boot/sync.ts`:

```typescript
import { boot } from 'quasar/wrappers'
import { initializeSyncStrategy } from 'src/core/services/syncStrategy'

export default boot(async () => {
  console.log('🔄 [Boot] Initializing sync strategy...')
  
  try {
    const syncStrategy = initializeSyncStrategy()
    
    // Log which strategy is being used
    const status = await syncStrategy.getStatus()
    console.log(`🔄 [Boot] Using sync strategy: ${status.strategy}`)
    
  } catch (error) {
    console.error('🔄 [Boot] Failed to initialize sync strategy:', error)
  }
})
```

Register in `quasar.config.ts`:

```typescript
boot: [
  'indexedDB',
  'google-api',
  'sync', // Add this
  // ... other boot files
]
```

### 2. Use in Components

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getSyncStrategyInstance } from 'src/core/services/syncStrategy'
import type { SyncStatus } from 'src/core/services/syncStrategy'

const syncStatus = ref<SyncStatus | null>(null)
const isSyncing = ref(false)

onMounted(async () => {
  // Get sync status
  const syncStrategy = getSyncStrategyInstance()
  syncStatus.value = await syncStrategy.getStatus()
})

async function syncCurrentVault() {
  try {
    isSyncing.value = true
    
    const syncStrategy = getSyncStrategyInstance()
    const result = await syncStrategy.syncVault('vault-id-here')
    
    if (result.success) {
      console.log(`✅ Synced ${result.syncedFiles} files`)
    } else {
      console.error('❌ Sync failed:', result.errors)
    }
  } catch (error) {
    console.error('❌ Sync error:', error)
  } finally {
    isSyncing.value = false
  }
}

async function syncAll() {
  const syncStrategy = getSyncStrategyInstance()
  const result = await syncStrategy.syncAll()
  console.log('Sync result:', result)
}
</script>

<template>
  <div>
    <q-btn 
      label="Sync Vault" 
      @click="syncCurrentVault"
      :loading="isSyncing"
    />
    
    <div v-if="syncStatus">
      <p>Strategy: {{ syncStatus.strategy }}</p>
      <p>Online: {{ syncStatus.isOnline }}</p>
      <p>Last Sync: {{ syncStatus.lastSyncTime }}</p>
    </div>
  </div>
</template>
```

### 3. Use in Services

```typescript
import { getSyncStrategyInstance } from 'src/core/services/syncStrategy'

export class FileSystemService {
  async createFile(vaultId: string, name: string, content: any) {
    // Create file in IndexedDB
    const file = await db.fileSystem.add({
      id: generateId(),
      vaultId,
      name,
      type: 'file',
      created: Date.now(),
      modified: Date.now()
    })
    
    // Trigger sync
    const syncStrategy = getSyncStrategyInstance()
    void syncStrategy.syncFile(vaultId, file.id)
    
    return file
  }
}
```

## 🔧 Strategy Details

### Direct Async Strategy (Development)

**When Used:**
- `import.meta.env.DEV === true`
- Development mode

**Features:**
- No service worker required
- Direct async function calls
- Auto-sync every 5 minutes
- Immediate feedback
- Easy debugging

**Advantages:**
- ✅ Works without HTTPS
- ✅ No service worker complexity
- ✅ Easy to debug with console logs
- ✅ Fast iteration during development

**Disadvantages:**
- ❌ No offline sync
- ❌ Sync stops when tab is closed
- ❌ No background sync

### Service Worker Strategy (Production)

**When Used:**
- `import.meta.env.DEV === false`
- Service Worker API available
- HTTPS connection

**Features:**
- Background Sync API
- Offline sync queue
- Reliable sync even when app is closed
- Retry failed syncs automatically

**Advantages:**
- ✅ Works offline
- ✅ Background sync
- ✅ Automatic retry
- ✅ Battery efficient

**Disadvantages:**
- ❌ Requires HTTPS
- ❌ More complex debugging
- ❌ Service worker lifecycle management

### Polling Strategy (Fallback)

**When Used:**
- Service Worker not available
- HTTP (not HTTPS)
- Older browsers

**Features:**
- Periodic polling every 10 minutes
- Simple implementation
- Works everywhere

**Advantages:**
- ✅ Works in all environments
- ✅ Simple and reliable
- ✅ No special requirements

**Disadvantages:**
- ❌ Less efficient (polls even when no changes)
- ❌ No offline support
- ❌ Longer sync intervals

## 🧪 Testing

### Test in Development

```bash
# Start dev server
npm run dev

# Check console for:
# "🔄 [Sync] Using Direct Async strategy (Development mode)"
```

### Test in Production

```bash
# Build for production
npm run build

# Serve with HTTPS (required for service worker)
npx serve dist/spa -s --ssl-cert cert.pem --ssl-key key.pem

# Or use Quasar PWA mode
quasar build -m pwa
npx serve dist/pwa -s
```

### Test Sync Manually

```typescript
// In browser console
const syncStrategy = window.__SYNC_STRATEGY__ // Expose for debugging
const result = await syncStrategy.syncAll()
console.log(result)
```

## 📊 Monitoring

### Check Sync Status

```typescript
const syncStrategy = getSyncStrategyInstance()
const status = await syncStrategy.getStatus()

console.log({
  strategy: status.strategy,        // 'direct' | 'service-worker' | 'polling'
  isOnline: status.isOnline,        // Network status
  isSyncing: status.isSyncing,      // Currently syncing?
  lastSyncTime: status.lastSyncTime, // Last successful sync
  pendingChanges: status.pendingChanges // Number of pending changes
})
```

### Add Sync Indicator to UI

```vue
<template>
  <q-badge 
    v-if="syncStatus"
    :color="syncStatus.isSyncing ? 'orange' : 'green'"
    :label="syncStatus.isSyncing ? 'Syncing...' : 'Synced'"
  />
</template>
```

## 🎯 Best Practices

1. **Always initialize in boot file** - Ensures sync is ready before app starts
2. **Use getSyncStrategyInstance()** - Don't create new instances
3. **Handle errors gracefully** - Sync can fail due to network issues
4. **Show sync status to users** - Let them know when data is syncing
5. **Test in both dev and production** - Behavior differs between strategies
6. **Don't block UI on sync** - Use `void syncStrategy.syncVault()` for fire-and-forget

## 🔮 Future Enhancements

- [ ] Conflict resolution UI
- [ ] Selective sync (only changed files)
- [ ] Sync progress tracking
- [ ] Bandwidth optimization
- [ ] Sync queue management
- [ ] Manual sync trigger
- [ ] Sync history/logs

