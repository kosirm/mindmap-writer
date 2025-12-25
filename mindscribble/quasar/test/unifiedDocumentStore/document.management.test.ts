import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUnifiedDocumentStore } from '../../src/core/stores/unifiedDocumentStore'

describe('Unified Document Store - Document Management', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should add document to store', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test Document')
    
    store.addDocument(doc)
    
    expect(store.documents.size).toBe(1)
    expect(store.documents.get(doc.metadata.id)).toBeDefined()
    expect(store.activeDocumentId).toBe(doc.metadata.id)
    expect(store.activeDocument).toEqual(doc)
  })

  it('should set first document as active when added', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('First Document')
    
    store.addDocument(doc)
    
    expect(store.activeDocumentId).toBe(doc.metadata.id)
  })

  it('should not change active document when adding second document', () => {
    const store = useUnifiedDocumentStore()
    const doc1 = store.createEmptyDocument('First Document')
    const doc2 = store.createEmptyDocument('Second Document')
    
    store.addDocument(doc1)
    const firstActiveId = store.activeDocumentId
    
    store.addDocument(doc2)
    
    expect(store.activeDocumentId).toBe(firstActiveId)
    expect(store.documents.size).toBe(2)
  })

  it('should remove document from store', () => {
    const store = useUnifiedDocumentStore()
    const doc1 = store.createEmptyDocument('Doc 1')
    const doc2 = store.createEmptyDocument('Doc 2')
    
    store.addDocument(doc1)
    store.addDocument(doc2)
    
    store.removeDocument(doc1.metadata.id)
    
    expect(store.documents.size).toBe(1)
    expect(store.documents.get(doc1.metadata.id)).toBeUndefined()
    expect(store.documents.get(doc2.metadata.id)).toBeDefined()
  })

  it('should handle removing non-existent document gracefully', () => {
    const store = useUnifiedDocumentStore()
    
    expect(() => store.removeDocument('non-existent-id')).not.toThrow()
    expect(store.documents.size).toBe(0)
  })

  it('should set active document correctly', () => {
    const store = useUnifiedDocumentStore()
    const doc1 = store.createEmptyDocument('Doc 1')
    const doc2 = store.createEmptyDocument('Doc 2')
    
    store.addDocument(doc1)
    store.addDocument(doc2)
    
    store.setActiveDocument(doc2.metadata.id)
    
    expect(store.activeDocumentId).toBe(doc2.metadata.id)
    expect(store.activeDocument).toEqual(doc2)
  })

  it('should set active document to null when no documents exist', () => {
    const store = useUnifiedDocumentStore()
    
    store.setActiveDocument(null)
    
    expect(store.activeDocumentId).toBeNull()
    expect(store.activeDocument).toBeNull()
  })

  it('should handle setting active document to non-existent ID', () => {
    const store = useUnifiedDocumentStore()
    
    expect(() => store.setActiveDocument('non-existent-id')).not.toThrow()
    expect(store.activeDocumentId).toBe('non-existent-id')
    expect(store.activeDocument).toBeNull()
  })

  it('should switch active document when removing current active document', () => {
    const store = useUnifiedDocumentStore()
    const doc1 = store.createEmptyDocument('Doc 1')
    const doc2 = store.createEmptyDocument('Doc 2')
    const doc3 = store.createEmptyDocument('Doc 3')
    
    store.addDocument(doc1)
    store.addDocument(doc2)
    store.addDocument(doc3)
    
    // Set doc2 as active
    store.setActiveDocument(doc2.metadata.id)
    
    // Remove doc2 (current active)
    store.removeDocument(doc2.metadata.id)
    
    // Should switch to another document (doc1 or doc3)
    expect(store.activeDocumentId).not.toBe(doc2.metadata.id)
    expect([doc1.metadata.id, doc3.metadata.id]).toContain(store.activeDocumentId)
  })

  it('should set active document to null when removing last document', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Only Document')
    
    store.addDocument(doc)
    
    // Remove the only document
    store.removeDocument(doc.metadata.id)
    
    expect(store.activeDocumentId).toBeNull()
    expect(store.activeDocument).toBeNull()
  })

  it('should get document by ID', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test Document')
    
    store.addDocument(doc)
    
    const retrievedDoc = store.getDocumentById(doc.metadata.id)
    
    expect(retrievedDoc).toEqual(doc)
  })

  it('should return null for non-existent document ID', () => {
    const store = useUnifiedDocumentStore()
    
    const retrievedDoc = store.getDocumentById('non-existent-id')
    
    expect(retrievedDoc).toBeNull()
  })

  it('should have working allDocuments computed property', () => {
    const store = useUnifiedDocumentStore()
    const doc1 = store.createEmptyDocument('Doc 1')
    const doc2 = store.createEmptyDocument('Doc 2')
    
    store.addDocument(doc1)
    store.addDocument(doc2)
    
    const allDocs = store.allDocuments
    
    expect(allDocs.length).toBe(2)
    expect(allDocs).toContainEqual(doc1)
    expect(allDocs).toContainEqual(doc2)
  })

  it('should handle document updates with revision counter', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    
    // Add document
    store.addDocument(doc)
    const initialRevision = store.documentRevision
    
    // Update document (should increment revision)
    const updatedDoc = { ...doc, metadata: { ...doc.metadata, name: 'Updated' } }
    store.updateDocument(doc.metadata.id, updatedDoc)
    
    expect(store.documentRevision).toBeGreaterThan(initialRevision)
    expect(store.getDocumentById(doc.metadata.id)?.metadata.name).toBe('Updated')
  })

  it('should mark document as dirty when adding document', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    
    store.addDocument(doc)
    
    expect(store.isDirty(doc.metadata.id)).toBe(true)
    expect(store.hasUnsavedChanges).toBe(true)
  })

  it('should mark document as dirty when updating document', () => {
    const store = useUnifiedDocumentStore()
    const doc = store.createEmptyDocument('Test')
    
    store.addDocument(doc)
    store.markClean(doc.metadata.id)
    
    const updatedDoc = { ...doc, metadata: { ...doc.metadata, name: 'Updated' } }
    store.updateDocument(doc.metadata.id, updatedDoc)
    
    expect(store.isDirty(doc.metadata.id)).toBe(true)
  })
})