# Partial Sync Strategy Update

## 🎯 What Changed

The `IMPLEMENTATION_PLAN.md` has been updated to use **partial sync strategy** instead of full sync. This means we only sync changed files, not all files.

## 📋 Key Changes

### 1. Added `.repository.json` File

A small metadata file stored in each vault that contains:
- File structure with timestamps
- Folder structure
- Deleted files tracking
- Sync settings

**Size**: ~1-10 KB for 100 documents (very small!)

### 2. Added `.lock` File

Created before every sync operation to prevent concurrent syncs from multiple devices that could corrupt data.

### 3. Updated SyncManager

Added new methods:
- `performPartialSync()` - Main sync method using `.repository.json`
- `getRemoteRepository()` - Download `.repository.json` from provider
- `getLocalRepository()` - Get local `.repository.json` from IndexedDB
- `compareRepositories()` - Find what changed (download/upload/delete)
- `syncChangedFiles()` - Sync only changed files
- `createLockFile()` - Create `.lock` before sync
- `removeLockFile()` - Remove `.lock` after sync
- `showConflictDialog()` - Show user conflict resolution dialog

### 4. Updated IndexedDB Schema

Added `repositories` table to store `.repository.json` locally:

```typescript
repositories!: Table<Repository, string>;

this.version(1).stores({
  // ... existing tables
  repositories: 'repositoryId, lastUpdated' // NEW
});
```

### 5. Added Type Definitions

New types for partial sync:
- `Repository` - Structure of `.repository.json`
- `RepositoryFile` - File metadata
- `RepositoryFolder` - Folder metadata
- `SyncChanges` - What needs to sync (download/upload/delete)
- `FileConflict` - Conflict between local and remote
- `ConflictResolution` - User's choice for resolving conflicts

## 🔄 Sync Flow

### Before (Full Sync - Inefficient):
```
1. Download ALL files from provider
2. Compare with local files
3. Update everything
```

### After (Partial Sync - Efficient):
```
1. Download .repository.json (small file)
2. Compare timestamps to find changes
3. Only sync changed files
4. Show conflict dialog if needed
```

## 📊 Benefits

| Aspect | Full Sync | Partial Sync |
|--------|-----------|--------------|
| **Startup Time** | Slow (download all files) | Fast (<1 second) |
| **Bandwidth** | High (all files) | Low (only changed) |
| **Conflict Detection** | After download | Before download |
| **Scalability** | Poor (100+ files) | Excellent (1000+ files) |
| **Offline Support** | Limited | Full |

## 🎓 Example Scenario

**User has 50 documents, modifies 2 on Device A, then opens Device B:**

### Full Sync:
- Download all 50 documents
- Compare all 50 documents
- Update 2 documents
- **Time**: ~10-30 seconds
- **Bandwidth**: ~5-10 MB

### Partial Sync:
- Download `.repository.json` (~5 KB)
- Compare timestamps (instant)
- Download only 2 changed documents
- **Time**: ~1-2 seconds
- **Bandwidth**: ~100-200 KB

**Result**: 10-15x faster! 🚀

## 🔒 Conflict Resolution

### Simple Dialog:
```
Title: "Sync Conflict Detected"
Message: "This vault has been modified on another device."

Options:
- [Keep Server Data] - Use latest from cloud
- [Keep Local Data] - Keep your changes
- [Advanced...] - Show detailed conflicts
```

### Advanced Dialog:
```
Title: "Detailed Sync Conflicts"

File: project-a.mindmap
- Server: Modified 2 hours ago
- Local: Modified 1 hour ago
[↓ Use Server] [↑ Use Local]

File: meeting-notes.mindmap
- Server: Modified yesterday
- Local: Modified today
[↓ Use Server] [↑ Use Local]

[Apply All Resolutions]
```

## 📁 File Structure

```
Vault on Provider (e.g., Google Drive):
├── .repository.json          ← Metadata (downloaded first)
├── .lock                     ← Created during sync
├── projects/
│   └── project-a.mindmap
└── notes/
    └── meeting-notes.mindmap

IndexedDB (Local):
├── documents table           ← Full document content
├── repositories table        ← Local copy of .repository.json
└── providerMetadata table    ← Sync status per provider
```

## ✅ Implementation Checklist

- [x] Update SyncManager with partial sync methods
- [x] Add `repositories` table to IndexedDB schema
- [x] Add type definitions for Repository, SyncChanges, etc.
- [x] Document `.repository.json` structure
- [x] Document `.lock` file usage
- [x] Add conflict resolution flow
- [ ] Implement conflict dialog UI (Phase 1)
- [ ] Test with multiple devices (Phase 1)
- [ ] Add progress notifications (Phase 1)

## 🔗 Related Documents

- **Implementation Plan**: `mindscribble/dev/phase-1-inexedDB/IMPLEMENTATION_PLAN.md` (UPDATED)
- **Quick Notes**: `mindscribble/dev/phase-2-backend/QUICK_NOTES.md` (Source of partial sync strategy)
- **Provider-Aware Changes**: `mindscribble/dev/phase-1-inexedDB/PROVIDER_AWARE_CHANGES.md`

