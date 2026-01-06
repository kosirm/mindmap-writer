# Property Naming Strategy - Before vs After

## The Change

**Insight**: In hierarchical structures, edges are as frequently accessed as nodes (N nodes = N-1 edges).

**Action**: Promote hierarchical edge properties from Priority 4 to Priority 1B (alongside nodes).

## Before: Incorrect Priority Order

### Priority Distribution
1. **Priority 1**: Basic node properties (10 letters)
2. **Priority 2**: View-specific node properties (3 letters)
3. **Priority 3**: Map/document properties (6 letters)
4. **Priority 4**: Edge/link properties (7 letters) ❌ **WRONG!**
5. **Priority 5**: Optional properties (2-letter combinations)

### Problems
- ❌ **Hierarchical edges** (N-1 for N nodes) treated same as **inter-map links** (rare)
- ❌ **Edges** got 2-letter properties despite being as frequent as nodes
- ❌ **Performance penalty**: Hot path (edges) using 2-byte property names

## After: Correct Priority Order

### Priority Distribution
1. **Priority 1A**: Basic node properties (10 letters) ✓
2. **Priority 1B**: Hierarchical edge properties (4 letters) ✓ **FIXED!**
3. **Priority 2**: View-specific node properties (3 letters) ✓
4. **Priority 3**: Map/document properties (5 letters) ✓
5. **Priority 4**: Inter-map link properties (4 letters) ✓
6. **Priority 5**: Optional properties (2-letter combinations) ✓

### Benefits
- ✅ **Hierarchical edges** get single-letter properties (1 byte each)
- ✅ **Inter-map links** separated from hierarchical edges (different frequency)
- ✅ **Performance optimized**: Hot path (nodes + edges) uses 1-byte property names
- ✅ **Storage efficient**: 50% reduction in edge property storage

## Detailed Comparison

### Hierarchical Edge Properties

| Property | Before | After | Savings |
|----------|--------|-------|---------|
| EDGE_ID | `es` (2 bytes) | `e` (1 byte) | 50% |
| EDGE_SOURCE | `et` (2 bytes) | `q` (1 byte) | 50% |
| EDGE_TARGET | `sh` (2 bytes) | `w` (1 byte) | 50% |
| EDGE_TYPE | `w` (1 byte) | `g` (1 byte) | 0% |

**Average savings**: 37.5% per property

### Inter-Map Link Properties

| Property | Before | After | Change |
|----------|--------|-------|--------|
| LINK_ID | `k` (1 byte) | `k` (1 byte) | No change |
| LINK_SOURCE | `q` (1 byte) | `h` (1 byte) | Letter changed |
| LINK_TARGET_MAP | `g` (1 byte) | `j` (1 byte) | Letter changed |
| LINK_TARGET_NODE | `h` (1 byte) | `b` (1 byte) | Letter changed |

**Note**: Inter-map links still get single letters (Priority 4), but different letters to avoid conflicts.

### Optional Edge Properties (Moved to 2-Letter)

| Property | Before | After |
|----------|--------|-------|
| EDGE_SOURCE_HANDLE | `sh` | `sh` |
| EDGE_TARGET_HANDLE | `th` | `th` |
| EDGE_STYLE | `ey` | `ey` |
| EDGE_CLASS | `el` | `el` |
| EDGE_LABEL | `eb` | `eb` |
| EDGE_CREATED | N/A | `er` |
| EDGE_MODIFIED | N/A | `em` |

### Optional Link Properties (Moved to 2-Letter)

| Property | Before | After |
|----------|--------|-------|
| LINK_LABEL | `b` (1 byte) | `lb` (2 bytes) |
| LINK_CREATED | `j` (1 byte) | `lc` (2 bytes) |
| LINK_TARGET_MAP_NAME | `mn` | `mn` |
| LINK_TARGET_NODE_TITLE | `nt` | `nt` |

## Storage Impact (1000-node mind map)

### Before
```
Nodes: 1000 nodes × 10 properties × 1 byte = 10,000 bytes
Edges: 999 edges × 4 properties × 1.75 bytes (avg) = 6,993 bytes
Total: 16,993 bytes
```

### After
```
Nodes: 1000 nodes × 10 properties × 1 byte = 10,000 bytes
Edges: 999 edges × 4 properties × 1 byte = 3,996 bytes
Total: 13,996 bytes
```

### Savings
- **Edge storage**: 6,993 → 3,996 bytes (**42.8% reduction**)
- **Total storage**: 16,993 → 13,996 bytes (**17.6% reduction**)

## Letter Usage Summary

### Before
- Single letters: 16/26 used (61.5%)
- Two-letter combinations: 47/676 used (7%)

### After
- Single letters: 26/26 used (100%) ✓
- Two-letter combinations: 51/676 used (7.5%)

## Conclusion

The updated strategy correctly recognizes that **hierarchical edges are as frequent as nodes** in tree structures, and assigns them single-letter property names accordingly. This results in:

1. ✅ **Better performance**: Hot path (nodes + edges) uses 1-byte properties
2. ✅ **Better storage**: 42.8% reduction in edge property storage
3. ✅ **Better organization**: Clear distinction between hierarchical edges (frequent) and inter-map links (rare)
4. ✅ **Maximum efficiency**: ALL 26 single letters used for most frequent properties

**Key Insight**: N nodes = N-1 hierarchical edges → edges deserve Priority 1 alongside nodes!

