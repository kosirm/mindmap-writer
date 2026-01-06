# Implementation Notes and Considerations

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         User Actions                         │
│  (Open file, Close file, Rearrange tabs, Rearrange views)  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    DockviewLayout.vue                        │
│                    FilePanel.vue                             │
│  - Track open files                                          │
│  - Save layouts to localStorage (fast restore)               │
│  - Save layouts to IndexedDB (for sync)                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    UIStateService                            │
│  - saveOpenFiles(fileIds, activeFileId)                      │
│  - saveParentLayout(layout)                                  │
│  - saveFileLayout(fileId, layout)                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      IndexedDB                               │
│  - uiState table (open files + parent layout)                │
│  - fileLayouts table (child layouts per file)                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Google Drive Sync                          │
│  - Parent layout → .repository.json                          │
│  - Child layouts → .mindpad files                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

### 1. Dual Storage: localStorage + IndexedDB

**Why both?**
- **localStorage:** Fast synchronous access for immediate restore on app load
- **IndexedDB:** Structured storage for sync to Google Drive

**Trade-off:** Slight redundancy, but ensures fast UX and reliable sync.

---

### 2. Parent Layout in .repository.json

**Why?**
- Repository file is vault-level metadata
- Parent layout is vault-level (which files are open)
- Natural fit for this data

**Alternative considered:** Separate `.layout.json` file
- **Rejected:** More files to manage, more API calls

---

### 3. Child Layouts in .mindpad Files

**Why?**
- Each file has its own view arrangement
- Layout is part of the document's state
- Already have `dockviewLayout` property in document type

**Alternative considered:** Separate `.layout.json` per file
- **Rejected:** Doubles the number of files, complicates sync

---

### 4. Event-Based Restoration

**Why?**
- Decouples `unifiedDocumentStore` from `DockviewLayout`
- Allows flexible timing of restoration
- Easy to extend with more listeners

**Alternative considered:** Direct function calls
- **Rejected:** Creates tight coupling, harder to test

---

## Important Considerations

### 1. Document ID vs File Panel ID

**Document ID:** Unique identifier for the document content (e.g., `doc-1234567890`)
**File Panel ID:** Unique identifier for the dockview panel (e.g., `file-1`, `file-2`)

**Key insight:** 
- Same document can be opened in multiple panels (future feature)
- Use **Document ID** for child layout storage (tied to content)
- Use **File Panel ID** for tracking open files (tied to UI)

**Current implementation:** One document per panel, so they're 1:1 mapped.

---

### 2. Layout Storage Keys

**localStorage keys:**
- Parent: `dockview-parent-layout`
- Child: `dockview-child-{documentId}-layout`

**IndexedDB keys:**
- Parent: `uiState.parentLayout`
- Child: `fileLayouts[documentId].layout`

**Important:** Use `documentId` (not `filePanelId`) for child layouts so they persist across panel recreations.

---

### 3. Timing of Restoration

**Current flow:**
1. `boot/indexedDB.ts` runs → IndexedDB initialized
2. `boot/sync.ts` runs → `restoreUIState()` called
3. `DockviewLayout.vue` mounts → `onReady()` called
4. Event `restore-ui-state` emitted
5. `DockviewLayout.vue` handles event → restores layout

**Critical:** `restoreUIState()` must wait for dockview to be ready.

**Solution:** Use event bus to decouple timing.

---

### 4. Handling Missing Documents

**Scenario:** User has file IDs in `openFiles`, but documents are deleted from vault.

**Solution:**
```typescript
for (const fileId of fileIds) {
  const item = await getItem(fileId)
  if (!item) {
    console.warn(`File ${fileId} not found, skipping`)
    continue // Skip missing files
  }
  // ... open file
}
```

**Important:** Don't fail entire restoration if one file is missing.

---

### 5. Vault Switching

**Scenario:** User switches from Vault A to Vault B.

**Expected behavior:**
- Vault A's open files and layouts are saved
- Vault B's open files and layouts are loaded

**Implementation:**
- Each vault has its own `.repository.json` with parent layout
- Each vault's files have their own child layouts
- `UIStateService.clearUIState()` should be called on vault switch

**TODO:** Add vault ID to `uiState` table to support multiple vaults.

---

### 6. Conflict Resolution

**Scenario:** User has app open on two devices, makes different layout changes.

**Current behavior:** Last write wins (Google Drive sync overwrites).

**Future enhancement:** Detect conflicts and ask user which layout to keep.

---

## Performance Considerations

### 1. Layout Save Frequency

**Current:** Save on every `onDidLayoutChange` event.

**Concern:** Could be called frequently during drag operations.

**Optimization (future):**
```typescript
let saveTimeout: NodeJS.Timeout | null = null

childDockviewApi.value?.onDidLayoutChange(() => {
  // Debounce saves to avoid excessive writes
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    saveChildLayoutToStorage(documentId)
  }, 500) // Save 500ms after last change
})
```

**Trade-off:** Slight delay in saving vs. reduced write frequency.

---

### 2. Large Layouts

**Concern:** Complex layouts with many panels could be large JSON objects.

**Mitigation:**
1. Use compact property names (Phase 3, Step 9)
2. Compress layout JSON before storing (future)
3. Limit number of open files (future)

**Current:** Not a concern for typical usage (<10 files, <10 views per file).

---

### 3. IndexedDB Write Performance

**Concern:** Writing to IndexedDB on every layout change could be slow.

**Mitigation:**
- IndexedDB writes are async and non-blocking
- UI remains responsive during writes

**Monitoring:** Watch for console logs with timing:
```typescript
const start = performance.now()
await db.fileLayouts.put(fileLayout)
const duration = performance.now() - start
if (duration > 100) {
  console.warn(`Slow IndexedDB write: ${duration}ms`)
}
```

---

## Testing Strategy

### Unit Tests
- `UIStateService` methods (save/load)
- Layout translation functions (if implemented)

### Integration Tests
- Open files → Check IndexedDB
- Reload app → Verify restoration
- Sync to Google Drive → Verify files

### E2E Tests
- Full user workflow (open, arrange, reload, sync)
- Cross-device sync
- Vault switching

---

## Rollback Plan

**If Phase 1 breaks:**
1. Revert changes to `DockviewLayout.vue`
2. Keep default "Untitled 1" file creation
3. Disable `restoreUIState()` call in `boot/sync.ts`

**If Phase 2 breaks:**
1. Remove IndexedDB writes from layout save functions
2. Keep localStorage-only saves

**If Phase 3 breaks:**
1. Remove parent layout from `.repository.json`
2. Remove child layout from `.mindpad` files
3. Keep local persistence only

---

## Future Enhancements

### 1. Layout Presets
- Save named layout presets (e.g., "Writing Mode", "Research Mode")
- Quick switch between presets

### 2. Layout History
- Track layout changes over time
- Undo/redo layout changes

### 3. Layout Sharing
- Export layout as JSON
- Import layout from another user

### 4. Smart Layout Suggestions
- AI suggests optimal layout based on document content
- "You're writing a lot, want to expand the writer panel?"

---

## Common Pitfalls to Avoid

### 1. Don't Block UI on IndexedDB Writes
```typescript
// ❌ BAD: Blocking
function saveLayout() {
  const layout = dockviewApi.value.toJSON()
  await UIStateService.saveFileLayout(fileId, layout) // Blocks UI
}

// ✅ GOOD: Non-blocking
function saveLayout() {
  const layout = dockviewApi.value.toJSON()
  UIStateService.saveFileLayout(fileId, layout) // Fire and forget
    .catch(err => console.error('Failed to save layout:', err))
}
```

### 2. Don't Assume Documents Exist
```typescript
// ❌ BAD: Assumes document exists
const document = unifiedStore.getDocument(fileId)
document.dockviewLayout = layout // Crashes if null

// ✅ GOOD: Check first
const document = unifiedStore.getDocument(fileId)
if (document) {
  document.dockviewLayout = layout
}
```

### 3. Don't Forget to Clean Up Event Listeners
```typescript
// ❌ BAD: Memory leak
onMounted(() => {
  eventBus.on('restore-ui-state', handleRestore)
})

// ✅ GOOD: Clean up
onMounted(() => {
  eventBus.on('restore-ui-state', handleRestore)
})
onUnmounted(() => {
  eventBus.off('restore-ui-state', handleRestore)
})
```

---

## Questions to Consider

1. **Should we support multiple vaults with different layouts?**
   - Current: Single `uiState` record for all vaults
   - Future: One `uiState` per vault

2. **Should we limit the number of open files?**
   - Current: No limit
   - Future: Warn user if >20 files open

3. **Should we compress layouts before storing?**
   - Current: Store as-is
   - Future: Use gzip or similar

4. **Should we version layouts?**
   - Current: No versioning
   - Future: Add `layoutVersion` field for migrations

