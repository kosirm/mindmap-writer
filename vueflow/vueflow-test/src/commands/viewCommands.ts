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
    label: 'Counter-Clockwise',
    icon: 'rotate_left',  // Swapped: clockwise goes left (counterclockwise arrow)
    category: 'view',
    tooltip: 'Set mindmap orientation to clockwise (0° top, nodes arranged clockwise)',
    showInPalette: true,
    execute: (context) => {
      if (context?.setOrientationClockwise) {
        context.setOrientationClockwise();
      }
    },
  },

  {
    id: 'view.orientation.counterclockwise',
    label: 'Clockwise',
    icon: 'rotate_right',  // Swapped: counterclockwise goes right (clockwise arrow)
    category: 'view',
    tooltip: 'Set mindmap orientation to counterclockwise (0° top, nodes arranged counterclockwise)',
    showInPalette: true,
    execute: (context) => {
      if (context?.setOrientationCounterclockwise) {
        context.setOrientationCounterclockwise();
      }
    },
  },
];

