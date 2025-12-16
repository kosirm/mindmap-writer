[ESLint] 'computed' is defined but never used. (@typescript-eslint/no-unused-vars)
C:\Dev\Mindscribble\network-graph\quasar-project\src\pages\TestConceptMap.vue:151:56
    149 |
    150 | <script setup lang="ts">
  > 151 | import { ref, reactive, watch, onMounted, onUnmounted, computed } from 'vue'
        |                                                        ^^^^^^^^
    152 | import { useQuasar } from 'quasar'
    153 | import * as vNG from 'v-network-graph'
    154 | import { ForceLayout } from 'v-network-graph/lib/force-layout'
[ESLint] 'event' is defined but never used. (@typescript-eslint/no-unused-vars)
C:\Dev\Mindscribble\network-graph\quasar-project\src\pages\TestConceptMap.vue:512:42
    510 |
    511 | // Mouse event handlers for node dragging
  > 512 | function onNodeMouseDown(nodeId: string, event: MouseEvent) {
        |                                          ^^^^^
    513 |   // Store initial position for dragging
    514 |   const node = nodes.value[nodeId]
    515 |   if (node) {
[ESLint] 'nodeId' is defined but never used. (@typescript-eslint/no-unused-vars)
C:\Dev\Mindscribble\network-graph\quasar-project\src\pages\TestConceptMap.vue:520:24
    518 | }
    519 |
  > 520 | function onNodeMouseUp(nodeId: string, event: MouseEvent) {
        |                        ^^^^^^
    521 |   // Update parent containers after drag
    522 |   updateParentContainers()
    523 | }
[ESLint] 'event' is defined but never used. (@typescript-eslint/no-unused-vars)
C:\Dev\Mindscribble\network-graph\quasar-project\src\pages\TestConceptMap.vue:520:40
    518 | }
    519 |
  > 520 | function onNodeMouseUp(nodeId: string, event: MouseEvent) {
        |                                        ^^^^^
    521 |   // Update parent containers after drag
    522 |   updateParentContainers()
    523 | }
[vue-tsc] Property 'id' does not exist on type 'ConceptMapNode'.
/Dev/Mindscribble/network-graph/quasar-project/src/pages/TestConceptMap.vue:435:51
    433 |   let minX = layout?.x || 0
    434 |   children.forEach(child => {
  > 435 |     const childLayout = layouts.value.nodes[child.id]
        |                                                   ^^
    436 |     const childX = childLayout?.x || 0
    437 |     const childWidth = (child.width || 120) * scale
    438 |     minX = Math.min(minX, childX - childWidth / 2)
[vue-tsc] Property 'id' does not exist on type 'ConceptMapNode'.
/Dev/Mindscribble/network-graph/quasar-project/src/pages/TestConceptMap.vue:456:51
    454 |   let minY = layout?.y || 0
    455 |   children.forEach(child => {
  > 456 |     const childLayout = layouts.value.nodes[child.id]
        |                                                   ^^
    457 |     const childY = childLayout?.y || 0
    458 |     const childHeight = (child.height || 40) * scale
    459 |     minY = Math.min(minY, childY - childHeight / 2)
[vue-tsc] Property 'id' does not exist on type 'ConceptMapNode'.
/Dev/Mindscribble/network-graph/quasar-project/src/pages/TestConceptMap.vue:478:51
    476 |
    477 |   children.forEach(child => {
  > 478 |     const childLayout = layouts.value.nodes[child.id]
        |                                                   ^^
    479 |     const childX = childLayout?.x || 0
    480 |     const childWidth = (child.width || 120) * scale
    481 |     minX = Math.min(minX, childX - childWidth / 2)
[vue-tsc] Property 'id' does not exist on type 'ConceptMapNode'.
/Dev/Mindscribble/network-graph/quasar-project/src/pages/TestConceptMap.vue:501:51
    499 |
    500 |   children.forEach(child => {
  > 501 |     const childLayout = layouts.value.nodes[child.id]
        |                                                   ^^
    502 |     const childY = childLayout?.y || 0
    503 |     const childHeight = (child.height || 40) * scale
    504 |     minY = Math.min(minY, childY - childHeight / 2)
[vue-tsc] Property 'id' does not exist on type 'ConceptMapNode'.
/Dev/Mindscribble/network-graph/quasar-project/src/pages/TestConceptMap.vue:529:38
    527 |   // Find all parent nodes and update their isParent flag
    528 |   Object.values(nodes.value).forEach(node => {
  > 529 |     node.isParent = hasChildren(node.id)
        |                                      ^^
    530 |   })
    531 | }
    532 |
[vue-tsc] Object is possibly 'undefined'.
/Dev/Mindscribble/network-graph/quasar-project/src/pages/TestConceptMap.vue:610:3
    608 |
    609 |   // Update parent's isParent flag
  > 610 |   nodes.value[parentId].isParent = true
        |   ^^^^^^^^^^^^^^^^^^^^^
    611 |
    612 |   contextMenuVisible.value = false
    613 |