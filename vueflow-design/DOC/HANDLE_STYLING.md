# Connection Handle Styling Guide

## Overview

Connection handles (the connection points on nodes) are fully customizable via CSS in the `CustomNode.vue` component.

**Location:** `src/components/CustomNode.vue` - `.handle` CSS class (around line 116)

---

## Current Implementation

All nodes have **4 connection handles** (top, bottom, left, right):
- **Hierarchy connections**: Use left/right handles (automatic via layout algorithm)
- **Reference connections**: Can use any handle (user choice for linking related concepts)

---

## Styling Options

### **Option 1: Invisible by Default, Visible on Hover** ⭐ (Recommended)

Clean look - handles only appear when you need them.

```css
.handle {
  width: 8px;
  height: 8px;
  background: transparent;
  border: 2px solid transparent;
  border-radius: 50%;
  transition: all 0.2s;
}

.custom-node:hover .handle {
  background: #4dabf7;
  border-color: white;
}

.handle:hover {
  background: #339af0;
  transform: scale(1.3);
}
```

---

### **Option 2: Very Subtle (Small + Semi-transparent)**

Always visible but very subtle.

```css
.handle {
  width: 6px;
  height: 6px;
  background: rgba(77, 171, 247, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  transition: all 0.2s;
}

.handle:hover {
  background: #4dabf7;
  border-color: white;
  transform: scale(1.5);
}
```

---

### **Option 3: Square Handles (Less Intrusive)**

Square/rounded square handles blend better with node borders.

```css
.handle {
  width: 6px;
  height: 6px;
  background: #dee2e6;
  border: 1px solid #adb5bd;
  border-radius: 2px;  /* Small radius for rounded square */
}

.handle:hover {
  background: #4dabf7;
  border-color: white;
}
```

---

### **Option 4: Completely Hidden Until Node Hover**

Maximum clean look - handles only visible when hovering the node.

```css
.handle {
  opacity: 0;
  width: 12px;
  height: 12px;
  background: #4dabf7;
  border: 2px solid white;
  border-radius: 50%;
  transition: opacity 0.2s;
}

.custom-node:hover .handle {
  opacity: 1;
}

.handle:hover {
  background: #339af0;
}
```

---

## How to Apply

1. Open `src/components/CustomNode.vue`
2. Find the `.handle` CSS class (around line 116)
3. Replace with your preferred styling option
4. Save and the changes will hot-reload immediately

---

## Notes

- Handles must remain **clickable** for connections to work
- Minimum recommended size: 6px × 6px (for usability)
- Use `transition` for smooth hover effects
- Test with both light and dark backgrounds

