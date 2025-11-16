import style from '../css'
import { ctm, editFlag, selection, textRectPadding, zoomTransform } from '../variable'
import * as d3 from '../d3'
import type { Mdata } from '../interface'
import { fitView, getRelativePos, getSelectedGData, isData, moveNode, moveView, scaleView, selectGNode } from '../assistant'
import { add, addParent, addSibling, changeLeft, collapse, del, delOne, expand, mmdata, moveChild, moveSibling } from '../data'
import { svgEle, gEle, wrapperEle } from '../variable/element'
import emitter from '../../../mitt'
import { getDataId, getSiblingGClass } from '../attribute'
import type { MenuEvent } from '../variable/contextmenu'

/**
 * @param this - gContent
 */
export function onMouseEnter (this: SVGGElement): void {
  const temp = this.querySelector<HTMLElement>(`g.${style['add-btn']}`)
  if (temp) { temp.style.opacity = '1' }
}

/**
 * @param this - gContent
 */
export function onMouseLeave (this: SVGGElement): void {
  const temp = this.querySelector<HTMLElement>(`g.${style['add-btn']}`)
  if (temp) { temp.style.opacity = '0' }
}

export const onZoomMove = (e: d3.D3ZoomEvent<SVGSVGElement, null>): void => {
  const { g } = selection
  if (!g) { return }
  zoomTransform.value = e.transform
  g.attr('transform', e.transform.toString())
}

export const onSelect = (e: MouseEvent, d: Mdata): void => {
  console.log('[Mindmap listener] onSelect called', { nodeId: d.id, nodeName: d.name, event: e.type });
  e.stopPropagation()
  selectGNode(d)
  // Emit event for cross-view synchronization
  emitter.emit('node-selected-in-mindmap', d.id)
}

/**
 * 进入编辑状态 - Now uses Tiptap editor
 * @param this - gText
 */
export function onEdit (this: SVGGElement, _e: MouseEvent, d: Mdata): void {
  console.log('[Mindmap listener] onEdit called', { nodeId: d.id, nodeName: d.name, editFlag });
  const gNode = this.parentNode?.parentNode as SVGGElement
  const { foreign } = selection
  if (editFlag && foreign) {
    gNode.classList.add(style.edited)
    emitter.emit('edit-flag', false)

    // Position and size the foreignObject overlay
    foreign.attr('x', d.x - 2 - (d.left ? d.width : 0))
      .attr('y', d.y - mmdata.data.y - 2)
      .attr('width', d.width + 4)
      .attr('height', d.height + 4)
      .attr('data-id', d.id)
      .attr('data-name', d.name)
      .style('display', '')

    console.log('[Mindmap listener] foreignObject positioned', {
      x: d.x - 2 - (d.left ? d.width : 0),
      y: d.y - mmdata.data.y - 2,
      width: d.width + 4,
      height: d.height + 4
    })

    // Emit event to trigger Tiptap editor
    emitter.emit('start-edit', {
      nodeId: d.id,
      content: d.name,
      oldName: d.name
    })

    const gContent = gNode.querySelector<SVGGElement>(`:scope > .${style.content}`)
    if (gContent) {
      moveView(gContent)
    }
  }
}

// onEditBlur is no longer needed - handled by Tiptap editor's save/cancel events

export const onContextmenu = (e: MouseEvent): void => {
  e.preventDefault()
  if (!wrapperEle.value) { return }
  const relativePos = getRelativePos(wrapperEle.value, e)
  ctm.pos.value = relativePos
  const eventTargets = e.composedPath() as SVGElement[]
  const gNode = eventTargets.find((et) => et.classList?.contains('node'))
  if (gNode) {
    const { classList } = gNode
    const isRoot = classList.contains(style.root)
    const collapseFlag = classList.contains(style['collapse'])
    if (!classList.contains(style.selected)) { selectGNode(gNode as SVGGElement) }
    ctm.deleteItem.value.disabled = isRoot
    ctm.cutItem.value.disabled = isRoot
    ctm.deleteOneItem.value.disabled = isRoot
    ctm.addSiblingItem.value.disabled = isRoot
    ctm.addSiblingBeforeItem.value.disabled = isRoot
    ctm.addParentItem.value.disabled = isRoot
    ctm.expandItem.value.disabled = !collapseFlag
    ctm.collapseItem.value.disabled = collapseFlag || classList.contains('leaf')
    ctm.showViewMenu.value = false
  } else {
    ctm.showViewMenu.value = true
  }
  emitter.emit('showContextmenu', true)
}

export const onClickMenu = (name: MenuEvent): void => {
  switch (name) {
    case 'zoomfit': fitView(); break
    case 'zoomin': scaleView(true); break
    case 'zoomout': scaleView(true); break
    case 'add': addAndEdit(new MouseEvent('click'), getSelectedGData()); break
    case 'delete': del(getSelectedGData().id); break
    case 'delete-one': delOne(getSelectedGData().id); break
    case 'collapse': collapse(getSelectedGData().id); break
    case 'expand': expand(getSelectedGData().id); break
    case 'add-sibling': {
      const seleData = getSelectedGData()
      const d = addSibling(seleData.id, '')
      if (d) { edit(d) }
    } break
    case 'add-sibling-before': {
      const seleData = getSelectedGData()
      const d = addSibling(seleData.id, '', true)
      if (d) { edit(d) }
    } break
    case 'add-parent': {
      const seleData = getSelectedGData()
      const d = addParent(seleData.id, '')
      if (d) { edit(d) }
    } break
    case 'cut': {
      const { id } = getSelectedGData()
      const rawdata = mmdata.find(id)?.rawData
      if (rawdata) {
        // navigator.clipboard.write
        void navigator.clipboard.writeText(JSON.stringify(rawdata))
      }
      del(id)
    } break
    case 'copy': {
      const seleData = getSelectedGData()
      const rawdata = mmdata.find(seleData.id)?.rawData
      if (rawdata) {
        // navigator.clipboard.write
        void navigator.clipboard.writeText(JSON.stringify(rawdata))
      }
    } break
    case 'paste': {
      const seleData = getSelectedGData()
      void navigator.clipboard.readText().then(clipText => {
        const rawdata = isData(clipText) || { name: clipText }
        add(seleData.id, rawdata)
      })
    } break
    default: break
  }
}

/**
 * 添加子节点并进入编辑模式
 */
 export const addAndEdit = (e: MouseEvent, d: Mdata): void => {
  const child = add(d.id, '')
  if (child) { edit(child, e) }
}

/**
 * 选中节点进入编辑模式
 */
export function edit (d: Mdata, e = new MouseEvent('click')): void {
  const { g } = selection
  if (!g) { return }
  const gText = g.selectAll<SVGGElement, Mdata>(`g[data-id='${getDataId(d)}'] > g.${style.content} > g.${style.text}`)
  const node = gText.node()

  if (node) {
    emitter.emit('edit-flag', true)
    onEdit.call(node, e, d)
  }
}

export const onClickExpandBtn = (e: MouseEvent, d: Mdata): void => {
  expand(d.id)
}

/**
 * @param this - gText
 */
export function onDragMove (this: SVGGElement, e: d3.D3DragEvent<SVGGElement, Mdata, Mdata>, d: Mdata): void {
  const gNode = this.parentNode?.parentNode as SVGGElement
  if (svgEle.value) { svgEle.value.classList.add(style.dragging) }
  const { g } = selection
  if (!g) { return }

  const dragOffset: [number, number] = [e.x - d.x, e.y - d.y];

  // Log every 10th drag event to avoid console spam
  if (Math.random() < 0.1) {
    console.log('[onDragMove] Dragging', {
      nodeId: d.id,
      eventX: e.x,
      eventY: e.y,
      nodeX: d.x,
      nodeY: d.y,
      dragOffsetX: dragOffset[0],
      dragOffsetY: dragOffset[1]
    });
  }

  moveNode(gNode, d, dragOffset)
  // 鼠标相对gEle左上角的位置
  const mousePos = d3.pointer(e, gEle.value)
  mousePos[1] += mmdata.data.y

  const temp = g.selectAll<SVGGElement, Mdata>('g.node').filter((other) => {
    if (other !== d && other !== d.parent && !other.id.startsWith(d.id)) {
      let diffx0 = textRectPadding
      let diffx1 = other.width + textRectPadding
      if (other.left && other.depth !== 0) {
        [diffx0, diffx1] = [diffx1, diffx0]
      }
      const rect = {
        x0: other.x - diffx0,
        x1: other.x + diffx1,
        y0: other.y - textRectPadding,
        y1: other.y + other.height + textRectPadding
      }

      return mousePos[0] > rect.x0 && mousePos[1] > rect.y0 && mousePos[0] < rect.x1 && mousePos[1] < rect.y1
    }
    return false
  })
  const old = Array.from(document.getElementsByClassName(style.outline))
  const n = temp.node()
  old.forEach((o) => { if (o !== n) { o.classList.remove(style.outline) } })
  n?.classList.add(style.outline)
}

/**
 * @param this - gText
 */
export function onDragEnd (this: SVGGElement, e: d3.D3DragEvent<SVGGElement, Mdata, Mdata>, d: Mdata): void {
  const gNode = this.parentNode?.parentNode as SVGGElement
  if (svgEle.value) { svgEle.value.classList.remove(style.dragging) }

  console.log('[onDragEnd] Drag ended', {
    nodeId: d.id,
    nodeName: d.name,
    depth: d.depth,
    currentLeft: d.left,
    currentX: d.x,
    dragOffsetPx: d.px,
    dragOffsetPy: d.py,
    finalX: d.x + d.px,
    finalY: d.y + d.py
  });

  // 判断是否找到了新的父节点
  const np = document.getElementsByClassName(style.outline)[0]
  if (np) {
    console.log('[onDragEnd] Found new parent node');
    np.classList.remove(style.outline)
    const pid = np.getAttribute('data-id')
    if (pid) {
      d.px = 0
      d.py = 0
      moveChild(pid, d.id)
    } else {
      throw new Error('outline data-id null')
    }
    return
  }

  // 判断是否变换left
  const rootWidth = mmdata.getRootWidth();
  const xToCenter = d.x - rootWidth / 2;
  const lr = d.depth === 1 && (xToCenter * (xToCenter + d.px) < 0);

  console.log('[onDragEnd] Side change check', {
    rootWidth,
    xToCenter,
    'xToCenter + d.px': xToCenter + d.px,
    'xToCenter * (xToCenter + d.px)': xToCenter * (xToCenter + d.px),
    'depth === 1': d.depth === 1,
    lr: lr,
    willChangeSide: lr
  });

  // If crossing to the other side, change side immediately without checking siblings
  if (lr) {
    console.log('[onDragEnd] Changing side! Using rawData:', d.rawData.name, 'dropY:', d.y + d.py);
    const dropY = d.y + d.py
    d.px = 0
    d.py = 0
    changeLeft(d.rawData, dropY)
    return
  }

  // Not changing sides, check if we need to reorder siblings on the same side
  const getSameSide = (a: Mdata) => a.left === d.left
  const p = gNode.parentNode as SVGGElement
  let downD = d
  let upD = d
  const brothers = d3.select<SVGGElement, Mdata>(p)
    .selectAll<SVGGElement, Mdata>(`g.${getSiblingGClass(d).join('.')}`)
    .filter((a) => a !== d && getSameSide(a))
  const endY = d.y + d.py

  console.log('[onDragEnd] Sibling check', {
    brothersCount: brothers.size(),
    endY,
    currentY: d.y
  });

  brothers.each((b) => {
    if (b.y > d.y && b.y < endY && b.y > upD.y) { upD = b } // 找新哥哥节点
    if (b.y < d.y && b.y > endY && b.y < downD.y) { downD = b } // 找新弟弟节点
  })

  console.log('[onDragEnd] Final decision', {
    downDId: downD.id,
    upDId: upD.id,
    currentId: d.id,
    willMoveSiblingDown: downD.id !== d.id,
    willMoveSiblingUp: upD.id !== d.id
  });

  if (downD.id !== d.id) {
    console.log('[onDragEnd] Moving sibling (down)');
    d.px = 0
    d.py = 0
    moveSibling(d.id, downD.id)
  } else if (upD.id !== d.id) {
    console.log('[onDragEnd] Moving sibling (up)');
    d.px = 0
    d.py = 0
    moveSibling(d.id, upD.id, 1)
  } else {
    console.log('[onDragEnd] Restoring position (no change)');
    // 复原
    moveNode(gNode, d, [0, 0], 500)
  }
}
