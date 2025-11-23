# Physics Mode Design Document

## ⚠️ CRITICAL REALIZATION

**Physics mode CANNOT work without collision detection!**

Without collision detection, all child nodes would be pushed by anti-gravity in the same radial direction from center, causing them to **overlap perfectly**. The springs keep them at the right distance from parent, but collision detection provides the **lateral force** that spreads siblings apart.

**Therefore**: Physics mode is NOT a separate feature - it's an **enhancement** to the existing collision detection system!

## Architecture Decision: Single Unified System

**DO NOT create separate `usePhysicsMode.ts` composable!**

Instead, enhance the existing `useMatterCollision.ts` to add:
- ✅ Springs (constraints) for parent-child relationships
- ✅ Anti-gravity force from center
- ✅ Keep existing collision detection (already working)

**One Matter.js engine** handles everything:
- **Collision detection** - prevents overlaps (lateral force between siblings)
- **Springs** - maintain parent-child relationships (connection force)
- **Anti-gravity** - pushes nodes away from center (radial force)

All three forces work together to create a balanced, natural layout!

## 🎯 Key Insights Summary

### 1. Physics NEEDS Collision Detection
Without collision, all siblings would overlap at the same radial position from center. Collision provides the lateral force that spreads them apart.

### 2. One Engine, Three Forces
- **Collision** (lateral) - Spreads siblings apart
- **Springs** (connection) - Keeps parent-child together
- **Anti-gravity** (radial) - Pushes away from center

### 3. Circle Bodies Are Better
Rectangle bodies cause jerky collisions. Circles roll smoothly and are more efficient. Visual nodes stay rectangular, only collision bodies are circles.

### 4. Two-Phase Implementation
1. **Phase 1**: Convert to circle bodies (test collision detection)
2. **Phase 2**: Add springs + anti-gravity (enable physics mode)

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

### ~~Separate Composable Needed~~ ❌ WRONG APPROACH!

**UPDATED DECISION**: Use the **existing `useMatterCollision.ts`** composable!

**Why the unified approach is correct**:
1. ✅ Physics mode REQUIRES collision detection to work (prevents sibling overlaps)
2. ✅ All three forces (collision, springs, anti-gravity) work together
3. ✅ One Matter.js engine is more efficient than two
4. ✅ Simpler architecture - no synchronization between two engines needed
5. ✅ Collision detection already working - just add springs and anti-gravity on top

**What to add to `useMatterCollision.ts`**:
- Springs map: `const physicsSprings = new Map<string, Matter.Constraint>()`
- `createPhysicsSprings()` function
- `removePhysicsSprings()` function
- `applyAntiGravity()` function
- Physics mode toggle state
- Animation loop for continuous physics updates

### Physics Parameters (Configurable)
```typescript
const ANTI_GRAVITY_STRENGTH = ref(0.0005);
const SPRING_STIFFNESS = ref(0.01);
const SPRING_LENGTH_PARENT_CHILD = ref(300);
const SPRING_LENGTH_ROOT = ref(400);
const SPRING_DAMPING = ref(0.1);
```

## Implementation Plan

### 1. Enhance `useMatterCollision.ts` Composable

**New Responsibilities** (add to existing):
- Create/manage springs (constraints) for parent-child edges
- Apply anti-gravity force from center
- Run animation loop at 60 FPS when physics mode is enabled
- Toggle physics mode on/off

**New Functions to Add**:
- `createPhysicsSprings()` - Create all springs (root + parent-child)
- `removePhysicsSprings()` - Clean up springs
- `applyAntiGravity()` - Apply radial repulsion force from center
- `startPhysicsMode()` - Create springs + start animation loop
- `stopPhysicsMode()` - Stop animation + remove springs
- `togglePhysicsMode()` - Toggle physics on/off

**Existing Functions** (keep as-is):
- `initMatterEngine()` - Already working
- `createMatterBody(node)` - Already working
- `updateMatterBodyPosition()` - Already working
- `runMatterEngineToResolveOverlaps()` - Already working for collision detection

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

## Circle Bodies vs Rectangle Bodies

### 💡 BETTER APPROACH: Use Circle Bodies for Collision Detection

**Current**: Rectangle bodies (`Matter.Bodies.rectangle()`)
**Proposed**: Circle bodies (`Matter.Bodies.circle()`)

### Why Circles Are Better:

1. ✅ **More natural pushing** - No corners getting stuck or causing jerky movements
2. ✅ **Smoother collisions** - Circles roll/slide past each other naturally
3. ✅ **Simpler physics** - Matter.js handles circles more efficiently
4. ✅ **Direction-agnostic** - Pushes equally in all directions (perfect for radial layouts)
5. ✅ **User-configurable radius** - Easy to adjust "personal space" around nodes
6. ✅ **Better for radial layouts** - Matches the anti-gravity concept perfectly
7. ✅ **Less CPU intensive** - Fewer collision calculations needed

### Implementation:

```typescript
// Instead of:
const body = Matter.Bodies.rectangle(
  centerX, centerY,
  nodeWidth, nodeHeight,
  options
);

// Use:
const body = Matter.Bodies.circle(
  centerX, centerY,
  radius,
  options
);
```

### Radius Calculation:

```typescript
// Option 1: Fit the node (default)
const radius = Math.max(nodeWidth, nodeHeight) / 2;

// Option 2: User-configurable (in settings)
const COLLISION_RADIUS = ref(100); // 50-200px range
const radius = COLLISION_RADIUS.value;

// Option 3: Proportional to node size
const radius = Math.sqrt(nodeWidth * nodeHeight) / 2;
```

### Visual vs Collision Body:

- **Visual**: Node still renders as **rectangle** (Vue Flow node)
- **Collision**: Invisible **circle** body in Matter.js
- **Radius setting**: In left drawer (D3 Force Parameters tab) or future settings page

### Settings UI:

```typescript
// Add to D3 Force Parameters section
<q-slider
  v-model="collisionRadius"
  :min="50"
  :max="200"
  :step="10"
  label
  label-always
  :label-value="`Collision Radius: ${collisionRadius}px`"
/>
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

### ~~Problem 2: Mixing Collision and Physics~~ ✅ NOT A PROBLEM!

**Previous thinking**: Separate composables for collision and physics.

**Correct understanding**: They MUST work together in the same engine!
- Collision detection provides **lateral force** (spreads siblings apart)
- Springs provide **connection force** (keeps parent-child together)
- Anti-gravity provides **radial force** (pushes away from center)

All three forces are **complementary** and must run in the same physics simulation!

**Solution**: Enhance `useMatterCollision.ts` to add springs and anti-gravity, keeping collision detection as-is.

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

### Step 0: Convert Rectangle Bodies to Circle Bodies (RECOMMENDED FIRST)

**Why do this first**: Simpler, more natural collisions before adding springs and anti-gravity.

1. In `useMatterCollision.ts`, find `createMatterBody()` function
2. Replace `Matter.Bodies.rectangle()` with `Matter.Bodies.circle()`
3. Calculate radius: `const radius = Math.max(dimensions.width, dimensions.height) / 2`
4. Add configurable radius setting in UI (left drawer)
5. Test collision detection with circles - should be smoother!

### Step 1: Add Physics State to `useMatterCollision.ts`

Add new state variables:
```typescript
// Physics mode state
const physicsEnabled = ref(false);
const physicsSprings = new Map<string, Matter.Constraint>();
const physicsAnimationId = ref<number | null>(null);

// Physics parameters
const ANTI_GRAVITY_STRENGTH = ref(0.0005);
const SPRING_STIFFNESS = ref(0.01);
const SPRING_LENGTH_PARENT_CHILD = ref(300);
const SPRING_LENGTH_ROOT = ref(400);
const SPRING_DAMPING = ref(0.1);
```

### Step 2: Implement Core Physics Functions
1. `createPhysicsSprings()` - Create center anchor + root springs + parent-child springs
2. `removePhysicsSprings()` - Remove all springs and center anchor
3. `applyAntiGravity()` - Apply radial force from center to all bodies
4. `startPhysicsMode()` - Create springs + start animation loop
5. `stopPhysicsMode()` - Stop animation + remove springs
6. `togglePhysicsMode()` - Toggle physics on/off

**Note**: Reuse existing functions for bodies:
- `createMatterBody()` - Already creates bodies (just change to circles)
- `updateMatterBodyPosition()` - Already updates positions
- `initMatterEngine()` - Already initializes engine

### Step 3: Integrate into VueFlowTest.vue
1. The composable is already initialized: `const matterCollision = useMatterCollision(nodes, matterEnabled)`
2. Add physics toggle button to toolbar (already exists in commands)
3. Call `matterCollision.togglePhysicsMode()` from button
4. Watch for edge changes and recreate springs when physics is enabled

### Step 4: Handle Node/Edge Changes
When physics mode is enabled:
- **Node added**: Create physics body
- **Node removed**: Remove physics body and any springs connected to it
- **Node moved by user**: Update physics body position (let springs stretch)
- **Edge added**: Create spring if physics mode is enabled
- **Edge removed**: Remove spring

### Step 5: Testing Checklist
- [ ] **First**: Test circle bodies with collision detection only (no physics yet)
  - [ ] Nodes should push each other smoothly (no jerky rectangle corners)
  - [ ] Adjust collision radius setting - nodes should respect new radius
- [ ] **Then**: Enable physics mode
  - [ ] Nodes should spread out from center with anti-gravity
  - [ ] Create parent-child connections - children should stay near parents (springs)
  - [ ] Root nodes should stay at distance from center (virtual springs)
  - [ ] Siblings should NOT overlap (collision detection prevents this)
  - [ ] Drag a node - spring should stretch, collision should work
  - [ ] Disable physics mode - animation should stop, springs removed, collision still works
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
│   └── useMatterCollision.ts    # ENHANCED - collision + physics in one!
├── pages/
│   └── VueFlowTest.vue           # Main component - uses composable
├── commands/
│   └── mindmapCommands.ts        # Add togglePhysics command
└── config/
    └── menus.ts                  # Add physics button to toolbar
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

### Phase 1: Circle Bodies (Do First)
1. ✅ Collision detection works with circle bodies
2. ✅ Nodes push each other smoothly (no jerky corners)
3. ✅ Collision radius is configurable in UI
4. ✅ No regressions in existing collision detection

### Phase 2: Physics Mode (After Circles Work)
1. ✅ Nodes spread out from center with anti-gravity
2. ✅ Parent-child nodes stay connected via springs
3. ✅ Root nodes stay at distance from center via virtual springs
4. ✅ **Siblings do NOT overlap** (collision detection prevents this)
5. ✅ Animation runs smoothly at 60 FPS
6. ✅ Can toggle physics on/off without errors
7. ✅ Collision detection works WITH physics mode enabled
8. ✅ No Vue reactivity errors in console
9. ✅ Nodes can be dragged while physics is running (springs stretch)
10. ✅ Adding/removing nodes/edges updates physics correctly
11. ✅ No performance issues with 20+ nodes


