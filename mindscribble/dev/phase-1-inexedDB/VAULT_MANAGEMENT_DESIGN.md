# Vault Management System Design

## Current System Analysis

### Single Vault Structure
The current implementation works with a single vault:
- **App Folder**: One Google Drive folder called "MindScribble"
- **Repository File**: One `.repository.json` file that tracks all mindmap files
- **Mindmap Files**: Individual `.mindscribble` files stored in the app folder

### Current Sync Flow
1. **App Start**: Download `.repository.json` from Google Drive
2. **Compare**: Compare local vs remote repository to find changes
3. **Partial Sync**: Only sync changed files (efficient)
4. **Update**: Update local `.repository.json` after sync

## Proposed Vault Management System

### Multiple Vaults Structure
```
Google Drive Root
└── MindScribble (App Folder)
    ├── .mindscribble (Central Index) ← NEW
    ├── Vault 1 (Folder)
    │   ├── .repository.json (Vault Repository)
    │   ├── file1.mindscribble
    │   └── file2.mindscribble
    ├── Vault 2 (Folder)
    │   ├── .repository.json (Vault Repository)
    │   └── file3.mindscribble
    └── ...
```

### Central Index File (`.mindscribble`)
A JSON file that contains metadata about all vaults:

```typescript
interface CentralIndex {
  version: string;              // Schema version "1.0"
  lastUpdated: number;          // Unix timestamp
  vaults: Record<string, VaultMetadata>;
}

interface VaultMetadata {
  id: string;                   // Vault ID (UUID)
  name: string;                 // Vault name
  description?: string;         // Optional description
  created: number;              // Creation timestamp
  modified: number;             // Last modification timestamp
  folderId: string;             // Google Drive folder ID
  fileCount: number;            // Number of files in vault
  folderCount: number;          // Number of folders in vault
  size: number;                 // Total size in bytes
  repositoryFileId: string;     // Google Drive file ID for .repository.json
  isActive?: boolean;           // Currently active vault
}
```

### Updated Sync Flow
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
             │              │ .mindscribble        │ (Central Index)
             │              └──────────┬───────────┘
             │                         │
             │                         ▼
             │              ┌──────────────────────┐
             │              │ Download             │
             │              │ .repository.json     │ (Active Vault)
             │              └──────────┬───────────┘
             │                         │
             │                         ▼
             │              ┌──────────────────────┐
             │              │ Compare and Sync     │
             │              │ Changed Files        │
             │              └──────────┬───────────┘
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

## IndexedDB Schema Updates

### New Tables for Central Index
```typescript
// Add to MindScribbleDB class
export class MindScribbleDB extends Dexie {
  // ... existing tables ...
  centralIndex!: Table<CentralIndex, string>; // NEW: Store central index
  vaultMetadata!: Table<VaultMetadata, string>; // NEW: Store vault metadata

  constructor() {
    super('MindScribbleDB');

    this.version(2).stores({
      // ... existing stores ...
      centralIndex: 'id',
      vaultMetadata: 'id, folderId, isActive'
    }).upgrade(tx => {
      // Migration logic from v1 to v2
    });
  }
}
```

### Central Index Management Functions

#### 1. Download Central Index
```typescript
async function downloadCentralIndex(): Promise<CentralIndex> {
  try {
    // Download .mindscribble file from Google Drive
    const centralIndexContent = await loadMindmapFile('.mindscribble');
    const centralIndex = JSON.parse(centralIndexContent as string) as CentralIndex;
    
    // Store in IndexedDB
    await db.centralIndex.put({ id: 'central', ...centralIndex });
    
    // Store individual vault metadata
    for (const vaultId in centralIndex.vaults) {
      const vault = centralIndex.vaults[vaultId];
      await db.vaultMetadata.put(vault);
    }
    
    return centralIndex;
  } catch (error) {
    // If central index doesn't exist, create default
    if (error instanceof NetworkError) {
      return createDefaultCentralIndex();
    }
    throw error;
  }
}
```

#### 2. Update Central Index on Vault Changes
```typescript
async function updateCentralIndex(vaultId: string, updates: Partial<VaultMetadata>): Promise<void> {
  // Get current central index
  const centralIndex = await db.centralIndex.get('central');
  
  if (!centralIndex) {
    throw new StorageError('Central index not found');
  }
  
  // Update vault metadata
  if (centralIndex.vaults[vaultId]) {
    centralIndex.vaults[vaultId] = { ...centralIndex.vaults[vaultId], ...updates };
    centralIndex.lastUpdated = Date.now();
    
    // Update in IndexedDB
    await db.centralIndex.put(centralIndex);
    await db.vaultMetadata.update(vaultId, updates);
    
    // Queue sync to Google Drive
    await syncCentralIndexToDrive(centralIndex);
  }
}
```

#### 3. Sync Central Index to Google Drive
```typescript
async function syncCentralIndexToDrive(centralIndex: CentralIndex): Promise<void> {
  try {
    // Upload .mindscribble file to Google Drive
    const appFolderId = await getOrCreateAppFolder();
    
    // Check if .mindscribble file exists
    const existingFile = await findCentralIndexFile(appFolderId);
    
    if (existingFile) {
      // Update existing file
      await updateMindmapFile(existingFile.id, centralIndex);
    } else {
      // Create new file
      await createMindmapFile(appFolderId, '.mindscribble', centralIndex);
    }
    
    // Update sync status
    await db.providerMetadata.update('central:googleDrive', {
      lastSyncedAt: Date.now(),
      syncStatus: 'synced'
    });
  } catch (error) {
    // Update sync status to error
    await db.providerMetadata.update('central:googleDrive', {
      syncStatus: 'error',
      syncError: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}
```

## Sync Manager Updates

### Modified App Startup Flow
```typescript
// In syncManager.ts
async function initializeSync(): Promise<void> {
  // 1. Download central index
  const centralIndex = await downloadCentralIndex();
  
  // 2. Find active vault (or use first vault)
  const activeVaultId = findActiveVaultId(centralIndex);
  
  // 3. Download active vault's repository
  if (activeVaultId) {
    const activeVault = centralIndex.vaults[activeVaultId];
    await performPartialSync(activeVaultId);
  }
}

function findActiveVaultId(centralIndex: CentralIndex): string | undefined {
  // Find first vault marked as active
  for (const vaultId in centralIndex.vaults) {
    if (centralIndex.vaults[vaultId].isActive) {
      return vaultId;
    }
  }
  
  // If no active vault, return first vault
  const vaultIds = Object.keys(centralIndex.vaults);
  return vaultIds.length > 0 ? vaultIds[0] : undefined;
}
```

### Vault Change Detection
```typescript
// In syncManager.ts
async function onVaultRepositoryUpdated(vaultId: string): Promise<void> {
  // Get vault metadata
  const vault = await db.vaultMetadata.get(vaultId);
  
  if (!vault) {
    console.warn(`Vault ${vaultId} not found in central index`);
    return;
  }
  
  // Update vault metadata (file count, size, modified time)
  const updates: Partial<VaultMetadata> = {
    modified: Date.now(),
    // TODO: Calculate actual file count and size
    fileCount: await countFilesInVault(vaultId),
    size: await calculateVaultSize(vaultId)
  };
  
  // Update central index
  await updateCentralIndex(vaultId, updates);
}
```

## Implementation Plan

### Phase 1: IndexedDB Schema Updates
1. **Add centralIndex table** to store the central index
2. **Add vaultMetadata table** to store individual vault information
3. **Update schema version** to v2 with migration logic

### Phase 2: Central Index Management
1. **Implement downloadCentralIndex()** function
2. **Implement updateCentralIndex()** function  
3. **Implement syncCentralIndexToDrive()** function
4. **Add Google Drive functions** for central index file operations

### Phase 3: Sync Manager Integration
1. **Modify initializeSync()** to download central index first
2. **Add vault change detection** to update central index
3. **Update partial sync** to work with vault-specific repositories

### Phase 4: Testing
1. **Create mock central index** for testing
2. **Test offline/online scenarios**
3. **Test sync scenarios** with vault changes

## Backward Compatibility

### Migration Strategy
1. **First run with v2 schema**: If no central index exists, create default with current vault
2. **Existing users**: Migrate single vault to new structure automatically
3. **Fallback**: If central index download fails, continue with single vault mode

### Default Central Index Creation
```typescript
async function createDefaultCentralIndex(): Promise<CentralIndex> {
  // Create default central index with current vault
  const defaultIndex: CentralIndex = {
    version: '1.0',
    lastUpdated: Date.now(),
    vaults: {
      'default-vault': {
        id: 'default-vault',
        name: 'My Vault',
        created: Date.now(),
        modified: Date.now(),
        folderId: await getOrCreateAppFolder(),
        fileCount: 0,
        folderCount: 0,
        size: 0,
        repositoryFileId: '', // Will be set after first sync
        isActive: true
      }
    }
  };
  
  // Store in IndexedDB
  await db.centralIndex.put({ id: 'central', ...defaultIndex });
  await db.vaultMetadata.put(defaultIndex.vaults['default-vault']);
  
  return defaultIndex;
}
```

## Future Enhancements

### Vault Management UI (Future Phase)
- **Add Vault**: Create new vault folder and add to central index
- **Delete Vault**: Remove vault from central index and delete folder
- **Open Vault**: Switch active vault and load its repository
- **Rename Vault**: Update vault name in central index

### Advanced Features (Future Phase)
- **Vault Sharing**: Share vaults between users
- **Vault Export/Import**: Backup and restore vaults
- **Vault Statistics**: Show detailed analytics per vault
- **Vault Search**: Search across all vaults

## Summary

This design provides a solid foundation for vault management while maintaining backward compatibility. The IndexedDB changes are minimal and focused on storing the central index and vault metadata. The sync process is updated to handle the new central index file, but the core partial sync logic remains unchanged.

**Key Benefits**:
- ✅ **Minimal changes** to existing codebase
- ✅ **Backward compatible** with single vault structure
- ✅ **Future-proof** for multiple vaults
- ✅ **Efficient sync** using central index
- ✅ **Offline-first** design with IndexedDB