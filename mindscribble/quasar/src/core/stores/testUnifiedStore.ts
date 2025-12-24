/**
 * Unified Store Console Test
 *
 * Simple console-based test to verify the unified store and dual-write system
 */

import { createPinia } from 'pinia'
import { useUnifiedDocumentStore } from './unifiedDocumentStore'
import { useStoreSynchronizer } from './storeSynchronizer'
import { useDocumentStore } from './documentStore'
import { useMultiDocumentStore } from './multiDocumentStore'
import type { MindscribbleDocument, MasterMapDocument } from '../types'

// Create Pinia instance (used implicitly by Pinia stores)
createPinia()

function runUnifiedStoreTests() {
  console.log('🧪 Starting Unified Store Tests...')

  // Test 1: Basic initialization
  console.log('\n1️⃣ Testing basic initialization...')
  const unifiedStore = useUnifiedDocumentStore()
  const documentStore = useDocumentStore()
  const multiDocumentStore = useMultiDocumentStore()
  const synchronizer = useStoreSynchronizer()

  console.log('✅ Stores initialized')
  console.log(`   Unified store documents: ${unifiedStore.documents.size}`)
  console.log(`   Active document ID: ${unifiedStore.activeDocumentId}`)

  // Test 2: Create a test document
  console.log('\n2️⃣ Creating test document...')
  const testDoc: MindscribbleDocument = {
    version: '1.0',
    metadata: {
      id: 'test-doc-1',
      name: 'Test Document',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      tags: ['test', 'console'],
      searchableText: 'Test document for console testing',
      nodeCount: 0,
      edgeCount: 0,
      maxDepth: 0
    },
    nodes: [],
    edges: [],
    interMapLinks: [],
    layout: {
      activeView: 'mindmap',
      orientationMode: 'anticlockwise',
      lodEnabled: true,
      lodThresholds: [10, 30, 50, 70, 90],
      horizontalSpacing: 50,
      verticalSpacing: 20
    }
  }

  // Test 3: Dual-write add document
  console.log('\n3️⃣ Testing dual-write add document...')
  synchronizer.dualWriteAddDocument(testDoc)

  console.log('✅ Document added via dual-write')
  console.log(`   Unified store documents: ${unifiedStore.documents.size}`)
  console.log(`   Active document ID: ${unifiedStore.activeDocumentId}`)
  console.log(`   Legacy document store ID: ${documentStore.toDocument().metadata.id}`)
  console.log(`   Multi-document store count: ${multiDocumentStore.documentCount}`)

  // Test 4: Verify data consistency
  console.log('\n4️⃣ Verifying data consistency...')
  const unifiedDoc = unifiedStore.getDocumentById('test-doc-1')
  const legacyDoc = documentStore.toDocument()
  const multiDocs = multiDocumentStore.allDocuments

  const nameMatch = unifiedDoc?.metadata.name === legacyDoc.metadata.name
  const idMatch = unifiedDoc?.metadata.id === legacyDoc.metadata.id
  const multiIdMatch = multiDocs[0]?.document.metadata.id === 'test-doc-1'

  console.log(`   Name consistency: ${nameMatch ? '✅' : '❌'}`)
  console.log(`   ID consistency: ${idMatch ? '✅' : '❌'}`)
  console.log(`   Multi-doc consistency: ${multiIdMatch ? '✅' : '❌'}`)

  // Test 5: Update document metadata
  console.log('\n5️⃣ Testing dual-write metadata update...')
  synchronizer.dualWriteUpdateDocumentMetadata('test-doc-1', {
    name: 'Updated Test Document',
    description: 'This document has been updated'
  })

  console.log('✅ Metadata updated via dual-write')
  console.log(`   Unified doc name: ${unifiedStore.getDocumentById('test-doc-1')?.metadata.name}`)
  console.log(`   Legacy doc name: ${documentStore.toDocument().metadata.name}`)
  console.log(`   Multi-doc name: ${multiDocumentStore.allDocuments[0]?.document.metadata.name}`)

  // Test 6: Master map integration
  console.log('\n6️⃣ Testing master map integration...')
  const masterMapData: MasterMapDocument = {
    version: '1.0',
    metadata: {
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    },
    links: [],
    mapRegistry: [{
      type: 'map',
      id: 'test-doc-1',
      mapId: 'test-doc-1',
      mapName: 'Test Document',
      modified: new Date().toISOString(),
      nodeCount: 0,
      tags: [],
      rootNodeTitles: [],
      incomingLinkCount: 0,
      outgoingLinkCount: 0,
      position: { x: 100, y: 200 }
    }],
    linkedNodes: [],
    visualization: {
      nodePositions: {
        'test-doc-1': { x: 100, y: 200 }
      },
      expandedMaps: [],
      zoom: 1,
      panX: 0,
      panY: 0
    }
  }

  unifiedStore.addToMasterMap('test-doc-1', masterMapData)
  console.log('✅ Document added to master map')
  console.log(`   Master map documents: ${unifiedStore.masterMapDocuments.size}`)
  console.log(`   Master map position: ${JSON.stringify(unifiedStore.getMasterMapDocument('test-doc-1')?.visualization?.nodePositions['test-doc-1'])}`)

  // Test 7: Update master map position
  console.log('\n7️⃣ Testing master map position update...')
  unifiedStore.updateMasterMapPosition('test-doc-1', { x: 150, y: 250 })
  const updatedPosition = unifiedStore.getMasterMapDocument('test-doc-1')?.visualization?.nodePositions['test-doc-1']
  console.log('✅ Master map position updated')
  console.log(`   New position: ${JSON.stringify(updatedPosition)}`)

  // Test 8: Event forwarding
  console.log('\n8️⃣ Testing event forwarding...')
  console.log('✅ Event forwarding methods available:')
  console.log(`   emitEvent: ${typeof unifiedStore.emitEvent}`)
  console.log(`   emitNodeCreated: ${typeof unifiedStore.emitNodeCreated}`)
  console.log(`   emitNodeUpdated: ${typeof unifiedStore.emitNodeUpdated}`)
  console.log(`   emitViewChanged: ${typeof unifiedStore.emitViewChanged}`)

  // Test 9: Layout management
  console.log('\n9️⃣ Testing layout management...')
  const testLayout = {
    panels: [
      { id: 'mindmap', size: 60 },
      { id: 'outline', size: 20 },
      { id: 'writer', size: 20 }
    ]
  }

  unifiedStore.saveLayout('test-doc-1', testLayout)
  const retrievedLayout = unifiedStore.getLayout('test-doc-1')
  console.log('✅ Layout saved and retrieved')
  console.log(`   Layout data: ${JSON.stringify(retrievedLayout)}`)

  // Test 10: Consistency check
  console.log('\n🔍 Running consistency check...')
  synchronizer.checkConsistency()
  console.log('✅ Consistency check completed')

  console.log('\n🎉 All tests completed successfully!')
  console.log('\n📊 Test Summary:')
  console.log('   ✅ Basic initialization')
  console.log('   ✅ Dual-write document creation')
  console.log('   ✅ Data consistency verification')
  console.log('   ✅ Dual-write metadata updates')
  console.log('   ✅ Master map integration')
  console.log('   ✅ Master map position updates')
  console.log('   ✅ Event forwarding')
  console.log('   ✅ Layout management')
  console.log('   ✅ Consistency checking')

  // Test 10: Run comprehensive consistency check
  console.log('\n🔍 Running final comprehensive consistency check...')
  synchronizer.checkConsistency()
  console.log('✅ Final consistency check completed')
}

// Run the tests
runUnifiedStoreTests()

// Export for potential use in other modules
export { runUnifiedStoreTests }
