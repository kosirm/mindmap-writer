# Storage and Indexing Architecture

## Overview

MindScribble uses a **hybrid storage architecture** combining Google Drive (source of truth) with IndexedDB (local cache/index) for optimal performance and user data ownership.

## Core Principles

1. **Google Drive = Source of Truth**
   - All maps stored as JSON files in user's Google Drive
   - User owns their data
   - 15 GB free storage per Google account
   - Works across devices

2. **IndexedDB = Local Cache & Search Index**
   - Fast local access (50ms search vs 200s without index)
   - Single IndexedDB for entire app, one vault cached at a time
   - Compressed storage (60% space savings)
   - Offline support

3. **Per-Vault Indexing Strategy**
   - One vault active at a time (like Obsidian)
   - When switching vaults: clear old vault cache, index new vault
   - Only current vault is cached in IndexedDB (~100 MB)
   - Keeps IndexedDB small and fast

4. **Incremental Cache Updates**
   - Update cache immediately on file save (10-20ms)
   - Background sync with service worker
   - Periodic full re-index (on demand or if corruption detected)
   - Only re-index changed files during sync

5. **Optimized Indexing Performance**
   - Parallel processing (20 maps concurrently)
   - Batch IndexedDB writes (single transaction)
   - Progressive indexing (first results in 1 second)
   - Full vault index in 6-8 seconds (1000 maps)

6. **User-Configurable Compression**
   - Users control compression level
   - Trade-off between storage and search depth
   - Clear feedback on storage savings
   - Re-indexing with progress indication

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    MindScribble App                          │
├─────────────────────────────────────────────────────────────┤
│  Pinia Store (in-memory state)                              │
│  ↕                                                           │
│  IndexedDB Cache (Single DB, One Vault at a Time)          │
│  ├─ maps (with vaultId index)                              │
│  ├─ nodes (with vaultId, mapId indexes)                    │
│  ├─ backlinks (with vaultId index)                         │
│  ├─ vaults (list of all vaults)                            │
│  └─ settings (app settings)                                 │
│  ↕                                                           │
│  Vault Manager                                              │
│  ├─ Switch vault (clear old, index new)                    │
│  ├─ Parallel indexing (20 concurrent)                      │
│  ├─ Progressive results (1s to first results)              │
│  └─ Background sync (service worker)                        │
│  ↕                                                           │
│  Storage Adapter Interface                                  │
│  ├─ GoogleDriveAdapter (web)                               │
│  └─ LocalFilesystemAdapter (electron)                      │
│  ↕                                                           │
│  Google Drive / Local Filesystem                            │
│  └─ Vaults/                                                 │
│     ├─ vault-1/ (Personal)                                  │
│     │  ├─ map-123.json                                      │
│     │  ├─ map-456.json                                      │
│     │  └─ .vault-metadata.json                              │
│     ├─ vault-2/ (Work)                                      │
│     │  └─ ...                                                │
│     └─ vault-3/ (Research)                                  │
│        └─ ...                                                │
└─────────────────────────────────────────────────────────────┘

Vault Switching Flow:
1. User switches from Vault 1 to Vault 2
2. Clear Vault 1 data from IndexedDB
3. Index Vault 2 (6-8s for 1000 maps, 1s for first results)
4. User can search/work immediately after first batch
```

## Data Structures

### IndexedDB Schema (Single Database for Entire App)

```typescript
// Database name: 'mindscribble'
// Only ONE vault is cached at a time

interface MindScribbleDB {
  // Store 1: Maps metadata (filtered by vaultId)
  maps: {
    id: string              // Primary key
    vaultId: string         // Index: which vault (only current vault cached)
    title: string
    modified: number
    nodeCount: number
    lastIndexed: number     // Track when indexed
  }

  // Store 2: Nodes (for search and content)
  nodes: {
    id: string              // Primary key
    mapId: string           // Index: for map lookup
    vaultId: string         // Index: which vault (only current vault cached)
    title: string           // Uncompressed (for search)
    searchableContent: string        // First N chars uncompressed
    contentCompressed: Uint8Array    // Full content compressed
    contentLength: number   // Original size
    links: Link[]
    modified: number
  }

  // Store 3: Backlinks (reverse index)
  backlinks: {
    targetNodeId: string    // Primary key
    vaultId: string         // Index: which vault (only current vault cached)
    sourceLinks: Array<{
      mapId: string
      nodeId: string
    }>
  }

  // Store 4: Vaults (list of ALL vaults, always persisted)
  vaults: {
    id: string              // Primary key
    name: string
    location: 'drive' | 'local'
    path: string            // Drive folder ID or local path
    created: number
    lastOpened: number
    mapCount: number        // For UI display
    totalSize: number       // Estimated size
  }

  // Store 5: Settings (app-wide settings, always persisted)
  settings: {
    key: string             // Primary key
    value: any
  }
}

// IndexedDB initialization
const db = await openDB('mindscribble', 1, {
  upgrade(db) {
    // Maps store
    const mapsStore = db.createObjectStore('maps', { keyPath: 'id' })
    mapsStore.createIndex('vaultId', 'vaultId')

    // Nodes store
    const nodesStore = db.createObjectStore('nodes', { keyPath: 'id' })
    nodesStore.createIndex('vaultId', 'vaultId')
    nodesStore.createIndex('mapId', 'mapId')

    // Backlinks store
    const backlinksStore = db.createObjectStore('backlinks', { keyPath: 'targetNodeId' })
    backlinksStore.createIndex('vaultId', 'vaultId')

    // Vaults store (no index needed)
    db.createObjectStore('vaults', { keyPath: 'id' })

    // Settings store (no index needed)
    db.createObjectStore('settings', { keyPath: 'key' })
  }
})
```

### Google Drive Structure

```
Google Drive/
└─ MindScribble/
   ├─ vault-1/
   │  ├─ .vault-metadata.json
   │  ├─ map-abc123.json
   │  ├─ map-def456.json
   │  └─ ...
   └─ vault-2/
      ├─ .vault-metadata.json
      └─ ...
```

### Map File Format (JSON)

```json
{
  "id": "map-abc123",
  "vaultId": "vault-1",
  "title": "My Mind Map",
  "created": 1702800000000,
  "modified": 1702800000000,
  "nodes": [
    {
      "id": "node-1",
      "title": "Node Title",
      "content": "<p>Rich text content...</p>",
      "position": { "x": 100, "y": 200 },
      "links": [
        {
          "type": "internal",
          "targetMap": "map-def456",
          "targetNode": "node-5"
        }
      ],
      "created": 1702800000000,
      "modified": 1702800000000
    }
  ]
}
```

## Compression Strategy

### Hybrid Compression Approach

Store both searchable preview (uncompressed) and full content (compressed):

```typescript
interface NodeIndex {
  id: string
  mapId: string
  title: string                    // Uncompressed (50 bytes)
  searchableContent: string        // First N chars uncompressed (500 bytes default)
  contentCompressed: Uint8Array    // Full content gzipped (~20% of original)
  contentLength: number            // Original size
  links: Link[]
  modified: number
}
```

### Storage Calculation

```
Per node (with 2000 chars content):
- title: 50 bytes
- searchableContent: 500 bytes (uncompressed)
- contentCompressed: 400 bytes (2000 chars → 400 bytes with gzip)
- metadata: 100 bytes
Total: ~1 KB per node (vs 2.5 KB uncompressed)

100,000 nodes × 1 KB = 100 MB (vs 250 MB uncompressed)
Savings: 60% reduction
```

### Compression Implementation

```typescript
class CompressedSearchIndex {
  
  /**
   * Compress string using native browser API
   */
  async compress(text: string): Promise<Uint8Array> {
    if ('CompressionStream' in window) {
      const blob = new Blob([text])
      const stream = blob.stream()
      const compressedStream = stream.pipeThrough(
        new CompressionStream('gzip')
      )
      const compressedBlob = await new Response(compressedStream).blob()
      const buffer = await compressedBlob.arrayBuffer()
      return new Uint8Array(buffer)
    } else {
      // Fallback to Pako library
      const pako = await import('pako')
      return pako.gzip(text)
    }
  }
  
  /**
   * Decompress back to string
   */
  async decompress(compressed: Uint8Array): Promise<string> {
    if ('DecompressionStream' in window) {
      const blob = new Blob([compressed])
      const stream = blob.stream()
      const decompressedStream = stream.pipeThrough(
        new DecompressionStream('gzip')
      )
      const decompressedBlob = await new Response(decompressedStream).blob()
      return await decompressedBlob.text()
    } else {
      const pako = await import('pako')
      return pako.ungzip(compressed, { to: 'string' })
    }
  }

  /**
   * Store node with compression
   */
  async storeNode(node: Node, settings: CompressionSettings) {
    const searchableContent = node.content?.substring(
      0,
      settings.searchableContentLength
    ) || ''

    let contentCompressed: Uint8Array | null = null

    if (settings.enabled && node.content) {
      contentCompressed = await this.compress(node.content)
    }

    await this.db.put('nodes', {
      id: node.id,
      mapId: node.mapId,
      vaultId: node.vaultId,
      title: node.title,
      searchableContent: searchableContent,
      contentCompressed: contentCompressed,
      contentUncompressed: settings.enabled ? null : node.content,
      contentLength: node.content?.length || 0,
      links: node.links,
      modified: node.modified
    })
  }

  /**
   * Retrieve and decompress node content
   */
  async getNodeFullContent(nodeId: string): Promise<string> {
    const node = await this.db.get('nodes', nodeId)

    if (node.contentUncompressed) {
      return node.contentUncompressed  // Not compressed
    } else if (node.contentCompressed) {
      return await this.decompress(node.contentCompressed)
    }

    return ''
  }
}
```

### Compression Presets

```typescript
interface CompressionSettings {
  enabled: boolean
  searchableContentLength: number
  compressionLevel: 'none' | 'balanced' | 'aggressive'
}

const COMPRESSION_PRESETS = {
  none: {
    enabled: false,
    searchableContentLength: 0,
    description: 'No compression - fastest search, largest storage'
  },
  balanced: {
    enabled: true,
    searchableContentLength: 500,
    description: 'Compress content, keep 500 chars searchable (recommended)'
  },
  aggressive: {
    enabled: true,
    searchableContentLength: 200,
    description: 'Maximum compression - smallest storage, limited search'
  }
}
```

### Storage Estimates by Preset

| User Type | Maps | Nodes | None | Balanced | Aggressive |
|-----------|------|-------|------|----------|------------|
| Average | 100 | 10,000 | 25 MB | **10 MB** | **8 MB** |
| Power | 1,000 | 100,000 | 250 MB | **100 MB** | **80 MB** |
| Extreme | 5,000 | 500,000 | 1.25 GB | **500 MB** | **400 MB** |

**All well within IndexedDB limits (10-50 GB)!**

## Vault Switching & Indexing Strategy

### Vault Switching Flow

```typescript
class VaultManager {
  private currentVaultId: string | null = null

  /**
   * Switch to a different vault
   */
  async switchVault(newVaultId: string) {
    const oldVaultId = this.currentVaultId

    // 1. Clear old vault data from IndexedDB
    if (oldVaultId && oldVaultId !== newVaultId) {
      await this.clearVaultCache(oldVaultId)
    }

    // 2. Set new current vault
    this.currentVaultId = newVaultId

    // 3. Update vault metadata
    await this.updateVaultLastOpened(newVaultId)

    // 4. Index new vault (parallel + progressive)
    await this.indexVaultWithProgress(newVaultId)

    return { ready: true }
  }

  /**
   * Clear all data for a vault from IndexedDB
   */
  async clearVaultCache(vaultId: string) {
    const tx = this.db.transaction(['maps', 'nodes', 'backlinks'], 'readwrite')

    // Delete all maps for this vault
    await this.deleteByVaultId(tx.objectStore('maps'), vaultId)

    // Delete all nodes for this vault
    await this.deleteByVaultId(tx.objectStore('nodes'), vaultId)

    // Delete all backlinks for this vault
    await this.deleteByVaultId(tx.objectStore('backlinks'), vaultId)

    await tx.complete
  }

  private async deleteByVaultId(store: IDBObjectStore, vaultId: string) {
    const index = store.index('vaultId')
    let cursor = await index.openCursor(IDBKeyRange.only(vaultId))

    while (cursor) {
      await cursor.delete()
      cursor = await cursor.continue()
    }
  }
}
```

### Incremental Cache Updates (On File Save)

```typescript
/**
 * Save map and update cache immediately
 */
async function saveMap(mapData: MindScribbleDocument) {
  // 1. Save to Drive/local (source of truth)
  await storageAdapter.writeFile(mapData.vaultId, mapData.id, mapData)

  // 2. Update cache immediately (10-20ms)
  await searchIndex.updateMapIndex(mapData)

  // User sees changes instantly in search!
}

/**
 * Update a single map in the index (incremental)
 */
async function updateMapIndex(mapData: MindScribbleDocument) {
  const tx = this.db.transaction(['maps', 'nodes', 'backlinks'], 'readwrite')

  // 1. Update map metadata
  await tx.objectStore('maps').put({
    id: mapData.id,
    vaultId: mapData.vaultId,
    title: mapData.title,
    modified: mapData.modified,
    nodeCount: mapData.nodes.length,
    lastIndexed: Date.now()
  })

  // 2. Get existing nodes for this map
  const existingNodeIds = await this.getNodeIdsForMap(mapData.id)

  // 3. Update/add nodes (batch)
  const currentNodeIds = new Set<string>()
  const nodesToStore = []

  for (const node of mapData.nodes) {
    currentNodeIds.add(node.id)

    const searchableContent = node.content?.substring(0, 500) || ''
    const contentCompressed = node.content
      ? await this.compress(node.content)
      : null

    nodesToStore.push({
      id: node.id,
      mapId: mapData.id,
      vaultId: mapData.vaultId,
      title: node.title,
      searchableContent: searchableContent,
      contentCompressed: contentCompressed,
      contentLength: node.content?.length || 0,
      links: node.links,
      modified: node.modified
    })
  }

  // Batch insert nodes
  const nodeStore = tx.objectStore('nodes')
  for (const node of nodesToStore) {
    await nodeStore.put(node)
  }

  // 4. Update backlinks
  await this.updateBacklinksForMap(mapData, tx)

  // 5. Remove deleted nodes
  const deletedNodeIds = existingNodeIds.filter(id => !currentNodeIds.has(id))
  for (const nodeId of deletedNodeIds) {
    await nodeStore.delete(nodeId)
    await this.removeBacklinks(nodeId, tx)
  }

  await tx.complete
}
```

### Background Sync with Service Worker

```typescript
// service-worker.js
self.addEventListener('message', async (event) => {
  if (event.data.type === 'background-sync') {
    const vaultId = event.data.vaultId

    // Get all Drive files
    const driveFiles = await driveAdapter.listFiles(vaultId)

    // Get indexed maps
    const db = await openDB('mindscribble', 1)
    const tx = db.transaction('maps', 'readonly')
    const index = tx.objectStore('maps').index('vaultId')
    const indexedMaps = await index.getAll(IDBKeyRange.only(vaultId))

    // Find files that need re-indexing
    const toSync = []
    const driveIds = new Set(driveFiles.map(f => f.id))

    for (const driveFile of driveFiles) {
      const indexed = indexedMaps.find(m => m.id === driveFile.id)
      if (!indexed || driveFile.modifiedTime > indexed.lastIndexed) {
        toSync.push(driveFile)
      }
    }

    // Find deleted files
    const deletedMaps = indexedMaps.filter(m => !driveIds.has(m.id))

    // Sync changed files
    for (let i = 0; i < toSync.length; i++) {
      const file = toSync[i]
      const mapData = await driveAdapter.readFile(vaultId, file.id)
      await searchIndex.updateMapIndex(mapData)

      self.postMessage({
        type: 'sync-progress',
        current: i + 1,
        total: toSync.length
      })
    }

    // Remove deleted files from cache
    for (const deletedMap of deletedMaps) {
      await searchIndex.removeMapIndex(deletedMap.id)
    }

    self.postMessage({ type: 'sync-complete' })
  }
})

// Main app: trigger background sync periodically
setInterval(() => {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'background-sync',
      vaultId: currentVaultId
    })
  }
}, 5 * 60 * 1000)  // Every 5 minutes
```

## Optimized Parallel Indexing

### Full Vault Indexing (with Parallel Processing & Progressive Results)

```typescript
class VaultIndexer {
  private readonly BATCH_SIZE = 20  // Process 20 maps concurrently

  /**
   * Index entire vault with parallel processing and progressive results
   */
  async indexVaultWithProgress(vaultId: string) {
    const startTime = Date.now()

    // 1. List all files (single API call)
    const files = await storageAdapter.listFiles(vaultId)
    console.log(`Found ${files.length} maps to index`)

    // Emit initial progress
    this.emit('indexing-started', {
      vaultId: vaultId,
      total: files.length
    })

    // 2. Sort by recently modified (user likely wants these first)
    files.sort((a, b) => b.modifiedTime - a.modifiedTime)

    let processed = 0
    let firstBatchComplete = false

    // 3. Process in batches (parallel)
    for (let i = 0; i < files.length; i += this.BATCH_SIZE) {
      const batch = files.slice(i, i + this.BATCH_SIZE)

      // Process batch in parallel
      await Promise.all(batch.map(async (file) => {
        try {
          // Download and parse
          const mapData = await storageAdapter.readFile(vaultId, file.id)

          // Index (compress + store)
          await this.indexMap(mapData)

          processed++
        } catch (error) {
          console.error(`Failed to index ${file.name}:`, error)
        }
      }))

      // After first batch, user can start searching!
      if (!firstBatchComplete) {
        firstBatchComplete = true
        this.emit('search-ready', {
          indexed: processed,
          total: files.length
        })
      }

      // Report progress
      const percentage = Math.round((processed / files.length) * 100)
      const elapsed = Date.now() - startTime
      const estimatedTotal = (elapsed / processed) * files.length
      const remaining = estimatedTotal - elapsed

      this.emit('indexing-progress', {
        current: processed,
        total: files.length,
        percentage: percentage,
        elapsed: elapsed,
        remaining: remaining
      })

      // Allow UI to update
      await new Promise(resolve => setTimeout(resolve, 0))
    }

    const totalTime = Date.now() - startTime
    console.log(`Indexed ${files.length} maps in ${totalTime}ms`)

    this.emit('indexing-complete', {
      vaultId: vaultId,
      total: files.length,
      time: totalTime
    })
  }

  /**
   * Index a single map (with batch operations)
   */
  private async indexMap(mapData: MindScribbleDocument) {
    const tx = this.db.transaction(['maps', 'nodes', 'backlinks'], 'readwrite')

    // 1. Store map metadata
    await tx.objectStore('maps').put({
      id: mapData.id,
      vaultId: mapData.vaultId,
      title: mapData.title,
      modified: mapData.modified,
      nodeCount: mapData.nodes.length,
      lastIndexed: Date.now()
    })

    // 2. Batch compress nodes (parallel)
    const compressedNodes = await Promise.all(
      mapData.nodes.map(async (node) => {
        const searchableContent = node.content?.substring(0, 500) || ''

        // Only compress if content is larger than preview
        const contentCompressed = (node.content && node.content.length > 500)
          ? await this.compress(node.content)
          : null

        return {
          id: node.id,
          mapId: mapData.id,
          vaultId: mapData.vaultId,
          title: node.title,
          searchableContent: searchableContent,
          contentCompressed: contentCompressed,
          contentUncompressed: contentCompressed ? null : node.content,
          contentLength: node.content?.length || 0,
          links: node.links,
          modified: node.modified
        }
      })
    )

    // 3. Batch insert nodes (single transaction)
    const nodeStore = tx.objectStore('nodes')
    const insertPromises = compressedNodes.map(node => nodeStore.put(node))
    await Promise.all(insertPromises)

    // 4. Update backlinks
    await this.updateBacklinksForMap(mapData, tx)

    // 5. Commit transaction
    await tx.complete
  }

  /**
   * Compress with CompressionStream API
   */
  private async compress(text: string): Promise<Uint8Array> {
    if ('CompressionStream' in window) {
      const blob = new Blob([text])
      const stream = blob.stream()
      const compressedStream = stream.pipeThrough(
        new CompressionStream('gzip')
      )
      const compressedBlob = await new Response(compressedStream).blob()
      const buffer = await compressedBlob.arrayBuffer()
      return new Uint8Array(buffer)
    } else {
      // Fallback to Pako library
      const pako = await import('pako')
      return pako.gzip(text)
    }
  }
}
```

### Performance Estimates

| Vault Size | Maps | Nodes | Sequential | Parallel (20) | Progressive |
|------------|------|-------|------------|---------------|-------------|
| Small | 10 | 1,000 | 2s | 0.5s | 0.1s |
| Medium | 100 | 10,000 | 20s | 2s | 0.2s |
| Large | 1,000 | 100,000 | 200s | **10s** | **1s** ✅ |
| Huge | 5,000 | 500,000 | 1000s | 50s | 5s |

**Key Insight:** With parallel processing + progressive indexing:
- **First results in 1 second** (first 20 maps indexed)
- **Full index in 6-10 seconds** (1000 maps)
- User can start working immediately!

### Periodic Full Re-indexing

```typescript
/**
 * Full re-index (on demand or if corruption detected)
 */
async function fullReindex(vaultId: string, reason: 'manual' | 'corruption' | 'file-changes') {
  console.log(`Full re-index triggered: ${reason}`)

  // Show UI notification
  this.emit('reindex-started', { vaultId, reason })

  // Clear existing cache for this vault
  await this.clearVaultCache(vaultId)

  // Re-index entire vault
  await this.indexVaultWithProgress(vaultId)

  this.emit('reindex-complete', { vaultId })
}

/**
 * Detect cache corruption
 */
async function detectCacheCorruption(vaultId: string): Promise<boolean> {
  try {
    // Try to read a few random nodes
    const nodes = await this.db.transaction('nodes').objectStore('nodes').getAll()

    for (const node of nodes.slice(0, 10)) {
      if (node.contentCompressed) {
        await this.decompress(node.contentCompressed)
      }
    }

    return false  // No corruption
  } catch (error) {
    console.error('Cache corruption detected:', error)
    return true
  }
}

/**
 * Auto-trigger full re-index if needed
 */
async function checkAndReindexIfNeeded(vaultId: string) {
  // Check for corruption
  const corrupted = await this.detectCacheCorruption(vaultId)

  if (corrupted) {
    await this.fullReindex(vaultId, 'corruption')
    return
  }

  // Check if files were manually deleted/added
  const driveFiles = await storageAdapter.listFiles(vaultId)
  const indexedMaps = await this.getVaultMaps(vaultId)

  const driveIds = new Set(driveFiles.map(f => f.id))
  const indexedIds = new Set(indexedMaps.map(m => m.id))

  const newFiles = driveFiles.filter(f => !indexedIds.has(f.id))
  const deletedFiles = indexedMaps.filter(m => !driveIds.has(m.id))

  if (newFiles.length > 10 || deletedFiles.length > 10) {
    // Many changes detected, full re-index recommended
    await this.fullReindex(vaultId, 'file-changes')
  }
}
```

## Search Implementation

### Fast Full-Text Search

```typescript
class SearchIndexManager {

  /**
   * Search across all indexed nodes in current vault
   */
  async search(query: string): Promise<SearchResult[]> {
    if (!this.currentVaultId) {
      throw new Error('No vault open')
    }

    const lowerQuery = query.toLowerCase()
    const results: SearchResult[] = []

    const tx = this.db.transaction(['nodes', 'maps'], 'readonly')
    const nodeStore = tx.objectStore('nodes')
    const mapStore = tx.objectStore('maps')

    // Use index to filter by current vault
    const index = nodeStore.index('vaultId')
    let cursor = await index.openCursor(IDBKeyRange.only(this.currentVaultId))

    while (cursor) {
      const node = cursor.value

      // Search in uncompressed title and preview
      if (node.title.toLowerCase().includes(lowerQuery) ||
          node.searchableContent.toLowerCase().includes(lowerQuery)) {

        const map = await mapStore.get(node.mapId)
        results.push({
          nodeId: node.id,
          mapId: node.mapId,
          mapTitle: map.title,
          nodeTitle: node.title,
          preview: this.getPreview(node.searchableContent, query)
        })
      }

      cursor = await cursor.continue()
    }

    return results
  }

  private getPreview(content: string, query: string, contextLength = 100): string {
    const lowerContent = content.toLowerCase()
    const lowerQuery = query.toLowerCase()
    const index = lowerContent.indexOf(lowerQuery)

    if (index === -1) return content.substring(0, contextLength)

    const start = Math.max(0, index - contextLength / 2)
    const end = Math.min(content.length, index + query.length + contextLength / 2)

    let preview = content.substring(start, end)
    if (start > 0) preview = '...' + preview
    if (end < content.length) preview = preview + '...'

    return preview
  }
}
```

### Backlinks Index

```typescript
class SearchIndexManager {

  /**
   * Update backlinks when a node changes
   */
  private async updateBacklinks(node: Node) {
    // For each outgoing link, update the target's backlinks
    for (const link of node.links) {
      if (link.type === 'internal') {
        const backlink = await this.db
          .transaction('backlinks', 'readwrite')
          .objectStore('backlinks')
          .get(link.targetNode)

        const sourceLinks = backlink?.sourceLinks || []

        // Add this node as a source (if not already there)
        if (!sourceLinks.some(s => s.nodeId === node.id)) {
          sourceLinks.push({
            mapId: node.mapId,
            nodeId: node.id
          })
        }

        await this.db
          .transaction('backlinks', 'readwrite')
          .objectStore('backlinks')
          .put({
            targetNodeId: link.targetNode,
            vaultId: node.vaultId,
            sourceLinks
          })
      }
    }
  }

  /**
   * Get all backlinks to a node (instant!)
   */
  async getBacklinks(nodeId: string): Promise<BacklinkInfo[]> {
    const backlink = await this.db
      .transaction('backlinks')
      .objectStore('backlinks')
      .get(nodeId)

    if (!backlink) return []

    const results = []
    for (const link of backlink.sourceLinks) {
      const node = await this.getNode(link.nodeId)
      const map = await this.getMap(link.mapId)
      results.push({
        nodeId: link.nodeId,
        nodeTitle: node.title,
        mapId: link.mapId,
        mapTitle: map.title
      })
    }

    return results
  }
}
```

## Multi-Vault Support

### Vault Management

```typescript
interface Vault {
  id: string
  name: string
  location: 'drive' | 'local'  // Google Drive or local filesystem (Electron)
  path: string                  // Drive folder ID or local path
  created: number
  lastOpened: number
}

class VaultManager {
  private currentVault: Vault | null = null

  /**
   * List all vaults
   */
  async listVaults(): Promise<Vault[]> {
    return await this.db.transaction('vaults').objectStore('vaults').getAll()
  }

  /**
   * Create new vault
   */
  async createVault(name: string, location: 'drive' | 'local'): Promise<Vault> {
    const vault: Vault = {
      id: generateId(),
      name: name,
      location: location,
      path: location === 'drive'
        ? await this.createDriveFolder(name)
        : await this.selectLocalFolder(),
      created: Date.now(),
      lastOpened: Date.now()
    }

    await this.db.put('vaults', vault)

    // Create .vault-metadata.json
    await this.createVaultMetadata(vault)

    return vault
  }

  /**
   * Open vault (switch active vault)
   */
  async openVault(vaultId: string) {
    const vault = await this.db.get('vaults', vaultId)
    if (!vault) throw new Error('Vault not found')

    this.currentVault = vault
    vault.lastOpened = Date.now()
    await this.db.put('vaults', vault)

    // Sync index for this vault
    await searchIndex.syncVault(vaultId)

    return vault
  }

  /**
   * Get current active vault
   */
  getCurrentVault(): Vault | null {
    return this.currentVault
  }
}
```

### Storage Adapter Interface

```typescript
interface StorageAdapter {
  listFiles(vaultId: string): Promise<FileMetadata[]>
  readFile(vaultId: string, fileId: string): Promise<MindScribbleDocument>
  writeFile(vaultId: string, fileId: string, content: MindScribbleDocument): Promise<void>
  deleteFile(vaultId: string, fileId: string): Promise<void>
  watchChanges(vaultId: string, callback: (event: FileChangeEvent) => void): void
}

class GoogleDriveAdapter implements StorageAdapter {
  async listFiles(vaultId: string): Promise<FileMetadata[]> {
    const vault = await vaultManager.getVault(vaultId)
    const response = await gapi.client.drive.files.list({
      q: `'${vault.path}' in parents and trashed=false`,
      fields: 'files(id, name, modifiedTime)'
    })
    return response.result.files
  }

  // ... other methods
}

class LocalFilesystemAdapter implements StorageAdapter {
  // Electron only
  async listFiles(vaultId: string): Promise<FileMetadata[]> {
    const vault = await vaultManager.getVault(vaultId)
    const fs = require('fs').promises
    const files = await fs.readdir(vault.path)
    return files
      .filter(f => f.endsWith('.json') && !f.startsWith('.'))
      .map(async f => ({
        id: f,
        name: f,
        modifiedTime: (await fs.stat(path.join(vault.path, f))).mtime
      }))
  }

  // ... other methods
}
```

## User Settings & Re-indexing

### Compression Settings UI

Users can configure compression with clear feedback:

1. **Storage Statistics**
   - Current usage
   - Available space
   - Total maps/nodes

2. **Compression Presets**
   - None (no compression)
   - Balanced (500 chars searchable) - **Recommended**
   - Aggressive (200 chars searchable)
   - Custom (user-defined)

3. **Re-indexing Process**
   - Show estimated time
   - Show storage savings
   - Real-time progress bar
   - Non-blocking (can use app during re-index)
   - Success confirmation with stats

### Re-indexing Implementation

```typescript
async function reindexVault(vaultId: string, newSettings: CompressionSettings) {
  const maps = await driveAdapter.listFiles(vaultId)
  const startTime = Date.now()

  for (let i = 0; i < maps.length; i++) {
    const map = maps[i]

    // Update progress
    onProgress({
      current: i + 1,
      total: maps.length,
      percentage: Math.round((i + 1) / maps.length * 100),
      currentMapTitle: map.name,
      elapsed: Date.now() - startTime,
      remaining: estimateRemaining(i + 1, maps.length, Date.now() - startTime)
    })

    // Re-index with new settings
    const mapData = await driveAdapter.readFile(vaultId, map.id)
    await searchIndex.updateMapIndex(map.id, mapData, newSettings)

    // Allow UI to update
    await new Promise(resolve => setTimeout(resolve, 0))
  }

  // Save new settings
  await saveSettings('compressionSettings', newSettings)
}
```

## Cross-Device Sync

### Scenario: User Switches Devices

```
Device A (Desktop):
- Has full IndexedDB cache (1000 maps indexed)
- User creates/edits maps
- Changes saved to Google Drive

Device B (Laptop):
- Opens app for first time
- IndexedDB is empty
- Lazy indexing: only index maps as user opens them
- Background sync: periodically check Drive for changes

After a few days:
- Device B has indexed ~50 frequently used maps
- Search is fast for those 50 maps
- Can trigger "Index All" if needed (2-3 minutes for 1000 maps)
```

### Sync Implementation

```typescript
class SyncManager {
  private syncInterval: number = 5 * 60 * 1000  // 5 minutes

  startBackgroundSync(vaultId: string) {
    setInterval(async () => {
      await this.syncVault(vaultId)
    }, this.syncInterval)
  }

  async syncVault(vaultId: string) {
    const driveFiles = await driveAdapter.listFiles(vaultId)
    await searchIndex.syncIndex(driveFiles)
  }
}
```

## Electron Support

### Local Filesystem Vault

In Electron, users can choose between:
1. **Google Drive vault** (same as web version)
2. **Local filesystem vault** (Obsidian-style)

```typescript
// Electron main process
ipcMain.handle('select-vault-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory']
  })

  if (!result.canceled) {
    return result.filePaths[0]
  }
})

// Renderer process
const vaultPath = await window.electron.selectVaultFolder()
await vaultManager.createVault('My Local Vault', 'local', vaultPath)
```

### File Watching (Electron)

```typescript
import chokidar from 'chokidar'

class LocalFilesystemAdapter implements StorageAdapter {
  watchChanges(vaultId: string, callback: (event: FileChangeEvent) => void) {
    const vault = await vaultManager.getVault(vaultId)

    const watcher = chokidar.watch(vault.path, {
      ignored: /^\./,
      persistent: true
    })

    watcher
      .on('add', path => callback({ type: 'created', path }))
      .on('change', path => callback({ type: 'modified', path }))
      .on('unlink', path => callback({ type: 'deleted', path }))
  }
}
```

## Performance Benchmarks

### IndexedDB Limits

| Browser | Typical Limit | Notes |
|---------|---------------|-------|
| Chrome | 10-50 GB | ~60% of available disk |
| Firefox | 10-50 GB | Group limit: 10% of disk |
| Safari | ~1 GB | Can request more |
| Edge | 10-50 GB | Same as Chrome |

### Storage Estimates

| Scenario | Maps | Nodes | Uncompressed | Compressed (Balanced) |
|----------|------|-------|--------------|----------------------|
| Small user | 10 | 200 | 500 KB | **200 KB** |
| Average user | 100 | 10,000 | 25 MB | **10 MB** |
| Power user | 1,000 | 100,000 | 250 MB | **100 MB** |
| Extreme user | 5,000 | 500,000 | 1.25 GB | **500 MB** |

**All well within browser limits!**

### Search Performance

- **Title search**: 20-30ms
- **Content search (10K nodes)**: 50-100ms
- **Content search (100K nodes)**: 100-200ms
- **Backlinks lookup**: 5-10ms
- **Decompress node**: 10-20ms

## UI Progress Indicator

### Indexing Progress Bar Component

```vue
<template>
  <q-linear-progress
    v-if="indexing"
    :value="progress.percentage / 100"
    color="primary"
    size="4px"
    class="indexing-progress"
  >
    <div class="absolute-full flex flex-center">
      <q-badge
        color="white"
        text-color="primary"
        :label="`Indexing vault: ${progress.current}/${progress.total} (${progress.percentage}%)`"
      />
    </div>
  </q-linear-progress>

  <q-banner
    v-if="searchReady && !indexingComplete"
    class="bg-positive text-white"
    dense
  >
    <template v-slot:avatar>
      <q-icon name="check_circle" />
    </template>
    Search is ready! Indexing continues in background...
    ({{ progress.current }}/{{ progress.total }})
  </q-banner>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useVaultStore } from 'src/stores/vaultStore'

const vaultStore = useVaultStore()

const indexing = computed(() => vaultStore.indexingStatus === 'indexing')
const searchReady = computed(() => vaultStore.searchReady)
const indexingComplete = computed(() => vaultStore.indexingStatus === 'complete')
const progress = computed(() => vaultStore.indexingProgress)
</script>

<style scoped>
.indexing-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
}
</style>
```

### Vault Store Integration

```typescript
// stores/vaultStore.ts
import { defineStore } from 'pinia'

export const useVaultStore = defineStore('vault', {
  state: () => ({
    currentVaultId: null as string | null,
    indexingStatus: 'idle' as 'idle' | 'indexing' | 'complete',
    searchReady: false,
    indexingProgress: {
      current: 0,
      total: 0,
      percentage: 0,
      elapsed: 0,
      remaining: 0
    }
  }),

  actions: {
    async switchVault(vaultId: string) {
      // Clear old vault
      if (this.currentVaultId && this.currentVaultId !== vaultId) {
        await vaultManager.clearVaultCache(this.currentVaultId)
      }

      this.currentVaultId = vaultId
      this.indexingStatus = 'indexing'
      this.searchReady = false

      // Listen to indexing events
      vaultIndexer.on('indexing-progress', (progress) => {
        this.indexingProgress = progress
      })

      vaultIndexer.on('search-ready', () => {
        this.searchReady = true
        // Show notification
        this.$q.notify({
          type: 'positive',
          message: 'Search is ready! You can start working.',
          timeout: 3000
        })
      })

      vaultIndexer.on('indexing-complete', () => {
        this.indexingStatus = 'complete'
        // Show notification
        this.$q.notify({
          type: 'positive',
          message: 'Vault fully indexed!',
          timeout: 2000
        })
      })

      // Start indexing
      await vaultIndexer.indexVaultWithProgress(vaultId)
    }
  }
})
```

## Summary

### ✅ Final Architecture

1. **Google Drive = Source of Truth**
   - User owns data
   - 15 GB free storage per account
   - Cross-device sync
   - Works offline (cached in IndexedDB)

2. **IndexedDB = Fast Local Cache (Single DB, One Vault at a Time)**
   - 50ms search (vs 200s without cache)
   - Only current vault cached (~100 MB)
   - 60% compression (hybrid: searchable preview + compressed full content)
   - Offline support

3. **Per-Vault Indexing Strategy**
   - One vault active at a time (like Obsidian)
   - Switch vault: clear old cache, index new vault
   - Parallel processing (20 maps concurrently)
   - Progressive indexing (first results in 1 second)
   - Full vault indexed in 6-10 seconds (1000 maps)

4. **Incremental Cache Updates**
   - Update cache immediately on file save (10-20ms)
   - Background sync with service worker (every 5 minutes)
   - Periodic full re-index (on demand or if corruption detected)
   - Only re-index changed files during sync

5. **Optimized Performance**
   - **Parallel processing**: 20 maps concurrently
   - **Batch IndexedDB writes**: Single transaction per map
   - **Progressive indexing**: First 20 maps → search ready in 1s
   - **Web Worker compression**: Non-blocking UI
   - **Skip compression for small content**: < 500 chars

6. **Multi-Vault Support**
   - Multiple vaults per user
   - One active vault at a time
   - Google Drive or local filesystem (Electron)
   - Each vault independent

7. **User-Configurable Compression**
   - Presets: None, Balanced (500 chars), Aggressive (200 chars)
   - Clear feedback on storage/performance
   - Re-indexing with progress indicator

8. **Inter-Map Linking (Master Map)**
   - Fast backlinks lookup (5ms)
   - Backlinks index in IndexedDB
   - Works across all maps in current vault

### 🎯 Benefits

- ✅ **Fast**: 50ms search, 1s to first results, 6-10s full index
- ✅ **Free**: No server costs, uses user's Drive
- ✅ **Scalable**: Handles 5000+ maps (500 MB compressed)
- ✅ **Offline**: Full functionality without internet
- ✅ **User-owned**: Data stays in user's Drive
- ✅ **Flexible**: Multi-vault, compression settings
- ✅ **Cross-platform**: Web + Electron
- ✅ **Small storage**: Only current vault cached (~100 MB)
- ✅ **Responsive UI**: Progressive indexing, non-blocking

### 📊 Performance Benchmarks

| Vault Size | Maps | Nodes | Storage (Compressed) | Index Time | First Results |
|------------|------|-------|---------------------|------------|---------------|
| Small | 10 | 1,000 | 2 MB | 0.5s | 0.1s |
| Medium | 100 | 10,000 | 20 MB | 2s | 0.2s |
| Large | 1,000 | 100,000 | 100 MB | **6-10s** | **1s** ✅ |
| Huge | 5,000 | 500,000 | 500 MB | 50s | 5s |

### 🚀 Implementation Checklist

- [ ] Implement `VaultManager` class
  - [ ] `switchVault()` - clear old, index new
  - [ ] `clearVaultCache()` - remove vault data from IndexedDB
  - [ ] `getCurrentVault()` - get active vault

- [ ] Implement `VaultIndexer` class
  - [ ] `indexVaultWithProgress()` - parallel + progressive indexing
  - [ ] `indexMap()` - batch operations for single map
  - [ ] `compress()` / `decompress()` - CompressionStream API
  - [ ] Event emitters for progress tracking

- [ ] Implement `SearchIndexManager` class
  - [ ] `search()` - full-text search in current vault
  - [ ] `updateMapIndex()` - incremental cache update on save
  - [ ] `getBacklinks()` - fast backlinks lookup
  - [ ] `updateBacklinks()` - maintain backlinks index

- [ ] Implement `GoogleDriveAdapter` class
  - [ ] `listFiles()` - list all maps in vault
  - [ ] `readFile()` - download map JSON
  - [ ] `writeFile()` - upload map JSON
  - [ ] `deleteFile()` - delete map
  - [ ] `getFolderModifiedTime()` - for sync check

- [ ] Implement `LocalFilesystemAdapter` class (Electron)
  - [ ] Same interface as GoogleDriveAdapter
  - [ ] File watching with chokidar

- [ ] Implement Service Worker
  - [ ] Background sync (every 5 minutes)
  - [ ] Detect file changes
  - [ ] Re-index changed files

- [ ] Implement UI Components
  - [ ] Vault switcher dropdown
  - [ ] Indexing progress bar
  - [ ] "Search ready" notification
  - [ ] Compression settings dialog
  - [ ] Full re-index button

- [ ] Testing
  - [ ] Test with 10 maps
  - [ ] Test with 100 maps
  - [ ] Test with 1000 maps
  - [ ] Test vault switching
  - [ ] Test offline mode
  - [ ] Test compression settings
  - [ ] Test cache corruption recovery

- [ ] Optimization
  - [ ] Profile IndexedDB performance
  - [ ] Optimize compression (Web Worker)
  - [ ] Optimize batch sizes
  - [ ] Monitor memory usage

### 🎯 Next Steps

1. **Phase 1: Core Implementation**
   - Implement VaultManager and VaultIndexer
   - Implement basic GoogleDriveAdapter
   - Test with small vaults (10-100 maps)

2. **Phase 2: Optimization**
   - Add parallel processing
   - Add progressive indexing
   - Add compression
   - Test with large vaults (1000 maps)

3. **Phase 3: UI & UX**
   - Add progress indicators
   - Add vault switcher
   - Add compression settings
   - Polish user experience

4. **Phase 4: Advanced Features**
   - Service worker background sync
   - Cache corruption detection
   - Electron local filesystem support
   - Multi-device sync testing

