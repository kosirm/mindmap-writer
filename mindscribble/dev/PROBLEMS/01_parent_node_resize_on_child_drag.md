# Problem: Parent Node Does Not Resize When Child Is Dragged Down

## Summary
In ConceptMapView, parent nodes should automatically resize to contain their children when children are dragged. Currently:
- **Right edge**: Expands during drag (VueFlow's `expandParent` works), but reverts after drag stops
- **Bottom edge**: Does NOT expand at all - completely fixed
- **Left edge**: Behaves strangely - moves children and resizes on wrong side

## Root Cause Analysis

VueFlow's `expandParent: true` property on child nodes:
1. Only **expands** parent during drag (never shrinks)
2. VueFlow manages dimensions internally and **overwrites** any programmatic size changes we make
3. With `v-model:nodes` (two-way binding), our changes to `vueFlowNodes.value` get immediately overwritten by VueFlow's internal state

**Evidence from logs:**
```
[onNodeDragStop] Synced parent size from VueFlow: 361x199
[adjustParentSize] Setting parent size: 361x219 (was 361x199)  <- We calculate correct size
[buildVueFlowNodes] Parent: 361x219                            <- We set it!
[onNodesChange] Parent expanded to 361x224                     <- VueFlow overwrites!
```

## Approaches Tried (All Unsuccessful)

### 1. Computed vueFlowNodes
- Constantly overwrites VueFlow's internal state during drag
- Result: Glitchy, unusable

### 2. Using `updateNode` API
- VueFlow doesn't apply style changes persistently
- Result: No visible change

### 3. Using `setNodes` to force re-render
- Still gets overwritten by VueFlow's internal dimension management
- Result: Size reverts after drag

### 4. Adding `expandParent: true` on child nodes
- Works during drag for right edge only
- Our final calculated size gets overwritten
- Result: Partial, inconsistent

### 5. Changing to `v-model:nodes` with a ref
- State updates in our ref, but VueFlow visual reverts
- Result: State/visual mismatch

### 6. Updating nodes in place (mutating existing objects)
- Same issue - VueFlow manages its own internal dimensions
- Result: No change

### 7. Setting both `width`/`height` node properties AND `style`
- VueFlow Node interface shows these should work
- Still overridden by VueFlow's internal state
- Result: No change

### 8. Using `nodes.value = [...nodes.value]` to force reactivity
- Doesn't help because VueFlow's internal state is separate
- Result: No change

## Why expandParent Is Not Suitable

1. **Only expands, never shrinks** - we need full resize control
2. **Deeply nested nodes become glitchy** - user reported this
3. **Fights with programmatic changes** - we can't apply AABB results
4. **Inconsistent behavior** - different edges behave differently
5. **No control over timing** - we want resize on drop, not during drag

## Proposed Solution: Manual Control with updateNodeInternals

Instead of relying on `expandParent`, we should:

1. **Remove `expandParent: true`** from child nodes entirely
2. **Use one-way binding** (`:nodes` instead of `v-model:nodes`)
3. **Calculate parent size ourselves** using existing `adjustParentSize` / AABB logic
4. **Apply size via style** on our controlled nodes array
5. **Call `updateNodeInternals(parentId)`** to force VueFlow to recognize new dimensions

### Implementation Plan

```typescript
// In useVueFlow destructuring, add:
const { updateNodeInternals } = useVueFlow()

// In onNodeDragStop:
function onNodeDragStop(event: NodeDragEvent) {
  // 1. Update positions
  event.nodes.forEach(vfNode => {
    const node = nodes.value.find(n => n.id === vfNode.id)
    if (node) {
      node.conceptMapPosition = { x: vfNode.position.x, y: vfNode.position.y }
    }
  })

  // 2. Run AABB collision resolution (this calls adjustParentSize)
  event.nodes.forEach(vfNode => {
    const node = nodes.value.find(n => n.id === vfNode.id)
    if (node) {
      resolveOverlapsForNode(node.id)
    }
  })

  // 3. Rebuild VueFlow nodes with new sizes
  buildVueFlowNodes()

  // 4. Force VueFlow to recognize dimension changes on parents
  const parentIds = new Set<string>()
  event.nodes.forEach(vfNode => {
    const node = nodes.value.find(n => n.id === vfNode.id)
    if (node?.parentId) parentIds.add(node.parentId)
  })
  parentIds.forEach(parentId => {
    updateNodeInternals(parentId)
  })

  // 5. Sync to store
  syncToStore()
}
```

### Key Changes Needed

1. **Remove `expandParent: true`** from `buildVueFlowNodes()`
2. **Switch from `v-model:nodes` to `:nodes`** in template
3. **Add `updateNodeInternals`** to useVueFlow destructuring
4. **Call `updateNodeInternals`** after size changes

### Alternative: Use `setNodes` with complete replacement

If `updateNodeInternals` doesn't work, try completely replacing the nodes array:

```typescript
import { setNodes } from '@vue-flow/core' // or from useVueFlow

// After calculating new sizes:
setNodes(buildVueFlowNodesArray())
```

## Files Involved

- `mindscribble/quasar/src/features/canvas/components/conceptmap/ConceptMapView.vue` - Main component
- `mindscribble/quasar/src/features/canvas/composables/conceptmap/useConceptMapCollision.ts` - AABB/resize logic

## References

- VueFlow Actions API: https://vueflow.dev/typedocs/interfaces/Actions.html
- VueFlow Node interface: https://vueflow.dev/typedocs/interfaces/Node.html
- VueFlow nested nodes example: https://vueflow.dev/examples/nodes/nesting.html

