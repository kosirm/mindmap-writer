# ID and Date Optimization Strategy

## Overview

Further optimize storage by using shorter IDs and numeric timestamps instead of ISO strings.

## Current State

### Node IDs
```json
"id": "node-1766839323403-8c08u65"
```
- Length: **27 characters**
- Redundant prefix: "node-" (5 chars wasted)
- Timestamp: 13 digits (could be shorter)
- Random suffix: 7 chars

### Dates
```json
"created": "2024-12-28T10:30:45.123Z"
"modified": "2024-12-28T10:30:45.123Z"
```
- Length: **24 characters each**
- Human-readable but verbose
- Requires string parsing

## Proposed Optimization

### Use nanoid for IDs

**Library**: https://github.com/ai/nanoid

**Why nanoid?**
- ✅ **Tiny**: 130 bytes (minified)
- ✅ **Fast**: 2x faster than UUID
- ✅ **Secure**: Uses crypto.randomBytes()
- ✅ **URL-safe**: A-Za-z0-9_-
- ✅ **Collision-resistant**: 126 bits of randomness
- ✅ **Customizable**: Can adjust size and alphabet
- ✅ **Battle-tested**: Used by Vercel, PlanetScale, millions of projects

**Recommended ID size**: 12 characters (good balance)

```typescript
import { nanoid } from 'nanoid'

// Default: 21 chars (overkill for most apps)
nanoid() // => "V1StGXR8_Z5jdHi6B-myT"

// Recommended: 12 chars (1% collision after 1M IDs)
nanoid(12) // => "V1StGXR8_Z5j"

// Aggressive: 8 chars (1% collision after 100K IDs)
nanoid(8) // => "V1StGXR8"
```

**Collision probability** (12 chars):
- 1% chance after ~1,000,000 IDs
- 50% chance after ~10,000,000 IDs

For a mind mapping app, 12 characters is **more than enough**.

### Use Timestamps for Dates

```typescript
// Instead of ISO string
const created = new Date().toISOString() // "2024-12-28T10:30:45.123Z" (24 chars)

// Use timestamp
const created = Date.now() // 1735382445123 (13 chars)

// Convert back to Date
new Date(created) // Works perfectly
```

## Size Comparison

### Per Node (id, created, modified)

**Current**:
- ID: 27 chars
- Created: 24 chars
- Modified: 24 chars
- **Total: 75 chars**

**Optimized**:
- ID: 12 chars (nanoid)
- Created: 13 chars (timestamp)
- Modified: 13 chars (timestamp)
- **Total: 38 chars**

**Savings: 37 chars (49% reduction)**

### 1000-Node Document

**Current**: 75KB (just IDs and dates)
**Optimized**: 38KB (just IDs and dates)
**Savings**: 37KB (49% reduction)

### Combined with Short Property Names

**Property names**: 88% reduction (from previous optimization)
**IDs and dates**: 49% reduction (this optimization)
**Total file size reduction**: ~70-80% overall! 🚀

## Implementation

### Install nanoid

```bash
npm install nanoid
```

### Create ID Generator Utility

```typescript
// src/core/utils/idGenerator.ts
import { nanoid } from 'nanoid'

/**
 * Generate a unique ID for nodes, edges, maps, etc.
 * Uses nanoid with 12 characters for optimal balance of:
 * - Short IDs (12 chars vs 27 chars = 56% reduction)
 * - Low collision probability (1% after 1M IDs)
 * - URL-safe characters (A-Za-z0-9_-)
 */
export function generateId(): string {
  return nanoid(12)
}

/**
 * Generate a timestamp for created/modified dates
 * Uses numeric timestamp instead of ISO string:
 * - Shorter (13 chars vs 24 chars = 46% reduction)
 * - Faster to parse (no string parsing)
 * - Easier to compare (numeric comparison)
 */
export function generateTimestamp(): number {
  return Date.now()
}

/**
 * Convert timestamp back to Date object
 */
export function timestampToDate(timestamp: number): Date {
  return new Date(timestamp)
}

/**
 * Format timestamp as ISO string (for display)
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString()
}
```

### Migration Strategy

**Option 1: Gradual Migration (Recommended)**
- Keep old IDs working
- Generate new IDs with nanoid
- Detect format and handle both

```typescript
function isOldFormat(id: string): boolean {
  return id.startsWith('node-') || id.startsWith('edge-')
}

function normalizeId(id: string): string {
  if (isOldFormat(id)) {
    // Keep old ID as-is for backward compatibility
    return id
  }
  return id
}
```

**Option 2: One-Time Migration**
- Convert all existing IDs to new format
- Update all references
- Simpler code, but requires migration script

## Benefits

### Storage
- **49% smaller** IDs and dates
- **70-80% smaller** overall file size (with property names)
- Faster uploads/downloads to Google Drive
- Less IndexedDB storage used

### Performance
- **Faster ID generation**: nanoid is 2x faster than UUID
- **Faster date operations**: numeric comparison vs string parsing
- **Faster serialization**: shorter strings to process

### Developer Experience
- **Cleaner IDs**: No redundant prefixes
- **Standard timestamps**: Works with all Date APIs
- **Type-safe**: TypeScript types for IDs and timestamps

## Recommendation

✅ **Use nanoid(12)** for all new IDs
✅ **Use Date.now()** for all timestamps
✅ **Gradual migration** for existing data
✅ **Keep backward compatibility** during transition

This optimization, combined with short property names, will give you **~70-80% total file size reduction**! 🎉

