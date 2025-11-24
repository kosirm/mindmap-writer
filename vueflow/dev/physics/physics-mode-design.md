# Physics Mode Design Document

## Overview

Physics mode is a feature that uses Matter.js physics engine to automatically position nodes in the mindmap using:
- **Anti-gravity force** from center (0,0) pushing nodes outward radially
- **Springs (constraints)** connecting parent-child nodes to maintain hierarchy
- **Virtual springs** for root nodes anchoring them at distance from center
- **Collision detection** (already working) to prevent overlaps

## User's Vision

> "Every node is connected to parent with a connection (this could be spring) and we have also gravity - which is actually anti-gravity - pulling nodes away from center. So when we turn on the matter.js - nodes would be automatically pulled in the right positions."

## Key Decisions

### 1. Physics Mode as Toggle
- Physics mode should be a **toggle button** (like collision detection), not always on
- User can enable/disable it freely via toolbar button (science icon)
- Button turns blue when active, gray when inactive

### 2. Keep Angle/Order Calculations
- The existing angle/order calculations for orientations should be **kept**
- They're still needed for store reordering in Writer view
- When user drags nodes in physics mode, springs stretch, and on drop we calculate angles → update order field
- Children move with parent maintaining relative positions

### 3. Physics vs Collision Detection
- **Collision detection**: Already working, used for preventing overlaps during drag/drop
- **Physics mode**: New feature for automatic layout using springs and anti-gravity
- Both use Matter.js but serve different purposes
- Both can be toggled independently

## Architecture

### Separate Composable Needed
**IMPORTANT**: Physics mode should use a **separate composable** (`usePhysicsMode.ts`), NOT the existing `useMatterCollision.ts`.

**Reasons**:
1. Collision detection and physics mode serve different purposes
2. Collision detection is working fine - don't break it
3. Physics mode needs different Matter.js configuration (springs, constraints, forces)
4. Easier to maintain and debug separately
5. Avoids conflicts between collision bodies and physics bodies

### Physics Parameters (Configurable)
```typescript
const ANTI_GRAVITY_STRENGTH = ref(0.0005);
const SPRING_STIFFNESS = ref(0.01);
const SPRING_LENGTH_PARENT_CHILD = ref(300);
const SPRING_LENGTH_ROOT = ref(400);
const SPRING_DAMPING = ref(0.1);
```

## Implementation Plan

### 1. Create `usePhysicsMode.ts` Composable

**Responsibilities**:
- Initialize separate Matter.js engine for physics (with gravity disabled)
- Create/manage physics bodies for nodes
- Create/manage springs (constraints) for edges
- Apply anti-gravity force from center
- Run animation loop at 60 FPS
- Sync node positions from Matter.js bodies back to Vue Flow

**Key Functions**:
- `initPhysicsEngine()` - Initialize Matter.js engine with `markRaw()` and `shallowRef()`
- `createPhysicsBody(node)` - Create body for a node
- `createPhysicsSprings()` - Create all springs (root + parent-child)
- `removePhysicsSprings()` - Clean up springs
- `applyAntiGravity()` - Apply radial repulsion force from center
- `syncNodePositions()` - Sync Matter.js positions → Vue Flow positions
- `startPhysicsSimulation()` - Start animation loop
- `stopPhysicsSimulation()` - Stop animation loop

### 2. Springs Architecture

**Virtual Center Anchor**:
```typescript
const centerAnchor = Matter.Bodies.circle(0, 0, 1, { 
  isStatic: true,
  render: { visible: false }
});
```

**Root Node Springs** (connect to center anchor):
```typescript
Matter.Constraint.create({
  bodyA: centerAnchor,
  bodyB: rootNodeBody,
  stiffness: SPRING_STIFFNESS.value,
  damping: SPRING_DAMPING.value,
  length: SPRING_LENGTH_ROOT.value,
});
```

**Parent-Child Springs** (connect parent to child):
```typescript
Matter.Constraint.create({
  bodyA: parentBody,
  bodyB: childBody,
  stiffness: SPRING_STIFFNESS.value,
  damping: SPRING_DAMPING.value,
  length: SPRING_LENGTH_PARENT_CHILD.value,
});
```

### 3. Anti-Gravity Force

Applied every frame to all nodes:
```typescript
function applyAntiGravity() {
  nodes.forEach(node => {
    const body = physicsBodies.get(node.id);
    const dx = body.position.x - 0;
    const dy = body.position.y - 0;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const forceMagnitude = ANTI_GRAVITY_STRENGTH.value;
    const forceX = (dx / distance) * forceMagnitude;
    const forceY = (dy / distance) * forceMagnitude;
    
    Matter.Body.applyForce(body, body.position, { x: forceX, y: forceY });
  });
}
```

### 4. Animation Loop

```typescript
function animate() {
  if (!physicsEnabled.value) return;
  
  applyAntiGravity();
  Matter.Engine.update(physicsEngine.value, 16.67); // 60 FPS
  syncNodePositions();
  
  physicsAnimationId.value = requestAnimationFrame(animate);
}
```

## Current Problems (Why Physics Mode Doesn't Work)

### Problem 1: Vue Reactivity Breaking Matter.js
**Issue**: Vue's reactivity system wraps Matter.js objects in proxies, breaking Matter.js's internal property access.

**Reference**: https://github.com/liabru/matter-js/issues/1001

**Solution**: Use `markRaw()` and `shallowRef()`:
```typescript
// Use shallowRef for engine and world
const physicsEngine = shallowRef<Matter.Engine | null>(null);
const physicsWorld = shallowRef<Matter.World | null>(null);

// Wrap Matter.js objects with markRaw
physicsEngine.value = markRaw(Matter.Engine.create({ ... }));
physicsWorld.value = markRaw(physicsEngine.value.world);

const body = markRaw(Matter.Bodies.rectangle(...));
```

### Problem 2: Mixing Collision and Physics
**Issue**: Currently trying to use the same `useMatterCollision.ts` composable for both collision detection and physics mode.

**Problems**:
- Collision detection is working, but physics mode breaks it
- Different configurations needed (collision needs static bodies during drag, physics needs dynamic bodies)
- Trying to modify working code causes regressions
- Hard to debug which feature is causing issues

**Solution**: Create separate `usePhysicsMode.ts` composable with its own:
- Matter.js engine instance
- Bodies map
- Springs map
- Animation loop
- Configuration

### Problem 3: Coordinate System Confusion
**Important**: Vue Flow and Matter.js use different coordinate systems:
- **Vue Flow**: `node.position` is the **top-left corner** of the node
- **Matter.js**: `body.position` is the **center** of the body

**Conversion needed**:
```typescript
// Vue Flow → Matter.js (top-left → center)
const centerX = node.position.x + nodeWidth / 2;
const centerY = node.position.y + nodeHeight / 2;

// Matter.js → Vue Flow (center → top-left)
node.position.x = body.position.x - nodeWidth / 2;
node.position.y = body.position.y - nodeHeight / 2;
```

## Implementation Steps for Next Session

### Step 1: Create `usePhysicsMode.ts` Composable
1. Copy structure from `useMatterCollision.ts` but keep it separate
2. Use `shallowRef()` for engine and world
3. Use `markRaw()` for all Matter.js objects (engine, world, bodies, constraints)
4. Create separate bodies map: `const physicsBodies = new Map<string, Matter.Body>()`
5. Create separate springs map: `const physicsSprings = new Map<string, Matter.Constraint>()`

### Step 2: Implement Core Functions
1. `initPhysicsEngine()` - Create engine with no gravity
2. `createPhysicsBody(node)` - Create body for node (use actual DOM dimensions)
3. `removePhysicsBody(nodeId)` - Remove body from world
4. `updatePhysicsBodyPosition(nodeId, x, y)` - Update body position when node moves
5. `createPhysicsSprings()` - Create center anchor + root springs + parent-child springs
6. `removePhysicsSprings()` - Remove all springs and center anchor
7. `applyAntiGravity()` - Apply radial force from center to all bodies
8. `syncNodePositions()` - Copy Matter.js body positions → Vue Flow node positions
9. `startPhysicsSimulation()` - Create springs + start animation loop
10. `stopPhysicsSimulation()` - Stop animation + remove springs

### Step 3: Integrate into VueFlowTest.vue
1. Import and initialize composable:
   ```typescript
   const physicsMode = usePhysicsMode(nodes, physicsEnabled);
   ```
2. Use `togglePhysicsMode()` to call `physicsMode.startPhysicsSimulation()` / `stopPhysicsSimulation()`
3. Watch for node changes and update physics bodies accordingly
4. Watch for edge changes and recreate springs

### Step 4: Handle Node/Edge Changes
When physics mode is enabled:
- **Node added**: Create physics body
- **Node removed**: Remove physics body and any springs connected to it
- **Node moved by user**: Update physics body position (let springs stretch)
- **Edge added**: Create spring if physics mode is enabled
- **Edge removed**: Remove spring

### Step 5: Testing Checklist
- [ ] Create a few nodes and enable physics mode
- [ ] Nodes should spread out from center with anti-gravity
- [ ] Create parent-child connections - children should stay near parents (springs)
- [ ] Root nodes should stay at distance from center (virtual springs)
- [ ] Drag a node - spring should stretch, node should return when released
- [ ] Disable physics mode - animation should stop, springs removed
- [ ] Enable collision detection + physics mode together - should work without conflicts
- [ ] Add/remove nodes while physics is running - should update bodies
- [ ] Add/remove edges while physics is running - should update springs

## UI/UX Considerations

### Toolbar Button
- Icon: `science` (already implemented)
- Color: Blue when active, gray when inactive
- Tooltip: "Enable/disable physics mode (anti-gravity + springs)"
- Command: `mindmap.togglePhysics` (already implemented)

### Future Enhancements (Not for Initial Implementation)
1. **Settings panel** for physics parameters (gravity strength, spring stiffness, etc.)
2. **Visual springs** - optionally render springs as lines
3. **Pause/Resume** - pause physics without removing springs
4. **Physics presets** - "Tight", "Loose", "Balanced" configurations
5. **Per-node physics** - disable physics for specific nodes (pin them)
6. **Directional gravity** - gravity in specific direction instead of radial

## Code Structure

```
mindmap-writer/vueflow/vueflow-test/src/
├── composables/
│   ├── useMatterCollision.ts    # Existing - for collision detection only
│   └── usePhysicsMode.ts         # NEW - for physics mode only
├── pages/
│   └── VueFlowTest.vue           # Main component - uses both composables
├── commands/
│   └── mindmapCommands.ts        # Already has togglePhysics command
└── config/
    └── menus.ts                  # Already has physics button in toolbar
```

## Important Notes

1. **Don't modify `useMatterCollision.ts`** - it's working for collision detection
2. **Use separate Matter.js engine** - don't share engine between collision and physics
3. **Always use `markRaw()`** for Matter.js objects to prevent Vue reactivity issues
4. **Use `shallowRef()`** for engine and world so they can be updated reactively
5. **Test collision detection** after implementing physics to ensure no regressions
6. **Canvas center is (0, 0)** in flow coordinates - this is where anti-gravity originates
7. **Node dimensions** - use `getNodeDimensions()` to get actual DOM dimensions, fallback to defaults

## References

- Matter.js docs: https://brm.io/matter-js/docs/
- Vue reactivity issue: https://github.com/liabru/matter-js/issues/1001
- Vue Flow docs: https://vueflow.dev/
- Current collision detection: `mindmap-writer/vueflow/vueflow-test/src/composables/useMatterCollision.ts`
- Physics mode design discussion: This document

## Success Criteria

Physics mode is considered working when:
1. ✅ Nodes spread out from center with anti-gravity
2. ✅ Parent-child nodes stay connected via springs
3. ✅ Root nodes stay at distance from center via virtual springs
4. ✅ Animation runs smoothly at 60 FPS
5. ✅ Can toggle physics on/off without errors
6. ✅ Collision detection still works independently
7. ✅ No Vue reactivity errors in console
8. ✅ Nodes can be dragged while physics is running (springs stretch)
9. ✅ Adding/removing nodes/edges updates physics correctly
10. ✅ No performance issues with 20+ nodes


