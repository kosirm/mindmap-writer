/**
 * IndexedDB service using Dexie.js
 * Provider-aware design for multi-backend support (Phase 2 ready)
 */

import Dexie, { type Table } from 'dexie';
import type { MindscribbleDocument, MindscribbleNode } from '../types';

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
 * MindScribble IndexedDB using Dexie.js
 *
 * Dexie handles schema versioning, migrations, and provides a clean API.
 *
 * FUTURE-PROOF DESIGN:
 * - providerMetadata table supports multiple storage backends (Phase 2)
 * - Documents can sync to multiple providers simultaneously
 * - repositories table stores .repository.json for partial sync
 * - Easy to add GitHub, Dropbox, S3, etc. without schema changes
 */
export class MindScribbleDB extends Dexie {
  documents!: Table<MindscribbleDocument, string>;
  nodes!: Table<MindscribbleNode, string>;
  settings!: Table<DatabaseSettings, string>;
  errorLogs!: Table<ErrorLog, string>;
  providerMetadata!: Table<ProviderMetadata, string>; // Multi-provider support
  repositories!: Table<Repository, string>; // Store .repository.json locally
  centralIndex!: Table<CentralIndex, string>; // NEW: Store central vault index
  vaultMetadata!: Table<VaultMetadata, string>; // NEW: Store individual vault metadata

  constructor() {
    super('MindScribbleDB');

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
      vaultMetadata: 'id, folderId, isActive' // NEW: Individual vault metadata
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

    // Future versions can be added here:
    // this.version(3).stores({ ... }).upgrade(tx => { ... });
  }
}

// Singleton instance
export const db = new MindScribbleDB();
