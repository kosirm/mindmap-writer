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
  providerMetadata!: Table<ProviderMetadata, string>; // NEW: Multi-provider support
  repositories!: Table<Repository, string>; // NEW: Store .repository.json locally

  constructor() {
    super('MindScribbleDB');

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
export const db = new MindScribbleDB();
