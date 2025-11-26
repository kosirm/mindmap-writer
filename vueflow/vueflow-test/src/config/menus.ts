/**
 * Menu Configuration
 * 
 * Declarative menu definitions for the application.
 * Defines what commands appear in which menus.
 */

import type { MenuItem } from '../commands/types';

/**
 * Top bar menu configuration (File, Edit, View, etc.)
 */
export const topBarMenus = {
  file: [
    { command: 'file.new', group: 'file' },
    { command: 'file.open', group: 'file' },
    { command: 'file.save', group: 'file' },
    { command: 'file.saveAs', group: 'file' },
    {
      command: 'file.export.json',
      group: 'export',
      label: 'Export',
      submenu: [
        { command: 'file.export.json' },
        { command: 'file.export.png' },
        { command: 'file.export.svg' },
        { command: 'file.export.markdown' },
      ],
    },
    { command: 'file.import.json', group: 'export' },
    { command: 'file.settings', group: 'preferences' },
  ] as MenuItem[],
  
  edit: [
    { command: 'edit.undo', group: 'history' },
    { command: 'edit.redo', group: 'history' },
    { command: 'edit.cut', group: 'clipboard' },
    { command: 'edit.copy', group: 'clipboard' },
    { command: 'edit.paste', group: 'clipboard' },
    { command: 'edit.delete', group: 'clipboard' },
    { command: 'edit.duplicate', group: 'clipboard' },
    { command: 'edit.selectAll', group: 'selection' },
    { command: 'edit.deselectAll', group: 'selection' },
  ] as MenuItem[],
  
  view: [
    { command: 'view.zoomIn', group: 'layout' },
    { command: 'view.zoomOut', group: 'layout' },
    { command: 'view.zoomToFit', group: 'layout' },
    { command: 'view.zoomToSelection', group: 'layout' },
    { command: 'view.toggleMindmap', group: 'navigation' },
    { command: 'view.toggleWriter', group: 'navigation' },
    { command: 'view.toggleTree', group: 'navigation' },
    {
      command: 'view.orientation.clockwise',
      group: 'layout',
      label: 'Orientation',
      submenu: [
        { command: 'view.orientation.clockwise' },
        { command: 'view.orientation.counterclockwise' },
      ],
    },
  ] as MenuItem[],
};

/**
 * Toolbar configurations for different views
 */
export const toolbarMenus = {
  mindmap: [
    // Removed: addNode, addChildNode, addSiblingNode (may be added back later as a group)
    { command: 'mindmap.connectNodes' },
    { command: 'mindmap.editNode' },
    { command: 'edit.delete' },
    { command: 'mindmap.alignHorizontal' }, // Align nodes horizontally with even spacing
    { command: 'mindmap.alignVertical' }, // Align nodes vertically with even spacing
    { command: 'view.zoomIn' },
    { command: 'view.zoomOut' },
    { command: 'view.zoomToFit' },
    { command: 'mindmap.runLayout' },
    { command: 'mindmap.toggleCollisions' },
    { command: 'mindmap.resolveOverlaps' }, // Only shown when collisions are OFF
    { command: 'view.toggleMinimap' }, // Show/hide minimap
    {
      command: 'view.orientation.clockwise',
      group: 'layout',
      splitButton: true,
      submenu: [
        { command: 'view.orientation.clockwise' },
        { command: 'view.orientation.counterclockwise' },
      ],
      activeCommandGetter: (context) => {
        const mode = context?.orientationMode || 'clockwise';
        return `view.orientation.${mode}`;
      },
    },
  ] as MenuItem[],
  
  writer: [
    { command: 'writer.bold' },
    { command: 'writer.italic' },
    { command: 'writer.underline' },
    { command: 'writer.strikethrough' },
    { command: 'writer.code' },
    { command: 'writer.link' },
    { command: 'writer.bulletList' },
    { command: 'writer.numberedList' },
    { command: 'writer.clearFormatting' },
  ] as MenuItem[],
};

/**
 * Context menu configurations for different views
 */
export const contextMenus = {
  mindmap: [
    { command: 'mindmap.addChildNode', group: 'node' },
    { command: 'mindmap.addSiblingNode', group: 'node' },
    { command: 'mindmap.editNode', group: 'node' },
    { command: 'edit.cut', group: 'clipboard' },
    { command: 'edit.copy', group: 'clipboard' },
    { command: 'edit.paste', group: 'clipboard' },
    { command: 'edit.duplicate', group: 'clipboard' },
    { command: 'edit.delete', group: 'clipboard' },
    { command: 'mindmap.connectNodes', group: 'connection' },
    { command: 'mindmap.disconnectNodes', group: 'connection' },
    { command: 'mindmap.collapseNode', group: 'node' },
    { command: 'mindmap.expandNode', group: 'node' },
  ] as MenuItem[],
  
  treeview: [
    { command: 'mindmap.addChildNode', group: 'node' },
    { command: 'mindmap.addSiblingNode', group: 'node' },
    { command: 'edit.cut', group: 'clipboard' },
    { command: 'edit.copy', group: 'clipboard' },
    { command: 'edit.paste', group: 'clipboard' },
    { command: 'edit.delete', group: 'clipboard' },
    { command: 'mindmap.collapseNode', group: 'node' },
    { command: 'mindmap.expandNode', group: 'node' },
  ] as MenuItem[],
  
  writer: [
    { command: 'edit.cut', group: 'clipboard' },
    { command: 'edit.copy', group: 'clipboard' },
    { command: 'edit.paste', group: 'clipboard' },
    { command: 'writer.bold', group: 'formatting' },
    { command: 'writer.italic', group: 'formatting' },
    { command: 'writer.underline', group: 'formatting' },
    { command: 'writer.link', group: 'formatting' },
    { command: 'writer.clearFormatting', group: 'formatting' },
  ] as MenuItem[],
};

