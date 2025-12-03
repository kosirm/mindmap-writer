mindscribble is a quasar app - builded as PWA, Electron and Mobile app.

UI consist of 3 main panels:
1. Left panel (Outline view by default)
2. Central panel (Mindmap by default)
3. Right panel (Writer by default)


Panels are resizable and can be expanded/collapsed via keyboard shortcuts and panel management component in the top bar - with this component we can expand/collapse panels and we can load views into panels (via context menu on panel icons).

In each panel can be loaded different views:
- Outline
- Mindmap
- Concept Map
- Writer
- Circle Pack
- Sunburst
- Treemap
- Timeline
- etc.

App has also left and right drawer. Left drawer will serve for all icons and tools which can be used on nodes (date, priority, etc.). Right drawer will serve for AI chat and other AI-related tools.

--- RAPID TOOLS ---
We use keyboard shortcuts and arrow keys for rapid node creation, navigation, selection, editing, movement.
These arrow key commands are similar (but not exactly the same in each view). Writer - move up/down indent (make child of previous sibling), unindent (make next sibling of parent)

--- EVENT BUS ---
Selection/movement(in structure) events are propagated to all active views via the store. Later we can propagate also other events (style,...)

--- NODE / CONNECTION STYLING ---
If it is possible to style on node/connection basis - then we need a powerful menu for styling nodes and edges.

--- LOCALSTORAGE ---
We should save into localstorage these things:

--- SEARCH AND SHORTCUT SYSTEM LIKE VSCODE ---
CTRL+P - SEARCH NODES - nodes in currently opened file and also in google disc (different color)
CTRL+SHIFT+P - SEARCH COMMANDS - every command has 3 representations: icon (in view toolbar - not necessary), keyboard shortcut and command in SEARCH COMMANDS dialog (just like in vscode). For this we need a strong command manager.

--- MOBILE UI ---
For mobile UI I would like to implement something like adroid desktop swipe - so each tab of the app (e.g. treeview, mindmap, writer) can be swiped left-right (they can't be on one screen). For up/down swipes I would implement settings (up) and extensive menu with icons for all actions (down). This toolbar should have tabs, so we can display all node actions there. There would be also left and right drawer, just like on desktop (left - node icons and actions, right - AI chat). I'm not a big fan of mobile mind-mapping but if it is done rigth, (maybe) it could be useful. I think that on mobile writer and treeview would shine (like notion), for mindmap and other views I'm not so sure... but let's try.
Also search + commands would be a powerfull feature.



