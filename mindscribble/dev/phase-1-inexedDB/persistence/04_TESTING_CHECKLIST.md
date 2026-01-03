# Testing Checklist

## Phase 1: Local Persistence Testing

### Test 1.1: No Default File on Fresh Start
**Steps:**
1. Clear IndexedDB (DevTools → Application → IndexedDB → Delete)
2. Clear localStorage (DevTools → Application → Local Storage → Clear All)
3. Reload the app
4. **Expected:** No "Untitled 1" file is created
5. **Expected:** Empty workspace (no file tabs)

**Status:** [ ] Pass [ ] Fail

---

### Test 1.2: Track Open Files
**Steps:**
1. Open a file from vault
2. Open DevTools → Application → IndexedDB → MindPadDB → uiState
3. **Expected:** One record with `id: 'ui-state'`
4. **Expected:** `openFiles` array contains the file ID
5. **Expected:** `activeFileId` is set to the file ID

**Status:** [ ] Pass [ ] Fail

---

### Test 1.3: Track Multiple Open Files
**Steps:**
1. Open 3 files from vault
2. Check IndexedDB → uiState
3. **Expected:** `openFiles` array contains all 3 file IDs
4. **Expected:** `activeFileId` is set to the last opened file

**Status:** [ ] Pass [ ] Fail

---

### Test 1.4: Track File Close
**Steps:**
1. Open 3 files
2. Close one file (click X on tab)
3. Check IndexedDB → uiState
4. **Expected:** `openFiles` array now contains only 2 file IDs
5. **Expected:** Closed file ID is removed

**Status:** [ ] Pass [ ] Fail

---

### Test 1.5: Track Active File Change
**Steps:**
1. Open 3 files
2. Click on different file tabs
3. Check IndexedDB → uiState after each click
4. **Expected:** `activeFileId` updates to the clicked file

**Status:** [ ] Pass [ ] Fail

---

### Test 1.6: Restore Open Files on Reload
**Steps:**
1. Open 3 files
2. Arrange tabs in specific order
3. Reload the app
4. **Expected:** All 3 files are reopened
5. **Expected:** Tabs are in the same order
6. **Expected:** Same file is active

**Status:** [ ] Pass [ ] Fail

---

### Test 1.7: Restore Parent Layout
**Steps:**
1. Open 2 files
2. Drag tabs to rearrange
3. Reload the app
4. **Expected:** Tabs are in the same order as before reload

**Status:** [ ] Pass [ ] Fail

---

### Test 1.8: Empty State After Closing All Files
**Steps:**
1. Open 3 files
2. Close all files (click X on each tab)
3. Reload the app
4. **Expected:** No files are opened
5. **Expected:** Empty workspace

**Status:** [ ] Pass [ ] Fail

---

## Phase 2: IndexedDB Sync Testing

### Test 2.1: Parent Layout in IndexedDB
**Steps:**
1. Open 2 files
2. Rearrange tabs
3. Check IndexedDB → uiState
4. **Expected:** `parentLayout` property exists
5. **Expected:** Contains dockview layout JSON

**Status:** [ ] Pass [ ] Fail

---

### Test 2.2: Child Layout in IndexedDB
**Steps:**
1. Open a file
2. Rearrange views (drag outline/mindmap/writer)
3. Check IndexedDB → fileLayouts
4. **Expected:** One record with `fileId` matching the document ID
5. **Expected:** `layout` property contains dockview layout JSON

**Status:** [ ] Pass [ ] Fail

---

### Test 2.3: Multiple Child Layouts
**Steps:**
1. Open 3 files
2. Rearrange views in each file differently
3. Check IndexedDB → fileLayouts
4. **Expected:** 3 records, one per file
5. **Expected:** Each has different layout

**Status:** [ ] Pass [ ] Fail

---

### Test 2.4: Parent Layout Updates on Change
**Steps:**
1. Open 2 files
2. Check IndexedDB → uiState → parentLayout (note the structure)
3. Drag tabs to rearrange
4. Check IndexedDB → uiState → parentLayout again
5. **Expected:** Layout has changed

**Status:** [ ] Pass [ ] Fail

---

### Test 2.5: Child Layout Updates on Change
**Steps:**
1. Open a file
2. Check IndexedDB → fileLayouts (note the layout)
3. Drag views to rearrange
4. Check IndexedDB → fileLayouts again
5. **Expected:** Layout has changed

**Status:** [ ] Pass [ ] Fail

---

### Test 2.6: Layouts in Both localStorage and IndexedDB
**Steps:**
1. Open a file and rearrange views
2. Check localStorage → `dockview-child-{documentId}-layout`
3. Check IndexedDB → fileLayouts
4. **Expected:** Both have the same layout
5. Rearrange tabs
6. Check localStorage → `dockview-parent-layout`
7. Check IndexedDB → uiState → parentLayout
8. **Expected:** Both have the same layout

**Status:** [ ] Pass [ ] Fail

---

## Phase 3: Google Drive Sync Testing

### Test 3.1: Parent Layout in Repository File
**Steps:**
1. Open files and arrange tabs
2. Trigger sync to Google Drive (save vault)
3. Download `.repository.json` from Google Drive
4. Open in text editor
5. **Expected:** Has `parentLayout` property
6. **Expected:** Contains dockview layout JSON

**Status:** [ ] Pass [ ] Fail

---

### Test 3.2: Child Layout in Document File
**Steps:**
1. Open a file and arrange views
2. Save the file to Google Drive
3. Download the `.mindpad` file from Google Drive
4. Open in text editor
5. **Expected:** Has `dockviewLayout` property
6. **Expected:** Has `dockviewLayoutId` property
7. **Expected:** Contains dockview layout JSON

**Status:** [ ] Pass [ ] Fail

---

### Test 3.3: Load Parent Layout from Google Drive
**Steps:**
1. Open files and arrange tabs
2. Sync to Google Drive
3. Clear IndexedDB and localStorage
4. Load vault from Google Drive
5. **Expected:** Parent layout is restored
6. **Expected:** Tabs are in the same order

**Status:** [ ] Pass [ ] Fail

---

### Test 3.4: Load Child Layout from Google Drive
**Steps:**
1. Open a file and arrange views
2. Save to Google Drive
3. Clear IndexedDB and localStorage
4. Open the file from Google Drive
5. **Expected:** Child layout is restored
6. **Expected:** Views are in the same order

**Status:** [ ] Pass [ ] Fail

---

### Test 3.5: Cross-Device Sync
**Steps:**
1. **Device A:** Open files, arrange tabs and views
2. **Device A:** Sync to Google Drive
3. **Device B:** Clear IndexedDB and localStorage
4. **Device B:** Load vault from Google Drive
5. **Expected:** Same files are open
6. **Expected:** Same tab arrangement
7. **Expected:** Same view arrangement in each file

**Status:** [ ] Pass [ ] Fail

---

## Integration Testing

### Test I.1: Full Workflow
**Steps:**
1. Start with empty vault
2. Create 3 files
3. Arrange tabs in specific order
4. Arrange views in each file differently
5. Sync to Google Drive
6. Clear IndexedDB and localStorage
7. Load vault from Google Drive
8. **Expected:** Everything is restored exactly as it was

**Status:** [ ] Pass [ ] Fail

---

### Test I.2: Vault Switch
**Steps:**
1. **Vault A:** Open files, arrange tabs and views
2. Switch to **Vault B**
3. Open different files, arrange differently
4. Switch back to **Vault A**
5. **Expected:** Vault A's layout is restored
6. Switch to **Vault B** again
7. **Expected:** Vault B's layout is restored

**Status:** [ ] Pass [ ] Fail

---

### Test I.3: Offline Mode
**Steps:**
1. Open files and arrange tabs/views
2. Go offline (disable network)
3. Reload the app
4. **Expected:** Layout is restored from IndexedDB
5. Make changes to layout
6. Go online
7. Sync to Google Drive
8. **Expected:** Changes are synced

**Status:** [ ] Pass [ ] Fail

---

## Edge Cases

### Test E.1: File Deleted from Vault
**Steps:**
1. Open 3 files
2. Delete one file from vault (not just close tab)
3. Reload the app
4. **Expected:** Only 2 files are opened
5. **Expected:** Deleted file is not in open files list

**Status:** [ ] Pass [ ] Fail

---

### Test E.2: File Renamed
**Steps:**
1. Open a file
2. Rename the file
3. Reload the app
4. **Expected:** File is still open with new name
5. **Expected:** Layout is preserved

**Status:** [ ] Pass [ ] Fail

---

### Test E.3: Corrupted Layout Data
**Steps:**
1. Open files and arrange tabs
2. Manually corrupt layout in IndexedDB (set to invalid JSON)
3. Reload the app
4. **Expected:** App doesn't crash
5. **Expected:** Falls back to default layout or empty state

**Status:** [ ] Pass [ ] Fail

---

## Performance Testing

### Test P.1: Large Number of Open Files
**Steps:**
1. Open 10+ files
2. Rearrange tabs
3. Reload the app
4. **Expected:** All files are restored in reasonable time (<3 seconds)
5. **Expected:** No performance issues

**Status:** [ ] Pass [ ] Fail

---

### Test P.2: Complex Layouts
**Steps:**
1. Open a file
2. Create complex view arrangement (split views multiple times)
3. Reload the app
4. **Expected:** Complex layout is restored correctly
5. **Expected:** No visual glitches

**Status:** [ ] Pass [ ] Fail

---

## Console Logs to Watch For

### Expected Logs (Good):
```
💾 [DockviewLayout] Tracked open files: [...]
💾 [UIState] Saved open files: [...]
💾 [DockviewLayout] Saved parent layout to localStorage and IndexedDB
💾 [FilePanel] Saved child layout for doc-123 to localStorage and IndexedDB
🔄 [UnifiedDocumentStore] Restoring UI state...
🔄 [UnifiedDocumentStore] Found open files: [...]
✅ [DockviewLayout] Parent layout restored from localStorage
✅ Document loaded for panel file-1
```

### Error Logs (Bad):
```
❌ Failed to restore UI state
❌ Failed to save layout
❌ Cannot reopen file: no document instance
```

---

## Debugging Tips

### If files don't restore:
1. Check IndexedDB → uiState → openFiles (should have file IDs)
2. Check console for "Restoring UI state" log
3. Check if `restoreUIState()` is being called in boot/sync.ts

### If layouts don't restore:
1. Check localStorage for `dockview-parent-layout` and `dockview-child-*-layout`
2. Check IndexedDB → uiState → parentLayout
3. Check IndexedDB → fileLayouts
4. Check console for "Saved layout" logs

### If Google Drive sync fails:
1. Check network tab for API calls
2. Check `.repository.json` file on Google Drive
3. Check `.mindpad` files on Google Drive
4. Check console for sync errors

