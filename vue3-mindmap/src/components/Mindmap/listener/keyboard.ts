import style from '../css'
import { add, addSibling, del, collapse, expand, changeLeft, moveChild, moveSibling, mmdata } from '../data'
import { getSelectedGData, selectGNode } from '../assistant'
import { edit, onEditBlur } from './listener'
import { Mdata, Data } from '../interface'
import { selection } from '../variable'
import { foreignEle, foreignDivEle, wrapperEle } from '../variable/element'
import * as d3 from '../d3'

/**
 * Helper function to find a node by its rawData reference after structure changes
 */
const findNodeByRawData = (rawData: Data): Mdata | null => {
  const findInTree = (node: Mdata): Mdata | null => {
    if (node.rawData === rawData) {
      return node
    }
    if (node.children) {
      for (const child of node.children) {
        const found = findInTree(child)
        if (found) return found
      }
    }
    return null
  }

  return findInTree(mmdata.data)
}

/**
 * Keyboard event handler for mindmap
 * Provides keyboard shortcuts for navigation and editing
 */
export const onKeyDown = (e: KeyboardEvent): void => {
  const { key, ctrlKey, metaKey, shiftKey } = e
  const cmdKey = ctrlKey || metaKey // Support both Ctrl (Windows/Linux) and Cmd (Mac)

  // Check if we're in edit mode
  const editedNode = document.getElementsByClassName(style.edited)[0]

  // Allow Escape key to work even in edit mode
  if (key === 'Escape') {
    e.preventDefault()
    handleEscape()
    return
  }

  // Don't handle other keyboard events when editing text
  if (editedNode) { return }

  // Don't handle if no node is selected
  const selectedNode = document.getElementsByClassName(style.selected)[0]
  if (!selectedNode) { return }

  const selectedData = getSelectedGData()
  if (!selectedData) { return }

  // Handle different key combinations
  switch (key) {
    case 'Enter':
      e.preventDefault()
      if (cmdKey) {
        // Ctrl/Cmd + Enter: Add child node
        handleAddChild(selectedData, e)
      } else {
        // Enter: Add sibling node
        handleAddSibling(selectedData, e)
      }
      break

    case 'Delete':
    case 'Backspace':
      e.preventDefault()
      handleDelete(selectedData)
      break

    case 'ArrowUp':
      e.preventDefault()
      if (cmdKey) {
        // Ctrl/Cmd + Arrow Up: Move node up in sibling order (swap with previous sibling)
        handleMoveUp(selectedData)
      } else {
        handleNavigateUp(selectedData)
      }
      break

    case 'ArrowDown':
      e.preventDefault()
      if (cmdKey) {
        // Ctrl/Cmd + Arrow Down: Move node down in sibling order (swap with next sibling)
        handleMoveDown(selectedData)
      } else {
        handleNavigateDown(selectedData)
      }
      break

    case 'ArrowLeft':
      e.preventDefault()
      if (cmdKey) {
        // Ctrl/Cmd + Arrow Left: Hierarchy management (respects left/right side)
        handleHierarchyLeft(selectedData)
      } else {
        handleNavigateLeft(selectedData)
      }
      break

    case 'ArrowRight':
      e.preventDefault()
      if (cmdKey) {
        // Ctrl/Cmd + Arrow Right: Hierarchy management (respects left/right side)
        handleHierarchyRight(selectedData)
      } else {
        handleNavigateRight(selectedData)
      }
      break

    case 'c':
      if (cmdKey) {
        e.preventDefault()
        handleCopy(selectedData)
      }
      break

    case 'x':
      if (cmdKey) {
        e.preventDefault()
        handleCut(selectedData)
      }
      break

    case 'v':
      if (cmdKey) {
        e.preventDefault()
        handlePaste(selectedData)
      }
      break

    case ' ': // Space
      e.preventDefault()
      handleToggleCollapse(selectedData)
      break

    case 'F2':
      e.preventDefault()
      handleEditNode(selectedData, e)
      break

    default:
      // If it's a printable character and not a modifier combo, start editing
      if (key.length === 1 && !cmdKey && !e.altKey) {
        e.preventDefault()
        handleEditNode(selectedData, e)
      }
      break
  }
}

/**
 * Add a child node to the selected node
 */
const handleAddChild = (d: Mdata, e: MouseEvent | KeyboardEvent): void => {
  const child = add(d.id, '')
  if (child) { edit(child, e as MouseEvent) }
}

/**
 * Add a sibling node after the selected node
 */
const handleAddSibling = (d: Mdata, e: MouseEvent | KeyboardEvent): void => {
  // Don't add sibling to root node
  if (d.depth === 0) {
    handleAddChild(d, e)
    return
  }
  const sibling = addSibling(d.id, '')
  if (sibling) { edit(sibling, e as MouseEvent) }
}

/**
 * Delete the selected node
 */
const handleDelete = (d: Mdata): void => {
  // Don't delete root node
  if (d.depth === 0) { return }

  // Select parent or sibling before deleting
  const parent = d.parent
  if (parent) {
    selectGNode(parent)
  }

  del(d.id)
}

/**
 * Hierarchy Left: Respects mindmap spatial layout
 * - Right side: Decrease indent (outdent/promote)
 * - Left side: Increase indent (make child of previous sibling)
 */
const handleHierarchyLeft = (d: Mdata): void => {
  if (d.depth === 0) { return } // Can't modify root

  // On the right side (or undefined = right), left means outdent
  if (d.left === false || d.left === undefined) {
    handleOutdent(d)
  }
  // On the left side, left means indent (go deeper)
  else if (d.left === true) {
    handleIndent(d)
  }
}

/**
 * Hierarchy Right: Respects mindmap spatial layout
 * - Right side: Increase indent (make child of previous sibling)
 * - Left side: Decrease indent (outdent/promote)
 */
const handleHierarchyRight = (d: Mdata): void => {
  if (d.depth === 0) { return } // Can't modify root

  // On the right side (or undefined = right), right means indent
  if (d.left === false || d.left === undefined) {
    handleIndent(d)
  }
  // On the left side, right means outdent (go back toward root)
  else if (d.left === true) {
    handleOutdent(d)
  }
}

/**
 * Indent: Make the selected node a child of its previous sibling
 */
const handleIndent = (d: Mdata): void => {
  // Can't indent root node or first child
  if (d.depth === 0 || !d.parent) { return }

  const { g } = selection
  if (!g) { return }

  // Find previous sibling
  const siblings = d.parent.children.filter(child => child.left === d.left)
  const currentIndex = siblings.findIndex(s => s.id === d.id)

  if (currentIndex > 0) {
    const prevSibling = siblings[currentIndex - 1]
    const nodeRawData = d.rawData // Store reference to find node after operation

    // Move current node as child of previous sibling
    moveChild(prevSibling.id, d.id)

    // Re-select the moved node after structure refresh
    setTimeout(() => {
      const movedNode = findNodeByRawData(nodeRawData)
      if (movedNode) {
        selectGNode(movedNode)
      }
    }, 50)
  }
}

/**
 * Outdent: Promote the selected node to be sibling of its parent
 * Makes the node a child of its grandparent (first sibling after parent)
 */
const handleOutdent = (d: Mdata): void => {
  // Can't outdent root node or direct children of root
  if (d.depth <= 1 || !d.parent || !d.parent.parent) { return }

  const grandparent = d.parent.parent
  const parent = d.parent
  const nodeRawData = d.rawData // Store reference to find node after operation

  // Move to grandparent as a child
  moveChild(grandparent.id, d.id)

  // After moving, reorder to place it right after the original parent
  // Need to wait for structure to update, then reorder
  setTimeout(() => {
    const movedNode = findNodeByRawData(nodeRawData)
    if (movedNode && movedNode.parent) {
      const siblings = movedNode.parent.children.filter(child => child.left === parent.left)
      const parentIndex = siblings.findIndex(s => s.id === parent.id)

      if (parentIndex >= 0 && parentIndex < siblings.length - 1) {
        // Move to position after parent
        const nextSibling = siblings[parentIndex + 1]
        if (nextSibling && nextSibling.id !== movedNode.id) {
          moveSibling(movedNode.id, nextSibling.id, -1) // Move before next sibling

          // Re-select after second move
          setTimeout(() => {
            const finalNode = findNodeByRawData(nodeRawData)
            if (finalNode) {
              selectGNode(finalNode)
            }
          }, 50)
        } else {
          selectGNode(movedNode)
        }
      } else {
        selectGNode(movedNode)
      }
    }
  }, 50)
}

/**
 * Move node up in sibling order (swap with previous sibling)
 */
const handleMoveUp = (d: Mdata): void => {
  // Can't move root or nodes without parent
  if (d.depth === 0 || !d.parent) { return }

  // Get ALL children (not filtered by side)
  const allChildren = d.parent.children
  const currentIndex = allChildren.findIndex(s => s.id === d.id)

  if (currentIndex > 0) {
    const prevSibling = allChildren[currentIndex - 1]

    // Move to the position of previous sibling (swap with it)
    // after=0 means insert at refIndex (which will be adjusted by moveSibling logic)
    moveSibling(d.id, prevSibling.id, 0)

    // Wait for structure to refresh, then re-select
    setTimeout(() => {
      const refreshedNode = findNodeByRawData(d.rawData)
      if (refreshedNode) {
        selectGNode(refreshedNode)
      }
    }, 50)
  }
}

/**
 * Move node down in sibling order (swap with next sibling)
 */
const handleMoveDown = (d: Mdata): void => {
  // Can't move root or nodes without parent
  if (d.depth === 0 || !d.parent) { return }

  // Get ALL children (not filtered by side)
  const allChildren = d.parent.children
  const currentIndex = allChildren.findIndex(s => s.id === d.id)

  if (currentIndex < allChildren.length - 1) {
    const nextSibling = allChildren[currentIndex + 1]

    // Move after next sibling
    moveSibling(d.id, nextSibling.id, 1)

    // Wait for structure to refresh, then re-select
    setTimeout(() => {
      const refreshedNode = findNodeByRawData(d.rawData)
      if (refreshedNode) {
        selectGNode(refreshedNode)
      }
    }, 50)
  }
}

/**
 * Navigate to previous sibling
 */
const handleNavigateUp = (d: Mdata): void => {
  if (!d.parent) { return }

  const siblings = d.parent.children.filter(child => child.left === d.left)
  const currentIndex = siblings.findIndex(s => s.id === d.id)

  if (currentIndex > 0) {
    selectGNode(siblings[currentIndex - 1])
  }
}

/**
 * Navigate to next sibling
 */
const handleNavigateDown = (d: Mdata): void => {
  if (!d.parent) { return }

  const siblings = d.parent.children.filter(child => child.left === d.left)
  const currentIndex = siblings.findIndex(s => s.id === d.id)

  if (currentIndex < siblings.length - 1) {
    selectGNode(siblings[currentIndex + 1])
  }
}

/**
 * Navigate left: respects mindmap spatial layout
 * - From root: go to first left child
 * - From left-side nodes: go deeper (to first child)
 * - From right-side nodes: go back (to parent)
 */
const handleNavigateLeft = (d: Mdata): void => {
  // If we're at root, navigate to first left child
  if (d.depth === 0) {
    const leftChildren = d.children?.filter(child => child.left === true)
    if (leftChildren && leftChildren.length > 0) {
      selectGNode(leftChildren[0])
    }
  }
  // If we're on the left side, navigate to first child (going deeper left)
  else if (d.left === true) {
    if (d.children && d.children.length > 0) {
      selectGNode(d.children[0])
    }
  }
  // If we're on the right side, navigate to parent (going back left)
  else if ((d.left === false || d.left === undefined) && d.parent) {
    selectGNode(d.parent)
  }
}

/**
 * Navigate right: respects mindmap spatial layout
 * - From root: go to first right child
 * - From right-side nodes: go deeper (to first child)
 * - From left-side nodes: go back (to parent)
 */
const handleNavigateRight = (d: Mdata): void => {
  // If we're at root, navigate to first right child
  if (d.depth === 0) {
    const rightChildren = d.children?.filter(child => child.left === false || child.left === undefined)
    if (rightChildren && rightChildren.length > 0) {
      selectGNode(rightChildren[0])
    }
  }
  // If we're on the left side, navigate to parent (going back right)
  else if (d.left === true && d.parent) {
    selectGNode(d.parent)
  }
  // If we're on the right side, navigate to first child (going deeper right)
  else if (d.left === false || d.left === undefined) {
    if (d.children && d.children.length > 0) {
      selectGNode(d.children[0])
    }
  }
}

/**
 * Copy selected node to clipboard
 */
const handleCopy = (d: Mdata): void => {
  const rawdata = d.rawData
  if (rawdata) {
    navigator.clipboard.writeText(JSON.stringify(rawdata))
  }
}

/**
 * Cut selected node to clipboard
 */
const handleCut = (d: Mdata): void => {
  // Don't cut root node
  if (d.depth === 0) { return }

  const rawdata = d.rawData
  if (rawdata) {
    navigator.clipboard.writeText(JSON.stringify(rawdata))
    handleDelete(d)
  }
}

/**
 * Paste from clipboard as child of selected node
 */
const handlePaste = (d: Mdata): void => {
  navigator.clipboard.readText().then(clipText => {
    try {
      const rawdata = JSON.parse(clipText)
      add(d.id, rawdata)
    } catch {
      // If not valid JSON, paste as plain text
      add(d.id, clipText)
    }
  })
}

/**
 * Handle Escape key:
 * - If in edit mode: exit edit mode (but keep node selected)
 * - If not in edit mode: deselect current node
 */
const handleEscape = (): void => {
  console.log('=== ESCAPE KEY PRESSED ===')

  // Check if we're currently in edit mode
  const editedNode = document.getElementsByClassName(style.edited)[0]
  console.log('Edited node found:', editedNode)

  // Also check if foreign element is visible
  if (foreignEle.value) {
    console.log('Foreign element display:', foreignEle.value.style.display)
  }

  if (editedNode) {
    console.log('In edit mode - calling onEditBlur()')

    // Blur the editing div to remove focus
    if (foreignDivEle.value) {
      console.log('Blurring foreignDivEle')
      foreignDivEle.value.blur()
    }

    // We're in edit mode - exit editing but keep node selected
    onEditBlur()

    // Re-select the node after exiting edit mode
    const gNode = editedNode as SVGGElement
    setTimeout(() => {
      console.log('Re-selecting node after edit')
      gNode.classList.add(style.selected)

      // Focus the wrapper element to ensure keyboard events are captured
      if (wrapperEle.value) {
        console.log('Focusing wrapper element')
        wrapperEle.value.focus()
      }
    }, 10)
  } else {
    console.log('Not in edit mode - deselecting node')
    // Not in edit mode - deselect the node
    const selectedNode = document.getElementsByClassName(style.selected)[0]
    if (selectedNode) {
      selectedNode.classList.remove(style.selected)
    }
  }
}

/**
 * Toggle collapse/expand of selected node
 */
const handleToggleCollapse = (d: Mdata): void => {
  // Can't collapse leaf nodes or root
  if (d.depth === 0 || !d.children || d.children.length === 0) { return }

  const gNode = document.querySelector(`g[data-id='${d.id}']`)
  if (gNode?.classList.contains(style.collapse)) {
    expand(d.id)
  } else {
    collapse(d.id)
  }
}

/**
 * Enter edit mode for selected node
 */
const handleEditNode = (d: Mdata, e: MouseEvent | KeyboardEvent): void => {
  edit(d, e as MouseEvent)
}

