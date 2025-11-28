# MindMap Layout Engine - Quick Reference

## 🚀 Quick Start

### Essential Files to Copy
```
src/
├── types.ts                     # TypeScript interfaces
├── layout.ts                    # Layout algorithm
└── components/
    ├── CustomNode.vue          # Node component
    └── LodBadgeNode.vue        # LOD badge component
```

### Essential Functions to Extract from App.vue
```javascript
// Data
const nodes = ref<NodeData[]>([])
const vueFlowNodes = ref<Node[]>([])

// LOD
const lodEnabled = ref(false)
const lodThresholds = ref<number[]>([10, 30, 50, 70, 90])
const maxZoom = computed(() => { /* dynamic max zoom */ })

// Core Functions
function syncToVueFlow() { /* convert nodes to VueFlow */ }
function getVisibleNodesForLOD() { /* filter by zoom */ }
function handleZoomChange(newZoom) { /* lazy calculation */ }
function getNodeDepth(nodeId) { /* calculate depth */ }
```

---

## 📊 LOD System

### How It Works
```
Zoom < 10%  → Show depth 0 (roots only)
Zoom < 30%  → Show depth 0-1
Zoom < 50%  → Show depth 0-2
Zoom < 70%  → Show depth 0-3
Zoom >= 90% → Show all nodes
```

### Configuration
```javascript
// Enable LOD
lodEnabled.value = true

// Set thresholds (percentages)
lodThresholds.value = [10, 30, 50, 70, 90]

// Add level (+20%)
lodThresholds.value.push(110)

// Reset to defaults
resetLodLevels()
```

---

## 🎯 Common Operations

### Add Node
```javascript
const newNode = createNode(label, parentId, x, y)
nodes.value.push(newNode)
resolveAllOverlaps(nodes.value)
syncToVueFlow()
```

### Delete Node
```javascript
const descendants = getAllDescendants(nodeId, nodes.value)
const idsToDelete = new Set([nodeId, ...descendants.map(n => n.id)])
nodes.value = nodes.value.filter(n => !idsToDelete.has(n.id))
syncToVueFlow()
```

### Toggle Collapse
```javascript
node.collapsed = !node.collapsed
syncToVueFlow()  // No layout recalculation needed
```

### Handle Drag
```javascript
function onNodeDragStop(event) {
  event.nodes.forEach(vfNode => {
    const node = nodes.value.find(n => n.id === vfNode.id)
    if (node) {
      node.x = vfNode.position.x
      node.y = vfNode.position.y
      node.isDirty = true
    }
  })
  resolveAllOverlaps(nodes.value)
  syncToVueFlow()
}
```

---

## ⚡ Performance Tips

### 1. Enable LOD for Large Trees
```javascript
if (nodes.value.length > 100) {
  lodEnabled.value = true
}
```

### 2. Use Lazy Calculation
```javascript
// ✓ Good - Only dirty nodes
handleZoomChange(newZoom)

// ✗ Bad - All nodes
resolveAllOverlaps(nodes.value)
```

### 3. Set Low Initial Thresholds
```javascript
// ✓ Good - Start at 10%
lodThresholds.value = [10, 30, 50, 70, 90]

// ✗ Bad - Start at 50%
lodThresholds.value = [50, 100, 150, 200]
```

---

## 🎨 Styling

### LOD Badge Colors
**File:** `components/LodBadgeNode.vue`

```css
.lod-badge-node {
  background: linear-gradient(135deg, 
    rgba(255, 212, 59, 0.9) 0%,    /* Yellow */
    rgba(250, 176, 5, 0.9) 100%);  /* Orange */
  border: 3px solid #fab005;
}

.badge-count {
  font-size: 64px;  /* Make larger for better visibility */
  color: #862e9c;   /* Purple */
}
```

### Node Styling
**File:** `components/CustomNode.vue`

```css
.custom-node {
  background: white;
  border: 2px solid #dee2e6;
  padding: 8px;
  border-radius: 4px;
}

.custom-node:hover {
  border-color: #4dabf7;  /* Blue on hover */
}
```

---

## 🔧 Configuration

### Layout Spacing
```javascript
const horizontalSpacing = ref(0)  // 0-50px
const verticalSpacing = ref(0)    // 0-50px

setLayoutSpacing(horizontalSpacing.value, verticalSpacing.value)
```

### Viewport
```javascript
const minZoom = 0.05  // 5%
const maxZoom = computed(() => {
  const lastThreshold = lodThresholds.value[lodThresholds.value.length - 1]
  return Math.min(Math.max((lastThreshold + 20) / 100, 2.0), 5.0)
})
```

### Keyboard Shortcuts
```javascript
// Ctrl+ : Zoom in 1%
// Ctrl- : Zoom out 1%

function handleKeyDown(event: KeyboardEvent) {
  if (event.ctrlKey && (event.key === '+' || event.key === '=')) {
    event.preventDefault()
    const newZoom = Math.min(viewport.value.zoom + 0.01, maxZoom.value)
    setViewport({ x: viewport.value.x, y: viewport.value.y, zoom: newZoom })
  }
  if (event.ctrlKey && event.key === '-') {
    event.preventDefault()
    const newZoom = Math.max(viewport.value.zoom - 0.01, 0.05)
    setViewport({ x: viewport.value.x, y: viewport.value.y, zoom: newZoom })
  }
}
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Nodes not appearing with LOD | Check `getVisibleNodesForLOD()` logic uses `>=` not `<` |
| Performance issues | Enable LOD, lower zoom, check `only-render-visible-elements` |
| Nodes overlapping | Call `resolveAllOverlaps()` after changes |
| Badges not visible | Register `LodBadgeNode` in template, check badge creation |
| Can't zoom in enough | Use dynamic `maxZoom` computed property |
| Collapse state lost | Filter collapsed branches in `syncToVueFlow()` |

---

## 📈 Performance Metrics

| Scenario | Nodes | Visible | Collision Checks | Performance |
|----------|-------|---------|------------------|-------------|
| No LOD | 1000 | 1000 | 1,000,000 | ❌ Freezes |
| LOD at 10% | 1000 | 10 | 100 | ✅ Smooth |
| LOD at 50% | 1000 | 50 | 2,500 | ✅ Smooth |
| LOD at 90% | 1000 | 200 | 40,000 | ✅ Good |

---

## 📚 Key Concepts

- **LOD Level:** Determines which depth levels are visible at current zoom
- **Bounding Box:** Rectangle encompassing node + all descendants
- **Lazy Calculation:** Only calculate positions for newly visible nodes
- **Dirty Flag:** Marks nodes needing position recalculation
- **Tree Depth:** Distance from root (root=0, children=1, etc.)

---

**For detailed documentation, see DOCUMENTATION.md**

