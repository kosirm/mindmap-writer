[ESLint] 'nodeWidth' is assigned a value but never used. (@typescript-eslint/no-unused-vars)
C:\Dev\Mindscribble\network-graph\quasar-project\src\composables\layouts\testCircularSpacing.ts:47:9
    45 |   console.log('\nDistances between consecutive rectangles:')
    46 |   const nodeIds = Object.keys(nodes)
  > 47 |   const nodeWidth = 120
       |         ^^^^^^^^^
    48 |   const nodeHeight = 40
    49 |   
    50 |   for (let i = 0; i < nodeIds.length; i++) {
[ESLint] 'nodeHeight' is assigned a value but never used. (@typescript-eslint/no-unused-vars)
C:\Dev\Mindscribble\network-graph\quasar-project\src\composables\layouts\testCircularSpacing.ts:48:9
    46 |   const nodeIds = Object.keys(nodes)
    47 |   const nodeWidth = 120
  > 48 |   const nodeHeight = 40
       |         ^^^^^^^^^^
    49 |   
    50 |   for (let i = 0; i < nodeIds.length; i++) {
    51 |     const currentId = nodeIds[i]!
[ESLint] 'getAngle' is assigned a value but never used. (@typescript-eslint/no-unused-vars)
C:\Dev\Mindscribble\network-graph\quasar-project\src\composables\layouts\useCircularLayout.ts:427:9
    425 |    * Get angle of a point relative to center
    426 |    */
  > 427 |   const getAngle = (x: number, y: number, centerX: number, centerY: number): number => {
        |         ^^^^^^^^
    428 |     return Math.atan2(y - centerY, x - centerX)
    429 |   }
    430 |
[ESLint] 'angleInSector' is assigned a value but never used. (@typescript-eslint/no-unused-vars)
C:\Dev\Mindscribble\network-graph\quasar-project\src\composables\layouts\useCircularLayout.ts:443:9
    441 |    * Check if angle is within sector (handles wraparound)
    442 |    */
  > 443 |   const angleInSector = (angle: number, sectorStart: number, sectorEnd: number): boolean => {
        |         ^^^^^^^^^^^^^
    444 |     const normAngle = normalizeAngle(angle)
    445 |     const normStart = normalizeAngle(sectorStart)
    446 |     const normEnd = normalizeAngle(sectorEnd)
[ESLint] 'minSpacing' is assigned a value but never used. (@typescript-eslint/no-unused-vars)
C:\Dev\Mindscribble\network-graph\quasar-project\src\composables\layouts\useCircularLayout.ts:505:11
    503 |     const nodeWidth = params.nodeWidth ?? 120
    504 |     const nodeHeight = params.nodeHeight ?? 40
  > 505 |     const minSpacing = params.minNodeSpacing ?? 10
        |           ^^^^^^^^^^
    506 |
    507 |     if (children.length === 0) {
    508 |       return { positions: [], actualRadius: childRadius }
[ESLint] 'totalSize' is assigned a value but never used. (@typescript-eslint/no-unused-vars)
C:\Dev\Mindscribble\network-graph\quasar-project\src\composables\layouts\useCircularLayout.ts:757:11
    755 |
    756 |     // Calculate total subtree sizes for sector allocation
  > 757 |     const totalSize = trees.reduce((sum, tree) => sum + tree.subtreeSize, 0)
        |           ^^^^^^^^^
    758 |
    759 |     // Calculate full circle angle range
    760 |     const fullCircle = 2 * Math.PI
[ESLint] 'direction' is assigned a value but never used. (@typescript-eslint/no-unused-vars)
C:\Dev\Mindscribble\network-graph\quasar-project\src\composables\layouts\useCircularLayout.ts:762:11
    760 |     const fullCircle = 2 * Math.PI
    761 |     const startAngleRad = toRadians(layoutParams.startAngle)
  > 762 |     const direction = layoutParams.clockwise ? 1 : -1
        |           ^^^^^^^^^
    763 |
    764 |     // Position each root's tree in its allocated sector
    765 |     const positions: Record<string, NodePosition> = {}