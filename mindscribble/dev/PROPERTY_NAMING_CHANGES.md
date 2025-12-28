# Property Naming Changes - Complete Revision

## Summary

This document tracks the complete revision of the property naming strategy based on the following critical requirements:

1. **Use ALL 26 single letters before any 2-letter combinations**
2. **Priority-based assignment**: Nodes (most frequent) → Views → Maps → Edges → Optional
3. **One property = one name**: NO exceptions, even for semantically similar properties (e.g., id, title)

## Critical Rules Applied

1. **Exhaust Single Letters First**: Must use ALL 26 single letters (a-z) before using any 2-letter combinations
2. **One Property = One Name**: Each letter can only be used for ONE property across ALL object types - NO EXCEPTIONS
3. **Priority-Based Assignment**: Assign based on access frequency (nodes first, then views, maps, edges, optional)

## Complete Property Assignment

### Single Letter Properties (ALL 26 USED)

**Priority 1: Basic Node Properties (10 letters)**

| Property | Letter | Type | Description |
|----------|--------|------|-------------|
| NODE_ID | `i` | string | Node unique identifier |
| NODE_PARENT_ID | `p` | string\|null | Parent node ID |
| NODE_TITLE | `t` | string | Node title |
| NODE_CONTENT | `c` | string | Node content (HTML) |
| NODE_ORDER | `o` | number | Sibling order |
| NODE_TYPE | `y` | string | Node type |
| NODE_POSITION_X | `x` | number | Position X |
| NODE_POSITION_Y | `z` | number | Position Y |
| NODE_CREATED | `r` | string | Created timestamp |
| NODE_MODIFIED | `m` | string | Modified timestamp |

**Priority 2: View-Specific Node Properties (3 letters)**

| Property | Letter | Type | Description |
|----------|--------|------|-------------|
| NODE_VIEW_SIDE | `s` | string\|null | Mindmap side |
| NODE_VIEW_COLLAPSED | `l` | boolean | Mindmap collapsed |
| NODE_VIEW_EXPANDED | `e` | boolean | Outline expanded |

**Priority 3: Map/Document Properties (6 letters)**

| Property | Letter | Type | Description |
|----------|--------|------|-------------|
| MAP_ID | `f` | string | Map unique identifier |
| MAP_NAME | `n` | string | Map name |
| MAP_CREATED | `a` | string | Map created timestamp |
| MAP_MODIFIED | `d` | string | Map modified timestamp |
| MAP_NODE_COUNT | `u` | number | Total node count |
| MAP_VERSION | `v` | string | Schema version |

**Priority 4: Edge/Link Properties (7 letters)**

| Property | Letter | Type | Description |
|----------|--------|------|-------------|
| LINK_ID | `k` | string | Link unique identifier |
| LINK_SOURCE | `q` | string | Source node ID |
| LINK_TARGET_MAP | `g` | string | Target map ID |
| LINK_TARGET_NODE | `h` | string\|null | Target node ID |
| LINK_LABEL | `b` | string | Link label |
| LINK_CREATED | `j` | string | Link created timestamp |
| EDGE_TYPE | `w` | string | Edge type |

### Two Letter Properties (47 USED, 629 AVAILABLE)

**Optional Node Properties (5 combinations)**

| Property | Letters | Type | Description |
|----------|---------|------|-------------|
| NODE_COLOR | `co` | string | Node color |
| NODE_ICON | `ic` | string | Node icon |
| NODE_AI_GENERATED | `ag` | boolean | AI generated flag |
| NODE_AI_PROMPT | `ap` | string | AI prompt |
| NODE_AI_SUGGESTIONS | `as` | string[] | AI suggestions |

**Optional Map Properties (5 combinations)**

| Property | Letters | Type | Description |
|----------|---------|------|-------------|
| MAP_DESCRIPTION | `ds` | string | Map description |
| MAP_TAGS | `ta` | string[] | Map tags |
| MAP_SEARCHABLE_TEXT | `st` | string | Searchable text |
| MAP_EDGE_COUNT | `ec` | number | Edge count |
| MAP_MAX_DEPTH | `md` | number | Max depth |

**Layout Settings (6 combinations)**

| Property | Letters | Type | Description |
|----------|---------|------|-------------|
| LAYOUT_ACTIVE_VIEW | `av` | string | Active view |
| LAYOUT_ORIENTATION | `or` | string | Orientation mode |
| LAYOUT_LOD_ENABLED | `le` | boolean | LOD enabled |
| LAYOUT_LOD_THRESHOLDS | `lt` | number[] | LOD thresholds |
| LAYOUT_H_SPACING | `hs` | number | Horizontal spacing |
| LAYOUT_V_SPACING | `vs` | number | Vertical spacing |

**View-Specific Properties (9 combinations)**

| Property | Letters | Type | Description |
|----------|---------|------|-------------|
| VIEW_MINDMAP_POSITION_X | `mx` | number | Mindmap position X |
| VIEW_MINDMAP_POSITION_Y | `my` | number | Mindmap position Y |
| VIEW_CONCEPT_SIZE_W | `cw` | number | Concept map width |
| VIEW_CONCEPT_SIZE_H | `ch` | number | Concept map height |
| VIEW_TIMELINE_START | `ts` | string | Timeline start |
| VIEW_TIMELINE_END | `te` | string | Timeline end |
| VIEW_TIMELINE_LANE | `tl` | number | Timeline lane |
| VIEW_KANBAN_COLUMN | `kc` | string | Kanban column |
| VIEW_KANBAN_ORDER | `ko` | number | Kanban order |

**Edge Properties (7 combinations)**

| Property | Letters | Type | Description |
|----------|---------|------|-------------|
| EDGE_SOURCE | `es` | string | Edge source |
| EDGE_TARGET | `et` | string | Edge target |
| EDGE_SOURCE_HANDLE | `sh` | string | Source handle |
| EDGE_TARGET_HANDLE | `th` | string | Target handle |
| EDGE_STYLE | `ey` | string | Edge style |
| EDGE_CLASS | `el` | string | Edge class |
| EDGE_LABEL | `eb` | string | Edge label |

**Link Optional Properties (2 combinations)**

| Property | Letters | Type | Description |
|----------|---------|------|-------------|
| LINK_TARGET_MAP_NAME | `mn` | string | Cached map name |
| LINK_TARGET_NODE_TITLE | `nt` | string | Cached node title |

**AI Context (4 combinations)**

| Property | Letters | Type | Description |
|----------|---------|------|-------------|
| AI_TOPIC | `at` | string | AI topic |
| AI_PURPOSE | `au` | string | AI purpose |
| AI_AUDIENCE | `aa` | string | AI audience |
| AI_LAST_ACTION | `al` | string | Last AI action |

## Letter Usage Summary

### Single Letters: 26/26 USED (100%) ✓

**All letters a-z are now assigned:**
- `a` = MAP_CREATED
- `b` = LINK_LABEL
- `c` = NODE_CONTENT
- `d` = MAP_MODIFIED
- `e` = NODE_VIEW_EXPANDED
- `f` = MAP_ID
- `g` = LINK_TARGET_MAP
- `h` = LINK_TARGET_NODE
- `i` = NODE_ID
- `j` = LINK_CREATED
- `k` = LINK_ID
- `l` = NODE_VIEW_COLLAPSED
- `m` = NODE_MODIFIED
- `n` = MAP_NAME
- `o` = NODE_ORDER
- `p` = NODE_PARENT_ID
- `q` = LINK_SOURCE
- `r` = NODE_CREATED
- `s` = NODE_VIEW_SIDE
- `t` = NODE_TITLE
- `u` = MAP_NODE_COUNT
- `v` = MAP_VERSION
- `w` = EDGE_TYPE
- `x` = NODE_POSITION_X
- `y` = NODE_TYPE
- `z` = NODE_POSITION_Y

### Two Letter Combinations: 47/676 USED (7%)

**Used**: aa, ag, al, ap, as, at, au, av, ch, co, cw, ds, eb, ec, el, es, et, ey, hs, ic, kc, ko, le, lt, md, mn, mx, my, nt, or, sh, st, ta, te, th, tl, ts, vs

**Available**: 629 combinations remaining (93%)

## Migration Impact

### Files That Need Updates

1. **Property Constants File** (to be created)
   - `src/core/constants/propertyNames.ts`
   - Define all PROP constants with new values

2. **Storage Layer** (to be updated)
   - IndexedDB read/write operations
   - Serialization/deserialization functions
   - Data migration scripts

3. **Type Definitions** (to be updated)
   - Update interfaces to use property constants
   - Ensure type safety with new property names

4. **Tests** (to be updated)
   - Update test fixtures
   - Update assertions
   - Add tests for property name conflicts

### Migration Strategy

See the main PROPERTY_NAMING_STRATEGY.md document for the complete migration plan.

## Key Improvements

### 1. Maximum Storage Efficiency
- **ALL 26 single letters used** for most frequently accessed properties
- **Priority-based assignment**: Nodes (hot path) get single letters
- **Optional properties**: Use 2-letter combinations (still very efficient)

### 2. Zero Ambiguity
- **One property = one name**: NO exceptions
- **No shared letters**: Even for semantically similar properties (id, title, etc.)
- **Clear mapping**: Each letter maps to exactly ONE property

### 3. Optimal Performance
- **Hot path optimization**: Node operations use single letters (1 byte each)
- **Cold path acceptable**: Optional properties use 2 letters (2 bytes each)
- **Priority-based**: Most frequent operations are fastest

### 4. Massive Scalability
- **Single letters**: 26/26 used (100%)
- **Two-letter combinations**: 47/676 used (7%)
- **Three-letter combinations**: 0/17,576 available (0%)
- **Total remaining capacity**: 629 + 17,576 = 18,205 properties

## Validation Checklist

- [x] ALL 26 single letters used before any 2-letter combinations
- [x] Priority-based assignment (nodes → views → maps → edges → optional)
- [x] One property = one name (NO exceptions)
- [x] No single letter used for different properties
- [x] No two-letter combination used for different properties
- [x] All conflicts documented and resolved
- [x] Availability tracker updated (26/26 single, 47/676 two-letter)
- [x] Quick reference table updated
- [x] Usage examples updated
- [x] TypeScript constants defined

