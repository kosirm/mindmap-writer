/**
 * File Commands
 *
 * Commands for file operations:
 * - New document
 * - Save / Save As
 * - Open from Google Drive
 */

import type { Command } from '../types'

export const fileCommands: Command[] = [
  {
    id: 'file.new',
    label: 'New File',
    icon: 'note_add',
    category: 'file',
    group: 'file',
    keybinding: 'Alt+N',
    description: 'Create a new blank file',
    keywords: ['new', 'create', 'blank', 'mindmap'],
    order: 1,
    showInPalette: true,
    execute: () => {
      window.dispatchEvent(new CustomEvent('file:new'))
    }
  },

  {
    id: 'file.close',
    label: 'Close File',
    icon: 'close',
    category: 'file',
    group: 'file',
    keybinding: 'Alt+W',
    description: 'Close the current file tab',
    keywords: ['close', 'file', 'tab', 'dispose'],
    order: 2,
    showInPalette: true,
    execute: () => {
      window.dispatchEvent(new CustomEvent('file:close'))
    }
  },

  {
    id: 'file.open',
    label: 'Open from Google Drive',
    icon: 'folder_open',
    category: 'file',
    group: 'file',
    keybinding: 'Ctrl+O',
    description: 'Open a mindmap from Google Drive',
    keywords: ['open', 'load', 'google', 'drive', 'file'],
    order: 2,
    showInPalette: true,
    scope: { requiresAuth: true },
    when: (ctx) => ctx.isAuthenticated,
    execute: () => {
      window.dispatchEvent(new CustomEvent('file:open'))
    }
  },

  {
    id: 'file.save',
    label: 'Save',
    icon: 'save',
    category: 'file',
    group: 'file',
    keybinding: 'Ctrl+S',
    description: 'Save the current mindmap to Google Drive',
    keywords: ['save', 'store', 'google', 'drive'],
    order: 3,
    showInPalette: true,
    scope: { requiresAuth: true },
    when: (ctx) => ctx.isAuthenticated,
    execute: () => {
      window.dispatchEvent(new CustomEvent('file:save'))
    }
  },

  {
    id: 'file.saveAs',
    label: 'Save As...',
    icon: 'save_as',
    category: 'file',
    group: 'file',
    keybinding: 'Ctrl+Shift+S',
    description: 'Save the current mindmap with a new name',
    keywords: ['save', 'as', 'new', 'name', 'copy'],
    order: 4,
    showInPalette: true,
    scope: { requiresAuth: true },
    when: (ctx) => ctx.isAuthenticated,
    execute: () => {
      window.dispatchEvent(new CustomEvent('file:saveAs'))
    }
  },

  {
    id: 'file.manage',
    label: 'Manage Files',
    icon: 'folder',
    category: 'file',
    group: 'file',
    description: 'View and manage saved mindmaps in Google Drive',
    keywords: ['manage', 'files', 'list', 'browse', 'google', 'drive'],
    order: 5,
    showInPalette: true,
    scope: { requiresAuth: true },
    when: (ctx) => ctx.isAuthenticated,
    execute: () => {
      window.dispatchEvent(new CustomEvent('file:manage'))
    }
  },

  {
    id: 'file.export.json',
    label: 'Export as JSON',
    icon: 'code',
    category: 'file',
    group: 'export',
    description: 'Download the mindmap as a JSON file',
    keywords: ['export', 'json', 'download', 'backup'],
    order: 10,
    showInPalette: true,
    execute: () => {
      window.dispatchEvent(new CustomEvent('file:export:json'))
    }
  },

  {
    id: 'file.import.json',
    label: 'Import from JSON',
    icon: 'upload_file',
    category: 'file',
    group: 'file',
    description: 'Import a mindmap from a JSON file',
    keywords: ['import', 'json', 'upload', 'restore'],
    order: 11,
    showInPalette: true,
    execute: () => {
      window.dispatchEvent(new CustomEvent('file:import:json'))
    }
  }
]

