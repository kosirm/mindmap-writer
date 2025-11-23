/**
 * Menu System Setup Composable
 * 
 * Initializes the command system and provides menu configurations.
 * This keeps the main component clean and makes the menu system reusable.
 */

import { computed, onMounted } from 'vue';
import { useCommands } from './useCommands';
import { allCommands } from '../commands';
import { toolbarMenus, topBarMenus, contextMenus } from '../config/menus';
import type { MenuItem } from '../commands/types';

export function useMenuSystem() {
  const { registerCommands, updateContext } = useCommands();

  // Register all commands on mount
  onMounted(() => {
    registerCommands(allCommands);
  });

  // Toolbar items for different views
  const mindmapToolbarItems = computed<MenuItem[]>(() => {
    // Return only the most essential commands for a clean toolbar
    const items = [
      // Removed: addNode, addChildNode, addSiblingNode (indices 0-2)
      toolbarMenus.mindmap[2], // delete
      toolbarMenus.mindmap[3], // zoomIn
      toolbarMenus.mindmap[4], // zoomOut
      toolbarMenus.mindmap[5], // zoomToFit
      toolbarMenus.mindmap[6], // runLayout
      toolbarMenus.mindmap[7], // toggleCollisions
      toolbarMenus.mindmap[8], // resolveOverlaps (conditional - only when collisions OFF)
      toolbarMenus.mindmap[9], // toggleMinimap
      toolbarMenus.mindmap[10], // orientation split button
    ];
    return items.filter((item): item is MenuItem => item !== undefined);
  });

  const writerToolbarItems = computed<MenuItem[]>(() => {
    // Return only the most essential commands for a clean toolbar
    const items = [
      toolbarMenus.writer[0], // bold
      toolbarMenus.writer[1], // italic
      toolbarMenus.writer[2], // underline
      toolbarMenus.writer[5], // link
      toolbarMenus.writer[6], // bulletList
      toolbarMenus.writer[7], // numberedList
      toolbarMenus.writer[8], // clearFormatting
    ];
    return items.filter((item): item is MenuItem => item !== undefined);
  });

  // Context menu items
  const mindmapContextMenuItems = computed<MenuItem[]>(() => contextMenus.mindmap);
  const treeviewContextMenuItems = computed<MenuItem[]>(() => contextMenus.treeview);
  const writerContextMenuItems = computed<MenuItem[]>(() => contextMenus.writer);

  // Top bar menus
  const topBarMenuItems = computed(() => topBarMenus);

  /**
   * Update command context when application state changes
   */
  function updateCommandContext(updates: {
    selectedNodeIds?: string[];
    activeView?: 'mindmap' | 'writer' | 'tree';
    clipboardData?: unknown;
    [key: string]: unknown;
  }) {
    updateContext(updates);
  }

  return {
    // Toolbar items
    mindmapToolbarItems,
    writerToolbarItems,
    
    // Context menu items
    mindmapContextMenuItems,
    treeviewContextMenuItems,
    writerContextMenuItems,
    
    // Top bar menus
    topBarMenuItems,
    
    // Context update function
    updateCommandContext,
  };
}

