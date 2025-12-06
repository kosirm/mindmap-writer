/**
 * View Commands
 *
 * Commands for view switching, zooming, layout, and UI operations.
 */

import type { Command } from '../types'

export const viewCommands: Command[] = [
  // ============================================================================
  // Panel Management
  // ============================================================================
  {
    id: 'view.panel.left.toggle',
    label: 'Toggle Left Panel',
    icon: 'view_sidebar',
    category: 'view',
    keybinding: 'Ctrl+1',
    description: 'Show or hide the left panel (Outline)',
    keywords: ['sidebar', 'outline', 'tree', 'hide', 'show'],
    group: 'layout',
    order: 1,
    showInPalette: true,
    execute: (ctx) => {
      window.dispatchEvent(new CustomEvent('command:view.panel.left.toggle', { detail: ctx }))
    },
  },
  {
    id: 'view.panel.right.toggle',
    label: 'Toggle Right Panel',
    icon: 'view_sidebar',
    category: 'view',
    keybinding: 'Ctrl+3',
    description: 'Show or hide the right panel (Writer)',
    keywords: ['sidebar', 'writer', 'hide', 'show'],
    group: 'layout',
    order: 2,
    showInPalette: true,
    execute: (ctx) => {
      window.dispatchEvent(new CustomEvent('command:view.panel.right.toggle', { detail: ctx }))
    },
  },
  {
    id: 'view.panel.center.focus',
    label: 'Focus Center Panel',
    icon: 'center_focus_strong',
    category: 'view',
    keybinding: 'Ctrl+2',
    description: 'Focus the center panel (Canvas)',
    keywords: ['mindmap', 'canvas', 'main'],
    group: 'layout',
    order: 3,
    showInPalette: true,
    execute: (ctx) => {
      window.dispatchEvent(new CustomEvent('command:view.panel.center.focus', { detail: ctx }))
    },
  },

  // ============================================================================
  // Zoom Controls
  // ============================================================================
  {
    id: 'view.zoom.in',
    label: 'Zoom In',
    icon: 'zoom_in',
    category: 'view',
    keybinding: 'Ctrl+=',
    keybindingAlt: ['Ctrl++'],
    description: 'Zoom in on the canvas',
    keywords: ['magnify', 'enlarge'],
    group: 'layout',
    order: 10,
    showInPalette: true,
    scope: {
      views: ['mindmap', 'concept-map'],
    },
    execute: (ctx) => {
      window.dispatchEvent(new CustomEvent('command:view.zoom.in', { detail: ctx }))
    },
  },
  {
    id: 'view.zoom.out',
    label: 'Zoom Out',
    icon: 'zoom_out',
    category: 'view',
    keybinding: 'Ctrl+-',
    description: 'Zoom out on the canvas',
    keywords: ['shrink', 'smaller'],
    group: 'layout',
    order: 11,
    showInPalette: true,
    scope: {
      views: ['mindmap', 'concept-map'],
    },
    execute: (ctx) => {
      window.dispatchEvent(new CustomEvent('command:view.zoom.out', { detail: ctx }))
    },
  },
  {
    id: 'view.zoom.fit',
    label: 'Fit to Screen',
    icon: 'fit_screen',
    category: 'view',
    keybinding: 'Ctrl+0',
    description: 'Fit all nodes to the visible canvas area',
    keywords: ['fit', 'all', 'view', 'reset'],
    group: 'layout',
    order: 12,
    showInPalette: true,
    scope: {
      views: ['mindmap', 'concept-map'],
    },
    execute: (ctx) => {
      window.dispatchEvent(new CustomEvent('command:view.zoom.fit', { detail: ctx }))
    },
  },
  {
    id: 'view.zoom.reset',
    label: 'Reset Zoom',
    icon: 'zoom_out_map',
    category: 'view',
    description: 'Reset zoom to 100%',
    keywords: ['zoom', '100%', 'normal'],
    group: 'layout',
    order: 13,
    showInPalette: true,
    scope: {
      views: ['mindmap', 'concept-map'],
    },
    execute: (ctx) => {
      window.dispatchEvent(new CustomEvent('command:view.zoom.reset', { detail: ctx }))
    },
  },

  // ============================================================================
  // Theme
  // ============================================================================
  {
    id: 'view.theme.toggle',
    label: 'Toggle Dark Mode',
    icon: 'dark_mode',
    category: 'view',
    keybinding: 'Ctrl+Shift+D',
    description: 'Switch between light and dark mode',
    keywords: ['theme', 'light', 'dark', 'night'],
    group: 'settings',
    order: 20,
    showInPalette: true,
    execute: (ctx) => {
      window.dispatchEvent(new CustomEvent('command:view.theme.toggle', { detail: ctx }))
    },
  },

  // ============================================================================
  // Drawers
  // ============================================================================
  {
    id: 'view.drawer.left.toggle',
    label: 'Toggle Tools Drawer',
    icon: 'menu',
    category: 'view',
    description: 'Show or hide the left tools drawer',
    keywords: ['drawer', 'tools', 'sidebar'],
    group: 'layout',
    order: 30,
    showInPalette: true,
    execute: (ctx) => {
      window.dispatchEvent(new CustomEvent('command:view.drawer.left.toggle', { detail: ctx }))
    },
  },
  {
    id: 'view.drawer.right.toggle',
    label: 'Toggle AI Chat',
    icon: 'smart_toy',
    category: 'view',
    keybinding: 'Ctrl+Shift+A',
    description: 'Show or hide the AI chat drawer',
    keywords: ['ai', 'chat', 'assistant', 'drawer'],
    group: 'ai',
    order: 31,
    showInPalette: true,
    execute: (ctx) => {
      window.dispatchEvent(new CustomEvent('command:view.drawer.right.toggle', { detail: ctx }))
    },
  },
]

