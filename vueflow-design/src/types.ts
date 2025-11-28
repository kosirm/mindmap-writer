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
 * Node data structure with hierarchy
 */
export interface NodeData {
  id: string;
  label: string;
  parentId: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  collapsed?: boolean; // For child nodes: whether children are hidden
  collapsedLeft?: boolean; // For root nodes: whether left children are hidden
  collapsedRight?: boolean; // For root nodes: whether right children are hidden
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

