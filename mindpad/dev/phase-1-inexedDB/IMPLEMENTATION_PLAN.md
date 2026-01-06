# IndexedDB Implementation Plan for MindPad

## 🎯 Overview

This document outlines the implementation plan for Phase 1: IndexedDB integration with error handling and future-proof schema design. Since we're working in a development branch, we can focus on clean implementation without migration complexity.

**Key Decisions**:
1. ✅ **Using Dexie.js** - Better DX, schema management, and query capabilities (7KB gzipped)
2. ✅ **Provider-Aware Schema** - Future-proof for Phase 2 multi-backend support (GitHub, Dropbox, S3, etc.)
3. ✅ **Minimal Implementation** - Start simple, add complexity as needed
4. ✅ **Composables Pattern** - Keep store clean, separate concerns

## 🚀 What Makes This Plan Special

### Future-Proof Design (Phase 2 Ready)
This implementation is designed to support **multiple storage providers** (Phase 2) without requiring schema changes:

- ✅ **`providerMetadata` table** - Tracks sync status for each provider (Google Drive, GitHub, Dropbox, etc.)
- ✅ **`providers` field in documents** - Supports multiple backends per document
- ✅ **Provider-aware SyncManager** - Ready to add new providers with minimal code changes
- ✅ **Backward compatible** - Supports legacy `driveFileId` field during migration

### Minimal Overhead
Adding provider-awareness only adds **~1 hour** to the implementation timeline, but saves **weeks** of refactoring when Phase 2 arrives.

### See Also
- **Phase 2 Backend Architecture**: `mindpad/dev/phase-2-backend/01_backend_architecture.md`
- Planned providers: GitHub, Dropbox, S3, LocalFileSystem, WebDAV, IPFS

## 🏗️ Architecture Integration Points

Based on the current project structure, the indexedDB implementation will integrate with:

1. **Core Services**: `mindpad/quasar/src/core/services/`
2. **Unified Document Store**: `mindpad/quasar/src/core/stores/unifiedDocumentStore.ts`
3. **Types System**: `mindpad/quasar/src/core/types/`
4. **Composables**: `mindpad/quasar/src/composables/`

## 🔄 Provider-Aware Architecture (Phase 1 → Phase 2)

```
┌─────────────────────────────────────────────────────────────────┐
│                     Phase 1: Current State                       │
│                  (Google Drive Only, Future-Proof)               │
└─────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │  Vue Components  │
    └────────┬─────────┘
             │
    ┌────────▼─────────┐
    │ Unified Store    │
    └────────┬─────────┘
             │
    ┌────────▼─────────┐
    │  useIndexedDB    │ (Composable)
    └────────┬─────────┘
             │
    ┌────────▼─────────┐
    │  SyncManager     │ ◄── currentProvider: 'googleDrive'
    └────────┬─────────┘
             │
    ┌────────▼─────────┐
    │  IndexedDB       │ ◄── providerMetadata table (future-proof)
    │  (Dexie.js)      │
    └────────┬─────────┘
             │
    ┌────────▼─────────┐
    │  Google Drive    │ (Only provider in Phase 1)
    └──────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                     Phase 2: Multi-Provider                      │
│              (GitHub, Dropbox, S3, LocalFileSystem)              │
└─────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │  Vue Components  │
    └────────┬─────────┘
             │
    ┌────────▼─────────┐
    │ Unified Store    │
    └────────┬─────────┘
             │
    ┌────────▼─────────┐
    │  useIndexedDB    │ (Composable)
    └────────┬─────────┘
             │
    ┌────────▼─────────┐
    │  SyncManager     │ ◄── Uses ProviderManager
    └────────┬─────────┘
             │
    ┌────────▼─────────┐
    │ ProviderManager  │ ◄── Manages multiple providers
    └────────┬─────────┘
             │
    ┌────────▼─────────┐
    │  IndexedDB       │ ◄── providerMetadata tracks all providers
    │  (Dexie.js)      │
    └────────┬─────────┘
             │
    ┌────────▼─────────────────────────────────────────┐
    │                                                   │
    ▼                 ▼              ▼                 ▼
┌────────┐      ┌─────────┐    ┌─────────┐    ┌──────────────┐
│ Google │      │ GitHub  │    │ Dropbox │    │ Local Files  │
│ Drive  │      │         │    │         │    │  (Electron)  │
└────────┘      └─────────┘    └─────────┘    └──────────────┘
```

**Key Points**:
- ✅ Phase 1 schema supports Phase 2 architecture
- ✅ No schema changes needed when adding providers
- ✅ `providerMetadata` table tracks sync status per provider
- ✅ Document metadata supports multiple providers

## 📊 Phase 1 vs Phase 2 Comparison

| Feature                       | Phase 1 (Now)                         | Phase 2 (Later)                            |
| ----------------------------- | ------------------------------------- | ------------------------------------------ |
| **Storage Providers**         | Google Drive only                     | GitHub, Dropbox, S3, LocalFileSystem, etc. |
| **Schema Design**             | ✅ Provider-aware (future-proof)      | ✅ No changes needed                       |
| **Document Types**            | ✅ Supports `providers` field         | ✅ No changes needed                       |
| **providerMetadata Table**    | ✅ Implemented                        | ✅ Already tracking all providers          |
| **SyncManager**               | ✅ Provider-aware (Google Drive only) | ✅ Add provider-specific sync methods      |
| **StorageProvider Interface** | ❌ Not needed yet                     | ✅ Build when adding 2nd provider          |
| **ProviderManager**           | ❌ Not needed yet                     | ✅ Build when adding 2nd provider          |
| **Multi-Provider Sync**       | ❌ Not needed yet                     | ✅ Build when needed                       |
| **Implementation Time**       | ~1-2 days                             | ~1 week (per provider)                     |
| **Schema Migration**          | N/A                                   | ✅ None needed (already future-proof)      |

**Key Insight**: By spending an extra **1 hour** in Phase 1 to make the schema provider-aware, we save **weeks** of refactoring in Phase 2.

## 📋 Implementation Roadmap

### Phase 1: Minimal Setup (Day 1 - 2 hours)

#### 1.1 Install Dexie.js
```bash
cd mindpad/quasar
npm install dexie
```

#### 1.2 Minimal Error Classes (Single File)
- **Location**: `mindpad/quasar/src/core/errors/`
- **Files to Create**:
  - `index.ts` - All error classes in one file (start minimal, add more as needed)

**Rationale**: Start with just 3 error classes (MindPadError, StorageError, NetworkError). Add more error classes incrementally as you encounter actual errors during implementation.

#### 1.3 Global Error Handler (Boot File)
- **Location**: `mindpad/quasar/src/boot/`
- **Files to Create**:
  - `error-handler.ts` - Global unhandled rejection handler with Quasar Notify integration

### Phase 2: IndexedDB with Dexie.js (Day 1 - 2 hours)

#### 2.1 Core Dexie Database Class
- **Location**: `mindpad/quasar/src/core/services/`
- **Files to Create**:
  - `indexedDBService.ts` - Dexie database class with schema definition

**Rationale**: Dexie.js handles schema versioning automatically. No need for separate `schemaManager.ts` or `viewManager.ts` initially.

#### 2.2 Database Structure with Dexie
```typescript
// Database Schema using Dexie.js
import Dexie, { Table } from 'dexie';
import type { MindpadDocument, MindpadNode } from '../types';

export interface DatabaseSettings {
  id: string;
  compressionLevel: 'none' | 'balanced' | 'aggressive';
  searchableContentLength: number;
  userId?: string;
}

export class MindPadDB extends Dexie {
  documents!: Table<MindpadDocument, string>;
  nodes!: Table<MindpadNode, string>;
  settings!: Table<DatabaseSettings, string>;
  errorLogs!: Table<ErrorLog, string>;

  constructor() {
    super('MindPadDB');

    // Version 1 - Initial schema
    this.version(1).stores({
      documents: 'metadata.id, metadata.modified, metadata.vaultId',
      nodes: 'id, mapId, vaultId, modified',
      settings: 'id',
      errorLogs: 'id, timestamp'
    });
  }
}

export const db = new MindPadDB();
```

### Phase 3: IndexedDB Composable (Day 1 - 1 hour)

#### 3.1 Create IndexedDB Composable
- **Location**: `mindpad/quasar/src/composables/`
- **Files to Create**:
  - `useIndexedDB.ts` - Composable for IndexedDB operations with error handling

**Rationale**: Use Vue composable pattern instead of adding complexity to the unified store. This keeps concerns separated and makes testing easier.

### Phase 4: Sync Strategy (Week 1 - 1 day)

#### 4.1 Sync Manager Implementation
- **Location**: `mindpad/quasar/src/core/services/`
- **Files to Create**:
  - `syncManager.ts` - Handles IndexedDB ↔ Provider synchronization with partial sync

**Strategy (Partial Sync)**:
1. **On App Startup**:
   - Open IndexedDB (always available offline)
   - If online: Download `.repository.json` from provider (small file with timestamps)
   - Compare local vs remote repository to find changes
   - Only sync changed files (efficient, fast)

2. **Conflict Detection**:
   - Compare timestamps between local and remote files
   - If both modified since last sync → conflict
   - Show user dialog: "Keep Server" / "Keep Local" / "Advanced"
   - Advanced: Per-file resolution

3. **Lock File**:
   - Create `.lock` file before sync to prevent concurrent syncs from other devices
   - Remove `.lock` file after sync completes
   - If `.lock` exists, wait or show warning

4. **Sync Only Changed Files**:
   - Download: Files newer on server or missing locally
   - Upload: Files newer locally or missing on server
   - Delete: Files marked as deleted in `.repository.json`

5. **Update Local Repository**:
   - After sync, update local `.repository.json` in IndexedDB
   - Track `lastSynced` timestamp for next sync

**Benefits**:
- ✅ Fast startup (only download small `.repository.json`)
- ✅ Efficient sync (only changed files)
- ✅ Conflict detection before downloading large files
- ✅ Works with any provider (Google Drive, GitHub, Dropbox, etc.)
- ✅ Prevents data corruption with `.lock` file

**Partial Sync Flow**:
```
┌─────────────────────────────────────────────────────────────────┐
│                      App Startup                                 │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │ Open IndexedDB   │ (Always available offline)
                  └────────┬─────────┘
                           │
                           ▼
                  ┌──────────────────┐
                  │ Check Internet   │
                  └────────┬─────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
      ┌──────────────┐          ┌──────────────┐
      │   Offline    │          │   Online     │
      └──────┬───────┘          └──────┬───────┘
             │                         │
             │                         ▼
             │              ┌──────────────────────┐
             │              │ Download             │
             │              │ .repository.json     │ (Small file)
             │              └──────────┬───────────┘
             │                         │
             │                         ▼
             │              ┌──────────────────────┐
             │              │ Compare Local vs     │
             │              │ Remote Repository    │
             │              └──────────┬───────────┘
             │                         │
             │                         ▼
             │              ┌──────────────────────┐
             │              │ Conflicts Detected?  │
             │              └──────────┬───────────┘
             │                         │
             │              ┌──────────┴──────────┐
             │              │                     │
             │              ▼                     ▼
             │     ┌────────────────┐    ┌────────────────┐
             │     │ Yes: Show      │    │ No: Sync Only  │
             │     │ Conflict Dialog│    │ Changed Files  │
             │     └────────┬───────┘    └────────┬───────┘
             │              │                     │
             │              ▼                     │
             │     ┌────────────────┐            │
             │     │ User Chooses:  │            │
             │     │ - Keep Server  │            │
             │     │ - Keep Local   │            │
             │     │ - Advanced     │            │
             │     └────────┬───────┘            │
             │              │                     │
             │              └──────────┬──────────┘
             │                         │
             └─────────────────────────┤
                                       ▼
                            ┌──────────────────┐
                            │ Update IndexedDB │
                            └────────┬─────────┘
                                     │
                                     ▼
                            ┌──────────────────┐
                            │ Ready for Use    │
                            └──────────────────┘
```

**Key Files**:
- `.repository.json` - Contains file structure with timestamps (downloaded first)
- `.lock` - Prevents concurrent syncs from multiple devices
- Individual files - Only synced if changed (efficient)

#### 4.2 Repository File Structure (`.repository.json`)

This file is stored in each vault (on the provider) and contains metadata about all files:

```typescript
// Example .repository.json
{
  "repositoryId": "vault-123",
  "name": "My Work Vault",
  "version": "1.0",
  "lastUpdated": 1735488000000,

  "files": {
    "doc-1": {
      "id": "doc-1",
      "path": "/projects/project-a.mindmap",
      "name": "project-a.mindmap",
      "type": "mindmap",
      "timestamp": 1735487000000,
      "size": 15234,
      "checksum": "sha256-abc123..."
    },
    "doc-2": {
      "id": "doc-2",
      "path": "/notes/meeting-notes.mindmap",
      "name": "meeting-notes.mindmap",
      "type": "mindmap",
      "timestamp": 1735486000000,
      "size": 8456
    }
  },

  "folders": {
    "folder-1": {
      "id": "folder-1",
      "path": "/projects",
      "name": "projects",
      "timestamp": 1735487000000,
      "fileIds": ["doc-1"],
      "folderIds": []
    }
  },

  "deletedFiles": [],
  "deletedFolders": [],

  "syncSettings": {
    "conflictResolution": "ask",
    "lastSynced": 1735488000000
  }
}
```

**Why This Works**:
- Small file (~1-10 KB for 100 documents)
- Fast to download and parse
- Contains all info needed to determine what changed
- No need to download all files to check timestamps
- Works with any storage provider

### Phase 5: Mock Subscription Service (Week 2 - 2 hours)

#### 5.1 Mock Subscription Service
- **Location**: `mindpad/quasar/src/core/services/`
- **Files to Create**:
  - `subscriptionService.ts` - Mock subscription with hardcoded user (you)
  - `viewAvailabilityManager.ts` - View access control based on subscription

**Rationale**: Start with a mock that returns a hardcoded "pro" subscription for development. Later integrate with Supabase for real subscription management.

#### 5.2 Hardcoded Development User
```typescript
// Mock subscription for development
export const DEV_USER = {
  userId: 'dev-milan-kosir',
  email: 'kosir.milan@gmail.com',
  currentPlan: 'pro',
  planLevel: 2,
  status: 'active' as const,
  expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year from now
  previousPlans: []
};
```

### Phase 6: Integration with Unified Store (Week 1 - 1 day)

#### 6.1 Minimal Store Integration
- **Location**: `mindpad/quasar/src/core/stores/`
- **Files to Modify**:
  - `unifiedDocumentStore.ts` - Use IndexedDB composable for persistence

**Rationale**: Keep the unified store clean by using the composable pattern instead of instantiating services directly in the store.

#### 6.2 Auto-save with Debouncing
- **Location**: `mindpad/quasar/src/composables/`
- **Files to Create**:
  - `useAutosave.ts` - Auto-save composable with debouncing

## 📁 Revised File Structure Plan

```
mindpad/quasar/src/
├── boot/
│   └── error-handler.ts                    # NEW: Global error handler
├── core/
│   ├── errors/
│   │   └── index.ts                        # NEW: All error classes (minimal)
│   ├── services/
│   │   ├── indexedDBService.ts             # NEW: Dexie database class (provider-aware)
│   │   ├── syncManager.ts                  # NEW: IndexedDB ↔ Provider sync
│   │   ├── subscriptionService.ts          # NEW: Mock subscription (dev user)
│   │   └── viewAvailabilityManager.ts      # NEW: View access control
│   ├── types/
│   │   └── index.ts                        # MODIFIED: Add provider metadata types
│   └── stores/
│       └── unifiedDocumentStore.ts         # MODIFIED: Use IndexedDB composable
└── composables/
    ├── useIndexedDB.ts                     # NEW: IndexedDB operations
    └── useAutosave.ts                      # NEW: Auto-save with debouncing
```

**Removed files** (over-engineering):
- ❌ `schemaManager.ts` - Dexie handles this
- ❌ `viewManager.ts` - Not needed initially
- ❌ `subscriptionAwareAccess.ts` - Merged into viewAvailabilityManager
- ❌ `dataPreservation.ts` - Not needed initially
- ❌ `errorHandler.ts` in utils - Moved to boot file
- ❌ `retryStrategy.ts` - Add when needed
- ❌ `errorLogger.ts` - Add when needed

**Future-proof additions** (Phase 2 ready):
- ✅ `providerMetadata` table in IndexedDB - Tracks sync status per provider
- ✅ `providers` field in document metadata - Supports multiple storage backends
- ✅ Provider-aware SyncManager - Ready for GitHub, Dropbox, S3, etc.

## 🔧 Implementation Details

### 1. Provider-Aware Document Types (Future-Proof)

```typescript
// mindpad/quasar/src/core/types/index.ts

/**
 * Provider-specific metadata for multi-backend support
 *
 * Phase 1: Only googleDrive is used
 * Phase 2: Add github, dropbox, localFileSystem, etc.
 */
export interface DocumentProviders {
  googleDrive?: {
    fileId: string;
    folderId: string;
    webViewLink?: string;
    sharedDriveId?: string;
  };
  github?: {
    owner: string;
    repo: string;
    branch: string;
    path: string;
    sha?: string;
    commitHash?: string;
  };
  dropbox?: {
    path: string;
    id: string;
    rev?: string;
  };
  localFileSystem?: {
    path: string;
    absolutePath: string;
  };
  // Add more providers as needed
}

/**
 * MindPad document metadata
 */
export interface MindpadDocument {
  metadata: {
    id: string;
    title: string;
    created: number;
    modified: number;
    vaultId: string;

    // NEW: Multi-provider support (Phase 2 ready)
    providers?: DocumentProviders;

    // DEPRECATED: Keep for backward compatibility with existing documents
    // Will be migrated to providers.googleDrive.fileId
    driveFileId?: string;

    // ... other metadata fields
  };

  content: {
    // ... existing content structure
  };
}
```

**Migration Strategy**:
- Phase 1: Support both `driveFileId` (legacy) and `providers.googleDrive.fileId` (new)
- Phase 2: Migrate all documents to use `providers` field
- Phase 3: Remove `driveFileId` field

### 2. Minimal Error Classes (All in One File)

```typescript
// mindpad/quasar/src/core/errors/index.ts

/**
 * Base error class for all MindPad errors
 */
export class MindPadError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'MindPadError';
  }
}

/**
 * Storage-related errors (IndexedDB, quota, etc.)
 */
export class StorageError extends MindPadError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'STORAGE_ERROR', context);
    this.name = 'StorageError';
  }
}

/**
 * Network-related errors (sync, offline, etc.)
 */
export class NetworkError extends MindPadError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'NETWORK_ERROR', context);
    this.name = 'NetworkError';
  }
}

/**
 * Authentication errors (Google OAuth, token expiry, etc.)
 */
export class AuthError extends MindPadError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'AUTH_ERROR', context);
    this.name = 'AuthError';
  }
}
```

**Note**: Start with these 4 error classes. Add more (ValidationError, CorruptionError, etc.) only when you encounter actual errors that need specific handling.

### 2. Global Error Handler (Boot File)

```typescript
// mindpad/quasar/src/boot/error-handler.ts
import { boot } from 'quasar/wrappers';
import { Notify } from 'quasar';
import { MindPadError } from '../core/errors';

export default boot(() => {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled rejection:', event.reason);

    const error = event.reason;
    const message = error instanceof MindPadError
      ? error.message
      : error?.message || 'An unexpected error occurred';

    Notify.create({
      type: 'negative',
      message,
      timeout: 5000,
      position: 'top',
      actions: [{ label: 'Dismiss', color: 'white' }]
    });

    event.preventDefault();
  });

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error);
    event.preventDefault();
  });
});
```

**Register in quasar.config.js**:
```javascript
boot: [
  'error-handler',  // Add this
  'axios',
  'google-api',
  // ... other boot files
]
```

### 3. IndexedDB Service with Dexie.js (Provider-Aware)

```typescript
// mindpad/quasar/src/core/services/indexedDBService.ts
import Dexie, { Table } from 'dexie';
import type { MindpadDocument, MindpadNode } from '../types';

export interface DatabaseSettings {
  id: string;
  compressionLevel: 'none' | 'balanced' | 'aggressive';
  searchableContentLength: number;
  userId?: string;
}

export interface ErrorLog {
  id: string;
  timestamp: number;
  error: {
    name: string;
    message: string;
    code: string;
    stack?: string;
  };
  context: Record<string, any>;
}

/**
 * Provider metadata for multi-backend support (Phase 2)
 *
 * This table tracks which storage providers are syncing each document.
 * Future-proofs the schema for GitHub, Dropbox, S3, etc.
 */
export interface ProviderMetadata {
  id: string; // Composite key: `${documentId}:${providerId}`
  documentId: string;
  providerId: 'googleDrive' | 'github' | 'dropbox' | 'localFileSystem' | string;
  providerFileId?: string; // Provider-specific file ID
  lastSyncedAt?: number; // Last successful sync timestamp
  syncStatus: 'synced' | 'pending' | 'conflict' | 'error';
  syncError?: string; // Error message if sync failed
  providerSpecific?: Record<string, any>; // Provider-specific metadata
}

/**
 * MindPad IndexedDB using Dexie.js
 *
 * Dexie handles schema versioning, migrations, and provides a clean API.
 *
 * FUTURE-PROOF DESIGN:
 * - providerMetadata table supports multiple storage backends (Phase 2)
 * - Documents can sync to multiple providers simultaneously
 * - repositories table stores .repository.json for partial sync
 * - Easy to add GitHub, Dropbox, S3, etc. without schema changes
 */
export class MindPadDB extends Dexie {
  documents!: Table<MindpadDocument, string>;
  nodes!: Table<MindpadNode, string>;
  settings!: Table<DatabaseSettings, string>;
  errorLogs!: Table<ErrorLog, string>;
  providerMetadata!: Table<ProviderMetadata, string>; // NEW: Multi-provider support
  repositories!: Table<Repository, string>; // NEW: Store .repository.json locally

  constructor() {
    super('MindPadDB');

    // Version 1 - Initial schema with provider awareness and partial sync
    this.version(1).stores({
      documents: 'metadata.id, metadata.modified, metadata.vaultId',
      nodes: 'id, mapId, vaultId, modified',
      settings: 'id',
      errorLogs: 'id, timestamp',
      providerMetadata: 'id, documentId, providerId, lastSyncedAt, syncStatus', // NEW
      repositories: 'repositoryId, lastUpdated' // NEW: For partial sync
    });

    // Future versions can be added here:
    // this.version(2).stores({ ... }).upgrade(tx => { ... });
  }
}

// Singleton instance
export const db = new MindPadDB();
```

**Usage Examples**:
```typescript
// Save document
await db.documents.put(document);

// Get document
const doc = await db.documents.get(documentId);

// Query nodes by mapId
const nodes = await db.nodes.where('mapId').equals(mapId).toArray();

// Delete document
await db.documents.delete(documentId);

// Count nodes
const count = await db.nodes.where('mapId').equals(mapId).count();

// NEW: Track provider sync status
await db.providerMetadata.put({
  id: `${documentId}:googleDrive`,
  documentId,
  providerId: 'googleDrive',
  providerFileId: 'abc123',
  lastSyncedAt: Date.now(),
  syncStatus: 'synced'
});

// NEW: Get sync status for all providers
const syncStatuses = await db.providerMetadata
  .where('documentId')
  .equals(documentId)
  .toArray();
```

### 4. IndexedDB Composable

```typescript
// mindpad/quasar/src/composables/useIndexedDB.ts
import { db } from '../core/services/indexedDBService';
import { StorageError } from '../core/errors';
import type { MindpadDocument, MindpadNode } from '../core/types';

/**
 * Composable for IndexedDB operations with error handling
 */
export function useIndexedDB() {
  /**
   * Save document to IndexedDB
   */
  async function saveDocument(doc: MindpadDocument): Promise<void> {
    try {
      await db.documents.put(doc);
    } catch (error: any) {
      throw new StorageError('Failed to save document', {
        documentId: doc.metadata.id,
        error: error.message
      });
    }
  }

  /**
   * Load document from IndexedDB
   */
  async function loadDocument(documentId: string): Promise<MindpadDocument | undefined> {
    try {
      return await db.documents.get(documentId);
    } catch (error: any) {
      throw new StorageError('Failed to load document', {
        documentId,
        error: error.message
      });
    }
  }

  /**
   * Delete document from IndexedDB
   */
  async function deleteDocument(documentId: string): Promise<void> {
    try {
      await db.documents.delete(documentId);
    } catch (error: any) {
      throw new StorageError('Failed to delete document', {
        documentId,
        error: error.message
      });
    }
  }

  /**
   * Get all documents
   */
  async function getAllDocuments(): Promise<MindpadDocument[]> {
    try {
      return await db.documents.toArray();
    } catch (error: any) {
      throw new StorageError('Failed to load documents', {
        error: error.message
      });
    }
  }

  /**
   * Get nodes for a specific map
   */
  async function getNodesByMapId(mapId: string): Promise<MindpadNode[]> {
    try {
      return await db.nodes.where('mapId').equals(mapId).toArray();
    } catch (error: any) {
      throw new StorageError('Failed to load nodes', {
        mapId,
        error: error.message
      });
    }
  }

  return {
    saveDocument,
    loadDocument,
    deleteDocument,
    getAllDocuments,
    getNodesByMapId
  };
}
```

### 5. Sync Manager (IndexedDB ↔ Storage Providers)

```typescript
// mindpad/quasar/src/core/services/syncManager.ts
import { db } from './indexedDBService';
import { saveMindmapFile, loadMindmapFile } from './googleDriveService';
import { NetworkError, StorageError } from '../errors';
import type { MindpadDocument } from '../types';

/**
 * Manages synchronization between IndexedDB and storage providers
 *
 * Strategy:
 * - Save to IndexedDB first (fast, offline-capable)
 * - Queue sync to active provider (async, can fail)
 * - Load from IndexedDB first, sync from provider in background
 *
 * FUTURE-PROOF DESIGN (Phase 2):
 * - Currently supports Google Drive only
 * - Ready to add GitHub, Dropbox, S3, etc.
 * - Tracks sync status per provider in providerMetadata table
 */
export class SyncManager {
  private syncQueue: Set<string> = new Set();
  private isSyncing = false;

  // NEW: Current provider (default to Google Drive for now)
  // Phase 2: Support multiple active providers
  private currentProvider: 'googleDrive' | 'github' | 'dropbox' = 'googleDrive';

  /**
   * Save document to IndexedDB and queue provider sync
   */
  async saveDocument(doc: MindpadDocument): Promise<void> {
    // 1. Save to IndexedDB first (fast, always works offline)
    try {
      await db.documents.put(doc);

      // 2. Update provider metadata (NEW: Track sync status)
      const providerFileId = this.getProviderFileId(doc);
      await db.providerMetadata.put({
        id: `${doc.metadata.id}:${this.currentProvider}`,
        documentId: doc.metadata.id,
        providerId: this.currentProvider,
        providerFileId,
        lastSyncedAt: Date.now(),
        syncStatus: 'pending'
      });
    } catch (error: any) {
      throw new StorageError('Failed to save to IndexedDB', {
        documentId: doc.metadata.id,
        error: error.message
      });
    }

    // 3. Queue sync to provider (async, can fail)
    this.queueProviderSync(doc.metadata.id);
  }

  /**
   * Get provider-specific file ID from document metadata
   *
   * Phase 2: This will support multiple providers
   */
  private getProviderFileId(doc: MindpadDocument): string | undefined {
    switch (this.currentProvider) {
      case 'googleDrive':
        // Support both new and legacy metadata formats
        return doc.metadata.providers?.googleDrive?.fileId || doc.metadata.driveFileId;
      case 'github':
        return doc.metadata.providers?.github?.path;
      case 'dropbox':
        return doc.metadata.providers?.dropbox?.id;
      default:
        return undefined;
    }
  }

  /**
   * Load document from IndexedDB, sync from provider in background
   */
  async loadDocument(documentId: string, providerFileId?: string): Promise<MindpadDocument | undefined> {
    // 1. Try IndexedDB first (fast)
    let doc = await db.documents.get(documentId);

    if (doc) {
      // 2. Sync from provider in background if we have providerFileId
      if (providerFileId) {
        this.syncFromProviderInBackground(documentId, providerFileId);
      }
      return doc;
    }

    // 3. If not in IndexedDB, load from provider
    if (providerFileId) {
      doc = await this.loadFromProvider(providerFileId);
      if (doc) {
        await db.documents.put(doc);

        // Track provider metadata
        await db.providerMetadata.put({
          id: `${documentId}:${this.currentProvider}`,
          documentId,
          providerId: this.currentProvider,
          providerFileId,
          lastSyncedAt: Date.now(),
          syncStatus: 'synced'
        });
      }
      return doc;
    }

    return undefined;
  }

  /**
   * Queue document for provider sync
   */
  private queueProviderSync(documentId: string): void {
    this.syncQueue.add(documentId);

    // Start sync process if not already running
    if (!this.isSyncing) {
      this.processSyncQueue();
    }
  }

  /**
   * Process sync queue
   */
  private async processSyncQueue(): Promise<void> {
    if (this.syncQueue.size === 0) {
      this.isSyncing = false;
      return;
    }

    this.isSyncing = true;

    // Get next document to sync
    const documentId = Array.from(this.syncQueue)[0];
    this.syncQueue.delete(documentId);

    try {
      const doc = await db.documents.get(documentId);
      if (doc) {
        await this.syncToProvider(doc);
      }
    } catch (error) {
      console.error('Failed to sync to provider:', error);

      // Update sync status to error
      await db.providerMetadata.update(`${documentId}:${this.currentProvider}`, {
        syncStatus: 'error',
        syncError: error instanceof Error ? error.message : 'Unknown error'
      });

      // Don't throw - continue with next item
    }

    // Process next item
    setTimeout(() => this.processSyncQueue(), 100);
  }

  /**
   * Sync document to current provider
   *
   * Phase 2: This will support multiple providers
   */
  private async syncToProvider(doc: MindpadDocument): Promise<void> {
    if (!navigator.onLine) {
      throw new NetworkError('Cannot sync while offline');
    }

    try {
      // For now, only Google Drive is implemented
      if (this.currentProvider === 'googleDrive') {
        await this.syncToGoogleDrive(doc);
      }
      // Phase 2: Add other providers
      // else if (this.currentProvider === 'github') {
      //   await this.syncToGitHub(doc);
      // }
      // else if (this.currentProvider === 'dropbox') {
      //   await this.syncToDropbox(doc);
      // }

      // Update sync status to synced
      await db.providerMetadata.update(`${doc.metadata.id}:${this.currentProvider}`, {
        lastSyncedAt: Date.now(),
        syncStatus: 'synced',
        syncError: undefined
      });
    } catch (error: any) {
      // Update sync status to error
      await db.providerMetadata.update(`${doc.metadata.id}:${this.currentProvider}`, {
        syncStatus: 'error',
        syncError: error.message
      });

      throw new NetworkError('Failed to sync to provider', {
        documentId: doc.metadata.id,
        provider: this.currentProvider,
        error: error.message
      });
    }
  }

  /**
   * Sync to Google Drive (current implementation)
   */
  private async syncToGoogleDrive(doc: MindpadDocument): Promise<void> {
    const fileId = this.getProviderFileId(doc);
    await saveMindmapFile(doc, fileId);
  }

  /**
   * Load document from current provider
   */
  private async loadFromProvider(providerFileId: string): Promise<MindpadDocument | undefined> {
    try {
      // For now, only Google Drive is implemented
      if (this.currentProvider === 'googleDrive') {
        return await loadMindmapFile(providerFileId) as MindpadDocument;
      }
      // Phase 2: Add other providers

      return undefined;
    } catch (error: any) {
      throw new NetworkError('Failed to load from provider', {
        providerId: this.currentProvider,
        providerFileId,
        error: error.message
      });
    }
  }

  /**
   * Perform partial sync using .repository.json file
   *
   * This is the main sync strategy:
   * 1. Download .repository.json from provider (small file with timestamps)
   * 2. Compare with local repository to find changes
   * 3. Only sync changed files (efficient)
   * 4. Handle conflicts with user dialog
   */
  async performPartialSync(vaultId: string): Promise<void> {
    try {
      // 1. Create .lock file to prevent concurrent syncs
      await this.createLockFile(vaultId);

      // 2. Download .repository.json from provider
      const remoteRepo = await this.getRemoteRepository(vaultId);
      const localRepo = await this.getLocalRepository(vaultId);

      // 3. Compare and identify changes
      const changes = this.compareRepositories(localRepo, remoteRepo);

      // 4. Detect conflicts
      if (changes.conflicts.length > 0) {
        // Show conflict dialog to user
        const resolution = await this.showConflictDialog(changes.conflicts);
        this.applyConflictResolution(changes, resolution);
      }

      // 5. Sync only changed files
      await this.syncChangedFiles(vaultId, changes);

      // 6. Update local .repository.json
      await this.updateLocalRepository(vaultId, remoteRepo);

      // 7. Remove .lock file
      await this.removeLockFile(vaultId);
    } catch (error) {
      console.error('Partial sync failed:', error);
      await this.removeLockFile(vaultId); // Clean up lock
      throw error;
    }
  }

  /**
   * Get remote .repository.json file from provider
   */
  private async getRemoteRepository(vaultId: string): Promise<Repository> {
    // Download .repository.json from current provider
    const repoFile = await this.loadFromProvider(`${vaultId}/.repository.json`);
    return JSON.parse(repoFile);
  }

  /**
   * Get local .repository.json from IndexedDB
   */
  private async getLocalRepository(vaultId: string): Promise<Repository | null> {
    const repo = await db.repositories.get(vaultId);
    return repo || null;
  }

  /**
   * Compare local and remote repositories to find changes
   */
  private compareRepositories(local: Repository | null, remote: Repository): SyncChanges {
    const changes: SyncChanges = {
      toDownload: [],
      toUpload: [],
      toDelete: [],
      conflicts: []
    };

    // Files to download (remote newer or missing locally)
    for (const fileId in remote.files) {
      const remoteFile = remote.files[fileId];
      const localFile = local?.files?.[fileId];

      if (!localFile) {
        changes.toDownload.push(fileId);
      } else if (remoteFile.timestamp > localFile.timestamp) {
        // Check if local was also modified (conflict)
        if (localFile.timestamp > (local?.syncSettings?.lastSynced || 0)) {
          changes.conflicts.push({ fileId, local: localFile, remote: remoteFile });
        } else {
          changes.toDownload.push(fileId);
        }
      }
    }

    // Files to upload (local newer or missing remotely)
    if (local) {
      for (const fileId in local.files) {
        const localFile = local.files[fileId];
        const remoteFile = remote.files[fileId];

        if (!localFile.deleted) {
          if (!remoteFile) {
            changes.toUpload.push(fileId);
          } else if (localFile.timestamp > remoteFile.timestamp) {
            // Already handled in conflicts above
            if (!changes.conflicts.find(c => c.fileId === fileId)) {
              changes.toUpload.push(fileId);
            }
          }
        }
      }
    }

    // Files to delete (marked as deleted)
    changes.toDelete = [...remote.deletedFiles, ...(local?.deletedFiles || [])];

    return changes;
  }

  /**
   * Show conflict dialog to user
   */
  private async showConflictDialog(conflicts: FileConflict[]): Promise<ConflictResolution> {
    // This will be implemented in the UI layer
    // For now, return a default resolution
    return {
      strategy: 'ask', // 'server' | 'local' | 'ask'
      perFileResolutions: new Map()
    };
  }

  /**
   * Sync only changed files (not all files)
   */
  private async syncChangedFiles(vaultId: string, changes: SyncChanges): Promise<void> {
    // Download changed files
    for (const fileId of changes.toDownload) {
      const doc = await this.loadFromProvider(fileId);
      if (doc) {
        await db.documents.put(doc);
      }
    }

    // Upload changed files
    for (const fileId of changes.toUpload) {
      const doc = await db.documents.get(fileId);
      if (doc) {
        await this.syncToProvider(doc);
      }
    }

    // Delete files
    for (const fileId of changes.toDelete) {
      await db.documents.delete(fileId);
    }
  }

  /**
   * Create .lock file to prevent concurrent syncs
   */
  private async createLockFile(vaultId: string): Promise<void> {
    const lockFile = {
      lockedAt: Date.now(),
      lockedBy: 'device-id', // TODO: Get actual device ID
      processId: 'sync-process-id'
    };

    // Upload .lock file to provider
    await this.uploadToProvider(`${vaultId}/.lock`, JSON.stringify(lockFile));
  }

  /**
   * Remove .lock file after sync
   */
  private async removeLockFile(vaultId: string): Promise<void> {
    await this.deleteFromProvider(`${vaultId}/.lock`);
  }

  /**
   * Sync from provider in background (don't block UI)
   *
   * NOTE: This is a fallback for single-document sync.
   * The main sync strategy is performPartialSync() which syncs only changed files.
   */
  private async syncFromProviderInBackground(documentId: string, providerFileId: string): Promise<void> {
    try {
      const providerDoc = await this.loadFromProvider(providerFileId);
      if (providerDoc) {
        const localDoc = await db.documents.get(documentId);

        // Simple conflict resolution: use newer document
        if (!localDoc || providerDoc.metadata.modified > localDoc.metadata.modified) {
          await db.documents.put(providerDoc);

          // Update sync status
          await db.providerMetadata.update(`${documentId}:${this.currentProvider}`, {
            lastSyncedAt: Date.now(),
            syncStatus: 'synced'
          });
        }
      }
    } catch (error) {
      console.error('Background sync failed:', error);

      // Update sync status to error
      await db.providerMetadata.update(`${documentId}:${this.currentProvider}`, {
        syncStatus: 'error',
        syncError: error instanceof Error ? error.message : 'Unknown error'
      });

      // Don't throw - this is background operation
    }
  }
}

// Types for partial sync
interface Repository {
  repositoryId: string;
  name: string;
  version: string;
  lastUpdated: number;
  files: Record<string, RepositoryFile>;
  folders: Record<string, RepositoryFolder>;
  deletedFiles: string[];
  deletedFolders: string[];
  syncSettings?: {
    conflictResolution: 'server' | 'local' | 'ask';
    lastSynced: number;
  };
}

interface RepositoryFile {
  id: string;
  path: string;
  name: string;
  type: 'mindmap' | 'document' | 'folder' | 'other';
  timestamp: number;
  size: number;
  checksum?: string;
  deleted?: boolean;
}

interface RepositoryFolder {
  id: string;
  path: string;
  name: string;
  timestamp: number;
  parentId?: string;
  fileIds: string[];
  folderIds: string[];
}

interface SyncChanges {
  toDownload: string[];
  toUpload: string[];
  toDelete: string[];
  conflicts: FileConflict[];
}

interface FileConflict {
  fileId: string;
  local: RepositoryFile;
  remote: RepositoryFile;
}

interface ConflictResolution {
  strategy: 'server' | 'local' | 'ask';
  perFileResolutions: Map<string, 'server' | 'local'>;
}

// Singleton instance
export const syncManager = new SyncManager();
```

### 6. Mock Subscription Service

```typescript
// mindpad/quasar/src/core/services/subscriptionService.ts
import type { SubscriptionPlan, SubscriptionStatus } from '../types';

/**
 * Development user (hardcoded for now)
 */
export const DEV_USER = {
  userId: 'dev-milan-kosir',
  email: 'kosir.milan@gmail.com',
  currentPlan: 'pro' as SubscriptionPlan,
  planLevel: 2,
  status: 'active' as SubscriptionStatus,
  expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year from now
  previousPlans: []
};

/**
 * Mock subscription service for development
 *
 * TODO: Replace with real Supabase integration later
 */
export class SubscriptionService {
  /**
   * Get current subscription (mock)
   */
  async getCurrentSubscription() {
    return DEV_USER;
  }

  /**
   * Check if user has access to a specific plan level
   */
  async hasPlanLevel(requiredLevel: number): Promise<boolean> {
    const subscription = await this.getCurrentSubscription();
    return subscription.planLevel >= requiredLevel;
  }

  /**
   * Check if subscription is active
   */
  async isActive(): Promise<boolean> {
    const subscription = await this.getCurrentSubscription();
    return subscription.status === 'active' && subscription.expires > Date.now();
  }
}

// Singleton instance
export const subscriptionService = new SubscriptionService();
```

### 7. View Availability Manager

```typescript
// mindpad/quasar/src/core/services/viewAvailabilityManager.ts
import { subscriptionService } from './subscriptionService';
import type { ViewType } from '../types';

/**
 * Subscription plans and their enabled views
 */
const SUBSCRIPTION_PLANS = {
  free: {
    planLevel: 0,
    enabledViews: ['mindmap', 'writer', 'outline']
  },
  basic: {
    planLevel: 1,
    enabledViews: ['mindmap', 'writer', 'outline', 'kanban']
  },
  pro: {
    planLevel: 2,
    enabledViews: ['mindmap', 'writer', 'outline', 'kanban', 'timeline', 'calendar']
  }
};

/**
 * Manages view availability based on subscription
 */
export class ViewAvailabilityManager {
  /**
   * Check if a view is available for current subscription
   */
  async isViewAvailable(viewType: ViewType): Promise<boolean> {
    const subscription = await subscriptionService.getCurrentSubscription();
    const plan = SUBSCRIPTION_PLANS[subscription.currentPlan];

    return plan?.enabledViews.includes(viewType) || false;
  }

  /**
   * Get all available views for current subscription
   */
  async getAvailableViews(): Promise<ViewType[]> {
    const subscription = await subscriptionService.getCurrentSubscription();
    const plan = SUBSCRIPTION_PLANS[subscription.currentPlan];

    return (plan?.enabledViews || ['mindmap', 'writer', 'outline']) as ViewType[];
  }

  /**
   * Get unavailable views (for upsell prompts)
   */
  async getUnavailableViews(): Promise<ViewType[]> {
    const available = await this.getAvailableViews();
    const allViews: ViewType[] = ['mindmap', 'writer', 'outline', 'kanban', 'timeline', 'calendar'];

    return allViews.filter(view => !available.includes(view));
  }
}

// Singleton instance
export const viewAvailabilityManager = new ViewAvailabilityManager();
```

### 8. Auto-save Composable

```typescript
// mindpad/quasar/src/composables/useAutosave.ts
import { ref, watch } from 'vue';
import { useIndexedDB } from './useIndexedDB';
import { syncManager } from '../core/services/syncManager';
import type { MindpadDocument } from '../core/types';

/**
 * Auto-save composable with debouncing
 */
export function useAutosave(document: Ref<MindpadDocument>, delay = 2000) {
  const { saveDocument } = useIndexedDB();
  const isSaving = ref(false);
  const lastSaved = ref<number | null>(null);
  let saveTimeout: NodeJS.Timeout | null = null;

  /**
   * Save document with debouncing
   */
  async function save() {
    if (isSaving.value) return;

    isSaving.value = true;
    try {
      await syncManager.saveDocument(document.value);
      lastSaved.value = Date.now();
    } catch (error) {
      console.error('Auto-save failed:', error);
      throw error;
    } finally {
      isSaving.value = false;
    }
  }

  /**
   * Debounced save
   */
  function debouncedSave() {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    saveTimeout = setTimeout(() => save(), delay);
  }

  /**
   * Watch document for changes and auto-save
   */
  watch(
    () => document.value,
    () => {
      debouncedSave();
    },
    { deep: true }
  );

  /**
   * Force immediate save (e.g., on window close)
   */
  async function forceSave() {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    await save();
  }

  return {
    isSaving,
    lastSaved,
    forceSave
  };
}
```

### 9. Integration with Unified Store (Minimal)

```typescript
// Add to mindpad/quasar/src/core/stores/unifiedDocumentStore.ts

// Add these imports
import { useIndexedDB } from '../../composables/useIndexedDB';
import { syncManager } from '../services/syncManager';

// Inside the store definition
export const useUnifiedDocumentStore = defineStore('documents', () => {
  // ... existing code ...

  const { loadDocument, getAllDocuments } = useIndexedDB();

  /**
   * Load document from IndexedDB first, then sync from Drive
   */
  async function loadDocumentWithSync(documentId: string, driveFileId?: string): Promise<void> {
    try {
      const doc = await syncManager.loadDocument(documentId, driveFileId);
      if (doc) {
        addDocument(doc);
        markClean(documentId);
      }
    } catch (error) {
      console.error('Failed to load document:', error);
      throw error;
    }
  }

  /**
   * Save document to IndexedDB and queue Drive sync
   */
  async function saveDocumentWithSync(documentId: string): Promise<void> {
    try {
      const doc = getDocumentById(documentId);
      if (doc) {
        await syncManager.saveDocument(doc);
        markClean(documentId);
      }
    } catch (error) {
      console.error('Failed to save document:', error);
      throw error;
    }
  }

  /**
   * Load all documents from IndexedDB on app start
   */
  async function loadAllDocuments(): Promise<void> {
    try {
      const docs = await getAllDocuments();
      docs.forEach(doc => {
        addDocument(doc);
        markClean(doc.metadata.id);
      });
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  }

  return {
    // ... existing exports ...
    loadDocumentWithSync,
    saveDocumentWithSync,
    loadAllDocuments
  };
});
```

**Note**: Keep the unified store minimal. Use composables for complex logic instead of adding everything to the store.

## 🧪 Testing Strategy (Start Minimal)

### Manual Testing First
1. **Browser DevTools**: Use IndexedDB inspector to verify data
2. **Console Logging**: Log all operations during development
3. **Error Scenarios**: Manually test quota exceeded, offline, etc.

### Unit Tests (Add Later)
- Add tests incrementally as you encounter bugs
- Focus on critical paths first (save, load, sync)
- Don't write tests for code that doesn't exist yet

**Rationale**: Start with manual testing. Add automated tests when you have working code and encounter bugs.

## 🎯 Revised Implementation Priority

### Week 1 (MVP)
1. ✅ **Install Dexie.js** (5 minutes)
2. ✅ **Minimal Error Classes** (30 minutes)
3. ✅ **Global Error Handler** (30 minutes)
4. ✅ **Provider-Aware Document Types** (15 minutes) - NEW
5. ✅ **IndexedDB Service with Dexie** (2 hours + 15 min for providerMetadata table)
6. ✅ **IndexedDB Composable** (1 hour)
7. ✅ **Provider-Aware Sync Manager** (4 hours + 30 min for provider support)
8. ✅ **Store Integration** (2 hours)

**Total: ~1-2 days of focused work (+ 1 hour for provider-awareness)**

### Week 2 (Polish)
8. ✅ **Mock Subscription Service** (2 hours)
9. ✅ **View Availability Manager** (2 hours)
10. ✅ **Auto-save Composable** (2 hours)
11. ✅ **Testing & Bug Fixes** (4 hours)

**Total: ~1 day of focused work**

### Later (As Needed)
- Add more error classes when you encounter specific errors
- Add retry logic when you encounter flaky operations
- Add conflict resolution when you encounter sync conflicts
- Add real subscription integration when ready for Supabase

## ✅ Success Criteria (Simplified)

1. ✅ **Documents save to IndexedDB** - Can save and load documents offline
2. ✅ **Sync to Google Drive works** - Documents sync to Drive when online
3. ✅ **Errors show notifications** - Users see friendly error messages
4. ✅ **No data loss** - Documents persist across browser sessions
5. ✅ **Dev user has pro access** - Mock subscription works for development

## 🚫 What NOT to Do (Anti-Patterns)

1. ❌ **Don't create files you don't need yet** - Start minimal, add incrementally
2. ❌ **Don't write tests before code works** - Manual test first, automate later
3. ❌ **Don't over-engineer error handling** - Start with 3-4 error classes, add more as needed
4. ❌ **Don't build retry logic upfront** - Add when you encounter flaky operations
5. ❌ **Don't integrate Supabase yet** - Use mock subscription for now
6. ❌ **Don't write documentation yet** - Code comments are enough for now

## 📝 Next Steps

1. **Review this plan** - Make sure you understand the simplified approach
2. **Install Dexie.js** - `npm install dexie`
3. **Create provider-aware types** - Add `DocumentProviders` interface
4. **Create error classes** - Single file with 4 error classes
5. **Create global error handler** - Boot file with Quasar Notify
6. **Create IndexedDB service** - Dexie database class with `providerMetadata` table
7. **Create provider-aware SyncManager** - Support current provider tracking
8. **Test in browser** - Use DevTools to verify IndexedDB works
9. **Iterate** - Add features incrementally, test as you go

---

## 🎉 Summary of Improvements

### Issue #1: Don't Use Raw IndexedDB API ✅
**Solution**: Use Dexie.js for better DX, schema management, and query API

### Issue #2: Over-Engineering Error Handling ✅
**Solution**: Start with 4 error classes in one file, add more as needed

### Issue #3: Subscription Service Doesn't Exist Yet ✅
**Solution**: Create mock subscription with hardcoded dev user (you)

### Issue #4: Missing Sync Strategy ✅
**Solution**: Partial sync using `.repository.json` file - only sync changed files, not all files
- Download `.repository.json` (small file with timestamps)
- Compare with local repository to find changes
- Sync only changed files (efficient)
- Use `.lock` file to prevent concurrent syncs
- Show conflict dialog if both local and remote modified

### Issue #5: Integration with Unified Store is Too Complex ✅
**Solution**: Use composables pattern, keep store minimal, separate concerns

### Issue #6: Future Multi-Provider Support ✅
**Solution**: Provider-aware schema and types, ready for Phase 2 expansion

---

## 🔮 Future-Proof Design (Phase 2 Ready)

### What We're Adding NOW (30 minutes extra work):

1. ✅ **`providerMetadata` table** - Tracks sync status per provider
   ```typescript
   interface ProviderMetadata {
     id: string; // `${documentId}:${providerId}`
     documentId: string;
     providerId: 'googleDrive' | 'github' | 'dropbox' | ...;
     providerFileId?: string;
     lastSyncedAt?: number;
     syncStatus: 'synced' | 'pending' | 'conflict' | 'error';
   }
   ```

2. ✅ **`providers` field in document metadata** - Supports multiple backends
   ```typescript
   metadata: {
     providers?: {
       googleDrive?: { fileId: string; folderId: string; };
       github?: { owner: string; repo: string; path: string; };
       dropbox?: { path: string; id: string; };
     };
     driveFileId?: string; // Deprecated, keep for backward compatibility
   }
   ```

3. ✅ **Provider-aware SyncManager** - Ready to add new providers
   ```typescript
   private currentProvider: 'googleDrive' | 'github' | 'dropbox' = 'googleDrive';

   private getProviderFileId(doc: MindpadDocument): string | undefined {
     switch (this.currentProvider) {
       case 'googleDrive': return doc.metadata.providers?.googleDrive?.fileId;
       case 'github': return doc.metadata.providers?.github?.path;
       case 'dropbox': return doc.metadata.providers?.dropbox?.id;
     }
   }
   ```

### What We're NOT Building Yet (Phase 2):

- ❌ `StorageProvider` interface - Wait until adding 2nd provider
- ❌ `ProviderManager` class - Wait until adding 2nd provider
- ❌ Multi-provider sync - Wait until needed
- ❌ Provider-specific implementations (GitHub, Dropbox, etc.)

### Benefits of This Approach:

1. ✅ **Minimal overhead** - Only 30 minutes of extra work
2. ✅ **Future-proof** - Schema supports multiple providers
3. ✅ **No over-engineering** - Don't build what you don't need yet
4. ✅ **Easy migration** - When Phase 2 comes, data structure is ready
5. ✅ **Backward compatible** - Supports legacy `driveFileId` field

### Phase 2 Migration Path:

When you're ready to add GitHub, Dropbox, or other providers:

1. ✅ **Schema is ready** - No IndexedDB changes needed
2. ✅ **Types are ready** - Just add provider-specific fields
3. ✅ **SyncManager is ready** - Just add provider-specific sync methods
4. Then build:
   - `StorageProvider` interface
   - `ProviderManager` class
   - Provider-specific implementations
   - Multi-provider sync logic

---

## 🎓 Example: Adding GitHub Provider in Phase 2

Thanks to the provider-aware schema, adding GitHub in Phase 2 is straightforward:

### Step 1: Add GitHub Sync Method to SyncManager (No Schema Changes!)

```typescript
// mindpad/quasar/src/core/services/syncManager.ts

/**
 * Sync to GitHub (Phase 2 implementation)
 */
private async syncToGitHub(doc: MindpadDocument): Promise<void> {
  const githubMeta = doc.metadata.providers?.github;
  if (!githubMeta) {
    throw new Error('GitHub metadata not found');
  }

  // Use Octokit.js to sync
  const octokit = new Octokit({ auth: await getGitHubToken() });

  await octokit.rest.repos.createOrUpdateFileContents({
    owner: githubMeta.owner,
    repo: githubMeta.repo,
    path: githubMeta.path,
    message: `Update: ${doc.metadata.title}`,
    content: Buffer.from(JSON.stringify(doc)).toString('base64'),
    branch: githubMeta.branch,
    sha: githubMeta.sha // For updates
  });
}
```

### Step 2: Update syncToProvider Method

```typescript
private async syncToProvider(doc: MindpadDocument): Promise<void> {
  if (!navigator.onLine) {
    throw new NetworkError('Cannot sync while offline');
  }

  try {
    if (this.currentProvider === 'googleDrive') {
      await this.syncToGoogleDrive(doc);
    } else if (this.currentProvider === 'github') {
      await this.syncToGitHub(doc); // NEW: Just add this
    }

    // Update sync status (already implemented)
    await db.providerMetadata.update(`${doc.metadata.id}:${this.currentProvider}`, {
      lastSyncedAt: Date.now(),
      syncStatus: 'synced'
    });
  } catch (error: any) {
    // Error handling already implemented
  }
}
```

### Step 3: Update getProviderFileId Method

```typescript
private getProviderFileId(doc: MindpadDocument): string | undefined {
  switch (this.currentProvider) {
    case 'googleDrive':
      return doc.metadata.providers?.googleDrive?.fileId || doc.metadata.driveFileId;
    case 'github':
      return doc.metadata.providers?.github?.path; // NEW: Just add this
    case 'dropbox':
      return doc.metadata.providers?.dropbox?.id;
    default:
      return undefined;
  }
}
```

### That's It! 🎉

**No schema changes needed**. The `providerMetadata` table and `providers` field already support GitHub.

**Total work**: ~4 hours to add GitHub provider (mostly implementing GitHub-specific sync logic)

**Compare to**: ~2 weeks if we had to refactor the entire schema and migrate existing data

---

This revised plan is **practical, incremental, and focused on getting working code quickly** while being **future-proof for Phase 2 multi-provider support**.

---

## 📈 Visual Summary: Provider-Aware Design

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 1: CURRENT STATE                        │
│                   (Google Drive Only - 1-2 days)                 │
└─────────────────────────────────────────────────────────────────┘

Document Metadata:
{
  metadata: {
    id: "doc-123",
    title: "My Document",
    providers: {
      googleDrive: {                    ◄── Only this is used
        fileId: "abc123",
        folderId: "xyz789"
      },
      github: undefined,                ◄── Ready for Phase 2
      dropbox: undefined                ◄── Ready for Phase 2
    }
  }
}

IndexedDB providerMetadata Table:
┌──────────────────────┬──────────────┬────────────┬──────────┐
│ id                   │ providerId   │ syncStatus │ fileId   │
├──────────────────────┼──────────────┼────────────┼──────────┤
│ doc-123:googleDrive  │ googleDrive  │ synced     │ abc123   │
└──────────────────────┴──────────────┴────────────┴──────────┘
                                        ▲
                                        │
                            Only Google Drive tracked


┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 2: MULTI-PROVIDER                       │
│          (GitHub, Dropbox, S3, etc. - 4 hours per provider)      │
└─────────────────────────────────────────────────────────────────┘

Document Metadata (NO SCHEMA CHANGES!):
{
  metadata: {
    id: "doc-123",
    title: "My Document",
    providers: {
      googleDrive: {                    ◄── Still works
        fileId: "abc123",
        folderId: "xyz789"
      },
      github: {                         ◄── NEW: Just add this
        owner: "kosirm",
        repo: "my-notes",
        path: "docs/my-document.json",
        branch: "main"
      },
      dropbox: {                        ◄── NEW: Just add this
        path: "/MindPad/my-document.json",
        id: "id:xyz123"
      }
    }
  }
}

IndexedDB providerMetadata Table (NO SCHEMA CHANGES!):
┌──────────────────────┬──────────────┬────────────┬──────────────────┐
│ id                   │ providerId   │ syncStatus │ fileId           │
├──────────────────────┼──────────────┼────────────┼──────────────────┤
│ doc-123:googleDrive  │ googleDrive  │ synced     │ abc123           │
│ doc-123:github       │ github       │ synced     │ docs/my-doc.json │ ◄── NEW
│ doc-123:dropbox      │ dropbox      │ pending    │ id:xyz123        │ ◄── NEW
└──────────────────────┴──────────────┴────────────┴──────────────────┘
                                        ▲
                                        │
                            All providers tracked automatically!
```

**Key Takeaway**: The schema designed in Phase 1 seamlessly supports Phase 2 without any migrations! 🎉

---

## ✅ Final Checklist

Before starting implementation, ensure you understand:

- [ ] Why we're using Dexie.js instead of raw IndexedDB
- [ ] How the `providerMetadata` table future-proofs the schema
- [ ] How the `providers` field in document metadata supports multiple backends
- [ ] Why we're starting with Google Drive only but designing for multiple providers
- [ ] How the SyncManager is provider-aware but only implements Google Drive initially
- [ ] The migration path from Phase 1 to Phase 2 (spoiler: no schema changes needed!)
- [ ] The composables pattern for keeping the unified store clean
- [ ] The mock subscription service for development

**Ready to implement?** Start with `npm install dexie` and follow the roadmap! 🚀