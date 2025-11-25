# Selection/Deselection Painting Feature

**Date:** 2025-11-25  
**Status:** ✅ IMPLEMENTED

---

## Overview

Implemented a new keyboard navigation system that allows users to "paint" selection and deselection as they navigate through the mindmap using arrow keys.

## Problem Solved

### Previous Implementation (Toggle Mode)
The old system used **Shift+Arrow** to toggle the target node's selection state:
- If target was unselected → select it
- If target was selected → deselect it

**Critical Flaw:**
When navigating forward and backward through nodes, the toggle logic would fail on the last node:
- Navigate forward (1→5): nodes 1,2,3,4,5 all get selected ✅
- Navigate backward (5→1): nodes 5,4,3,2 get deselected, but node 1 stays selected ❌
- **Why?** When arriving at node 5 going backward, it's already selected, so it gets toggled to deselected... but you've already moved past it!

### New Implementation (Painting Mode)
The new system uses **explicit selection/deselection modes**:
- **Shift+Arrow** = paint selection (force both current and target to selected)
- **Shift+Y+Arrow** = paint deselection (force both current and target to deselected)

This solves the toggle problem by making user intent explicit.

---

## User Experience

### Selection Painting (Shift+Arrow)
1. Navigate to a node (e.g., node 5)
2. **Hold Shift** and press **Arrow** keys
3. As you navigate, both the current node and target node get **selected**
4. Release Shift to enter "half-mode" (orange border navigation)

**Example:** Build non-contiguous selections
- Start at node 2, hold Shift+Down → nodes 2,3 selected
- Release Shift, press Down twice → navigate to node 5 (orange border)
- Hold Shift+Down → nodes 5,6 selected
- Result: nodes 2,3,5,6 are selected

### Deselection Painting (Shift+Y+Arrow)
1. Navigate to a selected node (e.g., node 5)
2. **Hold Shift+Y** and press **Arrow** keys
3. As you navigate, both the current node and target node get **deselected**
4. Release Shift+Y to enter "half-mode"

**Example:** Remove nodes from selection
- Nodes 2,3,5,6 are selected
- Navigate to node 5, hold Shift+Y+Down → nodes 5,6 deselected
- Result: only nodes 2,3 remain selected

---

## Implementation Details

### 1. Track Y Key State
```typescript
const isYKeyPressed = ref(false); // Track Y key for deselection mode
```

### 2. Key Event Handlers
```typescript
function onAltKeyDown(event: KeyboardEvent) {
  if (event.key === 'y' || event.key === 'Y') {
    isYKeyPressed.value = true;
  }
}

function onAltKeyUp(event: KeyboardEvent) {
  if (event.key === 'y' || event.key === 'Y') {
    isYKeyPressed.value = false;
  }
}
```

### 3. Selection/Deselection Logic
```typescript
if (event.shiftKey) {
  if (isYKeyPressed.value) {
    // DESELECTION MODE: Shift+Y+Arrow
    currentNode.selected = false;
    targetNode.selected = false;
  } else {
    // SELECTION MODE: Shift+Arrow
    currentNode.selected = true;
    targetNode.selected = true;
  }
  selectedNodeId.value = targetNode.id; // Move cursor
}
```

---

## Navigation Modes

### 1. Single Selection Mode (Default)
- **Trigger:** Click a node, or press Escape
- **Behavior:** Arrow keys clear previous selection and select only the target node

### 2. Multi-Selection Mode (Painting)
- **Trigger:** Hold Shift+Arrow or Shift+Y+Arrow
- **Behavior:** Paint selection/deselection as you navigate

### 3. Half Navigation Mode
- **Trigger:** Release Shift after multi-selection
- **Behavior:** Arrow keys preserve selection, just move cursor (orange border)
- **Visual:** Active node has orange border, selected nodes have blue background

---

## Key Design Decisions

### Why Shift+Y instead of Shift+Alt?
- **Ctrl+Arrow** is already used for creating sibling/parent/child nodes
- **Alt+Arrow** is reserved for future rapid node movement (10px increments)
- **Shift+Alt+Arrow** would conflict with Alt+Arrow
- **Shift+Y** is available and Y is close to Shift key (good ergonomics)
- Future: Users can customize keybindings in keyboard manager

### Why Paint Both Current and Target?
This ensures intuitive behavior:
- When you start painting from node 5, node 5 gets selected/deselected
- As you move to node 6, node 6 also gets selected/deselected
- This creates a continuous "painting" effect

---

## Files Modified

- `mindmap-writer/vueflow/vueflow-test/src/pages/VueFlowTest.vue`
  - Added `isYKeyPressed` ref
  - Updated `onAltKeyDown` and `onAltKeyUp` to track Y key
  - Replaced toggle logic with explicit selection/deselection painting
  - Updated UI instructions in left drawer

---

## Edge Cases Handled

### All Nodes Deselected - VueFlow Native Selection Conflict
**Problem:** We're building on top of VueFlow's native selection system. When all nodes are deselected, VueFlow clears everything, and our half-mode logic can't override that. Trying to maintain an "active but not selected" node fights against VueFlow's architecture.

**Solution:** When all nodes become deselected (via either selection or deselection mode), automatically switch to single selection mode and re-select the current node.

**Behavior (Both Modes):**
- If all nodes become deselected → auto-switch to 'single' mode and re-select current node
- This prevents fighting with VueFlow's native selection system
- User can continue navigating normally

**Example:**
1. Select nodes 1,2,3,4,5 with Shift+Arrow
2. Hold Shift+Y+Arrow and navigate back to node 1
3. All nodes get deselected (including node 1)
4. **Automatically:** Switch to single selection mode and re-select node 1
5. You can now continue navigating with arrow keys normally

**Why This Makes Sense:**
- User deselected all nodes → they probably want to work with just one node now
- Automatically selecting the current node is intuitive (it's where the cursor is)
- No fighting with VueFlow's selection system
- Simpler mental model: "deselect everything" = "select just this one"

### Race Condition Fix
**Problem:** When checking if all nodes are deselected in `nextTick`, the `isYKeyPressed` flag might have changed (user released the key).

**Solution:** Capture `isYKeyPressed` value before `nextTick`:
```typescript
const isDeselectionMode = isYKeyPressed.value; // Capture NOW
void nextTick(() => {
  if (remainingSelected.length === 0) {
    // Use captured value (not isYKeyPressed.value which might have changed)
    navigationMode.value = 'single';
    targetNode.selected = true;
  }
});
```

---

## Testing Checklist

- [x] Selection painting: Hold Shift+Arrow to select nodes 1,2,3
- [x] Deselection painting: Hold Shift+Y+Arrow to deselect nodes 2,3
- [x] Non-contiguous selection: Select 1,2, navigate to 5, select 5,6
- [x] Half-mode navigation: After releasing Shift, arrow keys preserve selection
- [x] Edge case: Navigate forward then backward with Shift+Arrow (all should stay selected)
- [x] Edge case: Deselect all nodes with Shift+Y+Arrow, verify it stays in half-mode
- [x] Edge case: From half-mode with no selection, press Escape to return to single mode

