API
he-tree exports 2 components: BaseTree, Draggable. BaseTree is the base tree component. Draggable extends BaseTree, it includes drag functions. Follow API is simply divided into two parts because of this.

Stat<never>, Stat<unknown> in below are TypeScript format. unknown, never, any represent the node data of user. Stat<never> and Stat<unknown> are same, they mean the stat of a node.

The origin of all coordinates below is the upper left corner of the window. Such as the return value of Element.getBoundingClientRect().

BaseTree
props
btt
{ type: Boolean, default: false }
js
​
Tree start from bottom to top.

childrenKey
{ type: String, default: "children" }
js
​
Replace children key in data.

defaultOpen
{ type: Boolean, default: true }
js
​
Open all nodes by default.

indent
{ type: Number, default: 20 }
js
​
Node indent in px.

nodeKey
Useindex or return a unique value as key for Vue loop.

{ type:  "index" | ((stat: Stat<any>, index: number) => any), default: 'index' }
js
​
rtl
{ type: Boolean, default: false }
js
​
Display from right to left.

statHandler
{ type: (stat: Stat<any>) => Stat<any> }
js
​
Hook method. Handle each stat after each stat created.

table
{ type: Boolean, default: false }
js
​
Render as table.

textKey
{ type: String, default: "text" }
js
​
Replace text key in data. It is only used in default slot. If you provide your ui code, it may be unused.

updateBehavior
The way of emit new data when inner data changed.

modify: default. Modify binded data.
new: emit a new data, suits for for vuex.
disabled: do nothing. You can use getData to generate and get current data.
virtualization
{ type: Boolean, default: false }
js
​
Enable virtual list.

virtualizationPrerenderCount
{ type: Number, default: 20 }
js
​
The number of rendered list items at start. Suits for SSR(Server Side Render).

treeLine
{ type: Boolean, default: false }
js
​
Display tree line. This feature is not valid in table mode.

treeLineOffset
{ type: Number, default: 8 }
js
​
Horizontal displacement of tree lines, unit: pixels.

watermark
{ type: Boolean, default: false }
js
​
Print a watermark information to browser console.

data
dragNode
The dragging node stat.

dragOvering
The tree is being drag overing.

self
Tree instance.

stats
type type = Stat<your_node_type>[]
ts
​
All stats, tree structure.

statsFlat
type type = Stat<your_node_type>[]
ts
​
All stats, flat structure.

computed
rootChildren
type type = Stat<your_node_type>[]
ts
​
The top-level nodes' stats. Can be considered as a subset of a non-existent root node.

methods
methods examples
Some methods' examples. Click top right icon to view source code.


Projects

Frontend

Vue

Nuxt

React

Next

Angular

Backend

Photos

Videos
add: append to first nodeadd: after second nodeadd: nested new nodesaddMulti
batchUpdate
closeAllopenAllopenNodeAndParentsgetCheckedgetChecked(true)
getData: allgetData: first node
​
View Source
add
(nodeData: unknown, parent?: Stat<unknown> | null | undefined, index?: number | null | undefined): void;
ts
​
Add node. parent is null means root. Example

addMulti
(
  dataArr: any[],
  parent?: Stat<any> | null,
  startIndex?: number | null
): void;
ts
​
Add multiple continuously nodes. parent is null means root. Example

batchUpdate
(task: () => any): void;
ts
​
Merge multiple data update actions, to make it only emit new data once. Example

closeAll
(): void
ts
​
Close all nodes. Example

getChecked
(withDemi?: boolean | undefined): Stat<unknown>[]
ts
​
Get all checked nodes. Param withDemi means including half checked. Example

getData
(filter?: ((data: never) => never) | undefined, root?: Stat<never> | undefined): never[];
ts
​
Generate and get current data without stat. Param filter can handle each node data. Example

getRootEl
(): HTMLElement;
ts
​
Get the root element of the tree component.

getSiblings
(stat: Stat<never>): Stat<never>[];
ts
​
Get all siblings of a node including it self.

getStat
(nodeData: unknown): Stat<unknown>
ts
​
Get stat by node data.

getUnchecked
(withDemi?: boolean | undefined): Stat<unknown>[]
ts
​
Get all unchecked nodes. Param withDemi means including half checked.

has
(nodeData: unknown): boolean
ts
​
Detect the tree if has the stat of given node data.

isVisible
(statOrNodeData: Stat<unknown>|unknown): boolean;
ts
​
Detect if node is visible. When parent invisible or closed, children are invisible. Param statOrNodeData can be node data or stat.

iterateParent
(stat: Stat<unknown>, opt?: {
    withSelf: boolean;
} | undefined): Generator<Stat<unknown>, void, unknown>;
ts
​
Iterate all parents of a node. Param opt.withSelf means including it self. E.g.:

for (const parentStat of tree.iterateParent(nodeStat, { withSelf: false })) {
  //
}
ts
​
move
(stat: Stat<unknown>, parent: Stat<unknown> | null, index: number): boolean;
ts
​
Move node. parent is null means root. Similar to add, check the example of add: Example

openAll
(): void
ts
​
Open all nodes. Example

openNodeAndParents
(nodeDataOrStat): void
ts
​
Open a node and its all parents to make it visible. The argument nodeDataOrStat can be node data or node stat. Example

remove
(stat: Stat<unknown>): boolean;
ts
​
Remove node.

removeMulti
(dataArr: any[]): boolean;
ts
​
Remove multiple nodes.

updateCheck
(): void
ts
​
Recalculate checked state of all nodes from end to root.

events
check:node
Parameters: stat. Triggered when node checked changed.

click:node
Parameters: stat. Triggered when click node.

close:node
Parameters: stat. Triggered when close node.

open:node
Parameters: stat. Triggered when open node.

slots
default
Can be used to customize node ui. Parameters:

node: node data
stat: runtime info of node
indentStyle: node indent style. Only when rendering as a table, user should apply it to a column, usually the first column.
tree: tree instance.
placeholder
Can be used to customize placeholder ui. Parameters:

tree: tree instance.
prepend
Start of root element inner. Used to add table head when render as table . Parameters:

tree: tree instance.
append
End of root element inner. Used to add table foot when render as table. Parameters:

tree: tree instance.
Draggable
props
beforeDragOpen
(stat: Stat<any>) : void | Promise<void>
ts
​
Hook method. Call before open node when drag over it. Promise supported.

disableDrag
{
  type: Boolean
}
js
​
Disable drag.

disableDrop
{
  type: Boolean
}
js
​
Disable drop.

dragOpen
{ type: Boolean, default: true }
js
​
Open node when drag over it.

dragOpenDelay
{ type: Number, default: 0 }
js
​
Wait milliseconds before open node when drag over it.

eachDraggable
(stat: Stat<any>) : boolean | null
ts
​
Hook method. Control each node if is draggable. Child will inherit parent if not set.

eachDroppable
(stat: Stat<any>) : boolean | null
ts
​
Hook method. Control each node if is droppable. Child will inherit parent if not set.

externalDataHandler
(event: DragEvent) : any
ts
​
Call when external something dropped to the tree with Drag and Drop API. Tree will call it to create new node data.

keepPlaceholder
{ type: Boolean, default: false }
ts
​
Keep placeholder when drag leave a tree.

maxLevel
{
  type: Number
}
ts
​
If tree's max level will exceed this after drop, the drop will be prevented.

onExternalDragOver
(event: DragEvent) : boolean
ts
​
Call when external something dragged over the tree with Drag and Drop API. Param event is DragEvent type of Drag and Drop API. Return false to ignore it.

resolveStartMovePoint
"mouse" | "default" | ((dragElement: HTMLElement) : Point)
ts
​
The dragging node is think as a point. This means how to get the point. default is to get the top left of node . mouse is get mouse position. Or you can pass a method to return a coordinate: {x:number,y:number}.

rootDroppable
boolean | () : boolean
ts
​
Hook method. If the tree root is droppable. Default is true.

triggerClass
{
  type: [String, Array]
} // string | string[]
js
​
The trigger element css class. Default is the node self. Can be child element of node. A node can has multiple trigger elements.

dragOverThrottleInterval
number, default: 0.

throttle interval for dragover event, increasing it can improve performance, in milliseconds.

methods
getNodeByElement
(el: HTMLElement): Stat<any> | null
ts
​
Get node stat by HTML Element.

isDraggable
(node: Stat<any>): boolean
ts
​
Detect if node draggable.

isDroppable
(node: Stat<any>): boolean
ts
​
Detect if node droppable.

ondragstart
(event: DragEvent) => void
ts
​
A hook of dragstart event of HTML Drag and Drop API. You can use HTML Drag and Drop API's setDragImage method to custom drag image. Refer issue: https://github.com/phphe/he-tree/issues/99#issuecomment-1916000535

events
before-drag-start
Parameters: dragNode. Triggered before drag start.

after-drop
Parameters: nothing. Triggered after drop. Only triggered on dropped tree.

change
Parameters: nothing. Triggered after changed by drop. Triggered on both 2 trees when drag cross trees.

enter
Parameters: DragEvent. Triggered when drag enter a tree.

leave
Parameters: DragEvent. Triggered when drag leave a tree.

Others
Stat
Each node has a stat created by tree. It stores runtime info.

{
  [x: string]: any // You can add any other keys to a stat.
  data: T // Node data.
  open: boolean // Is opened.
  parent: Stat<T> | null // Parent stat.
  children: Stat<T>[] // Children stats.
  level: number // Level start from 1.
  isStat: boolean // Detect if is stat object.
  hidden: boolean // If hidden.
  checked: boolean | 0 // If checked. 0 mean just some children checked.
  draggable: boolean | null // null means inherit parent.
  droppable: boolean | null // null means inherit parent.
  style: any // Customize node style. Vue's style format.
  class: any // Customize node class name. Vue's class format.
}
ts
​
dragContext
Runtime info when drag. Example. including: startInfo, targetInfo, dragNode, startTree, targetTree. Import:

// vue3
import { dragContext } from '@he-tree/vue'
// vue2
import { dragContext } from '@he-tree/vue/vue2'
ts
​
startInfo
Type: StartInfo. Info about drag start.

targetInfo
Type: StartInfo. Info about drag target.

dragNode
Type: Stat. The dragging node.

startTree
Draggable component instance. The tree drag start at.

targetTree
Draggable component instance. Drag target tree.

closestNode
Type: Stat|null. The closest node in dragging. You can use it in eachDroppable.

Example - dragContext
Use the dragContext to obtain the dragNode in eachDroppable and achieve the following effect: odd nodes only accept odd nodes, even nodes only accept even nodes.

1
2
3
4
5
6
​
View Source
StartInfo
{
  tree: DraggableTreeType; // Draggable component instance.
  dragNode: Stat<any>; // The dragging node.
  parent: Stat<any> | null; // Parent of dragging node.
  siblings: Stat<any>[]; // Siblings of dragging node.
  indexBeforeDrop: number; // Index of dragging node before drop.
}