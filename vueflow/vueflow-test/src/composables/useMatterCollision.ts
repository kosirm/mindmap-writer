import type { Ref } from 'vue';
import Matter from 'matter-js';
import type { Node } from '@vue-flow/core';

// ============================================================================
// Matter.js Physics Engine for Collision Avoidance
// ============================================================================
//
// ARCHITECTURE:
// - Matter.js is used for collision detection and resolution
// - Can be toggled ON/OFF via matterEnabled ref
// - When ON: Real-time collision detection during drag
// - When OFF: Manual "RESOLVE OVERLAPS" button available
// - Integrates with D3 Force: syncs bodies after D3 layout completes
//
// KEY OPTIMIZATIONS:
// 1. Always read actual dimensions from DOM using nextTick() (no hardcoded sizes)
// 2. Cascading collision detection with infinite loop prevention (Set<string>)
// 3. Multi-node drag optimization (collision disabled during drag, resolved at end)
// 4. Alt key override to temporarily disable collision
// 5. Conditional debug logging (MATTER_DEBUG_LOGGING flag)
// 6. Sync all body positions before running physics engine (prevents position reset bug)
//
// ============================================================================

// Default node dimensions - ONLY used as fallback when DOM is not yet rendered
// These should match the approximate size of a new node with default title "Node X"
export const DEFAULT_NODE_WIDTH = 80;
export const DEFAULT_NODE_HEIGHT = 40;

// Minimum spacing between nodes (in pixels)
const MIN_HORIZONTAL_GAP = 3;  // 3px horizontal spacing between nodes
const MIN_VERTICAL_GAP = 3;    // 3px vertical spacing between nodes

// Small epsilon value for floating point comparison (to handle floating point errors)
const EPSILON = 0.1;

// Debug logging toggle (set to false to reduce console noise in production)
const MATTER_DEBUG_LOGGING = false;

export function useMatterCollision(
  nodes: Ref<Node[]>,
  matterEnabled: Ref<boolean>
) {
  // Matter.js engine and world (using shallowRef to avoid Vue reactivity issues)
  // See: https://github.com/liabru/matter-js/issues/1001#issuecomment-998911435
  let matterEngine: Matter.Engine | null = null;
  let matterWorld: Matter.World | null = null;

  // Map to track Matter.js bodies for each node
  const nodeBodies = new Map<string, Matter.Body>();

  // Get actual node dimensions from DOM
  function getNodeDimensions(nodeId: string): { width: number, height: number } {
    // First try to find the VueFlow node wrapper
    const vueFlowNode = document.querySelector(`[data-id="${nodeId}"]`);
    if (vueFlowNode) {
      // Then find the actual .custom-node element inside it
      const customNode = vueFlowNode.querySelector('.custom-node');
      if (customNode) {
        const rect = customNode.getBoundingClientRect();
        if (MATTER_DEBUG_LOGGING) {
          console.log(`[Matter.js] getNodeDimensions for node ${nodeId}:`, rect.width, 'x', rect.height);
        }
        return { width: rect.width, height: rect.height };
      }
    }
    if (MATTER_DEBUG_LOGGING) {
      console.log(`[Matter.js] getNodeDimensions for node ${nodeId}: using defaults`);
    }
    return { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT };
  }

  // Initialize Matter.js physics engine
  function initMatterEngine() {
    // Create engine with no gravity (we want horizontal/vertical movement only)
    matterEngine = Matter.Engine.create({
      gravity: { x: 0, y: 0, scale: 0 }
    });

    matterWorld = matterEngine.world;

    // Create bodies for all existing nodes
    nodes.value.forEach(node => {
      createMatterBody(node);
    });

    // console.log('Matter.js engine initialized');
  }

  // Create a Matter.js body for a node
  function createMatterBody(node: Node) {
    if (!matterWorld) return;

    // Try to get actual dimensions from DOM, fallback to defaults
    const dimensions = getNodeDimensions(node.id);

    // VueFlow uses top-left positioning, but Matter.js uses center positioning
    // Convert from top-left to center
    const centerX = node.position.x + dimensions.width / 2;
    const centerY = node.position.y + dimensions.height / 2;

    if (MATTER_DEBUG_LOGGING) {
      console.log(`[Matter.js] createMatterBody for node ${node.id}:`);
      console.log(`[Matter.js]   VueFlow position (top-left): (${node.position.x}, ${node.position.y})`);
      console.log(`[Matter.js]   Dimensions from DOM: ${dimensions.width} x ${dimensions.height}`);
      console.log(`[Matter.js]   Matter.js center: (${centerX}, ${centerY})`);
    }

    // Create a rectangular body at the node's CENTER position
    const body = Matter.Bodies.rectangle(
      centerX,
      centerY,
      dimensions.width,
      dimensions.height,
      {
        isStatic: false,
        friction: 0.1,
        frictionAir: 0.3,  // Air resistance for smooth deceleration
        restitution: 0.1,  // Low bounciness
        density: 0.001,
        label: node.id
      }
    );

    // Add body to world
    Matter.World.add(matterWorld, body);

    // Store reference
    nodeBodies.set(node.id, body);

    if (MATTER_DEBUG_LOGGING) {
      // Log the actual body bounds after creation
      console.log(`[Matter.js]   Body bounds: left=${body.bounds.min.x}, right=${body.bounds.max.x}, top=${body.bounds.min.y}, bottom=${body.bounds.max.y}`);
      console.log(`[Matter.js]   Body size: ${body.bounds.max.x - body.bounds.min.x} x ${body.bounds.max.y - body.bounds.min.y}`);
    }
  }

  // Remove a Matter.js body for a node (will be used for node deletion in the future)
  function removeMatterBody(nodeId: string) {
    if (!matterWorld) return;

    const body = nodeBodies.get(nodeId);
    if (body) {
      Matter.World.remove(matterWorld, body);
      nodeBodies.delete(nodeId);
    }
  }

  // Update Matter.js body position when node is dragged
  function updateMatterBodyPosition(nodeId: string, topLeftX: number, topLeftY: number) {
    const body = nodeBodies.get(nodeId);
    if (body) {
      // VueFlow uses top-left positioning, but Matter.js uses center positioning
      // Convert from top-left to center
      const bodyBounds = body.bounds;
      const bodyWidth = bodyBounds.max.x - bodyBounds.min.x;
      const bodyHeight = bodyBounds.max.y - bodyBounds.min.y;
      const centerX = topLeftX + bodyWidth / 2;
      const centerY = topLeftY + bodyHeight / 2;

      Matter.Body.setPosition(body, { x: centerX, y: centerY });
      Matter.Body.setVelocity(body, { x: 0, y: 0 });  // Reset velocity when manually positioned
    }
  }

  // Update Matter.js body dimensions after editing (when Tiptap is closed)
  function updateMatterBodyDimensions(nodeId: string) {
    const body = nodeBodies.get(nodeId);
    if (!body || !matterWorld) return;

    if (MATTER_DEBUG_LOGGING) {
      console.log(`[Matter.js] updateMatterBodyDimensions called for node ${nodeId}`);
    }

    // Get current dimensions from body
    const oldBounds = body.bounds;
    const oldWidth = oldBounds.max.x - oldBounds.min.x;
    const oldHeight = oldBounds.max.y - oldBounds.min.y;

    // Wait for DOM to update after Tiptap is removed
    setTimeout(() => {
      // Get actual dimensions from DOM
      const dimensions = getNodeDimensions(nodeId);

      // Check if dimensions actually changed
      if (Math.abs(oldWidth - dimensions.width) < 2 && Math.abs(oldHeight - dimensions.height) < 2) {
        if (MATTER_DEBUG_LOGGING) {
          console.log(`[Matter.js] Dimensions didn't change significantly, skipping update`);
        }
        return;
      }

      // Get the VueFlow node to get its top-left position
      const node = nodes.value.find(n => n.id === nodeId);
      if (!node) return;

      // VueFlow uses top-left positioning, but Matter.js uses center positioning
      // When a node grows, VueFlow top-left stays the same, so we recalculate the center
      const newCenterX = node.position.x + dimensions.width / 2;
      const newCenterY = node.position.y + dimensions.height / 2;

      if (MATTER_DEBUG_LOGGING) {
        console.log(`[Matter.js] Node ${nodeId} updated: ${oldWidth}x${oldHeight} → ${dimensions.width}x${dimensions.height}`);
      }

      // Remove old body
      Matter.World.remove(matterWorld!, body);
      nodeBodies.delete(nodeId);

      // Create new body with updated dimensions at the NEW center position
      const newBody = Matter.Bodies.rectangle(
        newCenterX,
        newCenterY,
        dimensions.width,
        dimensions.height,
        {
          isStatic: false,
          friction: 0.1,
          frictionAir: 0.3,
          restitution: 0.1,
          density: 0.001,
          label: nodeId
        }
      );

      Matter.World.add(matterWorld!, newBody);
      nodeBodies.set(nodeId, newBody);

      // Let Matter.js naturally resolve overlaps by running the engine for a few steps
      runMatterEngineToResolveOverlaps();
    }, 100); // Increased delay to ensure DOM is fully updated
  }

  // Run Matter.js engine for a few steps to naturally resolve overlaps after resize
  function runMatterEngineToResolveOverlaps() {
    if (!matterEngine || !matterWorld) return;

    if (MATTER_DEBUG_LOGGING) {
      console.log(`[Matter.js] Running physics engine to resolve overlaps...`);
    }

    // CRITICAL: First sync all Matter.js body positions with CURRENT node positions
    // This ensures Matter.js starts from the current state, not old cached positions
    nodes.value.forEach(node => {
      updateMatterBodyPosition(node.id, node.position.x, node.position.y);
    });

    // Run the engine for 60 steps (1 second at 60fps) to let physics resolve overlaps
    for (let i = 0; i < 60; i++) {
      Matter.Engine.update(matterEngine, 1000 / 60); // 16.67ms per step
    }

    // Sync all VueFlow node positions with Matter.js body positions (after physics simulation)
    let movedCount = 0;
    nodeBodies.forEach((body, nodeId) => {
      const node = nodes.value.find(n => n.id === nodeId);
      if (node) {
        // Convert from Matter.js center to VueFlow top-left
        const bodyBounds = body.bounds;
        const bodyWidth = bodyBounds.max.x - bodyBounds.min.x;
        const bodyHeight = bodyBounds.max.y - bodyBounds.min.y;

        const oldX = node.position.x;
        const oldY = node.position.y;
        const newX = body.position.x - bodyWidth / 2;
        const newY = body.position.y - bodyHeight / 2;

        if (Math.abs(newX - oldX) > 0.1 || Math.abs(newY - oldY) > 0.1) {
          node.position.x = newX;
          node.position.y = newY;
          movedCount++;
          if (MATTER_DEBUG_LOGGING) {
            console.log(`[Matter.js]   Node ${nodeId} moved from (${oldX.toFixed(2)}, ${oldY.toFixed(2)}) to (${newX.toFixed(2)}, ${newY.toFixed(2)})`);
          }
        }
      }
    });

    if (MATTER_DEBUG_LOGGING || movedCount > 0) {
      console.log(`[Matter.js] ✅ Resolved overlaps - ${movedCount} node(s) moved`);
    }
  }

  // Push nodes away from a position (used when creating new nodes or dragging)
  // alreadyPushedNodes: Set of node IDs that have already been pushed in this chain (to prevent infinite recursion)
  function pushNodesAwayFromPosition(
    targetX: number,
    targetY: number,
    excludeNodeId?: string,
    targetWidth?: number,
    targetHeight?: number,
    alreadyPushedNodes: Set<string> = new Set()
  ) {
    // Skip if Matter.js is disabled
    if (!matterEnabled.value) {
      return;
    }

    if (!matterEngine || !matterWorld) {
      initMatterEngine();
      if (!matterEngine || !matterWorld) return;
    }

    // Add the excluded node to the already-pushed set to prevent circular pushing
    if (excludeNodeId) {
      alreadyPushedNodes.add(excludeNodeId);
    }

    // Get dimensions of the target position
    // Priority: 1) Use provided dimensions, 2) Extract from excludeNodeId body, 3) Use defaults
    let targetHalfWidth: number;
    let targetHalfHeight: number;

    if (targetWidth !== undefined && targetHeight !== undefined) {
      // Use provided dimensions (highest priority)
      targetHalfWidth = targetWidth / 2;
      targetHalfHeight = targetHeight / 2;
    } else if (excludeNodeId) {
      // Try to extract from excludeNodeId body
      const excludeBody = nodeBodies.get(excludeNodeId);
      if (excludeBody) {
        const bounds = excludeBody.bounds;
        targetHalfWidth = (bounds.max.x - bounds.min.x) / 2;
        targetHalfHeight = (bounds.max.y - bounds.min.y) / 2;
      } else {
        // Fallback to defaults
        targetHalfWidth = DEFAULT_NODE_WIDTH / 2;
        targetHalfHeight = DEFAULT_NODE_HEIGHT / 2;
      }
    } else {
      // No dimensions provided and no excludeNodeId - use defaults
      targetHalfWidth = DEFAULT_NODE_WIDTH / 2;
      targetHalfHeight = DEFAULT_NODE_HEIGHT / 2;
    }

    // Track which nodes were pushed (for cascading collision detection)
    const pushedNodes: Array<{ nodeId: string, newX: number, newY: number }> = [];

    if (MATTER_DEBUG_LOGGING) {
      console.log(`[Matter.js] pushNodesAwayFromPosition: target=(${targetX}, ${targetY}), targetHalfSize=(${targetHalfWidth}, ${targetHalfHeight}), excludeNodeId=${excludeNodeId}`);
    }

    // Check for collisions and push nodes away
    nodeBodies.forEach((body, nodeId) => {
      if (excludeNodeId && nodeId === excludeNodeId) return;

      // Skip nodes that have already been pushed in this chain (prevent infinite recursion)
      if (alreadyPushedNodes.has(nodeId)) return;

      // Get actual dimensions from Matter.js body bounds (no DOM access needed!)
      const bodyBounds = body.bounds;
      const bodyWidth = bodyBounds.max.x - bodyBounds.min.x;
      const bodyHeight = bodyBounds.max.y - bodyBounds.min.y;
      const bodyHalfWidth = bodyWidth / 2;
      const bodyHalfHeight = bodyHeight / 2;

      const dx = body.position.x - targetX;
      const dy = body.position.y - targetY;

      // Calculate absolute distances
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Calculate minimum distances for each axis (half-widths + gap)
      const minDistanceX = targetHalfWidth + bodyHalfWidth + MIN_HORIZONTAL_GAP;
      const minDistanceY = targetHalfHeight + bodyHalfHeight + MIN_VERTICAL_GAP;

      // Check if there's overlap on both axes (AABB collision detection)
      const overlapX = minDistanceX - absDx;
      const overlapY = minDistanceY - absDy;

      // Only push if overlapping on BOTH axes (use EPSILON to handle floating point errors)
      // This ensures we maintain spacing even when nodes are very close (within floating point precision)
      if (overlapX > -EPSILON && overlapY > -EPSILON) {
        if (MATTER_DEBUG_LOGGING) {
          console.log(`[Matter.js]   ✅ Collision detected with node ${nodeId}`);
        }

        let newX = body.position.x;
        let newY = body.position.y;

        // Push along the axis with smallest overlap (shortest separation)
        if (overlapX < overlapY) {
          // Push horizontally
          const pushDirection = dx > 0 ? 1 : -1;
          newX = body.position.x + pushDirection * overlapX;
        } else {
          // Push vertically
          const pushDirection = dy > 0 ? 1 : -1;
          newY = body.position.y + pushDirection * overlapY;
        }

        // Update Matter.js body position (center)
        Matter.Body.setPosition(body, { x: newX, y: newY });

        // Update the VueFlow node position (top-left)
        // Convert from Matter.js center to VueFlow top-left
        const node = nodes.value.find(n => n.id === nodeId);
        if (node) {
          node.position.x = newX - bodyHalfWidth;
          node.position.y = newY - bodyHalfHeight;
        }

        // Track this pushed node for cascading collision detection
        pushedNodes.push({ nodeId, newX, newY });
      }
    });

    // Cascading collision detection: recursively push nodes that collide with pushed nodes
    pushedNodes.forEach(({ nodeId, newX, newY }) => {
      const pushedBody = nodeBodies.get(nodeId);
      if (!pushedBody) return;

      const pushedBounds = pushedBody.bounds;
      const pushedWidth = pushedBounds.max.x - pushedBounds.min.x;
      const pushedHeight = pushedBounds.max.y - pushedBounds.min.y;

      // console.log(`[DEBUG]   Cascading check for pushed node ${nodeId} at (${newX}, ${newY})`);

      // Recursively call pushNodesAwayFromPosition for this pushed node
      // Pass the alreadyPushedNodes set to prevent infinite recursion
      pushNodesAwayFromPosition(newX, newY, nodeId, pushedWidth, pushedHeight, alreadyPushedNodes);
    });
  }

  // Cleanup function
  function cleanup() {
    // Clean up Matter.js engine
    if (matterEngine && matterWorld) {
      Matter.World.clear(matterWorld, false);
      Matter.Engine.clear(matterEngine);
      matterEngine = null;
      matterWorld = null;
      nodeBodies.clear();
    }
  }

  return {
    matterEngine,
    matterWorld,
    nodeBodies,
    getNodeDimensions,
    initMatterEngine,
    createMatterBody,
    removeMatterBody,
    updateMatterBodyPosition,
    updateMatterBodyDimensions,
    runMatterEngineToResolveOverlaps,
    pushNodesAwayFromPosition,
    cleanup,
  };
}

