/**
 * View Commands
 * 
 * Commands for view operations: zoom, fit, layout, orientation, etc.
 */

import type { Command } from './types';

export const viewCommands: Command[] = [
  {
    id: 'view.zoomIn',
    label: 'Zoom In',
    icon: 'zoom_in',
    category: 'view',
    keybinding: 'Ctrl+=',
    tooltip: 'Zoom in',
    showInPalette: true,
    execute: () => {
      // TODO: Implement zoom in
      console.log('Zoom in...');
    },
  },
  
  {
    id: 'view.zoomOut',
    label: 'Zoom Out',
    icon: 'zoom_out',
    category: 'view',
    keybinding: 'Ctrl+-',
    tooltip: 'Zoom out',
    showInPalette: true,
    execute: () => {
      // TODO: Implement zoom out
      console.log('Zoom out...');
    },
  },
  
  {
    id: 'view.zoomToFit',
    label: 'Zoom to Fit',
    icon: 'fit_screen',
    category: 'view',
    keybinding: 'Ctrl+0',
    tooltip: 'Fit all nodes in view',
    showInPalette: true,
    execute: () => {
      // TODO: Implement zoom to fit
      console.log('Zoom to fit...');
    },
  },
  
  {
    id: 'view.zoomToSelection',
    label: 'Zoom to Selection',
    icon: 'center_focus_strong',
    category: 'view',
    tooltip: 'Zoom to selected nodes',
    showInPalette: true,
    when: (context) => (context?.selectedNodeIds?.length ?? 0) > 0,
    execute: (context) => {
      // TODO: Implement zoom to selection
      console.log('Zoom to selection:', context?.selectedNodeIds);
    },
  },
  
  {
    id: 'view.toggleMindmap',
    label: 'Toggle Mindmap View',
    icon: 'account_tree',
    category: 'view',
    keybinding: 'Ctrl+1',
    tooltip: 'Show/hide mindmap view',
    showInPalette: true,
    execute: () => {
      // TODO: Implement toggle mindmap
      console.log('Toggle mindmap view...');
    },
  },
  
  {
    id: 'view.toggleWriter',
    label: 'Toggle Writer View',
    icon: 'edit_note',
    category: 'view',
    keybinding: 'Ctrl+2',
    tooltip: 'Show/hide writer view',
    showInPalette: true,
    execute: () => {
      // TODO: Implement toggle writer
      console.log('Toggle writer view...');
    },
  },
  
  {
    id: 'view.toggleTree',
    label: 'Toggle Tree View',
    icon: 'list',
    category: 'view',
    keybinding: 'Ctrl+3',
    tooltip: 'Show/hide tree view',
    showInPalette: true,
    execute: () => {
      // TODO: Implement toggle tree
      console.log('Toggle tree view...');
    },
  },
  
  {
    id: 'view.orientation.clockwise',
    label: 'Clockwise Orientation',
    icon: 'rotate_right',
    category: 'view',
    tooltip: 'Set mindmap orientation to clockwise',
    showInPalette: true,
    execute: () => {
      // TODO: Implement clockwise orientation
      console.log('Set clockwise orientation...');
    },
  },
  
  {
    id: 'view.orientation.anticlockwise',
    label: 'Anti-Clockwise Orientation',
    icon: 'rotate_left',
    category: 'view',
    tooltip: 'Set mindmap orientation to anti-clockwise',
    showInPalette: true,
    execute: () => {
      // TODO: Implement anti-clockwise orientation
      console.log('Set anti-clockwise orientation...');
    },
  },
  
  {
    id: 'view.orientation.leftRight',
    label: 'Left-Right Orientation',
    icon: 'arrow_forward',
    category: 'view',
    tooltip: 'Set mindmap orientation to left-right',
    showInPalette: true,
    execute: () => {
      // TODO: Implement left-right orientation
      console.log('Set left-right orientation...');
    },
  },
  
  {
    id: 'view.orientation.rightLeft',
    label: 'Right-Left Orientation',
    icon: 'arrow_back',
    category: 'view',
    tooltip: 'Set mindmap orientation to right-left',
    showInPalette: true,
    execute: () => {
      // TODO: Implement right-left orientation
      console.log('Set right-left orientation...');
    },
  },
];

