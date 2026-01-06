# Property Name Reference Guide

## Quick Reference Table

### Single Letter Properties (Level 1) - ALL 26 LETTERS

**Priority 1A: Basic Node Properties (10 letters)**

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

**Priority 1B: Hierarchical Edge Properties (4 letters)**

| Short | Property | Type | Description |
|-------|----------|------|-------------|
| `e` | EDGE_ID | string | Edge unique identifier |
| `q` | EDGE_SOURCE | string | Source node ID |
| `w` | EDGE_TARGET | string | Target node ID |
| `g` | EDGE_TYPE | string | Edge type ('hierarchy'\|'reference') |

**Priority 2: View-Specific Node Properties (3 letters)**

| Short | Property | Type | Description |
|-------|----------|------|-------------|
| `s` | NODE_VIEW_SIDE | string\|null | Mindmap side ('left'\|'right') |
| `l` | NODE_VIEW_COLLAPSED | boolean | Mindmap collapsed state |
| `d` | NODE_VIEW_EXPANDED | boolean | Outline expanded state |

**Priority 3: Map/Document Properties (5 letters)**

| Short | Property | Type | Description |
|-------|----------|------|-------------|
| `f` | MAP_ID | string | Map/document unique identifier |
| `n` | MAP_NAME | string | Map name |
| `a` | MAP_CREATED | string | Map created timestamp |
| `u` | MAP_MODIFIED | string | Map modified timestamp |
| `v` | MAP_VERSION | string | Schema version |

**Priority 4: Inter-Map Link Properties (4 letters)**

| Short | Property | Type | Description |
|-------|----------|------|-------------|
| `k` | LINK_ID | string | Link unique identifier |
| `h` | LINK_SOURCE | string | Source node ID |
| `j` | LINK_TARGET_MAP | string | Target map ID |
| `b` | LINK_TARGET_NODE | string\|null | Target node ID (optional) |

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
| `nc` | MAP_NODE_COUNT | number | Total node count |

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

**Edge Optional Properties**

| Short | Property | Type | Description |
|-------|----------|------|-------------|
| `sh` | EDGE_SOURCE_HANDLE | string | Source handle |
| `th` | EDGE_TARGET_HANDLE | string | Target handle |
| `ey` | EDGE_STYLE | string | Edge style |
| `el` | EDGE_CLASS | string | Edge CSS class |
| `eb` | EDGE_LABEL | string | Edge label |
| `er` | EDGE_CREATED | string | Created timestamp |
| `em` | EDGE_MODIFIED | string | Modified timestamp |

**Link Optional Properties**

| Short | Property | Type | Description |
|-------|----------|------|-------------|
| `lb` | LINK_LABEL | string | Link label |
| `lc` | LINK_CREATED | string | Created timestamp |
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
1. **Priority 1A**: Basic node properties (10 letters) - most frequently accessed
2. **Priority 1B**: Hierarchical edge properties (4 letters) - equally frequent (every node has parent edge)
3. **Priority 2**: View-specific node properties (3 letters)
4. **Priority 3**: Map/document properties (5 letters)
5. **Priority 4**: Inter-map link properties (4 letters) - less frequent than hierarchical edges
6. **Priority 5**: Optional/metadata properties (use 2-letter combinations)

**Key Insight**: In hierarchical structures, edges are as frequent as nodes. With N nodes, there are N-1 hierarchical edges (parent-child relationships). Therefore, hierarchical edge properties deserve single-letter names alongside node properties.

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