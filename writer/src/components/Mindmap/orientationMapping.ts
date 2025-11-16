import type { Orientation } from './orientation'

/**
 * Orientation Mapping System
 *
 * This module provides bidirectional mapping between:
 * - Data order (internal array order in store - single source of truth)
 * - Visual position (how nodes appear in the mindmap based on orientation)
 *
 * Example with 6 nodes [1,2,3,4,5,6]:
 *
 * Clockwise:
 * | 6 |      | 1 |
 * | 5 | root | 2 |
 * | 4 |      | 3 |
 *
 * AntiClockwise:
 * | 1 |      | 6 |
 * | 2 | root | 5 |
 * | 3 |      | 4 |
 *
 * LeftRight:
 * | 1 |      | 4 |
 * | 2 | root | 5 |
 * | 3 |      | 6 |
 *
 * RightLeft:
 * | 4 |      | 1 |
 * | 5 | root | 2 |
 * | 6 |      | 3 |
 */

export interface VisualPosition {
  side: 'left' | 'right'  // Which side of the root
  index: number            // Position on that side (0-based, top to bottom)
}

/**
 * Convert data index to visual position based on orientation
 * @param dataIndex - Position in the internal array (0-based)
 * @param orientation - Current orientation
 * @param totalCount - Total number of nodes
 * @returns Visual position (side and index on that side)
 */
export function dataIndexToVisualPosition(
  dataIndex: number,
  orientation: Orientation,
  totalCount: number
): VisualPosition {
  const mid = Math.ceil(totalCount / 2)

  switch (orientation) {
    case 'left-right':
      // First half: left side (top to bottom)
      // Second half: right side (top to bottom)
      if (dataIndex < mid) {
        return { side: 'left', index: dataIndex }
      } else {
        return { side: 'right', index: dataIndex - mid }
      }

    case 'right-left':
      // First half: right side (top to bottom)
      // Second half: left side (top to bottom)
      if (dataIndex < mid) {
        return { side: 'right', index: dataIndex }
      } else {
        return { side: 'left', index: dataIndex - mid }
      }

    case 'clockwise':
      // First half: right side (top to bottom)
      // Second half: left side (BOTTOM to top - reversed)
      if (dataIndex < mid) {
        return { side: 'right', index: dataIndex }
      } else {
        // Left side is reversed: last item in data appears at top
        const leftSideCount = totalCount - mid
        return { side: 'left', index: leftSideCount - 1 - (dataIndex - mid) }
      }

    case 'anticlockwise':
      // First half: left side (top to bottom)
      // Second half: right side (BOTTOM to top - reversed)
      if (dataIndex < mid) {
        return { side: 'left', index: dataIndex }
      } else {
        // Right side is reversed: last item in data appears at top
        const rightSideCount = totalCount - mid
        return { side: 'right', index: rightSideCount - 1 - (dataIndex - mid) }
      }

    default:
      return { side: 'right', index: dataIndex }
  }
}

/**
 * Convert visual position to data index based on orientation
 * @param visualPos - Visual position (side and index on that side)
 * @param orientation - Current orientation
 * @param totalCount - Total number of nodes
 * @returns Position in the internal array (0-based)
 */
export function visualPositionToDataIndex(
  visualPos: VisualPosition,
  orientation: Orientation,
  totalCount: number
): number {
  const mid = Math.ceil(totalCount / 2)
  const leftSideCount = mid
  const rightSideCount = totalCount - mid

  switch (orientation) {
    case 'left-right':
      // First half: left side, second half: right side
      if (visualPos.side === 'left') {
        return visualPos.index
      } else {
        return mid + visualPos.index
      }

    case 'right-left':
      // First half: right side, second half: left side
      if (visualPos.side === 'right') {
        return visualPos.index
      } else {
        return mid + visualPos.index
      }

    case 'clockwise':
      // First half: right side, second half: left side (reversed)
      if (visualPos.side === 'right') {
        return visualPos.index
      } else {
        // Left side is reversed
        return mid + (leftSideCount - 1 - visualPos.index)
      }

    case 'anticlockwise':
      // First half: left side, second half: right side (reversed)
      if (visualPos.side === 'left') {
        return visualPos.index
      } else {
        // Right side is reversed
        return mid + (rightSideCount - 1 - visualPos.index)
      }

    default:
      return visualPos.side === 'left' ? visualPos.index : mid + visualPos.index
  }
}

/**
 * Get the 'left' property for a node based on its visual position
 * @param visualPos - Visual position
 * @returns true if node should be on left side, false if on right side
 */
export function getLeftProperty(visualPos: VisualPosition): boolean {
  return visualPos.side === 'left'
}

/**
 * Calculate visual position from Y coordinate and side
 * This is used when dropping a node to determine its new position
 * @param dropY - Y coordinate where node was dropped
 * @param side - Which side the node was dropped on
 * @param siblingsOnSameSide - Array of siblings on the same side with their Y coordinates
 * @returns Visual index on that side (0-based, top to bottom)
 */
export function calculateVisualIndexFromY(
  dropY: number,
  side: 'left' | 'right',
  siblingsOnSameSide: Array<{ y: number }>
): number {
  // Find how many siblings are above the drop position
  let index = 0
  for (const sibling of siblingsOnSameSide) {
    if (sibling.y < dropY) {
      index++
    }
  }
  return index
}

