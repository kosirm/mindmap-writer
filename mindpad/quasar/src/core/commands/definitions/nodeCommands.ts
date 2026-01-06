/**
 * Node Commands
 *
 * Commands for creating, editing, and managing nodes.
 * These are executed via toolbar, keyboard shortcuts, context menu, or palette.
 */

import type { Command } from '../types'

/**
 * Create node commands
 * Note: Execute functions are stubs - they emit events that views listen to
 */
export const nodeCommands: Command[] = [
  // ============================================================================
  // Create Nodes
  // ============================================================================
  {
    id: 'node.add.root',
    label: 'Add Root Node',
    icon: 'add_circle',
    category: 'node',
    description: 'Create a new root node in the center of the canvas',
    keywords: ['create', 'new', 'root', 'central'],
    group: 'node',
    order: 1,
    showInPalette: true,
    showInContextMenu: false,
    scope: {
      views: ['mindmap', 'd3-concept-map'],
    },
    execute: (ctx) => {
      // Emit event for mindmap view to handle
      window.dispatchEvent(new CustomEvent('command:node.add.root', { detail: ctx }))
    },
  },
  {
    id: 'node.add.child',
    label: 'Add Child Node',
    icon: 'subdirectory_arrow_right',
    category: 'node',
    keybinding: 'Tab',
    description: 'Add a child node to the selected node',
    keywords: ['create', 'new', 'child', 'sub'],
    group: 'node',
    order: 2,
    showInPalette: true,
    showInContextMenu: true,
    scope: {
      views: ['mindmap', 'd3-concept-map', 'outline', 'writer'],
      requiresSelection: true,
    },
    when: (ctx) => ctx.selectedNodeIds.length > 0,
    execute: (ctx) => {
      window.dispatchEvent(new CustomEvent('command:node.add.child', { detail: ctx }))
    },
  },
  {
    id: 'node.add.sibling',
    label: 'Add Sibling Node',
    icon: 'add',
    category: 'node',
    keybinding: 'Enter',
    description: 'Add a sibling node next to the selected node',
    keywords: ['create', 'new', 'sibling', 'peer', 'same level'],
    group: 'node',
    order: 3,
    showInPalette: true,
    showInContextMenu: true,
    scope: {
      views: ['mindmap', 'd3-concept-map', 'outline', 'writer'],
      requiresSelection: true,
    },
    when: (ctx) => ctx.selectedNodeIds.length > 0,
    execute: (ctx) => {
      window.dispatchEvent(new CustomEvent('command:node.add.sibling', { detail: ctx }))
    },
  },

  // ============================================================================
  // Edit Nodes
  // ============================================================================
  {
    id: 'node.edit',
    label: 'Edit Node',
    icon: 'edit',
    category: 'node',
    keybinding: 'F2',
    keybindingAlt: ['Space'],
    description: 'Edit the selected node title',
    keywords: ['rename', 'change', 'title', 'name'],
    group: 'node',
    order: 10,
    showInPalette: true,
    showInContextMenu: true,
    scope: {
      requiresSelection: true,
    },
    when: (ctx) => ctx.selectedNodeIds.length === 1,
    execute: (ctx) => {
      window.dispatchEvent(new CustomEvent('command:node.edit', { detail: ctx }))
    },
  },
  {
    id: 'node.delete',
    label: 'Delete Node',
    icon: 'delete',
    category: 'node',
    keybinding: 'Delete',
    keybindingAlt: ['Backspace'],
    description: 'Delete the selected node(s)',
    keywords: ['remove', 'trash'],
    group: 'node',
    order: 11,
    showInPalette: true,
    showInContextMenu: true,
    scope: {
      requiresSelection: true,
    },
    when: (ctx) => ctx.selectedNodeIds.length > 0,
    execute: (ctx) => {
      window.dispatchEvent(new CustomEvent('command:node.delete', { detail: ctx }))
    },
  },

  // ============================================================================
  // Collapse/Expand
  // ============================================================================
  {
    id: 'node.collapse.toggle',
    label: 'Toggle Collapse',
    icon: 'unfold_less',
    category: 'node',
    keybinding: 'Ctrl+.',
    description: 'Collapse or expand the selected node',
    keywords: ['fold', 'expand', 'hide', 'show', 'children'],
    group: 'node',
    order: 20,
    showInPalette: true,
    showInContextMenu: true,
    scope: {
      views: ['mindmap', 'd3-concept-map', 'outline'],
      requiresSelection: true,
    },
    when: (ctx) => ctx.selectedNodeIds.length === 1,
    execute: (ctx) => {
      window.dispatchEvent(new CustomEvent('command:node.collapse.toggle', { detail: ctx }))
    },
  },

  // ============================================================================
  // Detach/Reparent
  // ============================================================================
  {
    id: 'node.detach',
    label: 'Detach Node',
    icon: 'call_split',
    category: 'node',
    description: 'Detach node from parent, making it a root node',
    keywords: ['disconnect', 'separate', 'root', 'unlink'],
    group: 'node',
    order: 30,
    showInPalette: true,
    showInContextMenu: true,
    scope: {
      views: ['mindmap', 'd3-concept-map'],
      requiresSelection: true,
    },
    when: (ctx) => ctx.selectedNodeIds.length === 1,
    execute: (ctx) => {
      window.dispatchEvent(new CustomEvent('command:node.detach', { detail: ctx }))
    },
  },
]
