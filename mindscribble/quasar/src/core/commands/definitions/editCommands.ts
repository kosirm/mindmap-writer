/**
 * Edit Commands
 *
 * Commands for undo/redo, clipboard operations, and selection.
 */

import type { Command } from '../types'

export const editCommands: Command[] = [
  // ============================================================================
  // History (Undo/Redo)
  // ============================================================================
  {
    id: 'edit.undo',
    label: 'Undo',
    icon: 'undo',
    category: 'edit',
    keybinding: 'Ctrl+Z',
    description: 'Undo the last action',
    keywords: ['back', 'revert', 'history'],
    group: 'history',
    order: 1,
    showInPalette: true,
    execute: (ctx) => {
      window.dispatchEvent(new CustomEvent('command:edit.undo', { detail: ctx }))
    },
  },
  {
    id: 'edit.redo',
    label: 'Redo',
    icon: 'redo',
    category: 'edit',
    keybinding: 'Ctrl+Y',
    keybindingAlt: ['Ctrl+Shift+Z'],
    description: 'Redo the last undone action',
    keywords: ['forward', 'history'],
    group: 'history',
    order: 2,
    showInPalette: true,
    execute: (ctx) => {
      window.dispatchEvent(new CustomEvent('command:edit.redo', { detail: ctx }))
    },
  },

  // ============================================================================
  // Clipboard
  // ============================================================================
  {
    id: 'edit.cut',
    label: 'Cut',
    icon: 'content_cut',
    category: 'edit',
    keybinding: 'Ctrl+X',
    description: 'Cut the selected node(s) to clipboard',
    keywords: ['move', 'clipboard'],
    group: 'clipboard',
    order: 10,
    showInPalette: true,
    showInContextMenu: true,
    scope: {
      requiresSelection: true,
    },
    when: (ctx) => ctx.selectedNodeIds.length > 0,
    execute: (ctx) => {
      window.dispatchEvent(new CustomEvent('command:edit.cut', { detail: ctx }))
    },
  },
  {
    id: 'edit.copy',
    label: 'Copy',
    icon: 'content_copy',
    category: 'edit',
    keybinding: 'Ctrl+C',
    description: 'Copy the selected node(s) to clipboard',
    keywords: ['duplicate', 'clipboard'],
    group: 'clipboard',
    order: 11,
    showInPalette: true,
    showInContextMenu: true,
    scope: {
      requiresSelection: true,
    },
    when: (ctx) => ctx.selectedNodeIds.length > 0,
    execute: (ctx) => {
      window.dispatchEvent(new CustomEvent('command:edit.copy', { detail: ctx }))
    },
  },
  {
    id: 'edit.paste',
    label: 'Paste',
    icon: 'content_paste',
    category: 'edit',
    keybinding: 'Ctrl+V',
    description: 'Paste node(s) from clipboard',
    keywords: ['insert', 'clipboard'],
    group: 'clipboard',
    order: 12,
    showInPalette: true,
    showInContextMenu: true,
    scope: {
      requiresClipboard: true,
    },
    execute: (ctx) => {
      window.dispatchEvent(new CustomEvent('command:edit.paste', { detail: ctx }))
    },
  },
  {
    id: 'edit.duplicate',
    label: 'Duplicate',
    icon: 'file_copy',
    category: 'edit',
    keybinding: 'Ctrl+D',
    description: 'Duplicate the selected node(s)',
    keywords: ['copy', 'clone'],
    group: 'clipboard',
    order: 13,
    showInPalette: true,
    showInContextMenu: true,
    scope: {
      requiresSelection: true,
    },
    when: (ctx) => ctx.selectedNodeIds.length > 0,
    execute: (ctx) => {
      window.dispatchEvent(new CustomEvent('command:edit.duplicate', { detail: ctx }))
    },
  },

  // ============================================================================
  // Selection
  // ============================================================================
  {
    id: 'edit.selectAll',
    label: 'Select All',
    icon: 'select_all',
    category: 'selection',
    keybinding: 'Ctrl+A',
    description: 'Select all nodes',
    keywords: ['all', 'everything'],
    group: 'selection',
    order: 20,
    showInPalette: true,
    execute: (ctx) => {
      window.dispatchEvent(new CustomEvent('command:edit.selectAll', { detail: ctx }))
    },
  },
  {
    id: 'edit.deselect',
    label: 'Deselect All',
    icon: 'deselect',
    category: 'selection',
    keybinding: 'Escape',
    description: 'Clear the current selection',
    keywords: ['none', 'clear'],
    group: 'selection',
    order: 21,
    showInPalette: true,
    execute: (ctx) => {
      window.dispatchEvent(new CustomEvent('command:edit.deselect', { detail: ctx }))
    },
  },
]

