import { Data } from './interface'

export type Orientation = 'clockwise' | 'anticlockwise' | 'right-left' | 'left-right'

/**
 * Apply orientation to mindmap data by setting the 'left' property on depth-1 nodes
 *
 * Orientation modes:
 * - clockwise: Right side top-to-bottom, then left side bottom-to-top (reversed)
 * - anticlockwise: Left side top-to-bottom, then right side bottom-to-top (reversed)
 * - right-left: Right side top-to-bottom, then left side top-to-bottom
 * - left-right: Left side top-to-bottom, then right side top-to-bottom
 *
 * @param data - The root data node
 * @param orientation - The orientation mode
 */
export function applyOrientation(data: Data, orientation: Orientation): void {
  if (!data.children || data.children.length === 0) {
    return
  }

  const children = data.children
  const totalChildren = children.length

  switch (orientation) {
    case 'clockwise':
      // Right side: first half (top to bottom)
      // Left side: second half (bottom to top, so reverse order)
      applyClockwise(children)
      break

    case 'anticlockwise':
      // Left side: first half (top to bottom)
      // Right side: second half (bottom to top, so reverse order)
      applyAnticlockwise(children)
      break

    case 'right-left':
      // Right side: first half (top to bottom)
      // Left side: second half (top to bottom)
      applyRightLeft(children)
      break

    case 'left-right':
      // Left side: first half (top to bottom)
      // Right side: second half (top to bottom)
      applyLeftRight(children)
      break
  }

  // Recursively apply to all children
  children.forEach(child => {
    if (child.children) {
      applyOrientationToChildren(child, orientation)
    }
  })
}

/**
 * Recursively apply orientation to all descendants
 * Children inherit the 'left' property from their parent
 * For clockwise/anticlockwise, also reverse the order of children on the appropriate side
 */
function applyOrientationToChildren(node: Data, orientation: Orientation): void {
  if (!node.children || node.children.length === 0) return

  const parentLeft = node.left

  // First, assign left property to all children (they inherit from parent)
  node.children.forEach(child => {
    child.left = parentLeft
  })

  // For clockwise: reverse left side children
  // For anticlockwise: reverse right side children
  const shouldReverse =
    (orientation === 'clockwise' && parentLeft === true) ||
    (orientation === 'anticlockwise' && parentLeft === false)

  if (shouldReverse) {
    node.children.reverse()
  }

  // Recursively apply to grandchildren
  node.children.forEach(child => {
    if (child.children) {
      applyOrientationToChildren(child, orientation)
    }
  })
}

/**
 * Clockwise: Right side top-to-bottom, then left side bottom-to-top
 */
function applyClockwise(children: Data[]): void {
  const mid = Math.ceil(children.length / 2)

  // Assign left property BEFORE reversing
  // First half: right side (top to bottom)
  for (let i = 0; i < mid; i++) {
    children[i].left = false
  }

  // Second half: left side (will be bottom to top after reverse)
  for (let i = mid; i < children.length; i++) {
    children[i].left = true
  }

  // Now reverse ONLY the left side portion of the array in-place
  const leftPortion = children.slice(mid)
  leftPortion.reverse()

  // Replace the left side in the original array
  for (let i = 0; i < leftPortion.length; i++) {
    children[mid + i] = leftPortion[i]
  }
}

/**
 * Anticlockwise: Left side top-to-bottom, then right side bottom-to-top
 */
function applyAnticlockwise(children: Data[]): void {
  const mid = Math.ceil(children.length / 2)

  // Assign left property BEFORE reversing
  // First half: left side (top to bottom)
  for (let i = 0; i < mid; i++) {
    children[i].left = true
  }

  // Second half: right side (will be bottom to top after reverse)
  for (let i = mid; i < children.length; i++) {
    children[i].left = false
  }

  // Now reverse ONLY the right side portion of the array in-place
  const rightPortion = children.slice(mid)
  rightPortion.reverse()

  // Replace the right side in the original array
  for (let i = 0; i < rightPortion.length; i++) {
    children[mid + i] = rightPortion[i]
  }
}

/**
 * Right-Left: Right side top-to-bottom, then left side top-to-bottom
 */
function applyRightLeft(children: Data[]): void {
  const mid = Math.ceil(children.length / 2)

  // First half: right side
  for (let i = 0; i < mid; i++) {
    children[i].left = false
  }

  // Second half: left side
  for (let i = mid; i < children.length; i++) {
    children[i].left = true
  }
}

/**
 * Left-Right: Left side top-to-bottom, then right side top-to-bottom
 */
function applyLeftRight(children: Data[]): void {
  const mid = Math.ceil(children.length / 2)

  // First half: left side
  for (let i = 0; i < mid; i++) {
    children[i].left = true
  }

  // Second half: right side
  for (let i = mid; i < children.length; i++) {
    children[i].left = false
  }
}

