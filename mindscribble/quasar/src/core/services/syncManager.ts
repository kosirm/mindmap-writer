// mindpad/quasar/src/core/services/syncManager.ts
import { db } from './indexedDBService';
import { updateMindmapFile, loadMindmapFile, createMindmapFile, getOrCreateAppFolder, findCentralIndexFile, loadJsonFile } from './googleDriveService';
import { NetworkError, StorageError } from '../errors';
import type { MindpadDocument } from '../types';
import type { ProviderMetadata, Repository, RepositoryFile, CentralIndex, VaultMetadata } from './indexedDBService';

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
      const metadata: Omit<ProviderMetadata, 'id'> & { id: string } = {
        id: `${doc.metadata.id}:${this.currentProvider}`,
        documentId: doc.metadata.id,
        providerId: this.currentProvider,
        syncStatus: 'pending'
      };

      if (providerFileId) {
        metadata.providerFileId = providerFileId;
      }

      metadata.lastSyncedAt = Date.now();

      await db.providerMetadata.put(metadata);
    } catch (error: unknown) {
      const err = error as Error;
      throw new StorageError('Failed to save to IndexedDB', {
        documentId: doc.metadata.id,
        error: err.message
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
  async loadDocument(documentId: string, providerFileId?: string): Promise<MindpadDocument> {
    // 1. Try IndexedDB first (fast)
    let doc = await db.documents.get(documentId);

    if (doc) {
      // 2. Sync from provider in background if we have providerFileId
      if (providerFileId) {
        void this.syncFromProviderInBackground(documentId, providerFileId).catch(console.error);
      }
      return doc;
    }

    // 3. If not in IndexedDB, load from provider
    if (providerFileId) {
      doc = await this.loadFromProvider(providerFileId);
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
      return doc;
    }

    throw new StorageError('Document not found', { documentId });
  }

  /**
   * Queue document for provider sync
   */
  private queueProviderSync(documentId: string): void {
    this.syncQueue.add(documentId);

    // Start sync process if not already running
    if (!this.isSyncing) {
      void this.processSyncQueue().catch(console.error);
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
    if (documentId) {
      this.syncQueue.delete(documentId);
    }

    try {
      if (documentId) {
        const doc = await db.documents.get(documentId);
        if (doc) {
          await this.syncToProvider(doc);
        }
      }
    } catch (error: unknown) {
      console.error('Failed to sync to provider:', error);

      // Update sync status to error
      await db.providerMetadata.update(`${documentId}:${this.currentProvider}`, {
        syncStatus: 'error',
        syncError: error instanceof Error ? error.message : 'Unknown error'
      });

      // Don't throw - continue with next item
    }

    // Process next item
    setTimeout(() => { void this.processSyncQueue().catch(console.error); }, 100);
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
      const updateData: Partial<ProviderMetadata> = {
        lastSyncedAt: Date.now(),
        syncStatus: 'synced'
      };
      // Remove syncError by setting it to undefined separately if needed
      await db.providerMetadata.update(`${doc.metadata.id}:${this.currentProvider}`, updateData);
    } catch (error: unknown) {
      // Update sync status to error
      await db.providerMetadata.update(`${doc.metadata.id}:${this.currentProvider}`, {
        syncStatus: 'error',
        syncError: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new NetworkError('Failed to sync to provider', {
        documentId: doc.metadata.id,
        provider: this.currentProvider,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Sync to Google Drive (current implementation)
   */
  private async syncToGoogleDrive(doc: MindpadDocument): Promise<void> {
    const fileId = this.getProviderFileId(doc);
    if (fileId) {
      await updateMindmapFile(fileId, doc);
    } else {
      // Create new file if no fileId exists
      const folderId = await getOrCreateAppFolder();
      await createMindmapFile(folderId, doc.metadata.name || 'Untitled', doc);
    }
  }

  /**
   * Load document from current provider
   */
  private async loadFromProvider(providerFileId: string): Promise<MindpadDocument> {
    try {
      // For now, only Google Drive is implemented
      if (this.currentProvider === 'googleDrive') {
        return await loadMindmapFile(providerFileId);
      }
      // Phase 2: Add other providers

      throw new NetworkError('Provider not implemented', { providerId: this.currentProvider });
    } catch (error: unknown) {
      throw new NetworkError('Failed to load from provider', {
        providerId: this.currentProvider,
        providerFileId,
        error: error instanceof Error ? error.message : 'Unknown error'
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
        const resolution = this.showConflictDialog(changes.conflicts);
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
    return JSON.parse(repoFile as unknown as string);
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
      } else if (remoteFile && localFile && remoteFile.timestamp > localFile.timestamp) {
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

        if (localFile && !localFile.deleted) {
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
  private showConflictDialog(conflicts: FileConflict[]): ConflictResolution {
    // This will be implemented in the UI layer
    // For now, return a default resolution
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _conflicts = conflicts; // Keep parameter for future implementation
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
      await db.documents.put(doc);
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

  /**
   * Upload file to current provider
   */
  private uploadToProvider(path: string, content: string): Promise<void> {
    // For now, only Google Drive is implemented
    if (this.currentProvider === 'googleDrive') {
      // TODO: Implement Google Drive file upload
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _content = content; // Keep parameter for future implementation
      console.log(`Upload to Google Drive: ${path}`);
    }
    return Promise.resolve();
  }

  /**
   * Delete file from current provider
   */
  private deleteFromProvider(path: string): Promise<void> {
    // For now, only Google Drive is implemented
    if (this.currentProvider === 'googleDrive') {
      // TODO: Implement Google Drive file deletion
      console.log(`Delete from Google Drive: ${path}`);
    }
    return Promise.resolve();
  }

  /**
   * Update local .repository.json in IndexedDB
   */
  private async updateLocalRepository(vaultId: string, remoteRepo: Repository): Promise<void> {
    await db.repositories.put({
      ...remoteRepo,
      repositoryId: vaultId
    });
  }

  /**
   * Apply conflict resolution to sync changes
   */
  private applyConflictResolution(changes: SyncChanges, resolution: ConflictResolution): void {
    // TODO: Implement conflict resolution logic
    // For now, just remove conflicts from the changes
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _resolution = resolution; // Keep parameter for future implementation
    changes.conflicts = [];
  }

  /**
   * Download central index from Google Drive and store in IndexedDB
   */
  async downloadCentralIndex(): Promise<CentralIndex> {
    try {
      const appFolderId = await getOrCreateAppFolder();

      // Check if central index file exists
      const existingFile = await findCentralIndexFile(appFolderId);

      if (existingFile) {
        // Download existing central index
        const centralIndex = await loadJsonFile<CentralIndex>(existingFile.id);

        // Store in IndexedDB
        const centralIndexWithId = { ...centralIndex, id: 'central' };
        await db.centralIndex.put(centralIndexWithId);

        // Store individual vault metadata
        for (const vaultId in centralIndex.vaults) {
          const vault = centralIndex.vaults[vaultId];
          if (vault) {
            await db.vaultMetadata.put(vault);
          }
        }

        console.log('✅ Central index downloaded and stored');
        return centralIndex;
      } else {
        // Create default central index for new users
        return this.createDefaultCentralIndex();
      }
    } catch (error: unknown) {
      console.error('❌ Failed to download central index:', error);

      // If download fails, try to use cached version or create default
      const cachedIndex = await db.centralIndex.get('central');
      if (cachedIndex) {
        console.log('ℹ️ Using cached central index');
        return cachedIndex;
      }

      // Create default central index as fallback
      return this.createDefaultCentralIndex();
    }
  }

  /**
   * Create default central index for new users
   */
  async createDefaultCentralIndex(): Promise<CentralIndex> {
    const appFolderId = await getOrCreateAppFolder();

    const defaultCentralIndex: CentralIndex = {
      id: 'central',
      version: '1.0',
      lastUpdated: Date.now(),
      vaults: {
        'default-vault': {
          id: 'default-vault',
          name: 'My Vault',
          description: 'Default vault',
          created: Date.now(),
          modified: Date.now(),
          folderId: appFolderId,
          repositoryFileId: '', // Will be set after first sync
          fileCount: 0,
          folderCount: 0,
          size: 0,
          isActive: true
        }
      }
    };

    // Store in IndexedDB
    await db.centralIndex.put(defaultCentralIndex);
    const defaultVault = defaultCentralIndex.vaults['default-vault'];
    if (defaultVault) {
      await db.vaultMetadata.put(defaultVault);
    }

    console.log('✅ Default central index created');
    return defaultCentralIndex;
  }

  /**
   * Sync central index to Google Drive
   */
  async syncCentralIndexToDrive(centralIndex: CentralIndex): Promise<void> {
    try {
      const appFolderId = await getOrCreateAppFolder();

      // Check if central index file exists
      const existingFile = await findCentralIndexFile(appFolderId);

      if (existingFile) {
        // Update existing file
        await updateMindmapFile(existingFile.id, centralIndex);
        console.log('✅ Central index updated on Google Drive');
      } else {
        // Create new file
        await createMindmapFile(appFolderId, '.mindpad', centralIndex);
        console.log('✅ Central index created on Google Drive');
      }

      // Update sync status
      await db.providerMetadata.put({
        id: 'central:googleDrive',
        documentId: 'central',
        providerId: this.currentProvider,
        lastSyncedAt: Date.now(),
        syncStatus: 'synced'
      });
    } catch (error: unknown) {
      console.error('❌ Failed to sync central index to Google Drive:', error);

      // Update sync status to error
      await db.providerMetadata.put({
        id: 'central:googleDrive',
        documentId: 'central',
        providerId: this.currentProvider,
        lastSyncedAt: Date.now(),
        syncStatus: 'error',
        syncError: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new NetworkError('Failed to sync central index', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update central index when vault metadata changes
   */
  async updateCentralIndex(vaultId: string, updates: Partial<VaultMetadata>): Promise<void> {
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

      // Sync to Google Drive if online
      if (navigator.onLine) {
        await this.syncCentralIndexToDrive(centralIndex);
      }
    } else {
      console.warn(`Vault ${vaultId} not found in central index`);
    }
  }

  /**
   * Find active vault ID from central index
   */
  async findActiveVaultId(): Promise<string | undefined> {
    const centralIndex = await db.centralIndex.get('central');

    if (!centralIndex) {
      return undefined;
    }

    // Find first vault marked as active
    for (const vaultId in centralIndex.vaults) {
      const vault = centralIndex.vaults[vaultId];
      if (vault?.isActive) {
        return vaultId;
      }
    }

    // If no active vault, return first vault
    const vaultIds = Object.keys(centralIndex.vaults);
    return vaultIds.length > 0 ? vaultIds[0] : undefined;
  }

  /**
   * Initialize sync with central index support
   */
  async initializeSync(): Promise<void> {
    // 1. Download central index
    const centralIndex = await this.downloadCentralIndex();

    // 2. Find active vault
    const activeVaultId = await this.findActiveVaultId();

    if (activeVaultId) {
      const activeVault = centralIndex.vaults[activeVaultId];

      // 3. Download active vault's repository
      if (activeVault?.repositoryFileId) {
        await this.performPartialSync(activeVaultId);
      } else {
        console.log('ℹ️ Active vault has no repository file ID yet');
      }
    } else {
      console.log('ℹ️ No active vault found');
    }
  }
}

// Types for partial sync (using imported types from indexedDBService)
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
