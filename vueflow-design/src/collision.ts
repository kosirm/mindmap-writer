import type { Rectangle } from './types'

/**
 * AABB (Axis-Aligned Bounding Box) Collision Detection
 * Simple and fast rectangle collision detection and resolution
 */

/**
 * Check if two rectangles overlap
 */
export function rectanglesOverlap(a: Rectangle, b: Rectangle): boolean {
  return !(
    a.x + a.width < b.x ||   // a is left of b
    b.x + b.width < a.x ||   // b is left of a
    a.y + a.height < b.y ||  // a is above b
    b.y + b.height < a.y     // b is above a
  )
}

/**
 * Calculate overlap amount between two rectangles
 */
export function getOverlap(a: Rectangle, b: Rectangle): { x: number; y: number } {
  if (!rectanglesOverlap(a, b)) {
    return { x: 0, y: 0 }
  }

  const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
  const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
  
  return { x: overlapX, y: overlapY }
}

/**
 * Resolve overlap by pushing rectangles apart
 * Modifies the rectangles in place
 */
export function resolveOverlap(a: Rectangle, b: Rectangle): void {
  const overlap = getOverlap(a, b)
  
  if (overlap.x === 0 && overlap.y === 0) {
    return // No overlap
  }

  // Push in direction of smallest overlap
  if (overlap.x < overlap.y) {
    // Push horizontally
    const pushAmount = overlap.x / 2
    if (a.x < b.x) {
      a.x -= pushAmount
      b.x += pushAmount
    } else {
      a.x += pushAmount
      b.x -= pushAmount
    }
  } else {
    // Push vertically
    const pushAmount = overlap.y / 2
    if (a.y < b.y) {
      a.y -= pushAmount
      b.y += pushAmount
    } else {
      a.y += pushAmount
      b.y -= pushAmount
    }
  }
}

/**
 * Get the center point of a rectangle
 */
export function getRectCenter(rect: Rectangle): { x: number; y: number } {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2
  }
}

/**
 * Expand rectangle to include a point
 */
export function expandRectToIncludePoint(rect: Rectangle, x: number, y: number): Rectangle {
  const minX = Math.min(rect.x, x)
  const minY = Math.min(rect.y, y)
  const maxX = Math.max(rect.x + rect.width, x)
  const maxY = Math.max(rect.y + rect.height, y)
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  }
}

/**
 * Expand rectangle to include another rectangle
 */
export function expandRectToIncludeRect(a: Rectangle, b: Rectangle): Rectangle {
  const minX = Math.min(a.x, b.x)
  const minY = Math.min(a.y, b.y)
  const maxX = Math.max(a.x + a.width, b.x + b.width)
  const maxY = Math.max(a.y + a.height, b.y + b.height)
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  }
}

/**
 * Add padding to a rectangle (uniform padding)
 */
export function addPadding(rect: Rectangle, padding: number): Rectangle {
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2
  }
}

/**
 * Add separate horizontal and vertical padding to a rectangle
 */
export function addPaddingXY(rect: Rectangle, paddingX: number, paddingY: number): Rectangle {
  return {
    x: rect.x - paddingX,
    y: rect.y - paddingY,
    width: rect.width + paddingX * 2,
    height: rect.height + paddingY * 2
  }
}

