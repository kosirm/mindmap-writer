import emitter from '../../mitt'
import html2canvas from 'html2canvas'
import { getDataId, getGTransform, getPath } from './attribute'
import * as d3 from './d3'
import style from './css'
import type { Data, Mdata, TwoNumber } from './interface'
import { observer, selection, zoom, zoomTransform } from './variable'
import { afterOperation, mmdata } from './data'
import { snapshot } from './state'
import { foreignDivEle, gEle, svgEle, wrapperEle } from './variable/element'

/**
 * 使页面重排
 * @param ele - Element
 */
export const reflow = (ele: Element): number => ele.clientHeight

/**
 * 获取一个加号图形的path路径，图形的中心坐标为（0，0）
 * @param stroke - 线条的粗细
 * @param side - 图形的边长
 */
export const getAddPath = (stroke: number, side: number): string => {
  const temp0 = -side / 2
  const temp1 = -stroke / 2
  const temp2 = stroke / 2
  const temp3 = side / 2
  return `M${temp3},${temp2}H${temp2}V${temp3}H${temp1}V${temp2}H${temp0}V${temp1}H${temp1}V${temp0}H${temp2}V${temp1}H${temp3}V${temp2}Z`
}

export const convertToImg = (svgdiv: HTMLDivElement, name: string): void => {
  void html2canvas(svgdiv).then((canvas) => {
    const dataUrl = canvas.toDataURL()
    const window = open()
    if (window) {
      window.document.write(`<img src='${dataUrl}'>`)
      window.document.title = name
      window.document.close()
    }
  })
}

export const makeTransition = (
  dura: number, easingFn: (normalizedTime: number) => number
): d3.Transition<d3.BaseType, Mdata, null, undefined> => {
  return d3.transition<Mdata>().duration(dura).ease(easingFn)
}

export const getRelativePos = (wrapper: HTMLElement, e: MouseEvent): { left: number, top: number } => {
  const { pageX, pageY } = e
  const wrapperPos = wrapper.getBoundingClientRect()
  const wrapperLeft = wrapperPos.left + window.pageXOffset
  const wrapperTop = wrapperPos.top + window.pageYOffset

  return {
    left: pageX - wrapperLeft,
    top: pageY - wrapperTop
  }
}

/**
 * @param this - gText
 */
export function getDragContainer (this: SVGGElement): SVGGElement {
  return this.parentNode?.parentNode?.parentNode as SVGGElement
}

export function selectGNode (d: SVGGElement): void
export function selectGNode (d: Mdata): void
export function selectGNode (d: SVGGElement | Mdata): void {
  const dataId = d instanceof SVGGElement ? d.getAttribute('data-id') : getDataId(d)
  const ele = d instanceof SVGGElement ? d : document.querySelector<SVGGElement>(`g[data-id='${getDataId(d)}']`)
  const oldSele = document.getElementsByClassName(style.selected)[0]

  console.log('[Mindmap assistant] selectGNode called', {
    dataId,
    elementFound: !!ele,
    elementClasses: ele?.classList.toString(),
    oldSelection: oldSele?.getAttribute('data-id'),
    isSameElement: oldSele === ele
  })

  if (ele) {
    if (oldSele) {
      if (oldSele !== ele) {
        console.log('[Mindmap assistant] Switching selection from', oldSele.getAttribute('data-id'), 'to', dataId)
        oldSele.classList.remove(style.selected)
        ele.classList.add(style.selected)
        console.log('[Mindmap assistant] After adding selected class:', ele.classList.toString())
      } else {
        console.log('[Mindmap assistant] Same element clicked - setting edit-flag to true')
        emitter.emit('edit-flag', true)
      }
    } else {
      console.log('[Mindmap assistant] No previous selection - adding selected class to', dataId)
      ele.classList.add(style.selected)
      console.log('[Mindmap assistant] After adding selected class:', ele.classList.toString())
    }
  } else {
    // Element not found - this can happen after deletion when IDs are renewed
    // Just clear the old selection silently instead of throwing
    if (oldSele) {
      oldSele.classList.remove(style.selected)
    }
    console.warn('selectGNode: Element not found for', d)
  }
}

export function getSelectedGData (): Mdata {
  const sele = d3.select<SVGGElement, Mdata>(`.${style.selected}`)
  const data = sele.data()[0]
  if (!data) {
    throw new Error('No selected node found')
  }
  return data
}

/**
 * Get size of HTML content using foreignObject
 * @param html - HTML string
 * @returns width and height
 */
export const getSizeHTML = (html: string): { width: number, height: number } => {
  const { asstSvg } = selection
  if (!asstSvg) { throw new Error('asstSvg undefined') }

  // Create temporary foreignObject with large dimensions to prevent wrapping
  const fo = asstSvg.append('foreignObject')
    .attr('width', 2000)
    .attr('height', 2000)

  // Create div with HTML content - match the exact styles used in the actual mindmap
  const div = fo.append('xhtml:div')
    .style('display', 'inline-block')
    .style('font-family', 'inherit')
    .style('font-size', 'inherit')
    .style('line-height', '1.2')
    .style('white-space', 'nowrap')
    .html(html || ' ')

  // Measure the div
  const divNode = div.node() as HTMLDivElement
  const bbox = divNode.getBoundingClientRect()

  // Clean up
  fo.remove()

  // Add a buffer (5px) to account for browser rendering differences
  // This prevents text from being cut off at the edges
  return {
    width: Math.max(Math.ceil(bbox.width) + 5, 22),
    height: Math.max(Math.ceil(bbox.height) + 5, 22)
  }
}

export const moveNode = (node: SVGGElement, d: Mdata, p: TwoNumber, dura = 0): void => {
  const tran = makeTransition(dura, d3.easePolyOut)
  d.px = p[0]
  d.py = p[1]
  d3.select<SVGGElement, Mdata>(node).transition(tran).attr('transform', getGTransform)
  d3.select<SVGPathElement, Mdata>(`g[data-id='${getDataId(d)}'] > path`)
    .transition(tran)
    .attr('d', (d) => getPath(d))
}

export const centerView = (): void => {
  const { svg } = selection
  if (!svg) { return }
  const data = mmdata.data
  zoom.translateTo(svg, 0 + data.width / 2, 0 + data.height / 2)
}

/**
 * 缩放至合适大小并移动至全部可见
 */
export const fitView = (): void => {
  const { svg } = selection
  if (!svg || !gEle.value || !svgEle.value) { return }
  const gBB = gEle.value.getBBox()
  const svgBCR = svgEle.value.getBoundingClientRect()

  // Calculate scale, but cap it to prevent single nodes from becoming huge
  let multiple = Math.min(svgBCR.width / gBB.width, svgBCR.height / gBB.height)

  // If the scale would be too large (single node case), cap it at 1.0
  // This prevents a single root node from filling the entire screen
  if (multiple > 1.0) {
    multiple = 1.0
  }

  const svgCenter = { x: svgBCR.width / 2, y: svgBCR.height / 2 }
  // after scale
  const gCenter = { x: gBB.width * multiple / 2, y: gBB.height * multiple / 2 }
  const center = d3.zoomIdentity.translate(
    -gBB.x * multiple + svgCenter.x - gCenter.x,
    -gBB.y * multiple + svgCenter.y - gCenter.y
  ).scale(multiple)
  zoom.transform(svg, center)
}

/**
 * 元素被遮挡时，移动视图使其处于可见区域
 * @param ele - 元素
 */
export const moveView = (ele: Element): void => {
  const { svg } = selection
  // 得到d相对于视图左上角的坐标
  if (svg && svgEle.value) {
    const { k } = zoomTransform.value
    const gBCR = ele.getBoundingClientRect()
    const { x, y, width, height } = svgEle.value.getBoundingClientRect()
    const gLeft = gBCR.x - x
    const gRight = gLeft + gBCR.width
    const gTop = gBCR.y - y
    const gBottom = gTop + gBCR.height
    const space = 2 // 元素与视图的空隙，方便区分
    let x1 = 0
    let y1 = 0

    if (gLeft < 0) { x1 = -gLeft / k + space }
    if (gBCR.width > width || gRight > width) { x1 = -(gRight - width) / k - space }

    if (gTop < 0) { y1 = -gTop / k + space }
    if (gBCR.height > height || gBottom > height) { y1 = -(gBottom - height) / k - space}

    zoom.translateBy(svg, x1, y1)
  }
}

/**
 * 按一定程度缩放
 * @param flag - 为true时放大，false缩小
 */
export const scaleView = (flag: boolean): void => {
  const { svg } = selection
  if (!svg) { return }
  zoom.scaleBy(svg, flag ? 1.1 : 0.9)
}
export const download = (): void => {
  if (!wrapperEle.value) { return }
  convertToImg(wrapperEle.value, mmdata.data.name)
}
export const next = (): void => {
  const nextData = snapshot.next()
  if (nextData) {
    mmdata.data = nextData
    afterOperation(false)
  }
}
export const prev = (): void => {
  const prevData = snapshot.prev()
  if (prevData) {
    mmdata.data = prevData
    afterOperation(false)
  }
}

/**
 * foreignDivEle事件监听与观察
 * Note: blur event is now handled by Tiptap editor component
 */
export const bindForeignDiv = (): void => {
  if (foreignDivEle.value) {
    observer.observe(foreignDivEle.value)
    // Blur event removed - handled by Tiptap editor
    foreignDivEle.value.addEventListener('mousedown', (e: MouseEvent) => e.stopPropagation())
  }
}

/**
 * 判断字符串是否符合Data的数据格式，如果是，则返回格式化的数据，如果不是，返回false
 */
export const isData = (str: string): Data | false => {
  let data
  try {
    data = JSON.parse(str)
    return 'name' in data ? data : false
  } catch {
    return false
  }
}
