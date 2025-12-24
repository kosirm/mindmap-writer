# Step-by-Step Fix Application

## Current State ✅

I can see that `OutlineView.vue` is already using the debug versions:
- Line 75: `import OutlineNodeContent from './OutlineNodeContent.debug.vue'`
- Line 78: `import { useOutlineNavigation } from '../composables/useOutlineNavigation.debug'`

## Apply the Fix 🔧

### Step 1: Update OutlineView.vue imports

Replace the current imports (lines 75 and 78) with:

```typescript
// Line 75: Change from debug to fixed
import OutlineNodeContent from './OutlineNodeContent.vue'  // Use regular version

// Line 78: Change from debug to fixed  
import { useOutlineNavigation } from '../composables/useOutlineNavigation'  // Use regular version
```

And update the keyboard handler import in `OutlineNodeContent.vue` (when switching back from debug).

### Step 2: Test the Navigation Fix

1. **Reload the application** after making the import changes
2. **Create test scenario**:
   - Parent node: "New Node" (single line)
   - First child: "New Child<br>Second Line" (multi-line)
   - Second child: "New Child" (single line)

3. **Test each navigation scenario**:

#### Down Arrow Tests:
- ✅ **Parent → First Child**: Should go directly to start of first child
- ✅ **Within First Child**: Should NOT navigate (stay in child, even on last line)
- ✅ **First Child → Second Child**: Should go directly to start of second child

#### Up Arrow Tests:  
- ✅ **Second Child → First Child**: Should go directly to end of first child
- ✅ **Within First Child**: Should NOT navigate (stay in child, even on first line)
- ✅ **First Child → Parent**: Should go directly to end of parent

### Step 3: Verify Fix Success

**Success Indicators**:
- ✅ **Single navigation event** per arrow key press
- ✅ **No redundant cursor movements** within the same node
- ✅ **Direct node-to-node navigation** without intermediate stops

**Problem Indicators** (if fix needs adjustment):
- ❌ Multiple navigation events per keypress
- ❌ Still stopping at line breaks within multi-line titles
- ❌ Cursor jumping to unexpected positions

## Quick Fix Application

### Option A: Manual Edit (Recommended)
1. Open `OutlineView.vue`
2. Change line 75: `OutlineNodeContent.debug.vue` → `OutlineNodeContent.vue`
3. Change line 78: `useOutlineNavigation.debug` → `useOutlineNavigation`
4. Save file

### Option B: Use Regular Files (After Testing)
Once confirmed working, replace the original files:
1. Copy content from `useOutlineKeyboardHandlers.fixed.ts` → `useOutlineKeyboardHandlers.ts`
2. Remove `.debug` and `.fixed` files
3. Update any remaining debug imports

## Expected Console Output (After Fix)

### Good Navigation:
```
🔴 [FIXED DEBUG DOWN] Not at end of last paragraph, staying in current node
🔴 [FIXED DEBUG DOWN] At end of last paragraph - triggering navigation  
🚀 [DEBUG NAVIGATE TO NODE] nodeA -> nodeB (start)
```

### Problem Navigation (if still broken):
```
🔴 [FIXED DEBUG DOWN] At absolute end of document - triggering navigation
🚀 [DEBUG NAVIGATE TO NODE] nodeA -> nodeA (end)  // REDUNDANT!
🔴 [FIXED DEBUG DOWN] At absolute end of document - triggering navigation
🚀 [DEBUG NAVIGATE TO NODE] nodeA -> nodeB (start) // SHOULD BE DIRECT
```

## Technical Details 🔬

The fix changes the boundary detection logic:

**Before (Broken)**:
```typescript
// Triggers at ANY paragraph end
if (currentPos >= state.doc.content.size - 1)
```

**After (Fixed)**:
```typescript
// Triggers ONLY at actual document end
if ($head.parentOffset === $head.parent.content.size && $head.after() >= state.doc.content.size)
```

This ensures navigation only happens when moving between actual nodes, not at internal paragraph boundaries.

## Troubleshooting 🔧

If the fix doesn't work immediately:

1. **Clear browser cache** and reload
2. **Check console for errors** in the fixed debug output
3. **Verify imports** are pointing to the correct files
4. **Test with simple single-line titles** first to isolate the issue

The debug output will show exactly where the navigation is being triggered and help identify any remaining issues.
