/**
 * View Registry Composable
 * 
 * Manages different view types (Mindmap, Writer, Circle Pack, Sunburst, etc.)
 * and their associated metadata.
 */

import { ref, type Component } from 'vue';

/**
 * View type definition
 */
export interface ViewType {
  /** Unique view identifier */
  id: string;
  
  /** Human-readable label */
  label: string;
  
  /** Icon (Material Icons name) */
  icon: string;
  
  /** Vue component for this view */
  component: Component | (() => Promise<Component>);
  
  /** Command IDs that are supported/relevant for this view */
  supportedCommands?: string[];
  
  /** Optional description */
  description?: string;
  
  /** Whether this view supports selection */
  supportsSelection?: boolean;
  
  /** Whether this view supports editing */
  supportsEditing?: boolean;
}

// Global view registry
const views = ref<Map<string, ViewType>>(new Map());

/**
 * Main composable for view registry
 */
export function useViewRegistry() {
  /**
   * Register a view type
   */
  function registerView(view: ViewType) {
    if (views.value.has(view.id)) {
      // console.warn(`View ${view.id} is already registered. Overwriting.`);
    }
    views.value.set(view.id, view);
  }

  /**
   * Register multiple views at once
   */
  function registerViews(viewList: ViewType[]) {
    viewList.forEach(view => registerView(view));
  }

  /**
   * Unregister a view
   */
  function unregisterView(viewId: string) {
    views.value.delete(viewId);
  }

  /**
   * Get a view by ID
   */
  function getView(viewId: string): ViewType | undefined {
    return views.value.get(viewId);
  }

  /**
   * Get all registered views
   */
  function getAllViews(): ViewType[] {
    return Array.from(views.value.values());
  }

  /**
   * Check if a view supports a specific command
   */
  function viewSupportsCommand(viewId: string, commandId: string): boolean {
    const view = getView(viewId);
    if (!view || !view.supportedCommands) return true; // If no restrictions, assume supported
    
    return view.supportedCommands.includes(commandId);
  }

  /**
   * Get views that support a specific command
   */
  function getViewsSupportingCommand(commandId: string): ViewType[] {
    return getAllViews().filter(view => viewSupportsCommand(view.id, commandId));
  }

  return {
    // Registration
    registerView,
    registerViews,
    unregisterView,
    
    // Query
    getView,
    getAllViews,
    viewSupportsCommand,
    getViewsSupportingCommand,
  };
}

