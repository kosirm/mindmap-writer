/**
 * Event bus for cross-feature communication
 * Uses mitt for type-safe event handling
 */

import mitt from 'mitt'

// Event type definitions
export type Events = {
  // Canvas events
  'canvas:node-selected': { nodeId: string | null }
  'canvas:nodes-selected': { nodeIds: string[] }
  'canvas:viewport-changed': { x: number; y: number; zoom: number }
  'canvas:node-created': { nodeId: string; parentId: string | null }
  'canvas:node-deleted': { nodeId: string }
  'canvas:node-moved': { nodeId: string; x: number; y: number }

  // Writer events
  'writer:hierarchy-changed': { nodeId: string; newParentId: string | null }
  'writer:content-changed': { nodeId: string; content: string }
  'writer:title-changed': { nodeId: string; title: string }

  // Tree events
  'tree:node-selected': { nodeId: string }
  'tree:node-expanded': { nodeId: string }
  'tree:node-collapsed': { nodeId: string }

  // AI events
  'ai:operations-applied': { operations: unknown[]; nodeIds: string[] }
  'ai:processing-started': void
  'ai:processing-completed': void

  // Document events
  'document:loaded': { fileId: string }
  'document:saved': { fileId: string }
  'document:dirty': void
  'document:clean': void

  // Panel events
  'panel:collapsed': { position: 'left' | 'center' | 'right' }
  'panel:expanded': { position: 'left' | 'center' | 'right' }
  'panel:view-changed': { position: 'left' | 'center' | 'right'; viewType: string }
  'panel:resize': { position: 'left' | 'right'; width: number }

  // Keyboard events
  'keyboard:shortcut': { shortcut: string; context: string }
}

// Create and export the event bus
export const eventBus = mitt<Events>()

// Helper composable for using the event bus
export function useEventBus() {
  return eventBus
}

