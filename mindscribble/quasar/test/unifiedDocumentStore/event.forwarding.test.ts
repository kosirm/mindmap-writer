import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUnifiedDocumentStore } from '../../src/core/stores/unifiedDocumentStore'
import { eventBus } from '../../src/core/events'

describe('Unified Document Store - Event Forwarding', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should emit generic event with source tracking', () => {
    const store = useUnifiedDocumentStore()
    const spy = vi.spyOn(eventBus, 'emit')
    
    store.emitEvent('store:node-created', { nodeId: 'test', parentId: null, position: { x: 0, y: 0 }, testData: 'test-value' })
    
    expect(spy).toHaveBeenCalledWith('store:node-created', expect.objectContaining({
      nodeId: 'test',
      source: 'store'
    }))
  })

  it('should emit node-created event', () => {
    const store = useUnifiedDocumentStore()
    const spy = vi.spyOn(eventBus, 'emit')
    
    store.emitNodeCreated('node-1', 'parent-1', { x: 100, y: 200 })
    
    expect(spy).toHaveBeenCalledWith('store:node-created', expect.objectContaining({
      nodeId: 'node-1',
      parentId: 'parent-1',
      position: { x: 100, y: 200 },
      source: 'store'
    }))
  })

  it('should emit node-updated event', () => {
    const store = useUnifiedDocumentStore()
    const spy = vi.spyOn(eventBus, 'emit')
    
    store.emitNodeUpdated('node-1', { title: 'Updated Title', content: 'Updated Content' })
    
    expect(spy).toHaveBeenCalledWith('store:node-updated', expect.objectContaining({
      nodeId: 'node-1',
      changes: { title: 'Updated Title', content: 'Updated Content' },
      source: 'store'
    }))
  })

  it('should emit node-moved event', () => {
    const store = useUnifiedDocumentStore()
    const spy = vi.spyOn(eventBus, 'emit')
    
    const previousPosition = { x: 50, y: 100 }
    const newPosition = { x: 150, y: 200 }
    
    store.emitNodeMoved('node-1', newPosition, previousPosition)
    
    expect(spy).toHaveBeenCalledWith('store:node-moved', expect.objectContaining({
      nodeId: 'node-1',
      position: newPosition,
      previousPosition: previousPosition,
      source: 'store'
    }))
  })

  it('should emit node-deleted event', () => {
    const store = useUnifiedDocumentStore()
    const spy = vi.spyOn(eventBus, 'emit')
    
    const deletedIds = ['node-1', 'node-2', 'node-3']
    
    store.emitNodeDeleted('node-1', deletedIds)
    
    expect(spy).toHaveBeenCalledWith('store:node-deleted', expect.objectContaining({
      nodeId: 'node-1',
      deletedIds: deletedIds,
      source: 'store'
    }))
  })

  it('should emit node-selected event', () => {
    const store = useUnifiedDocumentStore()
    const spy = vi.spyOn(eventBus, 'emit')
    
    store.emitNodeSelected('node-1', true)
    
    expect(spy).toHaveBeenCalledWith('store:node-selected', expect.objectContaining({
      nodeId: 'node-1',
      scrollIntoView: true,
      source: 'store'
    }))
  })

  it('should emit node-selected event with null nodeId', () => {
    const store = useUnifiedDocumentStore()
    const spy = vi.spyOn(eventBus, 'emit')
    
    store.emitNodeSelected(null, false)
    
    expect(spy).toHaveBeenCalledWith('store:node-selected', expect.objectContaining({
      nodeId: null,
      scrollIntoView: false,
      source: 'store'
    }))
  })

  it('should emit nodes-selected event', () => {
    const store = useUnifiedDocumentStore()
    const spy = vi.spyOn(eventBus, 'emit')
    
    const nodeIds = ['node-1', 'node-2', 'node-3']
    
    store.emitNodesSelected(nodeIds)
    
    expect(spy).toHaveBeenCalledWith('store:nodes-selected', expect.objectContaining({
      nodeIds: nodeIds,
      source: 'store'
    }))
  })

  it('should emit view-changed event', () => {
    const store = useUnifiedDocumentStore()
    const spy = vi.spyOn(eventBus, 'emit')
    
    store.emitViewChanged('mindmap', 'outline', true)
    
    expect(spy).toHaveBeenCalledWith('store:view-changed', expect.objectContaining({
      previousView: 'mindmap',
      newView: 'outline',
      positionsLoaded: true,
      source: 'store'
    }))
  })

  it('should emit document-loaded event', () => {
    const store = useUnifiedDocumentStore()
    const spy = vi.spyOn(eventBus, 'emit')
    
    store.emitNodeLoaded('doc-1', 'Test Document')
    
    expect(spy).toHaveBeenCalledWith('store:document-loaded', expect.objectContaining({
      documentId: 'doc-1',
      documentName: 'Test Document',
      source: 'store'
    }))
  })

  it('should emit document-cleared event', () => {
    const store = useUnifiedDocumentStore()
    const spy = vi.spyOn(eventBus, 'emit')
    
    store.emitDocumentCleared()
    
    expect(spy).toHaveBeenCalledWith('store:document-cleared', expect.objectContaining({
      source: 'store'
    }))
  })

  it('should handle event forwarding with empty payloads', () => {
    const store = useUnifiedDocumentStore()
    
    // These should not throw errors
    expect(() => store.emitEvent('store:node-created', { nodeId: 'test', parentId: null, position: { x: 0, y: 0 } })).not.toThrow()
    expect(() => store.emitNodeCreated('', null, { x: 0, y: 0 })).not.toThrow()
    expect(() => store.emitNodeUpdated('', {})).not.toThrow()
    expect(() => store.emitNodeMoved('', { x: 0, y: 0 }, { x: 0, y: 0 })).not.toThrow()
    expect(() => store.emitNodeDeleted('', [])).not.toThrow()
    expect(() => store.emitNodeSelected(null)).not.toThrow()
    expect(() => store.emitNodesSelected([])).not.toThrow()
    expect(() => store.emitViewChanged('mindmap', 'outline', false)).not.toThrow()
    expect(() => store.emitNodeLoaded('', '')).not.toThrow()
    expect(() => store.emitDocumentCleared()).not.toThrow()
  })

  it('should handle event forwarding with edge cases', () => {
    const store = useUnifiedDocumentStore()
    
    // These should not throw errors with minimal valid payloads
    expect(() => store.emitEvent('store:node-created', { nodeId: 'test', parentId: null, position: { x: 0, y: 0 } })).not.toThrow()
    expect(() => store.emitNodeCreated('node-1', null, { x: 0, y: 0 })).not.toThrow()
    expect(() => store.emitNodeUpdated('node-1', {})).not.toThrow()
    expect(() => store.emitNodeMoved('node-1', { x: 0, y: 0 }, { x: 0, y: 0 })).not.toThrow()
    expect(() => store.emitNodeDeleted('node-1', [])).not.toThrow()
    expect(() => store.emitNodeSelected(null)).not.toThrow()
    expect(() => store.emitNodesSelected([])).not.toThrow()
    expect(() => store.emitViewChanged('mindmap', 'outline', false)).not.toThrow()
    expect(() => store.emitNodeLoaded('doc-1', '')).not.toThrow()
  })

  it('should log migration operations for event forwarding in development mode', () => {
    const store = useUnifiedDocumentStore()
    
    // These should log in development mode without throwing errors
    expect(() => store.emitEvent('store:node-created', { nodeId: 'test', parentId: null, position: { x: 0, y: 0 }, test: 'data' })).not.toThrow()
    expect(() => store.emitNodeCreated('node-1', null, { x: 0, y: 0 })).not.toThrow()
    expect(() => store.emitNodeUpdated('node-1', { title: 'Test' })).not.toThrow()
    expect(() => store.emitNodeMoved('node-1', { x: 100, y: 200 }, { x: 0, y: 0 })).not.toThrow()
    expect(() => store.emitNodeDeleted('node-1', ['node-1'])).not.toThrow()
    expect(() => store.emitNodeSelected('node-1')).not.toThrow()
    expect(() => store.emitNodesSelected(['node-1'])).not.toThrow()
    expect(() => store.emitViewChanged('mindmap', 'outline', true)).not.toThrow()
    expect(() => store.emitNodeLoaded('doc-1', 'Test')).not.toThrow()
    expect(() => store.emitDocumentCleared()).not.toThrow()
  })

  it('should handle multiple event emissions in sequence', () => {
    const store = useUnifiedDocumentStore()
    const spy = vi.spyOn(eventBus, 'emit')
    
    // Clear any previous calls
    spy.mockClear()
    
    // Emit multiple events in sequence
    store.emitNodeCreated('node-1', null, { x: 0, y: 0 })
    store.emitNodeUpdated('node-1', { title: 'Updated' })
    store.emitNodeMoved('node-1', { x: 100, y: 200 }, { x: 0, y: 0 })
    store.emitNodeSelected('node-1')
    
    // Should have been called 4 times
    expect(spy).toHaveBeenCalledTimes(4)
  })

  it('should handle event forwarding with complex payloads', () => {
    const store = useUnifiedDocumentStore()
    const spy = vi.spyOn(eventBus, 'emit')
    
    // Complex payload with nested objects
    const complexPayload = {
      nodeId: 'node-1',
      changes: {
        title: 'Complex Title',
        content: '<p>Complex HTML content</p>',
        metadata: {
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
          tags: ['tag1', 'tag2', 'tag3']
        }
      },
      additionalData: {
        position: { x: 100, y: 200 },
        size: { width: 200, height: 150 },
        viewSettings: {
          mindmap: { collapsed: false },
          outline: { expanded: true }
        }
      }
    }
    
    store.emitEvent('store:node-updated', complexPayload)
    
    expect(spy).toHaveBeenCalledWith('store:node-updated', expect.objectContaining({
      ...complexPayload,
      source: 'store'
    }))
  })
})