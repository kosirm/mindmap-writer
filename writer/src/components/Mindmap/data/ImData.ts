import * as d3ScaleChromatic from 'd3-scale-chromatic'
import * as d3Scale from 'd3-scale'
import type { Data, Mdata, IsMdata } from '../interface'
import { BoundingBox, Layout } from './flextree'
import { currentOrientation } from '../variable'

type GetSize = (text: string) => { width: number, height: number }
type Processer = (d: Mdata, id: string) => void

const swapWidthAndHeight = (d: Mdata) => [d.width, d.height] = [d.height, d.width]

const renewDelta = (d: Mdata) => {
  if (d.parent) {
    d.dx = d.x - d.parent.x
    d.dy = d.y - d.parent.y
  } else {
    d.dx = 0
    d.dy = 0
  }
}

const renewId = (d: Mdata, id: string) => d.id = id
const renewDepth = (d: Mdata) => {
  if (d.parent) {
    d.depth = d.parent.depth + 1
  } else {
    d.depth = 0
  }
}

const renewColor = (d: Mdata): void => {
  if (d.parent && d.parent.color) {
    d.color = d.parent.color
  }
}

const renewLeft = (d: Mdata) => {
  if (d.depth > 1 && d.parent) {
    d.left = d.parent.left
  }
}

/**
 * Deep clone a node and its children for layout calculation
 * This allows us to modify the structure without affecting the original data
 */
const cloneNodeForLayout = (node: Mdata): Mdata => {
  const cloned = Object.assign({}, node)
  if (node.children && node.children.length > 0) {
    cloned.children = node.children.map(child => cloneNodeForLayout(child))
    // Update parent references
    cloned.children.forEach(child => {
      child.parent = cloned
    })
  }
  return cloned
}

/**
 * Copy layout positions (x, y) from layout tree back to original tree
 */
const copyLayoutPositions = (layoutNode: Mdata, originalNode: Mdata): void => {
  originalNode.x = layoutNode.x
  originalNode.y = layoutNode.y

  if (!originalNode.children || originalNode.children.length === 0) {
    return
  }

  // Match children by id and copy positions
  originalNode.children.forEach(originalChild => {
    const layoutChild = layoutNode.children.find(c => c.id === originalChild.id)
    if (layoutChild) {
      copyLayoutPositions(layoutChild, originalChild)
    }
  })
}

/**
 * Recursively reverse children for layout calculation based on orientation
 * This ensures Y positions are calculated in the correct visual order
 *
 * @param node - The node whose children to potentially reverse
 * @param isLeftSide - Whether this node is on the left side of the root (for depth-0 nodes)
 */
const reverseChildrenForLayout = (node: Mdata, isLeftSide?: boolean): void => {
  if (!node.children || node.children.length === 0) {
    return
  }

  // For the root node of left/right tree (depth 0), use the isLeftSide parameter
  // For deeper nodes, use the node's left property
  const nodeIsOnLeftSide = node.depth === 0 ? isLeftSide : node.left

  // Determine if this node's children should be reversed
  const shouldReverse =
    (currentOrientation === 'clockwise' && nodeIsOnLeftSide === true) ||
    (currentOrientation === 'anticlockwise' && nodeIsOnLeftSide === false)

  if (shouldReverse) {
    node.children.reverse()
  }

  // Recursively process all children (they will use their own left property)
  node.children.forEach(child => reverseChildrenForLayout(child))
}

const separateLeftAndRight = (d: Mdata): { left: Mdata, right: Mdata } => {
  const ld = Object.assign({}, d)
  const rd = Object.assign({}, d)
  if (d.collapse) {
    //
  } else {
    const { children } = d
    ld.children = []
    rd.children = []

    // Separate children by left/right and CLONE them for layout
    const leftChildren: Mdata[] = []
    const rightChildren: Mdata[] = []

    children.forEach((child: Mdata) => {
      const clonedChild = cloneNodeForLayout(child)
      if (child.left) {
        leftChildren.push(clonedChild)
        clonedChild.parent = ld
      } else {
        rightChildren.push(clonedChild)
        clonedChild.parent = rd
      }
    })

    ld.children = leftChildren
    rd.children = rightChildren

    // Recursively reverse children at ALL depths for layout calculation
    // This modifies the CLONED nodes, not the originals
    // Pass isLeftSide parameter to indicate which side of the tree we're processing
    reverseChildrenForLayout(ld, true)  // Left side
    reverseChildrenForLayout(rd, false) // Right side
  }
  return { left: ld, right: rd }
}

/**
 * 遍历数据d，在此过程中会对每个数据调用指定函数，同时删除id为del的数据，不处理被折叠的数据
 * @param d - 数据
 * @param processers - 函数
 * @param id - 新id
 */
const traverse = (d: Mdata, processers: Processer[], id = '0') => {
  processers.forEach((p) => { p(d, id) })
  const { children } = d
  if (children) {
    for (let index = 0; index < children.length; ) {
      const child = children[index]
      if (!child) {
        index += 1
        continue
      }
      if (child.id === 'del') {
        children.splice(index, 1)
        d.rawData.children?.splice(index, 1)
      } else {
        traverse(child, processers, `${id}-${index}`)
        index += 1
      }
    }
  }
}

const getLayout = (xGap: number, yGap: number) => {
  const bb = new BoundingBox(yGap, xGap)
  return new Layout(bb)
}

class ImData {
  data: Mdata
  private getSize: GetSize
  private layout: Layout
  private colorScale: d3Scale.ScaleOrdinal<string, string, never>
  private colorNumber = 0
  private gKey = 0
  private rootWidth = 0
  private diffY = 0 // 左树与右树的差值

  constructor (
    d: Data,
    xGap: number,
    yGap: number,
    getSize: GetSize,
    colorScale = d3Scale.scaleOrdinal(d3ScaleChromatic.schemePaired)
  ) {
    this.colorScale = colorScale
    this.getSize = getSize
    this.layout = getLayout(xGap, yGap)
    this.data = this.createMdataFromData(d, '0')
    this.renew()
  }

  private createMdataFromData (rawData: Data, id: string, parent: IsMdata = null): Mdata {
    const { name, collapse, children: rawChildren, icons = [], isInferredTitle = false } = rawData
    const { width, height } = this.getSize(name)
    const depth = parent ? parent.depth + 1 : 0
    let left = false
    let color = parent ? parent.color : ''
    if (depth === 1) {
      left = !!rawData.left
      color = this.colorScale(`${this.colorNumber += 1}`)
    } else if (depth !== 0 && parent) {
      left = parent.left
    }

    // Calculate icons width (each icon is 16px + 4px margin)
    const iconSize = 16
    const iconMargin = 4
    const iconsWidth = icons.length > 0 ? (icons.length * (iconSize + iconMargin)) : 0

    const data: Mdata = {
      id, name, rawData, parent, left, color, depth,
      x: 0, y: 0, dx: 0, dy: 0, px: 0, py: 0,
      width, height, children: [], _children: [],
      collapse: !!collapse,
      gKey: this.gKey += 1,
      icons,
      iconsWidth,
      isInferredTitle,
    }
    if (rawChildren) {
      if (!data.collapse) {
        rawChildren.forEach((c: Data, j: number) => {
          data.children.push(this.createMdataFromData(c, `${id}-${j}`, data))
        })
      } else {
        rawChildren.forEach((c: Data, j: number) => {
          data._children.push(this.createMdataFromData(c, `${id}-${j}`, data))
        })
      }
    }

    return data
  }

  /**
   * 默认更新x, y, dx, dy, left, depth
   * @param plugins - 需要更新其他属性时的函数
   */
  private renew (...plugins: Processer[]): void {
    traverse(this.data, [swapWidthAndHeight, renewDepth, renewLeft])
    this.data = this.l(this.data)
    const temp: Processer[] = [swapWidthAndHeight, this.renewXY.bind(this), renewDelta]
    traverse(this.data, temp.concat(plugins))
  }

  /**
   * 分别计算左右树，最后合并成一颗树，右树为主树
   */
  private l (data: Mdata): Mdata {
    const { left, right } = separateLeftAndRight(data)
    this.layout.layout(left) // 更新x,y
    this.layout.layout(right)
    this.diffY = right.x - left.x
    this.rootWidth = left.height

    // Copy layout positions from cloned trees back to original data
    copyLayoutPositions(left, data)
    copyLayoutPositions(right, data)

    // Return original data with updated positions
    return data
  }

  private renewXY (d: Mdata): void {
    [d.x, d.y] = [d.y, d.x]
    if (d.left) {
      d.x = -d.x + this.rootWidth
      d.y += this.diffY
    }
  }

  getRootWidth (): number { return this.rootWidth }

  setBoundingBox (xGap: number, yGap: number): void {
    this.layout = getLayout(xGap, yGap)
    this.renew()
  }

  find (id: string): IsMdata { // 根据id找到数据
    const array = id.split('-').map(n => ~~n)
    let data = this.data
    for (let i = 1; i < array.length; i++) {
      const index = array[i]
      if (index === undefined) {
        return null
      }
      const { children } = data
      if (index < children.length) {
        const childData = children[index]
        if (!childData) {
          return null
        }
        data = childData
      } else { // No data matching id
        return null
      }
    }
    return data.id === id ? data : null
  }

  /**
   * Find a node by its rawData reference (stable across tree structure changes)
   */
  findByRawData (rawData: Data): IsMdata {
    const findInTree = (node: Mdata): IsMdata => {
      if (node.rawData === rawData) {
        return node
      }
      if (node.children) {
        for (const child of node.children) {
          const found = findInTree(child)
          if (found) return found
        }
      }
      return null
    }

    return findInTree(this.data)
  }

  rename (id: string, name: string): IsMdata { // 修改名称
    if (id.length > 0) {
      const d = this.find(id)
      if (d && d.name !== name) {
        d.name = name
        d.rawData.name = name
        //
        const size = this.getSize(d.name)
        d.width = size.width
        d.height = size.height
        this.renew()
      }
      return d
    } else {
      return null
    }
  }

  /**
   * 将b节点移动到a节点下
   * @param parentId - 目标节点a
   * @param delId - 被移动节点b
   */
  moveChild (parentId: string, delId: string): IsMdata {
    if (parentId === delId) { return null }
    const np = this.find(parentId)
    const del = this.find(delId)
    const delIndex = delId.split('-').pop()
    if (delIndex && np && del) {
      const delParent = del.parent
      delParent?.children?.splice(~~delIndex, 1)
      delParent?.rawData.children?.splice(~~delIndex, 1)
      del.parent = np
      del.gKey = this.gKey += 1
      del.depth = del.parent.depth + 1
      if (del.depth === 1) {
        del.color = this.colorScale(`${this.colorNumber += 1}`)
      } else {
        del.left = del.parent.left
      }
      if (np.collapse) {
        np._children.push(del)
      } else {
        np.children.push(del)
      }
      if (np.rawData.children) {
        np.rawData.children.push(del.rawData)
      } else {
        np.rawData.children = [del.rawData]
      }
      this.renew(renewId, renewColor)
    }
    return del
  }

  moveSibling (id: string, referenceId: string, after = 0): IsMdata { // 同层调换顺序
    const idArr = id.split('-')
    const refArr = referenceId.split('-')
    let index: number | string | undefined = idArr.pop()
    let refIndex: number | string | undefined = refArr.pop()
    if (id === referenceId || idArr.length !== refArr.length || !index || !refIndex) {
      return null
    }
    const d = this.find(id)
    const r = this.find(referenceId)
    if (r && d && d.parent) {
      index = parseInt(index, 10)
      refIndex = parseInt(refIndex, 10)
      if (index < refIndex) { refIndex -= 1 } // 删除时可能会改变插入的序号
      const { children } = d.parent
      const { children: rawChildren } = d.parent.rawData
      if (children && rawChildren) {
        children.splice(index, 1)
        children.splice(refIndex + after, 0, d)
        rawChildren.splice(index, 1)
        rawChildren.splice(refIndex + after, 0, d.rawData)
        if (d.depth === 1) { d.left = r.left }
        this.renew(renewId)
        return d
      }
    }
    return null
  }

  add (id: string, variable: string | Data): IsMdata {
    const p = this.find(id)
    if (p) {
      if (p.collapse) { this.expand(id) }
      if (!p.rawData.children) { p.rawData.children = [] }
      if (typeof variable === 'string') {
        const name = variable
        const size = this.getSize(name)
        const rawData: Data = { name }
        const color = p.color ? p.color : this.colorScale(`${this.colorNumber += 1}`)
        const d: Mdata = {
          id: `${p.id}-${p.children.length}`,
          name,
          rawData,
          parent: p,
          left: p.left,
          collapse: false,
          color,
          gKey: this.gKey += 1,
          width: size.width,
          height: size.height,
          depth: p.depth + 1,
          x: 0,
          y: 0,
          dx: 0,
          dy: 0,
          px: 0,
          py: 0,
          children: [],
          _children: [],
          icons: [],
          iconsWidth: 0,
          isInferredTitle: false
        }
        p.children.push(d)
        p.rawData.children.push(rawData)
        this.renew()
        return d
      } else {
        const rawData = variable
        const m = this.createMdataFromData(rawData, `${p.id}-${p.children.length}`, p)
        p.children.push(m)
        p.rawData.children.push(rawData)
        this.renew()
        return m
      }
    }

    return null
  }

  expand (id: string): IsMdata { return this.eoc(id, false, [renewColor, renewId]) }
  collapse (id: string): IsMdata { return this.eoc(id, true) }

  /**
   * 展开或折叠(expand or collapse)
   */
  eoc (id: string, collapse: boolean, plugins: Processer[] = []): IsMdata {
    const d = this.find(id)
    if (d) {
      d.collapse = collapse
      d.rawData.collapse = collapse
      ;[d._children, d.children] = [d.children, d._children]
      this.renew(...plugins)
    }
    return d
  }

  delete (id: string): void {
    const del = this.find(id)
    if (del && del.parent) {
      del.id = 'del'
      this.renew(renewId)
    } else {
      throw new Error(del ? '暂不支持删除根节点' : '未找到需要删除的节点')
    }
  }

  deleteOne (id: string): void {
    const del = this.find(id)
    if (del && del.parent) {
      const { parent, children, _children, collapse, rawData } = del
      const index = parseInt(id.split('-').pop() as string, 10)
      parent.children.splice(index, 1, ...(collapse ? _children : children))
      parent.rawData.children?.splice(index, 1, ...(rawData.children || []))
      children.forEach((c: Mdata) => {
        c.parent = parent
        if (c.depth === 1) { c.rawData.left = c.left }
      })
      this.renew(renewId)
    }
  }

  addSibling (id: string, name: string, before = false): IsMdata {
    const d = this.find(id)
    if (d && d.parent) {
      const index = parseInt(id.split('-').pop() as string, 10)
      const { parent, left } = d
      const rawSibling: Data = { name, left }
      const size = this.getSize(name)
      const start = before ? index : index + 1
      const color = parent.color ? parent.color : this.colorScale(`${this.colorNumber += 1}`)
      const sibling: Mdata = {
        name,
        parent,
        children: [],
        _children: [],
        color,
        collapse: false,
        rawData: rawSibling,
        id: `${parent.id}-${start}`,
        left,
        gKey: this.gKey += 1,
        depth: d.depth,
        width: size.width,
        height: size.height,
        x: 0,
        y: 0,
        dx: 0,
        dy: 0,
        px: 0,
        py: 0,
        icons: [],
        iconsWidth: 0,
        isInferredTitle: false
      }
      parent.children.splice(start, 0, sibling)
      parent.rawData.children?.splice(start, 0, rawSibling)
      this.renew(renewId)
      return sibling
    }
    return null
  }

  addParent (id: string, name: string): IsMdata {
    const d = this.find(id)
    if (d && d.parent) {
      const { parent: oldP, left, color } = d
      const size = this.getSize(name)
      const index = parseInt(d.id.split('-').pop() as string, 10)
      const rawP: Data = { name, children: [d.rawData], left }
      oldP.rawData.children?.splice(index, 1, rawP)
      const p: Mdata = {
        rawData: rawP,
        left,
        name,
        color,
        collapse: false,
        parent: oldP,
        id: d.id,
        depth: d.depth,
        width: size.width,
        height: size.height,
        gKey: this.gKey += 1,
        children: [d],
        _children: [],
        x: 0,
        y: 0,
        dx: 0,
        dy: 0,
        px: 0,
        py: 0,
        icons: [],
        iconsWidth: 0,
        isInferredTitle: false
      }
      d.parent = p
      oldP.children.splice(index, 1, p)
      this.renew(renewId)
      return p
    }
    return null
  }

  /**
   * Reorder a node on the same side based on drop position
   * @param rawData - The node's rawData reference
   * @param dropY - Y coordinate where the node was dropped
   */
  reorderSibling (rawData: Data, dropY: number): IsMdata {
    console.log('[ImData.reorderSibling] Called with rawData:', rawData.name, 'dropY:', dropY, 'orientation:', currentOrientation);
    const d = this.findByRawData(rawData)
    if (d && d.parent) {
      console.log('[ImData.reorderSibling] Found node:', {
        id: d.id,
        name: d.name,
        currentY: d.y,
        left: d.left
      });

      // Log all siblings before change
      console.log('[ImData.reorderSibling] Parent children BEFORE reorder:',
        d.parent.children.map(c => ({ id: c.id, name: c.name, left: c.left, y: c.y }))
      );

      // Determine if this side should be reversed based on orientation
      // In clockwise: left side is reversed (bottom to top visually)
      // In anticlockwise: right side is reversed (bottom to top visually)
      const shouldReverse =
        (currentOrientation === 'clockwise' && d.left === true) ||
        (currentOrientation === 'anticlockwise' && d.left === false)

      console.log('[ImData.reorderSibling] Orientation check:', {
        orientation: currentOrientation,
        side: d.left ? 'left' : 'right',
        shouldReverse
      });

      // Find siblings on the same side (excluding the node being moved)
      const siblingsOnSameSide = d.parent.children
        .filter(c => c !== d && c.left === d.left)
        .sort((a, b) => a.y - b.y) // Sort by Y position (top to bottom visually)

      console.log('[ImData.reorderSibling] Siblings on same side (sorted by visual Y):', {
        dropY,
        targetSide: d.left ? 'left' : 'right',
        siblings: siblingsOnSameSide.map(c => ({
          id: c.id,
          name: c.name.substring(0, 30),
          y: c.y
        }))
      });

      // Find which sibling should come AFTER the dropped node in VISUAL order
      // (first sibling with y > dropY)
      let insertBeforeSiblingVisual: Mdata | null = null
      for (const sibling of siblingsOnSameSide) {
        if (sibling.y > dropY) {
          insertBeforeSiblingVisual = sibling
          console.log('[ImData.reorderSibling] Will insert BEFORE sibling (visually):', {
            id: sibling.id,
            name: sibling.name.substring(0, 30),
            y: sibling.y
          });
          break
        }
      }

      // If the side is reversed, we need to find the DATA position
      // For reversed sides: visual top = data end, visual bottom = data start
      let insertBeforeSibling: Mdata | null = null

      if (shouldReverse) {
        // For reversed sides, we need to reverse the logic
        if (insertBeforeSiblingVisual === null) {
          // Dropped at visual bottom = data start
          // Insert before the first sibling in data order (which is last visually)
          const lastSibling = siblingsOnSameSide[siblingsOnSameSide.length - 1]
          insertBeforeSibling = lastSibling || null
          console.log('[ImData.reorderSibling] Reversed: Dropped at visual bottom, insert at data start');
        } else {
          // Find the sibling that comes AFTER insertBeforeSiblingVisual in visual order
          const visualIndex = siblingsOnSameSide.indexOf(insertBeforeSiblingVisual)
          if (visualIndex > 0) {
            const prevSibling = siblingsOnSameSide[visualIndex - 1]
            insertBeforeSibling = prevSibling || null
            console.log('[ImData.reorderSibling] Reversed: Insert AFTER (in data) the sibling that is BEFORE (visually)');
          } else {
            // insertBeforeSiblingVisual is the first visually = last in data
            // So insert at the very end (no insertBeforeSibling)
            insertBeforeSibling = null
            console.log('[ImData.reorderSibling] Reversed: Insert at data end (visual top)');
          }
        }
      } else {
        // Normal order: visual order = data order
        insertBeforeSibling = insertBeforeSiblingVisual
      }

      if (insertBeforeSibling) {
        console.log('[ImData.reorderSibling] Final: Will insert BEFORE sibling (in data):', {
          id: insertBeforeSibling.id,
          name: insertBeforeSibling.name.substring(0, 30)
        });
      } else {
        console.log('[ImData.reorderSibling] Final: Will insert at END of data array');
      }

      // Remove the node from its current position
      const nodeIndex = d.parent.children.indexOf(d)
      if (nodeIndex !== -1) {
        d.parent.children.splice(nodeIndex, 1)
        // Also remove from rawData children
        if (d.parent.rawData.children) {
          d.parent.rawData.children.splice(nodeIndex, 1)
        }
      }

      // Find the insertion index in the modified array
      let insertIndex = d.parent.children.length // Default: insert at end
      if (insertBeforeSibling) {
        insertIndex = d.parent.children.indexOf(insertBeforeSibling)
        console.log('[ImData.reorderSibling] Found insertBeforeSibling in array at index:', insertIndex);
        if (insertIndex === -1) {
          console.log('[ImData.reorderSibling] WARNING: insertBeforeSibling not found in array!');
          insertIndex = d.parent.children.length
        }
      } else {
        console.log('[ImData.reorderSibling] No insertBeforeSibling, inserting at end');
      }

      console.log('[ImData.reorderSibling] Array BEFORE insertion:',
        d.parent.children.map((c, idx) => ({ idx, id: c.id, name: c.name.substring(0, 20), left: c.left }))
      );
      console.log('[ImData.reorderSibling] Inserting at index:', insertIndex, 'node:', d.id);

      d.parent.children.splice(insertIndex, 0, d)
      // Also insert into rawData children
      if (d.parent.rawData.children) {
        d.parent.rawData.children.splice(insertIndex, 0, d.rawData)
      }

      console.log('[ImData.reorderSibling] Array AFTER insertion:',
        d.parent.children.map((c, idx) => ({ idx, id: c.id, name: c.name.substring(0, 20), left: c.left }))
      );

      this.renew()
    }
    return d
  }

  changeLeft (rawData: Data, dropY?: number): IsMdata {
    console.log('[ImData.changeLeft] Called with rawData:', rawData.name, 'dropY:', dropY);
    const d = this.findByRawData(rawData)
    if (d) {
      console.log('[ImData.changeLeft] Found node BEFORE change:', {
        id: d.id,
        name: d.name,
        gKey: d.gKey,
        currentLeft: d.left,
        newLeft: !d.left,
        rawDataLeft: d.rawData.left,
        currentY: d.y,
        parentId: d.parent?.id,
        parentName: d.parent?.name
      });

      // Log all siblings before change
      if (d.parent) {
        console.log('[ImData.changeLeft] Parent children BEFORE change:',
          d.parent.children.map(c => ({ id: c.id, name: c.name, gKey: c.gKey, left: c.left, y: c.y }))
        );
      }

      d.left = !d.left
      // Update rawData.left to persist the change
      d.rawData.left = d.left

      // If dropY is provided, reorder children based on drop position
      if (dropY !== undefined && d.parent) {
        console.log('[ImData.changeLeft] Reordering children based on dropY:', dropY);

        // Remove the node from its current position
        const nodeIndex = d.parent.children.indexOf(d)
        if (nodeIndex !== -1) {
          d.parent.children.splice(nodeIndex, 1)
          // Also remove from rawData children
          if (d.parent.rawData.children) {
            d.parent.rawData.children.splice(nodeIndex, 1)
          }
        }

        // Find siblings on the new side and their y positions
        const siblingsOnNewSide = d.parent.children.filter(c => c.left === d.left)
        console.log('[ImData.changeLeft] Siblings on new side:',
          siblingsOnNewSide.map(c => ({ id: c.id, name: c.name, y: c.y }))
        );

        // Find the insertion index based on dropY
        let insertIndex = d.parent.children.length // Default: insert at end

        if (siblingsOnNewSide.length > 0) {
          // Find the first sibling on the new side that has y > dropY
          for (let i = 0; i < d.parent.children.length; i++) {
            const child = d.parent.children[i]
            if (child && child.left === d.left && child.y > dropY) {
              insertIndex = i
              break
            }
          }
        }

        console.log('[ImData.changeLeft] Inserting at index:', insertIndex);
        d.parent.children.splice(insertIndex, 0, d)
        // Also insert into rawData children
        if (d.parent.rawData.children) {
          d.parent.rawData.children.splice(insertIndex, 0, d.rawData)
        }

        console.log('[ImData.changeLeft] Children after reordering:',
          d.parent.children.map(c => ({ id: c.id, name: c.name, left: c.left }))
        );
      }

      console.log('[ImData.changeLeft] After property change, BEFORE renew:', {
        id: d.id,
        gKey: d.gKey,
        left: d.left,
        rawDataLeft: d.rawData.left
      });
      this.renew()

      // Find the node again after renew to see its new state
      const dAfterRenew = this.findByRawData(rawData)
      if (dAfterRenew) {
        console.log('[ImData.changeLeft] Found node AFTER renew:', {
          id: dAfterRenew.id,
          name: dAfterRenew.name,
          gKey: dAfterRenew.gKey,
          left: dAfterRenew.left,
          rawDataLeft: dAfterRenew.rawData.left,
          x: dAfterRenew.x,
          y: dAfterRenew.y,
          parentId: dAfterRenew.parent?.id,
          parentName: dAfterRenew.parent?.name
        });

        // Log all siblings after change
        if (dAfterRenew.parent) {
          console.log('[ImData.changeLeft] Parent children AFTER renew:',
            dAfterRenew.parent.children.map(c => ({ id: c.id, name: c.name, gKey: c.gKey, left: c.left, x: c.x, y: c.y }))
          );
        }
      }
    } else {
      console.error('[ImData.changeLeft] Node not found with rawData:', rawData.name);
    }
    return d
  }
}

export default ImData
