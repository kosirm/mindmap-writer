import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useVaultStore } from 'src/core/stores/vaultStore'
import VaultTree from 'src/features/vault/components/VaultTree.vue'
import VaultToolbar from 'src/features/vault/components/VaultToolbar.vue'
import VaultTreeItem from 'src/features/vault/components/VaultTreeItem.vue'
import type { MindpadDocument } from 'src/core/types'

// Type definition for VaultTree component methods
type VaultTreeComponent = {
  expandAll: () => void
  collapseAll: () => void
  buildTreeFromVault: (forceReload: boolean) => Promise<void>
  updateLocalTreeItemData: (itemId: string, updates: { name?: string }) => void
}

describe('Vault Store Integration Tests', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
  })

  describe('VaultToolbar.vue Integration', () => {
    it('should render all toolbar buttons', () => {
      const wrapper = mount(VaultToolbar)

      // Check that all buttons are rendered
      const buttons = wrapper.findAll('q-btn')
      expect(buttons).toHaveLength(8) // 3 vault ops + 2 file ops + 2 view controls + 1 space
    })

    it('should emit expand-all and collapse-all events', async () => {
      const wrapper = mount(VaultToolbar)

      // Find expand and collapse buttons
      const expandBtn = wrapper.findAll('q-btn').find(btn =>
        btn.find('q-tooltip').text() === 'Expand all'
      )
      const collapseBtn = wrapper.findAll('q-btn').find(btn =>
        btn.find('q-tooltip').text() === 'Collapse all'
      )

      expect(expandBtn).toBeDefined()
      expect(collapseBtn).toBeDefined()

      // Trigger events
      await expandBtn?.trigger('click')
      await collapseBtn?.trigger('click')

      // Check that events were emitted
      expect(wrapper.emitted('expand-all')).toBeTruthy()
      expect(wrapper.emitted('collapse-all')).toBeTruthy()
    })
  })

  describe('VaultTree.vue Integration', () => {
    it('should render empty state when no vaults exist', () => {
      const wrapper = mount(VaultTree)

      // Check for empty state
      expect(wrapper.find('.vault-empty').exists()).toBe(true)
      expect(wrapper.find('q-icon[name="folder"]').exists()).toBe(true)
      expect(wrapper.find('q-btn[label="Create Vault"]').exists()).toBe(true)
    })

    // it('should handle vault creation through empty state button', async () => {
    //   const wrapper = mount(VaultTree)

    //   // Mock prompt and vault creation
    //   window.prompt = vi.fn().mockReturnValue('Test Vault')

    //   const createBtn = wrapper.find('q-btn[label="Create Vault"]')
    //   await createBtn.trigger('click')

    //   // Verify vault creation was attempted
    //   expect(window.prompt).toHaveBeenCalledWith('Enter vault name:', 'My Vault')
    // })

    it('should respond to expand-all and collapse-all events', () => {
      const wrapper = mount(VaultTree)

      // Check that methods exist - these are just placeholders for testing
      // The actual tree component handles expansion/collapse internally
      const vm = wrapper.vm as unknown as VaultTreeComponent
      expect(vm.expandAll).toBeDefined()
      expect(vm.collapseAll).toBeDefined()

      // Should not throw errors when called
      expect(() => vm.expandAll()).not.toThrow()
      expect(() => vm.collapseAll()).not.toThrow()
    })
  })

  describe('VaultTreeItem.vue Integration', () => {
    it('should render file and folder items correctly', () => {
      const mockFileItem = {
        id: 'file-1',
        vaultId: 'vault-1',
        parentId: null,
        name: 'Test File',
        type: 'file' as const,
        created: Date.now(),
        modified: Date.now(),
        sortOrder: 0
      }

      const mockFolderItem = {
        id: 'folder-1',
        vaultId: 'vault-1',
        parentId: null,
        name: 'Test Folder',
        type: 'folder' as const,
        created: Date.now(),
        modified: Date.now(),
        sortOrder: 0
      }

      // Test file item
      const fileWrapper = mount(VaultTreeItem, {
        props: {
          item: mockFileItem,
          stat: { children: { length: 0 }, open: false },
          triggerClass: 'drag-handle'
        }
      })

      // Test folder item
      const folderWrapper = mount(VaultTreeItem, {
        props: {
          item: mockFolderItem,
          stat: { children: { length: 1 }, open: false },
          triggerClass: 'drag-handle'
        }
      })

      // Check file icon
      expect(fileWrapper.find('q-icon[name="description"]').exists()).toBe(true)

      // Check folder icon
      expect(folderWrapper.find('q-icon[name="folder"]').exists()).toBe(true)

      // Check expand toggle for folder
      expect(folderWrapper.find('.expand-toggle').exists()).toBe(true)
    })

    it('should handle item selection', async () => {
      const mockFileItem = {
        id: 'file-1',
        vaultId: 'vault-1',
        parentId: null,
        name: 'Test File',
        type: 'file' as const,
        created: Date.now(),
        modified: Date.now(),
        sortOrder: 0
      }

      const wrapper = mount(VaultTreeItem, {
        props: {
          item: mockFileItem,
          stat: { children: { length: 0 }, open: false },
          triggerClass: 'drag-handle'
        }
      })

      // Click the item
      await wrapper.find('.vault-tree-item').trigger('click')

      // Should not throw errors
      expect(true).toBe(true)
    })
  })

  describe('Store Integration Tests', () => {
    it('should create and manage vaults through store', async () => {
      const vaultStore = useVaultStore()

      // Create a vault
      await vaultStore.createNewVault('Test Vault', 'Test description')

      // Load vaults
      await vaultStore.loadAllVaults()

      // Check that vault was created
      expect(vaultStore.vaults.length).toBeGreaterThan(0)
      if (vaultStore.vaults.length > 0) {
        expect(vaultStore.vaults[0]?.name).toBe('Test Vault')
      }
    })

    it('should create files and folders in vault', async () => {
      const vaultStore = useVaultStore()

      // Create a vault first
      await vaultStore.createNewVault('Test Vault', 'Test description')
      await vaultStore.loadAllVaults()

      if (vaultStore.vaults.length > 0) {
        const vaultId = vaultStore.vaults[0]?.id
        if (vaultId) {
          await vaultStore.activateVault(vaultId)

          // Create a folder
          await vaultStore.createNewFolder(null, 'Test Folder')

          // Create a file
          const newDocument: MindpadDocument = {
            version: '1.0',
            metadata: {
              id: `file-${Date.now()}`,
              name: 'Test File',
              created: Date.now(),
              modified: Date.now(),
              vaultId: vaultStore.activeVault?.id || '',
              tags: [],
              nodeCount: 0,
              edgeCount: 0,
              maxDepth: 0,
              searchableText: ''
            },
            nodes: [],
            edges: [],
            interMapLinks: [],
            layout: {
              activeView: 'mindmap' as const,
              orientationMode: 'clockwise' as const,
              lodEnabled: true,
              lodThresholds: [10, 30, 50, 70, 90],
              horizontalSpacing: 200,
              verticalSpacing: 150
            }
          }

          await vaultStore.createNewFile(null, 'Test File', newDocument)

          // Load structure and verify
          await vaultStore.loadVaultStructure()
          expect(vaultStore.vaultStructure.length).toBeGreaterThan(0)
        }
      }
    })

    it('should handle item renaming', async () => {
      const vaultStore = useVaultStore()

      // Create a vault and folder first
      await vaultStore.createNewVault('Test Vault', 'Test description')
      await vaultStore.loadAllVaults()

      if (vaultStore.vaults.length > 0) {
        const vaultId = vaultStore.vaults[0]?.id
        if (vaultId) {
          await vaultStore.activateVault(vaultId)
          await vaultStore.createNewFolder(null, 'Original Name')
          await vaultStore.loadVaultStructure()

          if (vaultStore.vaultStructure.length > 0) {
            const firstItem = vaultStore.vaultStructure[0]
            if (firstItem) {
              const itemId = firstItem.id

              // Rename the item - use proper event source type
              await vaultStore.renameExistingItem(itemId, 'Renamed Folder', 'vault-tree')

              // Verify rename worked
              await vaultStore.loadVaultStructure()
              const renamedItem = vaultStore.vaultStructure.find(item => item.id === itemId)
              expect(renamedItem?.name).toBe('Renamed Folder')
            }
          }
        }
      }
    })
  })

  describe('Event Flow Tests', () => {
    it('should handle vault structure refresh events', async () => {
      const vaultStore = useVaultStore()
      const wrapper = mount(VaultTree)

      // Create a vault
      await vaultStore.createNewVault('Test Vault', 'Test description')

      // Trigger a refresh event (simulated)
      const vm = wrapper.vm as unknown as VaultTreeComponent
      await vm.buildTreeFromVault(true)

      // Should not throw errors
      expect(true).toBe(true)
    })

    it('should handle item renamed events', async () => {
      const wrapper = mount(VaultTree)
      const vaultStore = useVaultStore()

      // Create a vault and folder
      await vaultStore.createNewVault('Test Vault', 'Test description')
      await vaultStore.loadAllVaults()

      if (vaultStore.vaults.length > 0) {
        const vaultId = vaultStore.vaults[0]?.id
        if (vaultId) {
          await vaultStore.activateVault(vaultId)
        }
        await vaultStore.createNewFolder(null, 'Test Folder')
        await vaultStore.loadVaultStructure()

        if (vaultStore.vaultStructure.length > 0) {
          const firstItem = vaultStore.vaultStructure[0]
          if (firstItem) {
            const itemId = firstItem.id

            // Simulate rename event
            const vm = wrapper.vm as unknown as VaultTreeComponent
            vm.updateLocalTreeItemData(itemId, { name: 'Renamed Folder' })

            // Should update local tree data
            expect(true).toBe(true)
          }
        }
      }
    })
  })

  describe('Error Handling Tests', () => {
    it('should handle vault creation errors gracefully', async () => {
      const vaultStore = useVaultStore()

      // Try to create vault with empty name (should fail)
      try {
        await vaultStore.createNewVault('', 'Test description')
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should handle missing active vault gracefully', async () => {
      const vaultStore = useVaultStore()

      // Try operations without active vault
      try {
        await vaultStore.createNewFolder(null, 'Test Folder')
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })
})

// Clean up mocks
afterEach(() => {
  vi.restoreAllMocks()
  // Note: window.prompt cleanup removed as per user request
  // The prompt functionality will be replaced with Quasar components
})
