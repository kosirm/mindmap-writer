import type { Mdata, SelectionG, IsMdata } from '../interface'
import * as d3 from '../d3'
import { attrA, attrAddBtnRect, attrExpandBtnCircle, attrExpandBtnRect, attrG, attrPath, attrForeignObject, attrDiv, getSiblingGClass } from '../attribute'
import { getAddPath, makeTransition } from '../assistant'
import { addBtnRect, addNodeBtn, drag, mmprops, selection, currentOrientation } from '../variable'
import { mmdata } from '../data'
import { addAndEdit, onClickExpandBtn, onEdit, onMouseEnter, onMouseLeave, onSelect } from '../listener'
import { appendIcons, attrIcons, positionIconsContainer } from './icons'
import emitter from '../../../mitt'
import style from '../css'

/**
 * Get children in visual order based on current orientation
 * For clockwise/anticlockwise, children on certain sides need to be reversed for display
 * This applies recursively to all depth levels
 *
 * Logic:
 * - left-right: no reversal (left: top→bottom, right: top→bottom)
 * - right-left: no reversal (left: top→bottom, right: top→bottom)
 * - clockwise: reverse LEFT side (left: bottom→top, right: top→bottom)
 * - anticlockwise: reverse RIGHT side (left: top→bottom, right: bottom→top)
 */
const getVisualChildren = (node: Mdata): Mdata[] => {
  if (!node.children || node.children.length === 0) {
    return []
  }

  const children = [...node.children] // Clone to avoid mutating original

  // For root node (depth 0), don't reverse here - handled by separateLeftAndRight in layout
  if (node.depth === 0) {
    return children
  }

  // For all other nodes, check if reversal is needed based on:
  // 1. Which side the node is on (node.left)
  // 2. Current orientation
  const shouldReverse =
    (currentOrientation === 'clockwise' && node.left === true) ||
    (currentOrientation === 'anticlockwise' && node.left === false)

  const childIds = children.map(c => c.id).join(', ')
  console.log(`getVisualChildren: node.id=${node.id}, depth=${node.depth}, left=${node.left}, orientation=${currentOrientation}, shouldReverse=${shouldReverse}, children=[${childIds}]`)

  if (shouldReverse) {
    const reversed = children.reverse()
    const reversedIds = reversed.map(c => c.id).join(', ')
    console.log(`  → REVERSED to: [${reversedIds}]`)
    return reversed
  }

  return children
}



export const appendAddBtn = (g: SelectionG): d3.Selection<SVGGElement, Mdata, SVGGElement, IsMdata> => {
  const gAddBtn = g.append('g')
  attrAddBtnRect(gAddBtn.append('rect'))
  gAddBtn.append('path').attr('d', getAddPath(2, addBtnRect.side))
  return gAddBtn
}

const appendAndBindAddBtn = (g: SelectionG) => {
  const gAddBtn = appendAddBtn(g)
  gAddBtn.on('click', addAndEdit)
  return gAddBtn
}

export const appendExpandBtn = (g: SelectionG): d3.Selection<SVGGElement, Mdata, SVGGElement, IsMdata> => {
  const expandBtn = g.append('g')
  attrExpandBtnRect(expandBtn.append('rect'))
  attrExpandBtnCircle(expandBtn.append('circle'), -4)
  attrExpandBtnCircle(expandBtn.append('circle'), 0)
  attrExpandBtnCircle(expandBtn.append('circle'), 4)
  return expandBtn
}

const bindEvent = (g: SelectionG, isRoot: boolean) => {
  const gExpandBtn = g.select(`:scope > g.${style.content} > g.${style['expand-btn']}`)
  gExpandBtn.on('click', onClickExpandBtn)

  const gContent = g.select<SVGGElement>(`:scope > g.${style.content}`)
  const gTrigger = gContent.select<SVGRectElement>(`:scope > rect.${style.trigger}`)

  if (mmprops.value.drag || mmprops.value.edit) {
    const gText = gContent.select<SVGGElement>(`:scope > g.${style.text}`)
    const gTextNode = gText.node();
    // Now we use foreignObject instead of text element
    const foreignObject = gText.select<SVGForeignObjectElement>(':scope > foreignObject')
    const foreignObjectNode = foreignObject.node();
    const gTriggerNode = gTrigger.node();
    const gTextRect = gText.select(':scope > rect')
    const gTextRectNode = gTextRect.node();

    console.log('[Mindmap draw] bindEvent - binding events', {
      gTextEmpty: gText.empty(),
      gTextNode,
      gTextNodePointerEvents: gTextNode ? window.getComputedStyle(gTextNode as Element).pointerEvents : 'N/A',
      foreignObjectEmpty: foreignObject.empty(),
      foreignObjectNode,
      foreignObjectPointerEvents: foreignObjectNode ? window.getComputedStyle(foreignObjectNode as Element).pointerEvents : 'N/A',
      gTriggerNode,
      gTriggerPointerEvents: gTriggerNode ? window.getComputedStyle(gTriggerNode as Element).pointerEvents : 'N/A',
      gTriggerDimensions: gTriggerNode ? {
        x: gTriggerNode.getAttribute('x'),
        y: gTriggerNode.getAttribute('y'),
        width: gTriggerNode.getAttribute('width'),
        height: gTriggerNode.getAttribute('height')
      } : 'N/A',
      gTextRectNode,
      gTextRectPointerEvents: gTextRectNode ? window.getComputedStyle(gTextRectNode as Element).pointerEvents : 'N/A',
      isRoot
    });

    // Add mousedown listener to gTrigger to see if it's capturing events
    gTrigger.on('mousedown', (e: MouseEvent, d: Mdata) => {
      console.log('[Mindmap draw] gTrigger mousedown fired', {
        nodeId: d.id,
        nodeName: d.name,
        target: e.target,
        currentTarget: e.currentTarget,
        targetTagName: (e.target as Element)?.tagName,
        targetClass: (e.target as Element)?.className
      });
    })

    gText.on('mousedown', (e: MouseEvent, d: Mdata) => {
      console.log('[Mindmap draw] gText mousedown fired', {
        nodeId: d.id,
        nodeName: d.name,
        target: e.target,
        currentTarget: e.currentTarget
      });
      onSelect(e, d);
    })

    if (mmprops.value.drag && !isRoot) { drag(gText) }

    // Bind edit to foreignObject (HTML rendering)
    if (mmprops.value.edit) {
      foreignObject.on('click', (e: MouseEvent, d: Mdata) => {
        console.log('[Mindmap draw] foreignObject clicked', { nodeId: d.id, nodeName: d.name });
        // Get the parent gText element from the event target
        const target = e.currentTarget as SVGForeignObjectElement
        const gTextNode = target?.parentElement
        if (gTextNode && gTextNode instanceof SVGGElement) {
          onEdit.call(gTextNode, e, d)
        }
      })
    }

    // Bind icon click to switch to Content Editor
    const gIconsContainer = gContent.select(':scope > g.icons-container')
    gIconsContainer.on('click', (e: MouseEvent, d: Mdata) => {
      e.stopPropagation()
      // Emit event to switch to Node Content mode in Text Editor
      emitter.emit('icon-clicked', d.id)
    })
  }

  if (addNodeBtn.value) {
    gContent
      .on('mouseenter', onMouseEnter)
      .on('mouseleave', onMouseLeave)
  }
}

const appendNode = (enter: d3.Selection<d3.EnterElement, Mdata, SVGGElement, IsMdata>) => {
  const isRoot = !enter.data()[0]?.depth
  const enterG = enter.append('g')
  attrG(enterG)
  // 绘制线
  attrPath(enterG.append('path'))
  // 节点容器
  const gContent = enterG.append('g').attr('class', style.content)
  const gTrigger = gContent.append('rect')

  // 绘制图标组 (separate from text)
  const gIconsContainer = gContent.append('g').attr('class', 'icons-container')
  appendIcons(gIconsContainer) // Position the container
  const gIconsRect = gIconsContainer.append('rect').attr('class', 'icons-rect')
  const gIcons = gIconsContainer.append('g').attr('class', 'node-icons')
  attrIcons(gIcons) // Render icons within container

  // 绘制文本组 (separate from icons) - HTML rendering with foreignObject
  const gText = gContent.append('g').attr('class', style.text)
  const gTextRect = gText.append('rect')
  const foreignObject = gText.append('foreignObject')
  attrForeignObject(foreignObject)
  const div = foreignObject.append('xhtml:div')
  attrDiv(div)

  // Debug: Add data attribute to help identify nodes
  enterG.attr('data-node-name', (d: Mdata) => d.name || 'EMPTY')
  // 绘制添加按钮
  let gAddBtn
  if (addNodeBtn.value) { gAddBtn = appendAndBindAddBtn(gContent) }
  // 绘制折叠按钮
  const gExpandBtn = appendExpandBtn(gContent)

  attrA(isRoot, gTrigger, gTextRect, gExpandBtn, gAddBtn, gIconsRect)

  bindEvent(enterG, isRoot)

  enterG.each((d: Mdata, i: number) => {
    if (!d.children) { return }
    // @ts-expect-error - D3 selection type mismatch
    draw(d.children, enterG.filter((_a: Mdata, b: number) => i === b))
  })
  gContent.raise()
  return enterG
}

const updateNode = (update: SelectionG) => {
  const isRoot = !update.data()[0]?.depth
  const tran = makeTransition(500, d3.easePolyOut)
  attrG(update, tran)
  attrPath(update.select<SVGPathElement>(':scope > path'), tran)
  const gContent = update.select<SVGGElement>(`:scope > g.${style.content}`)
  const gTrigger = gContent.select<SVGRectElement>(':scope > rect')

  // Update icons container
  let gIconsContainer = gContent.select<SVGGElement>(':scope > g.icons-container')
  if (!gIconsContainer.node()) {
    gIconsContainer = gContent.insert('g', `g.${style.text}`).attr('class', 'icons-container')
    gIconsContainer.append('rect').attr('class', 'icons-rect')
    gIconsContainer.append('g').attr('class', 'node-icons')
  }
  positionIconsContainer(gIconsContainer) // Position the container
  const gIconsRect = gIconsContainer.select<SVGRectElement>(':scope > rect.icons-rect')
  const gIcons = gIconsContainer.select<SVGGElement>(':scope > g.node-icons')
  attrIcons(gIcons) // Render icons within container

  // Update text - HTML rendering with foreignObject
  const gText = gContent.select<SVGGElement>(`:scope > g.${style.text}`)
  const gTextRect = gText.select<SVGRectElement>(':scope > rect')
  const foreignObject = gText.select<SVGForeignObjectElement>(':scope > foreignObject')
  attrForeignObject(foreignObject, tran)
  const div = foreignObject.select('div') as d3.Selection<d3.BaseType, Mdata, d3.BaseType, IsMdata>
  attrDiv(div)
  let gAddBtn = gContent.select<SVGGElement>(`g.${style['add-btn']}`)
  const gExpandBtn = gContent.select<SVGGElement>(`g.${style['expand-btn']}`)
  if (addNodeBtn.value) {
    if (!gAddBtn.node()) { gAddBtn = appendAndBindAddBtn(gContent) }
  } else {
    gAddBtn.remove()
  }

  attrA(isRoot, gTrigger, gTextRect, gExpandBtn, gAddBtn, gIconsRect)

  // Rebind events on update (important for reactivity)
  bindEvent(update, isRoot)

  update.each((d: Mdata, i: number) => {
    // Always draw children (even if empty array) to properly handle deletions
    if (!d.children || d.children.length === 0) {
      // If no children, we still need to call draw with empty array to remove any existing child nodes
      // @ts-expect-error - D3 selection type mismatch
      draw([], update.filter((_a: Mdata, b: number) => i === b))
      return
    }
    // Get children in visual order based on orientation
    const visualChildren = getVisualChildren(d)
    // @ts-expect-error - D3 selection type mismatch
    draw(visualChildren, update.filter((_a: Mdata, b: number) => i === b))
  })
  gContent.raise()
  return update
}

export const draw = (d = [mmdata.data], sele?: d3.Selection<SVGGElement, unknown, null, undefined>): void => {
  const actualSele = sele || selection.g
  if (!actualSele) { return }
  const firstNode = d[0]

  // Special case: if d is empty array, we need to remove all child nodes
  if (!firstNode) {
    // @ts-expect-error - D3 selection type mismatch
    const allChildren = actualSele.selectAll(':scope > g.node')
    allChildren.remove()
    return
  }

  const selector = `:scope > g.${getSiblingGClass(firstNode).join('.')}`
  // @ts-expect-error - D3 selection type mismatch
  const temp = actualSele.selectAll(selector)
  // @ts-expect-error - D3 selection type mismatch
  temp.data(d, (d) => d.gKey).join(appendNode, updateNode)
}
