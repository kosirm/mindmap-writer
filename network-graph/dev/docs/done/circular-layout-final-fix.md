# Circular Layout Final Fix - Session Documentation

## Date: 2025-12-18
## Task: Complete the circular layout integration by fixing test page event handlers

## Root Cause Analysis

After fixing the parameter extraction in `DagreTestControls.vue`, the circular layout still wasn't working because **the test pages are hardcoded to only use `dagreService.applyDagreToSelected()`** regardless of the layout type.

### The Problem

Both `TestMindMap.vue` and `TestConceptMap.vue` have event handlers that:

1. **Always call tree layout function**: They only use `dagreService.applyDagreToSelected()`
2. **Ignore layout type**: They don't check `detail.config.type`
3. **Use wrong method for circular**: Circular layouts need `applyCircularToSelected()` or `applyCircularToEntireGraph()`

### Current Broken Code (lines 903-909 in TestMindMap.vue):

```typescript
const success = dagreService.applyDagreToSelected(
  nodes.value,
  edges.value,
  layouts.value,
  selectedNodeId,
  detail.params  // ← This contains tree params even for circular layouts!
)
```

### What Happens:
1. User selects 'Circular' layout
2. DagreTestControls sends correct circular params
3. Test page receives event with circular layout type
4. **Test page ignores layout type and calls tree layout function**
5. Tree layout function receives circular params but processes them as tree layout
6. Result: Tree layout with default values (rankdir TB, align UL)

## Complete Solution

### Fix Required in TestMindMap.vue

Replace the `handleDagreLayoutRequest` function with:

```typescript
// Handle dagre layout requests from the test controls
function handleDagreLayoutRequest(event: CustomEvent) {
  const detail = event.detail
  if (!detail || !detail.config) return

  console.log('Received dagre layout request:', detail)

  // Check layout type and call appropriate method
  if (detail.config.type === 'circular') {
    handleCircularLayout(detail)
  } else if (detail.config.type === 'tree') {
    handleTreeLayout(detail)
  } else {
    $q.notify({
      type: 'warning',
      message: `Layout type '${detail.config.type}' not supported yet`,
      timeout: 1500,
    })
  }
}

// Handle circular layout
function handleCircularLayout(detail: any) {
  if (detail.target === 'selected-node') {
    // Apply circular layout to currently selected node
    if (selectedNodes.value.length === 1) {
      const selectedNodeId = selectedNodes.value[0]
      if (selectedNodeId) {
        const success = dagreService.applyCircularToSelected(
          nodes.value,
          edges.value,
          layouts.value,
          selectedNodeId,
          detail.params
        )
        
        if (success) {
          $q.notify({
            type: 'positive',
            message: 'Applied circular layout to selected node',
            timeout: 1000,
          })
        }
      }
    } else {
      $q.notify({
        type: 'warning',
        message: 'Please select exactly one node for circular layout',
        timeout: 1500,
      })
    }
  } else if (detail.target === 'entire-graph') {
    // Apply circular layout to entire graph
    const success = dagreService.applyCircularToEntireGraph(
      nodes.value,
      edges.value,
      layouts.value,
      0, // centerX
      0, // centerY
      detail.params
    )
    
    if (success) {
      $q.notify({
        type: 'positive',
        message: 'Applied circular layout to entire graph',
        timeout: 1000,
      })
    }
  }
}

// Handle tree layout (existing logic)
function handleTreeLayout(detail: any) {
  if (detail.target === 'selected-node') {
    // Apply to currently selected node
    if (selectedNodes.value.length === 1) {
      const selectedNodeId = selectedNodes.value[0]
      if (selectedNodeId) {
        const success = dagreService.applyDagreToSelected(
          nodes.value,
          edges.value,
          layouts.value,
          selectedNodeId,
          detail.params
        )
        
        if (success) {
          $q.notify({
            type: 'positive',
            message: `Applied ${detail.params.rankdir} layout to selected node`,
            timeout: 1000,
          })
        }
      }
    } else {
      $q.notify({
        type: 'warning',
        message: 'Please select exactly one node for layout',
        timeout: 1500,
      })
    }
  } else if (detail.target === 'entire-graph') {
    // For entire graph, find root nodes (nodes with no parents)
    const rootNodes = Object.values(nodes.value).filter(node => node.parentId === null)
    
    if (rootNodes.length === 0) {
      $q.notify({
        type: 'warning',
        message: 'No root nodes found',
        timeout: 1500,
      })
      return
    }
    
    // Apply layout to each root node
    let appliedCount = 0
    rootNodes.forEach(rootNode => {
      const rootId = Object.keys(nodes.value).find(key => nodes.value[key] === rootNode)
      if (rootId) {
        const success = dagreService.applyDagreToSelected(
          nodes.value,
          edges.value,
          layouts.value,
          rootId,
          detail.params
        )
        if (success) appliedCount++
      }
    })
    
    $q.notify({
      type: 'positive',
      message: `Applied ${detail.params.rankdir} layout to ${appliedCount} root node(s)`,
      timeout: 1500,
    })
  }
}
```

### Fix Required in TestConceptMap.vue

Apply the **same changes** to `TestConceptMap.vue` - the event handler needs to:

1. Check `detail.config.type`
2. Call `handleCircularLayout()` for circular layouts
3. Call `handleTreeLayout()` for tree layouts
4. Use appropriate service methods (`applyCircularToSelected`, `applyCircularToEntireGraph`, `applyDagreToSelected`)

## Expected Behavior After Fix

### For Circular Layout:
- **Selected Node**: Places selected node at center, children in concentric circles around it
- **Entire Graph**: Places all root nodes on inner circle, descendants on progressively larger circles

### For Tree Layout:
- **Selected Node**: Applies Dagre tree layout to selected node and descendants
- **Entire Graph**: Applies Dagre tree layout to all root nodes

## Verification Steps

1. **Test Circular Layout (Selected Node)**:
   - Select a node
   - Choose 'Circular' layout
   - Click "Apply to Selected Node"
   - **Expected**: Selected node at center, children in circles

2. **Test Circular Layout (Entire Graph)**:
   - Create multiple root nodes (nodes with no parent)
   - Choose 'Circular' layout
   - Click "Apply to Entire Graph"
   - **Expected**: Root nodes on inner circle, descendants on outer circles

3. **Test Tree Layout (Should Still Work)**:
   - Select a node
   - Choose 'Tree' layout
   - Click "Apply to Selected Node"
   - **Expected**: Traditional tree layout (rankdir, align settings applied)

## Files to Update

1. **`network-graph/quasar-project/src/pages/TestMindMap.vue`**
   - Replace `handleDagreLayoutRequest` function
   - Add `handleCircularLayout` and `handleTreeLayout` functions

2. **`network-graph/quasar-project/src/pages/TestConceptMap.vue`**
   - Apply identical changes to event handler
   - Same function replacements

## Summary

This is the final piece needed to make circular layouts work properly. The circular layout algorithm was implemented correctly, but the test pages were hardcoded to only use tree layout functions. Now they will properly route circular layout requests to the circular layout functions.

---

## Status: Ready for Implementation
The fix is well-defined and ready to be applied to both test pages.
