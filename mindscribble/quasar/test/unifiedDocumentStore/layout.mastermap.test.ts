import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUnifiedDocumentStore } from '../../src/core/stores/unifiedDocumentStore'
import type { MasterMapDocument } from '../../src/core/types/masterMap'

describe('Unified Document Store - Layout and Master Map', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // ============================================================
  // LAYOUT MANAGEMENT TESTS
  // ============================================================

  it('should save layout for document', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)
    
    const layoutData = { panels: ['mindmap', 'outline', 'writer'], sizes: [30, 20, 50] }
    
    store.saveLayout(doc.metadata.id, layoutData)
    
    expect(store.layouts.size).toBe(1)
    expect(store.layouts.get(doc.metadata.id)).toEqual(layoutData)
  })

  it('should get layout for document', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)
    
    const layoutData = { panels: ['mindmap', 'outline', 'writer'], sizes: [30, 20, 50] }
    store.saveLayout(doc.metadata.id, layoutData)
    
    const retrievedLayout = store.getLayout(doc.metadata.id)
    
    expect(retrievedLayout).toEqual(layoutData)
  })

  it('should return null for non-existent document layout', () => {
    const store = useUnifiedDocumentStore()
    
    const retrievedLayout = store.getLayout('non-existent-id')
    
    expect(retrievedLayout).toBeNull()
  })

  it('should remove layout for document', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)
    
    const layoutData = { panels: ['mindmap', 'outline', 'writer'], sizes: [30, 20, 50] }
    store.saveLayout(doc.metadata.id, layoutData)
    
    store.removeLayout(doc.metadata.id)
    
    expect(store.layouts.size).toBe(0)
    expect(store.getLayout(doc.metadata.id)).toBeNull()
  })

  it('should handle removing non-existent layout gracefully', () => {
    const store = useUnifiedDocumentStore()
    
    expect(() => store.removeLayout('non-existent-id')).not.toThrow()
    expect(store.layouts.size).toBe(0)
  })

  it('should clear all layouts', () => {
    const store = useUnifiedDocumentStore()
    const doc1 = store.createEmptyDocument('Doc 1')
    const doc2 = store.createEmptyDocument('Doc 2')
    store.addDocument(doc1)
    store.addDocument(doc2)
    
    const layoutData1 = { panels: ['mindmap', 'outline'], sizes: [50, 50] }
    const layoutData2 = { panels: ['writer'], sizes: [100] }
    
    store.saveLayout(doc1.metadata.id, layoutData1)
    store.saveLayout(doc2.metadata.id, layoutData2)
    
    expect(store.layouts.size).toBe(2)
    
    store.clearAllLayouts()
    
    expect(store.layouts.size).toBe(0)
    expect(store.getLayout(doc1.metadata.id)).toBeNull()
    expect(store.getLayout(doc2.metadata.id)).toBeNull()
  })

  it('should handle clearing layouts when no layouts exist', () => {
    const store = useUnifiedDocumentStore()
    
    expect(() => store.clearAllLayouts()).not.toThrow()
    expect(store.layouts.size).toBe(0)
  })

  // ============================================================
  // MASTER MAP TESTS
  // ============================================================

  it('should add document to master map', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)
    
    const masterMapData: MasterMapDocument = {
      version: '1.0',
      metadata: {
        id: 'master-1',
        name: 'Master Map',
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      },
      links: [],
      mapRegistry: [],
      linkedNodes: [],
      visualization: {
        nodePositions: {},
        expandedMaps: [],
        zoom: 1,
        panX: 0,
        panY: 0
      }
    }
    
    store.addToMasterMap(doc.metadata.id, masterMapData)
    
    expect(store.masterMapDocuments.size).toBe(1)
    expect(store.masterMapDocuments.get(doc.metadata.id)).toEqual(masterMapData)
  })

  it('should get master map document by ID', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)
    
    const masterMapData: MasterMapDocument = {
      version: '1.0',
      metadata: {
        id: 'master-1',
        name: 'Master Map',
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      },
      links: [],
      mapRegistry: [],
      linkedNodes: [],
      visualization: {
        nodePositions: {},
        expandedMaps: [],
        zoom: 1,
        panX: 0,
        panY: 0
      }
    }
    
    store.addToMasterMap(doc.metadata.id, masterMapData)
    
    const retrievedMap = store.getMasterMapDocument(doc.metadata.id)
    
    expect(retrievedMap).toEqual(masterMapData)
  })

  it('should return null for non-existent master map document', () => {
    const store = useUnifiedDocumentStore()
    
    const retrievedMap = store.getMasterMapDocument('non-existent-id')
    
    expect(retrievedMap).toBeNull()
  })

  it('should get all master map documents', () => {
    const store = useUnifiedDocumentStore()
    const doc1 = store.createEmptyDocument('Doc 1')
    const doc2 = store.createEmptyDocument('Doc 2')
    store.addDocument(doc1)
    store.addDocument(doc2)
    
    const masterMapData1: MasterMapDocument = {
      version: '1.0',
      metadata: {
        id: 'master-1',
        name: 'Master Map 1',
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      },
      links: [],
      mapRegistry: [],
      linkedNodes: [],
      visualization: {
        nodePositions: {},
        expandedMaps: [],
        zoom: 1,
        panX: 0,
        panY: 0
      }
    }
    
    const masterMapData2: MasterMapDocument = {
      version: '1.0',
      metadata: {
        id: 'master-2',
        name: 'Master Map 2',
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      },
      links: [],
      mapRegistry: [],
      linkedNodes: [],
      visualization: {
        nodePositions: {},
        expandedMaps: [],
        zoom: 1,
        panX: 0,
        panY: 0
      }
    }
    
    store.addToMasterMap(doc1.metadata.id, masterMapData1)
    store.addToMasterMap(doc2.metadata.id, masterMapData2)
    
    const allMasterMaps = store.getAllMasterMapDocuments()
    
    expect(allMasterMaps.length).toBe(2)
    expect(allMasterMaps).toContainEqual(masterMapData1)
    expect(allMasterMaps).toContainEqual(masterMapData2)
  })

  it('should remove document from master map', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)
    
    const masterMapData: MasterMapDocument = {
      version: '1.0',
      metadata: {
        id: 'master-1',
        name: 'Master Map',
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      },
      links: [],
      mapRegistry: [],
      linkedNodes: [],
      visualization: {
        nodePositions: {},
        expandedMaps: [],
        zoom: 1,
        panX: 0,
        panY: 0
      }
    }
    
    store.addToMasterMap(doc.metadata.id, masterMapData)
    
    store.removeFromMasterMap(doc.metadata.id)
    
    expect(store.masterMapDocuments.size).toBe(0)
    expect(store.getMasterMapDocument(doc.metadata.id)).toBeNull()
  })

  it('should handle removing non-existent master map document gracefully', () => {
    const store = useUnifiedDocumentStore()
    
    expect(() => store.removeFromMasterMap('non-existent-id')).not.toThrow()
    expect(store.masterMapDocuments.size).toBe(0)
  })

  it('should update master map position', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)
    
    const masterMapData: MasterMapDocument = {
      version: '1.0',
      metadata: {
        id: 'master-1',
        name: 'Master Map',
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      },
      links: [],
      mapRegistry: [],
      linkedNodes: [],
      visualization: {
        nodePositions: {},
        expandedMaps: [],
        zoom: 1,
        panX: 0,
        panY: 0
      }
    }
    
    store.addToMasterMap(doc.metadata.id, masterMapData)
    
    const newPosition = { x: 100, y: 200 }
    store.updateMasterMapPosition(doc.metadata.id, newPosition)
    
    const updatedMap = store.getMasterMapDocument(doc.metadata.id)
    expect(updatedMap?.visualization?.nodePositions[doc.metadata.id]).toEqual(newPosition)
  })

  it('should handle updating position on non-existent master map document gracefully', () => {
    const store = useUnifiedDocumentStore()
    
    expect(() => store.updateMasterMapPosition('non-existent-id', { x: 100, y: 200 })).not.toThrow()
  })

  it('should clear all master map documents', () => {
    const store = useUnifiedDocumentStore()
    const doc1 = store.createEmptyDocument('Doc 1')
    const doc2 = store.createEmptyDocument('Doc 2')
    store.addDocument(doc1)
    store.addDocument(doc2)
    
    const masterMapData1: MasterMapDocument = {
      version: '1.0',
      metadata: {
        id: 'master-1',
        name: 'Master Map 1',
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      },
      links: [],
      mapRegistry: [],
      linkedNodes: [],
      visualization: {
        nodePositions: {},
        expandedMaps: [],
        zoom: 1,
        panX: 0,
        panY: 0
      }
    }
    
    const masterMapData2: MasterMapDocument = {
      version: '1.0',
      metadata: {
        id: 'master-2',
        name: 'Master Map 2',
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      },
      links: [],
      mapRegistry: [],
      linkedNodes: [],
      visualization: {
        nodePositions: {},
        expandedMaps: [],
        zoom: 1,
        panX: 0,
        panY: 0
      }
    }
    
    store.addToMasterMap(doc1.metadata.id, masterMapData1)
    store.addToMasterMap(doc2.metadata.id, masterMapData2)
    
    expect(store.masterMapDocuments.size).toBe(2)
    
    store.clearMasterMap()
    
    expect(store.masterMapDocuments.size).toBe(0)
    expect(store.getAllMasterMapDocuments().length).toBe(0)
  })

  it('should handle clearing master map when no documents exist', () => {
    const store = useUnifiedDocumentStore()
    
    expect(() => store.clearMasterMap()).not.toThrow()
    expect(store.masterMapDocuments.size).toBe(0)
  })

  // ============================================================
  // MIGRATION UTILITIES TESTS
  // ============================================================

  it('should have working migration utilities', () => {
    const store = useUnifiedDocumentStore()
    
    // These should not throw errors
    expect(() => store.getActiveDocumentFromLegacy()).not.toThrow()
    expect(() => store.getAllDocumentsFromLegacy()).not.toThrow()
  })

  it('should log migration operations in development mode', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    store.addDocument(doc)
    
    // These operations should log in development mode
    expect(() => store.addNode(null, 'Test Node')).not.toThrow()
    expect(() => store.updateNode('test-id', { title: 'Test' })).not.toThrow()
    expect(() => store.deleteNode('test-id')).not.toThrow()
  })

  // ============================================================
  // EVENT FORWARDING TESTS
  // ============================================================

  it('should have event forwarding methods', () => {
    const store = useUnifiedDocumentStore()
    
    // These should be defined and callable
    expect(store.emitEvent).toBeDefined()
    expect(store.emitNodeCreated).toBeDefined()
    expect(store.emitNodeUpdated).toBeDefined()
    expect(store.emitNodeMoved).toBeDefined()
    expect(store.emitNodeDeleted).toBeDefined()
    expect(store.emitNodeSelected).toBeDefined()
    expect(store.emitNodesSelected).toBeDefined()
    expect(store.emitViewChanged).toBeDefined()
    expect(store.emitNodeLoaded).toBeDefined()
    expect(store.emitDocumentCleared).toBeDefined()
  })

  it('should forward events without throwing errors', () => {
    const store = useUnifiedDocumentStore()
    
    expect(() => store.emitEvent('store:node-created', { nodeId: 'test', parentId: null, position: { x: 0, y: 0 }, source: 'store' })).not.toThrow()
    expect(() => store.emitNodeCreated('test', null, { x: 0, y: 0 })).not.toThrow()
    expect(() => store.emitNodeUpdated('test', { title: 'Test' })).not.toThrow()
    expect(() => store.emitNodeMoved('test', { x: 100, y: 200 }, { x: 0, y: 0 })).not.toThrow()
    expect(() => store.emitNodeDeleted('test', ['test'])).not.toThrow()
    expect(() => store.emitNodeSelected('test')).not.toThrow()
    expect(() => store.emitNodesSelected(['test1', 'test2'])).not.toThrow()
    expect(() => store.emitViewChanged('mindmap', 'outline', true)).not.toThrow()
    expect(() => store.emitNodeLoaded('test', 'Test Document')).not.toThrow()
    expect(() => store.emitDocumentCleared()).not.toThrow()
  })
})