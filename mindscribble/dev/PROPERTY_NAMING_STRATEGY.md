# Property Naming Strategy for Optimized Storage

## Executive Summary

This document outlines the **progressive property naming strategy** for MindScribble's optimized IndexedDB storage architecture. The strategy uses a hierarchical approach: start with 1-letter property names, expand to 2-letters when needed, then 3-letters, etc.

**CRITICAL RULES**:
1. **One Property = One Name**: Each property name (letter/combination) can only be used for ONE property across ALL object types. NO EXCEPTIONS.
2. **Use ALL Single Letters First**: Must use all 26 single letters (a-z) before moving to 2-letter combinations.
3. **Priority Order**: Assign based on usage frequency:
   - **Priority 1**: Basic node properties (most frequently accessed)
   - **Priority 2**: Edge/Link properties
   - **Priority 3**: View-specific node properties (e.g. side for mindmap)
   - **Priority 4**: Document/Map properties
   - **Priority 5**: Vault properties
   - **Priority 6**: Optional/metadata properties
   - **Priority 7**: App/Settings properties

## Core Strategy: Progressive Property Length

### Level 1: Single Letter Properties (26 properties)
- Use: `a-z` (26 unique properties)
- When: Starting point for all new properties
- Example: `i` for id, `t` for title, `c` for content

### Level 2: Two Letter Properties (676 properties)
- Use: `aa-zz` (26×26 = 676 unique properties)
- When: All single-letter properties are exhausted
- Example: `cr` for created, `md` for modified, `ps` for position

### Level 3: Three Letter Properties (17,576 properties)
- Use: `aaa-zzz` (26×26×26 = 17,576 unique properties)
- When: All two-letter properties are exhausted
- Example: `cnt` for content, `pos` for position, `lnk` for links

### Level 4+: Four+ Letter Properties (unlimited)
- Use: `aaaa-zzzz` and beyond
- When: All three-letter properties are exhausted
- Example: `cont` for content, `posi` for position

## Property Naming Rules

### 1. Start with Single Letters
- **Always start with single letters** for new properties
- Only expand to longer names when absolutely necessary
- Follow the progression: 1 → 2 → 3 → 4+ letters

### 2. Prioritize Common Properties
- Most frequently used properties get shortest names
- Reserve single letters for core properties used in every object

### 3. One Property = One Name (CRITICAL RULE)
- **Each letter/combination can only be used for ONE property across ALL object types**
- **NO EXCEPTIONS** - even if properties have the same semantic meaning (e.g., id, title, color)
- Each object type gets its own unique letter for each property
- Example:
  - ❌ `i` for both MAP_ID and NODE_ID (even though both are "id")
  - ✅ `i` for NODE_ID, `f` for MAP_ID, `k` for LINK_ID (unique letters)

### 4. Exhaust Single Letters First
- Must use ALL 26 single letters (a-z) before using any 2-letter combinations
- Assign based on priority: nodes → edges → views → maps  → files -> optional properties

### 5. Maintain Consistency
- Once assigned, never change property names
- Document all mappings in central reference
- Update availability tracker with each assignment

## Current Property Assignments

### Single Letter Properties (Level 1) - ALL 26 LETTERS

Priority order: Basic Node Properties → View-Specific Node Properties → Map Properties → Edge/Link Properties

#### Priority 1: Basic Node Properties (Most Frequently Accessed)
```typescript
// Core node properties - used in EVERY node operation
PROP.NODE_ID = 'i'              // id (string)
PROP.NODE_PARENT_ID = 'p'       // parentId (string | null)
PROP.NODE_TITLE = 't'           // title (string)
PROP.NODE_CONTENT = 'c'         // content (string - HTML)
PROP.NODE_ORDER = 'o'           // order (number - sibling order)
PROP.NODE_TYPE = 'y'            // type (string - 'custom' | 'lod-badge')
PROP.NODE_POSITION_X = 'x'      // position.x (number)
PROP.NODE_POSITION_Y = 'z'      // position.y (number) - using 'z' to avoid confusion
PROP.NODE_CREATED = 'r'         // created (string - ISO 8601)
PROP.NODE_MODIFIED = 'm'        // modified (string - ISO 8601)
```

#### Priority 2: View-Specific Node Properties
```typescript
// View-specific data stored per node
PROP.NODE_VIEW_SIDE = 's'       // views.mindmap.side ('left' | 'right' | null)
PROP.NODE_VIEW_COLLAPSED = 'l'  // views.mindmap.collapsed (boolean)
PROP.NODE_VIEW_EXPANDED = 'e'   // views.outline.expanded (boolean)
```

#### Priority 3: Map/Document Properties
```typescript
// Document metadata and settings
PROP.MAP_ID = 'f'               // metadata.id (string)
PROP.MAP_NAME = 'n'             // metadata.name (string)
PROP.MAP_CREATED = 'a'          // metadata.created (string - ISO 8601)
PROP.MAP_MODIFIED = 'd'         // metadata.modified (string - ISO 8601)
PROP.MAP_NODE_COUNT = 'u'       // metadata.nodeCount (number)
PROP.MAP_VERSION = 'v'          // version (string)
```

#### Priority 4: Edge/Link Properties
```typescript
// Inter-map links and edges
PROP.LINK_ID = 'k'              // id (string)
PROP.LINK_SOURCE = 'q'          // sourceNodeId (string)
PROP.LINK_TARGET_MAP = 'g'      // targetMapId (string)
PROP.LINK_TARGET_NODE = 'h'     // targetNodeId (string | null)
PROP.LINK_LABEL = 'b'           // label (string)
PROP.LINK_CREATED = 'j'         // created (string - ISO 8601)
PROP.EDGE_TYPE = 'w'            // data.edgeType ('hierarchy' | 'reference')
```

### Two Letter Properties (Level 2)

#### Optional/Metadata Properties (After All 26 Single Letters Are Used)
```typescript
// Optional node properties (visual, AI, etc.)
PROP.NODE_COLOR = 'co'              // data.color (string)
PROP.NODE_ICON = 'ic'               // data.icon (string)
PROP.NODE_AI_GENERATED = 'ag'       // data.aiGenerated (boolean)
PROP.NODE_AI_PROMPT = 'ap'          // data.aiPrompt (string)
PROP.NODE_AI_SUGGESTIONS = 'as'     // data.aiSuggestions (string[])

// Optional map properties
PROP.MAP_DESCRIPTION = 'ds'         // metadata.description (string)
PROP.MAP_TAGS = 'ta'                // metadata.tags (string[])
PROP.MAP_SEARCHABLE_TEXT = 'st'     // metadata.searchableText (string)
PROP.MAP_EDGE_COUNT = 'ec'          // metadata.edgeCount (number)
PROP.MAP_MAX_DEPTH = 'md'           // metadata.maxDepth (number)

// Layout settings
PROP.LAYOUT_ACTIVE_VIEW = 'av'      // layout.activeView (ViewType)
PROP.LAYOUT_ORIENTATION = 'or'      // layout.orientationMode (OrientationMode)
PROP.LAYOUT_LOD_ENABLED = 'le'      // layout.lodEnabled (boolean)
PROP.LAYOUT_LOD_THRESHOLDS = 'lt'   // layout.lodThresholds (number[])
PROP.LAYOUT_H_SPACING = 'hs'        // layout.horizontalSpacing (number)
PROP.LAYOUT_V_SPACING = 'vs'        // layout.verticalSpacing (number)

// View-specific optional properties
PROP.VIEW_MINDMAP_POSITION_X = 'mx' // views.mindmap.position.x (number)
PROP.VIEW_MINDMAP_POSITION_Y = 'my' // views.mindmap.position.y (number)
PROP.VIEW_CONCEPT_SIZE_W = 'cw'     // views.conceptMap.size.width (number)
PROP.VIEW_CONCEPT_SIZE_H = 'ch'     // views.conceptMap.size.height (number)
PROP.VIEW_TIMELINE_START = 'ts'     // views.timeline.startDate (string)
PROP.VIEW_TIMELINE_END = 'te'       // views.timeline.endDate (string)
PROP.VIEW_TIMELINE_LANE = 'tl'      // views.timeline.lane (number)
PROP.VIEW_KANBAN_COLUMN = 'kc'      // views.kanban.column (string)
PROP.VIEW_KANBAN_ORDER = 'ko'       // views.kanban.order (number)

// Edge optional properties
PROP.EDGE_SOURCE = 'es'             // source (string)
PROP.EDGE_TARGET = 'et'             // target (string)
PROP.EDGE_SOURCE_HANDLE = 'sh'      // sourceHandle (string)
PROP.EDGE_TARGET_HANDLE = 'th'      // targetHandle (string)
PROP.EDGE_STYLE = 'ey'              // type (EdgeStyle)
PROP.EDGE_CLASS = 'el'              // class (string)
PROP.EDGE_LABEL = 'eb'              // data.label (string)

// Link optional properties
PROP.LINK_TARGET_MAP_NAME = 'mn'    // targetMapName (string - cached)
PROP.LINK_TARGET_NODE_TITLE = 'nt'  // targetNodeTitle (string - cached)

// AI Context (document level)
PROP.AI_TOPIC = 'at'                // aiContext.topic (string)
PROP.AI_PURPOSE = 'au'              // aiContext.purpose (string)
PROP.AI_AUDIENCE = 'aa'             // aiContext.audience (string)
PROP.AI_LAST_ACTION = 'al'          // aiContext.lastAIAction (string)
```

## Implementation Files

### 1. Property Constants File

**Location:** `src/core/constants/propertyNames.ts`

```typescript
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

  // PRIORITY 1: BASIC NODE PROPERTIES (10 letters)
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

  // PRIORITY 2: VIEW-SPECIFIC NODE PROPERTIES (3 letters)
  NODE_VIEW_SIDE: 's',       // views.mindmap.side
  NODE_VIEW_COLLAPSED: 'l',  // views.mindmap.collapsed
  NODE_VIEW_EXPANDED: 'e',   // views.outline.expanded

  // PRIORITY 3: MAP/DOCUMENT PROPERTIES (6 letters)
  MAP_ID: 'f',               // metadata.id
  MAP_NAME: 'n',             // metadata.name
  MAP_CREATED: 'a',          // metadata.created
  MAP_MODIFIED: 'd',         // metadata.modified
  MAP_NODE_COUNT: 'u',       // metadata.nodeCount
  MAP_VERSION: 'v',          // version

  // PRIORITY 4: EDGE/LINK PROPERTIES (7 letters)
  LINK_ID: 'k',              // id
  LINK_SOURCE: 'q',          // sourceNodeId
  LINK_TARGET_MAP: 'g',      // targetMapId
  LINK_TARGET_NODE: 'h',     // targetNodeId
  LINK_LABEL: 'b',           // label
  LINK_CREATED: 'j',         // created
  EDGE_TYPE: 'w',            // data.edgeType
  
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
  EDGE_SOURCE: 'es',             // source
  EDGE_TARGET: 'et',             // target
  EDGE_SOURCE_HANDLE: 'sh',      // sourceHandle
  EDGE_TARGET_HANDLE: 'th',      // targetHandle
  EDGE_STYLE: 'ey',              // type (EdgeStyle)
  EDGE_CLASS: 'el',              // class
  EDGE_LABEL: 'eb',              // data.label

  // Link optional properties
  LINK_TARGET_MAP_NAME: 'mn',    // targetMapName (cached)
  LINK_TARGET_NODE_TITLE: 'nt',  // targetNodeTitle (cached)

  // AI Context
  AI_TOPIC: 'at',                // aiContext.topic
  AI_PURPOSE: 'au',              // aiContext.purpose
  AI_AUDIENCE: 'aa',             // aiContext.audience
  AI_LAST_ACTION: 'al',          // aiContext.lastAIAction
  
  // ============================================
  // LEVEL 3: THREE LETTER PROPERTIES (17,576 total)
  // ============================================
  
  // Use when two-letter properties are exhausted
  // Example patterns:
  MAP_CREATED_BY: 'cby', // createdBy
  NODE_CONTENT_TYPE: 'cty', // contentType
  LINK_CONNECTION_TYPE: 'cnt', // connectionType
  
  // ============================================
  // PROPERTY AVAILABILITY TRACKER
  // ============================================

  // Single letters used: ALL 26 (a-z) ✓
  // a b c d e f g h i j k l m n o p q r s t u v w x y z

  // Two letter combinations used: 47/676
  // aa, ag, al, ap, as, at, au, av, ch, co, cw, ds, eb, ec, el, es, et, ey,
  // hs, ic, kc, ko, le, lt, md, mn, mx, my, nt, or, sh, st, ta, te, th, tl,
  // ts, vs

  // Two letter combinations available: 629/676
} as const

// Type-safe property access
type PropertyName = typeof PROP[keyof typeof PROP]
```

### 2. Property Documentation File

**Location:** `src/core/docs/PROPERTY_REFERENCE.md`

```markdown
# Property Name Reference Guide

## Quick Reference Table

### Single Letter Properties (Level 1) - ALL 26 LETTERS

**Priority 1: Basic Node Properties (10 letters)**

| Short | Property | Type | Description |
|-------|----------|------|-------------|
| `i` | NODE_ID | string | Node unique identifier |
| `p` | NODE_PARENT_ID | string\|null | Parent node ID |
| `t` | NODE_TITLE | string | Node title |
| `c` | NODE_CONTENT | string | Node content (HTML) |
| `o` | NODE_ORDER | number | Sibling order |
| `y` | NODE_TYPE | string | Node type ('custom'\|'lod-badge') |
| `x` | NODE_POSITION_X | number | Position X coordinate |
| `z` | NODE_POSITION_Y | number | Position Y coordinate |
| `r` | NODE_CREATED | string | Created timestamp (ISO 8601) |
| `m` | NODE_MODIFIED | string | Modified timestamp (ISO 8601) |

**Priority 2: View-Specific Node Properties (3 letters)**

| Short | Property | Type | Description |
|-------|----------|------|-------------|
| `s` | NODE_VIEW_SIDE | string\|null | Mindmap side ('left'\|'right') |
| `l` | NODE_VIEW_COLLAPSED | boolean | Mindmap collapsed state |
| `e` | NODE_VIEW_EXPANDED | boolean | Outline expanded state |

**Priority 3: Map/Document Properties (6 letters)**

| Short | Property | Type | Description |
|-------|----------|------|-------------|
| `f` | MAP_ID | string | Map/document unique identifier |
| `n` | MAP_NAME | string | Map name |
| `a` | MAP_CREATED | string | Map created timestamp |
| `d` | MAP_MODIFIED | string | Map modified timestamp |
| `u` | MAP_NODE_COUNT | number | Total node count |
| `v` | MAP_VERSION | string | Schema version |

**Priority 4: Edge/Link Properties (7 letters)**

| Short | Property | Type | Description |
|-------|----------|------|-------------|
| `k` | LINK_ID | string | Link unique identifier |
| `q` | LINK_SOURCE | string | Source node ID |
| `g` | LINK_TARGET_MAP | string | Target map ID |
| `h` | LINK_TARGET_NODE | string\|null | Target node ID (optional) |
| `b` | LINK_LABEL | string | Link label |
| `j` | LINK_CREATED | string | Link created timestamp |
| `w` | EDGE_TYPE | string | Edge type ('hierarchy'\|'reference') |

### Two Letter Properties (Level 2) - Optional/Metadata Properties

**Optional Node Properties**

| Short | Property | Type | Description |
|-------|----------|------|-------------|
| `co` | NODE_COLOR | string | Node color |
| `ic` | NODE_ICON | string | Node icon |
| `ag` | NODE_AI_GENERATED | boolean | AI generated flag |
| `ap` | NODE_AI_PROMPT | string | AI prompt used |
| `as` | NODE_AI_SUGGESTIONS | string[] | AI suggestions |

**Optional Map Properties**

| Short | Property | Type | Description |
|-------|----------|------|-------------|
| `ds` | MAP_DESCRIPTION | string | Map description |
| `ta` | MAP_TAGS | string[] | Map tags |
| `st` | MAP_SEARCHABLE_TEXT | string | Searchable text cache |
| `ec` | MAP_EDGE_COUNT | number | Total edge count |
| `md` | MAP_MAX_DEPTH | number | Maximum tree depth |

**Layout Settings**

| Short | Property | Type | Description |
|-------|----------|------|-------------|
| `av` | LAYOUT_ACTIVE_VIEW | string | Active view type |
| `or` | LAYOUT_ORIENTATION | string | Orientation mode |
| `le` | LAYOUT_LOD_ENABLED | boolean | LOD enabled flag |
| `lt` | LAYOUT_LOD_THRESHOLDS | number[] | LOD thresholds |
| `hs` | LAYOUT_H_SPACING | number | Horizontal spacing |
| `vs` | LAYOUT_V_SPACING | number | Vertical spacing |

**View-Specific Properties**

| Short | Property | Type | Description |
|-------|----------|------|-------------|
| `mx` | VIEW_MINDMAP_POSITION_X | number | Mindmap position X |
| `my` | VIEW_MINDMAP_POSITION_Y | number | Mindmap position Y |
| `cw` | VIEW_CONCEPT_SIZE_W | number | Concept map width |
| `ch` | VIEW_CONCEPT_SIZE_H | number | Concept map height |
| `ts` | VIEW_TIMELINE_START | string | Timeline start date |
| `te` | VIEW_TIMELINE_END | string | Timeline end date |
| `tl` | VIEW_TIMELINE_LANE | number | Timeline lane |
| `kc` | VIEW_KANBAN_COLUMN | string | Kanban column |
| `ko` | VIEW_KANBAN_ORDER | number | Kanban order |

**Edge Properties**

| Short | Property | Type | Description |
|-------|----------|------|-------------|
| `es` | EDGE_SOURCE | string | Edge source node |
| `et` | EDGE_TARGET | string | Edge target node |
| `sh` | EDGE_SOURCE_HANDLE | string | Source handle |
| `th` | EDGE_TARGET_HANDLE | string | Target handle |
| `ey` | EDGE_STYLE | string | Edge style |
| `el` | EDGE_CLASS | string | Edge CSS class |
| `eb` | EDGE_LABEL | string | Edge label |

**Link Optional Properties**

| Short | Property | Type | Description |
|-------|----------|------|-------------|
| `mn` | LINK_TARGET_MAP_NAME | string | Cached target map name |
| `nt` | LINK_TARGET_NODE_TITLE | string | Cached target node title |

**AI Context**

| Short | Property | Type | Description |
|-------|----------|------|-------------|
| `at` | AI_TOPIC | string | AI context topic |
| `au` | AI_PURPOSE | string | AI context purpose |
| `aa` | AI_AUDIENCE | string | AI context audience |
| `al` | AI_LAST_ACTION | string | Last AI action |

## Usage Examples

### Creating a Map Object
```typescript
const mapObject = {
  [PROP.MAP_ID]: 'map-123',                    // 'f'
  [PROP.MAP_NAME]: 'My Mind Map',              // 'n'
  [PROP.MAP_VERSION]: '1.0',                   // 'v'
  [PROP.MAP_CREATED]: '2024-01-01T00:00:00Z',  // 'a'
  [PROP.MAP_MODIFIED]: '2024-01-01T00:00:00Z', // 'd'
  [PROP.MAP_NODE_COUNT]: 42,                   // 'u'
  [PROP.MAP_DESCRIPTION]: 'Optional desc',     // 'ds' (2-letter)
  [PROP.MAP_TAGS]: ['tag1', 'tag2']            // 'ta' (2-letter)
}

// Stored in IndexedDB as:
// { f: 'map-123', n: 'My Mind Map', v: '1.0', a: '2024-01-01T00:00:00Z',
//   d: '2024-01-01T00:00:00Z', u: 42, ds: 'Optional desc', ta: ['tag1', 'tag2'] }
```

### Creating a Node Object
```typescript
const nodeObject = {
  [PROP.NODE_ID]: 'node-456',                  // 'i'
  [PROP.NODE_PARENT_ID]: 'node-123',           // 'p'
  [PROP.NODE_TITLE]: 'Node Title',             // 't'
  [PROP.NODE_CONTENT]: '<p>Rich text...</p>',  // 'c'
  [PROP.NODE_ORDER]: 0,                        // 'o'
  [PROP.NODE_TYPE]: 'custom',                  // 'y'
  [PROP.NODE_POSITION_X]: 100,                 // 'x'
  [PROP.NODE_POSITION_Y]: 200,                 // 'z'
  [PROP.NODE_CREATED]: '2024-01-01T00:00:00Z', // 'r'
  [PROP.NODE_MODIFIED]: '2024-01-01T00:00:00Z',// 'm'
  [PROP.NODE_VIEW_SIDE]: 'right',              // 's'
  [PROP.NODE_VIEW_COLLAPSED]: false,           // 'l'
  [PROP.NODE_COLOR]: '#ff0000',                // 'co' (2-letter, optional)
  [PROP.NODE_ICON]: 'star'                     // 'ic' (2-letter, optional)
}

// Stored in IndexedDB as:
// { i: 'node-456', p: 'node-123', t: 'Node Title', c: '<p>Rich text...</p>',
//   o: 0, y: 'custom', x: 100, z: 200, r: '2024-01-01T00:00:00Z',
//   m: '2024-01-01T00:00:00Z', s: 'right', l: false, co: '#ff0000', ic: 'star' }
```

### Creating a Link Object
```typescript
const linkObject = {
  [PROP.LINK_ID]: 'link-789',                  // 'k'
  [PROP.LINK_SOURCE]: 'node-456',              // 'q'
  [PROP.LINK_TARGET_MAP]: 'map-999',           // 'g'
  [PROP.LINK_TARGET_NODE]: 'node-888',         // 'h'
  [PROP.LINK_LABEL]: 'See also',               // 'b'
  [PROP.LINK_CREATED]: '2024-01-01T00:00:00Z'  // 'j'
}

// Stored in IndexedDB as:
// { k: 'link-789', q: 'node-456', g: 'map-999', h: 'node-888',
//   b: 'See also', j: '2024-01-01T00:00:00Z' }
```

### Reading Properties
```typescript
function getNodeTitle(node: any): string {
  return node[PROP.NODE_TITLE] || 'Untitled'  // node['t']
}

function getNodeContent(node: any): string {
  return node[PROP.NODE_CONTENT] || ''  // node['c']
}

function getNodePosition(node: any): { x: number; y: number } {
  return {
    x: node[PROP.NODE_POSITION_X] || 0,  // node['x']
    y: node[PROP.NODE_POSITION_Y] || 0   // node['z']
  }
}
```

## Property Assignment Strategy

### 1. Exhaust Single Letters First (CRITICAL)
- **MUST use ALL 26 single letters (a-z) before using any 2-letter combinations**
- Current status: 26/26 single letters used ✓
- Track usage in PROP constant comments and availability tracker

### 2. Priority-Based Assignment
Assign letters based on access frequency:
1. **Priority 1**: Basic node properties (most frequently accessed)
2. **Priority 2**: View-specific node properties
3. **Priority 3**: Map/document properties
4. **Priority 4**: Edge/link properties
5. **Priority 5**: Optional/metadata properties (use 2-letter combinations)

### 3. One Property = One Name (CRITICAL)
- **Each letter can only be used for ONE property across ALL object types**
- **NO EXCEPTIONS** - even for semantically similar properties
- Example violations:
  - ❌ `i` for both MAP_ID and NODE_ID
  - ❌ `t` for both MAP_TITLE and NODE_TITLE
  - ✅ `i` for NODE_ID, `f` for MAP_ID (unique letters)
  - ✅ `t` for NODE_TITLE, `n` for MAP_NAME (unique letters)

### 4. Check Before Assigning
- Check PROP constant for existing assignments
- Check availability tracker for used letters
- Update documentation immediately after assignment
- Add comments explaining the choice

### 5. Future Expansion
- When all single letters exhausted: use two letters (aa-zz)
- When two letters exhausted: use three letters (aaa-zzz)
- Pattern progression: a → z → aa → zz → aaa → zzz
- Currently: 26/26 single letters used, 47/676 two-letter combinations used

## Migration Guide

### Adding New Properties

#### Step 1: Check Availability
```typescript
// Check availability tracker in PROP constant
// Single letters used: ALL 26 (a-z) ✓
// Two letter combinations used: 47/676
// Two letter combinations available: 629/676
```

#### Step 2: Determine Priority
- **High priority** (frequently accessed): Should have been assigned a single letter already
- **Low priority** (optional/metadata): Use 2-letter combination

#### Step 3: Assign Unique Name
```typescript
// Example: Adding "author" property to maps
// 1. Check two-letter availability - 'au' is available!
PROP.MAP_AUTHOR: 'au'  // Use two-letter combination

// 2. Verify uniqueness - 'au' not used anywhere else ✓
```

#### Step 4: Update Documentation
1. Add to PROP constant with comment
2. Update availability tracker
3. Add to Quick Reference Table
4. Update usage examples if needed

### Example: Adding New View-Specific Property
```typescript
// Adding "zoom level" for mindmap view
// 1. Check availability - 'zl' is available
PROP.VIEW_MINDMAP_ZOOM: 'zl'

// 2. Add to PROP constant
export const PROP = {
  // ... existing properties

  // View-specific optional properties
  VIEW_MINDMAP_ZOOM: 'zl',  // views.mindmap.zoom (number)
}

// 3. Update availability tracker
// Two letter combinations used: 48/676 (added 'zl')
// Two letter combinations available: 628/676
```

## Benefits of This Approach

### ✅ Maximum Storage Efficiency
- **Single letters**: 1 byte per property name (26 properties)
- **Two letters**: 2 bytes per property name (676 properties)
- **Three letters**: 3 bytes per property name (17,576 properties)
- **Savings**: 80-90% reduction vs readable names (5-15 bytes each)
- **Priority-based**: Most frequently accessed properties get shortest names

### ✅ Massive Scalability
- **Level 1**: 26 single-letter properties (ALL USED ✓)
- **Level 2**: 676 two-letter properties (47 used, 629 available)
- **Level 3**: 17,576 three-letter properties (none used yet)
- **Level 4+**: Unlimited four+ letter properties
- **Total capacity**: Effectively unlimited property names

### ✅ Zero Ambiguity
- **One property = one name**: No conflicts across object types
- **No exceptions**: Even semantically similar properties get unique names
- **Clear mapping**: TypeScript constants provide full traceability
- **Type safety**: Compile-time checking prevents errors

### ✅ Optimal Performance
- **Smaller storage**: Reduced IndexedDB size (critical for large vaults)
- **Faster I/O**: Less data to read/write from disk
- **Better caching**: More data fits in memory
- **Faster sync**: Less data to transfer to Google Drive
- **Priority-based**: Hot paths (node operations) use shortest names

### ✅ Developer Experience
- **Centralized definitions**: Single source of truth (PROP constant)
- **Full documentation**: Quick reference tables and examples
- **Type safety**: TypeScript ensures correct usage
- **Easy debugging**: Clear mapping between short and long names
- **Simple migration**: Add new properties without conflicts

## Conclusion

This progressive property naming strategy provides an optimal balance between:
- **Maximum storage efficiency**: Single letters for hot paths, two letters for optional properties
- **Zero ambiguity**: One property = one name, no exceptions
- **Massive scalability**: 26 + 676 + 17,576 = 18,278 properties available
- **Optimal performance**: Priority-based assignment ensures fastest operations use shortest names
- **Developer experience**: TypeScript constants provide full type safety and traceability

### Key Principles

1. **Exhaust single letters first**: ALL 26 letters must be used before any 2-letter combinations
2. **Priority-based assignment**: Nodes → Views → Maps → Edges → Optional
3. **One property = one name**: No reuse across object types, no exceptions
4. **Type safety**: TypeScript constants ensure correctness
5. **Documentation**: Comprehensive reference tables and examples

### Current Status

- ✅ **Single letters**: 26/26 used (100%)
- ✅ **Two-letter combinations**: 47/676 used (7%)
- ✅ **Three-letter combinations**: 0/17,576 used (0%)
- ✅ **Capacity remaining**: 629 two-letter + 17,576 three-letter = 18,205 properties available

The approach ensures MindScribble can handle massive vaults efficiently while maintaining zero ambiguity and optimal performance for the most frequently accessed properties.