# Session 1: Event Bus Setup - Detailed Implementation Plan

## 🎯 Overview
This document provides the detailed implementation plan for Session 1: Event Bus Setup, focusing on adding vault-specific events to the event bus system.

## 📋 Current State Analysis

### Current EventSource Type (lines 48-54)
```typescript
export type EventSource =
  | ViewType           // View types: 'mindmap', 'concept-map', 'outline', etc.
  | 'store'            // Direct store manipulation (e.g., from API)
  | 'keyboard'         // Keyboard shortcuts
  | 'command'          // Command palette
  | 'api'              // External API calls
  | 'undo-redo'        // Undo/redo system
```

### Current Events Structure
- `StoreEvents`: Document and node-related events
- `UIEvents`: UI-related events
- `Events = StoreEvents & UIEvents`: Combined type

## 🔧 Implementation Steps

### Step 1: Add Vault-Specific EventSource Types

**Location**: `src/core/events/index.ts`, lines 48-54

**Changes**:
```typescript
export type EventSource =
  | ViewType           // View types: 'mindmap', 'concept-map', 'outline', etc.
  | 'store'            // Direct store manipulation (e.g., from API)
  | 'keyboard'         // Keyboard shortcuts
  | 'command'          // Command palette
  | 'api'              // External API calls
  | 'undo-redo'        // Undo/redo system
  | 'vault-tree'       // Vault tree component
  | 'vault-tree-item'  // Vault tree item component
  | 'vault-toolbar'    // Vault toolbar component
```

### Step 2: Define Vault Event Payload Interfaces

**Location**: `src/core/events/index.ts`, after line 175 (after DocumentSavedPayload)

**New Interfaces**:
```typescript
// ============================================================
// VAULT EVENT PAYLOADS
// ============================================================

/** Vault loaded payload */
export interface VaultLoadedPayload extends BasePayload {
  vaultId: string
  vaultName: string
  vaultMetadata: VaultMetadata
}

/** Vault created payload */
export interface VaultCreatedPayload extends BasePayload {
  vaultId: string
  vaultName: string
  vaultMetadata: VaultMetadata
}

/** Vault activated payload */
export interface VaultActivatedPayload extends BasePayload {
  vaultId: string
  vaultName: string
  vaultMetadata: VaultMetadata
}

/** File created in vault */
export interface FileCreatedPayload extends BasePayload {
  vaultId: string
  fileId: string
  fileName: string
  parentId: string | null
}

/** Folder created in vault */
export interface FolderCreatedPayload extends BasePayload {
  vaultId: string
  folderId: string
  folderName: string
  parentId: string | null
}

/** Item renamed in vault */
export interface ItemRenamedPayload extends BasePayload {
  vaultId: string
  itemId: string
  oldName: string
  newName: string
  itemType: 'file' | 'folder'
}

/** Item deleted from vault */
export interface ItemDeletedPayload extends BasePayload {
  vaultId: string
  itemId: string
  itemType: 'file' | 'folder'
  /** IDs of all deleted items (including descendants) */
  deletedIds: string[]
}

/** Item moved in vault */
export interface ItemMovedPayload extends BasePayload {
  vaultId: string
  itemId: string
  oldParentId: string | null
  newParentId: string | null
  newOrder: number
}

/** Vault structure refreshed */
export interface VaultStructureRefreshedPayload extends BasePayload {
  vaultId: string
  /** Full structure or just metadata */
  fullStructure: boolean
}

/** Vault error payload */
export interface VaultErrorPayload extends BasePayload {
  vaultId: string | null
  error: Error
  operation: string
}
```

### Step 3: Add VaultEvents Type Definition

**Location**: `src/core/events/index.ts`, after line 270 (after UIEvents)

**New Type Definition**:
```typescript
// ============================================================
// VAULT EVENT TYPE DEFINITIONS
// ============================================================

export type VaultEvents = {
  // Vault lifecycle events
  'vault:loaded': VaultLoadedPayload
  'vault:created': VaultCreatedPayload
  'vault:activated': VaultActivatedPayload

  // File/folder lifecycle events
  'vault:file-created': FileCreatedPayload
  'vault:folder-created': FolderCreatedPayload
  'vault:item-renamed': ItemRenamedPayload
  'vault:item-deleted': ItemDeletedPayload
  'vault:item-moved': ItemMovedPayload

  // Structure events
  'vault:structure-refreshed': VaultStructureRefreshedPayload

  // Error events
  'vault:error': VaultErrorPayload
}
```

### Step 4: Update Events Type to Include VaultEvents

**Location**: `src/core/events/index.ts`, line 273

**Changes**:
```typescript
/** All events */
export type Events = StoreEvents & UIEvents & VaultEvents
```

## 📝 Type Dependencies

We need to ensure `VaultMetadata` type is available. Let's check if it exists in the codebase:

```typescript
// This type should be imported or defined
interface VaultMetadata {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  // Add other metadata fields as needed
}
```

## 🧪 Testing Strategy

### Unit Tests to Add
1. **EventSource Type Tests**: Verify new source types are valid
2. **Payload Interface Tests**: Validate payload structures
3. **Event Type Tests**: Ensure VaultEvents are properly merged
4. **Event Bus Integration**: Test event emission and listening

### Test Cases
```typescript
// Test EventSource types
test('EventSource includes vault-specific sources', () => {
  const sources: EventSource[] = ['vault-tree', 'vault-tree-item', 'vault-toolbar']
  expect(sources.every(s => s satisfies EventSource)).toBe(true)
})

// Test payload interfaces
test('VaultLoadedPayload has required fields', () => {
  const payload: VaultLoadedPayload = {
    source: 'vault-tree',
    vaultId: 'vault-1',
    vaultName: 'My Vault',
    vaultMetadata: { id: 'vault-1', name: 'My Vault', createdAt: '2023-01-01', updatedAt: '2023-01-01' }
  }
  expect(payload).toBeDefined()
})

// Test event bus integration
test('Vault events can be emitted and listened to', () => {
  const mockHandler = jest.fn()
  eventBus.on('vault:loaded', mockHandler)
  
  eventBus.emit('vault:loaded', {
    source: 'vault-tree',
    vaultId: 'vault-1',
    vaultName: 'My Vault',
    vaultMetadata: { id: 'vault-1', name: 'My Vault', createdAt: '2023-01-01', updatedAt: '2023-01-01' }
  })
  
  expect(mockHandler).toHaveBeenCalled()
})
```

## 🔍 Verification Checklist

- [ ] EventSource type includes vault-specific sources
- [ ] All vault event payload interfaces are defined
- [ ] VaultEvents type definition is complete
- [ ] Events type includes VaultEvents
- [ ] No breaking changes to existing functionality
- [ ] TypeScript compilation succeeds
- [ ] All tests pass

## 📊 Expected Outcomes

1. **Type Safety**: All vault events are properly typed
2. **Consistency**: Follows existing event bus patterns
3. **No Breaking Changes**: Existing functionality remains intact
4. **Documentation**: Clear event definitions for future use

## 🎯 Next Steps

After completing Session 1:
1. Proceed to Session 2: VaultStore Implementation
2. Use the new event types in the VaultStore
3. Update components to emit and listen to vault events

**Plan Version**: 1.0
**Last Updated**: 2025-12-30
**Author**: AI Assistant

tests:
test\vaultStore\eventBus.test.ts:
✓ Vault Event Bus > EventSource Types > should accept vault-specific event sources [0.11ms]
✓ Vault Event Bus > Vault Event Payloads > should create valid VaultLoadedPayload [0.05ms]
✓ Vault Event Bus > Vault Event Payloads > should create valid VaultCreatedPayload [0.11ms]
✓ Vault Event Bus > Vault Event Payloads > should create valid VaultActivatedPayload [0.04ms]
✓ Vault Event Bus > Vault Event Payloads > should create valid FileCreatedPayload [0.08ms]
✓ Vault Event Bus > Vault Event Payloads > should create valid FolderCreatedPayload [0.10ms]
✓ Vault Event Bus > Vault Event Payloads > should create valid ItemRenamedPayload [0.08ms]
✓ Vault Event Bus > Vault Event Payloads > should create valid ItemDeletedPayload [0.09ms]
✓ Vault Event Bus > Vault Event Payloads > should create valid ItemMovedPayload [0.09ms]
✓ Vault Event Bus > Vault Event Payloads > should create valid VaultStructureRefreshedPayload [0.06ms]
✓ Vault Event Bus > Vault Event Payloads > should create valid VaultErrorPayload [0.12ms]
✓ Vault Event Bus > Event Bus Functionality > should emit and listen to vault:loaded events [0.28ms]
✓ Vault Event Bus > Event Bus Functionality > should emit and listen to vault:created events [0.17ms]
✓ Vault Event Bus > Event Bus Functionality > should emit and listen to vault:file-created events [0.13ms]
✓ Vault Event Bus > Event Bus Functionality > should emit and listen to vault:item-renamed events [0.10ms]
✓ Vault Event Bus > Event Bus Functionality > should emit and listen to vault:item-deleted events [0.09ms]
✓ Vault Event Bus > Event Bus Functionality > should emit and listen to vault:structure-refreshed events [0.10ms]
✓ Vault Event Bus > Event Bus Functionality > should emit and listen to vault:error events [0.11ms]
✓ Vault Event Bus > Multiple Event Listeners > should handle multiple listeners for the same event [0.20ms]
✓ Vault Event Bus > Multiple Event Listeners > should handle multiple different vault events [0.28ms]
✓ Vault Event Bus > Event Cleanup > should properly clean up event listeners [0.22ms]