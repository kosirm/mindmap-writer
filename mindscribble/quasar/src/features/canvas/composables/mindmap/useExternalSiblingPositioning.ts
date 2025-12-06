/**
 * External Sibling Positioning Composable
 *
 * Handles positioning of nodes in the mindmap when changes come from external views (e.g., Writer).
 * This includes:
 * - Swapping positions when siblings are reordered
 * - Inserting new nodes between siblings
 * - Inserting new nodes as first/last sibling
 * - Adding first child to a node
 */

import type { Ref } from 'vue'
import type { NodeData } from '../../components/mindmap/types'
import {
  calculateClockwiseAngle,
  getOrientationSortKey,
  type OrientationMode
} from './useOrientationSort'

const DEFAULT_CHILD_DISTANCE = 200
const DEFAULT_SIBLING_ANGLE_GAP = 30
const MIN_ANGLE = 1
const MAX_ANGLE = 359

interface NodeAngleInfo {
  node: NodeData
  angle: number
  distance: number
}

/**
 * Calculate the clockwise angle and distance of a node from its parent center
 */
function getNodeAngleAndDistance(
  node: NodeData,
  refX: number,
  refY: number
): { angle: number; distance: number } {
  const nodeCenterX = node.x + node.width / 2
  const nodeCenterY = node.y + node.height / 2

  const dx = nodeCenterX - refX
  const dy = nodeCenterY - refY
  const distance = Math.sqrt(dx * dx + dy * dy)

  const angle = calculateClockwiseAngle(
    node.x, node.y, node.width, node.height,
    refX, refY
  )

  return { angle, distance }
}

/**
 * Calculate position from angle and distance relative to a reference point
 */
function positionFromAngle(
  refX: number,
  refY: number,
  angle: number,
  distance: number,
  nodeWidth: number,
  nodeHeight: number
): { x: number; y: number } {
  // Convert from our 0=12 o'clock system back to standard atan2 system
  // Our 0° is at top (12 o'clock), atan2's 0° is at right (3 o'clock)
  // Our angle goes clockwise, atan2 goes counter-clockwise
  const radians = ((angle - 90) * Math.PI) / 180

  const nodeCenterX = refX + distance * Math.cos(radians)
  const nodeCenterY = refY + distance * Math.sin(radians)

  return {
    x: nodeCenterX - nodeWidth / 2,
    y: nodeCenterY - nodeHeight / 2
  }
}

export function useExternalSiblingPositioning(
  nodes: Ref<NodeData[]>,
  canvasCenter: Ref<{ x: number; y: number }>
) {
  /**
   * Get reference point for angle calculations
   */
  function getRefPoint(parentId: string | null): { refX: number; refY: number } {
    if (parentId) {
      const parent = nodes.value.find(n => n.id === parentId)
      if (parent) {
        return {
          refX: parent.x + parent.width / 2,
          refY: parent.y + parent.height / 2
        }
      }
    }
    return { refX: canvasCenter.value.x, refY: canvasCenter.value.y }
  }

  /**
   * Swap positions when siblings are reordered from external view.
   * Example: If order changes from [1,2,3,4] to [1,4,2,3], then:
   * - Node 1 stays at position of old node 1
   * - Node 4 moves to position of old node 2
   * - Node 2 moves to position of old node 3
   * - Node 3 moves to position of old node 4
   *
   * @param parentId - Parent node ID (null for root siblings)
   * @param newOrders - Map of nodeId -> new order index
   * @param orientation - Current orientation mode
   * @returns Array of position updates
   */
  function swapPositionsOnReorder(
    parentId: string | null,
    newOrders: Map<string, number>,
    orientation: OrientationMode
  ): Array<{ nodeId: string; newX: number; newY: number }> {
    const { refX, refY } = getRefPoint(parentId)

    // Get all siblings
    const siblings = nodes.value.filter(n => n.parentId === parentId)
    if (siblings.length <= 1) return []

    // Sort siblings by their CURRENT visual position (angle-based)
    const sortedByCurrentPosition = [...siblings].sort((a, b) => {
      const keyA = getOrientationSortKey(a, refX, refY, orientation)
      const keyB = getOrientationSortKey(b, refX, refY, orientation)
      return keyA - keyB
    })

    // Sort siblings by NEW order from store
    const sortedByNewOrder = [...siblings].sort((a, b) => {
      const orderA = newOrders.get(a.id) ?? 999
      const orderB = newOrders.get(b.id) ?? 999
      return orderA - orderB
    })

    // Create position mapping: node at new order index i gets position of node at current position index i
    const positionUpdates: Array<{ nodeId: string; newX: number; newY: number }> = []

    for (let i = 0; i < sortedByNewOrder.length; i++) {
      const nodeToMove = sortedByNewOrder[i]!
      const positionSource = sortedByCurrentPosition[i]!

      // Only update if actually moving to a different position
      if (nodeToMove.id !== positionSource.id) {
        positionUpdates.push({
          nodeId: nodeToMove.id,
          newX: positionSource.x,
          newY: positionSource.y
        })
      }
    }

    return positionUpdates
  }

  /**
   * Calculate position for a new node inserted between existing siblings
   *
   * @param parentId - Parent node ID
   * @param prevSibling - Previous sibling node (null if inserting as first)
   * @param nextSibling - Next sibling node (null if inserting as last)
   * @param nodeWidth - Width of the new node
   * @param nodeHeight - Height of the new node
   * @param orientation - Current orientation mode
   * @returns Position for the new node
   */
  function calculateInsertPosition(
    parentId: string | null,
    prevSibling: NodeData | null,
    nextSibling: NodeData | null,
    nodeWidth: number,
    nodeHeight: number,
    orientation: OrientationMode
  ): { x: number; y: number } {
    const { refX, refY } = getRefPoint(parentId)
    const siblings = nodes.value.filter(n => n.parentId === parentId)

    // Case 1: First child (no siblings exist)
    if (siblings.length === 0) {
      // Place at 90 degrees (right side), 200px from parent
      return positionFromAngle(refX, refY, 90, DEFAULT_CHILD_DISTANCE, nodeWidth, nodeHeight)
    }

    // Sort siblings by orientation
    const sortedSiblings = [...siblings].sort((a, b) => {
      const keyA = getOrientationSortKey(a, refX, refY, orientation)
      const keyB = getOrientationSortKey(b, refX, refY, orientation)
      return keyA - keyB
    })

    // Get angle info for all siblings
    const siblingAngles: NodeAngleInfo[] = sortedSiblings.map(s => ({
      node: s,
      ...getNodeAngleAndDistance(s, refX, refY)
    }))

    // Case 2: Insert between two siblings
    if (prevSibling && nextSibling) {
      const prevInfo = siblingAngles.find(s => s.node.id === prevSibling.id)!
      const nextInfo = siblingAngles.find(s => s.node.id === nextSibling.id)!

      const avgAngle = (prevInfo.angle + nextInfo.angle) / 2
      const avgDistance = (prevInfo.distance + nextInfo.distance) / 2

      return positionFromAngle(refX, refY, avgAngle, avgDistance, nodeWidth, nodeHeight)
    }

    // Case 3: Insert as last sibling
    if (prevSibling && !nextSibling) {
      const prevIdx = sortedSiblings.findIndex(s => s.id === prevSibling.id)
      const prevInfo = siblingAngles[prevIdx]!

      let targetAngle: number
      const targetDistance = prevInfo.distance

      if (prevIdx > 0) {
        // Has two or more siblings before - use gap from prev two
        const prevPrevInfo = siblingAngles[prevIdx - 1]!
        const gap = prevInfo.angle - prevPrevInfo.angle
        targetAngle = Math.min(prevInfo.angle + gap, MAX_ANGLE)
      } else {
        // Only one sibling before - use default 30 degree gap
        targetAngle = Math.min(prevInfo.angle + DEFAULT_SIBLING_ANGLE_GAP, MAX_ANGLE)
      }

      return positionFromAngle(refX, refY, targetAngle, targetDistance, nodeWidth, nodeHeight)
    }

    // Case 4: Insert as first sibling
    if (!prevSibling && nextSibling) {
      const nextIdx = sortedSiblings.findIndex(s => s.id === nextSibling.id)
      const nextInfo = siblingAngles[nextIdx]!

      let targetAngle: number
      const targetDistance = nextInfo.distance

      if (nextIdx < sortedSiblings.length - 1 && sortedSiblings.length >= 2) {
        // Has two or more siblings after - use gap from next two
        const nextNextInfo = siblingAngles[nextIdx + 1]!
        const gap = nextNextInfo.angle - nextInfo.angle
        targetAngle = Math.max(nextInfo.angle - gap, MIN_ANGLE)
      } else {
        // Only one sibling after - use default 30 degree gap
        targetAngle = Math.max(nextInfo.angle - DEFAULT_SIBLING_ANGLE_GAP, MIN_ANGLE)
      }

      return positionFromAngle(refX, refY, targetAngle, targetDistance, nodeWidth, nodeHeight)
    }

    // Fallback: place at 90 degrees
    return positionFromAngle(refX, refY, 90, DEFAULT_CHILD_DISTANCE, nodeWidth, nodeHeight)
  }

  return {
    swapPositionsOnReorder,
    calculateInsertPosition,
    getRefPoint
  }
}

