REPARENTING

for v-network-graph events please look at: network-graph\dev\docs\Events.md

BASIC IDEA
With ctrl+drag we can reparent nodes so that we drop them onto some node (if target node has no children, it doesn't have a box so when we drop them onto the leaf node it get's a box for new children) or onto some box (if target node has children, it has a box so we drop them into that box)

RULES
- one or more selected nodes can be reparented (dropped on target node)
- if target node has children, the nodes are inserted into it's box
- if target node has no children, the nodes are inserted as the child nodes, targe node now has a child nodes, so it gets a box
- if we drag a parent node which has child noded (has box) - then all of it's children are dragged as well - we preserve their parent-child relationship - so they are inserted into the target node's box as a new box
- if node has many children in a box and we select parent and ONLY SOME of the children and drag them - we drag parent and selected nodes and preserve their parent-child relationship - so they are inserted into the target node's box as a new box. Remaining children stay in the box of their grandparent (they have no parent after the operation, so they become children of the grandparent - if gradparent is canvas, then they become root nodes).

VISUAL INDICATORS
- on ctrl + drag start we form a grid of selected nodes (they can be from allover the canvas) - grid should be square as much as possible (2x2, 3x3, 4x4, etc.)
- we draw a dashed border arround dragged nodes
- we change cursor to drag (already implemented on drag start)
- when we hover over some node which can be a target for drop, it's box is highlighted with green background
- if target node is a leaf - we highlight it with green background
- if target node is a box (has children) - we highlight box with green background
- if target node is canvas - we highlight canvas with green background
So it is important that user can see which node is going to be parent of dragged nodes.
- by releasing ctrl (during the drag operation) we cancel the operation, remove grid of dragged nodes and cancel operation, return all dragged nodes to their previous positions (so we need to store their previous positions when we start ctrl+dragging)

- it is important that we prevent event bubbling so when we hover over some leaf node, it's parent box is not highlighted etc.
- so valid targets can be:
  - leaf node (no children)
  - box (has children)
  - canvas (root node)

IMPORTANT:
ON DROP WE SHOULD CHECK FOR CIRCULAR REFERENCES AND/OR DOUBLE PARENTING AND PREVENT THEM TO HAPPEN !!!


When we have more than one node selected and dragged for reparenting - on drop  we form a grid (on the point of drop) from the dragged nodes and position them in the target node's box. This grid should be square as much as possible (2x2, 3x3, 4x4, etc.) 



STRENGTHS OF THE APPROACH:
Comprehensive Coverage: The rules cover multiple scenarios including:

- Reparenting single nodes
- Reparenting multiple selected nodes
- Handling nodes with and without children
- Preserving relative positions and parent-child relationships
- Grid formation for nodes with different parents
- Visual Feedback: The visual indication with bordered boxes and color changes (green for valid drop targets) is excellent for user experience.

Event Handling: The consideration of event propagation and stopping it to prevent bubbling issues shows good understanding of DOM event handling.

Box Management: The logic for handling nodes with/without boxes (children) is well thought out.

Implementation Considerations:
Looking at the current TestConceptMapBox.vue implementation, I can see that:

Existing Infrastructure: The code already has good foundations for this:

Node selection system
Parent-child relationship tracking
Parent box calculation
Drag and drop event handling
Missing Components: To implement the reparenting rules, you'll need to add:

Ctrl+Drag detection and handling
Visual feedback during drag operations
Drop target validation
Node reparenting logic
Grid formation for multiple nodes

Potential Challenges:
Nested Box Detection: The current findClickedParentBoxAtCoordinates function will need enhancement to properly handle nested boxes during drag operations.

Performance: With many nodes, the drag operation could become laggy. Consider:

Debouncing visual updates
Using CSS transforms for smooth animation
Limiting the complexity of drop target validation
Edge Cases: Need to handle:

Dragging a parent onto its own descendant (circular reference prevention)
Multiple selection with mixed parent relationships
Preserving relative positions when dragging subtrees