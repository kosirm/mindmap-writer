/**
 * Orientation-based child node sorting
 *
 * All orientations use angle/degree-based sorting from parent center
 * (or canvas center for root nodes).
 *
 * Starting point is always 12 o'clock (top).
 *
 * Orientations:
 * - Clockwise: 12 → 3 → 6 → 9 → 12
 * - Counter-clockwise: 12 → 9 → 6 → 3 → 12
 * - Left-Right: Left side first (12 → 9 → 6), then right side (12 → 3 → 6)
 * - Right-Left: Right side first (12 → 3 → 6), then left side (12 → 9 → 6)
 */

import type { NodeData } from '../../components/mindmap/types'

export type OrientationMode = 'clockwise' | 'counter-clockwise' | 'left-right' | 'right-left'

/**
 * Calculate angle from reference point to node center
 * Returns angle in degrees, normalized to 0-360 starting from 12 o'clock going clockwise
 */
export function calculateClockwiseAngle(
  nodeX: number, nodeY: number, nodeWidth: number, nodeHeight: number,
  refX: number, refY: number
): number {
  const nodeCenterX = nodeX + nodeWidth / 2
  const nodeCenterY = nodeY + nodeHeight / 2

  const dx = nodeCenterX - refX
  const dy = nodeCenterY - refY

  // atan2 returns -180 to 180, with 0 pointing right (3 o'clock)
  const atan2Degrees = Math.atan2(dy, dx) * 180 / Math.PI

  // Normalize to 0-360 starting from 12 o'clock (top) going clockwise
  // 12 o'clock = -90° in atan2, we want it to be 0°
  return (atan2Degrees + 90 + 360) % 360
}

/**
 * Get sort key for a node based on orientation
 * Lower values = earlier in the order
 */
export function getOrientationSortKey(
  node: NodeData,
  refX: number,
  refY: number,
  orientation: OrientationMode
): number {
  const clockwiseAngle = calculateClockwiseAngle(
    node.x, node.y, node.width, node.height,
    refX, refY
  )

  switch (orientation) {
    case 'clockwise':
      // Start at 12 o'clock, go CW: 0° → 90° → 180° → 270° → 360°
      return clockwiseAngle

    case 'counter-clockwise':
      // Start at 12 o'clock, go CCW: 0° → 270° → 180° → 90° → 0°
      // Invert the angle: 0° stays 0°, 90° becomes 270°, etc.
      return (360 - clockwiseAngle) % 360

    case 'left-right':
      // Left side first (CCW from 12 to 6), then right side (CW from 12 to 6)
      // Left side: angles 180° to 360° (left semicircle)
      // Right side: angles 0° to 180° (right semicircle)
      if (clockwiseAngle >= 180) {
        // Left side: map 180-360 to 0-180 (so left comes first)
        // 360° (top-left) → 0, 270° (middle-left) → 90, 180° (bottom-left) → 180
        return 360 - clockwiseAngle
      } else {
        // Right side: map 0-180 to 180-360 (so right comes after left)
        // 0° (top-right) → 180, 90° (middle-right) → 270, 180° (bottom-right) → 360
        return 180 + clockwiseAngle
      }

    case 'right-left':
      // Right side first (CW from 12 to 6), then left side (CCW from 12 to 6)
      // Right side: angles 0° to 180° (right semicircle)
      // Left side: angles 180° to 360° (left semicircle)
      if (clockwiseAngle < 180) {
        // Right side: 0-180 stays 0-180
        return clockwiseAngle
      } else {
        // Left side: map 180-360 to 180-360 (CCW from 12 to 6)
        // 360° (top-left) → 180, 270° (middle-left) → 270, 180° (bottom-left) → 360
        return 540 - clockwiseAngle
      }

    default:
      return clockwiseAngle
  }
}

/**
 * Sort children of a node based on orientation
 */
export function sortChildrenByOrientation(
  children: NodeData[],
  parent: NodeData | null,
  canvasCenter: { x: number; y: number },
  orientation: OrientationMode
): NodeData[] {
  // Reference point: parent center or canvas center for root nodes
  const refX = parent ? parent.x + parent.width / 2 : canvasCenter.x
  const refY = parent ? parent.y + parent.height / 2 : canvasCenter.y

  return [...children].sort((a, b) => {
    const keyA = getOrientationSortKey(a, refX, refY, orientation)
    const keyB = getOrientationSortKey(b, refX, refY, orientation)
    return keyA - keyB
  })
}

/**
 * Get the order index of a child relative to its siblings
 * Returns 0-based index in the orientation-sorted order
 */
export function getChildOrderIndex(
  child: NodeData,
  siblings: NodeData[],
  parent: NodeData | null,
  canvasCenter: { x: number; y: number },
  orientation: OrientationMode
): number {
  const sorted = sortChildrenByOrientation(siblings, parent, canvasCenter, orientation)
  return sorted.findIndex(n => n.id === child.id)
}

/**
 * Determine if a node is on the left side of its parent (angle 180-360)
 */
function isOnLeftSide(node: NodeData, refX: number, refY: number): boolean {
  const angle = calculateClockwiseAngle(node.x, node.y, node.width, node.height, refX, refY)
  return angle >= 180
}

/**
 * Determine if a position is on the left side (for use with positions Map)
 */
function isOnLeftSideByPos(x: number, y: number, width: number, height: number, refX: number, refY: number): boolean {
  const angle = calculateClockwiseAngle(x, y, width, height, refX, refY)
  return angle >= 180
}

/**
 * Calculate position swaps needed when changing orientation
 * Returns array of { nodeId, newX, newY } for nodes that need to move
 *
 * Transition rules (from user):
 * - CW → CCW: swap sides
 * - CW → LR: swap sides, then reverse right
 * - CW → RL: reverse left
 * - CCW → CW: swap sides
 * - CCW → LR: reverse right
 * - CCW → RL: swap sides, then reverse left
 * - LR → CW: swap sides, then reverse left
 * - LR → CCW: reverse right
 * - LR → RL: swap sides
 * - RL → CW: reverse left
 * - RL → CCW: swap sides, then reverse right
 * - RL → LR: swap sides
 */
export function calculateOrientationTransition(
  children: NodeData[],
  parent: NodeData | null,
  canvasCenter: { x: number; y: number },
  fromOrientation: OrientationMode,
  toOrientation: OrientationMode,
  skipMirror: boolean = false // If true, only do reverse operations (mirror already done globally)
): Array<{ nodeId: string; newX: number; newY: number }> {
  if (children.length === 0 || fromOrientation === toOrientation) {
    return []
  }

  const refX = parent ? parent.x + parent.width / 2 : canvasCenter.x
  const refY = parent ? parent.y + parent.height / 2 : canvasCenter.y

  // Split children into left and right sides, sorted by Y (top to bottom)
  const leftNodes = children.filter(n => isOnLeftSide(n, refX, refY)).sort((a, b) => a.y - b.y)
  const rightNodes = children.filter(n => !isOnLeftSide(n, refX, refY)).sort((a, b) => a.y - b.y)

  // Get the transition operations
  let ops = getTransitionOperations(fromOrientation, toOrientation)

  // If skipMirror, filter out swap-sides (already done globally)
  if (skipMirror) {
    ops = ops.filter(op => op !== 'swap-sides')
  }

  // If no operations left, return empty
  if (ops.length === 0) {
    return []
  }

  // DEBUG: Log transition details
  console.group(`Transition: ${fromOrientation} → ${toOrientation}${skipMirror ? ' (reverse only)' : ''}`)
  console.log(`Parent: ${parent?.label ?? 'ROOT'} at (${refX.toFixed(0)}, ${refY.toFixed(0)})`)
  console.log(`Operations: ${ops.join(', ') || 'none'}`)
  console.log('Left nodes (before):', leftNodes.map(n => ({
    label: n.label,
    pos: `(${n.x.toFixed(0)}, ${n.y.toFixed(0)})`,
    angle: calculateClockwiseAngle(n.x, n.y, n.width, n.height, refX, refY).toFixed(0) + '°'
  })))
  console.log('Right nodes (before):', rightNodes.map(n => ({
    label: n.label,
    pos: `(${n.x.toFixed(0)}, ${n.y.toFixed(0)})`,
    angle: calculateClockwiseAngle(n.x, n.y, n.width, n.height, refX, refY).toFixed(0) + '°'
  })))

  // Create a working copy of positions (we may need to apply multiple operations)
  const positions = new Map<string, { x: number; y: number }>()
  for (const node of children) {
    positions.set(node.id, { x: node.x, y: node.y })
  }

  // Helper to get current left/right nodes based on positions Map
  const getCurrentLeftNodes = () => children
    .filter(n => {
      const pos = positions.get(n.id)!
      return isOnLeftSideByPos(pos.x, pos.y, n.width, n.height, refX, refY)
    })
    .sort((a, b) => positions.get(a.id)!.y - positions.get(b.id)!.y)

  const getCurrentRightNodes = () => children
    .filter(n => {
      const pos = positions.get(n.id)!
      return !isOnLeftSideByPos(pos.x, pos.y, n.width, n.height, refX, refY)
    })
    .sort((a, b) => positions.get(a.id)!.y - positions.get(b.id)!.y)

  // Apply operations in order - re-classify after each operation
  for (const op of ops) {
    console.log(`Applying: ${op}`)
    const currentLeft = getCurrentLeftNodes()
    const currentRight = getCurrentRightNodes()
    console.log(`  Current left: [${currentLeft.map(n => n.label).join(', ')}]`)
    console.log(`  Current right: [${currentRight.map(n => n.label).join(', ')}]`)

    if (op === 'swap-sides') {
      // Mirror ALL children across the parent's X axis
      applyMirrorX(children, refX, positions)
    } else if (op === 'reverse-left') {
      applyReverse(currentLeft, positions)
    } else if (op === 'reverse-right') {
      applyReverse(currentRight, positions)
    }
  }

  // Convert to position updates (only include nodes that actually moved)
  const positionUpdates: Array<{ nodeId: string; newX: number; newY: number }> = []
  for (const node of children) {
    const newPos = positions.get(node.id)!
    if (newPos.x !== node.x || newPos.y !== node.y) {
      positionUpdates.push({
        nodeId: node.id,
        newX: newPos.x,
        newY: newPos.y
      })
    }
  }

  console.log('Position updates:', positionUpdates.map(u => {
    const node = children.find(n => n.id === u.nodeId)
    return {
      label: node?.label,
      from: `(${node?.x.toFixed(0)}, ${node?.y.toFixed(0)})`,
      to: `(${u.newX.toFixed(0)}, ${u.newY.toFixed(0)})`
    }
  }))
  console.groupEnd()

  return positionUpdates
}

export type TransitionOp = 'swap-sides' | 'reverse-left' | 'reverse-right'

/**
 * Get the sequence of operations needed for a transition
 */
export function getTransitionOperations(from: OrientationMode, to: OrientationMode): TransitionOp[] {
  // CW transitions
  if (from === 'clockwise' && to === 'counter-clockwise') return ['swap-sides']
  if (from === 'clockwise' && to === 'left-right') return ['swap-sides', 'reverse-right']
  if (from === 'clockwise' && to === 'right-left') return ['reverse-left']

  // CCW transitions
  if (from === 'counter-clockwise' && to === 'clockwise') return ['swap-sides']
  if (from === 'counter-clockwise' && to === 'left-right') return ['reverse-right']
  if (from === 'counter-clockwise' && to === 'right-left') return ['swap-sides', 'reverse-left']

  // LR transitions
  if (from === 'left-right' && to === 'clockwise') return ['swap-sides', 'reverse-left']
  if (from === 'left-right' && to === 'counter-clockwise') return ['reverse-right']
  if (from === 'left-right' && to === 'right-left') return ['swap-sides']

  // RL transitions
  if (from === 'right-left' && to === 'clockwise') return ['reverse-left']
  if (from === 'right-left' && to === 'counter-clockwise') return ['swap-sides', 'reverse-right']
  if (from === 'right-left' && to === 'left-right') return ['swap-sides']

  return []
}

/**
 * Mirror all nodes across the reference X axis
 * This flips left nodes to right and right nodes to left
 */
function applyMirrorX(
  nodes: NodeData[],
  refX: number,
  positions: Map<string, { x: number; y: number }>
): void {
  for (const node of nodes) {
    const pos = positions.get(node.id)!
    // Calculate node center
    const nodeCenterX = pos.x + node.width / 2
    // Mirror across refX: newCenterX = refX - (nodeCenterX - refX) = 2*refX - nodeCenterX
    const newCenterX = 2 * refX - nodeCenterX
    // Convert back to top-left position
    const newX = newCenterX - node.width / 2
    positions.set(node.id, { x: newX, y: pos.y })
  }
}

/**
 * Reverse positions within a group of nodes
 * First node swaps with last, second with second-to-last, etc.
 */
function applyReverse(
  nodes: NodeData[],
  positions: Map<string, { x: number; y: number }>
): void {
  const n = nodes.length

  for (let i = 0; i < Math.floor(n / 2); i++) {
    const nodeA = nodes[i]!
    const nodeB = nodes[n - 1 - i]!

    const posA = positions.get(nodeA.id)!
    const posB = positions.get(nodeB.id)!

    // Swap positions
    positions.set(nodeA.id, { x: posB.x, y: posB.y })
    positions.set(nodeB.id, { x: posA.x, y: posA.y })
  }
}

export function useOrientationSort() {
  return {
    getOrientationSortKey,
    sortChildrenByOrientation,
    getChildOrderIndex,
    calculateOrientationTransition
  }
}

