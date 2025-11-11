import style from '../css'
import { add, addSibling, del, collapse, expand, changeLeft } from '../data'
import { getSelectedGData, selectGNode } from '../assistant'
import { edit } from './listener'
import { Mdata } from '../interface'
import { selection } from '../variable'
import * as d3 from '../d3'

/**
 * Keyboard event handler for mindmap
 * Provides keyboard shortcuts for navigation and editing
 */
export const onKeyDown = (e: KeyboardEvent): void => {
  // Don't handle keyboard events when editing text
  const editedNode = document.getElementsByClassName(style.edited)[0]
  if (editedNode) { return }

  // Don't handle if no node is selected
  const selectedNode = document.getElementsByClassName(style.selected)[0]
  if (!selectedNode) { return }

  const selectedData = getSelectedGData()
  if (!selectedData) { return }

  const { key, ctrlKey, metaKey, shiftKey } = e
  const cmdKey = ctrlKey || metaKey // Support both Ctrl (Windows/Linux) and Cmd (Mac)

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

    case 'Tab':
      e.preventDefault()
      if (shiftKey) {
        // Shift + Tab: Outdent (promote node)
        handleOutdent(selectedData)
      } else {
        // Tab: Indent (make child of previous sibling)
        handleIndent(selectedData)
      }
      break

    case 'Delete':
    case 'Backspace':
      e.preventDefault()
      handleDelete(selectedData)
      break

    case 'ArrowUp':
      e.preventDefault()
      handleNavigateUp(selectedData)
      break

    case 'ArrowDown':
      e.preventDefault()
      handleNavigateDown(selectedData)
      break

    case 'ArrowLeft':
      e.preventDefault()
      handleNavigateLeft(selectedData)
      break

    case 'ArrowRight':
      e.preventDefault()
      handleNavigateRight(selectedData)
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

    case 'Escape':
      e.preventDefault()
      handleEscape()
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
    // Move current node as child of previous sibling
    const { moveChild } = require('../data')
    moveChild(prevSibling.id, d.id)
  }
}

/**
 * Outdent: Promote the selected node to be sibling of its parent
 */
const handleOutdent = (d: Mdata): void => {
  // Can't outdent root node or direct children of root
  if (d.depth <= 1 || !d.parent || !d.parent.parent) { return }

  const { moveSibling } = require('../data')
  // Move after parent
  moveSibling(d.id, d.parent.id)
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
 * Deselect current node
 */
const handleEscape = (): void => {
  const selectedNode = document.getElementsByClassName(style.selected)[0]
  if (selectedNode) {
    selectedNode.classList.remove(style.selected)
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

