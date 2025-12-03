/**
 * Rectangle interface for AABB collision detection
 */
export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Position data for a specific view
 */
export interface ViewPosition {
  x: number;
  y: number;
}

/**
 * Node data structure with hierarchy
 * Supports dual positions for mindmap and concept map views
 */
export interface NodeData {
  id: string;
  label: string;
  parentId: string | null;

  // Legacy position fields (for backward compatibility, will use mindmap position)
  x: number;
  y: number;

  // View-specific positions
  mindmapPosition?: ViewPosition;
  conceptMapPosition?: ViewPosition;

  width: number;
  height: number;
  collapsed?: boolean; // For child nodes: whether children are hidden
  collapsedLeft?: boolean; // For root nodes: whether left children are hidden
  collapsedRight?: boolean; // For root nodes: whether right children are hidden
  isDirty?: boolean; // For lazy calculation: true if position needs recalculation
  lastCalculatedZoom?: number; // Track at which zoom level this node was last calculated
}

/**
 * Bounding rectangle for a node and its children
 */
export interface BoundingRect extends Rectangle {
  nodeId: string;
  padding: number; // Padding around children
}

/**
 * Context menu position
 */
export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  nodeId: string | null;
}

