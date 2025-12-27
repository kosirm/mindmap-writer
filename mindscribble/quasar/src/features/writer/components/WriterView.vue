<template>
  <div
    class="writer-view"
  >
    <Draggable
      v-if="treeData.length > 0"
      ref="treeRef"
      v-model="treeData"
      class="writer-tree"
      :indent="indentationWidth"
      :triggerClass="TRIGGER_CLASS"
      :rootDroppable="true"
      treeLine
      @change="onTreeChange"
    >
      <template #default="{ node, stat }">
        <div class="tree-node" :data-indent-level="getIndentLevel(stat)">
          <WriterNodeContent
            :node="node.node"
            :stat="stat"
            :trigger-class="TRIGGER_CLASS"
          />
        </div>
      </template>
    </Draggable>

    <div v-else class="empty-state">
      <q-icon name="description" size="48px" color="grey-5" />
      <div class="text-grey-6 q-mt-md">No nodes to display</div>
      <div class="text-grey-5 text-caption">Create nodes in the mindmap to see them here</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, provide, reactive, computed } from 'vue'
import { Draggable } from '@he-tree/vue'
import '@he-tree/vue/style/default.css'
import WriterNodeContent from './WriterNodeContent.vue'
import { useUnifiedDocumentStore } from '../../../core/stores/unifiedDocumentStore'
import { useWriterSettingsStore } from 'src/dev/WriterSettingsStore'
import { useViewEvents } from '../../../core/events'
import { useWriterNavigation, type WriterTreeItem } from '../composables/useWriterNavigation'

const TRIGGER_CLASS = 'drag-handle'

// Unified store
const unifiedStore = useUnifiedDocumentStore()
const writerSettings = useWriterSettingsStore()
const indentationWidth = computed(() => writerSettings.indentationWidth)

const { onStoreEvent } = useViewEvents('writer')

// console.log('🔍 WriterView.vue script setup running')

// onMounted(() => {
//   console.log('🔍 WriterView.vue mounted!')
//   console.log('🔍 Initial treeData length:', treeData.value.length)
// })

// Tree reference
const treeRef = ref<InstanceType<typeof Draggable> | null>(null)

// Tree data for he-tree
const treeData = ref<WriterTreeItem[]>([])

// Simple event emitter for child components
const writerEmitter = reactive({
  handlers: new Map<string, Set<(payload: unknown) => void>>(),
  emit(event: string, payload: unknown) {
    this.handlers.get(event)?.forEach(handler => handler(payload))
  },
  on(event: string, handler: (payload: unknown) => void) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler)
  }
})

// Provide emitter and navigation to children
provide('writerEmitter', writerEmitter)
const navigation = useWriterNavigation(treeData)
provide('writerNavigation', navigation)

// Provide method to update local tree data (to avoid prop mutation)
const updateLocalNodeData = (nodeId: string, updates: { title?: string; content?: string }) => {
  const updateItem = (items: WriterTreeItem[]): boolean => {
    for (const item of items) {
      if (item.id === nodeId) {
        if (updates.title !== undefined) {
          item.text = updates.title
          item.node.data.title = updates.title
        }
        if (updates.content !== undefined) {
          item.node.data.content = updates.content
        }
        return true
      }
      if (updateItem(item.children)) return true
    }
    return false
  }
  updateItem(treeData.value)
}
provide('updateLocalNodeData', updateLocalNodeData)

/**
 * Build tree structure from store nodes
 */
function buildTreeFromStore(): WriterTreeItem[] {
  const nodeMap = new Map<string, WriterTreeItem>()

  // Get nodes from the unified store
  const nodes = unifiedStore.activeDocument?.nodes || []

  // First pass: Create tree items
  nodes.forEach(node => {
    nodeMap.set(node.id, {
      id: node.id,
      text: node.data.title || 'Untitled',
      node: node,
      children: []
    })
  })

  // Second pass: Build hierarchy
  const rootItems: WriterTreeItem[] = []
  nodeMap.forEach(item => {
    const parentId = item.node.data.parentId
    if (parentId) {
      const parent = nodeMap.get(parentId)
      if (parent) {
        parent.children.push(item)
      }
    } else {
      rootItems.push(item)
    }
  })

  // Third pass: Sort children by order
  nodeMap.forEach(item => {
    item.children.sort((a, b) => a.node.data.order - b.node.data.order)
  })
  rootItems.sort((a, b) => a.node.data.order - b.node.data.order)

  return rootItems
}

/**
 * Extract hierarchy and order from current tree structure
 */
function extractHierarchyFromTree(
  items: WriterTreeItem[],
  parentId: string | null = null
): Map<string, { parentId: string | null; order: number }> {
  const result = new Map<string, { parentId: string | null; order: number }>()

  items.forEach((item, index) => {
    result.set(item.id, { parentId, order: index })

    if (item.children.length > 0) {
      const childData = extractHierarchyFromTree(item.children, item.id)
      childData.forEach((value, key) => result.set(key, value))
    }
  })

  return result
}

/**
 * Handle tree changes from drag-and-drop
 */
function onTreeChange() {
  const newHierarchy = extractHierarchyFromTree(treeData.value)

  // Group changes by type: reparenting vs sibling reordering
  const reparentedNodes: Array<{ nodeId: string; parentId: string | null; order: number }> = []
  const orderChanges: Map<string | null, Map<string, number>> = new Map() // parentId -> (nodeId -> order)

  newHierarchy.forEach(({ parentId, order }, nodeId) => {
    const node = unifiedStore.getNodeById(nodeId)

    if (node) {
      const oldParentId = node.data.parentId

      if (oldParentId !== parentId) {
        // Parent changed - this is a reparent operation
        reparentedNodes.push({ nodeId, parentId, order })
      } else if (node.data.order !== order) {
        // Same parent, order changed - this is a sibling reorder
        if (!orderChanges.has(parentId)) {
          orderChanges.set(parentId, new Map())
        }
        orderChanges.get(parentId)!.set(nodeId, order)
      }
    }
  })

  // Handle reparenting first (uses moveNode)
  for (const { nodeId, parentId, order } of reparentedNodes) {
    unifiedStore.moveNode(nodeId, parentId, order, 'writer')
  }

  // Handle sibling reordering (uses reorderSiblings - emits store:siblings-reordered)
  for (const [parentId, nodeOrders] of orderChanges) {
    unifiedStore.reorderSiblings(parentId, nodeOrders, 'writer')
  }
}

// DEBUG: Drag event handlers
// function onDragStart(event: DragEvent) {
//   console.log('🔍 WriterView dragstart:', event.target)
//   console.log('🔍 Target draggable attr:', (event.target as HTMLElement)?.getAttribute('draggable'))
// }

// function onDrag() {
//   // Too noisy, comment out
//   // console.log('🔍 WriterView drag:', event.target)
// }

// function onDragEnd(event: DragEvent) {
//   console.log('🔍 WriterView dragend:', event.target)
// }

// function onDragOver() {
//   // Too noisy, comment out
//   // console.log('🔍 WriterView dragover:', event.target)
// }

// function onDrop(event: DragEvent) {
//   console.log('🔍 WriterView drop:', event.target)
// }

// DEBUG: Check what he-tree is doing
// watch(() => treeData.value.length, (newLength) => {
//   console.log('🔍 TreeData length changed to:', newLength)
//   setTimeout(() => {
//     const draggableElements = document.querySelectorAll('[draggable="true"]')
//     console.log('🔍 Found', draggableElements.length, 'draggable elements in document')
//     draggableElements.forEach(el => {
//       console.log('🔍 Draggable element:', el.className, el.tagName)
//     })
//   }, 100)
// }, { immediate: true })

// Initial load
treeData.value = buildTreeFromStore()

// Watch store for changes
watch(() => unifiedStore.activeDocument?.nodes.length || 0, () => {
  treeData.value = buildTreeFromStore()
  // Reapply indent rainbow colors after tree rebuild
  setTimeout(() => updateIndentRainbowStyles(), 150)
})

// Watch for indent rainbow settings changes and update styles
watch(() => [writerSettings.indentRainbowEnabled, writerSettings.indentColors, writerSettings.indentationWidth], () => {
  updateIndentRainbowStyles()
}, { deep: true, immediate: true })

/**
 * Get indent level from stat object
 */
function getIndentLevel(stat: unknown): number {
  if (stat && typeof stat === 'object') {
    if ('depth' in stat) {
      return stat.depth as number
    } else if ('level' in stat) {
      return stat.level as number
    } else if ('path' in stat && Array.isArray(stat.path)) {
      return stat.path.length - 1
    }
  }
  return 0
}

/**
 * Update the indent rainbow styles based on current settings
 */
function updateIndentRainbowStyles() {
  console.log('updateIndentRainbowStyles called, enabled:', writerSettings.indentRainbowEnabled)

  // Use JavaScript to directly apply colors/visibility to treelines
  // Each tree-node wrapper can have multiple .tree-line elements (one per ancestor level)
  // Each tree-line has a 'left' style that indicates which indent level it represents
  setTimeout(() => {
    const allTreeLines = document.querySelectorAll('.tree-line')

    if (writerSettings.indentRainbowEnabled && writerSettings.indentColors.length > 0) {
      // ENABLED: Show only vertical lines with colors, hide horizontal lines to avoid overlap
      allTreeLines.forEach(line => {
        if (!(line instanceof HTMLElement)) return

        // Check if this is a horizontal line - if so, hide it to avoid overlap with vertical lines
        const isHorizontalLine = line.classList.contains('tree-hline')

        if (isHorizontalLine) {
          // Hide horizontal lines to prevent overlap/darker areas
          line.style.setProperty('display', 'none', 'important')
          line.style.setProperty('visibility', 'hidden', 'important')
        } else {
          // Show vertical lines with colors
          line.style.setProperty('display', 'block', 'important')
          line.style.setProperty('visibility', 'visible', 'important')

          // Get the left position from inline style
          const leftStyle = line.style.left
          if (leftStyle) {
            // Parse the left value (e.g., "8px", "24px", "40px")
            const leftValue = parseInt(leftStyle)

            // Shift the line 8px to the left to avoid being covered by node padding
            const adjustedLeftValue = leftValue - 8

            // Calculate the indent level from the ORIGINAL left position
            // left position = (level - 1) * indentationWidth + (indentationWidth / 2)
            // For indentationWidth=16: 8px=level1, 24px=level2, 40px=level3, etc.
            const level = Math.floor((leftValue - (writerSettings.indentationWidth / 2)) / writerSettings.indentationWidth) + 1

            // Get the color for this level (cycling through colors)
            const colorIndex = (level - 1) % writerSettings.indentColors.length
            const color = writerSettings.indentColors[colorIndex]?.rgba || 'rgba(187, 187, 187, 0.3)'

            // Apply the adjusted left position
            line.style.setProperty('left', `${adjustedLeftValue}px`, 'important')

            // Apply the color with full opacity
            // IMPORTANT: Override ALL possible color properties to ensure consistency
            line.style.setProperty('background-color', color, 'important')
            line.style.setProperty('background', color, 'important')
            line.style.setProperty('border-color', 'transparent', 'important')
            line.style.setProperty('border-left-color', 'transparent', 'important')
            line.style.setProperty('border-right-color', 'transparent', 'important')
            line.style.setProperty('border-top-color', 'transparent', 'important')
            line.style.setProperty('border-bottom-color', 'transparent', 'important')
            line.style.setProperty('border-left-width', '0', 'important')
            line.style.setProperty('border-right-width', '0', 'important')
            line.style.setProperty('border-top-width', '0', 'important')
            line.style.setProperty('border-bottom-width', '0', 'important')
            line.style.setProperty('opacity', '1', 'important')
            line.style.setProperty('width', `${writerSettings.indentationWidth}px`, 'important')
          }
        }
      })
    } else {
      // DISABLED: Hide all lines completely
      allTreeLines.forEach(line => {
        if (!(line instanceof HTMLElement)) return

        // Hide the line using both display and visibility
        line.style.setProperty('display', 'none', 'important')
        line.style.setProperty('visibility', 'hidden', 'important')
      })
    }
  }, 100)
}

// Listen for store events from other views
onStoreEvent('store:node-created', () => {
  treeData.value = buildTreeFromStore()
  setTimeout(() => updateIndentRainbowStyles(), 150)
})

onStoreEvent('store:node-deleted', () => {
  treeData.value = buildTreeFromStore()
  setTimeout(() => updateIndentRainbowStyles(), 150)
})

onStoreEvent('store:node-updated', ({ nodeId, changes }) => {
  // Update local tree item
  const updateItem = (items: WriterTreeItem[]): boolean => {
    for (const item of items) {
      if (item.id === nodeId) {
        if (changes.title !== undefined) {
          item.text = changes.title
          // Also update the node reference so the component displays the updated title
          item.node.data.title = changes.title
        }
        if (changes.content !== undefined) {
          // Update content if changed
          item.node.data.content = changes.content
        }
        return true
      }
      if (updateItem(item.children)) return true
    }
    return false
  }
  updateItem(treeData.value)
})

onStoreEvent('store:node-reparented', () => {
  treeData.value = buildTreeFromStore()
  setTimeout(() => updateIndentRainbowStyles(), 150)
})

onStoreEvent('store:siblings-reordered', () => {
  treeData.value = buildTreeFromStore()
  setTimeout(() => updateIndentRainbowStyles(), 150)
})

// Listen to node selection events from other views
onStoreEvent('store:node-selected', ({ nodeId, source, scrollIntoView }) => {
  console.log('WriterView: node-selected received for node:', nodeId, 'from source:', source, 'scrollIntoView:', scrollIntoView)
  // Scroll the node into view if requested and not from this view
  if (nodeId && scrollIntoView) {
    setTimeout(() => {
      // Try to find within the writer view container
      const writerView = document.querySelector('.writer-view')
      console.log('WriterView: writer view element:', writerView)
      if (writerView) {
        const nodeElement = writerView.querySelector(`[data-node-id="${nodeId}"]`)
        // console.log('WriterView: found element in writer view:', nodeElement)
        if (nodeElement) {
          // console.log('WriterView: scrolling element into view')
          nodeElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        } else {
          // console.log('WriterView: element not found in writer view')
        }
      }
    }, 100)
  }
})
</script>

<style scoped lang="scss">
.writer-view {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background-color: #ffffff;

  // Dark mode
  .body--dark & {
    background-color: #1d1d1d;
  }
}

.writer-tree {
  padding: 16px 8px;
  min-height: 100%;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
}

// Override he-tree default styles for seamless look
:deep(.he-tree) {
  .tree-node {
    margin-bottom: 0;
    padding: 0;
  }

  // Tree lines for indent rainbow - visibility and colors controlled by JavaScript
  .tree-line {
    // Don't set display here - it will be controlled by JavaScript
    margin: 0 !important;
    padding: 0 !important;
    height: 100% !important;
    position: absolute !important;
    pointer-events: none !important;
    // Remove ALL borders - only background-color will be used for coloring
    border: none !important;
    border-width: 0 !important;
    border-left: none !important;
    border-right: none !important;
    border-top: none !important;
    border-bottom: none !important;
    border-left-width: 0 !important;
    border-right-width: 0 !important;
    border-top-width: 0 !important;
    border-bottom-width: 0 !important;
  }

  // Ensure both vertical and horizontal lines have the same base styling
  // Override he-tree's default.css which applies different styles to vline and hline
  .tree-vline,
  .tree-hline {
    border: none !important;
    border-width: 0 !important;
    border-left: none !important;
    border-right: none !important;
    border-top: none !important;
    border-bottom: none !important;
    border-left-width: 0 !important;
    border-right-width: 0 !important;
    border-top-width: 0 !important;
    border-bottom-width: 0 !important;
    // Don't set background here - JavaScript will handle it
  }
}

// Drag placeholder styling
:deep(.he-tree-drag-placeholder) {
  background-color: rgba(25, 118, 210, 0.1);
  border: 2px dashed rgba(25, 118, 210, 0.4);
  border-radius: 4px;
  min-height: 40px;
}
</style>

