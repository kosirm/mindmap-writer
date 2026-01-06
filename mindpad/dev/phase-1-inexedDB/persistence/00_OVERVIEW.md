# Complete Persistence Implementation - Overview

## Problem Statement

Currently, when the app reloads:
1. ❌ A default "Untitled 1" file is created
2. ❌ Previously opened files are not restored
3. ❌ Parent dockview layout (file tabs arrangement) is not restored from IndexedDB
4. ❌ Child dockview layouts (views within files) are not synced to IndexedDB
5. ❌ Layouts are not synced to Google Drive

**Goal:** When user logs in and opens the app, they see exactly the same state as when they left it:
- Same files open
- Same file tabs arrangement
- Same views arrangement within each file

## Current State Analysis

### What's Working ✅
1. UI state persistence infrastructure exists:
   - `UIStateService` with methods for saving/loading open files and layouts
   - `uiState` table in IndexedDB (stores open files list)
   - `fileLayouts` table in IndexedDB (stores child layouts per file)
2. Parent dockview layout saves to localStorage (`dockview-parent-layout`)
3. Child dockview layouts save to localStorage per file (`dockview-child-{documentId}-layout`)
4. `restoreUIState()` is called in `boot/sync.ts` but doesn't restore parent layout

### What's Missing ❌
1. Default "Untitled 1" file is created on startup (`DockviewLayout.vue` line 65)
2. Parent layout is not restored from IndexedDB
3. Open files are not tracked/saved to IndexedDB when files are opened/closed
4. Files are not reopened on app reload
5. Child layouts are not synced from localStorage to IndexedDB
6. Layouts are not synced to Google Drive

## Implementation Phases

### **Phase 1: Local Persistence (IndexedDB + localStorage)**
Make the app restore exactly as the user left it using IndexedDB.

**Steps:**
1. Remove default "Untitled 1" file creation
2. Track open files and save to IndexedDB
3. Restore parent layout and open files on app start
4. Test local persistence

### **Phase 2: Sync Child Layouts to IndexedDB**
Copy child layouts from localStorage to IndexedDB on layout changes.

**Steps:**
1. Sync child layouts from localStorage to IndexedDB on change
2. Add parent layout to UIStateService
3. Test IndexedDB sync

### **Phase 3: Sync to Google Drive**
Add parent layout to `.repository.json` and child layouts to file documents.

**Steps:**
1. Add parent layout to `.repository.json` structure
2. Add child layouts to file documents when syncing
3. Restore layouts from Google Drive on vault load
4. Test Google Drive sync

## File Structure

```
mindscribble/dev/phase-1-inexedDB/persistence/
├── 00_OVERVIEW.md (this file)
├── 01_PHASE_1_LOCAL_PERSISTENCE.md
├── 02_PHASE_2_INDEXEDDB_SYNC.md
├── 03_PHASE_3_GOOGLE_DRIVE_SYNC.md
└── 04_TESTING_CHECKLIST.md
```

## Key Files to Modify

1. **DockviewLayout.vue** - Parent dockview, file tabs
2. **FilePanel.vue** - Child dockview, views within files
3. **uiStateService.ts** - UI state persistence service
4. **unifiedDocumentStore.ts** - Document store with restoreUIState()
5. **googleDriveInitialization.ts** - Google Drive sync
6. **indexedDBService.ts** - IndexedDB schema (if needed)

## Next Steps

Start with **Phase 1** by reading `01_PHASE_1_LOCAL_PERSISTENCE.md`

