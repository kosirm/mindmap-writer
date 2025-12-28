/**
 * PROGRESSIVE PROPERTY NAMING SYSTEM
 *
 * Level 1: Single letters (a-z) - 26 properties
 * Level 2: Two letters (aa-zz) - 676 properties
 * Level 3: Three letters (aaa-zzz) - 17,576 properties
 * Level 4: Four+ letters - unlimited
 *
 * ALWAYS start with shortest possible names!
 */

export const PROP = {
  // ============================================
  // LEVEL 1: SINGLE LETTER PROPERTIES (26/26 USED)
  // ============================================

  // PRIORITY 1A: BASIC NODE PROPERTIES (10 letters)
  NODE_ID: 'i',              // id
  NODE_PARENT_ID: 'p',       // parentId
  NODE_TITLE: 't',           // title
  NODE_CONTENT: 'c',         // content
  NODE_ORDER: 'o',           // order
  NODE_TYPE: 'y',            // type
  NODE_POSITION_X: 'x',      // position.x
  NODE_POSITION_Y: 'z',      // position.y
  NODE_CREATED: 'r',         // created
  NODE_MODIFIED: 'm',        // modified

  // PRIORITY 1B: HIERARCHICAL EDGE PROPERTIES (4 letters)
  // In hierarchical structures, edges are as frequent as nodes!
  // Every node (except root) has a parent edge
  EDGE_ID: 'e',              // id
  EDGE_SOURCE: 'q',          // source node ID
  EDGE_TARGET: 'w',          // target node ID
  EDGE_TYPE: 'g',            // edgeType ('hierarchy' | 'reference')

  // PRIORITY 2: VIEW-SPECIFIC NODE PROPERTIES (3 letters)
  NODE_VIEW_SIDE: 's',       // views.mindmap.side
  NODE_VIEW_COLLAPSED: 'l',  // views.mindmap.collapsed
  NODE_VIEW_EXPANDED: 'd',   // views.outline.expanded

  // PRIORITY 3: MAP/DOCUMENT PROPERTIES (5 letters)
  MAP_ID: 'f',               // metadata.id
  MAP_NAME: 'n',             // metadata.name
  MAP_CREATED: 'a',          // metadata.created
  MAP_MODIFIED: 'u',         // metadata.modified
  MAP_VERSION: 'v',          // version

  // PRIORITY 4: INTER-MAP LINK PROPERTIES (4 letters)
  // Cross-document references (less frequent than hierarchical edges)
  LINK_ID: 'k',              // id
  LINK_SOURCE: 'h',          // sourceNodeId
  LINK_TARGET_MAP: 'j',      // targetMapId
  LINK_TARGET_NODE: 'b',     // targetNodeId

  // ============================================
  // LEVEL 2: TWO LETTER PROPERTIES (676 total)
  // ============================================

  // Optional NODE properties
  NODE_COLOR: 'co',              // data.color
  NODE_ICON: 'ic',               // data.icon
  NODE_AI_GENERATED: 'ag',       // data.aiGenerated
  NODE_AI_PROMPT: 'ap',          // data.aiPrompt
  NODE_AI_SUGGESTIONS: 'as',     // data.aiSuggestions

  // Optional MAP properties
  MAP_DESCRIPTION: 'ds',         // metadata.description
  MAP_TAGS: 'ta',                // metadata.tags
  MAP_SEARCHABLE_TEXT: 'st',     // metadata.searchableText
  MAP_EDGE_COUNT: 'ec',          // metadata.edgeCount
  MAP_MAX_DEPTH: 'md',           // metadata.maxDepth
  MAP_NODE_COUNT: 'nc',          // metadata.nodeCount

  // Layout settings
  LAYOUT_ACTIVE_VIEW: 'av',      // layout.activeView
  LAYOUT_ORIENTATION: 'or',      // layout.orientationMode
  LAYOUT_LOD_ENABLED: 'le',      // layout.lodEnabled
  LAYOUT_LOD_THRESHOLDS: 'lt',   // layout.lodThresholds
  LAYOUT_H_SPACING: 'hs',        // layout.horizontalSpacing
  LAYOUT_V_SPACING: 'vs',        // layout.verticalSpacing

  // View-specific optional properties
  VIEW_MINDMAP_POSITION_X: 'mx', // views.mindmap.position.x
  VIEW_MINDMAP_POSITION_Y: 'my', // views.mindmap.position.y
  VIEW_CONCEPT_SIZE_W: 'cw',     // views.conceptMap.size.width
  VIEW_CONCEPT_SIZE_H: 'ch',     // views.conceptMap.size.height
  VIEW_TIMELINE_START: 'ts',     // views.timeline.startDate
  VIEW_TIMELINE_END: 'te',       // views.timeline.endDate
  VIEW_TIMELINE_LANE: 'tl',      // views.timeline.lane
  VIEW_KANBAN_COLUMN: 'kc',      // views.kanban.column
  VIEW_KANBAN_ORDER: 'ko',       // views.kanban.order

  // Edge optional properties
  EDGE_SOURCE_HANDLE: 'sh',      // sourceHandle
  EDGE_TARGET_HANDLE: 'th',      // targetHandle
  EDGE_STYLE: 'ey',              // style (EdgeStyle)
  EDGE_CLASS: 'el',              // class
  EDGE_LABEL: 'eb',              // data.label
  EDGE_CREATED: 'er',            // created
  EDGE_MODIFIED: 'em',           // modified

  // Link optional properties
  LINK_LABEL: 'lb',              // label
  LINK_CREATED: 'lc',            // created
  LINK_TARGET_MAP_NAME: 'mn',    // targetMapName (cached)
  LINK_TARGET_NODE_TITLE: 'nt',  // targetNodeTitle (cached)

  // AI Context
  AI_TOPIC: 'at',                // aiContext.topic
  AI_PURPOSE: 'au',              // aiContext.purpose
  AI_AUDIENCE: 'aa',             // aiContext.audience
  AI_LAST_ACTION: 'al',          // aiContext.lastAIAction

  // ============================================
  // PROPERTY AVAILABILITY TRACKER
  // ============================================

  // Single letters used: ALL 26 (a-z) ✓
  // a b c d e f g h i j k l m n o p q r s t u v w x y z
  // Priority 1A (Nodes): i p t c o y x z r m (10)
  // Priority 1B (Edges): e q w g (4)
  // Priority 2 (Views): s l d (3)
  // Priority 3 (Maps): f n a u v (5)
  // Priority 4 (Links): k h j b (4)

  // Two letter combinations used: 41/676
  // aa, ag, al, ap, as, at, au, av, ch, co, cw, ds, eb, ec, el, em, er, ey,
  // hs, ic, kc, ko, lb, lc, le, lt, md, mn, mx, my, nc, nt, or, sh, st, ta,
  // te, th, tl, ts, vs

  // Two letter combinations available: 635/676

  // Three letter combinations used: 0/17,576
  // Three letter combinations available: 17,576/17,576
} as const

// Type-safe property access
export type PropertyName = typeof PROP[keyof typeof PROP]

// Auto-generate reverse mapping (short name -> standard name)
// This ensures single source of truth and prevents inconsistencies
export const PROP_REVERSE: Record<PropertyName, string> = Object.entries(PROP)
  .filter(([key]) => !key.startsWith('//')) // Filter out comments
  .reduce(
    (acc, [key, value]) => {
      acc[value as PropertyName] = key
      return acc
    },
    {} as Record<PropertyName, string>
  )

/**
 * Validate that there are no duplicate property names
 * This enforces the "one property = one name" rule
 */
function validateNoDuplicates(): void {
  const seen = new Set<string>()
  const duplicates: string[] = []

  for (const [key, value] of Object.entries(PROP)) {
    if (seen.has(value)) {
      duplicates.push(`${key} = '${value}'`)
    }
    seen.add(value)
  }

  if (duplicates.length > 0) {
    throw new Error(
      `Duplicate property names found! Each property must have a unique short name.\n` +
      `Duplicates: ${duplicates.join(', ')}\n` +
      `This violates the "one property = one name" rule.`
    )
  }
}

// Run validation on module load (development only)
if (import.meta.env.DEV) {
  validateNoDuplicates()
}
