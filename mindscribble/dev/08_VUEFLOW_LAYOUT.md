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
