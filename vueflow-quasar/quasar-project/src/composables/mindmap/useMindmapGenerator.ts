import { ref, type Ref } from 'vue'
import type { Node, Edge } from '@vue-flow/core'
import type { NodeData } from '../../components/mindmap/types'
import { resolveOverlapsLOD } from '../../components/mindmap/layout'

/**
 * Mindmap Generator Composable
 *
 * Generates and layouts nodes for mindmaps. Used for:
 * - AI-generated mindmaps (bulk node creation)
 * - View conversion (concept map → mindmap)
 * - Bulk import and auto-layout
 * - Testing and prototyping
 */
export function useMindmapGenerator(
  nodes: Ref<NodeData[]>,
  edges: Ref<Edge[]>,
  nodeCounter: Ref<number>,
  viewport: Ref<{ zoom: number; x: number; y: number }>,
  verticalSpacing: Ref<number>,
  vueFlowNodes: Ref<Node[]>,
  // Dependencies from other composables
  createEdge: (sourceId: string, targetId: string) => void,
  syncToVueFlow: () => void,
  updateNodeDimensionsFromDOM: () => Promise<boolean>,
  resolveAllOverlaps: (nodes: NodeData[]) => void,
  zoomToFit: () => void
) {

  // ============================================================
  // STATE - Generator configuration
  // ============================================================

  // Generator configuration
  const algorithm = ref<'aabb' | 'rbush'>('aabb')
  const generatorNodeCount = ref(200)
  const lastPerformance = ref<{
    overlapDetection: number
    resolution: number
    total: number
    overlapsFound: number
  } | null>(null)



  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  // Helper function for async delay
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}



  function createNode(label: string, parentId: string | null, x: number, y: number): NodeData {
  const id = `node-${nodeCounter.value++}`

  // All nodes now have same height (one line of text)
  const height = 50

  const node: NodeData = {
    id,
    label,
    parentId,
    x,
    y,
    width: 150,
    height: height,
    collapsed: false,
    // Store mindmap position so it's preserved when switching views
    mindmapPosition: { x, y }
  }
  nodes.value.push(node)
  return node
}



  // ============================================================
  // GENERATOR FUNCTIONS
  // ============================================================

  function generateNodeTree() {
    console.log('Generating test data...')
    nodes.value = []
    edges.value = []
    vueFlowNodes.value = []
    nodeCounter.value = 1

    // Create 2 root nodes (left and right of center)
    const root1 = createNode('Root Left', null, -400, 0)
    const root2 = createNode('Root Right', null, 400, 0)

    // Add children to root1 (left side - children go further left)
    const r1c1 = createNode('R1-C1', root1.id, root1.x - 200, root1.y + 100)
    const r1c2 = createNode('R1-C2', root1.id, root1.x - 200, root1.y - 100)
    createEdge(root1.id, r1c1.id)
    createEdge(root1.id, r1c2.id)

    // Add grandchildren to r1c1 (continue left)
    const r1c1c1 = createNode('R1-C1-C1', r1c1.id, r1c1.x - 200, r1c1.y + 80)
    const r1c1c2 = createNode('R1-C1-C2', r1c1.id, r1c1.x - 200, r1c1.y - 80)
    createEdge(r1c1.id, r1c1c1.id)
    createEdge(r1c1.id, r1c1c2.id)

    // Add children to root2 (right side - children go further right)
    const r2c1 = createNode('R2-C1', root2.id, root2.x + 200, root2.y + 100)
    const r2c2 = createNode('R2-C2', root2.id, root2.x + 200, root2.y)
    const r2c3 = createNode('R2-C3', root2.id, root2.x + 200, root2.y - 100)
    createEdge(root2.id, r2c1.id)
    createEdge(root2.id, r2c2.id)
    createEdge(root2.id, r2c3.id)

    // Add more nodes to r2c2 branch (right side)
    let currentParent = r2c2
    for (let i = 0; i < 20; i++) {
      const offsetY = (i % 3 - 1) * 80
      const newNode = createNode(`Node-${i}`, currentParent.id, currentParent.x + 200, currentParent.y + offsetY)
      createEdge(currentParent.id, newNode.id)
      if (i % 4 === 0) {
        currentParent = newNode
      }
    }

    // Add more nodes to r1c2 branch (left side)
    currentParent = r1c2
    for (let i = 20; i < 35; i++) {
      const offsetY = (i % 3 - 1) * 80
      const newNode = createNode(`Node-${i}`, currentParent.id, currentParent.x - 200, currentParent.y + offsetY)
      createEdge(currentParent.id, newNode.id)
      if (i % 4 === 0) {
        currentParent = newNode
      }
    }

    console.log(`Created ${nodes.value.length} nodes and ${edges.value.length} edges`)

    // Sync to VueFlow
    syncToVueFlow()

    console.log(`VueFlow nodes: ${vueFlowNodes.value.length}`)

    // Resolve overlaps
    setTimeout(() => {
      console.log('Resolving overlaps...')
      console.log('Before overlap resolution, sample positions:', nodes.value.slice(0, 5).map(n => ({ id: n.id, x: n.x, y: n.y })))
      resolveAllOverlaps(nodes.value)
      console.log('After overlap resolution, sample positions:', nodes.value.slice(0, 5).map(n => ({ id: n.id, x: n.x, y: n.y })))
      syncToVueFlow()
      console.log(`After overlap resolution: ${nodes.value.length} nodes, ${vueFlowNodes.value.length} VueFlow nodes`)

      // Check if any nodes have extreme positions
      const extremeNodes = nodes.value.filter(n => Math.abs(n.x) > 10000 || Math.abs(n.y) > 10000)
      if (extremeNodes.length > 0) {
        console.warn('Found nodes with extreme positions:', extremeNodes.length, extremeNodes.slice(0, 3))
      }
    }, 100)
  }



  function clearAllNodes() {
  nodes.value = []
  edges.value = []
  vueFlowNodes.value = []
  nodeCounter.value = 1
  lastPerformance.value = null
}



 async function generateAndLayoutMindmap() {
   console.log(`Running mindmap generator with ${generatorNodeCount.value} nodes using ${algorithm.value.toUpperCase()}...`)

   // Clear existing data
   clearAllNodes()

   const startTotal = performance.now()

   // Create ONE root node at center
   const root = createNode('Root', null, 0, 0)

   // Sync to VueFlow to show root
   syncToVueFlow()
   await delay(50)

   const targetNodeCount = generatorNodeCount.value
   let currentNodeCount = 1 // We have the root

   // Calculate number of root children based on total node count
   // Goal: Keep tree wider and shorter for larger node counts
   // Formula: rootChildrenPerSide = sqrt(targetNodeCount / 30)
   // Examples: 200 nodes → 3 children, 500 nodes → 4 children, 1000 nodes → 6 children
   const rootChildrenPerSide = Math.max(2, Math.round(Math.sqrt(targetNodeCount / 30)))
   console.log(`📊 Creating ${rootChildrenPerSide} root children per side for ${targetNodeCount} nodes`)

   // Track left and right side nodes separately for balance
   const leftSideQueue: NodeData[] = []
   const rightSideQueue: NodeData[] = []

   let level = 0

   while (currentNodeCount < targetNodeCount) {
     console.log(`\n=== Creating Level ${level + 1} ===`)
     console.log(`  Current node count: ${currentNodeCount}/${targetNodeCount}`)
     console.log(`  Left queue size: ${leftSideQueue.length}, Right queue size: ${rightSideQueue.length}`)

     const newNodesThisLevel: NodeData[] = []

     // For root level, create N children on left and N on right (proportional to total node count)
     if (level === 0) {
       const nodeHeight = 50
       const spacing = verticalSpacing.value
       const verticalStep = nodeHeight + spacing // Nodes should be spaced by height + configured spacing

       // Create left children
       for (let i = 0; i < rootChildrenPerSide && currentNodeCount < targetNodeCount; i++) {
         // Center the children vertically around root
         const childY = root.y + (i - (rootChildrenPerSide - 1) / 2) * verticalStep
         const leftChild = createNode(`L1-N${currentNodeCount}`, root.id, root.x - 200, childY)
         createEdge(root.id, leftChild.id)
         leftSideQueue.push(leftChild)
         newNodesThisLevel.push(leftChild)
         currentNodeCount++
         console.log(`  Created node ${leftChild.id} (LEFT of root) at (${leftChild.x}, ${leftChild.y})`)
       }

       // Create right children
       for (let i = 0; i < rootChildrenPerSide && currentNodeCount < targetNodeCount; i++) {
         // Center the children vertically around root
         const childY = root.y + (i - (rootChildrenPerSide - 1) / 2) * verticalStep
         const rightChild = createNode(`L1-N${currentNodeCount}`, root.id, root.x + 200, childY)
         createEdge(root.id, rightChild.id)
         rightSideQueue.push(rightChild)
         newNodesThisLevel.push(rightChild)
         currentNodeCount++
         console.log(`  Created node ${rightChild.id} (RIGHT of root) at (${rightChild.x}, ${rightChild.y})`)
       }
     } else {
       // For subsequent levels, ALTERNATE between left and right parents to maintain balance
       // This ensures if we hit the node limit, both sides are equally filled
       const leftQueueSize = leftSideQueue.length
       const rightQueueSize = rightSideQueue.length

       if (leftQueueSize === 0 && rightQueueSize === 0) {
         break // No more nodes to expand
       }

       // Process parents alternating between left and right
       const maxParents = Math.max(leftQueueSize, rightQueueSize)
       for (let i = 0; i < maxParents && currentNodeCount < targetNodeCount; i++) {
         // Process one left parent if available
         if (i < leftQueueSize && currentNodeCount < targetNodeCount) {
           const parent = leftSideQueue.shift()!

           // Get parent's CURRENT position from nodes array (after layout resolution)
           const parentNode = nodes.value.find(n => n.id === parent.id)!

           const nodeHeight = 50
           const spacing = verticalSpacing.value
           const verticalStep = nodeHeight + spacing // Nodes should be spaced by height + configured spacing

           // Create 2 children for this parent
           for (let j = 0; j < 2 && currentNodeCount < targetNodeCount; j++) {
             // Position children to the LEFT of parent's CURRENT position
             const childX = parentNode.x - 200
             const childY = parentNode.y + (j - 0.5) * verticalStep

             const child = createNode(`L${level + 1}-N${currentNodeCount}`, parent.id, childX, childY)
             createEdge(parent.id, child.id)

             leftSideQueue.push(child)
             newNodesThisLevel.push(child)
             currentNodeCount++
             console.log(`  Created node ${child.id} (LEFT side) at (${childX.toFixed(0)}, ${childY.toFixed(0)}) - parent ${parent.id} at (${parentNode.x.toFixed(0)}, ${parentNode.y.toFixed(0)})`)
           }
         }

         // Process one right parent if available
         if (i < rightQueueSize && currentNodeCount < targetNodeCount) {
           const parent = rightSideQueue.shift()!

           // Get parent's CURRENT position from nodes array (after layout resolution)
           const parentNode = nodes.value.find(n => n.id === parent.id)!

           const nodeHeight = 50
           const spacing = verticalSpacing.value
           const verticalStep = nodeHeight + spacing // Nodes should be spaced by height + configured spacing

           // Create 2 children for this parent
           for (let j = 0; j < 2 && currentNodeCount < targetNodeCount; j++) {
             // Position children to the RIGHT of parent's CURRENT position
             const childX = parentNode.x + 200
             const childY = parentNode.y + (j - 0.5) * verticalStep

             const child = createNode(`L${level + 1}-N${currentNodeCount}`, parent.id, childX, childY)
             createEdge(parent.id, child.id)

             rightSideQueue.push(child)
             newNodesThisLevel.push(child)
             currentNodeCount++
             console.log(`  Created node ${child.id} (RIGHT side) at (${childX.toFixed(0)}, ${childY.toFixed(0)}) - parent ${parent.id} at (${parentNode.x.toFixed(0)}, ${parentNode.y.toFixed(0)})`)
           }
         }
       }
     }

     // Sync to VueFlow to show new nodes
     syncToVueFlow()

     // Wait for browser to render
     await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))

     // Measure actual DOM dimensions of new nodes
     const dimensionsUpdated = await updateNodeDimensionsFromDOM()
     if (dimensionsUpdated) {
       console.log(`  ✓ Updated node dimensions from DOM`)
     }

     // Apply layout for this level
     console.log(`  Applying layout for level ${level + 1}...`)
     console.log(`  Nodes created this level: ${newNodesThisLevel.length}`)

     // IMPORTANT: Calculate layout for ALL nodes (not just LOD-visible)
     // This ensures that when we zoom in, nodes already have correct positions
     // and LOD badges have the correct size from the start
     console.log(`  Calculating layout for ALL ${nodes.value.length} nodes (including LOD-hidden)`)

     // Use AABB algorithm (RBush is for future use)
     // Use ALL nodes for both visible and all parameters
     // This calculates positions for every node, even if LOD-hidden
     resolveOverlapsLOD(nodes.value, nodes.value)

     console.log(`  Layout resolved for all nodes`)

     // Log positions AFTER layout resolution for debugging
     console.log(`  Positions after layout:`)
     for (const node of newNodesThisLevel) {
       const updatedNode = nodes.value.find(n => n.id === node.id)!
       const parent = nodes.value.find(n => n.id === updatedNode.parentId)!
       const side = updatedNode.x < parent.x ? 'LEFT' : 'RIGHT'
       console.log(`    ${node.id}: (${updatedNode.x.toFixed(0)}, ${updatedNode.y.toFixed(0)}) - ${side} of parent ${parent.id} at (${parent.x.toFixed(0)}, ${parent.y.toFixed(0)})`)
     }

     // Sync to VueFlow to show layout changes
     syncToVueFlow()

     // Wait for browser to render layout changes
     await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))

     level++
     console.log(`  ✓ Level ${level} complete. Total nodes: ${currentNodeCount}`)
     console.log(`  ---`)
   }

   const endTotal = performance.now()
   console.log(`\n=== Mindmap Generation Complete ===`)
   console.log(`Created ${currentNodeCount} nodes in ${level} levels`)
   console.log(`Total time: ${(endTotal - startTotal).toFixed(2)}ms`)

   // Zoom to fit after completion
   setTimeout(() => {
     zoomToFit()
   }, 100)
 }



  // ============================================================
  // RETURN
  // ============================================================

  return {
    // State
    algorithm,
    generatorNodeCount,
    lastPerformance,

    // Functions
    generateNodeTree,
    clearAllNodes,
    generateAndLayoutMindmap,
    createNode,
    delay
  }
}

