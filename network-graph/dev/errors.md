[vue-tsc] 'edge' is possibly 'undefined'.
/Dev/Mindscribble/network-graph/quasar-project/src/pages/TestMindMap.vue:409:18
    407 |         const oldEdgeId = Object.keys(edges.value).find(id => {
    408 |           const edge = edges.value[id]
  > 409 |           return edge.type === 'hierarchy' && edge.source === targetNode.parentId && edge.target === targetId
        |                  ^^^^
    410 |         })
    411 |         if (oldEdgeId) {
    412 |           delete edges.value[oldEdgeId]
[vue-tsc] 'edge' is possibly 'undefined'.
/Dev/Mindscribble/network-graph/quasar-project/src/pages/TestMindMap.vue:409:47
    407 |         const oldEdgeId = Object.keys(edges.value).find(id => {
    408 |           const edge = edges.value[id]
  > 409 |           return edge.type === 'hierarchy' && edge.source === targetNode.parentId && edge.target === targetId
        |                                               ^^^^
    410 |         })
    411 |         if (oldEdgeId) {
    412 |           delete edges.value[oldEdgeId]
[vue-tsc] 'edge' is possibly 'undefined'.
/Dev/Mindscribble/network-graph/quasar-project/src/pages/TestMindMap.vue:409:86
    407 |         const oldEdgeId = Object.keys(edges.value).find(id => {
    408 |           const edge = edges.value[id]
  > 409 |           return edge.type === 'hierarchy' && edge.source === targetNode.parentId && edge.target === targetId
        |                                                                                      ^^^^
    410 |         })
    411 |         if (oldEdgeId) {
    412 |           delete edges.value[oldEdgeId]
[vue-tsc] Argument of type 'string | undefined' is not assignable to parameter of type 'string'. Type 'undefined' is not assignable to type 'string'.
/Dev/Mindscribble/network-graph/quasar-project/src/pages/TestMindMap.vue:441:38
    439 |
    440 |   const rootId = selectedNodes.value[0]
  > 441 |   const descendants = getDescendants(rootId)
        |                                      ^^^^^^
    442 |   const subgraphNodes = [rootId, ...descendants]
    443 |
    444 |   if (subgraphNodes.length === 1) {
[vue-tsc] Type 'undefined' cannot be used as an index type.
/Dev/Mindscribble/network-graph/quasar-project/src/pages/TestMindMap.vue:481:39
    479 |
    480 |   // Get the root node's current position to use as anchor
  > 481 |   const rootPos = layouts.value.nodes[rootId]
        |                                       ^^^^^^
    482 |   const rootDagrePos = g.node(rootId)
    483 |   const offsetX = rootPos.x - rootDagrePos.x
    484 |   const offsetY = rootPos.y - rootDagrePos.y
[vue-tsc] Type 'undefined' cannot be used as an index type.
/Dev/Mindscribble/network-graph/quasar-project/src/pages/TestMindMap.vue:489:25
    487 |   subgraphNodes.forEach(nodeId => {
    488 |     const dagreNode = g.node(nodeId)
  > 489 |     layouts.value.nodes[nodeId] = {
        |                         ^^^^^^
    490 |       x: dagreNode.x + offsetX,
    491 |       y: dagreNode.y + offsetY,
    492 |     }
[vue-tsc] Cannot find name 'dagreDirection'.
/Dev/Mindscribble/network-graph/quasar-project/src/pages/TestMindMap.vue:542:8
    540 |
    541 | function applyDagreLayout() {
  > 542 |   if (!dagreDirection.value || !dagreDirection.value.value || !graphRef.value) return
        |        ^^^^^^^^^^^^^^
    543 |
    544 |   // Check if we have nodes and edges
    545 |   if (Object.keys(nodes.value).length <= 1 || Object.keys(edges.value).length === 0) {
[vue-tsc] Cannot find name 'dagreDirection'.
/Dev/Mindscribble/network-graph/quasar-project/src/pages/TestMindMap.vue:542:33
    540 |
    541 | function applyDagreLayout() {
  > 542 |   if (!dagreDirection.value || !dagreDirection.value.value || !graphRef.value) return
        |                                 ^^^^^^^^^^^^^^
    543 |
    544 |   // Check if we have nodes and edges
    545 |   if (Object.keys(nodes.value).length <= 1 || Object.keys(edges.value).length === 0) {
[vue-tsc] Cannot find name 'dagreDirection'.
/Dev/Mindscribble/network-graph/quasar-project/src/pages/TestMindMap.vue:555:19
    553 |
    554 |   // Extract the value from the option object
  > 555 |   const rankdir = dagreDirection.value.value
        |                   ^^^^^^^^^^^^^^
    556 |
    557 |   // Create dagre graph
    558 |   const g = new dagre.graphlib.Graph()
[ESLint] 'applyDagreLayout' is defined but never used. (@typescript-eslint/no-unused-vars)
C:\Dev\Mindscribble\network-graph\quasar-project\src\pages\TestMindMap.vue:541:10
    539 | }
    540 |
  > 541 | function applyDagreLayout() {
        |          ^^^^^^^^^^^^^^^^
    542 |   if (!dagreDirection.value || !dagreDirection.value.value || !graphRef.value) return
    543 |
    544 |   // Check if we have nodes and edges