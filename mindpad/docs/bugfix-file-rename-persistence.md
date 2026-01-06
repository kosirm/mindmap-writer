# Bug Fix: File Rename Not Persisting After Reload

## Problem Summary

When a file was renamed in the vault tree, the new name was not persisting after reloading the application. The tab would show the old name (e.g., "New File") instead of the renamed name (e.g., "test").

## Root Cause

The issue was that **when a file was renamed in the vault tree, only the FileSystemItem name was updated in IndexedDB, but NOT the document's metadata.name**.

### The Flow:
1. User creates a new file → Document saved to IndexedDB with `metadata.name = "New File"`
2. User renames file in vault tree → Only `FileSystemItem.name` updated, document metadata unchanged
3. User reloads app → Document loaded from IndexedDB still has `metadata.name = "New File"`
4. Tab title shows "New File" instead of the actual file name

### Why This Happened:

The application has two separate data structures:
- **FileSystemItem**: Stores file/folder structure in the vault (name, parentId, etc.)
- **Document**: Stores the actual document content and metadata (nodes, edges, metadata.name, etc.)

When renaming a file in the vault tree, only the FileSystemItem was being updated. The document's metadata.name was never synchronized.

## Solution

Updated `handleVaultItemRenamed()` in `DockviewLayout.vue` to:

1. Update the panel title (existing behavior)
2. **Update the document's metadata.name in the unified store**
3. **Update the document's metadata.modified timestamp**
4. **Mark the document as dirty**
5. **Force save to IndexedDB immediately**

### Code Changes:

**File: `mindscribble/quasar/src/layouts/DockviewLayout.vue`**

```typescript
async function handleVaultItemRenamed(payload: ItemRenamedPayload) {
  if (payload.itemType !== 'file') {
    return
  }

  const panelToUpdate = findPanelByVaultFileId(payload.itemId)
  if (panelToUpdate) {
    // Update the panel title
    panelToUpdate.api.setTitle(payload.newName)

    // IMPORTANT: Also update the document metadata in IndexedDB
    const docInstance = unifiedStore.getDocumentInstance(panelToUpdate.id)
    if (docInstance) {
      const documentId = docInstance.document.metadata.id
      
      // Update the document metadata
      docInstance.document.metadata.name = payload.newName
      docInstance.document.metadata.modified = Date.now()

      // Mark as dirty and force save to IndexedDB
      unifiedStore.markDirty(documentId)
      await unifiedStore.forceSaveToIndexedDB()
    }
  }
}
```

## Testing

1. Create a new file (it will have "New File" as the name)
2. Rename it to "test" in the vault tree
3. Reload the app (F5)
4. ✅ The tab now shows "test" instead of "New File"

## Related Files Modified

- `mindscribble/quasar/src/layouts/DockviewLayout.vue` - Main fix
- Cleaned up debugging code from investigation

## Date

2026-01-04

