[vue-tsc] Object is possibly 'undefined'.
/Dev/Mindscribble/network-graph/quasar-project/src/composables/layouts/useCircularLayout.ts:283:22
    281 |       // Step 4: Calculate weighted sectors (base * spacing factor)
    282 |       const weightedSectors = baseSectors.map((baseSector, i) =>
  > 283 |         baseSector * spacingFactors[i]
        |                      ^^^^^^^^^^^^^^^^^
    284 |       )
    285 |
    286 |       // Step 5: Calculate total weighted space
[vue-tsc] 'weightedSectorWidth' is possibly 'undefined'.
/Dev/Mindscribble/network-graph/quasar-project/src/composables/layouts/useCircularLayout.ts:299:34
    297 |         const spacingFactor = spacingFactors[treeIndex]
    298 |         const weightedSectorWidth = weightedSectors[treeIndex]
  > 299 |         const finalSectorWidth = weightedSectorWidth * scalingFactor
        |                                  ^^^^^^^^^^^^^^^^^^^
    300 |         
    301 |         const sectorStart = currentAngle
    302 |         const sectorEnd = currentAngle + finalSectorWidth * direction
[vue-tsc] 'baseSectorWidth' is possibly 'undefined'.
/Dev/Mindscribble/network-graph/quasar-project/src/composables/layouts/useCircularLayout.ts:304:49
    302 |         const sectorEnd = currentAngle + finalSectorWidth * direction
    303 |
  > 304 |         console.log(`Tree ${treeIndex}: base=${(baseSectorWidth * 180 / Math.PI).toFixed(1)}°, weighted=${(weightedSectorWidth * 180 / Math.PI).toFixed(1)}°, final=${(finalSectorWidth * 180 / Math.PI).toFixed(1)}°, factor=${spacingFactor.toFixed(3)}`)
        |                                                 ^^^^^^^^^^^^^^^
    305 |
    306 |         // Position this tree within its sector
    307 |         positionTreeInSector(
[vue-tsc] 'weightedSectorWidth' is possibly 'undefined'.
/Dev/Mindscribble/network-graph/quasar-project/src/composables/layouts/useCircularLayout.ts:304:108
    302 |         const sectorEnd = currentAngle + finalSectorWidth * direction
    303 |
  > 304 |         console.log(`Tree ${treeIndex}: base=${(baseSectorWidth * 180 / Math.PI).toFixed(1)}°, weighted=${(weightedSectorWidth * 180 / Math.PI).toFixed(1)}°, final=${(finalSectorWidth * 180 / Math.PI).toFixed(1)}°, factor=${spacingFactor.toFixed(3)}`)
        |                                                                                                            ^^^^^^^^^^^^^^^^^^^
    305 |
    306 |         // Position this tree within its sector
    307 |         positionTreeInSector(
[vue-tsc] 'spacingFactor' is possibly 'undefined'.
/Dev/Mindscribble/network-graph/quasar-project/src/composables/layouts/useCircularLayout.ts:304:225
    302 |         const sectorEnd = currentAngle + finalSectorWidth * direction
    303 |
  > 304 |         console.log(`Tree ${treeIndex}: base=${(baseSectorWidth * 180 / Math.PI).toFixed(1)}°, weighted=${(weightedSectorWidth * 180 / Math.PI).toFixed(1)}°, final=${(finalSectorWidth * 180 / Math.PI).toFixed(1)}°, factor=${spacingFactor.toFixed(3)}`)
        |                                                                                                                                                                                                                                 ^^^^^^^^^^^^^
    305 |
    306 |         // Position this tree within its sector
    307 |         positionTreeInSector(
[ESLint] 'index' is defined but never used. (@typescript-eslint/no-unused-vars)
C:\Dev\Mindscribble\network-graph\quasar-project\src\composables\layouts\useCircularLayout.ts:321:28
    319 |     } else {
    320 |       // Original uniform spacing (no spacing ratio)
  > 321 |       trees.forEach((tree, index) => {
        |                            ^^^^^
    322 |         const minSectorRad = toRadians(layoutParams.minSectorAngle)
    323 |         const proportionalSector = (tree.subtreeSize / totalSize) * fullCircle
    324 |         const sectorWidth = Math.max(proportionalSector, minSectorRad) * direction