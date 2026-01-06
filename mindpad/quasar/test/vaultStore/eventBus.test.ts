/**
 * Event Bus Tests for Vault Store
 * Tests the vault-specific event bus functionality
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { eventBus } from '../../src/core/events/index'
import type {
  EventSource,
  VaultLoadedPayload,
  VaultCreatedPayload,
  VaultActivatedPayload,
  FileCreatedPayload,
  FolderCreatedPayload,
  ItemRenamedPayload,
  ItemDeletedPayload,
  ItemMovedPayload,
  VaultStructureRefreshedPayload,
  VaultErrorPayload
} from '../../src/core/events/index'

describe('Vault Event Bus', () => {
  // Mock vault metadata for testing
  const mockVaultMetadata = {
    id: 'test-vault-1',
    name: 'Test Vault',
    description: 'Test vault for event bus',
    created: Date.now(),
    modified: Date.now(),
    folderId: 'test-folder-id',
    repositoryFileId: 'test-repo-file-id',
    fileCount: 0,
    folderCount: 0,
    size: 0,
    isActive: false
  }

  // Clean up event bus listeners after each test
  afterEach(() => {
    eventBus.all.clear()
  })

  describe('EventSource Types', () => {
    it('should accept vault-specific event sources', () => {
      const validSources = ['vault-tree', 'vault-tree-item', 'vault-toolbar']

      validSources.forEach(source => {
        expect(() => {
          const payload: VaultLoadedPayload = {
            source: source as EventSource,
            vaultId: 'test-vault',
            vaultName: 'Test Vault',
            vaultMetadata: mockVaultMetadata
          }
          expect(payload.source).toBe(source)
        }).not.toThrow()
      })
    })
  })

  describe('Vault Event Payloads', () => {
    it('should create valid VaultLoadedPayload', () => {
      const payload: VaultLoadedPayload = {
        source: 'vault-tree',
        vaultId: 'test-vault-1',
        vaultName: 'Test Vault',
        vaultMetadata: mockVaultMetadata
      }

      expect(payload).toBeDefined()
      expect(payload.vaultId).toBe('test-vault-1')
      expect(payload.vaultName).toBe('Test Vault')
      expect(payload.vaultMetadata).toBe(mockVaultMetadata)
      expect(payload.source).toBe('vault-tree')
    })

    it('should create valid VaultCreatedPayload', () => {
      const payload: VaultCreatedPayload = {
        source: 'vault-toolbar',
        vaultId: 'test-vault-2',
        vaultName: 'New Vault',
        vaultMetadata: { ...mockVaultMetadata, id: 'test-vault-2', name: 'New Vault' }
      }

      expect(payload).toBeDefined()
      expect(payload.vaultId).toBe('test-vault-2')
      expect(payload.vaultName).toBe('New Vault')
    })

    it('should create valid VaultActivatedPayload', () => {
      const payload: VaultActivatedPayload = {
        source: 'vault-tree-item',
        vaultId: 'test-vault-1',
        vaultName: 'Test Vault',
        vaultMetadata: mockVaultMetadata
      }

      expect(payload).toBeDefined()
      expect(payload.vaultId).toBe('test-vault-1')
    })

    it('should create valid FileCreatedPayload', () => {
      const payload: FileCreatedPayload = {
        source: 'vault-tree',
        vaultId: 'test-vault-1',
        fileId: 'test-file-1',
        fileName: 'test-file.md',
        parentId: null
      }

      expect(payload).toBeDefined()
      expect(payload.fileId).toBe('test-file-1')
      expect(payload.fileName).toBe('test-file.md')
      expect(payload.parentId).toBeNull()
    })

    it('should create valid FolderCreatedPayload', () => {
      const payload: FolderCreatedPayload = {
        source: 'vault-toolbar',
        vaultId: 'test-vault-1',
        folderId: 'test-folder-1',
        folderName: 'Test Folder',
        parentId: null
      }

      expect(payload).toBeDefined()
      expect(payload.folderId).toBe('test-folder-1')
      expect(payload.folderName).toBe('Test Folder')
    })

    it('should create valid ItemRenamedPayload', () => {
      const payload: ItemRenamedPayload = {
        source: 'vault-tree-item',
        vaultId: 'test-vault-1',
        itemId: 'test-item-1',
        oldName: 'Old Name',
        newName: 'New Name',
        itemType: 'file'
      }

      expect(payload).toBeDefined()
      expect(payload.oldName).toBe('Old Name')
      expect(payload.newName).toBe('New Name')
      expect(payload.itemType).toBe('file')
    })

    it('should create valid ItemDeletedPayload', () => {
      const payload: ItemDeletedPayload = {
        source: 'vault-tree',
        vaultId: 'test-vault-1',
        itemId: 'test-item-1',
        itemType: 'file',
        deletedIds: ['test-item-1']
      }

      expect(payload).toBeDefined()
      expect(payload.deletedIds).toContain('test-item-1')
    })

    it('should create valid ItemMovedPayload', () => {
      const payload: ItemMovedPayload = {
        source: 'vault-tree-item',
        vaultId: 'test-vault-1',
        itemId: 'test-item-1',
        oldParentId: 'old-parent',
        newParentId: 'new-parent',
        newOrder: 1
      }

      expect(payload).toBeDefined()
      expect(payload.oldParentId).toBe('old-parent')
      expect(payload.newParentId).toBe('new-parent')
      expect(payload.newOrder).toBe(1)
    })

    it('should create valid VaultStructureRefreshedPayload', () => {
      const payload: VaultStructureRefreshedPayload = {
        source: 'vault-tree',
        vaultId: 'test-vault-1',
        fullStructure: true
      }

      expect(payload).toBeDefined()
      expect(payload.fullStructure).toBe(true)
    })

    it('should create valid VaultErrorPayload', () => {
      const error = new Error('Test error')
      const payload: VaultErrorPayload = {
        source: 'vault-toolbar',
        vaultId: 'test-vault-1',
        error: error,
        operation: 'test-operation'
      }

      expect(payload).toBeDefined()
      expect(payload.error).toBe(error)
      expect(payload.operation).toBe('test-operation')
    })
  })

  describe('Event Bus Functionality', () => {
    it('should emit and listen to vault:loaded events', () => {
      const mockHandler = vi.fn()

      // Subscribe to event
      eventBus.on('vault:loaded', mockHandler)

      // Emit event
      const payload: VaultLoadedPayload = {
        source: 'vault-tree',
        vaultId: 'test-vault-1',
        vaultName: 'Test Vault',
        vaultMetadata: mockVaultMetadata
      }
      eventBus.emit('vault:loaded', payload)

      // Verify handler was called
      expect(mockHandler).toHaveBeenCalled()
      expect(mockHandler).toHaveBeenCalledWith(payload)
    })

    it('should emit and listen to vault:created events', () => {
      const mockHandler = vi.fn()

      eventBus.on('vault:created', mockHandler)

      const payload: VaultCreatedPayload = {
        source: 'vault-toolbar',
        vaultId: 'test-vault-2',
        vaultName: 'New Vault',
        vaultMetadata: { ...mockVaultMetadata, id: 'test-vault-2', name: 'New Vault' }
      }
      eventBus.emit('vault:created', payload)

      expect(mockHandler).toHaveBeenCalled()
      expect(mockHandler).toHaveBeenCalledWith(payload)
    })

    it('should emit and listen to vault:file-created events', () => {
      const mockHandler = vi.fn()

      eventBus.on('vault:file-created', mockHandler)

      const payload: FileCreatedPayload = {
        source: 'vault-tree',
        vaultId: 'test-vault-1',
        fileId: 'test-file-1',
        fileName: 'test-file.md',
        parentId: null
      }
      eventBus.emit('vault:file-created', payload)

      expect(mockHandler).toHaveBeenCalled()
      expect(mockHandler).toHaveBeenCalledWith(payload)
    })

    it('should emit and listen to vault:item-renamed events', () => {
      const mockHandler = vi.fn()

      eventBus.on('vault:item-renamed', mockHandler)

      const payload: ItemRenamedPayload = {
        source: 'vault-tree-item',
        vaultId: 'test-vault-1',
        itemId: 'test-item-1',
        oldName: 'Old Name',
        newName: 'New Name',
        itemType: 'file'
      }
      eventBus.emit('vault:item-renamed', payload)

      expect(mockHandler).toHaveBeenCalled()
      expect(mockHandler).toHaveBeenCalledWith(payload)
    })

    it('should emit and listen to vault:item-deleted events', () => {
      const mockHandler = vi.fn()

      eventBus.on('vault:item-deleted', mockHandler)

      const payload: ItemDeletedPayload = {
        source: 'vault-tree',
        vaultId: 'test-vault-1',
        itemId: 'test-item-1',
        itemType: 'file',
        deletedIds: ['test-item-1']
      }
      eventBus.emit('vault:item-deleted', payload)

      expect(mockHandler).toHaveBeenCalled()
      expect(mockHandler).toHaveBeenCalledWith(payload)
    })

    it('should emit and listen to vault:structure-refreshed events', () => {
      const mockHandler = vi.fn()

      eventBus.on('vault:structure-refreshed', mockHandler)

      const payload: VaultStructureRefreshedPayload = {
        source: 'vault-tree',
        vaultId: 'test-vault-1',
        fullStructure: true
      }
      eventBus.emit('vault:structure-refreshed', payload)

      expect(mockHandler).toHaveBeenCalled()
      expect(mockHandler).toHaveBeenCalledWith(payload)
    })

    it('should emit and listen to vault:error events', () => {
      const mockHandler = vi.fn()

      eventBus.on('vault:error', mockHandler)

      const error = new Error('Test error')
      const payload: VaultErrorPayload = {
        source: 'vault-toolbar',
        vaultId: 'test-vault-1',
        error: error,
        operation: 'test-operation'
      }
      eventBus.emit('vault:error', payload)

      expect(mockHandler).toHaveBeenCalled()
      expect(mockHandler).toHaveBeenCalledWith(payload)
    })
  })

  describe('Multiple Event Listeners', () => {
    it('should handle multiple listeners for the same event', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      eventBus.on('vault:loaded', handler1)
      eventBus.on('vault:loaded', handler2)

      const payload: VaultLoadedPayload = {
        source: 'vault-tree',
        vaultId: 'test-vault-1',
        vaultName: 'Test Vault',
        vaultMetadata: mockVaultMetadata
      }
      eventBus.emit('vault:loaded', payload)

      expect(handler1).toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()
      expect(handler1).toHaveBeenCalledWith(payload)
      expect(handler2).toHaveBeenCalledWith(payload)
    })

    it('should handle multiple different vault events', () => {
      const vaultLoadedHandler = vi.fn()
      const fileCreatedHandler = vi.fn()
      const itemRenamedHandler = vi.fn()

      eventBus.on('vault:loaded', vaultLoadedHandler)
      eventBus.on('vault:file-created', fileCreatedHandler)
      eventBus.on('vault:item-renamed', itemRenamedHandler)

      // Emit different events
      eventBus.emit('vault:loaded', {
        source: 'vault-tree',
        vaultId: 'test-vault-1',
        vaultName: 'Test Vault',
        vaultMetadata: mockVaultMetadata
      })

      eventBus.emit('vault:file-created', {
        source: 'vault-tree',
        vaultId: 'test-vault-1',
        fileId: 'test-file-1',
        fileName: 'test-file.md',
        parentId: null
      })

      eventBus.emit('vault:item-renamed', {
        source: 'vault-tree-item',
        vaultId: 'test-vault-1',
        itemId: 'test-item-1',
        oldName: 'Old Name',
        newName: 'New Name',
        itemType: 'file'
      })

      expect(vaultLoadedHandler).toHaveBeenCalled()
      expect(fileCreatedHandler).toHaveBeenCalled()
      expect(itemRenamedHandler).toHaveBeenCalled()
    })
  })

  describe('Event Cleanup', () => {
    it('should properly clean up event listeners', () => {
      const handler = vi.fn()

      eventBus.on('vault:loaded', handler)

      // Emit event to verify handler is called
      eventBus.emit('vault:loaded', {
        source: 'vault-tree',
        vaultId: 'test-vault-1',
        vaultName: 'Test Vault',
        vaultMetadata: mockVaultMetadata
      })

      expect(handler).toHaveBeenCalledTimes(1)

      // Clean up
      eventBus.off('vault:loaded', handler)

      // Emit again - handler should not be called
      eventBus.emit('vault:loaded', {
        source: 'vault-tree',
        vaultId: 'test-vault-1',
        vaultName: 'Test Vault',
        vaultMetadata: mockVaultMetadata
      })

      expect(handler).toHaveBeenCalledTimes(1) // Still 1, not 2
    })
  })
})

/**
 * Test Version: 1.0
 * Last Updated: 2025-12-30
 * Author: AI Assistant
 */
