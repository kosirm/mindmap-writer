# Selective Compression Strategy for MindPad

## Executive Summary

This document outlines the **selective compression strategy** that balances storage efficiency with search functionality. The key insight: **compress non-searchable fields, keep searchable fields uncompressed**.

## Core Principle

> **"Compress what you don't search, keep uncompressed what you do search"**

## Field Classification

### ✅ Fields to Keep Uncompressed (Searchable)

These fields need to be searchable and are accessed frequently:

| Field | Short Name | Reason | Typical Size |
|-------|-----------|--------|--------------|
| `id` | `i` | Primary key lookup | 20-40 bytes |
| `vaultId` | `v` | Vault filtering | 20-40 bytes |
| `mapId` | `m` | Map filtering | 20-40 bytes |
| `title` | `t` | Full-text search | 50-200 bytes |
| `tags` | `ta` | Tag-based search | 100-500 bytes |
| `author` | `au` | Author filtering | 20-100 bytes |
| `category` | `ca` | Category filtering | 20-100 bytes |
| `status` | `st` | Status filtering | 10-50 bytes |
| `type` | `ty` | Type filtering | 10-50 bytes |
| `created` | `r` | Date range search | 8 bytes |
| `modified` | `d` | Date range search | 8 bytes |

**Total uncompressed overhead:** ~200-500 bytes per node

### 🗜️ Fields to Compress (Non-Searchable)

These fields are large but rarely searched:

| Field | Short Name | Reason | Compression Savings |
|-------|-----------|--------|---------------------|
| `content` | `c` | Rich text content, rarely full-text searched | 60-80% |
| `description` | `de` | Long descriptions | 60-80% |
| `notes` | `no` | Internal notes | 60-80% |
| `metadata` | `me` | Structured metadata | 50-70% |
| `history` | `hi` | Change history | 70-90% |
| `attachments` | `at` | Base64 encoded files | 80-95% |

**Typical savings:** 500 bytes → 100 bytes (80% reduction)

## Hybrid Storage Format

### Node Structure Example

```typescript
interface HybridNode {
  // UNCOMPRESSED (searchable) fields
  i: string           // id
  m: string           // mapId
  v: string           // vaultId
  t: string           // title (full-text search)
  ta: string[]        // tags (tag search)
  ty: string          // type (filtering)
  st: string          // status (filtering)
  r: number           // created (date search)
  d: number           // modified (date search)
  
  // COMPRESSED fields
  c: Uint8Array       // content (compressed)
  de: Uint8Array      // description (compressed)
  me: Uint8Array      // metadata (compressed)
  
  // STRUCTURED (uncompressed) fields
  p: {x: number, y: number} // position
  l: Array<{t: string, m: string, n: string}> // links
  co: string          // color
  si: number          // size
}
```

## Implementation Strategy

### 1. Compression Thresholds

```typescript
// src/core/constants/compression.ts
export const COMPRESSION_THRESHOLDS = {
  // Minimum length to compress (bytes)
  MIN_LENGTH: 500,
  
  // Field-specific thresholds
  CONTENT: 500,      // Compress content > 500 chars
  DESCRIPTION: 200,   // Compress description > 200 chars
  METADATA: 100,     // Compress metadata > 100 chars
  
  // Compression levels
  LEVEL_DEFAULT: 6,   // Default compression level (0-9)
  LEVEL_AGGRESSIVE: 9 // Maximum compression
}
```

### 2. Smart Compression Function

```typescript
// src/core/utils/smartCompression.ts
import { COMPRESSION_THRESHOLDS } from '../constants/compression'

export async function smartCompress(
  data: string,
  fieldType: 'content' | 'description' | 'metadata' | 'other' = 'other'
): Promise<Uint8Array | string> {
  
  // Determine threshold based on field type
  const threshold = COMPRESSION_THRESHOLDS[fieldType.toUpperCase()] || 
                   COMPRESSION_THRESHOLDS.MIN_LENGTH
  
  // Don't compress small data
  if (data.length <= threshold) {
    return data // Return as-is (will be stored as string)
  }
  
  // Compress large data
  if ('CompressionStream' in window) {
    const blob = new Blob([data])
    const stream = blob.stream().pipeThrough(
      new CompressionStream('gzip')
    )
    const compressedBlob = await new Response(stream).blob()
    return new Uint8Array(await compressedBlob.arrayBuffer())
  } else {
    // Fallback to Pako
    const pako = await import('pako')
    return pako.gzip(data)
  }
}

export async function smartDecompress(
  data: Uint8Array | string
): Promise<string> {
  
  // If it's already a string, return as-is
  if (typeof data === 'string') {
    return data
  }
  
  // If it's Uint8Array, decompress
  if ('DecompressionStream' in window) {
    const blob = new Blob([data])
    const stream = blob.stream().pipeThrough(
      new DecompressionStream('gzip')
    )
    return await new Response(stream).blob().text()
  } else {
    // Fallback to Pako
    const pako = await import('pako')
    return pako.ungzip(data, { to: 'string' })
  }
}
```

### 3. Storage Manager Implementation

```typescript
// src/core/services/hybridStorage.ts
import { openDB } from 'idb'
import { PROP } from '../constants/propertyNames'
import { smartCompress, smartDecompress } from '../utils/smartCompression'

export class HybridStorageManager {
  private dbPromise: Promise<any>
  
  constructor() {
    this.dbPromise = openDB('mindpad', 1, {
      upgrade(db) {
        // Create nodes store
        const nodeStore = db.createObjectStore('nodes', { keyPath: PROP.ID })
        
        // Create indexes for searchable fields
        nodeStore.createIndex('vaultId', PROP.VAULT)
        nodeStore.createIndex('mapId', PROP.MAP)
        nodeStore.createIndex('title', PROP.TITLE)
        nodeStore.createIndex('tags', PROP.TAGS)
        nodeStore.createIndex('type', PROP.TYPE)
        nodeStore.createIndex('status', PROP.STATUS)
        nodeStore.createIndex('created', PROP.CREATED)
        nodeStore.createIndex('modified', PROP.MODIFIED)
      }
    })
  }
  
  async saveNode(node: {
    id: string
    mapId: string
    vaultId: string
    title: string
    content: string
    description?: string
    tags?: string[]
    type?: string
    status?: string
    created: number
    modified: number
    position: {x: number, y: number}
    links: Array<{type: string, targetMap: string, targetNode: string}>
  }) {
    const db = await this.dbPromise
    
    // Compress large fields selectively
    const compressedContent = await smartCompress(node.content, 'content')
    const compressedDescription = node.description 
      ? await smartCompress(node.description, 'description') 
      : null
    
    // Store with hybrid approach
    const storedNode: any = {
      // Uncompressed searchable fields
      [PROP.ID]: node.id,
      [PROP.MAP]: node.mapId,
      [PROP.VAULT]: node.vaultId,
      [PROP.TITLE]: node.title,
      [PROP.TAGS]: node.tags || [],
      [PROP.TYPE]: node.type || 'default',
      [PROP.STATUS]: node.status || 'active',
      [PROP.CREATED]: node.created,
      [PROP.MODIFIED]: node.modified,
      
      // Position (structured, uncompressed)
      [PROP.POSITION]: node.position,
      
      // Links (structured, uncompressed)
      [PROP.LINKS]: node.links.map(link => ({
        [PROP.LINK_TYPE]: link.type,
        [PROP.LINK_TARGET_MAP]: link.targetMap,
        [PROP.LINK_TARGET_NODE]: link.targetNode
      })),
      
      // Selectively compressed fields
      [PROP.CONTENT]: compressedContent,
      ...(compressedDescription && { [PROP.DESCRIPTION]: compressedDescription })
    }
    
    await db.put('nodes', storedNode)
  }
  
  async searchNodes(query: string, vaultId: string): Promise<any[]> {
    const db = await this.dbPromise
    const results: any[] = []
    
    // Search in uncompressed fields only
    const tx = db.transaction('nodes', 'readonly')
    const store = tx.objectStore('nodes')
    const vaultIndex = store.index('vaultId')
    
    let cursor = await vaultIndex.openCursor(IDBKeyRange.only(vaultId))
    
    while (cursor) {
      const node = cursor.value
      
      // Search in title (uncompressed)
      if (node[PROP.TITLE].toLowerCase().includes(query.toLowerCase())) {
        results.push(this.formatNodeOutput(node))
      }
      
      // Search in tags (uncompressed)
      if (node[PROP.TAGS].some((tag: string) => 
          tag.toLowerCase().includes(query.toLowerCase()))) {
        results.push(this.formatNodeOutput(node))
      }
      
      cursor = await cursor.continue()
    }
    
    return results
  }
  
  private async formatNodeOutput(storedNode: any) {
    // Decompress only when needed
    const content = await smartDecompress(storedNode[PROP.CONTENT])
    const description = storedNode[PROP.DESCRIPTION] 
      ? await smartDecompress(storedNode[PROP.DESCRIPTION]) 
      : ''
    
    return {
      id: storedNode[PROP.ID],
      mapId: storedNode[PROP.MAP],
      vaultId: storedNode[PROP.VAULT],
      title: storedNode[PROP.TITLE],
      content: content,
      description: description,
      tags: storedNode[PROP.TAGS],
      type: storedNode[PROP.TYPE],
      status: storedNode[PROP.STATUS],
      created: storedNode[PROP.CREATED],
      modified: storedNode[PROP.MODIFIED],
      position: storedNode[PROP.POSITION],
      links: storedNode[PROP.LINKS].map((link: any) => ({
        type: link[PROP.LINK_TYPE],
        targetMap: link[PROP.LINK_TARGET_MAP],
        targetNode: link[PROP.LINK_TARGET_NODE]
      }))
    }
  }
}
```

## Search Implementation

### Fast Search on Uncompressed Fields

```typescript
// src/core/services/searchManager.ts
export class SearchManager {
  constructor(private storage: HybridStorageManager) {}
  
  async fullTextSearch(
    query: string,
    vaultId: string,
    options: {
      limit?: number
      includeContent?: boolean
    } = {}
  ): Promise<any[]> {
    const db = await this.storage.getDB()
    const results: any[] = []
    const limit = options.limit || 100
    
    // Use IndexedDB indexes for fast filtering
    const tx = db.transaction('nodes', 'readonly')
    const store = tx.objectStore('nodes')
    
    // 1. Search by title (full-text)
    let cursor = await store.index('title').openCursor(
      IDBKeyRange.only(vaultId)
    )
    
    while (cursor && results.length < limit) {
      const node = cursor.value
      if (node[PROP.TITLE].toLowerCase().includes(query.toLowerCase())) {
        results.push(await this.formatSearchResult(node, options.includeContent))
      }
      cursor = await cursor.continue()
    }
    
    // 2. Search by tags
    cursor = await store.index('tags').openCursor(
      IDBKeyRange.only(vaultId)
    )
    
    while (cursor && results.length < limit) {
      const node = cursor.value
      if (node[PROP.TAGS].some((tag: string) => 
          tag.toLowerCase().includes(query.toLowerCase()))) {
        // Avoid duplicates
        if (!results.some(r => r.id === node[PROP.ID])) {
          results.push(await this.formatSearchResult(node, options.includeContent))
        }
      }
      cursor = await cursor.continue()
    }
    
    return results
  }
  
  private async formatSearchResult(node: any, includeContent: boolean = false) {
    const result: any = {
      id: node[PROP.ID],
      title: node[PROP.TITLE],
      tags: node[PROP.TAGS],
      type: node[PROP.TYPE],
      status: node[PROP.STATUS],
      created: node[PROP.CREATED],
      modified: node[PROP.MODIFIED]
    }
    
    // Only decompress content if explicitly requested
    if (includeContent) {
      result.content = await smartDecompress(node[PROP.CONTENT])
    }
    
    return result
  }
}
```

## Storage Savings Analysis

### Example Node Comparison

**Original Approach (no compression):**
```json
{
  "id": "node-123",
  "mapId": "map-456",
  "vaultId": "vault-1",
  "title": "Project Planning",
  "content": "2000 characters of rich text content with HTML formatting...",
  "description": "500 characters of detailed description...",
  "tags": ["project", "planning", "important"],
  "type": "task",
  "status": "active",
  "created": 1702800000000,
  "modified": 1702800000000,
  "position": {"x": 100, "y": 200}
}
```
**Size:** ~2.8 KB
- Property names: 120 bytes (readable)
- Content: 2000 bytes
- Description: 500 bytes
- Other fields: 200 bytes

**Hybrid Approach (selective compression + short names):**
```json
{
  "i": "node-123",
  "m": "map-456",
  "v": "vault-1",
  "t": "Project Planning",
  "c": [compressed binary: ~400 bytes],
  "de": [compressed binary: ~100 bytes],
  "ta": ["project", "planning", "important"],
  "ty": "task",
  "st": "active",
  "r": 1702800000000,
  "d": 1702800000000,
  "p": {"x": 100, "y": 200}
}
```
**Size:** ~0.8 KB
- Property names: 40 bytes (short)
- Content: 400 bytes (compressed from 2000)
- Description: 100 bytes (compressed from 500)
- Other fields: 200 bytes (uncompressed)

**Savings:** 71% reduction!

## Performance Characteristics

### Search Performance

| Operation | Hybrid Approach | Original Approach | Improvement |
|-----------|-----------------|-------------------|-------------|
| Title search | 10-20ms | 10-20ms | Same (both uncompressed) |
| Tag search | 5-15ms | 5-15ms | Same (both uncompressed) |
| Content search | Not supported | 50-100ms | N/A (not needed) |
| Full node load | 25-35ms | 15-25ms | Slightly slower (decompression) |
| Storage size | 0.8 KB/node | 2.8 KB/node | 71% smaller |

### Memory Usage

| Scenario | Hybrid Approach | Original Approach | Savings |
|----------|-----------------|-------------------|---------|
| 1,000 nodes | 800 KB | 2.8 MB | 71% |
| 10,000 nodes | 8 MB | 28 MB | 71% |
| 100,000 nodes | 80 MB | 280 MB | 71% |
| 1,000,000 nodes | 800 MB | 2.8 GB | 71% |

## Recommendation

### ✅ **Implement Hybrid Selective Compression**

**Benefits:**
- ✅ **Fast search** on all important fields
- ✅ **70-80% storage savings** overall
- ✅ **Smart compression** (only large fields)
- ✅ **Transparent decompression** (only when needed)
- ✅ **Future-proof** architecture

**Implementation Steps:**

1. **Setup idb library** for clean IndexedDB access
2. **Implement property constants** with short names
3. **Create smart compression** functions
4. **Build hybrid storage manager**
5. **Implement search** on uncompressed fields
6. **Test with various** data sizes
7. **Optimize thresholds** based on real usage

**This approach gives you the best of both worlds:** lightning-fast search with maximum storage efficiency!