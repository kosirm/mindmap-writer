# Keyboard Shortcuts Implementation

This document describes the keyboard shortcuts feature added to vue3-mindmap.

## Overview

The keyboard shortcuts feature allows users to navigate and edit the mindmap using keyboard commands, making it much faster and more efficient to work with large mindmaps.

## Implementation Details

### Files Added

1. **`src/components/Mindmap/listener/keyboard.ts`**
   - Main keyboard event handler
   - Contains all keyboard shortcut logic
   - Handles navigation, editing, and node manipulation

### Files Modified

1. **`src/components/Mindmap/listener/switcher.ts`**
   - Added `switchKeyboard()` function to enable/disable keyboard shortcuts
   - Imports keyboard handler

2. **`src/components/Mindmap/Mindmap.vue`**
   - Added keyboard prop watcher
   - Imports `switchKeyboard` function

3. **`src/App.vue`**
   - Enabled keyboard prop (changed from `false` to `true`)
   - Removed `disabled: true` flag from keyboard checkbox

4. **`README.md`**
   - Added keyboard prop documentation
   - Added comprehensive keyboard shortcuts table

## Keyboard Shortcuts Reference

### Node Creation
- **Enter**: Create a new sibling node after the selected node
- **Ctrl/Cmd + Enter**: Create a new child node under the selected node

### Hierarchy Management
- **Tab**: Indent - Make the selected node a child of its previous sibling
- **Shift + Tab**: Outdent - Promote the selected node to be sibling of its parent

### Node Deletion
- **Delete** or **Backspace**: Delete the selected node (cannot delete root)

### Navigation
- **Arrow Up**: Select the previous sibling node
- **Arrow Down**: Select the next sibling node
- **Arrow Left**: Navigate left in the mindmap structure
  - From root: Navigate to first left-side child
  - From any other node: Navigate to parent
- **Arrow Right**: Navigate right in the mindmap structure
  - From root: Navigate to first right-side child
  - From left-side nodes: Navigate to parent
  - From right-side nodes: Navigate to first child

### Editing
- **F2**: Enter edit mode for the selected node
- **Any printable character**: Start editing the node with the typed character
- **Escape**: Deselect the current node or cancel edit

### Clipboard Operations
- **Ctrl/Cmd + C**: Copy the selected node to clipboard (as JSON)
- **Ctrl/Cmd + X**: Cut the selected node to clipboard
- **Ctrl/Cmd + V**: Paste from clipboard as child of selected node

### View Control
- **Space**: Toggle collapse/expand of the selected node

## Technical Notes

### Focus Management
- The wrapper element is made focusable by setting `tabindex="0"`
- When keyboard shortcuts are enabled, the wrapper automatically receives focus
- This allows keyboard events to be captured without requiring the user to click first

### Event Handling
- Keyboard events are attached to the wrapper element, not individual nodes
- The handler checks for the currently selected node using the `.selected` CSS class
- Events are prevented from bubbling when handled

### Edit Mode Detection
- Keyboard shortcuts are disabled when a node is in edit mode (has `.edited` class)
- This prevents shortcuts from interfering with text input

### Cross-Platform Support
- Uses both `ctrlKey` and `metaKey` to support Windows/Linux (Ctrl) and Mac (Cmd)
- All shortcuts work consistently across platforms

### Data Operations
- Reuses existing data manipulation functions from `data/index.ts`
- Maintains consistency with context menu and mouse operations
- Properly triggers `afterOperation()` to update the view and emit events

## Usage Example

```vue
<template>
  <mindmap 
    v-model="data"
    :keyboard="true"
    :edit="true"
    :drag="true"
  />
</template>

<script>
import mindmap from 'vue3-mindmap'
import 'vue3-mindmap/dist/style.css'

export default {
  components: { mindmap },
  setup() {
    const data = [{
      name: "Root Node",
      children: [
        { name: "Child 1" },
        { name: "Child 2" }
      ]
    }]
    
    return { data }
  }
}
</script>
```

## Testing

To test the keyboard shortcuts:

1. Start the dev server: `npm run dev`
2. Open http://localhost:3000/vue3-mindmap/
3. Enable the "keyboard" checkbox in the controls
4. Click on any node to select it
5. Try the various keyboard shortcuts

## Future Enhancements

Possible improvements for future versions:

1. **Multi-selection**: Support Ctrl+Click for multiple node selection
2. **Bulk operations**: Apply operations to multiple selected nodes
3. **Custom shortcuts**: Allow users to configure their own keyboard shortcuts
4. **Undo/Redo**: Ctrl+Z and Ctrl+Y for undo/redo (currently uses buttons)
5. **Search**: Ctrl+F to search for nodes
6. **Node styling**: Keyboard shortcuts for changing colors, icons, etc.
7. **Export shortcuts**: Quick export to different formats
8. **Focus mode**: Keyboard shortcut to focus on a subtree

## Known Limitations

1. Cannot indent the first child (no previous sibling to become child of)
2. Cannot outdent direct children of root (would become siblings of root)
3. Cannot delete root node
4. Copy/paste uses JSON format - may not work with external applications
5. Navigation wraps within siblings but doesn't jump to parent's siblings

## Compatibility

- **Vue**: 3.x
- **Browsers**: All modern browsers (Chrome, Firefox, Safari, Edge)
- **Platforms**: Windows, macOS, Linux
- **Mobile**: Not optimized for mobile devices (no physical keyboard)

