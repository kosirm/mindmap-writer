/**
 * Property Serialization Utilities
 * Convert between standard property names and optimized short property names
 */

import { PROP, PROP_REVERSE } from '../constants/propertyNames'
import type { PropertyName } from '../constants/propertyNames'
import { validateNode, validateEdge, validateDocument } from './propertyValidation'

/**
 * Serialization options for controlling validation and error handling
 */
export interface SerializationOptions {
  /** Throw errors instead of warnings for validation failures (default: false) */
  strict?: boolean
  /**
   * Run validation checks on serialized data
   * Default: true in development (import.meta.env.DEV), false in production
   * Set explicitly to override the default behavior
   */
  validate?: boolean
}

/**
 * Get default validation setting based on environment
 * Development: validation enabled for early error detection
 * Production: validation disabled for maximum performance
 */
function shouldValidate(explicitValidate?: boolean): boolean {
  // If explicitly set, use that value
  if (explicitValidate !== undefined) {
    return explicitValidate
  }
  // Otherwise, validate only in development
  return import.meta.env.DEV
}

// Create optimized lookup map at module initialization (O(1) instead of O(n))
// Maps standard property names to short property names
const STANDARD_TO_SHORT: Record<string, string> = Object.entries(PROP).reduce(
  (acc, [key, value]) => {
    acc[key] = value
    return acc
  },
  {} as Record<string, string>
)

/**
 * Serialize an object using short property names
 * Converts standard property names to optimized short names
 */
export function serializeProperties(obj: Record<string, unknown>): Partial<Record<PropertyName, unknown>> {
  const result: Partial<Record<PropertyName, unknown>> = {}

  for (const [key, value] of Object.entries(obj)) {
    // Find the short property name for this key
    const shortName = getShortPropertyName(key)
    if (shortName) {
      result[shortName as PropertyName] = value
    } else {
      // If no mapping found, keep original key (for debugging)
      console.warn(`No property mapping found for: ${key}`)
      result[key as PropertyName] = value
    }
  }

  return result
}

/**
 * Deserialize an object using standard property names
 * Converts optimized short property names back to standard names
 */
export function deserializeProperties(obj: Partial<Record<PropertyName, unknown>>): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [shortKey, value] of Object.entries(obj)) {
    // Find the standard property name for this short key
    const standardName = getStandardPropertyName(shortKey as PropertyName)
    if (standardName) {
      result[standardName] = value
    } else {
      // If no mapping found, keep original short key (for debugging)
      console.warn(`No reverse property mapping found for: ${shortKey}`)
      result[shortKey] = value
    }
  }

  return result
}

/**
 * Get the short property name for a standard property name
 * Optimized with O(1) lookup using pre-built map
 */
export function getShortPropertyName(standardName: string): string | null {
  return STANDARD_TO_SHORT[standardName] || null
}

/**
 * Get the standard property name for a short property name
 * O(1) lookup using PROP_REVERSE
 */
export function getStandardPropertyName(shortName: PropertyName): string | null {
  return PROP_REVERSE[shortName] || null
}

/**
 * Serialize a node object using short property names
 */
export function serializeNode(
  node: Record<string, unknown>,
  options: SerializationOptions = {}
): Partial<Record<PropertyName, unknown>> {
  const { strict = false } = options
  const validate = shouldValidate(options.validate)

  const serialized: Partial<Record<PropertyName, unknown>> = {
    [PROP.NODE_ID]: (node as { id?: unknown }).id,
    [PROP.NODE_TYPE]: (node as { type?: unknown }).type,
    [PROP.NODE_POSITION_X]: (node as { position?: { x?: unknown } }).position?.x || 0,
    [PROP.NODE_POSITION_Y]: (node as { position?: { y?: unknown } }).position?.y || 0
  }

  // Serialize node data
  if ((node as { data?: unknown }).data) {
    const data = (node as { data: Record<string, unknown> }).data
    serialized[PROP.NODE_PARENT_ID] = data.parentId || null
    serialized[PROP.NODE_ORDER] = data.order || 0
    serialized[PROP.NODE_TITLE] = data.title || ''
    serialized[PROP.NODE_CONTENT] = data.content || ''
    serialized[PROP.NODE_CREATED] = data.created
    serialized[PROP.NODE_MODIFIED] = data.modified

    // Optional properties
    if (data.color) serialized[PROP.NODE_COLOR] = data.color
    if (data.icon) serialized[PROP.NODE_ICON] = data.icon
    if (data.aiGenerated) serialized[PROP.NODE_AI_GENERATED] = data.aiGenerated
    if (data.aiPrompt) serialized[PROP.NODE_AI_PROMPT] = data.aiPrompt
    if (data.aiSuggestions) serialized[PROP.NODE_AI_SUGGESTIONS] = data.aiSuggestions
    if (data.side) serialized[PROP.NODE_VIEW_SIDE] = data.side
  }

  // Serialize views
  if ((node as { views?: unknown }).views) {
    const views = (node as { views: Record<string, unknown> }).views
    if ((views as { mindmap?: { collapsed?: unknown } }).mindmap?.collapsed) {
      serialized[PROP.NODE_VIEW_COLLAPSED] = (views as { mindmap: { collapsed: unknown } }).mindmap.collapsed
    }
    if ((views as { outline?: { expanded?: unknown } }).outline?.expanded) {
      serialized[PROP.NODE_VIEW_EXPANDED] = (views as { outline: { expanded: unknown } }).outline.expanded
    }
  }

  // Validate if requested
  if (validate && !validateNode(serialized)) {
    const nodeId = serialized[PROP.NODE_ID]
    const message = `Node validation failed for node: ${typeof nodeId === 'string' ? nodeId : 'unknown'}`
    if (strict) {
      throw new Error(message)
    }
    console.warn(message, node)
  }

  return serialized
}

/**
 * Deserialize a node object using standard property names
 */
export function deserializeNode(serialized: Partial<Record<PropertyName, unknown>>): Record<string, unknown> {
  const node: Record<string, unknown> = {
    id: serialized[PROP.NODE_ID] || '',
    type: serialized[PROP.NODE_TYPE] || 'custom',
    position: {
      x: serialized[PROP.NODE_POSITION_X] || 0,
      y: serialized[PROP.NODE_POSITION_Y] || 0
    },
    data: {
      parentId: serialized[PROP.NODE_PARENT_ID] || null,
      order: serialized[PROP.NODE_ORDER] || 0,
      title: serialized[PROP.NODE_TITLE] || '',
      content: serialized[PROP.NODE_CONTENT] || '',
      created: serialized[PROP.NODE_CREATED],
      modified: serialized[PROP.NODE_MODIFIED]
    },
    views: {}
  }

  // Deserialize optional properties
  if (serialized[PROP.NODE_COLOR]) (node.data as Record<string, unknown>).color = serialized[PROP.NODE_COLOR]
  if (serialized[PROP.NODE_ICON]) (node.data as Record<string, unknown>).icon = serialized[PROP.NODE_ICON]
  if (serialized[PROP.NODE_AI_GENERATED]) (node.data as Record<string, unknown>).aiGenerated = serialized[PROP.NODE_AI_GENERATED]
  if (serialized[PROP.NODE_AI_PROMPT]) (node.data as Record<string, unknown>).aiPrompt = serialized[PROP.NODE_AI_PROMPT]
  if (serialized[PROP.NODE_AI_SUGGESTIONS]) (node.data as Record<string, unknown>).aiSuggestions = serialized[PROP.NODE_AI_SUGGESTIONS]
  if (serialized[PROP.NODE_VIEW_SIDE]) (node.data as Record<string, unknown>).side = serialized[PROP.NODE_VIEW_SIDE]

  // Deserialize view properties
  if (serialized[PROP.NODE_VIEW_COLLAPSED]) {
    (node.views as Record<string, unknown>).mindmap = { collapsed: serialized[PROP.NODE_VIEW_COLLAPSED] }
  }
  if (serialized[PROP.NODE_VIEW_EXPANDED]) {
    (node.views as Record<string, unknown>).outline = { expanded: serialized[PROP.NODE_VIEW_EXPANDED] }
  }

  return node
}

/**
 * Serialize an edge object using short property names
 */
export function serializeEdge(
  edge: Record<string, unknown>,
  options: SerializationOptions = {}
): Partial<Record<PropertyName, unknown>> {
  const { strict = false } = options
  const validate = shouldValidate(options.validate)

  const serialized: Partial<Record<PropertyName, unknown>> = {
    [PROP.EDGE_ID]: (edge as { id?: unknown }).id,
    [PROP.EDGE_SOURCE]: (edge as { source?: unknown }).source,
    [PROP.EDGE_TARGET]: (edge as { target?: unknown }).target,
    [PROP.EDGE_TYPE]: (edge as { data?: { edgeType?: unknown } }).data?.edgeType || 'hierarchy'
  }

  // Optional properties
  if ((edge as { sourceHandle?: unknown }).sourceHandle) serialized[PROP.EDGE_SOURCE_HANDLE] = (edge as { sourceHandle: unknown }).sourceHandle
  if ((edge as { targetHandle?: unknown }).targetHandle) serialized[PROP.EDGE_TARGET_HANDLE] = (edge as { targetHandle: unknown }).targetHandle
  if ((edge as { type?: unknown }).type) serialized[PROP.EDGE_STYLE] = (edge as { type: unknown }).type
  if ((edge as { class?: unknown }).class) serialized[PROP.EDGE_CLASS] = (edge as { class: unknown }).class
  if ((edge as { data?: { label?: unknown } }).data?.label) serialized[PROP.EDGE_LABEL] = (edge as { data: { label: unknown } }).data.label
  if ((edge as { data?: { created?: unknown } }).data?.created) serialized[PROP.EDGE_CREATED] = (edge as { data: { created: unknown } }).data.created
  if ((edge as { data?: { modified?: unknown } }).data?.modified) serialized[PROP.EDGE_MODIFIED] = (edge as { data: { modified: unknown } }).data.modified

  // Validate if requested
  if (validate && !validateEdge(serialized)) {
    const edgeId = serialized[PROP.EDGE_ID]
    const message = `Edge validation failed for edge: ${typeof edgeId === 'string' ? edgeId : 'unknown'}`
    if (strict) {
      throw new Error(message)
    }
    console.warn(message, edge)
  }

  return serialized
}

/**
 * Deserialize an edge object using standard property names
 */
export function deserializeEdge(serialized: Partial<Record<PropertyName, unknown>>): Record<string, unknown> {
  const edge: Record<string, unknown> = {
    id: serialized[PROP.EDGE_ID] || '',
    source: serialized[PROP.EDGE_SOURCE] || '',
    target: serialized[PROP.EDGE_TARGET] || '',
    data: {
      edgeType: serialized[PROP.EDGE_TYPE] || 'hierarchy'
    }
  }

  // Deserialize optional properties
  if (serialized[PROP.EDGE_SOURCE_HANDLE]) edge.sourceHandle = serialized[PROP.EDGE_SOURCE_HANDLE]
  if (serialized[PROP.EDGE_TARGET_HANDLE]) edge.targetHandle = serialized[PROP.EDGE_TARGET_HANDLE]
  if (serialized[PROP.EDGE_STYLE]) edge.type = serialized[PROP.EDGE_STYLE]
  if (serialized[PROP.EDGE_CLASS]) edge.class = serialized[PROP.EDGE_CLASS]
  if (serialized[PROP.EDGE_LABEL]) (edge.data as Record<string, unknown>).label = serialized[PROP.EDGE_LABEL]
  if (serialized[PROP.EDGE_CREATED]) (edge.data as Record<string, unknown>).created = serialized[PROP.EDGE_CREATED]
  if (serialized[PROP.EDGE_MODIFIED]) (edge.data as Record<string, unknown>).modified = serialized[PROP.EDGE_MODIFIED]

  return edge
}

/**
 * Serialize a document using short property names
 */
export function serializeDocument(
  document: Record<string, unknown>,
  options: SerializationOptions = {}
): Partial<Record<PropertyName, unknown>> & {
  nodes: Partial<Record<PropertyName, unknown>>[],
  edges: Partial<Record<PropertyName, unknown>>[],
  interMapLinks: Partial<Record<PropertyName, unknown>>[]
} {
  const { strict = false } = options
  const validate = shouldValidate(options.validate)

  const serialized: Partial<Record<PropertyName, unknown>> = {
    [PROP.MAP_VERSION]: (document as { version?: unknown }).version || '1.0',
    [PROP.MAP_ID]: (document as { metadata?: { id?: unknown } }).metadata?.id || '',
    [PROP.MAP_NAME]: (document as { metadata?: { name?: unknown } }).metadata?.name || 'Untitled',
    [PROP.MAP_CREATED]: (document as { metadata?: { created?: unknown } }).metadata?.created,
    [PROP.MAP_MODIFIED]: (document as { metadata?: { modified?: unknown } }).metadata?.modified
  }

  // Optional metadata
  if ((document as { metadata?: { description?: unknown } }).metadata?.description) {
    serialized[PROP.MAP_DESCRIPTION] = (document as { metadata: { description: unknown } }).metadata.description
  }
  if ((document as { metadata?: { tags?: unknown } }).metadata?.tags) {
    serialized[PROP.MAP_TAGS] = (document as { metadata: { tags: unknown } }).metadata.tags
  }
  if ((document as { metadata?: { searchableText?: unknown } }).metadata?.searchableText) {
    serialized[PROP.MAP_SEARCHABLE_TEXT] = (document as { metadata: { searchableText: unknown } }).metadata.searchableText
  }
  if ((document as { metadata?: { nodeCount?: unknown } }).metadata?.nodeCount) {
    serialized[PROP.MAP_NODE_COUNT] = (document as { metadata: { nodeCount: unknown } }).metadata.nodeCount
  }
  if ((document as { metadata?: { edgeCount?: unknown } }).metadata?.edgeCount) {
    serialized[PROP.MAP_EDGE_COUNT] = (document as { metadata: { edgeCount: unknown } }).metadata.edgeCount
  }
  if ((document as { metadata?: { maxDepth?: unknown } }).metadata?.maxDepth) {
    serialized[PROP.MAP_MAX_DEPTH] = (document as { metadata: { maxDepth: unknown } }).metadata.maxDepth
  }

  // Layout settings
  if ((document as { layout?: unknown }).layout) {
    const layout = (document as { layout: Record<string, unknown> }).layout
    serialized[PROP.LAYOUT_ACTIVE_VIEW] = layout.activeView || 'mindmap'
    serialized[PROP.LAYOUT_ORIENTATION] = layout.orientationMode || 'anticlockwise'
    serialized[PROP.LAYOUT_LOD_ENABLED] = layout.lodEnabled || true
    serialized[PROP.LAYOUT_LOD_THRESHOLDS] = layout.lodThresholds || [10, 30, 50, 70, 90]
    serialized[PROP.LAYOUT_H_SPACING] = layout.horizontalSpacing || 50
    serialized[PROP.LAYOUT_V_SPACING] = layout.verticalSpacing || 20
  }

  // Nodes and edges
  const nodes = (document as { nodes?: unknown[] }).nodes || []
  const edges = (document as { edges?: unknown[] }).edges || []
  const interMapLinks = (document as { interMapLinks?: unknown[] }).interMapLinks || []

  const result = {
    ...serialized,
    nodes: nodes.map(node => serializeNode(node as Record<string, unknown>, options)),
    edges: edges.map(edge => serializeEdge(edge as Record<string, unknown>, options)),
    interMapLinks: interMapLinks.map(link => serializeProperties(link as Record<string, unknown>))
  }

  // Validate if requested
  if (validate && !validateDocument(result)) {
    const docId = serialized[PROP.MAP_ID]
    const message = `Document validation failed for document: ${typeof docId === 'string' ? docId : 'unknown'}`
    if (strict) {
      throw new Error(message)
    }
    console.warn(message, document)
  }

  return result
}

/**
 * Deserialize a document using standard property names
 */
export function deserializeDocument(serialized: Partial<Record<PropertyName, unknown>> & {
  nodes: Partial<Record<PropertyName, unknown>>[],
  edges: Partial<Record<PropertyName, unknown>>[],
  interMapLinks: Partial<Record<PropertyName, unknown>>[]
}): Record<string, unknown> {
  const document: Record<string, unknown> = {
    version: serialized[PROP.MAP_VERSION] || '1.0',
    metadata: {
      id: serialized[PROP.MAP_ID] || '',
      name: serialized[PROP.MAP_NAME] || 'Untitled',
      created: serialized[PROP.MAP_CREATED],
      modified: serialized[PROP.MAP_MODIFIED],
      tags: serialized[PROP.MAP_TAGS] || [],
      searchableText: serialized[PROP.MAP_SEARCHABLE_TEXT] || '',
      nodeCount: serialized[PROP.MAP_NODE_COUNT] || 0,
      edgeCount: serialized[PROP.MAP_EDGE_COUNT] || 0,
      maxDepth: serialized[PROP.MAP_MAX_DEPTH] || 0
    },
    layout: {
      activeView: serialized[PROP.LAYOUT_ACTIVE_VIEW] || 'mindmap',
      orientationMode: serialized[PROP.LAYOUT_ORIENTATION] || 'anticlockwise',
      lodEnabled: serialized[PROP.LAYOUT_LOD_ENABLED] || true,
      lodThresholds: serialized[PROP.LAYOUT_LOD_THRESHOLDS] || [10, 30, 50, 70, 90],
      horizontalSpacing: serialized[PROP.LAYOUT_H_SPACING] || 50,
      verticalSpacing: serialized[PROP.LAYOUT_V_SPACING] || 20
    },
    nodes: serialized.nodes?.map(deserializeNode) || [],
    edges: serialized.edges?.map(deserializeEdge) || [],
    interMapLinks: serialized.interMapLinks?.map(deserializeProperties) || []
  }

  // Optional metadata
  if (serialized[PROP.MAP_DESCRIPTION]) (document.metadata as Record<string, unknown>).description = serialized[PROP.MAP_DESCRIPTION]

  return document
}
