
--- IDEA ---

On node movement (drag end) we recalculate ONLY necessary nodes:
For example if root node has 5 generations of nodes:
root node
    node 1
        node 1-1
            node 1-1-1
                node 1-1-1-1
                    node 1-1-1-1-1
                    node 1-1-1-1-2
                    etc
                node 1-1-1-2
                etc.
            node 1-1-2
            etx
        node 1-2
        etc.
    node 2
    etc.

When we are moving nodes inside node 1-1-1-1 (nodes 1-1-1-1-1, 1-1-1-1-2, etc.): 
- they can (but not necessarily do) change bounding box or node 1-1-1-1 and
- this can (but not necessarily do) change bounding box or node 1-1-1 and
- this can (but not necessarily do) change bounding box or node 1-1 and
- this can (but not necessarily do) change bounding box or node 1 and
- this can (but not necessarily do) change bounding box or oter nodes (2,3,etc.)

We need a smart way to detect which nodes bounding boxes were affected by the move - so AABB algorithm needs some upgrade. 
When we move some node inside node 1-1-1-1 - it can affect one or more node's 1-1-1-1 bounding box borders (left, right top or down) - so for example when only it's down border is affected - we know that ONLY NODES UNDER the node 1-1-1-1 (y position > dropped node) CAN BE AFFECTED and we should recalculate only nodes UNDER the node 1-1-1-1 (if they are affected). Same for left, top and right border.
So that way we shorten AABB recalculation on half (we recalculate only the side where moving node is dropped - left or right of the root node center) and we shorten AABB further - recalculating only affected nodes (up/down/left/right) if only one border of node 1-1-1-1 is affected. Can we achieve this?
Probably filtering nodes would be faster than recalculating positions.
Maybe this is already in our AABB algortithm, I don't know...


--- STRESS TEST ---

On stress test (over 500) problem with nodes dissapearing when dragged... still a lot of problems there...

--- CACHE ---

The main problem is this (this is why we need cache):
syncFromVueFlow: vueFlowNodes.value.length = 200 (when LOD this is smaller)
syncFromVueFlow: nodes.value.length = 200 (!!!)

--- CONCEPT MAPPING IDEA ---

Maybe, just maybe we could use vueflow nested nodes... they offer connectivity... CONCEPT MAP !!!
Concept map is the new IDEA - we can easily convert between mindmap and concept map - but then each node should have two locations - mindmap (m) location and conceptmap (c) location.

--- MIRROR ---

When we start dragging some node - we create a variable with all it's child nodes positions in relation to dragged node (delta). If node is crossing mirror line (center X of the root node) - in event of crossing - we mirror all child nodes to other side of the dragged node (mirror delta) and we also replace dragged node children variable with mirrored delta... If we don't drop the dragged node on the other side of the mirror, but we cross mirror line again (in the same drag operation), we again mirror delta of child nodes and write it in dragged node children positions variable. Can we achieve this?

This should also respect mindmap orientation - so in clockwise and anticlockwise orientation we additionaly to changing left/right position also swap nodes positions up/down. So all siblings on one level are in backward positions also up/down when mirroring (but this should be implemented later when we will inocorporate this into mindscribble)

