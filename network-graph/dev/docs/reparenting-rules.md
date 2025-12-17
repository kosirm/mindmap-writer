REPARENTING
with ctrl+drag we can reparent nodes so that we drop them onto some node (if target node has no children, it doesn't have a box so it get's a box for new children) or onto some box (if target node has children, it has a box so we drop them into the box)

- one or more selected nodes can be reparented (dropped on target node)
- if target node has children, the nodes are inserted into it's box
- if target node has no children, the nodes are inserted as the child nodes, targe node has a child nodes, so it gets a box
- if we drag a parent node which has child noded (has box) - then all of it's children are dragged as well - we preserve their relative positions and parent-child relationship - so they are inserted into the target node's box as a new box
- if node has many children in a box and we select parent and some of the children and drag them - we drag parent and selected nodes and preserve their relative positions and parent-child relationship - so they are inserted into the target node's box as a new box. Remaining children stay in the box of their grandparent (they have no parent after the operation, so they become children of the grandparent)

