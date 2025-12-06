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
 * Size data for concept map view (parent nodes resize based on children)
 */
export interface ViewSize {
  width: number;
  height: number;
}

/**
 * Node data structure with hierarchy
 * Supports dual positions for mindmap and concept map views
 */
export interface NodeData {
  id: string;
  label: string;
  parentId: string | null;

  // Active position (used by VueFlow, synced with current view)
  x: number;
  y: number;

  // View-specific positions (null = not yet laid out in that view)
  mindmapPosition?: ViewPosition | null;
  conceptMapPosition?: ViewPosition | null;

  // Mindmap dimensions (fixed based on content)
  width: number;
  height: number;

  // Concept map dimensions (dynamic, expands to fit children)
  conceptMapSize?: ViewSize | null;

  // Measured size from DOM (for auto-sizing leaf nodes)
  measuredSize?: ViewSize | null;

  // Collapse state
  collapsed?: boolean; // For child nodes: whether children are hidden
  collapsedLeft?: boolean; // For root nodes: whether left children are hidden
  collapsedRight?: boolean; // For root nodes: whether right children are hidden

  // Layout calculation flags
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

