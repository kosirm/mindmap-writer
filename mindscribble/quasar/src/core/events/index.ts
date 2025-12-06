/**
 * Event Bus for Store-Centric View Synchronization
 *
 * Architecture:
 * ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
 * │ Outline View│    │Mindmap View │    │ Writer View │
 * └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
 *        │                  │                  │
 *        │   User Action    │                  │
 *        ▼                  ▼                  ▼
 * ┌─────────────────────────────────────────────────────┐
 * │                 Document Store                       │
 * │  • Single source of truth                           │
 * │  • Methods update state + emit events               │
 * └──────────────────────┬──────────────────────────────┘
 *                        │
 *                        │ emit('store:*', { ..., source })
 *                        ▼
 * ┌─────────────────────────────────────────────────────┐
 * │                   Event Bus                          │
 * │  • Notifies all views of store changes              │
 * │  • Source tracking prevents circular updates         │
 * └──────────────────────┬──────────────────────────────┘
 *                        │
 *        ┌───────────────┼───────────────┐
 *        ▼               ▼               ▼
 * ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
 * │ Outline View│  │Mindmap View │  │ Writer View │
 * │ (if source  │  │ (if source  │  │ (if source  │
 * │  != outline)│  │  != mindmap)│  │  != writer) │
 * └─────────────┘  └─────────────┘  └─────────────┘
 *
 * Key principle: Store emits events, views react (except source)
 */

import mitt, { type Handler } from 'mitt'
import { onBeforeUnmount } from 'vue'
import type { ViewType, Position } from '../types'

// ============================================================
// EVENT SOURCE TYPES
// ============================================================

/**
 * Source identifier for events
 * Used to prevent circular updates - views ignore events they triggered
 */
export type EventSource =
  | ViewType           // View types: 'mindmap', 'concept-map', 'outline', etc.
  | 'store'            // Direct store manipulation (e.g., from API)
  | 'keyboard'         // Keyboard shortcuts
  | 'command'          // Command palette
  | 'api'              // External API calls
  | 'undo-redo'        // Undo/redo system

// ============================================================
// STORE EVENT PAYLOADS
// ============================================================

/** Base payload with source tracking */
interface BasePayload {
  source: EventSource
}

/** Node selection changed */
export interface NodeSelectedPayload extends BasePayload {
  nodeId: string | null
  /** Whether to scroll/pan to the node */
  scrollIntoView?: boolean
}

/** Multiple nodes selected */
export interface NodesSelectedPayload extends BasePayload {
  nodeIds: string[]
}

/** Node created */
export interface NodeCreatedPayload extends BasePayload {
  nodeId: string
  parentId: string | null
  position: Position
}

/** Node deleted */
export interface NodeDeletedPayload extends BasePayload {
  nodeId: string
  /** IDs of all deleted nodes (including descendants) */
  deletedIds: string[]
}

/** Node data updated (title, content, etc.) */
export interface NodeUpdatedPayload extends BasePayload {
  nodeId: string
  changes: {
    title?: string
    content?: string
    [key: string]: unknown
  }
}

/** Node position changed */
export interface NodeMovedPayload extends BasePayload {
  nodeId: string
  position: Position
  /** Previous position for undo */
  previousPosition?: Position
}

/** Node hierarchy changed (reparented) */
export interface NodeReparentedPayload extends BasePayload {
  nodeId: string
  oldParentId: string | null
  newParentId: string | null
  newOrder: number
}

/** Siblings reordered (within same parent) */
export interface SiblingsReorderedPayload extends BasePayload {
  parentId: string | null
  /** Map of nodeId -> new order */
  newOrders: Map<string, number>
}

// ============================================================
// EDGE EVENT PAYLOADS
// ============================================================

/** Edge created (reference edge between nodes) */
export interface EdgeCreatedPayload extends BasePayload {
  edgeId: string
  sourceId: string
  targetId: string
  edgeType: 'hierarchy' | 'reference'
}

/** Edge deleted */
export interface EdgeDeletedPayload extends BasePayload {
  edgeId: string
}

/** View switched */
export interface ViewChangedPayload extends BasePayload {
  previousView: ViewType
  newView: ViewType
  /** Whether positions were loaded (false = needs layout) */
  positionsLoaded: boolean
}

/** Document loaded from file */
export interface DocumentLoadedPayload extends BasePayload {
  documentId: string
  documentName: string
}

/** Document saved */
export interface DocumentSavedPayload extends BasePayload {
  documentId: string
}

// ============================================================
// UI EVENT PAYLOADS (non-store)
// ============================================================

/** Viewport changed (pan/zoom) */
export interface ViewportChangedPayload extends BasePayload {
  x: number
  y: number
  zoom: number
}

/** Panel collapsed/expanded */
export interface PanelToggledPayload {
  position: 'left' | 'center' | 'right'
  collapsed: boolean
}

/** Panel view changed */
export interface PanelViewChangedPayload {
  position: 'left' | 'center' | 'right'
  viewType: ViewType
}

/** Node edit mode */
export interface NodeEditPayload extends BasePayload {
  nodeId: string
  field: 'title' | 'content'
}

// ============================================================
// EVENT TYPE DEFINITIONS
// ============================================================

export type StoreEvents = {
  // Selection events
  'store:node-selected': NodeSelectedPayload
  'store:nodes-selected': NodesSelectedPayload

  // Node lifecycle events
  'store:node-created': NodeCreatedPayload
  'store:node-deleted': NodeDeletedPayload
  'store:node-updated': NodeUpdatedPayload
  'store:node-moved': NodeMovedPayload
  'store:node-reparented': NodeReparentedPayload
  'store:siblings-reordered': SiblingsReorderedPayload

  // Edge lifecycle events
  'store:edge-created': EdgeCreatedPayload
  'store:edge-deleted': EdgeDeletedPayload

  // View events
  'store:view-changed': ViewChangedPayload

  // Document events
  'store:document-loaded': DocumentLoadedPayload
  'store:document-saved': DocumentSavedPayload
  'store:document-dirty': BasePayload
  'store:document-cleared': BasePayload
}

export type UIEvents = {
  // Viewport
  'ui:viewport-changed': ViewportChangedPayload

  // Panel events
  'ui:panel-toggled': PanelToggledPayload
  'ui:panel-view-changed': PanelViewChangedPayload

  // Edit mode
  'ui:node-edit-start': NodeEditPayload
  'ui:node-edit-end': NodeEditPayload

  // Keyboard
  'ui:keyboard-shortcut': { shortcut: string; context: string }
}

/** All events */
export type Events = StoreEvents & UIEvents

// ============================================================
// EVENT BUS INSTANCE
// ============================================================

export const eventBus = mitt<Events>()

// ============================================================
// DEBUG LOGGING (Development only)
// ============================================================

if (import.meta.env.DEV) {
  eventBus.on('*', (type, payload) => {
    console.log(
      `%c[EventBus] ${String(type)}`,
      'color: #4CAF50; font-weight: bold',
      payload
    )
  })
}

// ============================================================
// COMPOSABLES
// ============================================================

/**
 * Basic event bus access
 */
export function useEventBus() {
  return eventBus
}

/**
 * View-aware event subscription with auto-cleanup
 *
 * This composable:
 * 1. Automatically ignores events from the same source (prevents circular updates)
 * 2. Automatically cleans up listeners on component unmount
 * 3. Provides type-safe event handling
 *
 * @param viewSource - The view using this composable (e.g., 'mindmap', 'outline')
 *
 * @example
 * ```typescript
 * const { onStoreEvent, emit } = useViewEvents('mindmap')
 *
 * // Listen to selection changes (ignores if source === 'mindmap')
 * onStoreEvent('store:node-selected', ({ nodeId, scrollIntoView }) => {
 *   selectNodeInCanvas(nodeId)
 *   if (scrollIntoView) panToNode(nodeId)
 * })
 *
 * // Emit when user selects in this view
 * function handleNodeClick(nodeId: string) {
 *   documentStore.selectNode(nodeId, 'mindmap')
 * }
 * ```
 */
export function useViewEvents(viewSource: EventSource) {
  const handlers: Array<{ event: keyof Events; handler: Handler<Events[keyof Events]> }> = []

  /**
   * Subscribe to a store event, automatically ignoring events from same source
   */
  function onStoreEvent<K extends keyof StoreEvents>(
    event: K,
    handler: (payload: StoreEvents[K]) => void
  ) {
    const wrappedHandler = (payload: StoreEvents[K]) => {
      // Ignore events from the same source to prevent circular updates
      if (payload.source === viewSource) {
        return
      }
      handler(payload)
    }

    eventBus.on(event, wrappedHandler as Handler<Events[keyof Events]>)
    handlers.push({ event, handler: wrappedHandler as Handler<Events[keyof Events]> })
  }

  /**
   * Subscribe to a UI event (no source filtering)
   */
  function onUIEvent<K extends keyof UIEvents>(
    event: K,
    handler: (payload: UIEvents[K]) => void
  ) {
    eventBus.on(event, handler as Handler<Events[keyof Events]>)
    handlers.push({ event, handler: handler as Handler<Events[keyof Events]> })
  }

  /**
   * Emit a UI event with this view as source
   */
  function emitUI<K extends keyof UIEvents>(event: K, payload: Omit<UIEvents[K], 'source'>) {
    const fullPayload = { ...payload, source: viewSource } as UIEvents[K]
    eventBus.emit(event as keyof Events, fullPayload as Events[keyof Events])
  }

  /**
   * Clean up all registered handlers
   * Called automatically on component unmount
   */
  function cleanup() {
    for (const { event, handler } of handlers) {
      eventBus.off(event, handler)
    }
    handlers.length = 0
  }

  // Auto-cleanup on unmount
  onBeforeUnmount(cleanup)

  return {
    onStoreEvent,
    onUIEvent,
    emitUI,
    cleanup,
    /** The source identifier for this view */
    source: viewSource
  }
}

