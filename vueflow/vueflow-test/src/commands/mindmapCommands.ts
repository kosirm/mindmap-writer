/**
 * Mindmap Commands
 * 
 * Commands specific to mindmap operations: add nodes, connect, layout, etc.
 */

import type { Command } from './types';

export const mindmapCommands: Command[] = [
  {
    id: 'mindmap.addNode',
    label: 'Add Node',
    icon: 'add_circle',
    category: 'mindmap',
    keybinding: 'Ctrl+Enter',
    tooltip: 'Add a new node',
    showInPalette: true,
    execute: () => {
      // TODO: Implement add node
      console.log('Add node...');
    },
  },
  
  {
    id: 'mindmap.addChildNode',
    label: 'Add Child Node',
    icon: 'subdirectory_arrow_right',
    category: 'mindmap',
    keybinding: 'Tab',
    tooltip: 'Add a child node to selected node',
    showInPalette: true,
    when: (context) => (context?.selectedNodeIds?.length ?? 0) === 1,
    execute: (context) => {
      // TODO: Implement add child node
      console.log('Add child node to:', context?.selectedNodeIds?.[0]);
    },
  },
  
  {
    id: 'mindmap.addSiblingNode',
    label: 'Add Sibling Node',
    icon: 'add',
    category: 'mindmap',
    keybinding: 'Enter',
    tooltip: 'Add a sibling node to selected node',
    showInPalette: true,
    when: (context) => (context?.selectedNodeIds?.length ?? 0) === 1,
    execute: (context) => {
      // TODO: Implement add sibling node
      console.log('Add sibling node to:', context?.selectedNodeIds?.[0]);
    },
  },
  
  {
    id: 'mindmap.addParentNode',
    label: 'Add Parent Node',
    icon: 'north',
    category: 'mindmap',
    keybinding: 'Shift+Tab',
    tooltip: 'Add a parent node to selected node',
    showInPalette: true,
    when: (context) => (context?.selectedNodeIds?.length ?? 0) === 1,
    execute: (context) => {
      // TODO: Implement add parent node
      console.log('Add parent node to:', context?.selectedNodeIds?.[0]);
    },
  },
  
  {
    id: 'mindmap.connectNodes',
    label: 'Connect Nodes',
    icon: 'link',
    category: 'mindmap',
    tooltip: 'Create a reference connection between nodes',
    showInPalette: true,
    when: (context) => (context?.selectedNodeIds?.length ?? 0) === 2,
    execute: (context) => {
      // TODO: Implement connect nodes
      console.log('Connect nodes:', context?.selectedNodeIds);
    },
  },
  
  {
    id: 'mindmap.disconnectNodes',
    label: 'Disconnect Nodes',
    icon: 'link_off',
    category: 'mindmap',
    tooltip: 'Remove connection between nodes',
    showInPalette: true,
    when: (context) => (context?.selectedNodeIds?.length ?? 0) === 2,
    execute: (context) => {
      // TODO: Implement disconnect nodes
      console.log('Disconnect nodes:', context?.selectedNodeIds);
    },
  },
  
  {
    id: 'mindmap.editNode',
    label: 'Edit Node',
    icon: 'edit',
    category: 'mindmap',
    keybinding: 'F2',
    tooltip: 'Edit selected node',
    showInPalette: true,
    when: (context) => (context?.selectedNodeIds?.length ?? 0) === 1,
    execute: (context) => {
      // TODO: Implement edit node
      console.log('Edit node:', context?.selectedNodeIds?.[0]);
    },
  },
  
  {
    id: 'mindmap.collapseNode',
    label: 'Collapse Node',
    icon: 'unfold_less',
    category: 'mindmap',
    tooltip: 'Collapse selected node and hide children',
    showInPalette: true,
    when: (context) => (context?.selectedNodeIds?.length ?? 0) === 1,
    execute: (context) => {
      // TODO: Implement collapse node
      console.log('Collapse node:', context?.selectedNodeIds?.[0]);
    },
  },
  
  {
    id: 'mindmap.expandNode',
    label: 'Expand Node',
    icon: 'unfold_more',
    category: 'mindmap',
    tooltip: 'Expand selected node and show children',
    showInPalette: true,
    when: (context) => (context?.selectedNodeIds?.length ?? 0) === 1,
    execute: (context) => {
      // TODO: Implement expand node
      console.log('Expand node:', context?.selectedNodeIds?.[0]);
    },
  },
  
  {
    id: 'mindmap.runLayout',
    label: 'Run Auto Layout',
    icon: 'scatter_plot',
    category: 'mindmap',
    keybinding: 'Ctrl+L',
    tooltip: 'Run automatic layout algorithm',
    showInPalette: true,
    execute: (context) => {
      // Call the D3 Force layout function from context
      if (context?.runD3ForceOnce) {
        context.runD3ForceOnce();
      }
    },
  },

  {
    id: 'mindmap.toggleCollisions',
    label: 'Toggle Collisions',
    icon: 'shield',
    category: 'mindmap',
    tooltip: 'Enable/disable collision detection',
    showInPalette: true,
    execute: (context) => {
      // Toggle Matter.js collision detection from context
      if (context?.toggleMatterCollisions) {
        context.toggleMatterCollisions();
      }
    },
  },
  {
    id: 'mindmap.resolveOverlaps',
    label: 'Resolve Overlaps',
    icon: 'auto_fix_high',
    category: 'mindmap',
    tooltip: 'Run physics simulation once to separate overlapping nodes',
    showInPalette: true,
    when: (context) => context?.matterEnabled === false,
    execute: (context) => {
      // Resolve overlaps using Matter.js from context
      if (context?.resolveOverlapsOnce) {
        context.resolveOverlapsOnce();
      }
    },
  },

  {
    id: 'mindmap.alignHorizontal',
    label: 'Align Horizontal',
    icon: 'align_vertical_center',
    category: 'mindmap',
    tooltip: 'Align selected nodes horizontally with even spacing',
    showInPalette: true,
    when: (context) => (context?.selectedNodeIds?.length ?? 0) >= 2,
    execute: (context) => {
      // Call the horizontal alignment function from context
      if (context?.alignNodesHorizontal) {
        context.alignNodesHorizontal();
      }
    },
  },

  {
    id: 'mindmap.alignVertical',
    label: 'Align Vertical',
    icon: 'align_horizontal_center',
    category: 'mindmap',
    tooltip: 'Align selected nodes vertically with even spacing',
    showInPalette: true,
    when: (context) => (context?.selectedNodeIds?.length ?? 0) >= 2,
    execute: (context) => {
      // Call the vertical alignment function from context
      if (context?.alignNodesVertical) {
        context.alignNodesVertical();
      }
    },
  },
];

