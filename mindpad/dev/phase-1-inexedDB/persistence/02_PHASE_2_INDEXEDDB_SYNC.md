# Phase 2: Sync Layouts to IndexedDB

## Goal
Copy dockview layouts from localStorage to IndexedDB so they can be synced to Google Drive later.

## Prerequisites
- Phase 1 is complete and tested ✅
- Files are being tracked in IndexedDB ✅
- Parent and child layouts are saving to localStorage ✅

---

## Step 1: Add Parent Layout to UIStateService

**File:** `mindscribble/quasar/src/core/services/uiStateService.ts`

**Current:** UIStateService only handles open files and child layouts.

**Add these methods:**

```typescript
/**
 * Save parent dockview layout (file tabs arrangement)
 */
static async saveParentLayout(layout: unknown): Promise<void> {
  const uiState = await db.uiState.get('ui-state')
  
  const updatedState: UIState = {
    id: 'ui-state',
    openFiles: uiState?.openFiles || [],
    activeFileId: uiState?.activeFileId || null,
    parentLayout: layout, // NEW
    lastUpdated: Date.now()
  }
  
  await db.uiState.put(updatedState)
  console.log('💾 [UIState] Saved parent layout to IndexedDB')
}

/**
 * Get parent dockview layout
 */
static async getParentLayout(): Promise<Record<string, unknown> | null> {
  const uiState = await db.uiState.get('ui-state')
  return (uiState?.parentLayout as Record<string, unknown>) || null
}
```

---

## Step 2: Update UIState Interface

**File:** `mindscribble/quasar/src/core/services/indexedDBService.ts`

**Find:** `UIState` interface (around line 12)

**Update:**
```typescript
export interface UIState {
  id: string // 'ui-state'
  openFiles: string[] // Array of file IDs that are open
  activeFileId: string | null // Currently active file
  parentLayout?: unknown // NEW: Parent dockview layout
  lastUpdated: number
}
```

---

## Step 3: Sync Parent Layout from localStorage to IndexedDB

**File:** `mindscribble/quasar/src/layouts/DockviewLayout.vue`

**Find:** `saveParentLayoutToStorage()` function (around line 222)

**Update:**
```typescript
async function saveParentLayoutToStorage() {
  if (!dockviewApi.value) return

  const layout = dockviewApi.value.toJSON()
  
  // Save to localStorage (for quick restore)
  localStorage.setItem('dockview-parent-layout', JSON.stringify(layout))
  
  // NEW: Also save to IndexedDB (for Google Drive sync)
  await UIStateService.saveParentLayout(layout)
  
  console.log('💾 [DockviewLayout] Saved parent layout to localStorage and IndexedDB')
}
```

**Make sure function is async** (add `async` keyword if not present)

---

## Step 4: Sync Child Layouts from localStorage to IndexedDB

**File:** `mindscribble/quasar/src/pages/components/FilePanel.vue`

**Find:** `saveChildLayoutToStorage()` function (around line 250)

**Current implementation:**
```typescript
function saveChildLayoutToStorage(documentId: string) {
  if (!childDockviewApi.value) return

  const layout = childDockviewApi.value.toJSON()
  const storageKey = `dockview-child-${documentId}-layout`
  localStorage.setItem(storageKey, JSON.stringify(layout))
}
```

**Update to:**
```typescript
async function saveChildLayoutToStorage(documentId: string) {
  if (!childDockviewApi.value) return

  const layout = childDockviewApi.value.toJSON()
  const storageKey = `dockview-child-${documentId}-layout`
  
  // Save to localStorage (for quick restore)
  localStorage.setItem(storageKey, JSON.stringify(layout))
  
  // NEW: Also save to IndexedDB (for Google Drive sync)
  await UIStateService.saveFileLayout(documentId, layout)
  
  console.log(`💾 [FilePanel] Saved child layout for ${documentId} to localStorage and IndexedDB`)
}
```

**Import UIStateService at top:**
```typescript
import { UIStateService } from 'src/core/services/uiStateService'
```

---

## Step 5: Update Calls to saveChildLayoutToStorage

**File:** `mindscribble/quasar/src/pages/components/FilePanel.vue`

**Find:** All calls to `saveChildLayoutToStorage()` and make them `await`

**Around line 138:**
```typescript
// BEFORE:
saveChildLayoutToStorage(documentId)

// AFTER:
await saveChildLayoutToStorage(documentId)
```

**Note:** This is inside `onDidLayoutChange` callback, so you may need to make the callback async:

```typescript
childDockviewApi.value?.onDidLayoutChange(async () => {
  // ... existing code ...
  
  const docInstance = unifiedStore.getDocumentInstance(filePanelId.value)
  if (docInstance) {
    const documentId = docInstance.document.dockviewLayoutId || docInstance.document.metadata.id
    await saveChildLayoutToStorage(documentId) // Now with await
  }
})
```

---

## Step 6: Verify IndexedDB Schema Version

**File:** `mindscribble/quasar/src/core/services/indexedDBService.ts`

**Check:** Make sure `uiState` and `fileLayouts` tables are in the schema.

**Around line 206-210:**
```typescript
// Version 6 - Add UI state persistence
this.version(6).stores({
  // ... existing stores ...
  uiState: 'id',
  fileLayouts: 'fileId'
})
```

**If not present, add it.** If already present, you're good! ✅

---

## Step 7: Test IndexedDB Sync

### Manual Testing

1. **Open DevTools** → Application → IndexedDB → MindPadDB

2. **Open some files** in the app

3. **Check `uiState` table:**
   - Should have one record with `id: 'ui-state'`
   - Should have `openFiles` array
   - Should have `activeFileId`
   - Should have `parentLayout` object (NEW)

4. **Check `fileLayouts` table:**
   - Should have one record per open file
   - Each record should have `fileId` and `layout` object

5. **Rearrange file tabs** (drag and drop)
   - Check that `uiState.parentLayout` updates in IndexedDB

6. **Rearrange views within a file** (drag and drop)
   - Check that corresponding record in `fileLayouts` updates

### Expected Console Logs

```
💾 [DockviewLayout] Saved parent layout to localStorage and IndexedDB
💾 [FilePanel] Saved child layout for doc-123 to localStorage and IndexedDB
💾 [UIState] Saved parent layout to IndexedDB
💾 [UIState] Saved layout for file: doc-123
```

---

## Step 8: Verify Restoration Still Works

**Test:**
1. Open some files
2. Rearrange tabs and views
3. Reload the app
4. Verify everything is restored correctly

**Why:** We want to make sure our changes didn't break Phase 1 functionality.

---

## Summary of Changes

### Files Modified:
1. ✅ `uiStateService.ts` - Added parent layout methods
2. ✅ `indexedDBService.ts` - Updated UIState interface
3. ✅ `DockviewLayout.vue` - Sync parent layout to IndexedDB
4. ✅ `FilePanel.vue` - Sync child layouts to IndexedDB

### What's Now in IndexedDB:
1. ✅ Open files list (`uiState.openFiles`)
2. ✅ Active file ID (`uiState.activeFileId`)
3. ✅ Parent layout (`uiState.parentLayout`) - **NEW**
4. ✅ Child layouts per file (`fileLayouts` table) - **ENHANCED**

---

## Next Steps

After Phase 2 is complete and tested, proceed to **Phase 3** (`03_PHASE_3_GOOGLE_DRIVE_SYNC.md`)

