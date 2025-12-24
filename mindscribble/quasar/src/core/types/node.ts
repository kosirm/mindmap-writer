/**
 * Node type definitions
 * Enhanced with view-specific data for multi-view support
 */

// ============================================================
// BASIC TYPES
// ============================================================

/**
 * Position in 2D space
 */
export interface Position {
  x: number
  y: number
}

/**
 * Size dimensions
 */
export interface Size {
  width: number
  height: number
}

// ============================================================
// VIEW-SPECIFIC DATA
// Each view can store its own layout/state for each node
// ============================================================

/**
 * Mindmap view-specific data
 * Hierarchical layout with orientation support
 */
export interface MindmapViewData {
  position?: Position | null      // Position in mindmap view
  collapsed?: boolean            // Children hidden
  side?: 'left' | 'right' | null  // Side placement for root nodes
}

/**
 * Concept map view-specific data
 * Children nested inside parent containers
 */
export interface ConceptMapViewData {
  position: Position | null      // Relative to parent (for nested layout)
  size?: Size | null             // Dynamic container size (expands to fit children)
}

/**
 * Timeline view-specific data
 */
export interface TimelineViewData {
  startDate?: string             // ISO 8601
  endDate?: string               // ISO 8601
  lane?: number                  // Which row/swimlane
}

/**
 * Kanban view-specific data
 */
export interface KanbanViewData {
  column?: string                // 'backlog' | 'todo' | 'in-progress' | 'done' | custom
  order?: number                 // Order within column
}

/**
 * Outline view-specific data
 * Tree expansion state for outline view
 */
export interface OutlineViewData {
  expanded?: boolean            // Node is expanded in outline view
}

/**
 * All view-specific data for a node
 * Extensible - add new views as needed
 */
export interface NodeViewData {
  mindmap?: MindmapViewData
  conceptMap?: ConceptMapViewData
  timeline?: TimelineViewData
  kanban?: KanbanViewData
  outline?: OutlineViewData
  // Future views:
  // treemap?: TreemapViewData
  // sunburst?: SunburstViewData
  // circlePack?: CirclePackViewData
}

// ============================================================
// CORE NODE DATA
// ============================================================

/**
 * Core node data (shared across all views)
 */
export interface NodeData {
  // Hierarchy
  parentId: string | null
  order: number                  // Order among siblings

  // Content
  title: string
  content: string                // Rich text HTML content (from Tiptap)

  // Timestamps
  created?: string               // ISO 8601 timestamp
  modified?: string              // ISO 8601 timestamp

  // AI metadata
  aiGenerated?: boolean
  aiPrompt?: string
  aiSuggestions?: string[]

  // Visual (shared across views)
  color?: string
  icon?: string

  // Side placement for mindmap (root nodes only)
  side?: 'left' | 'right' | null
}

/**
 * Complete node structure
 * Compatible with VueFlow
 */
export interface MindscribbleNode {
  id: string
  type: string                   // 'custom' | 'lod-badge' | future types

  // Active position (synced with current view)
  position: Position

  // Core data
  data: NodeData

  // View-specific data
  views: NodeViewData
}

/**
 * @deprecated Use MindscribbleNode instead
 * Kept for backward compatibility during migration
 */
export interface MindmapNode {
  id: string
  type: 'custom' | 'lod-badge'
  position: { x: number; y: number }
  data: NodeData
}

