# Fix: Google Drive File Saving from Unified Store

**Date:** 2025-12-25  
**Status:** ✅ COMPLETED

## Problem

After migrating to the unified store, file saving to Google Drive was not working correctly. Files were being saved, but with **no nodes and no edges**. The issue was that the file save operations were still using `documentStore.toDocument()` to get the document data, but after the migration, the actual data was in the `unifiedStore`, not in the legacy `documentStore`.

## Root Cause

The following components were calling `documentStore.toDocument()` to get the document data for saving:

1. **FileOperationsModal.vue** - Manual save operation
2. **useAutosave.ts** - Autosave functionality
3. **MainLayout.vue** - Save current file operation

Since the unified store migration moved the data to `unifiedStore`, the legacy `documentStore` was empty or out of sync, resulting in files being saved with empty nodes and edges arrays.

## Solution

### 1. Added `toDocument()` Method to Unified Store

Added a new method to `unifiedDocumentStore.ts` that returns the active document in the same format as the legacy store:

```typescript
/**
 * Convert active document to MindscribbleDocument format
 * This is compatible with the legacy documentStore.toDocument() method
 */
function toDocument(): MindscribbleDocument | null {
  if (!activeDocumentId.value) {
    logMigrationOperation('toDocument', { error: 'No active document' })
    return null
  }

  const doc = documents.value.get(activeDocumentId.value)
  if (!doc) {
    logMigrationOperation('toDocument', { error: 'Active document not found', activeDocumentId: activeDocumentId.value })
    return null
  }

  // Update metadata before returning
  const updatedDoc: MindscribbleDocument = {
    ...doc,
    metadata: {
      ...doc.metadata,
      modified: new Date().toISOString(),
      searchableText: doc.nodes.map((n) => `${n.data.title} ${n.data.content}`).join(' '),
      nodeCount: doc.nodes.length,
      edgeCount: doc.edges.length
    }
  }

  logMigrationOperation('toDocument', {
    documentId: updatedDoc.metadata.id,
    nodeCount: updatedDoc.nodes.length,
    edgeCount: updatedDoc.edges.length
  })

  return updatedDoc
}
```

### 2. Updated FileOperationsModal.vue

Modified the `handleSave()` function to use the appropriate store based on the current store mode:

```typescript
// Get document data from the appropriate store
let document: MindscribbleDocument | null = null

if (isUnifiedMode.value || isDualWriteMode.value) {
  // Use unified store (primary source in unified/dual-write mode)
  document = unifiedStore.toDocument()
  console.log('💾 Getting document from unified store:', {
    nodeCount: document?.nodes.length,
    edgeCount: document?.edges.length
  })
} else {
  // Use legacy store (legacy mode only)
  document = documentStore.toDocument()
  console.log('💾 Getting document from legacy store:', {
    nodeCount: document?.nodes.length,
    edgeCount: document?.edges.length
  })
}

if (!document) {
  throw new Error('No active document to save')
}
```

Also updated the mark clean logic to update both stores in dual-write mode.

### 3. Updated useAutosave.ts

Applied the same pattern to the autosave functionality to ensure autosaves also get data from the correct store.

### 4. Updated MainLayout.vue

Updated the `saveCurrentFile()` function to use the appropriate store based on the current store mode.

## Files Modified

1. `mindscribble/quasar/src/core/stores/unifiedDocumentStore.ts`
   - Added `toDocument()` method
   - Exported `toDocument` in the return statement

2. `mindscribble/quasar/src/shared/components/FileOperationsModal.vue`
   - Added imports for `useUnifiedDocumentStore` and `useStoreMode`
   - Updated `handleSave()` to use appropriate store
   - Updated mark clean logic for both stores

3. `mindscribble/quasar/src/composables/useAutosave.ts`
   - Added imports for `useUnifiedDocumentStore` and `useStoreMode`
   - Updated `performAutosave()` to use appropriate store
   - Updated mark clean logic for both stores

4. `mindscribble/quasar/src/layouts/MainLayout.vue`
   - Added imports for `useUnifiedDocumentStore` and `useStoreMode`
   - Updated `saveCurrentFile()` to use appropriate store
   - Updated mark clean logic for both stores

## Testing

To test the fix:

1. **Switch to Unified Store Mode** in Dev Tools
2. **Create or edit a document** with nodes and edges
3. **Save the file** to Google Drive (Ctrl+S or File > Save)
4. **Verify in console** that it logs "Getting document from unified store" with correct node/edge counts
5. **Reload the page** and open the saved file
6. **Verify** that all nodes and edges are present

## Benefits

- ✅ Files now save correctly with all nodes and edges from unified store
- ✅ Supports all three store modes (legacy, unified, dual-write)
- ✅ Maintains backward compatibility with legacy store
- ✅ Consistent behavior across manual save, autosave, and save current file
- ✅ Proper logging for debugging

## Notes

- The fix respects the store mode toggle in dev tools
- In dual-write mode, both stores are updated to maintain consistency
- In unified mode, only the unified store is used
- In legacy mode, only the legacy store is used
- All save operations now log which store they're using for easy debugging

