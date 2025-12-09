In concept map we are currently doing AABB + PARENT RESIZING together - but after upgrade they should be separated in two functions because AABB can be turned OFF and PARENT RESIZING cannot be turned off.
If AABB is turned ON, we still do AABB+PARENT RESIZING together - we make AABB + PARENT RESIZE on siblings, then on parent node, then on parent siblings, etc. (bottom up) but if AABB is turned OFF - we don't have to do PARENT RESIZING on any other node than on current node, on it's parent, it's grandparent, etc. - to the root node - we don't have to do PARENT RESIZE on parent siblings, grandparent siblings, etc.
If AABB is off - we just want to make sure that child nodes are always INSIDE parent borders, we don't care about overlap.
But if AABB is ON - then we do node resize - siblings AABB - paren resize - parent siblings AABB - grandparent resize - etc.

