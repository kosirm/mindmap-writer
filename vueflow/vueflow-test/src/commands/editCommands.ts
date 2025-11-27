/**
 * Edit Commands
 *
 * Commands for editing operations: undo, redo, cut, copy, paste, delete, etc.
 */

import type { Command } from './types';

export const editCommands: Command[] = [
  {
    id: 'edit.undo',
    label: 'Undo',
    icon: 'undo',
    category: 'edit',
    keybinding: 'Ctrl+Z',
    tooltip: 'Undo last action',
    showInPalette: true,
    execute: () => {
      // TODO: Implement undo
      // console.log('Undo...');
    },
  },

  {
    id: 'edit.redo',
    label: 'Redo',
    icon: 'redo',
    category: 'edit',
    keybinding: 'Ctrl+Y',
    tooltip: 'Redo last undone action',
    showInPalette: true,
    execute: () => {
      // TODO: Implement redo
      // console.log('Redo...');
    },
  },

  {
    id: 'edit.cut',
    label: 'Cut',
    icon: 'content_cut',
    category: 'edit',
    keybinding: 'Ctrl+X',
    tooltip: 'Cut selected nodes',
    showInPalette: true,
    when: (context) => (context?.selectedNodeIds?.length ?? 0) > 0,
    execute: (context) => {
      // TODO: Implement cut
      // console.log('Cut nodes:', context?.selectedNodeIds);
    },
  },

  {
    id: 'edit.copy',
    label: 'Copy',
    icon: 'content_copy',
    category: 'edit',
    keybinding: 'Ctrl+C',
    tooltip: 'Copy selected nodes',
    showInPalette: true,
    when: (context) => (context?.selectedNodeIds?.length ?? 0) > 0,
    execute: (context) => {
      // TODO: Implement copy
      // console.log('Copy nodes:', context?.selectedNodeIds);
    },
  },

  {
    id: 'edit.paste',
    label: 'Paste',
    icon: 'content_paste',
    category: 'edit',
    keybinding: 'Ctrl+V',
    tooltip: 'Paste nodes from clipboard',
    showInPalette: true,
    when: (context) => context?.clipboardData !== undefined,
    execute: (context) => {
      // TODO: Implement paste
      // console.log('Paste nodes:', context?.clipboardData);
    },
  },

  {
    id: 'edit.delete',
    label: 'Delete',
    icon: 'delete',
    category: 'edit',
    keybinding: 'Delete',
    tooltip: 'Delete selected nodes',
    showInPalette: true,
    when: (context) => (context?.selectedNodeIds?.length ?? 0) > 0,
    execute: (context) => {
      // TODO: Implement delete
      // console.log('Delete nodes:', context?.selectedNodeIds);
    },
  },

  {
    id: 'edit.duplicate',
    label: 'Duplicate',
    icon: 'control_point_duplicate',
    category: 'edit',
    keybinding: 'Ctrl+D',
    tooltip: 'Duplicate selected nodes',
    showInPalette: true,
    when: (context) => (context?.selectedNodeIds?.length ?? 0) > 0,
    execute: (context) => {
      // TODO: Implement duplicate
      // console.log('Duplicate nodes:', context?.selectedNodeIds);
    },
  },

  {
    id: 'edit.selectAll',
    label: 'Select All',
    icon: 'select_all',
    category: 'selection',
    keybinding: 'Ctrl+A',
    tooltip: 'Select all nodes',
    showInPalette: true,
    execute: () => {
      // TODO: Implement select all
      // console.log('Select all nodes...');
    },
  },

  {
    id: 'edit.deselectAll',
    label: 'Deselect All',
    icon: 'deselect',
    category: 'selection',
    keybinding: 'Escape',
    tooltip: 'Deselect all nodes',
    showInPalette: true,
    when: (context) => (context?.selectedNodeIds?.length ?? 0) > 0,
    execute: () => {
      // TODO: Implement deselect all
      // console.log('Deselect all nodes...');
    },
  },
];

