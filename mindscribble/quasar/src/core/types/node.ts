/**
 * Node type definitions
 */

export interface NodeData {
  // Hierarchy
  parentId: string | null
  order: number

  // Content
  title: string
  content: string // Rich text HTML content (from Tiptap)

  // Metadata
  created?: string // ISO 8601 timestamp
  modified?: string // ISO 8601 timestamp

  // AI metadata
  aiGenerated?: boolean
  aiPrompt?: string
  aiSuggestions?: string[]

  // Layout
  collapsed?: boolean
  collapsedLeft?: boolean
  collapsedRight?: boolean
  isDirty?: boolean
  lastCalculatedZoom?: number

  // Visual
  color?: string
  icon?: string
}

export interface MindmapNode {
  id: string
  type: 'custom' | 'lod-badge'
  position: { x: number; y: number }
  data: NodeData
}

