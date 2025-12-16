[vue-tsc] Object is possibly 'undefined'.
/Dev/Mindscribble/network-graph/quasar-project/src/pages/TestConceptMap.vue:504:48
    502 |
    503 |         console.log(`      Adjusted corners (reduced by padding=${padding}):`)
  > 504 |         console.log(`         Top-Left:     (${adjustedCorners[0].x}, ${adjustedCorners[0].y})`)
        |                                                ^^^^^^^^^^^^^^^^^^
    505 |         console.log(`         Top-Right:    (${adjustedCorners[1].x}, ${adjustedCorners[1].y})`)
    506 |         console.log(`         Bottom-Left:  (${adjustedCorners[2].x}, ${adjustedCorners[2].y})`)
    507 |         console.log(`         Bottom-Right: (${adjustedCorners[3].x}, ${adjustedCorners[3].y})`)
[vue-tsc] Object is possibly 'undefined'.
/Dev/Mindscribble/network-graph/quasar-project/src/pages/TestConceptMap.vue:504:73
    502 |
    503 |         console.log(`      Adjusted corners (reduced by padding=${padding}):`)
  > 504 |         console.log(`         Top-Left:     (${adjustedCorners[0].x}, ${adjustedCorners[0].y})`)
        |                                                                         ^^^^^^^^^^^^^^^^^^
    505 |         console.log(`         Top-Right:    (${adjustedCorners[1].x}, ${adjustedCorners[1].y})`)
    506 |         console.log(`         Bottom-Left:  (${adjustedCorners[2].x}, ${adjustedCorners[2].y})`)
    507 |         console.log(`         Bottom-Right: (${adjustedCorners[3].x}, ${adjustedCorners[3].y})`)
[vue-tsc] Object is possibly 'undefined'.
/Dev/Mindscribble/network-graph/quasar-project/src/pages/TestConceptMap.vue:505:48
    503 |         console.log(`      Adjusted corners (reduced by padding=${padding}):`)
    504 |         console.log(`         Top-Left:     (${adjustedCorners[0].x}, ${adjustedCorners[0].y})`)
  > 505 |         console.log(`         Top-Right:    (${adjustedCorners[1].x}, ${adjustedCorners[1].y})`)
        |                                                ^^^^^^^^^^^^^^^^^^
    506 |         console.log(`         Bottom-Left:  (${adjustedCorners[2].x}, ${adjustedCorners[2].y})`)
    507 |         console.log(`         Bottom-Right: (${adjustedCorners[3].x}, ${adjustedCorners[3].y})`)
    508 |
[vue-tsc] Object is possibly 'undefined'.
/Dev/Mindscribble/network-graph/quasar-project/src/pages/TestConceptMap.vue:505:73
    503 |         console.log(`      Adjusted corners (reduced by padding=${padding}):`)
    504 |         console.log(`         Top-Left:     (${adjustedCorners[0].x}, ${adjustedCorners[0].y})`)
  > 505 |         console.log(`         Top-Right:    (${adjustedCorners[1].x}, ${adjustedCorners[1].y})`)
        |                                                                         ^^^^^^^^^^^^^^^^^^
    506 |         console.log(`         Bottom-Left:  (${adjustedCorners[2].x}, ${adjustedCorners[2].y})`)
    507 |         console.log(`         Bottom-Right: (${adjustedCorners[3].x}, ${adjustedCorners[3].y})`)
    508 |
[vue-tsc] Object is possibly 'undefined'.
/Dev/Mindscribble/network-graph/quasar-project/src/pages/TestConceptMap.vue:506:48
    504 |         console.log(`         Top-Left:     (${adjustedCorners[0].x}, ${adjustedCorners[0].y})`)
    505 |         console.log(`         Top-Right:    (${adjustedCorners[1].x}, ${adjustedCorners[1].y})`)
  > 506 |         console.log(`         Bottom-Left:  (${adjustedCorners[2].x}, ${adjustedCorners[2].y})`)
        |                                                ^^^^^^^^^^^^^^^^^^
    507 |         console.log(`         Bottom-Right: (${adjustedCorners[3].x}, ${adjustedCorners[3].y})`)
    508 |
    509 |         allPositions.push(...adjustedCorners)
[vue-tsc] Object is possibly 'undefined'.
/Dev/Mindscribble/network-graph/quasar-project/src/pages/TestConceptMap.vue:506:73
    504 |         console.log(`         Top-Left:     (${adjustedCorners[0].x}, ${adjustedCorners[0].y})`)
    505 |         console.log(`         Top-Right:    (${adjustedCorners[1].x}, ${adjustedCorners[1].y})`)
  > 506 |         console.log(`         Bottom-Left:  (${adjustedCorners[2].x}, ${adjustedCorners[2].y})`)
        |                                                                         ^^^^^^^^^^^^^^^^^^
    507 |         console.log(`         Bottom-Right: (${adjustedCorners[3].x}, ${adjustedCorners[3].y})`)
    508 |
    509 |         allPositions.push(...adjustedCorners)
[vue-tsc] Object is possibly 'undefined'.
/Dev/Mindscribble/network-graph/quasar-project/src/pages/TestConceptMap.vue:507:48
    505 |         console.log(`         Top-Right:    (${adjustedCorners[1].x}, ${adjustedCorners[1].y})`)
    506 |         console.log(`         Bottom-Left:  (${adjustedCorners[2].x}, ${adjustedCorners[2].y})`)
  > 507 |         console.log(`         Bottom-Right: (${adjustedCorners[3].x}, ${adjustedCorners[3].y})`)
        |                                                ^^^^^^^^^^^^^^^^^^
    508 |
    509 |         allPositions.push(...adjustedCorners)
    510 |       }
[vue-tsc] Object is possibly 'undefined'.
/Dev/Mindscribble/network-graph/quasar-project/src/pages/TestConceptMap.vue:507:73
    505 |         console.log(`         Top-Right:    (${adjustedCorners[1].x}, ${adjustedCorners[1].y})`)
    506 |         console.log(`         Bottom-Left:  (${adjustedCorners[2].x}, ${adjustedCorners[2].y})`)
  > 507 |         console.log(`         Bottom-Right: (${adjustedCorners[3].x}, ${adjustedCorners[3].y})`)
        |                                                                         ^^^^^^^^^^^^^^^^^^
    508 |
    509 |         allPositions.push(...adjustedCorners)
    510 |       }
[ESLint] 'i' is defined but never used. (@typescript-eslint/no-unused-vars)
C:\Dev\Mindscribble\network-graph\quasar-project\src\pages\TestConceptMap.vue:475:32
    473 |
    474 |     console.log(`   📍 Child positions:`)
  > 475 |     children.forEach((childId, i) => {
        |                                ^
    476 |       const pos = layouts.value.nodes[childId]
    477 |       console.log(`      - ${nodes.value[childId]?.name}: (${pos?.x}, ${pos?.y})`)
    478 |     })