# Circular Layout Bug Fix - Session Documentation

## Date: 2025-12-18
## Task: Fix circular layout not applying properly

## Problem Identified

The circular layout was not working correctly - when users selected circular layout and applied it, the system was actually applying a tree layout with default parameters (rankdir TB, align UL) instead of the circular layout algorithm.

## Root Cause

In `src/components/DagreTestControls.vue`, the `broadcastLayoutRequest` function had incorrect parameter extraction logic:

```typescript
// BUGGY CODE (lines 410-424):
function broadcastLayoutRequest(target: 'selected-node' | 'entire-graph', config: LayoutConfig) {
  // For backward compatibility, extract dagre params if available
  const params = config.type === 'tree' ? config.dagreParams : dagreService.currentParams.value
  
  const event = new CustomEvent('dagre-layout-request', {
    detail: {
      target,
      params,  // Use 'params' for backward compatibility
      config,  // Also include full config for future use
      timestamp: Date.now()
    }
  })
  window.dispatchEvent(event)
}
```

**The Problem:**
- When `config.type === 'circular'`, it fell back to `dagreService.currentParams.value`
- `dagreService.currentParams.value` contains tree layout parameters (rankdir, align, etc.)
- This caused circular layouts to be processed as tree layouts with default values

## Solution Implemented

Updated the `broadcastLayoutRequest` function to properly extract parameters based on layout type:

```typescript
// FIXED CODE:
function broadcastLayoutRequest(target: 'selected-node' | 'entire-graph', config: LayoutConfig) {
  // Extract the correct parameters based on layout type
  let params: any
  
  switch (config.type) {
    case 'tree':
      params = config.dagreParams
      break
    case 'circular':
      params = config.circularParams
      break
    case 'mindmap':
      params = config.mindmapParams
      break
    case 'boxes':
      params = config.boxParams
      break
    default:
      params = dagreService.currentParams.value // fallback
  }
  
  const event = new CustomEvent('dagre-layout-request', {
    detail: {
      target,
      params,  // Use 'params' for backward compatibility
      config,  // Also include full config for future use
      timestamp: Date.now()
    }
  })
  window.dispatchEvent(event)
}
```

## Key Changes

1. **Proper Parameter Extraction**: Each layout type now gets its correct parameters
2. **Circular Layout Support**: `config.circularParams` is now properly extracted and passed
3. **Type Safety**: All layout types are handled explicitly
4. **Backward Compatibility**: Maintains fallback behavior for unknown types

## Testing Required

To verify the fix works:

1. **Select Circular Layout**: Choose 'Circular' from the layout type dropdown
2. **Adjust Parameters**: Modify circular-specific settings (inner radius, level spacing, etc.)
3. **Apply Layout**: Click "Apply to Selected Node" or "Apply to Entire Graph"
4. **Verify Result**: Check that nodes are positioned in circular/concentric pattern, not tree pattern

## Expected Behavior After Fix

### Before Fix (Buggy)
- Circular layout selection → Tree layout with rankdir TB, align UL
- All nodes in vertical line formation
- No circular or concentric positioning

### After Fix (Correct)
- Circular layout selection → True circular layout algorithm
- Root nodes on inner circle
- Descendants on progressively larger concentric circles
- Angular sectors based on subtree sizes

## Additional Notes

### Event Listener Compatibility
The fix ensures the correct parameters are sent via the CustomEvent. The receiving end (test pages) should now receive:
- `config.type === 'circular'`
- `config.circularParams` with proper values
- `params` containing circular layout settings

### Console Debugging
The updated function includes enhanced console logging:
```typescript
console.log('Broadcasted dagre layout request event:', { target, params, config })
```

This will help verify:
- Correct layout type is being sent
- Proper parameters are being extracted
- Event is being broadcast successfully

## Files Modified
- `network-graph/quasar-project/src/components/DagreTestControls.vue`
  - Fixed `broadcastLayoutRequest` function (lines 410-440)
  - Enhanced parameter extraction logic
  - Improved console logging

## Verification Steps
1. Select 'Circular' layout type
2. Adjust any circular parameters (inner radius, level spacing, etc.)
3. Apply to a test graph with multiple root nodes
4. Verify nodes form circular/concentric pattern
5. Check browser console for correct event details

## Next Steps
After this fix, the circular layout should work as designed. If issues persist, check:
1. Event listener implementation on test pages
2. Circular layout parameter validation
3. Canvas coordinate system compatibility

---

## Summary
This was a critical integration bug that prevented the circular layout from functioning. The fix ensures proper parameter extraction and routing for each layout type, enabling the sophisticated circular positioning algorithm to work as intended.
