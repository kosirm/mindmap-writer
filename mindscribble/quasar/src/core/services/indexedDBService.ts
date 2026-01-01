/**
 * IndexedDB service using Dexie.js
 * Provider-aware design for multi-backend support (Phase 2 ready)
 */

import Dexie, { type Table } from 'dexie';
import type { MindpadDocument, MindpadNode } from '../types';

export type FileSystemItemType = 'file' | 'folder';

export interface FileSystemItem {
  id: string;
  vaultId: string;
  parentId: string | null; // null for root items
  name: string;
  type: FileSystemItemType;
  created: number;
  modified: number;
  sortOrder: number; // User-defined sort order within parent
  size?: number; // For files
  fileId?: string; // For files - reference to document ID
  children?: string[]; // For folders - list of child IDs
}

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
  context: Record<string, unknown>;
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
  providerId: string;
  providerFileId?: string; // Provider-specific file ID
  lastSyncedAt?: number; // Last successful sync timestamp
  syncStatus: 'synced' | 'pending' | 'conflict' | 'error';
  syncError?: string; // Error message if sync failed
  providerSpecific?: Record<string, unknown>; // Provider-specific metadata
}

/**
 * Central index for vault management
 * Stores metadata about all available vaults
 */
export interface CentralIndex {
  id: string; // Always 'central'
  version: string; // Schema version "1.0"
  lastUpdated: number; // Unix timestamp
  vaults: Record<string, VaultMetadata>;
}

/**
 * Metadata for individual vaults
 */
export interface VaultMetadata {
  id: string; // Vault ID (UUID)
  name: string; // Vault name
  description?: string; // Optional description
  created: number; // Creation timestamp
  modified: number; // Last modification timestamp
  folderId: string; // Google Drive folder ID
  repositoryFileId: string; // Google Drive file ID for .repository.json
  fileCount: number; // Number of files in vault
  folderCount: number; // Number of folders in vault
  size: number; // Total size in bytes
  isActive?: boolean; // Currently active vault
}

/**
 * Vaults index - stores metadata about all available vaults
 * This represents the .vaults file from Google Drive
 */
export interface VaultsIndex {
  id: string; // Always 'vaults'
  version: string; // Schema version "1.0"
  lastUpdated: number; // Unix timestamp
  vaults: VaultMetadata[]; // Array of all available vaults
}

/**
 * Repository metadata for partial sync strategy
 */
export interface Repository {
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

export interface RepositoryFile {
  id: string;
  path: string;
  name: string;
  type: 'mindmap' | 'document' | 'folder' | 'other';
  timestamp: number;
  size: number;
  checksum?: string;
  deleted?: boolean;
}

export interface RepositoryFolder {
  id: string;
  path: string;
  name: string;
  timestamp: number;
  parentId?: string;
  fileIds: string[];
  folderIds: string[];
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
  providerMetadata!: Table<ProviderMetadata, string>; // Multi-provider support
  repositories!: Table<Repository, string>; // Store .repository.json locally
  centralIndex!: Table<CentralIndex, string>; // NEW: Store central vault index
  vaultMetadata!: Table<VaultMetadata, string>; // NEW: Store individual vault metadata
  vaultsIndex!: Table<VaultsIndex, string>; // NEW: Store vaults index (.vaults file)
  fileSystem!: Table<FileSystemItem, string>; // NEW: Store file system items

  constructor() {
    super('MindPadDB');

    // Version 1 - Initial schema with provider awareness and partial sync
    this.version(1).stores({
      documents: 'metadata.id, metadata.modified, metadata.vaultId',
      nodes: 'id, mapId, vaultId, modified',
      settings: 'id',
      errorLogs: 'id, timestamp',
      providerMetadata: 'id, documentId, providerId, lastSyncedAt, syncStatus',
      repositories: 'repositoryId, lastUpdated'
    });

    // Version 2 - Add vault management support
    this.version(2).stores({
      documents: 'metadata.id, metadata.modified, metadata.vaultId',
      nodes: 'id, mapId, vaultId, modified',
      settings: 'id',
      errorLogs: 'id, timestamp',
      providerMetadata: 'id, documentId, providerId, lastSyncedAt, syncStatus',
      repositories: 'repositoryId, lastUpdated',
      centralIndex: 'id', // NEW: Central vault index
      vaultMetadata: 'id, folderId, isActive', // NEW: Individual vault metadata
      vaultsIndex: 'id' // NEW: Vaults index (.vaults file)
    }).upgrade(tx => {
      // Migration logic from v1 to v2
      // Create default central index for existing users
      const defaultCentralIndex: CentralIndex = {
        id: 'central',
        version: '1.0',
        lastUpdated: Date.now(),
        vaults: {
          'default-vault': {
            id: 'default-vault',
            name: 'My Vault',
            description: 'Default vault created during migration',
            created: Date.now(),
            modified: Date.now(),
            folderId: '', // Will be populated during first sync
            repositoryFileId: '', // Will be populated during first sync
            fileCount: 0,
            folderCount: 0,
            size: 0,
            isActive: true
          }
        }
      };

      // Store default central index
      void tx.table('centralIndex').add(defaultCentralIndex);

      // Store default vault metadata
      void tx.table('vaultMetadata').add(defaultCentralIndex.vaults['default-vault']);
    });

    // Version 3 - Add file system support
    this.version(3).stores({
      documents: 'metadata.id, metadata.modified, metadata.vaultId',
      nodes: 'id, mapId, vaultId, modified',
      settings: 'id',
      errorLogs: 'id, timestamp',
      providerMetadata: 'id, documentId, providerId, lastSyncedAt, syncStatus',
      repositories: 'repositoryId, lastUpdated',
      centralIndex: 'id',
      vaultMetadata: 'id, folderId, isActive',
      vaultsIndex: 'id',
      fileSystem: 'id, vaultId, parentId, type, name' // NEW: File system items
    }).upgrade(async (tx) => {
      // Migration logic from v2 to v3
      // Create fileSystem table (empty initially)
      console.log('🗄️ [IndexedDB] Migrated to version 3 with file system support')

      // Ensure the fileSystem store is properly created
      const fileSystemTable = tx.table('fileSystem')
      await fileSystemTable.toArray() // This ensures the store is accessible
    })

    // Version 4 - Ensure fileSystem store exists for databases that might have missed v3 migration
    this.version(4).stores({
      documents: 'metadata.id, metadata.modified, metadata.vaultId',
      nodes: 'id, mapId, vaultId, modified',
      settings: 'id',
      errorLogs: 'id, timestamp',
      providerMetadata: 'id, documentId, providerId, lastSyncedAt, syncStatus',
      repositories: 'repositoryId, lastUpdated',
      centralIndex: 'id',
      vaultMetadata: 'id, folderId, isActive',
      vaultsIndex: 'id',
      fileSystem: 'id, vaultId, parentId, type, name'
    }).upgrade(async (tx) => {
      // Ensure the fileSystem store is properly created and accessible
      const fileSystemTable = tx.table('fileSystem')
      await fileSystemTable.toArray() // This ensures the store is accessible
      console.log('🗄️ [IndexedDB] Version 4: Ensured fileSystem store exists')
    })

    // Version 5 - Add sortOrder field to fileSystem for user-defined ordering
    this.version(5).stores({
      documents: 'metadata.id, metadata.modified, metadata.vaultId',
      nodes: 'id, mapId, vaultId, modified',
      settings: 'id',
      errorLogs: 'id, timestamp',
      providerMetadata: 'id, documentId, providerId, lastSyncedAt, syncStatus',
      repositories: 'repositoryId, lastUpdated',
      centralIndex: 'id',
      vaultMetadata: 'id, folderId, isActive',
      vaultsIndex: 'id',
      fileSystem: 'id, vaultId, parentId, type, name, sortOrder'
    }).upgrade(async (tx) => {
      // Add sortOrder to existing items
      const fileSystemTable = tx.table('fileSystem')
      const allItems = await fileSystemTable.toArray()

      // Group items by parentId
      const itemsByParent = new Map<string | null, typeof allItems>()
      for (const item of allItems) {
        const parentId = item.parentId
        if (!itemsByParent.has(parentId)) {
          itemsByParent.set(parentId, [])
        }
        itemsByParent.get(parentId)!.push(item)
      }

      // Assign sortOrder to each group
      for (const [, items] of itemsByParent) {
        items.sort((a, b) => a.name.localeCompare(b.name)) // Initial sort by name
        for (let i = 0; i < items.length; i++) {
          await fileSystemTable.update(items[i]!.id, { sortOrder: i })
        }
      }

      console.log('🗄️ [IndexedDB] Version 5: Added sortOrder to fileSystem items')
    })

    // Version 6 - Migrate vaults from centralIndex to vaultsIndex
    this.version(6).stores({
      documents: 'metadata.id, metadata.modified, metadata.vaultId',
      nodes: 'id, mapId, vaultId, modified',
      settings: 'id',
      errorLogs: 'id, timestamp',
      providerMetadata: 'id, documentId, providerId, lastSyncedAt, syncStatus',
      repositories: 'repositoryId, lastUpdated',
      centralIndex: 'id',
      vaultMetadata: 'id, folderId, isActive',
      vaultsIndex: 'id',
      fileSystem: 'id, vaultId, parentId, type, name, sortOrder'
    }).upgrade(async (tx) => {
      console.log('🗄️ [IndexedDB] Version 6: Migrating vaults from centralIndex to vaultsIndex')

      // Get centralIndex
      const centralIndexTable = tx.table('centralIndex')
      const centralIndex = await centralIndexTable.get('central') as CentralIndex | undefined

      if (centralIndex && centralIndex.vaults) {
        // Convert vaults from Record to Array
        const vaultsArray: VaultMetadata[] = Object.values(centralIndex.vaults)

        // Create vaultsIndex
        const vaultsIndexTable = tx.table('vaultsIndex')
        const vaultsIndex: VaultsIndex = {
          id: 'vaults',
          version: '1.0',
          lastUpdated: Date.now(),
          vaults: vaultsArray
        }

        await vaultsIndexTable.put(vaultsIndex)
        console.log('🗄️ [IndexedDB] Migrated', vaultsArray.length, 'vaults to vaultsIndex')
      } else {
        // Create empty vaultsIndex if no centralIndex exists
        const vaultsIndexTable = tx.table('vaultsIndex')
        const vaultsIndex: VaultsIndex = {
          id: 'vaults',
          version: '1.0',
          lastUpdated: Date.now(),
          vaults: []
        }
        await vaultsIndexTable.put(vaultsIndex)
        console.log('🗄️ [IndexedDB] Created empty vaultsIndex')
      }
    })

    // Future versions can be added here:
    // this.version(7).stores({ ... }).upgrade(tx => { ... });
  }
}

// Singleton instance
export const db = new MindPadDB();
