# Quick Reference Guide

## File Locations

### Core Files to Modify

| File | Purpose | Phases |
|------|---------|--------|
| `layouts/DockviewLayout.vue` | Parent dockview, file tabs | 1, 2, 3 |
| `pages/components/FilePanel.vue` | Child dockview, views | 2, 3 |
| `core/services/uiStateService.ts` | UI state persistence | 2 |
| `core/services/indexedDBService.ts` | IndexedDB schema | 2 |
| `core/stores/unifiedDocumentStore.ts` | Document store | 1, 3 |
| `core/events.ts` | Event definitions | 1 |
| `core/services/googleDriveInitialization.ts` | Google Drive sync | 3 |

---

## Key Functions

### UIStateService

```typescript
// Save/load open files
await UIStateService.saveOpenFiles(fileIds, activeFileId)
const { fileIds, activeFileId } = await UIStateService.getOpenFiles()

// Save/load parent layout
await UIStateService.saveParentLayout(layout)
const layout = await UIStateService.getParentLayout()

// Save/load child layout
await UIStateService.saveFileLayout(fileId, layout)
const layout = await UIStateService.getFileLayout(fileId)

// Clear all UI state
await UIStateService.clearUIState()
```

### DockviewLayout.vue

```typescript
// Track open files
await trackOpenFiles()

// Save parent layout
await saveParentLayoutToStorage()

// Load parent layout
const loaded = loadParentLayoutFromStorage()

// Restore UI state
await handleRestoreUIState(payload)
```

### FilePanel.vue

```typescript
// Save child layout
await saveChildLayoutToStorage(documentId)

// Load child layout
const loaded = loadChildLayoutFromStorage(documentId)
```

---

## Data Structures

### UIState (IndexedDB)

```typescript
{
  id: 'ui-state',
  openFiles: ['file-1', 'file-2', 'file-3'],
  activeFileId: 'file-2',
  parentLayout: { /* dockview layout JSON */ },
  lastUpdated: 1234567890
}
```

### FileLayout (IndexedDB)

```typescript
{
  fileId: 'doc-1234567890',
  layout: { /* dockview layout JSON */ },
  lastUpdated: 1234567890
}
```

### Repository (Google Drive)

```typescript
{
  repositoryId: 'vault-123',
  name: 'My Vault',
  version: '1.0',
  lastUpdated: 1234567890,
  files: { /* ... */ },
  folders: { /* ... */ },
  deletedFiles: [],
  deletedFolders: [],
  parentLayout: { /* dockview layout JSON */ }, // NEW
  syncSettings: { /* ... */ }
}
```

### MindpadDocument (Google Drive)

```typescript
{
  version: '1.0',
  metadata: { /* ... */ },
  nodes: [ /* ... */ ],
  edges: [ /* ... */ ],
  interMapLinks: [],
  layout: { /* ... */ },
  dockviewLayout: { /* dockview layout JSON */ }, // NEW
  dockviewLayoutId: 'doc-1234567890' // NEW
}
```

---

## localStorage Keys

```typescript
// Parent layout
'dockview-parent-layout'

// Child layouts
'dockview-child-{documentId}-layout'
'dockview-child-doc-1234567890-layout'
```

---

## Event Bus Events

```typescript
// Restore UI state
eventBus.emit('restore-ui-state', {
  fileIds: ['file-1', 'file-2'],
  activeFileId: 'file-2'
})

// Listen
eventBus.on('restore-ui-state', handleRestoreUIState)

// Clean up
eventBus.off('restore-ui-state', handleRestoreUIState)
```

---

## Console Logs to Watch

### Good Logs ✅

```
💾 [DockviewLayout] Tracked open files: ['file-1', 'file-2']
💾 [UIState] Saved open files: ['file-1', 'file-2']
💾 [DockviewLayout] Saved parent layout to localStorage and IndexedDB
💾 [FilePanel] Saved child layout for doc-123 to localStorage and IndexedDB
💾 [UIState] Saved parent layout to IndexedDB
💾 [UIState] Saved layout for file: doc-123
🔄 [UnifiedDocumentStore] Restoring UI state...
🔄 [UnifiedDocumentStore] Found open files: ['file-1', 'file-2']
🔄 [DockviewLayout] Restoring UI state: { fileIds: [...], activeFileId: '...' }
✅ [DockviewLayout] Parent layout restored from localStorage
✅ Document loaded for panel file-1
✅ Reopened file "My Document" in panel file-1
```

### Bad Logs ❌

```
❌ Failed to restore UI state
❌ Failed to save layout
❌ Cannot reopen file: no document instance
⚠️ No document instance found for panel file-1
⚠️ File file-1 not found, skipping
```

---

## Common Commands

### Clear IndexedDB (DevTools Console)

```javascript
// Delete entire database
indexedDB.deleteDatabase('MindPadDB')

// Or clear specific tables
const db = await window.indexedDB.open('MindPadDB')
const tx = db.transaction(['uiState', 'fileLayouts'], 'readwrite')
tx.objectStore('uiState').clear()
tx.objectStore('fileLayouts').clear()
```

### Clear localStorage (DevTools Console)

```javascript
// Clear all
localStorage.clear()

// Clear specific keys
localStorage.removeItem('dockview-parent-layout')
localStorage.removeItem('dockview-child-doc-1234567890-layout')
```

### Inspect IndexedDB (DevTools)

```
Application → IndexedDB → MindPadDB
  → uiState (click to view records)
  → fileLayouts (click to view records)
```

### Inspect localStorage (DevTools)

```
Application → Local Storage → http://localhost:9000
  → Look for 'dockview-parent-layout'
  → Look for 'dockview-child-*-layout' keys
```

---

## Debugging Checklist

### Files not restoring?
- [ ] Check `uiState.openFiles` in IndexedDB
- [ ] Check console for "Restoring UI state" log
- [ ] Check if `restoreUIState()` is called in `boot/sync.ts`
- [ ] Check if `restore-ui-state` event is emitted
- [ ] Check if `handleRestoreUIState()` is called in `DockviewLayout.vue`

### Layouts not restoring?
- [ ] Check `dockview-parent-layout` in localStorage
- [ ] Check `dockview-child-*-layout` in localStorage
- [ ] Check `uiState.parentLayout` in IndexedDB
- [ ] Check `fileLayouts` table in IndexedDB
- [ ] Check console for "Saved layout" logs

### Google Drive sync not working?
- [ ] Check Network tab for API calls
- [ ] Check `.repository.json` on Google Drive
- [ ] Check `.mindpad` files on Google Drive
- [ ] Check console for sync errors
- [ ] Check if user is authenticated

---

## Phase Completion Checklist

### Phase 1 Complete ✅
- [ ] No "Untitled 1" file on fresh start
- [ ] Open files tracked in IndexedDB
- [ ] Files restored on reload
- [ ] Parent layout restored on reload
- [ ] Active file restored on reload

### Phase 2 Complete ✅
- [ ] Parent layout in IndexedDB
- [ ] Child layouts in IndexedDB
- [ ] Layouts update on change
- [ ] Layouts in both localStorage and IndexedDB

### Phase 3 Complete ✅
- [ ] Parent layout in `.repository.json`
- [ ] Child layouts in `.mindpad` files
- [ ] Layouts load from Google Drive
- [ ] Cross-device sync works

---

## Useful Snippets

### Log Current UI State

```typescript
// In DockviewLayout.vue
function logUIState() {
  const panels = dockviewApi.value?.panels || []
  const fileIds = panels.map(p => p.id)
  const activeFileId = dockviewApi.value?.activePanel?.id || null
  console.log('Current UI State:', { fileIds, activeFileId })
}

// Call from console
window.logUIState = logUIState
```

### Dump Layout to Console

```typescript
// In FilePanel.vue
function dumpLayout() {
  const layout = childDockviewApi.value?.toJSON()
  console.log('Child Layout:', JSON.stringify(layout, null, 2))
}

// Call from console
window.dumpLayout = dumpLayout
```

### Force Restore UI State

```typescript
// In console
eventBus.emit('restore-ui-state', {
  fileIds: ['file-1', 'file-2'],
  activeFileId: 'file-2'
})
```

