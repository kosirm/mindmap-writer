import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUnifiedDocumentStore } from '../../src/core/stores/unifiedDocumentStore'

describe('Unified Document Store - Basic Functionality', () => {
  beforeEach(() => {
    // Create a fresh pinia instance for each test
    setActivePinia(createPinia())
  })

  it('should initialize with empty state', () => {
    const store = useUnifiedDocumentStore()
    
    expect(store.documents.size).toBe(0)
    expect(store.documentInstances.size).toBe(0)
    expect(store.activeDocumentId).toBeNull()
    expect(store.layouts.size).toBe(0)
    expect(store.dirtyDocuments.size).toBe(0)
    expect(store.masterMapDocuments.size).toBe(0)
    expect(store.selectedNodeIds.length).toBe(0)
  })

  it('should have computed properties working correctly', () => {
    const store = useUnifiedDocumentStore()
    
    expect(store.activeDocument).toBeNull()
    expect(store.allDocuments).toEqual([])
    expect(store.hasUnsavedChanges).toBe(false)
  })

  it('should create empty document with correct structure', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test Document')
    
    expect(doc).toBeDefined()
    expect(doc.version).toBe('1.0')
    expect(doc.metadata.name).toBe('Test Document')
    expect(doc.metadata.id).toMatch(/^doc-\d+-[a-z0-9]+$/)
    expect(doc.nodes).toEqual([])
    expect(doc.edges).toEqual([])
    expect(doc.interMapLinks).toEqual([])
    expect(doc.layout.activeView).toBe('mindmap')
    expect(doc.layout.orientationMode).toBe('anticlockwise')
  })

  it('should create empty document with default name when none provided', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument()
    
    expect(doc.metadata.name).toBe('Untitled')
  })

  it('should generate unique document IDs', () => {
    const store = useUnifiedDocumentStore()
    const doc1 = store.createEmptyDocument('Doc 1')
    const doc2 = store.createEmptyDocument('Doc 2')
    
    expect(doc1.metadata.id).not.toBe(doc2.metadata.id)
  })

  it('should generate unique timestamps for documents', () => {
    const store = useUnifiedDocumentStore()
    const doc1 = store.createEmptyDocument('Doc 1')
    const doc2 = store.createEmptyDocument('Doc 2')
    
    expect(doc1.metadata.created).toBeDefined()
    expect(doc2.metadata.created).toBeDefined()
    expect(doc1.metadata.modified).toBeDefined()
    expect(doc2.metadata.modified).toBeDefined()
  })

  it('should have working markDirty and markClean functions', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    
    // Mark as dirty
    store.markDirty(doc.metadata.id)
    expect(store.isDirty(doc.metadata.id)).toBe(true)
    expect(store.hasUnsavedChanges).toBe(true)
    
    // Mark as clean
    store.markClean(doc.metadata.id)
    expect(store.isDirty(doc.metadata.id)).toBe(false)
    expect(store.hasUnsavedChanges).toBe(false)
  })

  it('should handle non-existent document in markDirty/markClean', () => {
    const store = useUnifiedDocumentStore()
    
    // Should not throw errors
    expect(() => store.markDirty('non-existent-id')).not.toThrow()
    expect(() => store.markClean('non-existent-id')).not.toThrow()
    expect(store.isDirty('non-existent-id')).toBe(false)
  })

  it('should update document metadata correctly', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Original')
    
    // Add document to store
    store.addDocument(doc)
    
    // Update metadata
    store.updateDocumentMetadata(doc.metadata.id, {
      name: 'Updated Name',
      description: 'Updated Description'
    })
    
    const updatedDoc = store.getDocumentById(doc.metadata.id)
    expect(updatedDoc).not.toBeNull()
    expect(updatedDoc?.metadata.name).toBe('Updated Name')
    expect(updatedDoc?.metadata.description).toBe('Updated Description')
    expect(updatedDoc?.metadata.modified).not.toBe(doc.metadata.modified)
  })

  it('should update document layout settings correctly', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    
    // Add document to store
    store.addDocument(doc)
    
    // Update layout
    store.updateDocumentLayoutSettings(doc.metadata.id, {
      orientationMode: 'clockwise',
      lodEnabled: false
    })
    
    const updatedDoc = store.getDocumentById(doc.metadata.id)
    expect(updatedDoc).not.toBeNull()
    expect(updatedDoc?.layout.orientationMode).toBe('clockwise')
    expect(updatedDoc?.layout.lodEnabled).toBe(false)
  })

  it('should handle layout updates on non-existent document gracefully', () => {
    const store = useUnifiedDocumentStore()
    
    // Should not throw errors
    expect(() => store.updateDocumentLayoutSettings('non-existent-id', {
      orientationMode: 'clockwise'
    })).not.toThrow()
  })

  it('should handle metadata updates on non-existent document gracefully', () => {
    const store = useUnifiedDocumentStore()
    
    // Should not throw errors
    expect(() => store.updateDocumentMetadata('non-existent-id', {
      name: 'Test'
    })).not.toThrow()
  })
})