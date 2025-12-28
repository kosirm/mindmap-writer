/**
 * Property Serialization Performance Utilities
 * Measure the actual cost of serialization/deserialization
 */

import { serializeNode, deserializeNode, serializeDocument, deserializeDocument } from './propertySerialization'

export interface PerformanceMetrics {
  operation: string
  itemCount: number
  totalTimeMs: number
  avgTimePerItemMs: number
  itemsPerSecond: number
}

/**
 * Benchmark node serialization performance
 */
export function benchmarkNodeSerialization(nodeCount: number = 1000): PerformanceMetrics {
  // Create test nodes
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    id: `node-${i}`,
    type: 'custom',
    position: { x: i * 100, y: i * 50 },
    data: {
      parentId: i > 0 ? `node-${i - 1}` : null,
      order: i,
      title: `Node ${i}`,
      content: `Content for node ${i}`,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      color: '#3b82f6',
      icon: 'mdi-circle'
    }
  }))

  // Benchmark serialization
  const startTime = performance.now()
  for (const node of nodes) {
    serializeNode(node, { validate: false })
  }
  const endTime = performance.now()

  const totalTimeMs = endTime - startTime
  const avgTimePerItemMs = totalTimeMs / nodeCount
  const itemsPerSecond = (nodeCount / totalTimeMs) * 1000

  return {
    operation: 'Node Serialization',
    itemCount: nodeCount,
    totalTimeMs,
    avgTimePerItemMs,
    itemsPerSecond
  }
}

/**
 * Benchmark node deserialization performance
 */
export function benchmarkNodeDeserialization(nodeCount: number = 1000): PerformanceMetrics {
  // Create test serialized nodes
  const serializedNodes = Array.from({ length: nodeCount }, (_, i) => ({
    i: `node-${i}`,
    y: 'custom',
    x: i * 100,
    z: i * 50,
    p: i > 0 ? `node-${i - 1}` : null,
    o: i,
    t: `Node ${i}`,
    c: `Content for node ${i}`,
    r: new Date().toISOString(),
    m: new Date().toISOString(),
    co: '#3b82f6',
    ic: 'mdi-circle'
  }))

  // Benchmark deserialization
  const startTime = performance.now()
  for (const node of serializedNodes) {
    deserializeNode(node)
  }
  const endTime = performance.now()

  const totalTimeMs = endTime - startTime
  const avgTimePerItemMs = totalTimeMs / nodeCount
  const itemsPerSecond = (nodeCount / totalTimeMs) * 1000

  return {
    operation: 'Node Deserialization',
    itemCount: nodeCount,
    totalTimeMs,
    avgTimePerItemMs,
    itemsPerSecond
  }
}

/**
 * Benchmark full document deserialization (nodes + edges)
 */
export function benchmarkDocumentDeserialization(nodeCount: number = 1000): PerformanceMetrics {
  // Create test serialized document
  const serializedNodes = Array.from({ length: nodeCount }, (_, i) => ({
    i: `node-${i}`,
    y: 'custom',
    x: i * 100,
    z: i * 50,
    p: i > 0 ? `node-${i - 1}` : null,
    o: i,
    t: `Node ${i}`,
    c: `Content for node ${i}`,
    r: new Date().toISOString(),
    m: new Date().toISOString()
  }))

  const serializedEdges = Array.from({ length: nodeCount - 1 }, (_, i) => ({
    i: `edge-${i}`,
    s: `node-${i}`,
    t: `node-${i + 1}`,
    y: 'hierarchy'
  }))

  const serializedDocument = {
    v: '1.0',
    i: 'test-doc',
    n: 'Test Document',
    r: new Date().toISOString(),
    m: new Date().toISOString(),
    nodes: serializedNodes,
    edges: serializedEdges,
    interMapLinks: []
  }

  // Benchmark
  const startTime = performance.now()
  deserializeDocument(serializedDocument)
  const endTime = performance.now()

  const totalTimeMs = endTime - startTime
  const totalItems = nodeCount + serializedEdges.length
  const avgTimePerItemMs = totalTimeMs / totalItems
  const itemsPerSecond = (totalItems / totalTimeMs) * 1000

  return {
    operation: 'Document Deserialization',
    itemCount: totalItems,
    totalTimeMs,
    avgTimePerItemMs,
    itemsPerSecond
  }
}

/**
 * Benchmark full document serialization (nodes + edges)
 */
export function benchmarkDocumentSerialization(nodeCount: number = 1000): PerformanceMetrics {
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    id: `node-${i}`,
    type: 'custom',
    position: { x: i * 100, y: i * 50 },
    data: {
      parentId: i > 0 ? `node-${i - 1}` : null,
      order: i,
      title: `Node ${i}`,
      content: `Content for node ${i}`,
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    }
  }))

  const edges = Array.from({ length: nodeCount - 1 }, (_, i) => ({
    id: `edge-${i}`,
    source: `node-${i}`,
    target: `node-${i + 1}`,
    data: { edgeType: 'hierarchy' }
  }))

  const document = {
    version: '1.0',
    metadata: {
      id: 'test-doc',
      name: 'Test Document',
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    },
    nodes,
    edges,
    interMapLinks: []
  }

  // Benchmark
  const startTime = performance.now()
  serializeDocument(document, { validate: false })
  const endTime = performance.now()

  const totalTimeMs = endTime - startTime
  const totalItems = nodeCount + edges.length
  const avgTimePerItemMs = totalTimeMs / totalItems
  const itemsPerSecond = (totalItems / totalTimeMs) * 1000

  return {
    operation: 'Document Serialization',
    itemCount: totalItems,
    totalTimeMs,
    avgTimePerItemMs,
    itemsPerSecond
  }
}

/**
 * Run all benchmarks and return results
 */
export function runAllBenchmarks(nodeCount: number = 1000): PerformanceMetrics[] {
  console.log(`🔬 Running performance benchmarks with ${nodeCount} nodes...`)

  const results = [
    benchmarkNodeSerialization(nodeCount),
    benchmarkNodeDeserialization(nodeCount),
    benchmarkDocumentSerialization(nodeCount),
    benchmarkDocumentDeserialization(nodeCount)
  ]

  console.table(results)
  return results
}

