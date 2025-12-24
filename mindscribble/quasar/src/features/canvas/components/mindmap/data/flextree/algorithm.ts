class Tree {
  w: number
  h: number
  y: number
  c: Tree[]
  cs: number
  x: number
  prelim: number
  mod: number
  shift: number
  change: number
  tl: Tree | null
  tr: Tree | null
  el: Tree | null
  er: Tree | null
  msel: number
  mser: number

  constructor (width: number, height: number, y: number, children: Tree[]) {
    this.w = width
    this.h = height
    this.y = y
    this.c = children
    this.cs = children.length

    this.x = 0
    this.prelim = 0
    this.mod = 0
    this.shift = 0
    this.change = 0
    this.tl = null // Left thread
    this.tr = null // Right thread
    this.el = null // extreme left nodes
    this.er = null // extreme right nodes
    // sum of modifiers at the extreme nodes
    this.msel = 0
    this.mser = 0
  }
}

function setExtremes (tree: Tree) {
  if (tree.cs === 0) {
    tree.el = tree
    tree.er = tree
    tree.msel = tree.mser = 0
  } else {
    tree.el = tree.c[0]?.el || null
    tree.msel = tree.c[0]?.msel || 0
    tree.er = tree.c[tree.cs - 1]?.er || null
    tree.mser = tree.c[tree.cs - 1]?.mser || 0
  }
}

function bottom (tree: Tree) {
  return tree.y + tree.h
}

/* A linked list of the indexes of left siblings and their lowest vertical coordinate.
 */
class IYL {
  lowY: number
  index: number
  next: IYL | null
  constructor (lowY: number, index: number, next: IYL | null) {
    this.lowY = lowY
    this.index = index
    this.next = next
  }
}

function updateIYL (minY: number, i: number, ih: IYL | null) {
  // Remove siblings that are hidden by the new subtree.
  while (ih !== null && minY >= ih.lowY) {
    // Prepend the new subtree
    ih = ih.next
  }
  return new IYL(minY, i, ih)
}

function distributeExtra (tree: Tree, i: number, si: number, distance: number) {
  // Are there intermediate children?
  if (si !== i - 1) {
    const nr = i - si
    const nextChild = tree.c[si + 1]
    const currentChild = tree.c[i]
    if (nextChild) nextChild.shift += distance / nr
    if (currentChild) currentChild.shift -= distance / nr
    if (currentChild) currentChild.change -= distance - distance / nr
  }
}

function moveSubtree (tree: Tree, i: number, si: number, distance: number) {
  // Move subtree by changing mod.
  if (tree.c[i]) {
    tree.c[i].mod += distance
    tree.c[i].msel += distance
    tree.c[i].mser += distance
  }
  distributeExtra(tree, i, si, distance)
}

function nextLeftContour (tree: Tree): Tree | null {
  return tree.cs === 0 ? tree.tl : (tree.c[0] || null)
}

function nextRightContour (tree: Tree): Tree | null {
  return tree.cs === 0 ? tree.tr : (tree.c[tree.cs - 1] || null)
}

function setLeftThread (tree: Tree, i: number, cl: Tree, modsumcl: number) {
  const firstChild = tree.c[0]
  const targetChild = tree.c[i]
  if (firstChild && targetChild) {
    const li = firstChild.el
    if (li) {
      li.tl = cl
      // Change mod so that the sum of modifier after following thread is correct.
      const diff = (modsumcl - cl.mod) - firstChild.msel
      li.mod += diff
      // Change preliminary x coordinate so that the node does not move.
      li.prelim -= diff
    }
    // Update extreme node and its sum of modifiers.
    firstChild.el = targetChild.el
    firstChild.msel = targetChild.msel
  }
}

// Symmetrical to setLeftThread
function setRightThread (tree: Tree, i: number, sr: Tree, modsumsr: number) {
  const targetChild = tree.c[i]
  const prevChild = tree.c[i - 1]
  if (targetChild && prevChild) {
    const ri = targetChild.er
    if (ri) {
      ri.tr = sr
      const diff = (modsumsr - sr.mod) - targetChild.mser
      ri.mod += diff
      ri.prelim -= diff
    }
    targetChild.er = prevChild.er
    targetChild.mser = prevChild.mser
  }
}

function seperate (tree: Tree, i: number, ih: IYL) {
  // Right contour node of left siblings and its sum of modifiers.
  let sr: Tree | null = tree.c[i - 1] || null
  let mssr = sr?.mod || 0
  // Left contour node of right siblings and its sum of modifiers.
  let cl: Tree | null = tree.c[i] || null
  let mscl = cl?.mod || 0
  while (sr !== null && cl !== null) {
    if (bottom(sr) > ih.lowY) {
      const nextIh = ih.next
      if (nextIh) {
        ih = nextIh
      } else {
        break
      }
    }
    // How far to the left of the right side of sr is the left side of cl.
    const distance = mssr + sr.prelim + sr.w - (mscl + cl.prelim)
    if (distance > 0) {
      mscl += distance
      moveSubtree(tree, i, ih.index, distance)
    }

    const sy = bottom(sr)
    const cy = bottom(cl)
    if (sy <= cy) {
      sr = sr !== null ? nextRightContour(sr) : null
      if (sr !== null) {
        mssr += sr.mod
      }
    }
    if (sy >= cy) {
      cl = cl !== null ? nextLeftContour(cl) : null
      if (cl !== null) {
        mscl += cl.mod
      }
    }
  }

  // Set threads and update extreme nodes.
  // In the first case, the current subtree must be taller than the left siblings.
  if (sr === null && cl !== null) {
    setLeftThread(tree, i, cl, mscl)
  } else if (sr !== null && cl === null) {
    setRightThread(tree, i, sr, mssr)
  }
}

function positionRoot (tree: Tree) {
  // Position root between children, taking into account their mod.
  const firstChild = tree.c[0]
  const lastChild = tree.c[tree.cs - 1]
  tree.prelim =
    ((firstChild?.prelim || 0) +
      (firstChild?.mod || 0) +
      (lastChild?.mod || 0) +
      (lastChild?.prelim || 0) +
      (lastChild?.w || 0)) /
      2 -
    tree.w / 2
}

function firstWalk (tree: Tree) {
  if (tree.cs === 0) {
    setExtremes(tree)
    return
  }

  firstWalk(tree.c[0] as Tree)
  const firstChild = tree.c[0]
  let ih = updateIYL(bottom(firstChild?.el || new Tree(0, 0, 0, [])), 0, null)
  for (let i = 1; i < tree.cs; i++) {
    firstWalk(tree.c[i] as Tree)
    const currentChild = tree.c[i]
    const minY = bottom(currentChild?.er || new Tree(0, 0, 0, []))
    seperate(tree, i, ih)
    ih = updateIYL(minY, i, ih)
  }
  positionRoot(tree)
  setExtremes(tree)
}

function addChildSpacing (tree: Tree) {
  let d = 0
  let modsumdelta = 0
  for (let i = 0; i < tree.cs; i++) {
    const child = tree.c[i]
    if (child) {
      d += child.shift || 0
      modsumdelta += d + (child.change || 0)
      child.mod += modsumdelta
    }
  }
}

function secondWalk (tree: Tree, modsum: number) {
  modsum += tree.mod
  // Set absolute (no-relative) horizontal coordinates.
  tree.x = tree.prelim + modsum
  addChildSpacing(tree)
  for (let i = 0; i < tree.cs; i++) {
    secondWalk(tree.c[i] as Tree, modsum)
  }
}

function layout (tree: Tree): void {
  firstWalk(tree)
  secondWalk(tree, 0)
}

export { Tree, layout }
