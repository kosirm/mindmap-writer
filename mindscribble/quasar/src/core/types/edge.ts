/**
 * Edge type definitions
 * Includes intra-map edges and inter-map links
 */

// ============================================================
// INTRA-MAP EDGES (within a single document)
// ============================================================

/**
 * Edge types within a single map
 */
export type IntraMapEdgeType = 'hierarchy' | 'reference'

/**
 * Edge visual style
 */
export type EdgeStyle = 'straight' | 'bezier' | 'step'

/**
 * Edge data
 */
export interface EdgeData {
  edgeType: IntraMapEdgeType
  label?: string
}

/**
 * Complete edge structure (VueFlow compatible)
 */
export interface MindscribbleEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  type: EdgeStyle
  class?: string                  // 'edge-hierarchy' | 'edge-reference'
  data: EdgeData

  // Serialized format using new property names (for IndexedDB storage)
  serialized?: Record<string, unknown>
}

/**
 * @deprecated Use MindscribbleEdge instead
 * Kept for backward compatibility during migration
 */
export interface MindmapEdge {
  id: string
  source: string
  target: string
  sourceHandle: string
  targetHandle: string
  type: 'straight'
  class: 'edge-hierarchy' | 'edge-reference'
  data: EdgeData
}

// ============================================================
// INTER-MAP LINKS (cross-document references)
// These connect nodes across different documents
// ============================================================

/**
 * Link from a node in this map to another map or specific node
 * These are NOT edges - they're cross-document references
 * Stored in both the source document and the master map index
 */
export interface InterMapLink {
  id: string                      // Unique link ID (UUID)

  // Source (always in this document)
  sourceNodeId: string            // Node ID that has the link

  // Target (another document)
  targetMapId: string             // Google Drive file ID of target map
  targetNodeId?: string           // Optional specific node (null = link to whole map)

  // Metadata
  label?: string                  // Optional user-defined description
  created: number                 // Unix timestamp in milliseconds

  // Cached data (for display without loading target map)
  targetMapName?: string          // Cached name of target map
  targetNodeTitle?: string        // Cached title of target node (if targeting specific node)

  // Serialized format using new property names (for IndexedDB storage)
  serialized?: Record<string, unknown>
}

