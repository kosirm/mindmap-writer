import { onUnmounted } from 'vue';
import emitter from '../mitt';
import type { MindmapNode } from '../stores/mindmap';

/**
 * View source types - identifies which view triggered an event
 */
export type ViewSource = 'tree' | 'mindmap' | 'text' | 'full-document' | 'system';

/**
 * Event types for multi-view synchronization
 */
export interface ViewSyncEvents {
  /**
   * Fired when a node is selected in any view
   * Other views should highlight and scroll to this node
   */
  'node-selected': {
    nodeId: string;
    source: ViewSource;
    scrollIntoView?: boolean; // Whether to scroll to the node
  };

  /**
   * Fired when a node receives focus (for editing)
   * Other views should show focus state but not necessarily scroll
   */
  'node-focused': {
    nodeId: string;
    source: ViewSource;
  };

  /**
   * Fired when a node's data is updated
   * All views should refresh to show the latest data
   */
  'node-updated': {
    nodeId: string;
    changes: Partial<MindmapNode>;
    source: ViewSource;
  };

  /**
   * Fired when a new node is created
   * All views should show the new node
   */
  'node-created': {
    node: MindmapNode;
    source: ViewSource;
  };

  /**
   * Fired when a node is deleted
   * All views should remove the node
   */
  'node-deleted': {
    nodeId: string;
    source: ViewSource;
  };

  /**
   * Request to scroll to a specific node
   * Views should scroll the node into view if it exists
   */
  'scroll-to-node': {
    nodeId: string;
    source: ViewSource;
  };

  /**
   * Fired when node hierarchy changes (parent, order, path)
   * All views should refresh their structure
   */
  'hierarchy-changed': {
    nodeId: string;
    source: ViewSource;
  };
}

/**
 * Composable for multi-view synchronization
 * Provides strongly-typed event bus for communication between views
 *
 * Usage:
 * ```typescript
 * const viewSync = useViewSync('mindmap');
 *
 * // Emit events
 * viewSync.selectNode('node-123', true);
 *
 * // Listen to events
 * viewSync.onNodeSelected((event) => {
 *   if (event.source !== 'mindmap') {
 *     // Handle selection from other views
 *     highlightNode(event.nodeId);
 *   }
 * });
 * ```
 */
export function useViewSync(viewSource: ViewSource) {
  /**
   * Emit node selection event
   */
  function selectNode(nodeId: string, scrollIntoView = true) {
    emitter.emit('node-selected', {
      nodeId,
      source: viewSource,
      scrollIntoView,
    });
  }

  /**
   * Emit node focus event
   */
  function focusNode(nodeId: string) {
    emitter.emit('node-focused', {
      nodeId,
      source: viewSource,
    });
  }

  /**
   * Emit node update event
   */
  function updateNode(nodeId: string, changes: Partial<MindmapNode>) {
    emitter.emit('node-updated', {
      nodeId,
      changes,
      source: viewSource,
    });
  }

  /**
   * Emit node creation event
   */
  function createNode(node: MindmapNode) {
    emitter.emit('node-created', {
      node,
      source: viewSource,
    });
  }

  /**
   * Emit node deletion event
   */
  function deleteNode(nodeId: string) {
    emitter.emit('node-deleted', {
      nodeId,
      source: viewSource,
    });
  }

  /**
   * Request scroll to node
   */
  function scrollToNode(nodeId: string) {
    emitter.emit('scroll-to-node', {
      nodeId,
      source: viewSource,
    });
  }

  /**
   * Emit hierarchy change event
   */
  function notifyHierarchyChanged(nodeId: string) {
    emitter.emit('hierarchy-changed', {
      nodeId,
      source: viewSource,
    });
  }

  // Event listeners with automatic cleanup

  /**
   * Listen to node selection events
   */
  function onNodeSelected(
    handler: (event: ViewSyncEvents['node-selected']) => void
  ) {
    emitter.on('node-selected', handler);
    onUnmounted(() => emitter.off('node-selected', handler));
  }

  /**
   * Listen to node focus events
   */
  function onNodeFocused(
    handler: (event: ViewSyncEvents['node-focused']) => void
  ) {
    emitter.on('node-focused', handler);
    onUnmounted(() => emitter.off('node-focused', handler));
  }

  /**
   * Listen to node update events
   */
  function onNodeUpdated(
    handler: (event: ViewSyncEvents['node-updated']) => void
  ) {
    emitter.on('node-updated', handler);
    onUnmounted(() => emitter.off('node-updated', handler));
  }

  /**
   * Listen to node creation events
   */
  function onNodeCreated(
    handler: (event: ViewSyncEvents['node-created']) => void
  ) {
    emitter.on('node-created', handler);
    onUnmounted(() => emitter.off('node-created', handler));
  }

  /**
   * Listen to node deletion events
   */
  function onNodeDeleted(
    handler: (event: ViewSyncEvents['node-deleted']) => void
  ) {
    emitter.on('node-deleted', handler);
    onUnmounted(() => emitter.off('node-deleted', handler));
  }

  /**
   * Listen to scroll-to-node requests
   */
  function onScrollToNode(
    handler: (event: ViewSyncEvents['scroll-to-node']) => void
  ) {
    emitter.on('scroll-to-node', handler);
    onUnmounted(() => emitter.off('scroll-to-node', handler));
  }

  /**
   * Listen to hierarchy change events
   */
  function onHierarchyChanged(
    handler: (event: ViewSyncEvents['hierarchy-changed']) => void
  ) {
    emitter.on('hierarchy-changed', handler);
    onUnmounted(() => emitter.off('hierarchy-changed', handler));
  }

  return {
    // Emit events
    selectNode,
    focusNode,
    updateNode,
    createNode,
    deleteNode,
    scrollToNode,
    notifyHierarchyChanged,

    // Listen to events
    onNodeSelected,
    onNodeFocused,
    onNodeUpdated,
    onNodeCreated,
    onNodeDeleted,
    onScrollToNode,
    onHierarchyChanged,
  };
}

