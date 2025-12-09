Options
Vue

defaultTabComponent
defaultTabComponent?: string

leftHeaderActionsComponent
leftHeaderActionsComponent?: string

prefixHeaderActionsComponent
prefixHeaderActionsComponent?: string

rightHeaderActionsComponent
rightHeaderActionsComponent?: string

watermarkComponent
watermarkComponent?: string

className
className?: string

debug
debug?: boolean

defaultRenderer
defaultRenderer?: 'always' | 'onlyWhenVisible'

disableAutoResizing
Disable the auto-resizing which is controlled through a ResizeObserver. Call .layout(width, height) to manually resize the container.
disableAutoResizing?: boolean

disableDnd
disableDnd?: boolean

disableFloatingGroups
disableFloatingGroups?: boolean

disableTabsOverflowList
disableTabsOverflowList?: boolean

dndEdges
dndEdges?: DroptargetOverlayModel | 'false'

floatingGroupBounds
floatingGroupBounds?: {
minimumHeightWithinViewport?: number,
minimumWidthWithinViewport?: number
} | 'boundedWithinViewport'

hideBorders
hideBorders?: boolean

locked
locked?: boolean

noPanelsOverlay
Define the behaviour of the dock when there are no panels to display. Defaults to watermark.
noPanelsOverlay?: 'watermark' | 'emptyGroup'

popoutUrl
popoutUrl?: string

rootOverlayModel
@deprecated
use dndEdges instead. To be removed in a future version.
rootOverlayModel?: DroptargetOverlayModel

scrollbars
Select native to use built-in scrollbar behaviours and custom to use an internal implementation that allows for improved scrollbar overlay UX. This is only applied to the tab header section. Defaults to custom.
scrollbars?: 'custom' | 'native'

singleTabMode
singleTabMode?: 'default' | 'fullwidth'

theme
theme?: DockviewTheme

API
Vue

This section describes the api object.

constructor


activeGroup
Active group object.
activeGroup: DockviewGroupPanel | undefined

activePanel
Active panel object.
activePanel: IDockviewPanel | undefined

groups
All group objects.
groups: DockviewGroupPanel[]

height
Height of the component.
height: number

id
The unique identifier for this instance. Used to manage scope of Drag'n'Drop events.
id: string

maximumHeight
Maximum height of the component.
maximumHeight: number

maximumWidth
Maximum width of the component.
maximumWidth: number

minimumHeight
Minimum height of the component.
minimumHeight: number

minimumWidth
Minimum width of the component.
minimumWidth: number

onDidActiveGroupChange
Invoked when the active group changes. May be undefined if no group is active.
onDidActiveGroupChange: Event<DockviewGroupPanel | undefined>

onDidActivePanelChange
Invoked when the active panel changes. May be undefined if no panel is active.
onDidActivePanelChange: Event<IDockviewPanel | undefined>

onDidAddGroup
Invoked when a group is added. May be called multiple times when moving groups.
onDidAddGroup: Event<DockviewGroupPanel>

onDidAddPanel
Invoked when a panel is added. May be called multiple times when moving panels.
onDidAddPanel: Event<IDockviewPanel>

onDidDrop
Invoked when a Drag'n'Drop event occurs that the component was unable to handle. Exposed for custom Drag'n'Drop functionality.
onDidDrop: Event<DockviewDidDropEvent>

onDidLayoutChange
Invoked when any layout change occures, an aggregation of many events.
onDidLayoutChange: Event<void>

onDidLayoutFromJSON
Invoked after a layout is deserialzied using the fromJSON method.
onDidLayoutFromJSON: Event<void>

onDidMaximizedGroupChange
onDidMaximizedGroupChange: Event<DockviewMaximizedGroupChanged>

onDidMovePanel
onDidMovePanel: Event<MovePanelEvent>

onDidOpenPopoutWindowFail
onDidOpenPopoutWindowFail: Event<void>

onDidPopoutGroupPositionChange
onDidPopoutGroupPositionChange: Event<PopoutGroupChangePositionEvent>

onDidPopoutGroupSizeChange
onDidPopoutGroupSizeChange: Event<PopoutGroupChangeSizeEvent>

onDidRemoveGroup
Invoked when a group is removed. May be called multiple times when moving groups.
onDidRemoveGroup: Event<DockviewGroupPanel>

onDidRemovePanel
Invoked when a panel is removed. May be called multiple times when moving panels.
onDidRemovePanel: Event<IDockviewPanel>

onUnhandledDragOverEvent
onUnhandledDragOverEvent: Event<DockviewDndOverlayEvent>

onWillDragGroup
Invoked before a group is dragged. Calling event.nativeEvent.preventDefault() will prevent the group drag starting.
onWillDragGroup: Event<GroupDragEvent>

onWillDragPanel
Invoked before a panel is dragged. Calling event.nativeEvent.preventDefault() will prevent the panel drag starting.
onWillDragPanel: Event<TabDragEvent>

onWillDrop
Invoked when a Drag'n'Drop event occurs but before dockview handles it giving the user an opportunity to intecept and prevent the event from occuring using the standard preventDefault() syntax. Preventing certain events may causes unexpected behaviours, use carefully.
onWillDrop: Event<DockviewWillDropEvent>

onWillShowOverlay
Invoked before an overlay is shown indicating a drop target. Calling event.preventDefault() will prevent the overlay being shown and prevent the any subsequent drop event.
onWillShowOverlay: Event<WillShowOverlayLocationEvent>

panels
All panel objects.
panels: IDockviewPanel[]

size
Total number of groups.
size: number

totalPanels
Total number of panels.
totalPanels: number

width
Width of the component.
width: number

addFloatingGroup
Add a floating group
addFloatingGroup(item: DockviewGroupPanel | IDockviewPanel, options: FloatingGroupOptions): void


addGroup
Add a group and return the created object.
addGroup(options: (GroupOptions & AbsolutePosition) | (GroupOptions & AddGroupOptionsWithPanel) | (GroupOptions & AddGroupOptionsWithGroup)): DockviewGroupPanel


addPanel
Add a panel and return the created object.
addPanel<T extends object = Parameters>(options: AddPanelOptions<T>): IDockviewPanel

addPopoutGroup
Add a popout group in a new Window
addPopoutGroup(item: DockviewGroupPanel | IDockviewPanel, options: {
		onDidOpen?: (event: {
		id: string,
		window: Window
	}): void,
		onWillClose?: (event: {
		id: string,
		window: Window
	}): void,
		popoutUrl?: string,
		position?: Box
	}): Promise<boolean>

clear
Reset the component back to an empty and default state.
clear(): void

closeAllGroups
Close all groups and panels.
closeAllGroups(): void

dispose
Release resources and teardown component. Do not call when using framework versions of dockview.
dispose(): void

exitMaximizedGroup
exitMaximizedGroup(): void

focus
Focus the component. Will try to focus an active panel if one exists.
focus(): void

fromJSON
Create a component from a serialized object.
fromJSON(data: SerializedDockview): void

getGroup
Get a group object given a string id. May return undefined.
getGroup(id: string): IDockviewGroupPanel | undefined

getPanel
Get a panel object given a string id. May return undefined.
getPanel(id: string): IDockviewPanel | undefined

hasMaximizedGroup
hasMaximizedGroup(): boolean

layout
Force resize the component to an exact width and height. Read about auto-resizing before using.
layout(width: number, height: number, force: boolean): void

maximizeGroup
maximizeGroup(panel: IDockviewPanel): void

moveToNext
Move the focus progmatically to the next panel or group.
moveToNext(options: MovementOptions): void

moveToPrevious
Move the focus progmatically to the previous panel or group.
moveToPrevious(options: MovementOptions): void

removeGroup
Remove a group and any panels within the group.
removeGroup(group: IDockviewGroupPanel): void

removePanel
Remove a panel given the panel object.
removePanel(panel: IDockviewPanel): void

toJSON
Create a serialized object of the current component.
toJSON(): SerializedDockview

updateOptions
updateOptions(options: Partial<DockviewComponentOptions>): void

Panel API
Vue

component
The id of the component renderer
readonly component: string

group
readonly group: DockviewGroupPanel

height
The panel height in pixels
readonly height: number

id
The id of the panel that would have been assigned when the panel was created
readonly id: string

isActive
Whether the panel is the actively selected panel
readonly isActive: boolean

isFocused
Whether the panel holds the current focus
readonly isFocused: boolean

isGroupActive
readonly isGroupActive: boolean

isVisible
Whether the panel is visible
readonly isVisible: boolean

location
readonly location: DockviewGroupLocation

onDidActiveChange
readonly onDidActiveChange: Event<ActiveEvent>

onDidActiveGroupChange
readonly onDidActiveGroupChange: Event<ActiveGroupEvent>

onDidDimensionsChange
readonly onDidDimensionsChange: Event<PanelDimensionChangeEvent>

onDidFocusChange
readonly onDidFocusChange: Event<FocusEvent>

onDidGroupChange
readonly onDidGroupChange: Event<GroupChangedEvent>

onDidLocationChange
readonly onDidLocationChange: Event<DockviewGroupPanelFloatingChangeEvent>

onDidParametersChange
readonly onDidParametersChange: Event<Parameters>

onDidRendererChange
readonly onDidRendererChange: Event<RendererChangedEvent>

onDidTitleChange
readonly onDidTitleChange: Event<TitleEvent>

onDidVisibilityChange
readonly onDidVisibilityChange: Event<VisibilityEvent>

onWillFocus
readonly onWillFocus: Event<WillFocusEvent>

renderer
readonly renderer: DockviewPanelRenderer

tabComponent
The id of the tab component renderer Undefined if no custom tab renderer is provided
readonly tabComponent: string | undefined

title
readonly title: string | undefined

width
The panel width in pixels
readonly width: number

close
close(): void

exitMaximized
exitMaximized(): void

getParameters
getParameters<T extends Parameters = Parameters>(): T

getWindow
If you require the Window object
getWindow(): Window

isMaximized
isMaximized(): boolean

maximize
maximize(): void

moveTo
moveTo(options: DockviewGroupMoveParams): void

setActive
setActive(): void

setRenderer
setRenderer(renderer: DockviewPanelRenderer): void

setSize
setSize(event: SizeEvent): void

setTitle
setTitle(title: string): void

updateParameters
updateParameters(parameters: Parameters): void

