import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUnifiedDocumentStore } from '../../src/core/stores/unifiedDocumentStore'
import { eventBus } from '../../src/core/events'

describe('Unified Document Store - Node Operations', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should generate unique node IDs', () => {
    const store = useUnifiedDocumentStore()

    const nodeId1 = store.generateNodeId()
    const nodeId2 = store.generateNodeId()

    // New format: 12-character nanoid (A-Za-z0-9_-)
    expect(nodeId1).toMatch(/^[A-Za-z0-9_-]{12}$/)
    expect(nodeId2).toMatch(/^[A-Za-z0-9_-]{12}$/)
    expect(nodeId1).not.toBe(nodeId2)
  })

  it('should add node to active document', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)

    const node = store.addNode(null, 'Root Node', 'Content')

    expect(node).not.toBeNull()
    expect(node?.id).toBeDefined()
    expect(node?.data.title).toBe('Root Node')
    expect(node?.data.content).toBe('Content')
    expect(node?.data.parentId).toBeNull()
    expect(node?.data.order).toBe(0)

    const updatedDoc = store.activeDocument
    expect(updatedDoc?.nodes.length).toBe(1)
    expect(updatedDoc?.nodes[0]).toEqual(node)
  })

  it('should add node with custom position', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)

    const position = { x: 100, y: 200 }
    const node = store.addNode(null, 'Positioned Node', 'Content', position)

    expect(node?.position).toEqual(position)
  })

  it('should add node with default position when none provided', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)

    const node = store.addNode(null, 'Default Position Node')

    expect(node?.position).toEqual({ x: 0, y: 0 })
  })

  it('should handle adding node when no active document', () => {
    const store = useUnifiedDocumentStore()

    const node = store.addNode(null, 'Test Node')

    expect(node).toBeNull()
  })

  it('should add child node with correct parent and order', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)

    const parentNode = store.addNode(null, 'Parent Node')
    const childNode1 = store.addNode(parentNode?.id || '', 'Child 1')
    const childNode2 = store.addNode(parentNode?.id || '', 'Child 2')

    expect(childNode1?.data.parentId).toBe(parentNode?.id)
    expect(childNode1?.data.order).toBe(0)
    expect(childNode2?.data.parentId).toBe(parentNode?.id)
    expect(childNode2?.data.order).toBe(1)
  })

  it('should mark document as dirty when adding node', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)
    store.markClean(doc.metadata.id)

    store.addNode(null, 'Test Node')

    expect(store.isDirty(doc.metadata.id)).toBe(true)
  })

  it('should emit node-created event when adding node', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)

    const spy = vi.spyOn(eventBus, 'emit')
    const node = store.addNode(null, 'Test Node')

    expect(spy).toHaveBeenCalledWith('store:node-created', expect.objectContaining({
      nodeId: node?.id,
      parentId: null,
      source: 'store'
    }))
  })

  it('should update node data', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)

    const node = store.addNode(null, 'Original Node')

    if (node) {
      store.updateNode(node.id, {
        title: 'Updated Node',
        content: 'Updated Content'
      })

      const updatedNode = store.getNodeById(node.id)
      expect(updatedNode?.data.title).toBe('Updated Node')
      expect(updatedNode?.data.content).toBe('Updated Content')
    }
  })

  it('should handle updating non-existent node gracefully', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)

    expect(() => store.updateNode('non-existent-id', { title: 'Test' })).not.toThrow()
  })

  it('should emit node-updated event when updating node', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)

    const node = store.addNode(null, 'Test Node')
    const spy = vi.spyOn(eventBus, 'emit')

    if (node) {
      store.updateNode(node.id, { title: 'Updated Node' })

      expect(spy).toHaveBeenCalledWith('store:node-updated', expect.objectContaining({
        nodeId: node.id,
        changes: { title: 'Updated Node' },
        source: 'store'
      }))
    }
  })

  it('should mark document as dirty when updating node', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)
    store.markClean(doc.metadata.id)

    const node = store.addNode(null, 'Test Node')

    if (node) {
      store.updateNode(node.id, { title: 'Updated Node' })
      expect(store.isDirty(doc.metadata.id)).toBe(true)
    }
  })

  it('should update node position', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)

    const node = store.addNode(null, 'Test Node')
    const newPosition = { x: 150, y: 250 }

    if (node) {
      store.updateNodePosition(node.id, newPosition)

      const updatedNode = store.getNodeById(node.id)
      expect(updatedNode?.position).toEqual(newPosition)
    }
  })

  it('should emit node-moved event when updating position', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)

    const node = store.addNode(null, 'Test Node')
    const spy = vi.spyOn(eventBus, 'emit')

    if (node) {
      const newPosition = { x: 150, y: 250 }
      store.updateNodePosition(node.id, newPosition)

      expect(spy).toHaveBeenCalledWith('store:node-moved', expect.objectContaining({
        nodeId: node.id,
        position: newPosition,
        source: 'store'
      }))
    }
  })

  it('should delete node and its children', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)

    const parentNode = store.addNode(null, 'Parent Node')
    const childNode1 = store.addNode(parentNode?.id || '', 'Child 1')
    const childNode2 = store.addNode(parentNode?.id || '', 'Child 2')

    if (parentNode) {
      store.deleteNode(parentNode.id)

      const updatedDoc = store.activeDocument
      expect(updatedDoc?.nodes.length).toBe(0)
      expect(store.getNodeById(parentNode.id)).toBeUndefined()
      expect(store.getNodeById(childNode1?.id || '')).toBeUndefined()
      expect(store.getNodeById(childNode2?.id || '')).toBeUndefined()
    }
  })

  it('should delete node but keep children when deleteChildren is false', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)

    const parentNode = store.addNode(null, 'Parent Node')
    const childNode1 = store.addNode(parentNode?.id || '', 'Child 1')
    const childNode2 = store.addNode(parentNode?.id || '', 'Child 2')

    if (parentNode) {
      store.deleteNode(parentNode.id, false)

      const updatedDoc = store.activeDocument
      expect(updatedDoc?.nodes.length).toBe(2) // Only children remain
      expect(store.getNodeById(parentNode.id)).toBeUndefined()
      expect(store.getNodeById(childNode1?.id || '')).toBeDefined()
      expect(store.getNodeById(childNode2?.id || '')).toBeDefined()

      // Children should be reparented to null
      const child1 = store.getNodeById(childNode1?.id || '')
      const child2 = store.getNodeById(childNode2?.id || '')
      expect(child1?.data.parentId).toBeNull()
      expect(child2?.data.parentId).toBeNull()
    }
  })

  it('should emit node-deleted event when deleting node', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)

    const parentNode = store.addNode(null, 'Parent Node')
    const childNode = store.addNode(parentNode?.id || '', 'Child Node')
    const spy = vi.spyOn(eventBus, 'emit')

    if (parentNode) {
      store.deleteNode(parentNode.id)

      expect(spy).toHaveBeenCalledWith('store:node-deleted', expect.objectContaining({
        nodeId: parentNode.id,
        deletedIds: [parentNode.id, childNode?.id],
        source: 'store'
      }))
    }
  })

  it('should mark document as dirty when deleting node', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)
    store.markClean(doc.metadata.id)

    const node = store.addNode(null, 'Test Node')

    if (node) {
      store.deleteNode(node.id)
      expect(store.isDirty(doc.metadata.id)).toBe(true)
    }
  })

  it('should move node to new parent', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)

    const parent1 = store.addNode(null, 'Parent 1')
    const parent2 = store.addNode(null, 'Parent 2')
    const childNode = store.addNode(parent1?.id || '', 'Child Node')

    if (childNode && parent1 && parent2) {
      store.moveNode(childNode.id, parent2.id)

      const movedNode = store.getNodeById(childNode.id)
      expect(movedNode?.data.parentId).toBe(parent2.id)
      expect(movedNode?.data.order).toBe(0)
    }
  })

  it('should prevent moving node to its own descendant', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)

    const parentNode = store.addNode(null, 'Parent Node')
    const childNode = store.addNode(parentNode?.id || '', 'Child Node')
    store.addNode(childNode?.id || '', 'Grandchild Node')

    if (parentNode && childNode) {
      // Try to move parent to its own child (should fail)
      store.moveNode(parentNode.id, childNode.id)

      const unchangedNode = store.getNodeById(parentNode.id)
      expect(unchangedNode?.data.parentId).toBeNull() // Should remain unchanged
    }
  })

  it('should emit node-reparented event when moving node', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)

    const parent1 = store.addNode(null, 'Parent 1')
    const parent2 = store.addNode(null, 'Parent 2')
    const childNode = store.addNode(parent1?.id || '', 'Child Node')
    const spy = vi.spyOn(eventBus, 'emit')

    if (childNode && parent1 && parent2) {
      store.moveNode(childNode.id, parent2.id)

      expect(spy).toHaveBeenCalledWith('store:node-reparented', expect.objectContaining({
        nodeId: childNode.id,
        oldParentId: parent1.id,
        newParentId: parent2.id,
        source: 'store'
      }))
    }
  })

  it('should reorder siblings correctly', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)

    const parentNode = store.addNode(null, 'Parent Node')
    const child1 = store.addNode(parentNode?.id || '', 'Child 1')
    const child2 = store.addNode(parentNode?.id || '', 'Child 2')
    const child3 = store.addNode(parentNode?.id || '', 'Child 3')

    if (child1 && child2 && child3) {
      const newOrders = new Map<string, number>([
        [child1.id, 2],
        [child2.id, 0],
        [child3.id, 1]
      ])

      store.reorderSiblings(parentNode?.id || null, newOrders)

      const updatedChild1 = store.getNodeById(child1.id)
      const updatedChild2 = store.getNodeById(child2.id)
      const updatedChild3 = store.getNodeById(child3.id)

      expect(updatedChild1?.data.order).toBe(2)
      expect(updatedChild2?.data.order).toBe(0)
      expect(updatedChild3?.data.order).toBe(1)
    }
  })

  it('should emit siblings-reordered event when reordering', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)

    const parentNode = store.addNode(null, 'Parent Node')
    const child1 = store.addNode(parentNode?.id || '', 'Child 1')
    const child2 = store.addNode(parentNode?.id || '', 'Child 2')
    const spy = vi.spyOn(eventBus, 'emit')

    if (child1 && child2) {
      const newOrders = new Map<string, number>([
        [child1.id, 1],
        [child2.id, 0]
      ])

      store.reorderSiblings(parentNode?.id || null, newOrders)

      expect(spy).toHaveBeenCalledWith('store:siblings-reordered', expect.objectContaining({
        parentId: parentNode?.id,
        newOrders,
        source: 'store'
      }))
    }
  })

  it('should get node by ID', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)

    const node = store.addNode(null, 'Test Node')

    if (node) {
      const retrievedNode = store.getNodeById(node.id)
      expect(retrievedNode).toEqual(node)
    }
  })

  it('should return undefined for non-existent node ID', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)

    const retrievedNode = store.getNodeById('non-existent-id')
    expect(retrievedNode).toBeUndefined()
  })

  it('should get child nodes', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)

    const parentNode = store.addNode(null, 'Parent Node')
    const child1 = store.addNode(parentNode?.id || '', 'Child 1')
    const child2 = store.addNode(parentNode?.id || '', 'Child 2')
    const child3 = store.addNode(null, 'Root Child')

    if (parentNode) {
      const children = store.getChildNodes(parentNode.id)
      expect(children.length).toBe(2)
      expect(children).toContainEqual(child1)
      expect(children).toContainEqual(child2)
      expect(children).not.toContainEqual(child3)
    }
  })

  it('should get all descendants', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)

    const parentNode = store.addNode(null, 'Parent Node')
    const child1 = store.addNode(parentNode?.id || '', 'Child 1')
    const child2 = store.addNode(parentNode?.id || '', 'Child 2')
    const grandchild1 = store.addNode(child1?.id || '', 'Grandchild 1')
    const grandchild2 = store.addNode(child1?.id || '', 'Grandchild 2')

    if (parentNode) {
      const descendants = store.getAllDescendants(parentNode.id)
      expect(descendants.length).toBe(4)
      expect(descendants).toContainEqual(child1)
      expect(descendants).toContainEqual(child2)
      expect(descendants).toContainEqual(grandchild1)
      expect(descendants).toContainEqual(grandchild2)
    }
  })

  it('should get root nodes', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)

    const root1 = store.addNode(null, 'Root 1')
    const root2 = store.addNode(null, 'Root 2')
    const child = store.addNode(root1?.id || '', 'Child')

    const rootNodes = store.getRootNodes()
    expect(rootNodes.length).toBe(2)
    expect(rootNodes).toContainEqual(root1)
    expect(rootNodes).toContainEqual(root2)
    expect(rootNodes).not.toContainEqual(child)
  })
})
