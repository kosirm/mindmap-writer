# Legacy Store Cleanup - Common Patterns

**Quick Reference Guide for Code Changes**

---

## Pattern 1: Remove Legacy Store Imports

### ❌ Remove These Imports

```typescript
import { useDocumentStore } from 'src/core/stores/documentStore'
import { useDocumentStore } from 'src/core/stores'
import { useMultiDocumentStore } from 'src/core/stores/multiDocumentStore'
import { useStoreSynchronizer } from 'src/core/stores/storeSynchronizer'
import { useStoreMode } from 'src/composables/useStoreMode'
```

### ✅ Keep These Imports

```typescript
import { useUnifiedDocumentStore } from 'src/core/stores/unifiedDocumentStore'
```

---

## Pattern 2: Remove Store Initialization

### ❌ Remove These Lines

```typescript
const documentStore = useDocumentStore()
const multiDocStore = useMultiDocumentStore()
const synchronizer = useStoreSynchronizer()
const { isUnifiedMode, isDualWriteMode, isLegacyMode } = useStoreMode()
```

### ✅ Keep This Line

```typescript
const unifiedStore = useUnifiedDocumentStore()
```

---

## Pattern 3: Simplify Conditional Store Access

### ❌ Before (Conditional Logic)

```typescript
// Pattern A: Ternary operator
const nodes = isUnifiedMode.value 
  ? unifiedStore.activeDocument?.nodes 
  : documentStore.nodes

// Pattern B: If-else blocks
if (isUnifiedMode.value) {
  unifiedStore.selectNode(nodeId, source, scrollIntoView)
} else {
  documentStore.selectNode(nodeId, source, scrollIntoView)
}

// Pattern C: Dual-write mode
if (isUnifiedMode.value || isDualWriteMode.value) {
  document = unifiedStore.toDocument()
} else {
  document = documentStore.toDocument()
}
```

### ✅ After (Direct Access)

```typescript
// Pattern A: Direct access
const nodes = unifiedStore.activeDocument?.nodes

// Pattern B: Direct call
unifiedStore.selectNode(nodeId, source, scrollIntoView)

// Pattern C: Direct call
document = unifiedStore.toDocument()
```

---

## Pattern 4: Update Helper Functions

### ❌ Before (Conditional Helpers)

```typescript
function selectNode(nodeId: string, source: EventSource, scrollIntoView: boolean) {
  if (isUnifiedMode.value) {
    unifiedStore.selectNode(nodeId, source, scrollIntoView)
  } else {
    documentStore.selectNode(nodeId, source, scrollIntoView)
  }
}

function updateNode(nodeId: string, updates: Partial<NodeData>, source: EventSource) {
  if (isUnifiedMode.value) {
    unifiedStore.updateNode(nodeId, updates, source)
  } else {
    documentStore.updateNode(nodeId, updates, source)
  }
}
```

### ✅ After (Direct Helpers)

```typescript
function selectNode(nodeId: string, source: EventSource, scrollIntoView: boolean) {
  unifiedStore.selectNode(nodeId, source, scrollIntoView)
}

function updateNode(nodeId: string, updates: Partial<NodeData>, source: EventSource) {
  unifiedStore.updateNode(nodeId, updates, source)
}
```

---

## Pattern 5: Update Computed Properties

### ❌ Before (Conditional Computed)

```typescript
const nodeCount = computed(() => {
  if (isUnifiedMode.value) {
    return unifiedStore.activeDocument?.nodes.length || 0
  }
  return documentStore.nodes.length
})

const selectedNodeIds = computed(() => {
  if (isUnifiedMode.value) {
    return unifiedStore.getSelectedNodeIds()
  }
  return documentStore.selectedNodeIds
})
```

### ✅ After (Direct Computed)

```typescript
const nodeCount = computed(() => {
  return unifiedStore.activeDocument?.nodes.length || 0
})

const selectedNodeIds = computed(() => {
  return unifiedStore.getSelectedNodeIds()
})
```

---

## Pattern 6: Update Watchers

### ❌ Before (Conditional Watch)

```typescript
watch(() => {
  if (isUnifiedMode.value) {
    return unifiedStore.activeDocument?.nodes.length || 0
  }
  return documentStore.nodes.length
}, () => {
  treeData.value = buildTreeFromStore()
})
```

### ✅ After (Direct Watch)

```typescript
watch(() => unifiedStore.activeDocument?.nodes.length || 0, () => {
  treeData.value = buildTreeFromStore()
})
```

---

## Pattern 7: Remove Dual-Write Synchronization

### ❌ Remove These Blocks

```typescript
// Dual-write synchronization
if (isDualWriteMode.value) {
  synchronizer.syncToUnified()
}

// Consistency checks
if (isDualWriteMode.value && import.meta.env.DEV) {
  synchronizer.checkConsistency()
}
```

### ✅ No Replacement Needed

Just delete these blocks entirely.

---

## Pattern 8: Update Document Operations

### ❌ Before (Conditional Document Access)

```typescript
// Getting document
let document: MindscribbleDocument | null = null
if (isUnifiedMode.value || isDualWriteMode.value) {
  document = unifiedStore.toDocument()
} else {
  document = documentStore.toDocument()
}

// Marking clean
if (isUnifiedMode.value || isDualWriteMode.value) {
  unifiedStore.markClean(activeDocumentId)
} else {
  documentStore.markClean()
}
```

### ✅ After (Direct Document Access)

```typescript
// Getting document
const document = unifiedStore.toDocument()

// Marking clean
unifiedStore.markClean(activeDocumentId)
```

---

## Pattern 9: Update Node Access

### ❌ Before (Conditional Node Access)

```typescript
const nodes = isUnifiedMode.value 
  ? unifiedStore.activeDocument?.nodes || []
  : documentStore.nodes

const node = isUnifiedMode.value
  ? unifiedStore.getNode(nodeId)
  : documentStore.getNode(nodeId)
```

### ✅ After (Direct Node Access)

```typescript
const nodes = unifiedStore.activeDocument?.nodes || []

const node = unifiedStore.getNode(nodeId)
```

---

## Pattern 10: Update Selection State

### ❌ Before (Conditional Selection)

```typescript
const isSelected = computed(() => {
  if (isUnifiedMode.value) {
    return unifiedStore.getSelectedNodeIds().includes(props.nodeId)
  }
  return documentStore.selectedNodeIds.includes(props.nodeId)
})
```

### ✅ After (Direct Selection)

```typescript
const isSelected = computed(() => {
  return unifiedStore.getSelectedNodeIds().includes(props.nodeId)
})
```

---

## Quick Search & Replace Commands

### VS Code Search (Regex)

1. **Find legacy store imports:**
   ```
   import.*use(Document|MultiDocument)Store.*from
   ```

2. **Find store mode imports:**
   ```
   import.*useStoreMode.*from
   ```

3. **Find conditional checks:**
   ```
   if \((isUnifiedMode|isDualWriteMode|isLegacyMode)\.value
   ```

4. **Find ternary operators:**
   ```
   (isUnifiedMode|isDualWriteMode)\.value \?
   ```

---

## Testing After Each Change

### Quick Test Checklist

1. ✅ **TypeScript compiles:** No red squiggles in IDE
2. ✅ **App starts:** `npm run dev` works
3. ✅ **No console errors:** Check browser console
4. ✅ **View works:** Test the specific view you changed
5. ✅ **Operations work:** Test create/edit/delete/move

### If Errors Occur

1. Read the error message carefully
2. Check if you missed removing a conditional
3. Check if you're accessing the right store property
4. Use `unifiedStore.activeDocument?.` for document-specific data
5. Use `unifiedStore.getNode(id)` for node access
6. If stuck, rollback: `git reset --hard HEAD~1`

---

## Common Mistakes to Avoid

1. ❌ **Don't forget the `?` operator:**
   - Wrong: `unifiedStore.activeDocument.nodes`
   - Right: `unifiedStore.activeDocument?.nodes`

2. ❌ **Don't mix old and new patterns:**
   - Remove ALL conditionals in one go per file

3. ❌ **Don't forget to remove imports:**
   - Unused imports will cause linter warnings

4. ❌ **Don't skip testing:**
   - Test after EVERY file change

5. ❌ **Don't batch multiple files:**
   - One file at a time, one commit at a time

