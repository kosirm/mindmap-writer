/**
 * Palette Commands
 *
 * Commands for the command palette and search functionality.
 */

import type { Command } from '../types'

export const paletteCommands: Command[] = [
  {
    id: 'palette.open',
    label: 'Open Command Palette',
    icon: 'terminal',
    category: 'navigation',
    keybinding: 'Ctrl+Shift+P',
    keybindingAlt: ['F1'],
    description: 'Open the command palette to search and execute commands',
    keywords: ['search', 'commands', 'actions', 'quick'],
    order: 1,
    showInPalette: false, // Don't show "open palette" in the palette itself
    execute: (ctx) => {
      window.dispatchEvent(new CustomEvent('command:palette.open', { detail: ctx }))
    },
  },
  {
    id: 'palette.searchNodes',
    label: 'Search Nodes',
    icon: 'search',
    category: 'navigation',
    keybinding: 'Ctrl+P',
    description: 'Search for nodes in the current document',
    keywords: ['find', 'goto', 'navigate', 'node'],
    order: 2,
    showInPalette: true,
    execute: (ctx) => {
      window.dispatchEvent(new CustomEvent('command:palette.searchNodes', { detail: ctx }))
    },
  },
  {
    id: 'palette.searchFiles',
    label: 'Search Files',
    icon: 'folder_open',
    category: 'navigation',
    keybinding: 'Ctrl+Shift+O',
    description: 'Search for files in Google Drive',
    keywords: ['find', 'file', 'open', 'document'],
    order: 3,
    showInPalette: true,
    scope: {
      requiresAuth: true,
    },
    execute: (ctx) => {
      window.dispatchEvent(new CustomEvent('command:palette.searchFiles', { detail: ctx }))
    },
  },
]

