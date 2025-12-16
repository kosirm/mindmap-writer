Events
Events (Vue component)
Event	Description
update:zoomLevel	update zoom level
update:selectedNodes	update selected nodes
update:selectedEdges	update selected edges
update:selectedPaths	update selected paths
update:layouts	update layouts
Events (with event-handlers)
The following is a list of events that can be specified for event-handlers prop.

Event type	Description	Event value
"view:load"	component loaded	undefined
"view:unload"	mouse mode changed	undefined
"view:mode"	component unloaded	"default" / "node" / "edge"
"view:click"	background clicked	{ event: MouseEvent }
When a double click occurs, the "view:click" event is fired twice. If you want to determine the second click that is judged to be a double click, you can use the value of event.detail`. (When it is a double click, the value will be 2.)

By default, double-clicking the background will zoom it. To disable this behavior, set view.doubleClickZoomEnabled" to false in Configuration.
"view:dblclick"	background double clicked
"view:zoom"	zoom level changed	number (new zoom level)
"view:pan"	panned	{ x: number, y: number }
"view:fit"	fitted	undefined
"view:resize"	container resized	{ x: number, y: number, width: number, height: number }
"view:contextmenu"	background right-clicked	{ event: MouseEvent }
(To disable the browser's standard context menu, you have to call event.preventDefault() in the handler.)
"node:click"	node clicked	{ node: string, event: MouseEvent }
When a double click occurs, the "node:click" event is fired twice. If you want to determine the second click that is judged to be a double click, you can use the value of event.detail`. (When it is a double click, the value will be 2.)
"node:dblclick"	node double clicked
"node:pointerover"	pointer over on node	{ node: string, event: PointerEvent }
"node:pointerout"	pointer out on node
"node:pointerdown"	pointer down on node
"node:pointerup"	pointer up on node
"node:contextmenu"	node right-clicked	{ node: string, event: MouseEvent }
(To disable the browser's standard context menu, you have to call event.preventDefault() in the handler.)
"node:dragstart"	node drag started	{ NODE_ID: { x: number; y: number }, ... }
"node:pointermove"	pointer move on node	{ node: string, event: PointerEvent }
"node:dragend"	node drag ended	{ NODE_ID: { x: number; y: number }, ... }
"node:select"	node selected	[ NODE_ID, ...]
"edge:click"	edge clicked	not summarized edge:
{ edge: EDGE_ID, edges: [EDGE_ID], event: MouseEvent, summarized: false }

summarized edge:
{ edges: [EDGE_ID, ...], event: MouseEvent, summarized: true }

When a double click occurs, the "edge:click" event is fired twice. If you want to determine the second click that is judged to be a double click, you can use the value of event.detail`. (When it is a double click, the value will be 2.)
"edge:dblclick"	edge double clicked
"edge:pointerover"	pointer over on edge	not summarized edge:
{ edge: EDGE_ID, edges: [EDGE_ID], event: PointerEvent, summarized: false }

summarized edge:
{ edges: [EDGE_ID, ...], event: PointerEvent, summarized: true }
"edge:pointerout"	pointer out on edge
"edge:pointerdown"	pointer down on edge
"edge:pointerup"	pointer up on edge
"edge:contextmenu"	edge right-clicked	not summarized edge:
{ edge: EDGE_ID, edges: [EDGE_ID], event: MouseEvent, summarized: false }

summarized edge:
{ edges: [EDGE_ID, ...], event: MouseEvent, summarized: true }
"edge:select"	edge selected	[ EDGE_ID, ... ]
"path:click"	path clicked	{ path: Path, event: MouseEvent }
When a double click occurs, the "path:click" event is fired twice. If you want to determine the second click that is judged to be a double click, you can use the value of event.detail`.
"path:dblclick"	path double clicked
"path:pointerover"	pointer over on path	{ path: PATH_ID, event: PointerEvent }
"path:pointerout"	pointer out on path
"path:pointerdown"	pointer down on path
"path:pointerup"	pointer up on path
"path:contextmenu"	path right-clicked	{ path: Path, event: MouseEvent }
"path:select"	path selected	[ PATH_ID, ... ]