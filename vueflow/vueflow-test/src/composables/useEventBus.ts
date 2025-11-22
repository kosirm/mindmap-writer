/**
 * Event Bus using mitt
 *
 * Centralized event management for the mindmap application.
 * This provides a type-safe event bus for communication between components.
 *
 * @see mindmap-writer/vueflow/dev/EVENT_BUS_ARCHITECTURE.md for detailed documentation
 */

import mitt, { type Emitter } from 'mitt';

/**
 * Event type definitions
 *
 * All events in the application should be defined here with their payload types.
 * This ensures type safety and makes it easy to see all available events.
 */
export type MindmapEvents = {
  // ============================================================================
  // SELECTION EVENTS
  // ============================================================================

  /**
   * Emitted when a node is selected in the tree view
   * Payload: nodeId of the selected node, or null to deselect all
   */
  'tree:node-selected': { nodeId: string | null };

  /**
   * Emitted when a node is clicked/selected in the canvas
   * Payload: nodeId of the selected node
   */
  'canvas:node-selected': { nodeId: string };

  /**
   * Emitted when multiple nodes are selected in the canvas (e.g., Shift+Click to select with children)
   * Payload: array of nodeIds to select
   */
  'canvas:nodes-selected': { nodeIds: string[] };

  /**
   * Emitted when the canvas pane (background) is clicked to deselect all nodes
   */
  'canvas:pane-clicked': Record<string, never>; // Empty object for events with no payload

  /**
   * Emitted when a node is selected from any view (generic selection event)
   * Payload: nodeId of the selected node
   */
  'node:select': string;

  // ============================================================================
  // NODE LIFECYCLE EVENTS (Future)
  // ============================================================================

  /**
   * Emitted when a new node is created
   * Payload: nodeId and position
   */
  'node:created': { nodeId: string; position: { x: number; y: number } };

  /**
   * Emitted when a node is deleted
   * Payload: nodeId of the deleted node
   */
  'node:deleted': { nodeId: string };

  // ============================================================================
  // NODE EDITING EVENTS (Future - for Tiptap integration)
  // ============================================================================

  /**
   * Emitted when a node enters edit mode (Tiptap editor is loaded)
   * Payload: nodeId
   */
  'node:edit-start': { nodeId: string };

  /**
   * Emitted when a node's title is updated
   * Payload: nodeId and new title HTML
   */
  'node:title-updated': { nodeId: string; title: string };

  /**
   * Emitted when a node's content is updated
   * Payload: nodeId and new content HTML
   */
  'node:content-updated': { nodeId: string; content: string };

  /**
   * Emitted when a node is updated (generic update event)
   * Payload: nodeId and updated fields (title, content, etc.)
   */
  'node:update': { nodeId: string; title?: string; content?: string };

  /**
   * Emitted when a node exits edit mode (Tiptap editor is destroyed)
   * Payload: nodeId
   */
  'node:edit-end': { nodeId: string };

  /**
   * Emitted when a node needs to be resized (e.g., content changed)
   * Payload: nodeId and new dimensions
   */
  'node:resize-requested': { nodeId: string; dimensions: { width: number; height: number } };

  // ============================================================================
  // WRITER PANEL EVENTS
  // ============================================================================

  /**
   * Emitted when the Writer panel updates a node
   * Payload: nodeId
   */
  'writer:node-updated': { nodeId: string };

  /**
   * Emitted when node order changes in Writer panel
   * Payload: array of nodeIds in new order
   */
  'writer:order-changed': { nodeIds: string[] };

  /**
   * Emitted when a node's hierarchy changes in Writer (drag-and-drop)
   * Payload: nodeId, new parentId (null for root), and new order
   */
  'writer:hierarchy-changed': { nodeId: string; newParentId: string | null; newOrder: number };

  /**
   * Emitted when the tree structure is restructured in Writer (drag-and-drop)
   * This triggers a full rebuild of the hierarchy from the modified tree
   */
  'writer:tree-restructured': { draggedNodeIds: string[]; newParentId: string | null };

  /**
   * Emitted when a node is selected in Writer
   * Payload: nodeId (null to deselect), scrollIntoView flag, and source of the selection
   */
  'writer:node-selected': { nodeId: string | null; scrollIntoView: boolean; source: 'writer' | 'canvas' | 'tree' };

  /**
   * Emitted when multiple nodes are selected in Writer
   * Payload: array of nodeIds to select
   */
  'writer:nodes-selected': { nodeIds: string[] };

  /**
   * Emitted when a field should be opened for editing in Writer
   * Payload: nodeId, field type, and cursor position
   */
  'writer:open-field': { nodeId: string; field: 'title' | 'content'; cursorPosition: 'start' | 'end' };
};

/**
 * Global event bus instance
 *
 * Import this in any component that needs to emit or listen to events.
 *
 * @example
 * ```typescript
 * import { eventBus } from '@/composables/useEventBus';
 *
 * // Emit an event
 * eventBus.emit('tree:node-selected', { nodeId: '123' });
 *
 * // Listen to an event
 * eventBus.on('canvas:node-selected', ({ nodeId }) => {
 *   console.log('Node selected:', nodeId);
 * });
 *
 * // Remove listener
 * eventBus.off('canvas:node-selected', handler);
 * ```
 */
export const eventBus: Emitter<MindmapEvents> = mitt<MindmapEvents>();

/**
 * Debug mode: Log all events in development
 *
 * This wildcard listener logs every event that passes through the event bus.
 * Very useful for debugging reactivity issues and understanding event flow.
 *
 * Uncomment the block below to enable event bus logging.
 */
// if (import.meta.env.DEV) {
//   eventBus.on('*', (type, payload) => {
//     console.log(`[Event Bus] ${String(type)}`, payload);
//   });
// }

/**
 * Composable for using the event bus
 *
 * This is optional - you can import eventBus directly.
 * This composable is provided for consistency with Vue composition patterns.
 *
 * @example
 * ```typescript
 * import { useEventBus } from '@/composables/useEventBus';
 *
 * const { emit, on, off } = useEventBus();
 *
 * emit('tree:node-selected', { nodeId: '123' });
 * ```
 */
export function useEventBus() {
  return {
    emit: eventBus.emit.bind(eventBus),
    on: eventBus.on.bind(eventBus),
    off: eventBus.off.bind(eventBus),
  };
}

