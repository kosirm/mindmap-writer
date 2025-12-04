/**
 * Document type definitions
 */

import type { MindmapNode } from './node'
import type { MindmapEdge } from './edge'

export type OrientationMode = 'clockwise' | 'anticlockwise' | 'left-right' | 'right-left'

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

export interface DocumentMetadata {
  id: string // Google Drive file ID
  name: string
  description?: string
  created: string // ISO 8601 timestamp
  modified: string // ISO 8601 timestamp
  tags: string[]
  aiContext?: AIContext
  searchableText: string
  nodeCount: number
  edgeCount: number
  maxDepth: number
}

export interface LayoutSettings {
  orientationMode: OrientationMode
  lodEnabled: boolean
  lodThresholds: number[]
  horizontalSpacing: number
  verticalSpacing: number
}

export interface MindmapDocument {
  version: string // "1.0"
  metadata: DocumentMetadata
  nodes: MindmapNode[]
  edges: MindmapEdge[]
  layout: LayoutSettings
}

