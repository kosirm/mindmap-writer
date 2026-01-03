# Phase 3: Sync Layouts to Google Drive

## Goal
Sync dockview layouts to Google Drive so they persist across devices and vault switches.

## Strategy

### Parent Layout (File Tabs)
- Store in `.repository.json` file on Google Drive
- One parent layout per vault
- Synced when vault is saved/loaded

### Child Layouts (Views within Files)
- Store in each `.mindpad` file's `dockviewLayout` property
- One child layout per file
- Synced when file is saved/loaded

---

## Step 1: Update Repository Interface

**File:** `mindscribble/quasar/src/core/services/indexedDBService.ts`

**Find:** `Repository` interface (around line 118)

**Update:**
```typescript
export interface Repository {
  repositoryId: string;
  name: string;
  version: string;
  lastUpdated: number;
  files: Record<string, RepositoryFile>;
  folders: Record<string, RepositoryFolder>;
  deletedFiles: string[];
  deletedFolders: string[];
  parentLayout?: unknown; // NEW: Parent dockview layout
  syncSettings?: {
    conflictResolution: 'server' | 'local' | 'ask';
    lastSynced: number;
  };
}
```

---

## Step 2: Sync Parent Layout to Repository on Save

**File:** `mindscribble/quasar/src/core/services/googleDriveInitialization.ts`

**Find:** Function that saves `.repository.json` to Google Drive

**Note:** You'll need to identify where repository is saved. Look for:
- `createRepositoryFile()` or similar
- Functions that update `.repository.json`

**Add parent layout to repository before saving:**

```typescript
// When creating/updating repository object:
const repository: Repository = {
  repositoryId: vaultId,
  name: vaultName,
  version: '1.0',
  lastUpdated: Date.now(),
  files: { /* ... */ },
  folders: { /* ... */ },
  deletedFiles: [],
  deletedFolders: [],
  parentLayout: await UIStateService.getParentLayout(), // NEW
  syncSettings: { /* ... */ }
}

// Then save to Google Drive
await GoogleDriveService.updateFile(repositoryFileId, JSON.stringify(repository))
```

**Import UIStateService:**
```typescript
import { UIStateService } from './uiStateService'
```

---

## Step 3: Load Parent Layout from Repository

**File:** `mindscribble/quasar/src/core/services/googleDriveInitialization.ts`

**Find:** Function that loads `.repository.json` from Google Drive

**After loading repository, save parent layout to IndexedDB:**

```typescript
// After loading repository from Google Drive:
const repository: Repository = JSON.parse(repositoryContent)

// Save parent layout to IndexedDB
if (repository.parentLayout) {
  await UIStateService.saveParentLayout(repository.parentLayout)
  console.log('✅ [GoogleDrive] Loaded parent layout from repository')
}

// Also save to localStorage for quick restore
if (repository.parentLayout) {
  localStorage.setItem('dockview-parent-layout', JSON.stringify(repository.parentLayout))
}
```

---

## Step 4: Sync Child Layout to File Document on Save

**File:** `mindscribble/quasar/src/core/stores/unifiedDocumentStore.ts`

**Find:** Function that saves document (look for `saveDocument` or similar)

**Before saving document, add child layout from IndexedDB:**

```typescript
async function saveDocument(documentId: string) {
  // Get document
  const document = getDocument(documentId)
  if (!document) return

  // NEW: Get child layout from IndexedDB
  const childLayout = await UIStateService.getFileLayout(documentId)
  if (childLayout) {
    document.dockviewLayout = childLayout
    document.dockviewLayoutId = documentId
    console.log(`💾 [UnifiedDocumentStore] Added child layout to document ${documentId}`)
  }

  // Save document to Google Drive or IndexedDB
  // ... existing save logic ...
}
```

**Import UIStateService if not already imported:**
```typescript
import { UIStateService } from '../services/uiStateService'
```

---

## Step 5: Load Child Layout from File Document

**File:** `mindscribble/quasar/src/layouts/DockviewLayout.vue`

**Find:** `openDriveFile()` function (around line 120)

**Current code (around line 136-140):**
```typescript
// If document has a saved layout, save it to localStorage using document ID
if (document.dockviewLayout) {
  const storageKey = `dockview-child-${documentId}-layout`
  localStorage.setItem(storageKey, JSON.stringify(document.dockviewLayout))
  console.log(`✅ Saved layout to localStorage: ${storageKey}`)
}
```

**Update to also save to IndexedDB:**
```typescript
// If document has a saved layout, save it to localStorage and IndexedDB
if (document.dockviewLayout) {
  const storageKey = `dockview-child-${documentId}-layout`
  
  // Save to localStorage (for quick restore)
  localStorage.setItem(storageKey, JSON.stringify(document.dockviewLayout))
  
  // NEW: Save to IndexedDB (for sync)
  await UIStateService.saveFileLayout(documentId, document.dockviewLayout)
  
  console.log(`✅ Saved layout to localStorage and IndexedDB: ${storageKey}`)
}
```

**Make function async if not already:**
```typescript
async function openDriveFile(driveFile: DriveFileMetadata) {
  // ... existing code ...
}
```

---

## Step 6: Do the Same for Vault Files

**File:** `mindscribble/quasar/src/layouts/DockviewLayout.vue`

**Find:** `openVaultFile()` function (around line 180)

**Add similar logic to load child layout from document:**

```typescript
async function openVaultFile(fileSystemItemId: string) {
  try {
    // ... existing code to load document ...

    const documentId = document.metadata.id

    // NEW: If document has a saved layout, save it to localStorage and IndexedDB
    if (document.dockviewLayout) {
      const storageKey = `dockview-child-${documentId}-layout`
      
      // Save to localStorage (for quick restore)
      localStorage.setItem(storageKey, JSON.stringify(document.dockviewLayout))
      
      // Save to IndexedDB (for sync)
      await UIStateService.saveFileLayout(documentId, document.dockviewLayout)
      
      console.log(`✅ Saved layout to localStorage and IndexedDB: ${storageKey}`)
    }

    // ... rest of existing code ...
  } catch (error) {
    console.error(`Failed to open vault file ${fileSystemItemId}:`, error)
  }
}
```

---

## Step 7: Identify Where Repository is Saved

**Action Required:** You need to find where `.repository.json` is created/updated.

**Search for:**
1. `createRepositoryFile`
2. `updateRepositoryFile`
3. `.repository.json`
4. Functions that sync vault to Google Drive

**Likely locations:**
- `googleDriveInitialization.ts`
- `googleDriveService.ts`
- Sync strategy files

**Once found, apply Step 2 changes there.**

---

## Step 8: Test Google Drive Sync

### Test Scenario 1: Parent Layout Sync

1. **Open some files** and arrange tabs
2. **Trigger sync** to Google Drive (save vault)
3. **Check `.repository.json`** on Google Drive:
   - Should have `parentLayout` property
   - Should contain dockview layout JSON
4. **Clear IndexedDB** and localStorage
5. **Load vault** from Google Drive
6. **Verify** parent layout is restored

### Test Scenario 2: Child Layout Sync

1. **Open a file** and arrange views
2. **Save the file** to Google Drive
3. **Check the `.mindpad` file** on Google Drive:
   - Should have `dockviewLayout` property
   - Should have `dockviewLayoutId` property
4. **Clear IndexedDB** and localStorage
5. **Open the file** from Google Drive
6. **Verify** child layout is restored

### Test Scenario 3: Cross-Device Sync

1. **Device A:** Open files, arrange tabs and views
2. **Device A:** Sync to Google Drive
3. **Device B:** Load vault from Google Drive
4. **Device B:** Verify same layout appears

---

## Step 9: Handle Layout Translation (Optional Enhancement)

**Current:** Layouts are stored as-is from dockview.

**Enhancement:** Translate to shorter property names for smaller file size.

**File:** Create `mindscribble/quasar/src/core/utils/layoutTranslator.ts`

```typescript
/**
 * Translate dockview layout to compact format for storage
 */
export function compactLayout(layout: Record<string, unknown>): Record<string, unknown> {
  // Implement property name shortening
  // Example: 'orientation' -> 'o', 'panels' -> 'p', etc.
  return layout // For now, return as-is
}

/**
 * Translate compact layout back to dockview format
 */
export function expandLayout(layout: Record<string, unknown>): Record<string, unknown> {
  // Implement property name expansion
  return layout // For now, return as-is
}
```

**Note:** This is optional and can be done later for optimization.

---

## Summary of Changes

### Files Modified:
1. ✅ `indexedDBService.ts` - Updated Repository interface
2. ✅ `googleDriveInitialization.ts` - Sync parent layout to/from repository
3. ✅ `unifiedDocumentStore.ts` - Sync child layout to document on save
4. ✅ `DockviewLayout.vue` - Load child layout from document

### What's Now Synced to Google Drive:
1. ✅ Parent layout in `.repository.json`
2. ✅ Child layouts in each `.mindpad` file

---

## Next Steps

After Phase 3 is complete and tested, see **Testing Checklist** (`04_TESTING_CHECKLIST.md`)

