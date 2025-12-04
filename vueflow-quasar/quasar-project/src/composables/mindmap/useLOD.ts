import { ref, computed, type Ref } from 'vue'
import type { NodeData } from '../../components/mindmap/types'
import { calculateBoundingRect } from '../../components/mindmap/layout'

export function useLOD(
  nodes: Ref<NodeData[]>,
  viewport: Ref<{ zoom: number; x: number; y: number }>,
  getNodeDepth: (nodeId: string) => number
) {
  // LOD (Level of Detail) state
  const lodEnabled = ref(false)
  // Dynamic LOD thresholds: array of zoom percentages (10, 30, 50, 70, 90, etc.)
  // LOD configuration
  const lodStartPercent = ref(10)  // Start LOD at 10%
  const lodIncrementPercent = ref(20)  // Increment by 20%

  // Calculate maximum depth in the tree
  const maxTreeDepth = computed(() => {
    if (nodes.value.length === 0) return 0

    let maxDepth = 0
    nodes.value.forEach(node => {
      const depth = getNodeDepth(node.id)
      if (depth > maxDepth) {
        maxDepth = depth
      }
    })

    return maxDepth
  })

  // Computed LOD thresholds based on start and increment
  const lodThresholds = computed(() => {
    const thresholds: number[] = []
    const numLevels = Math.max(maxTreeDepth.value, 5)
    for (let i = 0; i < numLevels; i++) {
      thresholds.push(lodStartPercent.value + i * lodIncrementPercent.value)
    }
    return thresholds
  })

  // Current LOD level based on zoom (1-based: LOD 1, LOD 2, etc.)
  const currentLodLevel = computed(() => {
    if (!lodEnabled.value) return maxTreeDepth.value + 1 // Show all

    const zoomPercent = viewport.value.zoom * 100

    // Find which LOD level we're at
    for (let i = 0; i < lodThresholds.value.length; i++) {
      const threshold = lodThresholds.value[i]
      if (threshold !== undefined && zoomPercent < threshold) {
        return i + 1 // LOD levels are 1-based
      }
    }

    // If zoom is above all thresholds, show all levels
    return lodThresholds.value.length + 1
  })

  // Calculate bounding box of hidden children
  function calculateHiddenChildrenBounds(hiddenChildren: NodeData[]): { x: number, y: number, width: number, height: number } {
    if (hiddenChildren.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 }
    }

    // Calculate bounding box for all hidden children and their descendants
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const child of hiddenChildren) {
      // Get bounding rect including all descendants
      const bounds = calculateBoundingRect(child, nodes.value)

      minX = Math.min(minX, bounds.x)
      minY = Math.min(minY, bounds.y)
      maxX = Math.max(maxX, bounds.x + bounds.width)
      maxY = Math.max(maxY, bounds.y + bounds.height)
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    }
  }

  // LOD: Determine which nodes should be visible at current zoom level
  function getVisibleNodesForLOD(): NodeData[] {
    if (!lodEnabled.value) {
      // LOD disabled: return all nodes
      return nodes.value
    }

    const zoomPercent = viewport.value.zoom * 100

    // Determine max depth to show based on zoom level
    // Logic: Count how many thresholds we've PASSED (zoom >= threshold)
    // Example: [10, 30, 50, 70, 90]
    //   zoom < 10%        → passed 0 thresholds → show depth 0 (roots only)
    //   10% <= zoom < 30% → passed 1 threshold  → show depth 0-1
    //   30% <= zoom < 50% → passed 2 thresholds → show depth 0-2
    //   zoom >= 90%       → passed all          → show all depths

    let maxDepthToShow = 0 // Default: show only roots (depth 0)

    // Count how many thresholds we've passed
    for (let i = 0; i < lodThresholds.value.length; i++) {
      const threshold = lodThresholds.value[i]
      if (threshold !== undefined && zoomPercent >= threshold) {
        maxDepthToShow = i + 1 // We've passed this threshold, show one more level
      } else {
        break // Stop at first threshold we haven't reached
      }
    }

    // If zoom is above all thresholds, show all nodes
    const lastThreshold = lodThresholds.value[lodThresholds.value.length - 1]
    if (lastThreshold !== undefined && zoomPercent >= lastThreshold) {
      return nodes.value
    }

    // Filter nodes by depth
    return nodes.value.filter(node => {
      const depth = getNodeDepth(node.id)
      return depth <= maxDepthToShow
    })
  }

  return {
    lodEnabled,
    lodStartPercent,
    lodIncrementPercent,
    lodThresholds,
    maxTreeDepth,
    currentLodLevel,
    getVisibleNodesForLOD,
    calculateHiddenChildrenBounds
  }
}
