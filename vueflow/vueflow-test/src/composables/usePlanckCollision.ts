import { ref, type Ref } from 'vue';
import * as planck from 'planck';
import { World, Vec2, Box } from 'planck';
import type { Body, Joint } from 'planck';
import type { Node, Edge } from '@vue-flow/core';

// ============================================================================
// Planck.js Physics Engine for Collision Avoidance
// ============================================================================
//
// ARCHITECTURE:
// - Planck.js (Box2D port) is used for collision detection and resolution
// - Can be toggled ON/OFF via planckEnabled ref
// - When ON: Real-time collision detection during drag
// - When OFF: Manual "RESOLVE OVERLAPS" button available
//
// KEY FEATURES:
// - Proper rounded corner collision detection (using Box2D's polygon shapes)
// - More accurate physics simulation than Matter.js
// - Better performance for complex collision scenarios
//
// ============================================================================

// Default node dimensions - ONLY used as fallback when DOM is not yet rendered
export const DEFAULT_NODE_WIDTH = 80;
export const DEFAULT_NODE_HEIGHT = 40;

// Debug logging toggle
const PLANCK_DEBUG_LOGGING = false; // Disabled to prevent log spam during physics mode

export function usePlanckCollision(
  nodes: Ref<Node[]>,
  planckEnabled: Ref<boolean>,
  cornerRadius: Ref<number>
) {
  // Planck.js world (Box2D physics world)
  let planckWorld: World | null = null;

  // Map to track Planck.js bodies for each node
  const nodeBodies = new Map<string, Body>();

  // ============================================================================
  // COLLISION FILTERING - Parent-based Groups
  // ============================================================================

  // Map to store collision group for each parent (parentId -> groupIndex)
  // Root nodes (parentId = null) get group 0
  // Each unique parentId gets its own group index
  const parentCollisionGroups = new Map<string, number>();
  let nextCollisionGroup = 1; // Start from 1 (0 is reserved for root nodes)

  // Get or create collision group for a node based on its parent
  function getCollisionGroup(node: Node): number {
    const parentId = node.data.parentId;

    // Root nodes (no parent) all share group 0
    if (!parentId) {
      return 0;
    }

    // Check if we already assigned a group for this parent
    if (parentCollisionGroups.has(parentId)) {
      return parentCollisionGroups.get(parentId)!;
    }

    // Assign new group for this parent's children
    const groupIndex = nextCollisionGroup++;
    parentCollisionGroups.set(parentId, groupIndex);
    console.log(`[Planck.js Collision] Assigned group ${groupIndex} to children of parent ${parentId}`);
    return groupIndex;
  }

  // ============================================================================
  // PHYSICS MODE - Springs and Anti-Gravity
  // ============================================================================

  // Physics mode state
  const physicsEnabled = ref(false);
  const physicsAnimationId = ref<number | null>(null);

  // Center anchor body for root node springs
  let centerAnchor: Body | null = null;

  // Map to track springs (joints) for parent-child relationships
  const physicsSprings = new Map<string, Joint>(); // Planck.js Joint objects

  // Physics parameters (configurable)
  const RADIAL_CONSTRAINT_STRENGTH = ref(1000); // Circle attraction - pulls nodes toward their target circle radius
  const ANGULAR_CONSTRAINT_STRENGTH = ref(1000); // Point attraction - pulls nodes toward parent's angle (degree)
  const SIBLING_COLLISION_STRENGTH = ref(1.0); // Collision strength between siblings (same parent)
  const INTER_GROUP_COLLISION_STRENGTH = ref(0.0); // Collision strength between different groups (different parents)
  const MIN_NODE_DISTANCE = ref(10); // Minimum distance between node edges (0-100px)
  const SPRING_STIFFNESS = ref(1); // Frequency in Hz (lower = more flexible)
  const SPRING_LENGTH_PARENT_CHILD = ref(100); // Spring rest length in pixels
  const SPRING_LENGTH_ROOT = ref(100); // Root spring rest length in pixels
  const SPRING_DAMPING = ref(0.3); // Damping ratio (0-1, higher = less oscillation)
  const LINEAR_DAMPING = ref(2.0); // Air resistance (increased to 2.0 to stop oscillation/pendulum effect faster)
  const PHYSICS_TIME_STEP = ref(30.0); // Time step multiplier (10-50, higher = faster simulation)
  const VELOCITY_THRESHOLD = ref(0.5); // Velocity below which bodies sleep (0.1-5.0)
  const PARENT_DENSITY_MULTIPLIER = ref(10); // How much heavier parents are than children (1-100)

  // Track when node order changes (to disable inter-group collision temporarily)
  const interGroupCollisionDisabled = ref(false);
  let reEnableCollisionTimeout: ReturnType<typeof setTimeout> | null = null;

  // Get actual node dimensions from DOM
  function getNodeDimensions(nodeId: string): { width: number, height: number } {
    const vueFlowNode = document.querySelector(`[data-id="${nodeId}"]`);
    if (vueFlowNode) {
      const customNode = vueFlowNode.querySelector('.custom-node');
      if (customNode) {
        const rect = customNode.getBoundingClientRect();
        if (PLANCK_DEBUG_LOGGING) {
          console.log(`[Planck.js] getNodeDimensions for node ${nodeId}:`, rect.width, 'x', rect.height);
        }
        return { width: rect.width, height: rect.height };
      }
    }
    return { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT };
  }

  // Initialize Planck.js physics world
  function initPlanckWorld() {
    // Create world with no gravity (we want horizontal/vertical movement only)
    planckWorld = new World({
      gravity: Vec2(0, 0)
    });

    // Add pre-solve listener to control collision strength based on groups
    let preSolveCallCount = 0;
    planckWorld.on('pre-solve', (contact) => {
      preSolveCallCount++;

      const fixtureA = contact.getFixtureA();
      const fixtureB = contact.getFixtureB();
      const bodyA = fixtureA.getBody();
      const bodyB = fixtureB.getBody();
      const nodeIdA = bodyA.getUserData() as string;
      const nodeIdB = bodyB.getUserData() as string;

      const nodeA = nodes.value.find(n => n.id === nodeIdA);
      const nodeB = nodes.value.find(n => n.id === nodeIdB);

      if (!nodeA || !nodeB) {
        contact.setEnabled(false);
        return;
      }

      const parentA = nodeA.data.parentId;
      const parentB = nodeB.data.parentId;

      // Check if they are siblings (same parent)
      const areSiblings = parentA && parentB && parentA === parentB;

      // Log first few collisions for debugging
      if (preSolveCallCount <= 20) {
        console.log(`[Planck.js PreSolve #${preSolveCallCount}] ${nodeIdA} <-> ${nodeIdB}, siblings=${areSiblings}, parentA=${parentA || 'ROOT'}, parentB=${parentB || 'ROOT'}`);
      }

      if (areSiblings) {
        // Siblings - use sibling collision strength
        if (SIBLING_COLLISION_STRENGTH.value <= 0) {
          contact.setEnabled(false); // Disable collision
          if (preSolveCallCount <= 20) {
            console.log(`[Planck.js MinDist] Sibling collision DISABLED (strength=0): ${nodeIdA} <-> ${nodeIdB}`);
          }
        } else {
          contact.setEnabled(true);
          // Adjust friction and restitution based on strength
          const strengthMultiplier = SIBLING_COLLISION_STRENGTH.value / 10;
          contact.setFriction(0.5 * strengthMultiplier);
          contact.setRestitution(0.3 * Math.min(1.0, strengthMultiplier));

          // Apply minimum distance constraint for siblings
          if (MIN_NODE_DISTANCE.value > 0) {
            // Get body positions
            const posA = bodyA.getPosition();
            const posB = bodyB.getPosition();

            // Calculate center-to-center distance
            const dx = posB.x - posA.x;
            const dy = posB.y - posA.y;
            const centerDistance = Math.sqrt(dx * dx + dy * dy);

            // Get node dimensions from DOM
            const nodeADimensions = getNodeDimensions(nodeIdA);
            const nodeBDimensions = getNodeDimensions(nodeIdB);

            // Calculate approximate radius (use average of width/height)
            const radiusA = (nodeADimensions.width + nodeADimensions.height) / 4;
            const radiusB = (nodeBDimensions.width + nodeBDimensions.height) / 4;

            // Calculate edge-to-edge distance
            const edgeDistance = centerDistance - radiusA - radiusB;

            if (preSolveCallCount <= 20) {
              console.log(`[Planck.js MinDist] Siblings ${nodeIdA} <-> ${nodeIdB}: centerDist=${centerDistance.toFixed(1)}px, radiusA=${radiusA.toFixed(1)}px, radiusB=${radiusB.toFixed(1)}px, edgeDist=${edgeDistance.toFixed(1)}px, minDist=${MIN_NODE_DISTANCE.value}px`);
            }

            // If too close, apply repulsive force to push them apart
            if (edgeDistance < MIN_NODE_DISTANCE.value) {
              const distanceRatio = Math.max(0.01, edgeDistance / MIN_NODE_DISTANCE.value);

              // Calculate repulsive force magnitude (stronger when closer)
              const forceMagnitude = (1 - distanceRatio) * SIBLING_COLLISION_STRENGTH.value * 100;

              // Direction from A to B (push B away from A)
              const dirX = dx / centerDistance;
              const dirY = dy / centerDistance;

              // Apply repulsive force to both bodies (equal and opposite)
              bodyA.applyForce(Vec2(-dirX * forceMagnitude, -dirY * forceMagnitude), bodyA.getPosition());
              bodyB.applyForce(Vec2(dirX * forceMagnitude, dirY * forceMagnitude), bodyB.getPosition());

              if (preSolveCallCount <= 20) {
                console.log(`[Planck.js MinDist] TOO CLOSE! Applying repulsive force: magnitude=${forceMagnitude.toFixed(1)}, distanceRatio=${distanceRatio.toFixed(2)}`);
              }

              // Also increase collision response
              contact.setRestitution(0.8);
              contact.setFriction(0.3);
            }
          }
        }
      } else {
        // Different groups - check if inter-group collision is temporarily disabled
        if (interGroupCollisionDisabled.value) {
          // Node order changed - disable inter-group collision temporarily
          contact.setEnabled(false);
        } else if (INTER_GROUP_COLLISION_STRENGTH.value <= 0) {
          contact.setEnabled(false); // Disable collision (pass through)
        } else {
          contact.setEnabled(true);
          // Adjust friction and restitution based on strength
          contact.setFriction(0.3 * INTER_GROUP_COLLISION_STRENGTH.value);
          contact.setRestitution(0.5 * Math.min(1.0, INTER_GROUP_COLLISION_STRENGTH.value / 10));
        }
      }
    });

    // Create bodies for all existing nodes
    nodes.value.forEach(node => {
      createPlanckBody(node);
    });

    console.log('[Planck.js] World initialized with collision filtering');
  }

  // Create a Planck.js body for a node
  function createPlanckBody(node: Node) {
    if (!planckWorld) {
      initPlanckWorld();
      if (!planckWorld) return;
    }

    // Get actual dimensions from DOM
    const dimensions = getNodeDimensions(node.id);

    // Convert from VueFlow top-left to Planck.js center position
    const centerX = node.position.x + dimensions.width / 2;
    const centerY = node.position.y + dimensions.height / 2;

    if (PLANCK_DEBUG_LOGGING) {
      console.log(`[Planck.js] createPlanckBody for node ${node.id}:`);
      console.log(`[Planck.js]   Position: (${centerX}, ${centerY})`);
      console.log(`[Planck.js]   Dimensions: ${dimensions.width} x ${dimensions.height}`);
      console.log(`[Planck.js]   Corner radius: ${cornerRadius.value}px`);
    }

    // Check if this node has children (is a parent)
    const hasChildren = nodes.value.some(n => n.data.parentId === node.id);

    // Parent nodes get MUCH more mass (higher density) so children don't pull them around
    // Mass = density × area, so higher multiplier = heavier parents
    const density = hasChildren ? PARENT_DENSITY_MULTIPLIER.value : 1.0;

    // Get collision group for this node (based on parent)
    // Siblings (same parent) will have the same group and WILL collide
    // Non-siblings (different parents) will have different groups and WON'T collide
    const collisionGroup = getCollisionGroup(node);

    // Create dynamic body at the node's center position
    const body = planckWorld.createBody({
      type: 'dynamic',
      position: Vec2(centerX, centerY),
      linearDamping: LINEAR_DAMPING.value,  // Air resistance for smooth deceleration
      angularDamping: 0.5,
      fixedRotation: true,  // Prevent rotation
      allowSleep: false,  // DISABLE sleeping so collision detection always works
      userData: node.id
    });

    // Create shape based on corner radius
    if (cornerRadius.value > 0) {
      // Create rounded rectangle using Box2D's polygon shape
      // For now, use a simple box - we'll add proper rounded corners next
      const halfWidth = dimensions.width / 2;
      const halfHeight = dimensions.height / 2;

      body.createFixture({
        shape: Box(halfWidth, halfHeight),
        density: density,  // Use calculated density (parent nodes have more mass)
        friction: 0.3,
        restitution: 0.5
        // Collision filtering handled in pre-solve listener
      });

      const parentInfo = node.data.parentId ? `parent: ${node.data.parentId}` : 'ROOT';
      console.log(`[Planck.js] Created box body for node ${node.id} (${parentInfo}) with density ${density}, collision group ${collisionGroup}`);
    } else {
      // Simple rectangle
      const halfWidth = dimensions.width / 2;
      const halfHeight = dimensions.height / 2;

      body.createFixture({
        shape: Box(halfWidth, halfHeight),
        density: density,  // Use calculated density (parent nodes have more mass)
        friction: 0.3,
        restitution: 0.5
        // Collision filtering handled in pre-solve listener
      });

      const parentInfo = node.data.parentId ? `parent: ${node.data.parentId}` : 'ROOT';
      console.log(`[Planck.js] Created box body for node ${node.id} (${parentInfo}) with density ${density}, collision group ${collisionGroup}`);
    }

    // Store reference
    nodeBodies.set(node.id, body);
  }

  // Temporarily disable inter-group collision when node order changes
  function disableInterGroupCollisionTemporarily(durationMs: number = 3000) {
    interGroupCollisionDisabled.value = true;
    console.log(`[Planck.js] Inter-group collision DISABLED for ${durationMs}ms (node order changed)`);

    // Clear existing timeout if any
    if (reEnableCollisionTimeout) {
      clearTimeout(reEnableCollisionTimeout);
    }

    // Re-enable after duration
    reEnableCollisionTimeout = setTimeout(() => {
      interGroupCollisionDisabled.value = false;
      console.log('[Planck.js] Inter-group collision RE-ENABLED');
    }, durationMs);
  }

  // Update body position when node is dragged
  function updatePlanckBodyPosition(nodeId: string, x: number, y: number) {
    const body = nodeBodies.get(nodeId);
    if (!body || !planckWorld) return;

    // Get dimensions to calculate center position
    const node = nodes.value.find(n => n.id === nodeId);
    if (!node) return;

    const dimensions = getNodeDimensions(nodeId);
    const centerX = x + dimensions.width / 2;
    const centerY = y + dimensions.height / 2;

    // Update body position
    body.setPosition(Vec2(centerX, centerY));
    body.setAwake(true);

    if (PLANCK_DEBUG_LOGGING) {
      console.log(`[Planck.js] Updated body position for node ${nodeId} to (${centerX}, ${centerY})`);
    }
  }

  // Update body dimensions when node size changes (e.g., title/content edited)
  function updatePlanckBodyDimensions(nodeId: string) {
    if (!planckEnabled.value || !planckWorld) return;

    const body = nodeBodies.get(nodeId);
    if (!body) return;

    const node = nodes.value.find(n => n.id === nodeId);
    if (!node) return;

    // Get current body position (center)
    const currentPosition = body.getPosition();

    // Get new dimensions from DOM
    const dimensions = getNodeDimensions(nodeId);

    // Remove old body
    planckWorld.destroyBody(body);
    nodeBodies.delete(nodeId);

    // Create new body with updated dimensions at the same position
    const newBody = planckWorld.createBody({
      type: 'dynamic',
      position: currentPosition, // Keep same center position
      linearDamping: 0.5,
      angularDamping: 0.5,
      fixedRotation: true,
      userData: nodeId
    });

    // Create fixture with new dimensions
    // TODO: Add rounded corners support using polygon shape
    newBody.createFixture({
      shape: Box(dimensions.width / 2, dimensions.height / 2),
      density: 1.0,
      friction: 0.3,
      restitution: 0.1
    });

    // Store the new body
    nodeBodies.set(nodeId, newBody);

    if (PLANCK_DEBUG_LOGGING) {
      console.log(`[Planck.js] Updated body dimensions for node ${nodeId} to ${dimensions.width}x${dimensions.height}`);
    }
  }

  // Run physics simulation to resolve overlaps
  function runPlanckSimulation(steps: number = 10) {
    if (!planckWorld) return;

    console.log(`[Planck.js] Running physics simulation for ${steps} steps...`);

    // Run the simulation for multiple steps
    for (let i = 0; i < steps; i++) {
      planckWorld.step(1 / 60); // 60 FPS timestep
    }

    // Update VueFlow node positions based on Planck.js body positions
    let movedCount = 0;
    nodeBodies.forEach((body, nodeId) => {
      const node = nodes.value.find(n => n.id === nodeId);
      if (!node) return;

      const position = body.getPosition();
      const dimensions = getNodeDimensions(nodeId);

      // Convert from Planck.js center to VueFlow top-left
      const newX = position.x - dimensions.width / 2;
      const newY = position.y - dimensions.height / 2;

      // Check if position changed significantly
      const dx = Math.abs(newX - node.position.x);
      const dy = Math.abs(newY - node.position.y);

      if (dx > 0.1 || dy > 0.1) {
        node.position.x = newX;
        node.position.y = newY;
        movedCount++;

        if (PLANCK_DEBUG_LOGGING) {
          console.log(`[Planck.js] Moved node ${nodeId} to (${newX}, ${newY})`);
        }
      }
    });

    console.log(`[Planck.js] ✅ Simulation complete - ${movedCount} node(s) moved`);
  }

  // Push nodes away from a position (used when creating new nodes or dragging)
  function pushNodesAwayFromPosition(
    targetX: number,
    targetY: number,
    excludeNodeId?: string,
    targetWidth?: number,
    targetHeight?: number
  ) {
    if (!planckEnabled.value || !planckWorld) return;

    // Create a temporary static body at the target position
    const tempBody = planckWorld.createBody({
      type: 'static',
      position: Vec2(
        targetX + (targetWidth || DEFAULT_NODE_WIDTH) / 2,
        targetY + (targetHeight || DEFAULT_NODE_HEIGHT) / 2
      )
    });

    tempBody.createFixture({
      shape: Box(
        (targetWidth || DEFAULT_NODE_WIDTH) / 2,
        (targetHeight || DEFAULT_NODE_HEIGHT) / 2
      ),
      density: 1.0
    });

    // Run simulation to push nodes away
    runPlanckSimulation(20);

    // Remove temporary body
    planckWorld.destroyBody(tempBody);
  }

  // ============================================================================
  // PHYSICS MODE FUNCTIONS
  // ============================================================================

  // Helper: Find the root ancestor of a node (traverse up the parent chain)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function findRootAncestor(nodeId: string): string {
    let currentNode = nodes.value.find(n => n.id === nodeId);

    // Traverse up the parent chain until we find a root node (no parent)
    while (currentNode?.data?.parentId) {
      currentNode = nodes.value.find(n => n.id === currentNode!.data.parentId);
    }

    return currentNode?.id || nodeId;
  }

  // Helper: Calculate depth of a node (how many generations from root)
  function getNodeDepth(nodeId: string): number {
    let depth = 0;
    let currentNode = nodes.value.find(n => n.id === nodeId);

    while (currentNode?.data?.parentId) {
      depth++;
      currentNode = nodes.value.find(n => n.id === currentNode!.data.parentId);
    }

    return depth;
  }

  // Debug counter for logging
  let debugFrameCounter = 0;

  // Apply radial constraints - pull each node toward its target (angle, radius) position
  // - Target angle: inherited from parent's angle (or own angle for root nodes)
  // - Target radius: depth × springLength (depth 0 = 1x, depth 1 = 2x, etc.)
  // - Siblings collide with each other (spread around target angle)
  // - Non-siblings don't collide (can pass through each other)
  function applyRadialConstraints() {
    if (!planckWorld) return;

    // First pass: Calculate target angle for each node
    const nodeTargets = new Map<string, { angle: number, radius: number }>();

    nodeBodies.forEach((body, nodeId) => {
      const node = nodes.value.find(n => n.id === nodeId);
      if (!node) return;

      const position = body.getPosition();
      const depth = getNodeDepth(nodeId);
      const targetRadius = SPRING_LENGTH_PARENT_CHILD.value * (depth + 1);

      let targetAngle: number;

      if (!node.data.parentId) {
        // Root node - use its own current angle
        targetAngle = Math.atan2(position.y, position.x);
      } else {
        // Child node - inherit parent's angle
        const parent = nodes.value.find(n => n.id === node.data.parentId);
        if (!parent) return;

        const parentBody = nodeBodies.get(parent.id);
        if (!parentBody) return;

        const parentPos = parentBody.getPosition();
        targetAngle = Math.atan2(parentPos.y, parentPos.x);
      }

      nodeTargets.set(nodeId, { angle: targetAngle, radius: targetRadius });
    });

    // Second pass: Apply forces toward target position
    nodeBodies.forEach((body, nodeId) => {
      const target = nodeTargets.get(nodeId);
      if (!target) return;

      // Get current position
      const position = body.getPosition();
      const currentX = position.x;
      const currentY = position.y;

      // Calculate current angle and radius
      const currentAngle = Math.atan2(currentY, currentX);
      const currentRadius = Math.sqrt(currentX * currentX + currentY * currentY);

      // === RADIAL FORCE (Circle Attraction) ===
      // Pull node toward target radius (lock to specific circle)
      const radiusError = target.radius - currentRadius;
      if (Math.abs(radiusError) > 1) {
        // Force along the radial direction (toward or away from center)
        const radialForceX = Math.cos(currentAngle) * radiusError * RADIAL_CONSTRAINT_STRENGTH.value;
        const radialForceY = Math.sin(currentAngle) * radiusError * RADIAL_CONSTRAINT_STRENGTH.value;
        body.applyForce(Vec2(radialForceX, radialForceY), body.getPosition());
      }

      // === ANGULAR FORCE (Point Attraction) ===
      // Pull node toward target angle (parent's degree)
      // BUT: Reduce force when siblings are VERY close to prevent trembling
      let angleError = target.angle - currentAngle;
      // Normalize angle error to [-PI, PI]
      while (angleError > Math.PI) angleError -= 2 * Math.PI;
      while (angleError < -Math.PI) angleError += 2 * Math.PI;

      if (Math.abs(angleError) > 0.01) {
        // Check if there are siblings VERY nearby - if yes, reduce angular force slightly
        let angularForceMultiplier = 1.0;

        const node = nodes.value.find(n => n.id === nodeId);
        if (node?.data.parentId && SIBLING_COLLISION_STRENGTH.value > 0 && MIN_NODE_DISTANCE.value > 0) {
          // Find siblings (same parent)
          const siblings = nodes.value.filter(n =>
            n.id !== nodeId &&
            n.data.parentId === node.data.parentId
          );

          // Check distance to nearest sibling
          let minSiblingDistance = Infinity;
          for (const sibling of siblings) {
            const siblingBody = nodeBodies.get(sibling.id);
            if (!siblingBody) continue;

            const siblingPos = siblingBody.getPosition();
            const dx = siblingPos.x - currentX;
            const dy = siblingPos.y - currentY;
            const centerDistance = Math.sqrt(dx * dx + dy * dy);

            // Get node dimensions for edge-to-edge distance
            const nodeDimensions = getNodeDimensions(nodeId);
            const siblingDimensions = getNodeDimensions(sibling.id);
            const radiusA = (nodeDimensions.width + nodeDimensions.height) / 4;
            const radiusB = (siblingDimensions.width + siblingDimensions.height) / 4;
            const edgeDistance = centerDistance - radiusA - radiusB;

            if (edgeDistance < minSiblingDistance) {
              minSiblingDistance = edgeDistance;
            }
          }

          // Only reduce angular force when siblings are VERY close (within 1.5x MIN_NODE_DISTANCE)
          // This allows children to follow parent even when spread out
          if (minSiblingDistance < MIN_NODE_DISTANCE.value * 1.5) {
            const threshold = MIN_NODE_DISTANCE.value * 1.5;
            // Reduce to minimum 20% (not 0%) so children can still follow parent
            angularForceMultiplier = Math.max(0.2, minSiblingDistance / threshold);
          }
        }

        // Apply angular force with multiplier (slightly reduced when siblings are VERY close)
        const tangentialForceX = -Math.sin(currentAngle) * angleError * currentRadius * ANGULAR_CONSTRAINT_STRENGTH.value * angularForceMultiplier;
        const tangentialForceY = Math.cos(currentAngle) * angleError * currentRadius * ANGULAR_CONSTRAINT_STRENGTH.value * angularForceMultiplier;
        body.applyForce(Vec2(tangentialForceX, tangentialForceY), body.getPosition());
      }
    });

    // Debug logging every 600 frames (once every 10 seconds at 60 FPS) - reduced to minimize spam
    debugFrameCounter++;
    if (debugFrameCounter >= 600) {
      debugFrameCounter = 0;
      console.log('[Radial Constraints Debug] Node targets and positions (sample of first 5 nodes):');
      let count = 0;
      nodeTargets.forEach((target, nodeId) => {
        if (count >= 5) return; // Only log first 5 nodes
        count++;

        const body = nodeBodies.get(nodeId);
        if (!body) return;

        const pos = body.getPosition();
        const currentAngle = Math.atan2(pos.y, pos.x);
        const currentRadius = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
        const targetAngleDeg = ((target.angle * 180 / Math.PI) + 360) % 360;
        const currentAngleDeg = ((currentAngle * 180 / Math.PI) + 360) % 360;

        const node = nodes.value.find(n => n.id === nodeId);
        console.log(`  Node ${nodeId} (parent: ${node?.data?.parentId || 'ROOT'}): target=${targetAngleDeg.toFixed(1)}°@${target.radius.toFixed(0)}px, current=${currentAngleDeg.toFixed(1)}°@${currentRadius.toFixed(0)}px`);
      });
    }
  }

  // Position child nodes along the radial line of their root ancestor
  function positionNodesRadially(edges: Edge[]) {
    console.log('[Planck.js Physics] Positioning nodes radially along root directions...');

    // Build parent-child map
    const childrenMap = new Map<string, string[]>();
    edges.forEach(edge => {
      if (!childrenMap.has(edge.source)) {
        childrenMap.set(edge.source, []);
      }
      childrenMap.get(edge.source)!.push(edge.target);
    });

    // For each root node, position its descendants along the radial line
    const rootNodes = nodes.value.filter(node => !node.data.parentId);

    rootNodes.forEach(rootNode => {
      const rootBody = nodeBodies.get(rootNode.id);
      if (!rootBody) return;

      const rootPos = rootBody.getPosition();
      const dx = rootPos.x - 0;
      const dy = rootPos.y - 0;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 1) return;

      // Normalized direction vector from center through root
      const dirX = dx / distance;
      const dirY = dy / distance;

      console.log(`[Planck.js Physics] Root ${rootNode.id} at angle ${Math.atan2(dx, -dy) * 180 / Math.PI}°`);

      // Recursively position children along this radial line
      const positionChildren = (parentId: string, currentDistance: number) => {
        const children = childrenMap.get(parentId) || [];

        children.forEach(childId => {
          const childBody = nodeBodies.get(childId);
          if (!childBody) return;

          // Position child further out along the radial line
          const childDistance = currentDistance + SPRING_LENGTH_PARENT_CHILD.value;
          const newX = dirX * childDistance;
          const newY = dirY * childDistance;

          childBody.setPosition(Vec2(newX, newY));
          childBody.setAwake(true);

          console.log(`  Positioned child ${childId} at distance ${childDistance} along radial line`);

          // Recursively position grandchildren
          positionChildren(childId, childDistance);
        });
      };

      positionChildren(rootNode.id, distance);
    });
  }

  // Create springs (distance joints) for parent-child relationships
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function createPhysicsSprings(edges: Edge[], skipRadialPositioning = false) {
    if (!planckWorld) return;

    console.log('[Planck.js Physics] Creating springs for edges:', edges.length);

    // Position nodes radially only on initial setup (not when adding new nodes)
    if (!skipRadialPositioning) {
      positionNodesRadially(edges);
    }

    // Create center anchor for root nodes (static body at 0,0)
    if (!centerAnchor) {
      centerAnchor = planckWorld.createBody({
        type: 'static',
        position: Vec2(0, 0)
      });
      console.log('[Planck.js Physics] Created center anchor at (0,0)');
    }

    // Create springs for root nodes (nodes without parents)
    const rootNodes = nodes.value.filter(node => {
      return !edges.some(edge => edge.target === node.id);
    });

    rootNodes.forEach(node => {
      const body = nodeBodies.get(node.id);
      if (!body || !centerAnchor) return;

      const springKey = `root-${node.id}`;
      if (physicsSprings.has(springKey)) return; // Already exists

      // Create distance joint from center to root node
      // DistanceJoint(def, bodyA, bodyB, anchorA, anchorB)
      const jointDef = {
        frequencyHz: SPRING_STIFFNESS.value, // Frequency in Hz (higher = stiffer)
        dampingRatio: SPRING_DAMPING.value,
        length: SPRING_LENGTH_PARENT_CHILD.value // Use same length as parent-child
      };
      console.log(`[Planck.js Physics] Creating root spring with params:`, jointDef);

      const joint = planckWorld!.createJoint(new planck.DistanceJoint(
        jointDef,
        centerAnchor,
        body,
        centerAnchor.getPosition(), // Anchor on center
        body.getPosition() // Anchor on node body
      ));

      if (joint) {
        physicsSprings.set(springKey, joint);
        console.log(`[Planck.js Physics] Created root spring for node ${node.id}`);
      }
    });

    // Create springs for parent-child edges ONLY (not reference edges)
    edges.forEach(edge => {
      // Skip reference edges (only create springs for hierarchy edges)
      if (edge.data?.edgeType === 'reference') {
        console.log(`[Planck.js Physics] Skipping reference edge: ${edge.source} → ${edge.target}`);
        return;
      }

      const parentBody = nodeBodies.get(edge.source);
      const childBody = nodeBodies.get(edge.target);

      if (!parentBody || !childBody) return;

      const springKey = `${edge.source}-${edge.target}`;
      if (physicsSprings.has(springKey)) return; // Already exists

      // Create distance joint from parent to child
      // DistanceJoint(def, bodyA, bodyB, anchorA, anchorB)
      const jointDef = {
        frequencyHz: SPRING_STIFFNESS.value, // Frequency in Hz (higher = stiffer)
        dampingRatio: SPRING_DAMPING.value,
        length: SPRING_LENGTH_PARENT_CHILD.value
      };
      console.log(`[Planck.js Physics] Creating parent-child spring with params:`, jointDef);

      const joint = planckWorld!.createJoint(new planck.DistanceJoint(
        jointDef,
        parentBody,
        childBody,
        parentBody.getPosition(), // Anchor on parent
        childBody.getPosition() // Anchor on child
      ));

      if (joint) {
        physicsSprings.set(springKey, joint);
        console.log(`[Planck.js Physics] Created spring: ${edge.source} → ${edge.target}`);
      }
    });

    console.log(`[Planck.js Physics] Total springs created: ${physicsSprings.size}`);
  }

  // NOTE: Springs are no longer used - we use radial constraints instead
  // Keeping this function stub for compatibility with existing code
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function updatePhysicsSprings(edges: Edge[], skipRadialPositioning = true) {
    // No-op: We're using radial constraints instead of springs
  }

  // Sync node positions from Planck.js bodies to Vue Flow nodes
  function syncNodePositions() {
    nodeBodies.forEach((body, nodeId) => {
      const node = nodes.value.find(n => n.id === nodeId);
      if (!node) return;

      const position = body.getPosition();
      const dimensions = getNodeDimensions(nodeId);

      // Convert from Planck.js center to Vue Flow top-left
      const newX = position.x - dimensions.width / 2;
      const newY = position.y - dimensions.height / 2;

      // Only update if position changed significantly (> 0.5px) to reduce reactivity overhead
      const deltaX = Math.abs(newX - node.position.x);
      const deltaY = Math.abs(newY - node.position.y);

      if (deltaX > 0.5 || deltaY > 0.5) {
        node.position.x = newX;
        node.position.y = newY;
      }
    });
  }

  // Animation loop for physics mode
  function animate() {
    if (!physicsEnabled.value || !planckWorld) {
      return;
    }

    // Apply radial constraints (pull nodes toward target angle and radius)
    applyRadialConstraints();

    // Step the physics simulation with configurable time step
    // Base time step is 1/60 seconds (60 FPS), multiplied by speed factor
    const timeStep = (1 / 60) * PHYSICS_TIME_STEP.value;
    planckWorld.step(timeStep);

    // Sync positions from physics to Vue Flow
    syncNodePositions();

    // Continue animation loop
    physicsAnimationId.value = requestAnimationFrame(animate);
  }

  // Start physics mode
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function startPhysicsMode(edges: Edge[]) {
    if (!planckWorld) {
      initPlanckWorld();
    }

    // Create bodies for all nodes if not already created
    nodes.value.forEach(node => {
      if (!nodeBodies.has(node.id)) {
        createPlanckBody(node);
      }
    });

    // NOTE: We're using radial constraints instead of springs now
    // Springs are disabled - nodes are pulled toward (angle, radius) targets
    // createPhysicsSprings(edges);

    // Start animation loop
    physicsEnabled.value = true;
    animate();

    console.log('[Planck.js Physics] Physics mode started (using radial constraints, no springs)');
  }

  // Stop physics mode
  function stopPhysicsMode() {
    physicsEnabled.value = false;

    // Stop animation loop
    if (physicsAnimationId.value !== null) {
      cancelAnimationFrame(physicsAnimationId.value);
      physicsAnimationId.value = null;
    }

    console.log('[Planck.js Physics] Physics mode stopped');
  }

  // Cleanup function
  function cleanup() {
    stopPhysicsMode();
    if (planckWorld) {
      planckWorld = null;
    }
    nodeBodies.clear();
    console.log('[Planck.js] Cleaned up');
  }

  return {
    planckWorld,
    nodeBodies,
    getNodeDimensions,
    initPlanckWorld,
    createPlanckBody,
    updatePlanckBodyPosition,
    updatePlanckBodyDimensions,
    runPlanckSimulation,
    pushNodesAwayFromPosition,
    disableInterGroupCollisionTemporarily,
    // Physics mode
    physicsEnabled,
    startPhysicsMode,
    stopPhysicsMode,
    updatePhysicsSprings,
    // Physics parameters
    RADIAL_CONSTRAINT_STRENGTH,
    ANGULAR_CONSTRAINT_STRENGTH,
    SIBLING_COLLISION_STRENGTH,
    INTER_GROUP_COLLISION_STRENGTH,
    MIN_NODE_DISTANCE,
    SPRING_STIFFNESS,
    SPRING_LENGTH_PARENT_CHILD,
    SPRING_LENGTH_ROOT,
    SPRING_DAMPING,
    LINEAR_DAMPING,
    PHYSICS_TIME_STEP,
    VELOCITY_THRESHOLD,
    PARENT_DENSITY_MULTIPLIER,
    cleanup
  };
}

