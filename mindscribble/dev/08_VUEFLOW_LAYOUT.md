# Initial thoughts:
I would like to make a final upgrade of mindmap and concept map layout: Map orientation, Map overlap resolution (AABB), Map level of detail (LoD).

I started to prepare this document to outline the requirements and implementation details.

Currently we have implemented AABB in mindmap and AABB + PARENT RESIZE in conceptmap.
Problem is that this was implemented lousy - for example in mindmap leaf nodes have fixed node width/height (width/height should be resized when we edit node title)
So on both mindmap and concept map we have problem with node overlaps (node boundaries are not respected in AABB when new nodes are added, when node titles are edited, etc.)

I would like to upgrade layout engine for both mindmap and conceptmap in a way that AABB can be turned ON/OFF.

In CONCEPT MAP we are doing AABB + PARENT RESIZING together - but after upgrade they should be separated in two functions because AABB can be turned OFF and PARENT RESIZING cannot be turned off.
If AABB is turned ON, we still do AABB+PARENT RESIZING together - we make AABB + PARENT RESIZE on siblings, then on parent node, then on parent siblings, etc. (bottom up) but if AABB is turned OFF - we don't have to do PARENT RESIZING on any other node than on current node, on it's parent, it's grandparent, etc. - to the root node - we don't have to do PARENT RESIZE on parent siblings, grandparent siblings, etc.
If AABB is off - we just want to make sure that child nodes are always INSIDE parent borders, we don't care about overlap.
But if AABB is ON - then we do node resize - siblings AABB - paren resize - parent siblings AABB - grandparent resize - etc.


# MINDMAP LAYOUT ENGINE

# Map Orientation: 
- Clockwise (right- top-to-bottom, then left bottom-to-top)
- Counter-clockwise (left top-to-bottom, then right bottom-to-top)
- Left-right (left top-to-bottom, then right top-to-bottom)
- Right-left (right top-to-bottom, then left top-to-bottom)
- Free

- Map orientations are the most important in layout, because it affects node order.
- Free orientation does not reorder nodes in the store.
- root nodes arround canvas origin (0,0), child nodes arround parent nodes


# Map overlap resolution - (AABB + PARENT BOUNDING BOX RESIZE):
- can be turned on/off
- bottom-up AABB - only process ancestor chain + siblings
If AABB is off, we do not resolve overlaps.
If AABB is on, we resolve overlaps like this:
- on node move (in any view) we resolve overlaps for the ancestor chain + siblings
- on node create (in any view) we resolve overlaps for the ancestor chain + siblings
- on node title update (in any view) we resolve overlaps for the ancestor chain + siblings


# Map level of detail (LoD):
- can be turned on/off


# CONCEPT MAP LAYOUT ENGINE:

# Map Orientation: concept map DOES NOT HAVE orientation

# Map overlap resolution (AABB + PARENT RESIZE)
- AABB can be turned on/off
- bottom-up AABB - only process ancestor chain + siblings

If AABB is off, we do not resolve overlaps.
If AABB is on, we resolve overlaps like this:
- on node move we resolve overlaps for the ancestor chain + siblings
- on node create we resolve overlaps for the ancestor chain + siblings
- on node title update we resolve overlaps for the ancestor chain + siblings

Parent resizing is ALWAYS on, and cannot be turned off.
We do parent resize like this:
- on node move we resize parents for the ancestor chain + siblings
- on node create we resize parents for the ancestor chain + siblings
- on node title update we resize parents for the ancestor chain + siblings
 

# Map level of detail (LoD): concept map DOES NOT HAVE LoD
