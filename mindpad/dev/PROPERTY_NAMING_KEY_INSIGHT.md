# Property Naming Strategy - Key Insight: Hierarchical Edges

## The Critical Realization

**In hierarchical structures, edges are as frequently accessed as nodes themselves.**

### Why This Matters

In a tree/hierarchy with **N nodes**, there are **N-1 hierarchical edges** (parent-child relationships).

**Example**: 1000-node mind map
- **Nodes**: 1000
- **Hierarchical edges**: 999 (every node except root has a parent edge)
- **Access frequency**: Nearly identical!

### Impact on Property Naming

**Before**: Edges were Priority 4 (after nodes, views, and maps)
**After**: Hierarchical edges are Priority 1B (alongside nodes)

## Updated Priority Order

### Priority 1: Hot Path (Most Frequently Accessed) - 14 letters

#### Priority 1A: Basic Node Properties (10 letters)
```typescript
i = NODE_ID
p = NODE_PARENT_ID
t = NODE_TITLE
c = NODE_CONTENT
o = NODE_ORDER
y = NODE_TYPE
x = NODE_POSITION_X
z = NODE_POSITION_Y
r = NODE_CREATED
m = NODE_MODIFIED
```

#### Priority 1B: Hierarchical Edge Properties (4 letters)
```typescript
e = EDGE_ID
q = EDGE_SOURCE
w = EDGE_TARGET
g = EDGE_TYPE
```

### Priority 2: View-Specific Node Properties (3 letters)
```typescript
s = NODE_VIEW_SIDE
l = NODE_VIEW_COLLAPSED
d = NODE_VIEW_EXPANDED
```

### Priority 3: Map/Document Properties (5 letters)
```typescript
f = MAP_ID
n = MAP_NAME
a = MAP_CREATED
u = MAP_MODIFIED
v = MAP_VERSION
```

### Priority 4: Inter-Map Link Properties (4 letters)
```typescript
k = LINK_ID
h = LINK_SOURCE
j = LINK_TARGET_MAP
b = LINK_TARGET_NODE
```

**Total**: 10 + 4 + 3 + 5 + 4 = **26 single letters** ✓

## Performance Impact

### Storage Efficiency
Every hierarchical edge now uses **1 byte** per property instead of **2 bytes**.

**Example**: 1000-node mind map with 999 edges
- **Old way** (2-letter edge properties): 999 edges × 4 properties × 2 bytes = **7,992 bytes**
- **New way** (1-letter edge properties): 999 edges × 4 properties × 1 byte = **3,996 bytes**
- **Savings**: **50% reduction** in edge property storage

### Access Speed
- **Hierarchical traversal**: Faster (1-byte property names)
- **Parent-child navigation**: Faster (1-byte property names)
- **Tree operations**: Faster (1-byte property names)

## Key Distinction

### Hierarchical Edges (Priority 1B) - Single Letters
- **Parent-child relationships** in the tree structure
- **Frequency**: N-1 edges for N nodes
- **Access pattern**: Every node operation involves parent edge
- **Properties**: `e`, `q`, `w`, `g` (4 letters)

### Inter-Map Links (Priority 4) - Single Letters
- **Cross-document references** between different maps
- **Frequency**: Much less frequent than hierarchical edges
- **Access pattern**: Only when following cross-map links
- **Properties**: `k`, `h`, `j`, `b` (4 letters)

### Optional Edge Properties - Two Letters
- **Metadata and styling** for edges
- **Frequency**: Not always present
- **Properties**: `sh`, `th`, `ey`, `el`, `eb`, `er`, `em` (7 two-letter combinations)

## Conclusion

This insight ensures that the **most frequently accessed data structures** (nodes AND hierarchical edges) get the **shortest possible property names** (1 byte each), maximizing both storage efficiency and access speed.

### Summary
- ✅ **Nodes**: 10 single-letter properties (Priority 1A)
- ✅ **Hierarchical Edges**: 4 single-letter properties (Priority 1B)
- ✅ **Views**: 3 single-letter properties (Priority 2)
- ✅ **Maps**: 5 single-letter properties (Priority 3)
- ✅ **Inter-Map Links**: 4 single-letter properties (Priority 4)
- ✅ **Optional Properties**: 51 two-letter combinations
- ✅ **Total Capacity**: 26/26 single letters used, 625 two-letter combinations available

**Result**: Maximum performance for the hot path (nodes + hierarchical edges) while maintaining massive scalability.

