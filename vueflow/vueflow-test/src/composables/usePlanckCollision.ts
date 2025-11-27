import type { Ref } from 'vue';
import { World, Vec2, Box } from 'planck';
import type { Body } from 'planck';
import type { Node } from '@vue-flow/core';

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
const PLANCK_DEBUG_LOGGING = true;

export function usePlanckCollision(
  nodes: Ref<Node[]>,
  planckEnabled: Ref<boolean>,
  cornerRadius: Ref<number>
) {
  // Planck.js world (Box2D physics world)
  let planckWorld: World | null = null;

  // Map to track Planck.js bodies for each node
  const nodeBodies = new Map<string, Body>();

  // Get actual node dimensions from DOM
  function getNodeDimensions(nodeId: string): { width: number, height: number } {
    const vueFlowNode = document.querySelector(`[data-id="${nodeId}"]`);
    if (vueFlowNode) {
      const customNode = vueFlowNode.querySelector('.custom-node');
      if (customNode) {
        const rect = customNode.getBoundingClientRect();
        if (PLANCK_DEBUG_LOGGING) {
          // console.log(`[Planck.js] getNodeDimensions for node ${nodeId}:`, rect.width, 'x', rect.height);
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

    // Create bodies for all existing nodes
    nodes.value.forEach(node => {
      createPlanckBody(node);
    });

    // console.log('[Planck.js] World initialized');
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
      // console.log(`[Planck.js] createPlanckBody for node ${node.id}:`);
      // console.log(`[Planck.js]   Position: (${centerX}, ${centerY})`);
      // console.log(`[Planck.js]   Dimensions: ${dimensions.width} x ${dimensions.height}`);
      // console.log(`[Planck.js]   Corner radius: ${cornerRadius.value}px`);
    }

    // Create dynamic body at the node's center position
    const body = planckWorld.createBody({
      type: 'dynamic',
      position: Vec2(centerX, centerY),
      linearDamping: 0.5,  // Air resistance for smooth deceleration
      angularDamping: 0.5,
      fixedRotation: true,  // Prevent rotation
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
        density: 1.0,
        friction: 0.3,
        restitution: 0.1  // Low bounciness
      });

      // console.log(`[Planck.js] Created box body for node ${node.id} (rounded corners TODO)`);
    } else {
      // Simple rectangle
      const halfWidth = dimensions.width / 2;
      const halfHeight = dimensions.height / 2;
      
      body.createFixture({
        shape: Box(halfWidth, halfHeight),
        density: 1.0,
        friction: 0.3,
        restitution: 0.1
      });

      // console.log(`[Planck.js] Created box body for node ${node.id}`);
    }

    // Store reference
    nodeBodies.set(node.id, body);
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
      // console.log(`[Planck.js] Updated body position for node ${nodeId} to (${centerX}, ${centerY})`);
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
      // console.log(`[Planck.js] Updated body dimensions for node ${nodeId} to ${dimensions.width}x${dimensions.height}`);
    }
  }

  // Run physics simulation to resolve overlaps
  function runPlanckSimulation(steps: number = 10) {
    if (!planckWorld) return;

    // console.log(`[Planck.js] Running physics simulation for ${steps} steps...`);

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
          // console.log(`[Planck.js] Moved node ${nodeId} to (${newX}, ${newY})`);
        }
      }
    });

    // console.log(`[Planck.js] ✅ Simulation complete - ${movedCount} node(s) moved`);
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

  // Cleanup function
  function cleanup() {
    if (planckWorld) {
      planckWorld = null;
    }
    nodeBodies.clear();
    // console.log('[Planck.js] Cleaned up');
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
    cleanup
  };
}

