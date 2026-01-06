import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUnifiedDocumentStore } from '../../src/core/stores/unifiedDocumentStore'
import { eventBus } from '../../src/core/events'

describe('Unified Document Store - Selection and Expansion', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should initialize with empty selection', () => {
    const store = useUnifiedDocumentStore()
    
    expect(store.selectedNodeIds.length).toBe(0)
  })

  it('should select single node', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)
    
    const node = store.addNode(null, 'Test Node')
    
    if (node) {
      store.selectNode(node.id)
      
      expect(store.selectedNodeIds).toEqual([node.id])
    }
  })

  it('should clear selection when selecting null', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)
    
    const node = store.addNode(null, 'Test Node')
    
    if (node) {
      store.selectNode(node.id)
      expect(store.selectedNodeIds).toEqual([node.id])
      
      store.selectNode(null)
      expect(store.selectedNodeIds).toEqual([])
    }
  })

  it('should emit node-selected event when selecting node', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)
    
    const node = store.addNode(null, 'Test Node')
    const spy = vi.spyOn(eventBus, 'emit')
    
    if (node) {
      store.selectNode(node.id)
      
      expect(spy).toHaveBeenCalledWith('store:node-selected', expect.objectContaining({
        nodeId: node.id,
        source: 'store',
        scrollIntoView: true
      }))
    }
  })

  it('should emit node-selected event with null when clearing selection', () => {
    const store = useUnifiedDocumentStore()
    const spy = vi.spyOn(eventBus, 'emit')
    
    store.selectNode(null)
    
    expect(spy).toHaveBeenCalledWith('store:node-selected', expect.objectContaining({
      nodeId: null,
      source: 'store',
      scrollIntoView: false
    }))
  })

  it('should select multiple nodes', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)
    
    const node1 = store.addNode(null, 'Node 1')
    const node2 = store.addNode(null, 'Node 2')
    const node3 = store.addNode(null, 'Node 3')
    
    if (node1 && node2 && node3) {
      store.selectNodes([node1.id, node2.id, node3.id])
      
      expect(store.selectedNodeIds).toEqual([node1.id, node2.id, node3.id])
    }
  })

  it('should emit nodes-selected event when selecting multiple nodes', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)
    
    const node1 = store.addNode(null, 'Node 1')
    const node2 = store.addNode(null, 'Node 2')
    const spy = vi.spyOn(eventBus, 'emit')
    
    if (node1 && node2) {
      store.selectNodes([node1.id, node2.id])
      
      expect(spy).toHaveBeenCalledWith('store:nodes-selected', expect.objectContaining({
        nodeIds: [node1.id, node2.id],
        source: 'store'
      }))
    }
  })

  it('should clear selection', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)
    
    const node1 = store.addNode(null, 'Node 1')
    const node2 = store.addNode(null, 'Node 2')
    
    if (node1 && node2) {
      store.selectNodes([node1.id, node2.id])
      expect(store.selectedNodeIds.length).toBe(2)
      
      store.clearSelection()
      expect(store.selectedNodeIds.length).toBe(0)
    }
  })

  it('should emit node-selected event with null when clearing selection via clearSelection', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)
    
    const node = store.addNode(null, 'Test Node')
    const spy = vi.spyOn(eventBus, 'emit')
    
    if (node) {
      store.selectNode(node.id)
      store.clearSelection()
      
      expect(spy).toHaveBeenCalledWith('store:node-selected', expect.objectContaining({
        nodeId: null,
        source: 'store',
        scrollIntoView: false
      }))
    }
  })

  it('should expand node in outline view', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)
    
    const node = store.addNode(null, 'Test Node')
    
    if (node) {
      // Initially should be expanded by default
      expect(store.isNodeExpanded(node.id)).toBe(true)
      
      // Collapse it first
      store.collapseNode(node.id)
      expect(store.isNodeExpanded(node.id)).toBe(false)
      
      // Expand it
      store.expandNode(node.id)
      expect(store.isNodeExpanded(node.id)).toBe(true)
    }
  })

  it('should emit node-expanded event when expanding node', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)
    
    const node = store.addNode(null, 'Test Node')
    const spy = vi.spyOn(eventBus, 'emit')
    
    if (node) {
      store.collapseNode(node.id) // Collapse first
      store.expandNode(node.id)
      
      expect(spy).toHaveBeenCalledWith('store:node-expanded', expect.objectContaining({
        nodeId: node.id,
        source: 'store'
      }))
    }
  })

  it('should collapse node in outline view', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)
    
    const node = store.addNode(null, 'Test Node')
    
    if (node) {
      store.collapseNode(node.id)
      expect(store.isNodeExpanded(node.id)).toBe(false)
    }
  })

  it('should emit node-collapsed event when collapsing node', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)
    
    const node = store.addNode(null, 'Test Node')
    const spy = vi.spyOn(eventBus, 'emit')
    
    if (node) {
      store.collapseNode(node.id)
      
      expect(spy).toHaveBeenCalledWith('store:node-collapsed', expect.objectContaining({
        nodeId: node.id,
        source: 'store'
      }))
    }
  })

  it('should toggle node expansion', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)
    
    const node = store.addNode(null, 'Test Node')
    
    if (node) {
      // Initially expanded
      expect(store.isNodeExpanded(node.id)).toBe(true)
      
      // Toggle should collapse
      store.toggleNodeExpansion(node.id)
      expect(store.isNodeExpanded(node.id)).toBe(false)
      
      // Toggle should expand
      store.toggleNodeExpansion(node.id)
      expect(store.isNodeExpanded(node.id)).toBe(true)
    }
  })

  it('should handle expansion operations on non-existent node gracefully', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)
    
    expect(() => store.expandNode('non-existent-id')).not.toThrow()
    expect(() => store.collapseNode('non-existent-id')).not.toThrow()
    expect(() => store.toggleNodeExpansion('non-existent-id')).not.toThrow()
    expect(store.isNodeExpanded('non-existent-id')).toBe(true) // Default for non-existent
  })

  it('should handle expansion operations when no active document', () => {
    const store = useUnifiedDocumentStore()
    
    expect(() => store.expandNode('test-id')).not.toThrow()
    expect(() => store.collapseNode('test-id')).not.toThrow()
    expect(() => store.toggleNodeExpansion('test-id')).not.toThrow()
    expect(store.isNodeExpanded('test-id')).toBe(true) // Default when no active doc
  })

  it('should mark document as dirty when expanding node', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)
    store.markClean(doc.metadata.id)
    
    const node = store.addNode(null, 'Test Node')
    
    if (node) {
      store.collapseNode(node.id) // Collapse first
      store.expandNode(node.id)
      
      expect(store.isDirty(doc.metadata.id)).toBe(true)
    }
  })

  it('should mark document as dirty when collapsing node', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)
    store.markClean(doc.metadata.id)
    
    const node = store.addNode(null, 'Test Node')
    
    if (node) {
      store.collapseNode(node.id)
      
      expect(store.isDirty(doc.metadata.id)).toBe(true)
    }
  })

  it('should set node side for mindmap view', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)
    
    const rootNode = store.addNode(null, 'Root Node')
    const childNode = store.addNode(rootNode?.id || '', 'Child Node')
    
    if (childNode) {
      store.setNodeSide(childNode.id, 'left')
      
      const updatedNode = store.getNodeById(childNode.id)
      expect(updatedNode?.data.side).toBe('left')
      expect(updatedNode?.views.mindmap?.side).toBe('left')
    }
  })

  it('should handle setting side on non-depth-1 node gracefully', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)
    
    const rootNode = store.addNode(null, 'Root Node')
    const childNode = store.addNode(rootNode?.id || '', 'Child Node')
    const grandchildNode = store.addNode(childNode?.id || '', 'Grandchild Node')
    
    if (grandchildNode) {
      // Grandchild is not depth-1, so setting side should not work
      store.setNodeSide(grandchildNode.id, 'left')
      
      const unchangedNode = store.getNodeById(grandchildNode.id)
      expect(unchangedNode?.data.side).toBeUndefined()
    }
  })

  it('should emit node-side-changed event when setting side', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)
    
    const rootNode = store.addNode(null, 'Root Node')
    const childNode = store.addNode(rootNode?.id || '', 'Child Node')
    const spy = vi.spyOn(eventBus, 'emit')
    
    if (childNode) {
      store.setNodeSide(childNode.id, 'right')
      
      expect(spy).toHaveBeenCalledWith('store:node-side-changed', expect.objectContaining({
        nodeId: childNode.id,
        newSide: 'right',
        source: 'store'
      }))
    }
  })

  it('should toggle node side', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)
    
    const rootNode = store.addNode(null, 'Root Node')
    const childNode = store.addNode(rootNode?.id || '', 'Child Node')
    
    if (childNode) {
      // Set initial side
      store.setNodeSide(childNode.id, 'left')
      expect(store.getNodeById(childNode.id)?.data.side).toBe('left')
      
      // Toggle should change to right
      store.toggleNodeSide(childNode.id)
      expect(store.getNodeById(childNode.id)?.data.side).toBe('right')
      
      // Toggle should change back to left
      store.toggleNodeSide(childNode.id)
      expect(store.getNodeById(childNode.id)?.data.side).toBe('left')
    }
  })

  it('should get root nodes with their sides', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)
    
    const root1 = store.addNode(null, 'Root 1')
    const root2 = store.addNode(null, 'Root 2')
    const child1 = store.addNode(root1?.id || '', 'Child 1')
    const child2 = store.addNode(root1?.id || '', 'Child 2')
    const child3 = store.addNode(root2?.id || '', 'Child 3')
    
    if (child1 && child2 && child3) {
      store.setNodeSide(child1.id, 'left')
      store.setNodeSide(child2.id, 'right')
      // child3 has no side set
      
      const rootNodesWithSides = store.getRootNodesWithSides()
      
      expect(rootNodesWithSides.length).toBe(2)
      
      const root1WithSides = rootNodesWithSides.find((r: { id: string, title: string, children: Array<{ id: string, title: string, side: 'left' | 'right' | null }> }) => r.id === root1?.id)
      const root2WithSides = rootNodesWithSides.find((r: { id: string, title: string, children: Array<{ id: string, title: string, side: 'left' | 'right' | null }> }) => r.id === root2?.id)
      
      expect(root1WithSides?.children.length).toBe(2)
      expect(root1WithSides?.children?.[0]?.side).toBe('left')
      expect(root1WithSides?.children?.[1]?.side).toBe('right')
       
      expect(root2WithSides?.children.length).toBe(1)
      expect(root2WithSides?.children?.[0]?.side).toBeNull()
    }
  })

  it('should handle getting root nodes with sides when no active document', () => {
    const store = useUnifiedDocumentStore()
    
    const rootNodes = store.getRootNodesWithSides()
    expect(rootNodes).toEqual([])
  })

  it('should mark document as dirty when setting node side', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)
    store.markClean(doc.metadata.id)
    
    const rootNode = store.addNode(null, 'Root Node')
    const childNode = store.addNode(rootNode?.id || '', 'Child Node')
    
    if (childNode) {
      store.setNodeSide(childNode.id, 'left')
      
      expect(store.isDirty(doc.metadata.id)).toBe(true)
    }
  })
})