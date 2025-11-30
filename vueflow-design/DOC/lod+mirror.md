Our LOD system and node position calculations should be completly rewritten if we want to make it usable for large mindmaps (thousands of nodes)
LOD system should be automatically switched ON when we reach certain ammount of nodes on the mindmap (but it can be switched OFF by user on his own responsibility)

We need a major rewrite of LOD system - especially of node position recalculation.
LOD system should be designed so that we can handle HUGE mindmaps with thousands, even tens of thousands of node.
When we create lod badge for children of some node - we should not calculate child positions inside this LOD badge at all. So idealy we would have on every zoom level approximately same ammount of node position calculations.
On zoom end (NOT DURING ZOOM) we calculate LOD (replace badges with nodes) ONLY FOR NODES (and LOD badges) visible on the canvas.
On canvas pan end (NOT DURING PAN) we recalculate node positions and pack/unpack LOD (replace badges with nodes) ONLY FOR NODES (and LOD badges) visible on the canvas.

On node movement (drag end) we recalculate ONLY necessary nodes:
if root node has 5 generations of nodes:
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
- they can (but not necessarily do) change bounding box or node 1-1-1-1
- this can (but not necessarily do) change bounding box or node 1-1-1
- this can (but not necessarily do) change bounding box or node 1-1
- this can (but not necessarily do) change bounding box or node 1

So we need a smart way to detect which nodes bounding boxes were affected by the move.

