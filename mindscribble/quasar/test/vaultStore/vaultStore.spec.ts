/**
 * VaultStore Unit Tests
 * Comprehensive test suite for the VaultStore implementation
 */

import { setActivePinia, createPinia } from 'pinia'
import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest'
import { useVaultStore } from '../../src/core/stores/vaultStore'
import { eventBus } from '../../src/core/events'
import * as vaultService from '../../src/core/services/vaultService'
import * as fileSystemService from '../../src/core/services/fileSystemService'
import type { VaultMetadata, FileSystemItem } from '../../src/core/services/indexedDBService'
import type { MindpadDocument } from '../../src/core/types'

// Mock data
const mockVault: VaultMetadata = {
  id: 'vault-1',
  name: 'Test Vault',
  description: 'Test Description',
  created: Date.now(),
  modified: Date.now(),
  folderId: 'folder-1',
  repositoryFileId: 'repo-1',
  fileCount: 0,
  folderCount: 0,
  size: 0,
  isActive: true
}

const mockFile: FileSystemItem = {
  id: 'file-1',
  vaultId: 'vault-1',
  parentId: null,
  name: 'Test File',
  type: 'file',
  created: Date.now(),
  modified: Date.now(),
  size: 100,
  fileId: 'doc-1',
  sortOrder: 0
}

const mockFolder: FileSystemItem = {
  id: 'folder-1',
  vaultId: 'vault-1',
  parentId: null,
  name: 'Test Folder',
  type: 'folder',
  created: Date.now(),
  modified: Date.now(),
  children: [],
  sortOrder: 0
}

const mockDocument: MindpadDocument = {
  version: '1.0',
  metadata: {
    id: 'doc-1',
    name: 'Test Document',
    description: '',
    created: Date.now(),
    modified: Date.now(),
    vaultId: 'vault-1',
    tags: [],
    searchableText: '',
    nodeCount: 0,
    edgeCount: 0,
    maxDepth: 0
  },
  layout: {
    activeView: 'mindmap',
    orientationMode: 'anticlockwise',
    lodEnabled: true,
    lodThresholds: [10, 30, 50, 70, 90],
    horizontalSpacing: 50,
    verticalSpacing: 20
  },
  nodes: [],
  edges: [],
  interMapLinks: []
}

describe('VaultStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())

    // Mock all service calls
    vi.spyOn(vaultService, 'getAllVaults').mockResolvedValue([])
    vi.spyOn(vaultService, 'getActiveVault').mockResolvedValue(null)
    vi.spyOn(vaultService, 'setActiveVault').mockResolvedValue()
    vi.spyOn(vaultService, 'createVault').mockResolvedValue(mockVault)
    vi.spyOn(vaultService, 'deleteVault').mockResolvedValue()
    vi.spyOn(vaultService, 'renameVault').mockResolvedValue({ ...mockVault, name: 'Renamed Vault' })

    vi.spyOn(fileSystemService, 'getVaultStructure').mockResolvedValue([])
    vi.spyOn(fileSystemService, 'createFile').mockResolvedValue(mockFile)
    vi.spyOn(fileSystemService, 'createFolder').mockResolvedValue(mockFolder)
    vi.spyOn(fileSystemService, 'renameItem').mockResolvedValue({ ...mockFile, name: 'Renamed File' })
    vi.spyOn(fileSystemService, 'deleteItem').mockResolvedValue()
    vi.spyOn(fileSystemService, 'moveItem').mockResolvedValue()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial State', () => {
    test('should initialize with empty state', () => {
      const store = useVaultStore()

      expect(store.vaults).toEqual([])
      expect(store.activeVault).toBeNull()
      expect(store.vaultStructure).toEqual([])
      expect(store.selectedFileId).toBeNull()
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
      expect(store.vaultRevision).toBe(0)
    })

    test('should have correct computed properties', () => {
      const store = useVaultStore()

      expect(store.hasVaults).toBe(false)
      expect(store.hasActiveVault).toBe(false)
      expect(store.rootFiles).toEqual([])
      expect(store.rootFolders).toEqual([])
      expect(store.allFiles).toEqual([])
      expect(store.allFolders).toEqual([])
      expect(store.hasItems).toBe(false)
    })
  })

  describe('Vault Operations', () => {
    test('loadAllVaults should load vaults and set active vault', async () => {
      const mockVaults = [mockVault]
      vi.spyOn(vaultService, 'getAllVaults').mockResolvedValue(mockVaults)
      vi.spyOn(vaultService, 'getActiveVault').mockResolvedValue(mockVault)

      const store = useVaultStore()
      await store.loadAllVaults()

      expect(store.vaults).toEqual(mockVaults)
      expect(store.activeVault).toEqual(mockVault)
      expect(store.vaultRevision).toBe(1)
      expect(store.isLoading).toBe(false)
    })

    test('loadAllVaults should handle empty vaults', async () => {
      const store = useVaultStore()
      await store.loadAllVaults()

      expect(store.vaults).toEqual([])
      expect(store.activeVault).toBeNull()
    })

    test('loadAllVaults should set first vault as active if no active vault', async () => {
      const mockVaults = [mockVault, { ...mockVault, id: 'vault-2', name: 'Second Vault' }]
      vi.spyOn(vaultService, 'getAllVaults').mockResolvedValue(mockVaults)
      vi.spyOn(vaultService, 'getActiveVault').mockResolvedValue(null)

      const store = useVaultStore()
      await store.loadAllVaults()

      expect(store.vaults).toEqual(mockVaults)
      expect(store.activeVault).toEqual(mockVaults[0])
    })

    test('loadVaultStructure should load structure for active vault', async () => {
      const mockStructure = [mockFile, mockFolder]
      vi.spyOn(fileSystemService, 'getVaultStructure').mockResolvedValue(mockStructure)

      const store = useVaultStore()
      store.activeVault = mockVault
      await store.loadVaultStructure()

      expect(store.vaultStructure).toEqual(mockStructure)
      expect(store.vaultRevision).toBe(1)
    })

    test('loadVaultStructure should do nothing if no active vault', async () => {
      const store = useVaultStore()
      await store.loadVaultStructure()

      expect(store.vaultStructure).toEqual([])
    })

    test('activateVault should set active vault and load structure', async () => {
      const mockStructure = [mockFile]
      vi.spyOn(fileSystemService, 'getVaultStructure').mockResolvedValue(mockStructure)

      const store = useVaultStore()
      store.vaults = [mockVault]

      await store.activateVault('vault-1')

      expect(store.activeVault).toEqual(mockVault)
      expect(store.vaultStructure).toEqual(mockStructure)
    })

    test('createNewVault should create and add vault', async () => {
      const store = useVaultStore()

      const result = await store.createNewVault('New Vault')

      expect(result).toEqual(mockVault)
      expect(store.vaults).toEqual([mockVault])
      expect(store.activeVault).toEqual(mockVault)
    })

    test('createNewVault should activate first vault if it is the first one', async () => {
      const store = useVaultStore()

      await store.createNewVault('First Vault')

      expect(store.activeVault).toEqual(mockVault)
    })

    test('deleteExistingVault should delete vault and handle active vault', async () => {
      const secondVault = { ...mockVault, id: 'vault-2', name: 'Second Vault' }
      const store = useVaultStore()
      store.vaults = [mockVault, secondVault]
      store.activeVault = mockVault

      await store.deleteExistingVault('vault-1')

      expect(store.vaults).toEqual([secondVault])
      expect(store.activeVault).toEqual(secondVault)
    })

    test('deleteExistingVault should clear active vault if last vault deleted', async () => {
      const store = useVaultStore()
      store.vaults = [mockVault]
      store.activeVault = mockVault

      await store.deleteExistingVault('vault-1')

      expect(store.vaults).toEqual([])
      expect(store.activeVault).toBeNull()
      expect(store.vaultStructure).toEqual([])
    })

    test('renameExistingVault should rename vault and update state', async () => {
      const store = useVaultStore()
      store.vaults = [mockVault]
      store.activeVault = mockVault

      await store.renameExistingVault('vault-1', 'Renamed Vault')

      expect(store.vaults[0]!.name).toBe('Renamed Vault')
      expect(store.activeVault?.name).toBe('Renamed Vault')
    })
  })

  describe('File/Folder Operations', () => {
    test('createNewFile should create file and add to structure', async () => {
      const store = useVaultStore()
      store.activeVault = mockVault

      const result = await store.createNewFile(null, 'New File', mockDocument)

      expect(result).toEqual(mockFile)
      expect(store.vaultStructure).toEqual([mockFile])
    })

    test('createNewFile should throw error if no active vault', async () => {
      const store = useVaultStore()
      // Explicitly set activeVault to null to test the error case
      store.activeVault = null

      // Test that the error is thrown before any async file system operations
      await expect(store.createNewFile(null, 'New File', mockDocument))
        .rejects
        .toThrow('No active vault')
    })

    test('createNewFolder should create folder and add to structure', async () => {
      const store = useVaultStore()
      store.activeVault = mockVault

      const result = await store.createNewFolder(null, 'New Folder')

      expect(result).toEqual(mockFolder)
      expect(store.vaultStructure).toEqual([mockFolder])
    })

    test('renameExistingItem should rename item and update structure', async () => {
      const store = useVaultStore()
      store.activeVault = mockVault
      store.vaultStructure = [mockFile]

      const result = await store.renameExistingItem('file-1', 'Renamed File')

      expect(result.name).toBe('Renamed File')
      expect(store.vaultStructure[0]!.name).toBe('Renamed File')
    })

    test('deleteExistingItem should delete item and remove from structure', async () => {
      const store = useVaultStore()
      store.activeVault = mockVault
      store.vaultStructure = [mockFile]
      store.selectedFileId = 'file-1'

      await store.deleteExistingItem('file-1')

      expect(store.vaultStructure).toEqual([])
      expect(store.selectedFileId).toBeNull()
    })

    test('moveExistingItem should move item and update structure', async () => {
      const store = useVaultStore()
      store.activeVault = mockVault
      store.vaultStructure = [mockFile]

      await store.moveExistingItem('file-1', 'new-parent-id')

      expect(store.vaultStructure[0]!.parentId).toBe('new-parent-id')
    })
  })

  describe('Selection Operations', () => {
    test('selectFile should set file as selected', () => {
      const store = useVaultStore()
      store.activeVault = mockVault
      store.vaultStructure = [mockFile]

      store.selectFile('file-1', 'store')

      expect(store.selectedFileId).toBe('file-1')
    })

    test('selectFile should clear selection when called with null', () => {
      const store = useVaultStore()
      store.activeVault = mockVault
      store.selectedFileId = 'file-1'

      store.selectFile(null, 'store')

      expect(store.selectedFileId).toBeNull()
    })

    test('isFileSelected should check if file is selected', () => {
      const store = useVaultStore()
      store.selectedFileId = 'file-1'

      expect(store.isFileSelected('file-1')).toBe(true)
      expect(store.isFileSelected('file-2')).toBe(false)
    })

    test('selectFile should only allow selecting files, not folders', () => {
      const store = useVaultStore()
      store.activeVault = mockVault
      store.vaultStructure = [mockFolder]

      store.selectFile('folder-1', 'store')

      // Should not select folders
      expect(store.selectedFileId).toBeNull()
    })
  })

  describe('Helper Functions', () => {
    test('getDescendantIds should return descendant IDs for folder', () => {
      const childFile: FileSystemItem = {
        id: 'child-1',
        vaultId: 'vault-1',
        parentId: 'folder-1',
        name: 'Child File',
        type: 'file',
        created: Date.now(),
        modified: Date.now(),
        sortOrder: 0
      }

      const store = useVaultStore()
      store.vaultStructure = [mockFolder, childFile]

      const descendants = store.getDescendantIds('folder-1')

      expect(descendants).toEqual(['child-1'])
    })

    test('findItem should find item by ID', () => {
      const store = useVaultStore()
      store.vaultStructure = [mockFile, mockFolder]

      const found = store.findItem('file-1')

      expect(found).toEqual(mockFile)
    })

    test('findItem should return null if item not found', () => {
      const store = useVaultStore()
      store.vaultStructure = [mockFile]

      const found = store.findItem('non-existent')

      expect(found).toBeNull()
    })

    test('checkItemExists should check if item exists', () => {
      const store = useVaultStore()
      store.vaultStructure = [mockFile]

      expect(store.checkItemExists('file-1')).toBe(true)
      expect(store.checkItemExists('non-existent')).toBe(false)
    })
  })

  describe('Event Emission', () => {
    test('should emit vault:loaded event when loading vaults', async () => {
      const mockVaults = [mockVault]
      vi.spyOn(vaultService, 'getAllVaults').mockResolvedValue(mockVaults)
      vi.spyOn(vaultService, 'getActiveVault').mockResolvedValue(mockVault)

      const mockHandler = vi.fn()
      eventBus.on('vault:loaded', mockHandler)

      const store = useVaultStore()
      await store.loadAllVaults()

      expect(mockHandler).toHaveBeenCalledWith({
        source: 'store',
        vaultId: mockVault.id,
        vaultName: mockVault.name,
        vaultMetadata: mockVault
      })
    })

    test('should emit vault:created event when creating vault', async () => {
      const mockHandler = vi.fn()
      eventBus.on('vault:created', mockHandler)

      const store = useVaultStore()
      await store.createNewVault('New Vault')

      expect(mockHandler).toHaveBeenCalledWith({
        source: 'store',
        vaultId: mockVault.id,
        vaultName: mockVault.name,
        vaultMetadata: mockVault
      })
    })

    test('should emit vault:file-created event when creating file', async () => {
      const mockHandler = vi.fn()
      eventBus.on('vault:file-created', mockHandler)

      const store = useVaultStore()
      store.activeVault = mockVault
      await store.createNewFile(null, 'New File', mockDocument)

      expect(mockHandler).toHaveBeenCalledWith({
        source: 'store',
        vaultId: mockVault.id,
        fileId: mockFile.id,
        fileName: mockFile.name,
        parentId: mockFile.parentId
      })
    })

    test('should emit vault:error event on error', async () => {
      const mockHandler = vi.fn()
      eventBus.on('vault:error', mockHandler)

      vi.spyOn(vaultService, 'getAllVaults').mockRejectedValue(new Error('Test error'))

      const store = useVaultStore()
      await store.loadAllVaults()

      expect(mockHandler).toHaveBeenCalled()
      expect(store.error).toContain('Test error')
    })
  })

  describe('Error Handling', () => {
    test('should handle errors gracefully and set error state', async () => {
      vi.spyOn(vaultService, 'getAllVaults').mockRejectedValue(new Error('Test error'))

      const store = useVaultStore()
      await store.loadAllVaults()

      expect(store.error).toContain('Test error')
      expect(store.isLoading).toBe(false)
    })

    test('should clear error state on successful operations', async () => {
      const store = useVaultStore()
      store.error = 'Previous error'

      await store.loadAllVaults()

      expect(store.error).toBeNull()
    })
  })

  describe('Computed Properties', () => {
    test('rootFiles should return files in root', () => {
      const store = useVaultStore()
      store.vaultStructure = [
        mockFile,
        { ...mockFile, id: 'file-2', parentId: 'folder-1' },
        mockFolder
      ]

      expect(store.rootFiles).toEqual([mockFile])
    })

    test('rootFolders should return folders in root', () => {
      const store = useVaultStore()
      store.vaultStructure = [
        mockFile,
        mockFolder,
        { ...mockFolder, id: 'folder-2', parentId: 'folder-1' }
      ]

      expect(store.rootFolders).toEqual([mockFolder])
    })

    test('allFiles should return all files', () => {
      const file2 = { ...mockFile, id: 'file-2', name: 'File 2' }
      const store = useVaultStore()
      store.vaultStructure = [mockFile, file2, mockFolder]

      expect(store.allFiles).toEqual([mockFile, file2])
    })

    test('allFolders should return all folders', () => {
      const folder2 = { ...mockFolder, id: 'folder-2', name: 'Folder 2' }
      const store = useVaultStore()
      store.vaultStructure = [mockFile, mockFolder, folder2]

      expect(store.allFolders).toEqual([mockFolder, folder2])
    })

    test('hasItems should return true if vault has items', () => {
      const store = useVaultStore()
      store.vaultStructure = [mockFile]

      expect(store.hasItems).toBe(true)
    })

    test('hasItems should return false if vault has no items', () => {
      const store = useVaultStore()
      store.vaultStructure = []

      expect(store.hasItems).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    test('should handle empty vault list', async () => {
      const store = useVaultStore()
      await store.loadAllVaults()

      expect(store.vaults).toEqual([])
      expect(store.activeVault).toBeNull()
    })

    test('should handle vault operations with no active vault', async () => {
      const store = useVaultStore()

      await store.loadVaultStructure()
      expect(store.vaultStructure).toEqual([])
    })

    test('should handle file operations with no active vault', async () => {
      const store = useVaultStore()

      await expect(store.createNewFile(null, 'Test', mockDocument))
        .rejects
        .toThrow('No active vault')
    })
  })
})
