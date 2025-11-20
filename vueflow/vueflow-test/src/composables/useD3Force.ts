import { ref, nextTick, type Ref } from 'vue';
import * as d3 from 'd3-force';
import type { Node, Edge } from '@vue-flow/core';

// D3 Force Simulation for collision avoidance
interface SimulationNode extends d3.SimulationNodeDatum {
  id: string;
}

interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
  source: string;
  target: string;
}

// D3 Force parameters (adjustable)
export interface D3ForceParams {
  chargeStrength: number;      // How strongly nodes repel each other
  collisionRadius: number;      // Minimum distance between nodes (collision detection)
  positionStrength: number;     // How strongly nodes stick to their intended position
  alphaDecay: number;           // How quickly simulation cools down (higher = faster)
  linkDistance: number;         // Desired distance between connected nodes
}

export function useD3Force(
  nodes: Ref<Node[]>,
  edges: Ref<Edge[]>,
  forceParams: Ref<D3ForceParams>,
  matterEnabled: Ref<boolean>,
  updateMatterBodyPosition: (nodeId: string, x: number, y: number) => void,
  runMatterEngineToResolveOverlaps: () => void
) {
  // Simulation state
  const isSimulationRunning = ref(false);

  // Using 'any' type to avoid D3 Simulation type issues with strict TypeScript
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let simulation: any = null;

  // Initialize D3 force simulation
  function initSimulation() {
    simulation = d3.forceSimulation<SimulationNode>()
      .force('collision', d3.forceCollide<SimulationNode>().radius(forceParams.value.collisionRadius))
      .alphaDecay(forceParams.value.alphaDecay)
      .on('tick', onSimulationTick)
      .on('end', onSimulationEnd);

    // Add layout forces (charge, position, link)
    simulation
      .force('charge', d3.forceManyBody().strength(forceParams.value.chargeStrength))
      .force('x', d3.forceX<SimulationNode>().strength(forceParams.value.positionStrength))
      .force('y', d3.forceY<SimulationNode>().strength(forceParams.value.positionStrength));

    // Add link force for connected nodes
    const links: SimulationLink[] = edges.value.map(edge => ({
      source: edge.source,
      target: edge.target,
    }));

    simulation.force('link', d3.forceLink<SimulationNode, SimulationLink>(links)
      .id((d: SimulationNode) => d.id)
      .distance(forceParams.value.linkDistance)
      .strength(0.5));
  }

  // Called when simulation finishes
  function onSimulationEnd() {
    isSimulationRunning.value = false;
    // console.log('[D3 Force] Simulation finished - nodes can be dragged again');

    // If Matter.js is enabled, sync all bodies with new positions from D3
    if (matterEnabled.value) {
      // console.log('[D3 Force] Syncing Matter.js bodies with new D3 positions...');

      // Wait for next tick to ensure DOM is updated with new positions
      void nextTick(() => {
        // Sync all Matter.js body POSITIONS (not dimensions) with new node positions from D3
        nodes.value.forEach(node => {
          // Update Matter.js body position to match the new VueFlow position from D3
          updateMatterBodyPosition(node.id, node.position.x, node.position.y);
        });

        // Run physics engine once to resolve any overlaps (if any)
        // This is just to make sure nodes don't overlap after D3 layout
        runMatterEngineToResolveOverlaps();

        // console.log('[D3 Force] ✅ Matter.js bodies synced with D3 positions and overlaps resolved');
      });
    }
  }

  // Update node positions from simulation
  function onSimulationTick() {
    if (!simulation) return;

    const simulationNodes = simulation.nodes();

    // Update Vue Flow nodes with new positions from simulation
    nodes.value = nodes.value.map((node, index) => {
      const simNode = simulationNodes[index];
      if (simNode) {
        return {
          ...node,
          position: {
            x: simNode.x || node.position.x,
            y: simNode.y || node.position.y,
          },
        };
      }
      return node;
    });
  }

  // Run simulation with current nodes
  function runSimulation() {
    if (!simulation) {
      initSimulation();
    }

    if (!simulation) return;

    // Mark simulation as running
    isSimulationRunning.value = true;

    // Prepare nodes for D3 (add x, y properties)
    const d3Nodes: SimulationNode[] = nodes.value.map(node => ({
      id: node.id,
      x: node.position.x,
      y: node.position.y,
    }));

    // Update simulation with new nodes
    simulation.nodes(d3Nodes);

    // Restart simulation
    simulation.alpha(0.3).restart();
  }

  // Run D3 Force layout once
  function runD3ForceOnce() {
    // console.log('[D3 Force] Starting D3 Force layout...');

    // If Matter.js is enabled, we need to sync bodies after D3 completes
    const wasMatterEnabled = matterEnabled.value;

    // Run the simulation
    runSimulation();

    // Note: The simulation will automatically call runMatterEngineToResolveOverlaps()
    // when it ends (see onSimulationEnd function) if Matter.js is enabled
    if (wasMatterEnabled) {
      // console.log('[D3 Force] Matter.js is enabled - will sync bodies after D3 completes');
    }
  }

  // Cleanup function
  function cleanup() {
    // Stop D3 simulation
    if (simulation) {
      simulation.stop();
      simulation = null;
    }
  }

  return {
    isSimulationRunning,
    initSimulation,
    runSimulation,
    runD3ForceOnce,
    cleanup,
  };
}

