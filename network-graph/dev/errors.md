[vue-tsc] Cannot find name 'layoutParams'.
/Dev/Mindscribble/network-graph/quasar-project/src/composables/layouts/useCircularLayout.ts:251:28
    249 |     // For better circular distribution, use the startAngle parameter as the starting point
    250 |     // and distribute nodes around the full circle
  > 251 |     const startAngleRad = (layoutParams.startAngle * Math.PI / 180) - (Math.PI / 2)  // -90° = top
        |                            ^^^^^^^^^^^^
    252 |     
    253 |     // Calculate how much of the circle we need to use for proper spacing
    254 |     // If totalAngularSpace is less than 2π, we can distribute around full circle
[vue-tsc] Object is possibly 'undefined'.
/Dev/Mindscribble/network-graph/quasar-project/src/composables/layouts/useCircularLayout.ts:359:34
    357 |     console.log(`=== Before adjustment: ${childPositions.length} children at depth ${depth} ===`)
    358 |     childPositions.forEach((pos, i) => {
  > 359 |       console.log(`Child ${i} (${tree.children[i].id}): (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)})`)
        |                                  ^^^^^^^^^^^^^^^^
    360 |     })
    361 |     
    362 |     const adjustedPositions = adjustNodeSpacing(childPositions, params, centerX, centerY, radius)
[vue-tsc] Expected 6 arguments, but got 5.
/Dev/Mindscribble/network-graph/quasar-project/src/composables/layouts/useCircularLayout.ts:362:31
    360 |     })
    361 |     
  > 362 |     const adjustedPositions = adjustNodeSpacing(childPositions, params, centerX, centerY, radius)
        |                               ^^^^^^^^^^^^^^^^^
    363 |
    364 |     console.log(`=== After adjustment: ${adjustedPositions.length} children ===`)
    365 |     adjustedPositions.forEach((pos, i) => {
[vue-tsc] Object is possibly 'undefined'.
/Dev/Mindscribble/network-graph/quasar-project/src/composables/layouts/useCircularLayout.ts:366:43
    364 |     console.log(`=== After adjustment: ${adjustedPositions.length} children ===`)
    365 |     adjustedPositions.forEach((pos, i) => {
  > 366 |       console.log(`Adjusted child ${i} (${tree.children[i].id}): (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)})`)
        |                                           ^^^^^^^^^^^^^^^^
    367 |     })
    368 |
    369 |     // Recursively position children's subtrees using adjusted positions
[vue-tsc] Object is possibly 'undefined'.
/Dev/Mindscribble/network-graph/quasar-project/src/composables/layouts/useCircularLayout.ts:470:48
    468 |         // Collect root node positions for spacing adjustment
    469 |         if (tree.depth === 0) {  // Only root nodes (depth 0)
  > 470 |           rootPositions.push({ id: tree.id, x: positions[tree.id].x, y: positions[tree.id].y })
        |                                                ^^^^^^^^^^^^^^^^^^
    471 |         }
    472 |
    473 |         currentAngle = sectorEnd
[vue-tsc] Object is possibly 'undefined'.
/Dev/Mindscribble/network-graph/quasar-project/src/composables/layouts/useCircularLayout.ts:470:73
    468 |         // Collect root node positions for spacing adjustment
    469 |         if (tree.depth === 0) {  // Only root nodes (depth 0)
  > 470 |           rootPositions.push({ id: tree.id, x: positions[tree.id].x, y: positions[tree.id].y })
        |                                                                         ^^^^^^^^^^^^^^^^^^
    471 |         }
    472 |
    473 |         currentAngle = sectorEnd
[vue-tsc] Object is possibly 'undefined'.
/Dev/Mindscribble/network-graph/quasar-project/src/composables/layouts/useCircularLayout.ts:498:48
    496 |         // Collect root node positions for spacing adjustment
    497 |         if (tree.depth === 0) {  // Only root nodes (depth 0)
  > 498 |           rootPositions.push({ id: tree.id, x: positions[tree.id].x, y: positions[tree.id].y })
        |                                                ^^^^^^^^^^^^^^^^^^
    499 |         }
    500 |
    501 |         currentAngle = sectorEnd
[vue-tsc] Object is possibly 'undefined'.
/Dev/Mindscribble/network-graph/quasar-project/src/composables/layouts/useCircularLayout.ts:498:73
    496 |         // Collect root node positions for spacing adjustment
    497 |         if (tree.depth === 0) {  // Only root nodes (depth 0)
  > 498 |           rootPositions.push({ id: tree.id, x: positions[tree.id].x, y: positions[tree.id].y })
        |                                                                         ^^^^^^^^^^^^^^^^^^
    499 |         }
    500 |
    501 |         currentAngle = sectorEnd
[vue-tsc] Expected 6 arguments, but got 5.
/Dev/Mindscribble/network-graph/quasar-project/src/composables/layouts/useCircularLayout.ts:508:37
    506 |     if (rootPositions.length > 1) {
    507 |       console.log(`=== APPLYING SPACING ADJUSTMENT TO ${rootPositions.length} ROOT NODES ===`)
  > 508 |       const adjustedRootPositions = adjustNodeSpacing(rootPositions, layoutParams, centerX, centerY, layoutParams.innerRadius)
        |                                     ^^^^^^^^^^^^^^^^^
    509 |       
    510 |       // Update positions with adjusted spacing
    511 |       adjustedRootPositions.forEach(adjustedPos => {
[ESLint] 'startAngle' is defined but never used. (@typescript-eslint/no-unused-vars)
C:\Dev\Mindscribble\network-graph\quasar-project\src\composables\layouts\useCircularLayout.ts:194:5
    192 |     centerY: number,
    193 |     radius: number,
  > 194 |     startAngle: number
        |     ^^^^^^^^^^
    195 |   ): Array<{ id: string; x: number; y: number }> => {
    196 |     console.log('=== DEBUG: adjustNodeSpacing called ===')
    197 |     console.log(`Center: (${centerX}, ${centerY}), Radius: ${radius}`)