/**
 * Orientation Layout Composable
 *
 * Handles positioning and ordering of nodes based on orientation mode:
 * - Clockwise: Nodes arranged clockwise around parent (0° = top, 90° = right, 180° = bottom, 270° = left)
 * - Counterclockwise: Nodes arranged counterclockwise around parent (0° = top, 90° = left, 180° = bottom, 270° = right)
 *
 * The system is designed to be extensible - new orientation modes can be added by:
 * 1. Adding the mode to OrientationMode type
 * 2. Implementing angle-to-order conversion logic in sortChildrenByAngle()
 * 3. Implementing order-to-position logic in calculatePositionFromOrder()
 */

import { ref, computed } from 'vue';
import type { Node } from '@vue-flow/core';

export type OrientationMode = 'clockwise' | 'counterclockwise';

// Default radius for positioning child nodes around parent
const DEFAULT_RADIUS = 200;

// Current orientation mode
const orientationMode = ref<OrientationMode>('clockwise');

/**
 * Calculate angle from parent center to node center
 * Returns angle in degrees (0-360), where 0° is top (12 o'clock position)
 * 
 * @param parentPos - Parent node position {x, y}
 * @param nodePos - Child node position {x, y}
 * @returns Angle in degrees (0-360)
 */
export function calculateAngle(
  parentPos: { x: number; y: number },
  nodePos: { x: number; y: number }
): number {
  const dx = nodePos.x - parentPos.x;
  const dy = nodePos.y - parentPos.y;
  
  // Calculate angle using atan2 (returns radians from -π to π)
  // atan2(dy, dx) gives angle from positive X axis
  const angleRad = Math.atan2(dy, dx);

  // Convert to degrees
  let angleDeg = angleRad * (180 / Math.PI);
  
  // Adjust so 0° is at top (12 o'clock) instead of right (3 o'clock)
  // Subtract 90° to rotate coordinate system
  angleDeg = angleDeg + 90;
  
  // Normalize to 0-360 range
  if (angleDeg < 0) {
    angleDeg += 360;
  }
  
  return angleDeg;
}

/**
 * Calculate position from angle and radius
 * 
 * @param parentPos - Parent node position {x, y}
 * @param angle - Angle in degrees (0° = top)
 * @param radius - Distance from parent center
 * @returns Position {x, y}
 */
export function calculatePositionFromAngle(
  parentPos: { x: number; y: number },
  angle: number,
  radius: number
): { x: number; y: number } {
  // Convert angle to radians and adjust for coordinate system
  // (0° should be at top, so subtract 90°)
  const angleRad = ((angle - 90) * Math.PI) / 180;
  
  return {
    x: parentPos.x + radius * Math.cos(angleRad),
    y: parentPos.y + radius * Math.sin(angleRad),
  };
}

/**
 * Calculate position based on order among siblings
 * Distributes nodes evenly around the parent in a circle
 *
 * This function implements the Order → Position conversion for orientation modes.
 * To add a new orientation mode, add the angle calculation logic here.
 *
 * @param parentPos - Parent node position {x, y}
 * @param order - Order index of this node among siblings (0-based)
 * @param siblingCount - Total number of siblings
 * @param radius - Distance from parent center
 * @param mode - Orientation mode
 * @returns Position {x, y}
 */
export function calculatePositionFromOrder(
  parentPos: { x: number; y: number },
  order: number,
  siblingCount: number,
  radius: number,
  mode: OrientationMode
): { x: number; y: number } {
  // Calculate angle based on order
  // Distribute evenly: 360° / siblingCount
  const angleStep = 360 / siblingCount;
  let angle = order * angleStep;

  // Apply orientation-specific angle transformation
  if (mode === 'counterclockwise') {
    // For counterclockwise, reverse the direction
    angle = 360 - angle;
  }
  // For clockwise, use angle as-is

  return calculatePositionFromAngle(parentPos, angle, radius);
}

/**
 * Calculate average radius of siblings from their parent
 * Used to maintain consistent spacing when reordering
 * 
 * @param siblings - Array of sibling nodes
 * @param parentPos - Parent node position {x, y}
 * @returns Average radius, or DEFAULT_RADIUS if no siblings
 */
export function calculateAverageRadius(
  siblings: Node[],
  parentPos: { x: number; y: number }
): number {
  if (siblings.length === 0) {
    return DEFAULT_RADIUS;
  }
  
  const totalRadius = siblings.reduce((sum, node) => {
    const dx = node.position.x - parentPos.x;
    const dy = node.position.y - parentPos.y;
    return sum + Math.sqrt(dx * dx + dy * dy);
  }, 0);
  
  return totalRadius / siblings.length;
}

/**
 * Mirror angle around vertical axis (for converting between clockwise/counterclockwise)
 *
 * @param angle - Angle in degrees (0-360)
 * @returns Mirrored angle
 */
export function mirrorAngle(angle: number): number {
  return (360 - angle) % 360;
}

/**
 * Sort children by angle and return sorted array with order indices
 * This implements the Position → Order conversion for orientation modes.
 * To add a new orientation mode, add the sorting logic here.
 *
 * @param children - Array of child nodes with their angles
 * @param mode - Orientation mode
 * @returns Sorted array of {node, angle, order}
 */
export function sortChildrenByAngle(
  children: Array<{ node: Node; angle: number }>,
  mode: OrientationMode
): Array<{ node: Node; angle: number; order: number }> {
  // Sort based on orientation mode
  const sorted = [...children];

  if (mode === 'counterclockwise') {
    // Counterclockwise: ascending angle (0° → 360°)
    sorted.sort((a, b) => a.angle - b.angle);
  } else {
    // Clockwise: descending angle (360° → 0°)
    sorted.sort((a, b) => b.angle - a.angle);
  }

  // Assign order indices
  return sorted.map((item, index) => ({
    ...item,
    order: index,
  }));
}

/**
 * Composable hook for orientation layout
 */
export function useOrientationLayout() {
  return {
    orientationMode: computed(() => orientationMode.value),
    setOrientationMode: (mode: OrientationMode) => {
      orientationMode.value = mode;
    },
    calculateAngle,
    calculatePositionFromAngle,
    calculatePositionFromOrder,
    calculateAverageRadius,
    mirrorAngle,
    sortChildrenByAngle,
    DEFAULT_RADIUS,
  };
}

