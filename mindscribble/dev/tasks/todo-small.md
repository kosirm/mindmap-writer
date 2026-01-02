- filenames in dockview tab titles should be limited to some length, othrewise it looks ugly for long filenames
- very long filenames should be truncated with "..." at the end also in vault tree so that when vault management is smaller than the width of the title - we don't get scrollbar on vault management, but we get truncated title instead

OPENING VIEWS:
- there is a way for view to be opened on specific position relative to other views (left, right, below, above) and there is also option to set max and min width/height of the view. This we could use to open views in a specific layout. For example:
  - open mindmap in center
  - open outline to the left of mindmap (or any other view)
  - open writer to the right of mindmap
  - open timeline above mindmap
We can also limit the width of outline to min and max (these are soft limits, so they are broken if for example outline is the only view opened, so it should occupy 100% of the width)

VIEW DEVELOPMENT:
- finish mindmap view (d3)
- creagte treemap view (d3)
- creagte circle pack view (d3)
- creagte timeline view (d3)
- creagte kanban view (d3)
- creagte sunburst view (d3)

MASTER MAP DEVELOPMENT:
- create master map view (d3)
- add interactivity to master map view (dragging nodes, zooming, panning)
- add support for multiple layouts (force, hierarchical, radial)
- add support for grouping by folder
- add support for showing/hiding orphan maps
- add support for pinning nodes in place (they won't move in force layout)

THEMING:
- first variables for dark and light mode
- then full theming support

- toolbar in vault management 100% width and aligned with toolbar of the outline view !!!