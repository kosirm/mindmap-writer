/**
 * Edge type definitions
 */

export interface EdgeData {
  edgeType: 'hierarchy' | 'reference'
  label?: string
}

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

