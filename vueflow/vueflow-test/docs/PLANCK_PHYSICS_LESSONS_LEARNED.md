# Planck.js Physics Mode - Lessons Learned

## Date: 2025-11-24

## Summary

We attempted to implement a radial constraints physics system using Planck.js (Box2D port) for mindmap node layout. The goal was to have nodes arranged in concentric circles based on hierarchy depth, with siblings spread around their parent's angle, and adjustable minimum distances between nodes.

**Result**: ❌ **Failed** - Nodes tremble constantly due to competing forces, making the UX unusable.

---

## What We Tried

### Configuration 1: Radial Constraints (No Springs)

**Goal**: Nodes locked to concentric circles, pulled toward parent's angle, with collision-based spacing.

**Implementation**:
- **Radial Force**: Pulls node toward target radius (depth × springLength)
- **Angular Force**: Pulls node toward target angle (parent's angle from center)
- **Collision Detection**: Siblings collide and push each other apart
- **Minimum Distance Enforcement**: Repulsive force when siblings too close

**Parameters**:
- `RADIAL_CONSTRAINT_STRENGTH`: 1000 (circle attraction)
- `ANGULAR_CONSTRAINT_STRENGTH`: 100-500 (point attraction)
- `SIBLING_COLLISION_STRENGTH`: 1.0-10.0 (collision strength)
- `MIN_NODE_DISTANCE`: 10-30px (minimum spacing)
- `LINEAR_DAMPING`: 2.0 (air resistance)

**Code Location**: `usePlanckCollision.ts` lines 520-646 (applyRadialConstraints function)

---

## Problems Encountered

### 1. ❌ **Constant Trembling (CRITICAL)**

**Symptom**: Nodes oscillate continuously, never settling to stable positions.

**Root Cause**: Competing forces create unstable equilibrium:
- **Angular Force** pulls siblings toward same angle (parent's angle)
- **Collision Force** pushes siblings apart
- These forces constantly fight each other, causing oscillation

**Evidence** (from dev.log lines 185-237):
```
edgeDist=21.1px → 21.5px → 21.5px → 21.5px → 19.8px → 20.8px → 21.1px → 21.2px → 18.6px → 19.9px → 20.6px → 20.8px → 17.5px → 18.9px → 20.1px → 20.4px → 16.6px → 18.0px → 19.3px → 20.1px
```
Distance oscillates ±2-3px continuously, never stabilizing.

**Attempted Fixes**:
1. ✅ Adaptive angular force reduction (reduce when siblings close) - **Helped but not enough**
2. ✅ Increased damping (LINEAR_DAMPING = 2.0) - **Helped but not enough**
3. ❌ Auto-stop when velocity low - **Caused other problems, removed**
4. ❌ Minimum angular force (20%) - **Still trembles**

**Why It Failed**: Physics engines are designed for realistic simulation, not stable layouts. Without advanced constraint solvers or explicit stabilization, competing forces will always oscillate.

---

### 2. ❌ **Minimum Node Distance Not Working Properly**

**Symptom**: Changing MIN_NODE_DISTANCE slider had minimal effect on actual spacing.

**Root Cause**: 
- Repulsive force only applied during collision (pre-solve event)
- Angular force constantly pulls nodes back together
- No stable equilibrium point

**Attempted Fix**: Added repulsive force in pre-solve listener (lines 174-223)
- Applied force proportional to distance violation
- **Result**: Helped slightly but still unstable due to competing forces

---

### 3. ✅ **Children Not Following Parent** (FIXED)

**Symptom**: When parent moved, children stayed at old angle.

**Root Cause**: Adaptive angular force reduction was too aggressive (reduced to 0% when siblings close).

**Fix**: 
- Reduced threshold from 3× to 1.5× MIN_NODE_DISTANCE
- Set minimum angular force to 20% (never 0%)
- Increased default ANGULAR_CONSTRAINT_STRENGTH from 100 to 500

**Result**: ✅ Children now follow parent, but still tremble.

---

## Technical Implementation Details

### Planck.js World Setup

```typescript
// Initialize world with gravity disabled
const world = World({
  gravity: Vec2(0, 0) // No gravity for mindmap
});

// Enable collision filtering via pre-solve event
world.on('pre-solve', (contact) => {
  // Custom collision logic here
  // Can disable collision: contact.setEnabled(false)
  // Can adjust friction: contact.setFriction(value)
  // Can adjust restitution: contact.setRestitution(value)
});
```

**Location**: `usePlanckCollision.ts` lines 230-246

### Body Creation

```typescript
// Create dynamic body with box shape
const body = world.createBody({
  type: 'dynamic',
  position: Vec2(x, y),
  linearDamping: LINEAR_DAMPING.value, // Air resistance
  allowSleep: false // Prevent sleeping (important!)
});

// Add box fixture
body.createFixture({
  shape: Box(width / 2, height / 2), // Half-extents
  density: isRoot ? 1 : 1, // Mass
  friction: 0.3,
  restitution: 0.1 // Bounciness
});
```

**Location**: `usePlanckCollision.ts` lines 260-320

### Collision Groups (Parent-Based)

```typescript
// Assign collision group based on parent
const collisionGroup = parentId ? parentCollisionGroups.get(parentId) : 0;

// In pre-solve event:
const nodeA = getNodeFromBody(bodyA);
const nodeB = getNodeFromBody(bodyB);
const areSiblings = nodeA.data.parentId === nodeB.data.parentId;

if (areSiblings) {
  // Allow collision between siblings
  // Apply minimum distance enforcement
} else {
  // Disable or reduce collision between non-siblings
  if (INTER_GROUP_COLLISION_STRENGTH.value === 0) {
    contact.setEnabled(false);
  }
}
```

**Location**: `usePlanckCollision.ts` lines 50-230

### Radial Constraints (Custom Forces)

Applied every frame in animation loop:

```typescript
function applyRadialConstraints() {
  nodeBodies.forEach((body, nodeId) => {
    const node = nodes.value.find(n => n.id === nodeId);
    const position = body.getPosition();

    // Calculate current polar coordinates
    const currentRadius = Math.sqrt(position.x ** 2 + position.y ** 2);
    const currentAngle = Math.atan2(position.y, position.x);

    // Calculate target polar coordinates
    const targetRadius = node.data.depth * SPRING_LENGTH_PARENT_CHILD.value;
    const targetAngle = getParentAngle(node); // Parent's angle from center

    // === RADIAL FORCE (Circle Attraction) ===
    const radiusError = targetRadius - currentRadius;
    if (Math.abs(radiusError) > 1) {
      const radialForceX = Math.cos(currentAngle) * radiusError * RADIAL_CONSTRAINT_STRENGTH.value;
      const radialForceY = Math.sin(currentAngle) * radiusError * RADIAL_CONSTRAINT_STRENGTH.value;
      body.applyForce(Vec2(radialForceX, radialForceY), body.getPosition());
    }

    // === ANGULAR FORCE (Point Attraction) ===
    let angleError = targetAngle - currentAngle;
    // Normalize to [-PI, PI]
    while (angleError > Math.PI) angleError -= 2 * Math.PI;
    while (angleError < -Math.PI) angleError += 2 * Math.PI;

    if (Math.abs(angleError) > 0.01) {
      // Adaptive force reduction when siblings nearby
      let multiplier = 1.0;
      const minSiblingDistance = getMinSiblingDistance(node);
      if (minSiblingDistance < MIN_NODE_DISTANCE.value * 1.5) {
        multiplier = Math.max(0.2, minSiblingDistance / (MIN_NODE_DISTANCE.value * 1.5));
      }

      const tangentialForceX = -Math.sin(currentAngle) * angleError * currentRadius * ANGULAR_CONSTRAINT_STRENGTH.value * multiplier;
      const tangentialForceY = Math.cos(currentAngle) * angleError * currentRadius * ANGULAR_CONSTRAINT_STRENGTH.value * multiplier;
      body.applyForce(Vec2(tangentialForceX, tangentialForceY), body.getPosition());
    }
  });
}
```

**Location**: `usePlanckCollision.ts` lines 520-646

### Animation Loop

```typescript
function animate() {
  if (!physicsEnabled.value) return;

  // Apply custom forces
  applyRadialConstraints();

  // Step physics simulation
  const timeStep = 1 / 60; // 60 FPS
  const velocityIterations = 8;
  const positionIterations = 3;
  planckWorld.step(timeStep * PHYSICS_TIME_STEP.value, velocityIterations, positionIterations);

  // Sync Planck bodies → Vue Flow nodes
  syncBodiesToNodes();

  // Continue animation
  physicsAnimationId.value = requestAnimationFrame(animate);
}
```

**Location**: `usePlanckCollision.ts` lines 680-730

---

## Key Learnings

### 1. **Physics Engines ≠ Layout Engines**

Physics engines (Planck.js, Matter.js, Box2D) are designed for **realistic physical simulation**, not **stable graph layouts**.

- ✅ Good for: Realistic collisions, bouncing, gravity, momentum
- ❌ Bad for: Stable layouts with competing constraints

**Why**: Physics engines solve for forces at each timestep, but don't guarantee convergence to stable equilibrium. Competing forces can oscillate indefinitely.

### 2. **Competing Forces = Oscillation**

When multiple forces pull/push in opposite directions:
- Angular force pulls siblings **together** (toward parent angle)
- Collision force pushes siblings **apart**
- Result: Constant oscillation, never stable

**Solution Needed**:
- Constraint solver that finds stable equilibrium
- Or: Separate layout calculation from physics (calculate positions, then animate to them)

### 3. **Adaptive Force Reduction Helps But Not Enough**

Reducing angular force when siblings are close helps reduce trembling, but doesn't eliminate it:
- Still have two competing forces
- Just reduced magnitude, not eliminated competition

**Better Approach**:
- Use physics only for collision detection
- Use separate algorithm for layout (force-directed, constraint-based)
- Or: Use springs instead of custom forces (springs have built-in damping)

### 4. **Damping Is Critical**

`LINEAR_DAMPING` (air resistance) is essential to prevent endless oscillation:
- Too low (< 1.0): Nodes bounce forever
- Too high (> 5.0): Nodes move too slowly
- Sweet spot: 2.0-3.0

But even with high damping, competing forces still cause trembling.

### 5. **Collision Filtering Works Well**

Parent-based collision groups work perfectly:
- Siblings collide with each other ✅
- Non-siblings can be filtered out ✅
- Inter-group collision can be toggled ✅

**Implementation**: Use pre-solve event to check parent IDs and enable/disable collision.

### 6. **Vue 3 Reactivity + Physics = Use shallowRef()**

**Critical**: Use `shallowRef()` for all Planck.js objects:
```typescript
const planckWorld = shallowRef<World | null>(null);
const nodeBodies = shallowRef<Map<string, Body>>(new Map());
```

**Why**: Vue's deep reactivity interferes with Planck.js internal properties, causing errors and performance issues.

---

## Recommendations for Matter.js Implementation

### Configuration 1: Radial Constraints (Same as Planck.js)

**Pros**:
- Matter.js has better damping options
- `Matter.Sleeping` might help nodes settle
- `Matter.Plugin` system for custom behavior

**Cons**:
- Will likely have same trembling problem (competing forces)
- Physics engines not designed for stable layouts

**Recommendation**: ⚠️ **Try but expect similar issues**

### Configuration 2: Springs + Anti-Gravity (NEW APPROACH) ⭐

**Concept**:
- Use Matter.js **Constraint** (spring) between parent-child
- Apply **anti-gravity** force to prevent collapse to center
- Let springs naturally space siblings

**Pros**:
- Springs have built-in damping (no competing forces!)
- Anti-gravity prevents collapse
- Might be more stable than custom forces

**Cons**:
- Harder to control exact circle radius
- Siblings might not spread evenly around parent

**Recommendation**: ✅ **Try this first!** More likely to be stable.

**Implementation Sketch**:
```typescript
// Create spring between parent and child
Matter.Constraint.create({
  bodyA: parentBody,
  bodyB: childBody,
  stiffness: 0.01, // Spring stiffness
  damping: 0.1,    // Spring damping
  length: 100      // Rest length (radius)
});

// Apply anti-gravity in beforeUpdate event
Matter.Events.on(engine, 'beforeUpdate', () => {
  bodies.forEach(body => {
    const distance = Math.sqrt(body.position.x ** 2 + body.position.y ** 2);
    if (distance > 10) {
      const force = 0.001 * body.mass; // Anti-gravity strength
      const angle = Math.atan2(body.position.y, body.position.x);
      Matter.Body.applyForce(body, body.position, {
        x: Math.cos(angle) * force,
        y: Math.sin(angle) * force
      });
    }
  });
});
```

---

## Matter.js Advantages Over Planck.js

1. **Better Documentation**: Matter.js has excellent docs and examples
2. **More Plugins**: Built-in plugins for common behaviors
3. **Better Sleeping**: Nodes can "sleep" when stable (might help with trembling)
4. **Easier API**: Simpler than Planck.js (which is Box2D port)
5. **Constraint System**: More flexible than Planck.js joints
6. **Active Development**: More actively maintained
7. **Collision Filtering**: Similar to Planck.js, using `collisionFilter.category` and `collisionFilter.mask`

---

## Files to Reference

### Planck.js Implementation (Current)
- `mindmap-writer/vueflow/vueflow-test/src/composables/usePlanckCollision.ts` - Main physics composable
- `mindmap-writer/vueflow/vueflow-test/src/pages/VueFlowTest.vue` - UI and integration (lines 1295-1320, 2780-2850)

### Key Functions
- `initPlanckWorld()` - World setup with collision filtering (lines 230-246)
- `createPlanckBody()` - Body creation (lines 260-320)
- `applyRadialConstraints()` - Custom forces (lines 520-646)
- `animate()` - Animation loop (lines 680-730)
- Pre-solve collision filtering (lines 140-230)

---

## Next Steps for Matter.js

### Phase 1: Basic Setup
1. Create `useMatterPhysics.ts` composable
2. Initialize Matter.js engine with gravity disabled
3. Create bodies for nodes (rectangles)
4. Implement collision filtering (same as Planck.js)

### Phase 2: Configuration 2 (Springs + Anti-Gravity) - TRY FIRST ⭐
1. Create constraints (springs) between parent-child
2. Apply anti-gravity force in `beforeUpdate` event
3. Let collision naturally space siblings
4. Test stability (should be better than radial constraints!)

### Phase 3: Configuration 1 (Radial Constraints) - IF NEEDED
1. Apply radial force (circle attraction)
2. Apply angular force (point attraction)
3. Test stability (likely same trembling issue)

### Phase 4: Minimum Distance
1. Use collision filtering to enforce minimum distance
2. Or: Apply repulsive force when too close
3. Test with slider

---

## Conclusion

**Planck.js radial constraints approach failed** due to fundamental physics simulation limitations:
- Competing forces cause constant oscillation
- No stable equilibrium without advanced constraint solving
- Physics engines not designed for stable graph layouts

**Matter.js might work better** with springs + anti-gravity approach:
- Springs have built-in damping (no competing forces)
- More likely to reach stable equilibrium
- Worth trying before giving up on physics-based layout

**Alternative**: Consider non-physics layout algorithms:
- Force-directed layout (D3-force) with manual stabilization
- Constraint-based layout (calculate positions, then animate)
- Hierarchical layout algorithms (Sugiyama, Reingold-Tilford)

---

## Additional Resources

### Matter.js Documentation
- Main site: https://brm.io/matter-js/
- Docs: https://brm.io/matter-js/docs/
- Examples: https://brm.io/matter-js/demo/

### Collision Filtering in Matter.js
```typescript
// Example collision filtering
const body = Matter.Bodies.rectangle(x, y, width, height, {
  collisionFilter: {
    category: 0x0001,  // This body's category
    mask: 0x0002,      // Categories this body collides with
    group: 0           // Collision group (negative = never collide)
  }
});
```

### Constraint (Spring) in Matter.js
```typescript
// Example spring constraint
const constraint = Matter.Constraint.create({
  bodyA: parentBody,
  bodyB: childBody,
  pointA: { x: 0, y: 0 },  // Attachment point on bodyA (relative to center)
  pointB: { x: 0, y: 0 },  // Attachment point on bodyB (relative to center)
  stiffness: 0.01,         // Spring stiffness (0-1, lower = softer)
  damping: 0.1,            // Damping (0-1, higher = more damping)
  length: 100              // Rest length (distance when no force)
});
Matter.World.add(engine.world, constraint);
```

### Custom Forces in Matter.js
```typescript
// Apply forces in beforeUpdate event
Matter.Events.on(engine, 'beforeUpdate', () => {
  bodies.forEach(body => {
    // Apply force at body's position
    Matter.Body.applyForce(body, body.position, {
      x: forceX,
      y: forceY
    });
  });
});
```

---

**End of Document**
