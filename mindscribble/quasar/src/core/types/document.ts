/**
 * Document type definitions
 * Enhanced for multi-view support and inter-map links
 */

import type { MindpadNode, MindmapNode } from './node'
import type { MindpadEdge, MindmapEdge, InterMapLink } from './edge'
import type { ViewType } from './view'

// ============================================================
// SUBSCRIPTION & USER
// ============================================================

export type SubscriptionPlan = 'free' | 'basic' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'trial';

export interface Subscription {
  userId: string;
  email: string;
  currentPlan: SubscriptionPlan;
  planLevel: number;
  status: SubscriptionStatus;
  expires: number; // timestamp
  previousPlans: Array<{
    plan: SubscriptionPlan;
    startDate: number;
    endDate: number;
  }>;
}

// ============================================================
// ORIENTATION & LAYOUT
// ============================================================

/**
 * Orientation mode for mindmap layout
 * Determines how children are ordered around the root
 *
 * Clockwise:      Counter-Clockwise (anticlockwise):
 * | 6 |      | 1 |   | 1 |      | 6 |
 * | 5 | root | 2 |   | 2 | root | 5 |
 * | 4 |      | 3 |   | 3 |      | 4 |
 *
 * LeftRight:      RightLeft:
 * | 1 |      | 4 |   | 4 |      | 1 |
 * | 2 | root | 5 |   | 5 | root | 2 |
 * | 3 |      | 6 |   | 6 |      | 3 |
 */
export type OrientationMode = 'clockwise' | 'counter-clockwise' | 'anticlockwise' | 'left-right' | 'right-left'

// ============================================================
// AI CONTEXT
// ============================================================

export interface AIContext {
  topic?: string
  purpose?: string
  audience?: string
  lastAIAction?: string
  conversationHistory?: Array<{
    role: 'user' | 'ai'
    content: string
    timestamp: string
  }>
}

// ============================================================
// DOCUMENT METADATA
// ============================================================

export interface DocumentMetadata {
  id: string                      // Google Drive file ID (or local UUID before sync)
  name: string
  description?: string
  created: number                 // Unix timestamp in milliseconds
  modified: number                // Unix timestamp in milliseconds
  tags: string[]
  aiContext?: AIContext

  // Search optimization
  searchableText: string          // All titles + content concatenated

  // Statistics
  nodeCount: number
  edgeCount: number
  maxDepth: number

  // NEW: Multi-provider support (Phase 2 ready)
  providers?: DocumentProviders;

  // DEPRECATED: Keep for backward compatibility with existing documents
  // Will be migrated to providers.googleDrive.fileId
  driveFileId?: string;

  // Vault association for IndexedDB storage
  vaultId?: string;
}

/**
 * Provider-specific metadata for multi-backend support
 *
 * Phase 1: Only googleDrive is used
 * Phase 2: Add github, dropbox, localFileSystem, etc.
 */
export interface DocumentProviders {
  googleDrive?: {
    fileId: string;
    folderId: string;
    webViewLink?: string;
    sharedDriveId?: string;
  };
  github?: {
    owner: string;
    repo: string;
    branch: string;
    path: string;
    sha?: string;
    commitHash?: string;
  };
  dropbox?: {
    path: string;
    id: string;
    rev?: string;
  };
  localFileSystem?: {
    path: string;
    absolutePath: string;
  };
  // Add more providers as needed
}

// ============================================================
// LAYOUT SETTINGS
// ============================================================

export interface LayoutSettings {
  // Current active view
  activeView: ViewType

  // Mindmap settings
  orientationMode: OrientationMode
  lodEnabled: boolean
  lodThresholds: number[]         // [10, 30, 50, 70, 90]
  horizontalSpacing: number
  verticalSpacing: number

  // View-specific settings can be added here
  // conceptMapSettings?: { ... }
  // timelineSettings?: { ... }
  // kanbanSettings?: { ... }
}

// ============================================================
// DOCUMENT STRUCTURE
// ============================================================

/**
 * Complete document structure
 * This is what gets saved to Google Drive as .mindpad file
 */
export interface MindpadDocument {
  version: string                 // Schema version "1.0"
  metadata: DocumentMetadata
  nodes: MindpadNode[]
  edges: MindpadEdge[]
  interMapLinks: InterMapLink[]   // Links to other maps/nodes
  layout: LayoutSettings
  dockviewLayout?: unknown        // Child dockview layout state (optional for backward compatibility)
  dockviewLayoutId?: string       // Unique ID for localStorage key (optional for backward compatibility)

  // Serialized format using new property names (for IndexedDB storage)
  serialized?: Record<string, unknown>
}

/**
 * Serialized document format using new property naming system
 * This is the optimized format for IndexedDB storage
 */
export interface SerializedDocument {
  [key: string]: unknown
  nodes: SerializedNode[]
  edges: SerializedEdge[]
  interMapLinks: SerializedInterMapLink[]
}

/**
 * Serialized node using new property names
 */
export interface SerializedNode {
  [key: string]: unknown
}

/**
 * Serialized edge using new property names
 */
export interface SerializedEdge {
  [key: string]: unknown
}

/**
 * Serialized inter-map link using new property names
 */
export interface SerializedInterMapLink {
  [key: string]: unknown
}

/**
 * @deprecated Use MindpadDocument instead
 * Kept for backward compatibility during migration
 */
export interface MindmapDocument {
  version: string                 // "1.0"
  metadata: DocumentMetadata
  nodes: MindmapNode[]
  edges: MindmapEdge[]
  layout: Omit<LayoutSettings, 'activeView'>
}

