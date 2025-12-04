/**
 * Master Map type definitions
 * For cross-document connections and the master map visualization
 *
 * The master map shows all documents (maps) and their interconnections.
 * It is stored in Google Drive as _mindscribble_master.json and cached in IndexedDB.
 */

import type { Position } from './node'
import type { InterMapLink } from './edge'

// ============================================================
// MASTER MAP NODE TYPES
// Two types of entities in master map visualization: maps and nodes
// ============================================================

/**
 * Master map can represent two types of entities
 */
export type MasterMapNodeType = 'map' | 'node'

/**
 * Base properties for master map visualization
 */
interface MasterMapNodeBase {
  id: string                      // Unique ID in master map context
  position?: Position             // D3 force-directed position

  // Visual state
  expanded?: boolean              // For maps: show linked nodes
  pinned?: boolean                // User pinned position (won't move in force simulation)
}

/**
 * Map entry in master map
 * Represents a whole document
 */
export interface MasterMapMapEntry extends MasterMapNodeBase {
  type: 'map'

  // Map identification
  mapId: string                   // Google Drive file ID
  mapName: string
  folderPath?: string             // e.g., "MindScribble/Ideas"
  description?: string

  // Metadata
  modified: string                // Last modified timestamp (ISO 8601)
  nodeCount: number
  tags: string[]

  // Cached for display
  rootNodeTitles: string[]        // Titles of root nodes (preview)

  // Statistics (computed from links)
  incomingLinkCount: number       // Links pointing TO this map
  outgoingLinkCount: number       // Links FROM this map
}

/**
 * Node entry in master map
 * Represents a specific node that is a link target
 */
export interface MasterMapNodeEntry extends MasterMapNodeBase {
  type: 'node'

  // Node identification
  nodeId: string                  // Node ID within parent map
  nodeTitle: string               // Cached node title

  // Parent map reference
  parentMapId: string             // Google Drive file ID of containing map
  parentMapName: string           // Cached map name

  // Statistics
  incomingLinkCount: number       // How many links point to this node
}

/**
 * Union type for master map visualization nodes
 */
export type MasterMapNode = MasterMapMapEntry | MasterMapNodeEntry

// ============================================================
// MASTER MAP LINK (reusing InterMapLink from edge.ts)
// Extended with cached source info for visualization
// ============================================================

/**
 * Link in master map with full cached info for visualization
 */
export interface MasterMapLink extends InterMapLink {
  // Additional source info (InterMapLink only has sourceNodeId)
  sourceMapId: string             // Google Drive file ID of source map
  sourceMapName: string           // Cached map name
  sourceNodeTitle: string         // Cached node title
}

// ============================================================
// MASTER MAP DOCUMENT (stored in Google Drive)
// ============================================================

/**
 * Master map document - stored as _mindscribble_master.json
 * This is the SOURCE OF TRUTH for all inter-map connections
 */
export interface MasterMapDocument {
  version: string                 // Schema version "1.0"

  // Document metadata
  metadata: {
    created: string               // ISO 8601
    modified: string              // ISO 8601
    lastSyncedDevice?: string     // Device identifier for conflict resolution
  }

  // ⭐ THE IMPORTANT DATA: All inter-map links
  links: MasterMapLink[]

  // Cached map registry (for quick lookup without scanning all files)
  mapRegistry: MasterMapMapEntry[]

  // Linked nodes (nodes that are link targets - not ALL nodes)
  linkedNodes: MasterMapNodeEntry[]

  // Master map visualization state (user preference)
  visualization?: {
    nodePositions: Record<string, Position>  // nodeId → position
    expandedMaps: string[]                   // mapIds that are expanded
    zoom: number
    panX: number
    panY: number
  }

  // User preferences for master map
  preferences?: {
    defaultLayout: 'force' | 'hierarchical' | 'radial'
    showOrphanMaps: boolean       // Maps with no links
    groupByFolder: boolean        // Group maps by Google Drive folder
  }
}

// ============================================================
// TYPE GUARDS
// ============================================================

/**
 * Type guard for map entries
 */
export function isMasterMapMap(node: MasterMapNode): node is MasterMapMapEntry {
  return node.type === 'map'
}

/**
 * Type guard for node entries
 */
export function isMasterMapNode(node: MasterMapNode): node is MasterMapNodeEntry {
  return node.type === 'node'
}

