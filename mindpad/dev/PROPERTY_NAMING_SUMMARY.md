# Property Naming Strategy - Executive Summary

## What Changed

The property naming strategy has been **completely revised** based on three critical requirements:

1. ✅ **Use ALL 26 single letters before any 2-letter combinations**
2. ✅ **Priority-based assignment**: Most frequently accessed properties get shortest names
3. ✅ **One property = one name**: NO exceptions, even for semantically similar properties

## Critical Rules

### Rule 1: Exhaust Single Letters First
- **MUST use ALL 26 single letters (a-z) before using any 2-letter combinations**
- Status: ✅ 26/26 single letters used (100%)

### Rule 2: One Property = One Name
- **Each letter can only be used for ONE property across ALL object types**
- **NO EXCEPTIONS** - even for properties with same semantic meaning
- Example: `i` for NODE_ID, `f` for MAP_ID (NOT both using `i`)

### Rule 3: Priority-Based Assignment
Assign letters based on access frequency:
1. **Priority 1A**: Basic node properties (10 letters) - most frequently accessed
2. **Priority 1B**: Hierarchical edge properties (4 letters) - equally frequent (every node has parent edge)
3. **Priority 2**: View-specific node properties (3 letters)
4. **Priority 3**: Map/document properties (5 letters)
5. **Priority 4**: Inter-map link properties (4 letters) - less frequent than hierarchical edges
6. **Priority 5**: Optional/metadata properties (2-letter combinations)

**Key Insight**: In hierarchical structures, edges are as frequent as nodes. With N nodes, there are N-1 hierarchical edges.

## Current Assignments

### Single Letters (26/26 USED)

**Priority 1A: Basic Node Properties (10 letters)**
- `i` = NODE_ID
- `p` = NODE_PARENT_ID
- `t` = NODE_TITLE
- `c` = NODE_CONTENT
- `o` = NODE_ORDER
- `y` = NODE_TYPE
- `x` = NODE_POSITION_X
- `z` = NODE_POSITION_Y
- `r` = NODE_CREATED
- `m` = NODE_MODIFIED

**Priority 1B: Hierarchical Edge Properties (4 letters)**
- `e` = EDGE_ID
- `q` = EDGE_SOURCE
- `w` = EDGE_TARGET
- `g` = EDGE_TYPE

**Priority 2: View-Specific Node Properties (3 letters)**
- `s` = NODE_VIEW_SIDE
- `l` = NODE_VIEW_COLLAPSED
- `d` = NODE_VIEW_EXPANDED

**Priority 3: Map/Document Properties (5 letters)**
- `f` = MAP_ID
- `n` = MAP_NAME
- `a` = MAP_CREATED
- `u` = MAP_MODIFIED
- `v` = MAP_VERSION

**Priority 4: Inter-Map Link Properties (4 letters)**
- `k` = LINK_ID
- `h` = LINK_SOURCE
- `j` = LINK_TARGET_MAP
- `b` = LINK_TARGET_NODE

### Two-Letter Combinations (51/676 USED)

Optional properties use 2-letter combinations:
- Node optional: `co`, `ic`, `ag`, `ap`, `as`
- Map optional: `ds`, `ta`, `st`, `ec`, `md`, `nc`
- Layout: `av`, `or`, `le`, `lt`, `hs`, `vs`
- Views: `mx`, `my`, `cw`, `ch`, `ts`, `te`, `tl`, `kc`, `ko`
- Edges optional: `sh`, `th`, `ey`, `el`, `eb`, `er`, `em`
- Links optional: `lb`, `lc`, `mn`, `nt`
- AI: `at`, `au`, `aa`, `al`

## Storage Efficiency

### Size Comparison
- **Single letter**: 1 byte (e.g., `i`)
- **Two letters**: 2 bytes (e.g., `co`)
- **Readable name**: 5-15 bytes (e.g., `parentId` = 8 bytes)

### Savings Example (1000 nodes)
- Old way: `parentId` (8 bytes) × 1000 = 8,000 bytes
- New way: `p` (1 byte) × 1000 = 1,000 bytes
- **Savings: 87.5%** per property

### Total Capacity
- Single letters: 26 (ALL USED ✓)
  - Priority 1A (Nodes): 10 letters
  - Priority 1B (Hierarchical Edges): 4 letters
  - Priority 2 (Views): 3 letters
  - Priority 3 (Maps): 5 letters
  - Priority 4 (Inter-Map Links): 4 letters
- Two-letter combinations: 676 (51 used, 625 available)
- Three-letter combinations: 17,576 (none used yet)
- **Total remaining**: 18,201 properties available

## Performance Benefits

1. **Hot path optimization**: Node AND hierarchical edge operations (most frequent) use 1-byte property names
2. **Hierarchical insight**: In tree structures with N nodes, there are N-1 edges - equally frequent!
3. **Smaller storage**: 80-90% reduction in property name size
4. **Faster I/O**: Less data to read/write from IndexedDB
5. **Better caching**: More data fits in memory
6. **Faster sync**: Less data to transfer to Google Drive

## Developer Experience

1. **Type safety**: TypeScript constants (`PROP.NODE_ID`) ensure correctness
2. **Zero ambiguity**: Each letter maps to exactly ONE property
3. **Clear documentation**: Comprehensive reference tables
4. **Easy debugging**: Clear mapping between short and long names
5. **Simple migration**: Add new properties without conflicts

## Next Steps

1. Create `src/core/constants/propertyNames.ts` with all PROP constants
2. Implement serialization/deserialization functions
3. Write data migration script for existing IndexedDB data
4. Update storage layer to use new property names
5. Add validation to prevent future conflicts
6. Update tests with new property names

## Files Updated

- ✅ `mindpad/dev/PROPERTY_NAMING_STRATEGY.md` - Complete strategy document
- ✅ `mindpad/dev/PROPERTY_NAMING_CHANGES.md` - Detailed change log
- ✅ `mindpad/dev/PROPERTY_NAMING_SUMMARY.md` - This executive summary

