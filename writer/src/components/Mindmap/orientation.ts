import type { Data } from './interface'

export type Orientation = 'clockwise' | 'anticlockwise' | 'right-left' | 'left-right'

/**
 * Balance strategy for distributing nodes between left and right sides
 */
export type BalanceStrategy = 'count' | 'weight' | 'height' | 'manual'

/**
 * Calculate the "weight" of a subtree for balancing purposes
 * Weight can be based on different metrics:
 * - count: Total number of descendant nodes
 * - height: Maximum depth of the subtree
 * - area: Estimated visual area (width * height)
 */
function calculateSubtreeWeight(node: Data, strategy: 'count' | 'height' | 'area' = 'count'): number {
  if (!node.children || node.children.length === 0) {
    return 1 // Leaf node has weight 1
  }

  switch (strategy) {
    case 'count': {
      // Count total descendants
      let count = 1 // Count self
      node.children.forEach(child => {
        count += calculateSubtreeWeight(child, 'count')
      })
      return count
    }

    case 'height': {
      // Maximum depth
      let maxDepth = 0
      node.children.forEach(child => {
        maxDepth = Math.max(maxDepth, calculateSubtreeWeight(child, 'height'))
      })
      return maxDepth + 1
    }

    case 'area': {
      // Estimated area (width * height)
      // Width = number of children, Height = max depth
      const width = node.children.length
      let maxDepth = 0
      node.children.forEach(child => {
        maxDepth = Math.max(maxDepth, calculateSubtreeWeight(child, 'height'))
      })
      return width * (maxDepth + 1)
    }
  }
}

/**
 * Find the optimal split point to balance left and right sides
 * Returns the index where the split should occur (nodes 0 to splitIndex-1 go to first side)
 *
 * @param children - Array of child nodes
 * @param strategy - Balancing strategy
 * @returns Split index (first side gets [0, splitIndex), second side gets [splitIndex, end])
 */
export function findBalancedSplit(children: Data[], strategy: BalanceStrategy = 'count'): number {
  if (children.length === 0) return 0
  if (children.length === 1) return 1
  if (strategy === 'manual') {
    // Manual mode: use existing 'left' property if set
    const leftCount = children.filter(c => c.left === true).length
    return children.length - leftCount // Right side comes first in array
  }

  // Calculate weights for each child
  const weights = children.map(child =>
    calculateSubtreeWeight(child, strategy === 'count' ? 'count' : strategy === 'height' ? 'height' : 'area')
  )

  const totalWeight = weights.reduce((sum, w) => sum + w, 0)

  // Find split point that minimizes imbalance
  let bestSplit = Math.ceil(children.length / 2)
  let bestImbalance = Infinity

  let leftWeight = 0
  for (let i = 1; i < children.length; i++) {
    leftWeight += weights[i - 1] ?? 0
    const rightWeight = totalWeight - leftWeight
    const imbalance = Math.abs(leftWeight - rightWeight)

    if (imbalance < bestImbalance) {
      bestImbalance = imbalance
      bestSplit = i
    }
  }

  return bestSplit
}

/**
 * Orientation metadata for a node
 * This is computed from the data structure and orientation mode
 * and should NOT be stored in the data itself
 */
export interface OrientationMetadata {
  left: boolean;           // Is this node on the left side?
  visualIndex: number;     // Visual position (0 = top in visual order)
  dataIndex: number;       // Position in data array
}

/**
 * Get the visual order of children for a given orientation
 * This creates a VIEW of the data without mutating it
 *
 * @param children - The children array in canonical data order
 * @param orientation - The orientation mode
 * @param parentLeft - The parent's left property (for recursive calls)
 * @returns Array of children in visual display order with orientation metadata
 */
export function getVisualOrder(
  children: Data[],
  orientation: Orientation,
  parentLeft?: boolean
): Array<Data & { _orientationMeta: OrientationMetadata }> {
  if (!children || children.length === 0) {
    return []
  }

  const mid = Math.ceil(children.length / 2)
  const result: Array<Data & { _orientationMeta: OrientationMetadata }> = []

  // For root level (parentLeft is undefined), apply the orientation split
  if (parentLeft === undefined) {
    switch (orientation) {
      case 'right-left':
        // First half: right side (indices 0 to mid-1)
        // Second half: left side (indices mid to end)
        for (let i = 0; i < children.length; i++) {
          const child = children[i]
          if (child) {
            result.push({
              ...child,
              _orientationMeta: {
                left: i >= mid,
                visualIndex: i,
                dataIndex: i
              }
            })
          }
        }
        break

      case 'left-right':
        // First half: left side (indices 0 to mid-1)
        // Second half: right side (indices mid to end)
        for (let i = 0; i < children.length; i++) {
          const child = children[i]
          if (child) {
            result.push({
              ...child,
              _orientationMeta: {
                left: i < mid,
                visualIndex: i,
                dataIndex: i
              }
            })
          }
        }
        break

      case 'clockwise':
        // First half: right side top-to-bottom (indices 0 to mid-1)
        // Second half: left side bottom-to-top (indices mid to end, REVERSED in view)
        for (let i = 0; i < mid; i++) {
          const child = children[i]
          if (child) {
            result.push({
              ...child,
              _orientationMeta: {
                left: false,
                visualIndex: i,
                dataIndex: i
              }
            })
          }
        }
        // Add left side in reverse visual order
        for (let i = children.length - 1; i >= mid; i--) {
          const child = children[i]
          if (child) {
            result.push({
              ...child,
              _orientationMeta: {
                left: true,
                visualIndex: result.length,
                dataIndex: i
              }
            })
          }
        }
        break

      case 'anticlockwise':
        // First half: left side top-to-bottom (indices 0 to mid-1)
        // Second half: right side bottom-to-top (indices mid to end, REVERSED in view)
        for (let i = 0; i < mid; i++) {
          const child = children[i]
          if (child) {
            result.push({
              ...child,
              _orientationMeta: {
                left: true,
                visualIndex: i,
                dataIndex: i
              }
            })
          }
        }
        // Add right side in reverse visual order
        for (let i = children.length - 1; i >= mid; i--) {
          const child = children[i]
          if (child) {
            result.push({
              ...child,
              _orientationMeta: {
                left: false,
                visualIndex: result.length,
                dataIndex: i
              }
            })
          }
        }
        break
    }
  } else {
    // For non-root levels, children inherit parent's left property
    // and may be reversed based on orientation
    const shouldReverse =
      (orientation === 'clockwise' && parentLeft === true) ||
      (orientation === 'anticlockwise' && parentLeft === false)

    if (shouldReverse) {
      // Reverse visual order but keep data indices
      for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i]
        if (child) {
          result.push({
            ...child,
            _orientationMeta: {
              left: parentLeft,
              visualIndex: result.length,
              dataIndex: i
            }
          })
        }
      }
    } else {
      // Normal order
      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        if (child) {
          result.push({
            ...child,
            _orientationMeta: {
              left: parentLeft,
              visualIndex: i,
              dataIndex: i
            }
          })
        }
      }
    }
  }

  return result
}

/**
 * LEGACY FUNCTION - DEPRECATED
 * This function mutates data and should not be used
 * Kept temporarily for backward compatibility during migration
 *
 * Apply orientation to mindmap data by setting the 'left' property on depth-1 nodes
 * WARNING: This modifies the data structure which breaks the separation of data and view
 *
 * @param data - The root data node
 * @param orientation - The orientation mode
 * @param balanceStrategy - Strategy for balancing left/right sides ('count', 'weight', 'height', 'manual')
 */
export function applyOrientation(
  data: Data,
  orientation: Orientation,
  balanceStrategy: BalanceStrategy = 'manual'
): void {
  if (!data.children || data.children.length === 0) {
    return
  }

  const children = data.children

  // Find balanced split point
  const mid = findBalancedSplit(children, balanceStrategy)

  // Only set the 'left' property, DO NOT reverse arrays
  switch (orientation) {
    case 'right-left':
      for (let i = 0; i < mid; i++) {
        const child = children[i]
        if (child) child.left = false
      }
      for (let i = mid; i < children.length; i++) {
        const child = children[i]
        if (child) child.left = true
      }
      break

    case 'left-right':
      for (let i = 0; i < mid; i++) {
        const child = children[i]
        if (child) child.left = true
      }
      for (let i = mid; i < children.length; i++) {
        const child = children[i]
        if (child) child.left = false
      }
      break

    case 'clockwise':
      for (let i = 0; i < mid; i++) {
        const child = children[i]
        if (child) child.left = false
      }
      for (let i = mid; i < children.length; i++) {
        const child = children[i]
        if (child) child.left = true
      }
      break

    case 'anticlockwise':
      for (let i = 0; i < mid; i++) {
        const child = children[i]
        if (child) child.left = true
      }
      for (let i = mid; i < children.length; i++) {
        const child = children[i]
        if (child) child.left = false
      }
      break
  }

  // Recursively apply to all children (they inherit parent's left property)
  children.forEach(child => {
    if (child.children && child.children.length > 0) {
      const parentLeft = child.left ?? false
      child.children.forEach(grandchild => {
        grandchild.left = parentLeft
      })
      if (child.children) {
        applyOrientation(child, orientation)
      }
    }
  })
}

/**
 * Convert visual position to data index
 * Given a visual position in a specific orientation, return the corresponding data array index
 *
 * @param visualIndex - The visual position (0 = first visible node)
 * @param totalChildren - Total number of children
 * @param orientation - The orientation mode
 * @param parentLeft - The parent's left property (for recursive calls)
 * @returns The data array index
 */
export function visualToDataIndex(
  visualIndex: number,
  totalChildren: number,
  orientation: Orientation,
  parentLeft?: boolean
): number {
  const mid = Math.ceil(totalChildren / 2)

  if (parentLeft === undefined) {
    // Root level
    switch (orientation) {
      case 'right-left':
      case 'left-right':
        // No reversal, visual index = data index
        return visualIndex

      case 'clockwise':
        // First half (0 to mid-1): right side, normal order
        // Second half (mid to end): left side, reversed
        if (visualIndex < mid) {
          return visualIndex
        } else {
          // Reverse mapping for left side
          return totalChildren - 1 - (visualIndex - mid)
        }

      case 'anticlockwise':
        // First half (0 to mid-1): left side, normal order
        // Second half (mid to end): right side, reversed
        if (visualIndex < mid) {
          return visualIndex
        } else {
          // Reverse mapping for right side
          return totalChildren - 1 - (visualIndex - mid)
        }

      default:
        return visualIndex
    }
  } else {
    // Non-root level
    const shouldReverse =
      (orientation === 'clockwise' && parentLeft === true) ||
      (orientation === 'anticlockwise' && parentLeft === false)

    return shouldReverse ? totalChildren - 1 - visualIndex : visualIndex
  }
}

/**
 * Convert data index to visual position
 * Given a data array index, return the visual position in a specific orientation
 *
 * @param dataIndex - The data array index
 * @param totalChildren - Total number of children
 * @param orientation - The orientation mode
 * @param parentLeft - The parent's left property (for recursive calls)
 * @returns The visual position
 */
export function dataToVisualIndex(
  dataIndex: number,
  totalChildren: number,
  orientation: Orientation,
  parentLeft?: boolean
): number {
  const mid = Math.ceil(totalChildren / 2)

  if (parentLeft === undefined) {
    // Root level
    switch (orientation) {
      case 'right-left':
      case 'left-right':
        // No reversal, data index = visual index
        return dataIndex

      case 'clockwise':
        // First half (0 to mid-1): right side, normal order
        // Second half (mid to end): left side, reversed
        if (dataIndex < mid) {
          return dataIndex
        } else {
          // Reverse mapping for left side
          return mid + (totalChildren - 1 - dataIndex)
        }

      case 'anticlockwise':
        // First half (0 to mid-1): left side, normal order
        // Second half (mid to end): right side, reversed
        if (dataIndex < mid) {
          return dataIndex
        } else {
          // Reverse mapping for right side
          return mid + (totalChildren - 1 - dataIndex)
        }

      default:
        return dataIndex
    }
  } else {
    // Non-root level
    const shouldReverse =
      (orientation === 'clockwise' && parentLeft === true) ||
      (orientation === 'anticlockwise' && parentLeft === false)

    return shouldReverse ? totalChildren - 1 - dataIndex : dataIndex
  }
}

