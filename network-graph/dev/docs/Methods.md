Methods
Instance Methods
Instance methods of <v-network-graph> component shown below.

Method	Description
fitToContents(options?: FitOptions): void	Perform zooming/panning according to the graph size.
FitOptions: { margin?: FitContentMargin }
FitContentMargin:
number | "${number}%" | "${number}px"
| {
    top?:    number | `${number}%` | `${number}px`,
    left?:   number | `${number}%` | `${number}px`,
    right?:  number | `${number}%` | `${number}px`,
    bottom?: number | `${number}%` | `${number}px`
  }
If margin is not specified, the configs.view.fitContentMargin configuration will be used. (default: "8%")
exportAsSvgText(options: ExportOptions): Promise<string>	Export the network-graph contents as SVG text data.
ExportOptions: { embedImages?: boolean }
exportAsSvgElement(options: ExportOptions): Promise<SVGElement>	Export the network-graph contents as cloned SVG element data.
ExportOptions: { embedImages?: boolean }
[Deprecated]
getAsSvg(): string	[Deprecated]
Get the network-graph contents as SVG text data.
getPan(): {x, y}	Get the pan vector.
getSizes(): Sizes	Get all calculate svg dimensions.
Sizes: {width, height, viewBox:{x, y, width, height}}
panTo(point: {x, y}): void	Pan to a rendered position.
panBy(point: {x, y}): void	Relatively pan the graph by a specified rendered position vector.
panToCenter(): void	Perform a pan to center the contents of the network graph.
startBoxSelection(options: BoxSelectionOption): void	Start the box-selection mode to select nodes within the dragged rectangle range.
BoxSelectionOption:
{
  stop?: "pointerup" | "click" | "manual"
  type?: "append" | "invert"
  withShiftKey?: "append" | "invert" | "same"
}
stop: Trigger to stop mode (default: "pointerup")
type: Selection type (default: "append")
withShiftKey: Selection type if shift key pressed at drag start (default: "same")
stopBoxSelection(): void	Stop the box-selection mode.
translateFromDomToSvgCoordinates(point: {x, y}): {x, y}	Translate from DOM to SVG coordinates.
translateFromSvgToDomCoordinates(point: {x, y}): {x, y}	Translate from SVG to DOM coordinates.
zoomIn(): void	Perform zoom-in.
zoomOut(): void	Perform zoom-out.
getViewBox(): Box	Get the coordinates of the area being displayed.
Box: { top: number, bottom: number, left: number, right: number }
setViewBox(box: Box): void	Set the coordinates of the area being displayed.
transitionWhile(func: () => void | Promise<void>, duration: number = 300, timingFunction: string = "linear"): void	When the position of a node changes within the function specified by the argument, a transition animation is triggered.
duration in milliseconds.