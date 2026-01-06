# Phase 1: Local Persistence (IndexedDB + localStorage)

## Goal
Make the app restore exactly as the user left it using IndexedDB and localStorage.

## Prerequisites
- IndexedDB schema already has `uiState` and `fileLayouts` tables ✅
- `UIStateService` already exists ✅
- `restoreUIState()` is called in boot/sync.ts ✅

---

## Step 1: Remove Default "Untitled 1" File Creation

**File:** `mindscribble/quasar/src/layouts/DockviewLayout.vue`

**Current behavior:** Lines 54-58 create a default file if no layout is loaded.

**Change:**
```typescript
// BEFORE (lines 54-58):
const loaded = loadParentLayoutFromStorage()
if (!loaded) {
  createDefaultLayout()
}

// AFTER:
const loaded = loadParentLayoutFromStorage()
// Don't create default layout - let restoreUIState handle it
```

**Why:** We want to restore from IndexedDB, not create a default file.

---

## Step 2: Track Open Files When Files Are Opened

**File:** `mindscribble/quasar/src/layouts/DockviewLayout.vue`

**Add tracking to these functions:**

### 2.1 Track when file is opened from Google Drive
**Function:** `openDriveFile()` (around line 120)

**Add after line 152:**
```typescript
// After: dockviewApi.value.addPanel({ ... })

// Track open files
await trackOpenFiles()
```

### 2.2 Track when file is opened from vault
**Function:** `openVaultFile()` (around line 180)

**Add after line 214:**
```typescript
// After: dockviewApi.value.addPanel({ ... })

// Track open files
await trackOpenFiles()
```

### 2.3 Create helper function to track open files
**Add new function in DockviewLayout.vue:**

```typescript
/**
 * Track currently open files in IndexedDB
 */
async function trackOpenFiles() {
  if (!dockviewApi.value) return

  const panels = dockviewApi.value.panels
  const fileIds = panels.map(panel => panel.id)
  const activeFileId = dockviewApi.value.activePanel?.id || null

  await UIStateService.saveOpenFiles(fileIds, activeFileId)
  console.log('💾 [DockviewLayout] Tracked open files:', fileIds)
}
```

**Import UIStateService at top:**
```typescript
import { UIStateService } from 'src/core/services/uiStateService'
```

---

## Step 3: Track When Files Are Closed

**File:** `mindscribble/quasar/src/layouts/DockviewLayout.vue`

**Add to `onReady()` function (around line 36):**

```typescript
function onReady(event: { api: DockviewApi }) {
  dockviewApi.value = event.api

  // ... existing code ...

  // Track when panels are closed
  dockviewApi.value.onDidRemovePanel(() => {
    trackOpenFiles()
  })

  // Track when active panel changes
  dockviewApi.value.onDidActivePanelChange(() => {
    trackOpenFiles()
  })

  // ... rest of existing code ...
}
```

---

## Step 4: Enhance restoreUIState() to Restore Parent Layout and Open Files

**File:** `mindscribble/quasar/src/core/stores/unifiedDocumentStore.ts`

**Current:** `restoreUIState()` loads files but doesn't restore parent layout or reopen them in dockview.

**Find:** `restoreUIState()` function (around line 1434)

**Replace entire function with:**

```typescript
/**
 * Restore UI state on app start (open files and layouts)
 */
async function restoreUIState() {
  try {
    console.log('🔄 [UnifiedDocumentStore] Restoring UI state...')

    // Get open files from IndexedDB
    const { fileIds, activeFileId } = await UIStateService.getOpenFiles()
    console.log('🔄 [UnifiedDocumentStore] Found open files:', fileIds)

    // If no files were open, we're done (no default file)
    if (fileIds.length === 0) {
      console.log('🔄 [UnifiedDocumentStore] No files to restore')
      return
    }

    // Emit event to restore parent layout and open files
    // DockviewLayout will listen to this event
    eventBus.emit('restore-ui-state', { fileIds, activeFileId })

  } catch (error) {
    console.error('🔄 [UnifiedDocumentStore] Failed to restore UI state:', error)
  }
}
```

**Import eventBus at top if not already imported:**
```typescript
import { eventBus } from 'src/core/events'
```

---

## Step 5: Add Event to events.ts

**File:** `mindscribble/quasar/src/core/events.ts`

**Add new event type:**

```typescript
export interface RestoreUIStatePayload {
  fileIds: string[]
  activeFileId: string | null
}

// Add to EventMap interface:
export interface EventMap {
  // ... existing events ...
  'restore-ui-state': RestoreUIStatePayload
}
```

---

## Step 6: Listen to restore-ui-state Event in DockviewLayout

**File:** `mindscribble/quasar/src/layouts/DockviewLayout.vue`

**Add to `onReady()` function:**

```typescript
function onReady(event: { api: DockviewApi }) {
  dockviewApi.value = event.api

  // ... existing code ...

  // Listen for UI state restoration
  eventBus.on('restore-ui-state', handleRestoreUIState)

  // ... rest of existing code ...
}
```

**Add cleanup in `onUnmounted()`:**

```typescript
onUnmounted(() => {
  eventBus.off('restore-ui-state', handleRestoreUIState)
})
```

**Add new handler function:**

```typescript
/**
 * Handle UI state restoration from IndexedDB
 */
async function handleRestoreUIState(payload: RestoreUIStatePayload) {
  if (!dockviewApi.value) return

  console.log('🔄 [DockviewLayout] Restoring UI state:', payload)

  // First, restore parent layout from localStorage
  const layoutRestored = loadParentLayoutFromStorage()
  
  if (layoutRestored) {
    console.log('✅ [DockviewLayout] Parent layout restored from localStorage')
    // Parent layout was restored, panels should be recreated
    // Now we need to load documents for each panel
    for (const fileId of payload.fileIds) {
      await loadDocumentForPanel(fileId)
    }
  } else {
    // No saved parent layout, open files manually
    console.log('📂 [DockviewLayout] No parent layout, opening files manually')
    for (const fileId of payload.fileIds) {
      await reopenFile(fileId)
    }
  }

  // Set active panel
  if (payload.activeFileId) {
    const panel = dockviewApi.value.getPanel(payload.activeFileId)
    if (panel) {
      dockviewApi.value.activePanel = panel
    }
  }
}
```

---

## Step 7: Add Helper Functions

**File:** `mindscribble/quasar/src/layouts/DockviewLayout.vue`

**Add these helper functions:**

```typescript
/**
 * Load document for an existing panel (after parent layout restoration)
 */
async function loadDocumentForPanel(filePanelId: string) {
  // Get document instance from unified store
  const docInstance = unifiedStore.getDocumentInstance(filePanelId)
  if (!docInstance) {
    console.warn(`No document instance found for panel ${filePanelId}`)
    return
  }

  // Document is already loaded in store, just ensure panel is synced
  console.log(`✅ Document loaded for panel ${filePanelId}`)
}

/**
 * Reopen a file by its panel ID (when no parent layout exists)
 */
async function reopenFile(filePanelId: string) {
  // Get document from unified store
  const docInstance = unifiedStore.getDocumentInstance(filePanelId)
  if (!docInstance) {
    console.warn(`Cannot reopen file: no document instance for ${filePanelId}`)
    return
  }

  const document = docInstance.document
  const fileName = document.metadata.name

  // Add panel to dockview
  dockviewApi.value?.addPanel({
    id: filePanelId,
    component: 'file-panel',
    title: fileName,
    tabComponent: 'file-tab'
  })

  console.log(`✅ Reopened file "${fileName}" in panel ${filePanelId}`)
}
```

---

## Step 8: Import RestoreUIStatePayload Type

**File:** `mindscribble/quasar/src/layouts/DockviewLayout.vue`

**Add to imports:**
```typescript
import { eventBus, type RestoreUIStatePayload } from 'src/core/events'
```

---

## Testing Phase 1

See `04_TESTING_CHECKLIST.md` for Phase 1 testing steps.

**Expected behavior after Phase 1:**
1. ✅ No "Untitled 1" file on fresh start
2. ✅ Open files are tracked in IndexedDB
3. ✅ On reload, previously open files are restored
4. ✅ Parent layout (file tabs arrangement) is restored
5. ✅ Active file is restored

---

## Next Steps

After Phase 1 is complete and tested, proceed to **Phase 2** (`02_PHASE_2_INDEXEDDB_SYNC.md`)

