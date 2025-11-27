/**
 * File Commands
 * 
 * Commands for file operations: new, open, save, export, etc.
 */

import type { Command } from './types';

export const fileCommands: Command[] = [
  {
    id: 'file.new',
    label: 'New Mindmap',
    icon: 'note_add',
    category: 'file',
    keybinding: 'Ctrl+N',
    tooltip: 'Create a new mindmap',
    showInPalette: true,
    execute: (context) => {
      // Create new mindmap from context
      if (context?.createNewMindmap) {
        context.createNewMindmap();
      }
    },
  },

  {
    id: 'file.open',
    label: 'Open...',
    icon: 'folder_open',
    category: 'file',
    keybinding: 'Ctrl+O',
    tooltip: 'Open an existing mindmap',
    showInPalette: true,
    execute: (context) => {
      // Show open dialog from context
      if (context?.showOpenDialog) {
        context.showOpenDialog();
      }
    },
  },

  {
    id: 'file.save',
    label: 'Save',
    icon: 'save',
    category: 'file',
    keybinding: 'Ctrl+S',
    tooltip: 'Save the current mindmap',
    showInPalette: true,
    execute: (context) => {
      // Save current mindmap from context
      if (context?.saveCurrentMindmap) {
        context.saveCurrentMindmap();
      }
    },
  },

  {
    id: 'file.saveAs',
    label: 'Save As...',
    icon: 'save_as',
    category: 'file',
    keybinding: 'Ctrl+Shift+S',
    tooltip: 'Save the current mindmap with a new name',
    showInPalette: true,
    execute: (context) => {
      // Show save as dialog from context
      if (context?.showSaveAsDialog) {
        context.showSaveAsDialog();
      }
    },
  },
  
  {
    id: 'file.export.json',
    label: 'Export as JSON',
    icon: 'code',
    category: 'file',
    tooltip: 'Export mindmap data as JSON',
    showInPalette: true,
    execute: (context) => {
      // Export as JSON from context
      if (context?.exportAsJSON) {
        context.exportAsJSON();
      }
    },
  },

  {
    id: 'file.export.png',
    label: 'Export as PNG',
    icon: 'image',
    category: 'file',
    tooltip: 'Export mindmap as PNG image',
    showInPalette: true,
    execute: () => {
      // TODO: Implement PNG export (requires canvas rendering)
      // console.log('Exporting as PNG...');
    },
  },

  {
    id: 'file.export.svg',
    label: 'Export as SVG',
    icon: 'image',
    category: 'file',
    tooltip: 'Export mindmap as SVG image',
    showInPalette: true,
    execute: () => {
      // TODO: Implement SVG export (requires canvas rendering)
      // console.log('Exporting as SVG...');
    },
  },

  {
    id: 'file.export.markdown',
    label: 'Export as Markdown',
    icon: 'description',
    category: 'file',
    tooltip: 'Export mindmap as Markdown document',
    showInPalette: true,
    execute: () => {
      // TODO: Implement Markdown export
      // console.log('Exporting as Markdown...');
    },
  },

  {
    id: 'file.import.json',
    label: 'Import from JSON',
    icon: 'upload_file',
    category: 'file',
    tooltip: 'Import mindmap data from JSON',
    showInPalette: true,
    execute: (context) => {
      // Import from JSON from context
      if (context?.importFromJSON) {
        context.importFromJSON();
      }
    },
  },

  {
    id: 'file.settings',
    label: 'Settings',
    icon: 'settings',
    category: 'file',
    keybinding: 'Ctrl+,',
    tooltip: 'Open application settings',
    showInPalette: true,
    execute: (context) => {
      // Navigate to settings page
      if (context?.navigateToSettings) {
        context.navigateToSettings();
      }
    },
  },
];

