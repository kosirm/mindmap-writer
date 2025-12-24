# Debug Guide: Arrow Navigation in Outline View

## Problem Description

The arrow navigation in outline view (edit mode) has redundant movements:

### Down Arrow Issues:
1. **One-line title**: End of title → Start of title → End of title → Next title
2. **Multi-line title**: Lines 1→2→3...→Last line → End of last line → Next title

### Up Arrow Issues:
1. **One-line title**: Start of title → End of title → Start of title → Previous title
2. **Multi-line title**: Last line → Previous line → ... → First line → Start of first line → Previous title

## Root Cause Analysis

The issue is likely in the ProseMirror cursor position detection logic. The current code checks:

```typescript
// For Up Arrow - at start of paragraph
if ($head.parentOffset === 0)

// For Down Arrow - at end of paragraph  
if ($head.parentOffset === $head.parent.content.size)
```

**Problem**: This logic triggers navigation for EVERY paragraph boundary, not just the first/last paragraph of the document.

## Debug Files Created

I've created debug versions of the key files:

### 1. `useOutlineKeyboardHandlers.debug.ts`
- Enhanced logging for cursor position analysis
- Tracks: `currentPos`, `parentOffset`, `parentContentSize`, `parentType`, `docSize`, etc.
- Logs: Whether navigation is triggered and why

### 2. `useOutlineNavigation.debug.ts`  
- Logs the flattened node list
- Tracks node indexing and navigation calls
- Shows which node is selected as next/previous

### 3. `OutlineNodeContent.debug.vue`
- Logs navigation handler calls
- Tracks editor opening/closing events
- Shows cursor positioning decisions

## How to Test

### Step 1: Replace the original files temporarily

In `OutlineView.vue` (or wherever OutlineNodeContent is imported), temporarily replace:

```typescript
// Change this:
import OutlineNodeContent from './components/OutlineNodeContent.vue'
import { createKeyboardHandler, createNavigationHandler } from '../composables/useOutlineKeyboardHandlers'
import { useOutlineNavigation } from '../composables/useOutlineNavigation'

// To this:
import OutlineNodeContent from './components/OutlineNodeContent.debug.vue'  
import { createKeyboardHandler, createNavigationHandler } from '../composables/useOutlineKeyboardHandlers.debug'
import { useOutlineNavigation } from '../composables/useOutlineNavigation.debug'
```

### Step 2: Open Browser DevTools
1. Open the application
2. Open Chrome DevTools (F12)
3. Go to the Console tab
4. Clear the console

### Step 3: Test Navigation Scenarios

#### Test 1: One-line title navigation
1. Create a simple mindmap with 2-3 nodes
2. Click on first node title to enter edit mode
3. Place cursor at end of title text
4. Press Down Arrow
5. **Expected**: Should go directly to start of next node
6. **Actual Issue**: Goes start→end→next (redundant movements)

#### Test 2: Multi-line title navigation  
1. Create a node with a long title that wraps to multiple lines
2. Enter edit mode and place cursor on last line
3. Press Down Arrow
4. **Expected**: Should go directly to next node
5. **Actual Issue**: Goes through each line ending, then to next node

### Step 4: Analyze Debug Output

Look for these patterns in console:

```
🔴 [DEBUG DOWN ARROW] Cursor position: {currentPos: X, parentOffset: Y, parentContentSize: Z...}
🔴 [DEBUG DOWN ARROW] At end of paragraph - triggering navigation
🚀 [DEBUG NAVIGATE TO NODE] node1 -> node2 (start)
🔴 [DEBUG EDIT MODE] DOWN ARROW at last line triggered for node: node2
```

## What to Look For

### Key Indicators:

1. **Multiple Triggers**: If you see the same navigation being triggered multiple times for one keypress
2. **Paragraph Boundaries**: Check if `parentOffset` equals `parentContentSize` at unexpected times
3. **Node List Changes**: Verify the flattened node list is stable during navigation
4. **Cursor Position**: Track whether the cursor is actually where we expect it to be

### Expected Debug Output for Correct Behavior:

**Down Arrow from last line of node A to start of node B:**
```
🔴 [DEBUG DOWN ARROW] Cursor position: {parentOffset: 15, parentContentSize: 15}
🔴 [DEBUG DOWN ARROW] At end of paragraph - triggering navigation
🚀 [DEBUG NAVIGATE TO NODE] nodeA -> nodeB (start)
📝 [DEBUG EDITOR OPEN] Opening editor for nodeB at start
🔵 [DEBUG UP ARROW HANDLER] No navigation available
```

### Problematic Debug Output (Current Issue):

**Down Arrow from last line showing redundant triggers:**
```
🔴 [DEBUG DOWN ARROW] Cursor position: {parentOffset: 15, parentContentSize: 15}
🔴 [DEBUG DOWN ARROW] At end of paragraph - triggering navigation  
🚀 [DEBUG NAVIGATE TO NODE] nodeA -> nodeA (end)  // REDUNDANT!
🔴 [DEBUG DOWN ARROW] Cursor position: {parentOffset: 0, parentContentSize: 0}
🔴 [DEBUG DOWN ARROW] At end of paragraph - triggering navigation  // STILL TRIGGERS!
🚀 [DEBUG NAVIGATE TO NODE] nodeA -> nodeB (start)  // FINALLY CORRECT
```

## Fix Strategy

Once you identify the issue through debugging, the fix will likely involve:

1. **Enhanced Boundary Detection**: Instead of just checking paragraph boundaries, check if we're in the LAST paragraph of the document
2. **Document Structure Analysis**: Use `$head.after() >= state.doc.content.size` to detect last paragraph
3. **First Paragraph Detection**: Use `$head.before() <= 1` to detect first paragraph
4. **State Management**: Prevent redundant navigation triggers within the same keypress

## Files to Check

- `OutlineView.vue` - Where components are imported
- `OutlineNodeContent.vue` - Main component logic
- `useOutlineKeyboardHandlers.ts` - Arrow key detection logic  
- `useOutlineNavigation.ts` - Node list and navigation functions

The debug files will help pinpoint exactly where the redundant navigation is being triggered and why the logic isn't working as expected for multi-paragraph content.
