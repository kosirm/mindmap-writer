// Test file to demonstrate the improved circular layout spacing algorithm
import { useCircularLayout } from './useCircularLayout'

/**
 * Test with 7 nodes to see how spacing is equalized
 */
const testSevenNodesSpacing = () => {
  console.log('\n=== TEST: 7 Nodes with Equal Rectangle Spacing ===\n')
  
  const nodes = {
    'node1': { name: 'Node 1', parentId: null, order: 0 },
    'node2': { name: 'Node 2', parentId: null, order: 1 },
    'node3': { name: 'Node 3', parentId: null, order: 2 },
    'node4': { name: 'Node 4', parentId: null, order: 3 },
    'node5': { name: 'Node 5', parentId: null, order: 4 },
    'node6': { name: 'Node 6', parentId: null, order: 5 },
    'node7': { name: 'Node 7', parentId: null, order: 6 },
  }

  const edges: Record<string, { source: string; target: string; type: 'hierarchy' | 'reference' }> = {}
  const layouts: { nodes: Record<string, { x: number; y: number }> } = { nodes: {} }

  const { applyCircularLayout } = useCircularLayout()
  
  console.log('Applying circular layout with iterative spacing adjustment...\n')
  
  const result = applyCircularLayout(nodes, edges, layouts, 0, 0, {
    innerRadius: 150,      // Larger radius to see the effect better
    levelSpacing: 120,
    startAngle: -90,       // Start from top
    clockwise: true,
    minSectorAngle: 30,
    nodeSpacing: 60,
    spacingRatio: 1.0      // Use the new algorithm
  })

  console.log('\nLayout result:', result)
  console.log('\nFinal node positions:')
  Object.entries(layouts.nodes).forEach(([id, pos]) => {
    const angle = Math.atan2(pos.y, pos.x) * 180 / Math.PI
    console.log(`  ${id}: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}) - angle: ${angle.toFixed(1)}°`)
  })
  
  // Calculate and display distances between consecutive nodes
  console.log('\nDistances between consecutive rectangles:')
  const nodeIds = Object.keys(nodes)
  const nodeWidth = 120
  const nodeHeight = 40
  
  for (let i = 0; i < nodeIds.length; i++) {
    const currentId = nodeIds[i]!
    const nextId = nodeIds[(i + 1) % nodeIds.length]!
    const currentPos = layouts.nodes[currentId]!
    const nextPos = layouts.nodes[nextId]!
    
    // Simple distance calculation (not the full rectangle distance, just for visualization)
    const centerDistance = Math.sqrt(
      Math.pow(nextPos.x - currentPos.x, 2) + 
      Math.pow(nextPos.y - currentPos.y, 2)
    )
    
    console.log(`  ${currentId} -> ${nextId}: ${centerDistance.toFixed(1)} px (center-to-center)`)
  }
}

/**
 * Test with 4 nodes (cardinal directions)
 */
const testFourNodesCardinal = () => {
  console.log('\n=== TEST: 4 Nodes at Cardinal Directions ===\n')
  
  const nodes = {
    'north': { name: 'North', parentId: null, order: 0 },
    'east': { name: 'East', parentId: null, order: 1 },
    'south': { name: 'South', parentId: null, order: 2 },
    'west': { name: 'West', parentId: null, order: 3 },
  }

  const edges: Record<string, { source: string; target: string; type: 'hierarchy' | 'reference' }> = {}
  const layouts: { nodes: Record<string, { x: number; y: number }> } = { nodes: {} }

  const { applyCircularLayout } = useCircularLayout()
  
  const result = applyCircularLayout(nodes, edges, layouts, 0, 0, {
    innerRadius: 150,
    levelSpacing: 120,
    startAngle: -90,
    clockwise: true,
    minSectorAngle: 30,
    nodeSpacing: 60,
    spacingRatio: 1.0
  })

  console.log('Layout result:', result)
  console.log('\nFinal node positions:')
  Object.entries(layouts.nodes).forEach(([id, pos]) => {
    const angle = Math.atan2(pos.y, pos.x) * 180 / Math.PI
    console.log(`  ${id}: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}) - angle: ${angle.toFixed(1)}°`)
  })
}

// Run tests
console.log('='.repeat(60))
console.log('Testing Circular Layout with Equal Rectangle Spacing')
console.log('='.repeat(60))

testSevenNodesSpacing()
testFourNodesCardinal()

console.log('\n' + '='.repeat(60))
console.log('Tests completed.')
console.log('='.repeat(60))

