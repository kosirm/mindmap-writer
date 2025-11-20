<template>
  <q-page class="vueflow-test-page">
    <!-- Left Drawer -->
    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      :width="350"
      :breakpoint="500"
      bordered
      class="bg-grey-1"
    >
      <q-scroll-area class="fit">
        <div class="q-pa-md">
          <q-tabs
            v-model="activeTab"
            dense
            class="text-grey"
            active-color="primary"
            indicator-color="primary"
            align="justify"
          >
            <q-tab name="tree" icon="account_tree">
              <q-tooltip>Tree View</q-tooltip>
            </q-tab>
            <q-tab name="data" icon="data_object">
              <q-tooltip>Data Export</q-tooltip>
            </q-tab>
            <q-tab name="params" icon="scatter_plot">
              <q-tooltip>D3 Parameters</q-tooltip>
            </q-tab>
            <q-tab name="instructions" icon="help_outline">
              <q-tooltip>Instructions</q-tooltip>
            </q-tab>
          </q-tabs>

          <q-separator class="q-my-md" />

          <q-tab-panels v-model="activeTab" animated>
            <!-- Tree Tab -->
            <q-tab-panel name="tree">
              <div class="text-h6 q-mb-md">Hierarchy Tree</div>

              <div v-if="rootNodes.length === 0" class="text-center text-grey-7 q-pa-md">
                No nodes yet. Create some nodes and connect them with Shift+Drag to build a hierarchy.
              </div>

              <div v-else>
                <q-tree
                  :nodes="treeData as any"
                  node-key="id"
                  :selected="selectedTreeNodeIds"
                  default-expand-all
                  no-connectors
                  @update:selected="onTreeNodeSelected"
                >
                  <template v-slot:default-header="prop">
                    <div
                      class="row items-center tree-node-header"
                      :class="{ 'tree-node-selected': selectedTreeNodeIds.includes(prop.node.id) }"
                    >
                      <div class="text-weight-medium">{{ prop.node.label }}</div>
                      <q-badge v-if="prop.node.childCount > 0" color="primary" class="q-ml-sm">
                        {{ prop.node.childCount }}
                      </q-badge>
                    </div>
                  </template>
                </q-tree>
              </div>
            </q-tab-panel>

            <!-- Data Tab -->
            <q-tab-panel name="data">
              <div class="text-h6 q-mb-md">Data Model</div>

              <div class="q-mb-md">
                <q-btn
                  color="primary"
                  icon="download"
                  label="Export JSON"
                  @click="exportJSON"
                  class="full-width"
                />
              </div>

              <div class="q-mb-md">
                <q-btn
                  color="secondary"
                  icon="visibility"
                  label="View JSON in Console"
                  @click="viewJSON"
                  class="full-width"
                />
              </div>

              <div class="text-caption text-grey-7 q-mb-lg">
                Export the current mindmap data model as JSON to see the structure of nodes and edges.
              </div>

              <q-separator class="q-my-md" />

              <div class="text-h6 q-mb-md">Local Storage</div>

              <!-- Current Mindmap Name -->
              <div class="q-mb-md">
                <q-input
                  v-model="currentMindmapName"
                  label="Current Mindmap Name"
                  outlined
                  dense
                  :rules="[(val: string) => !!val || 'Name is required']"
                />
              </div>

              <!-- Action Buttons -->
              <div class="q-mb-md q-gutter-y-sm">
                <q-btn
                  color="positive"
                  icon="add"
                  label="New Mindmap"
                  @click="createNewMindmap"
                  class="full-width"
                />
                <q-btn
                  color="primary"
                  icon="save"
                  label="Save Current Mindmap"
                  @click="saveCurrentMindmap"
                  class="full-width"
                  :disable="!currentMindmapName"
                />
              </div>

              <q-separator class="q-my-md" />

              <!-- Saved Mindmaps List -->
              <div class="text-subtitle2 q-mb-sm">Saved Mindmaps ({{ savedMindmaps.length }})</div>

              <div v-if="savedMindmaps.length === 0" class="text-center text-grey-7 q-pa-md">
                No saved mindmaps yet
              </div>

              <q-list v-else bordered separator class="rounded-borders">
                <q-item
                  v-for="mindmap in savedMindmaps"
                  :key="mindmap.id"
                  clickable
                  :active="currentMindmapId === mindmap.id"
                  active-class="bg-blue-1"
                >
                  <q-item-section>
                    <q-item-label>{{ mindmap.name }}</q-item-label>
                    <q-item-label caption>
                      {{ formatDate(mindmap.timestamp) }} • {{ mindmap.nodeCount }} nodes
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <div class="q-gutter-xs">
                      <q-btn
                        flat
                        dense
                        round
                        icon="upload"
                        color="primary"
                        size="sm"
                        @click.stop="loadMindmap(mindmap.id)"
                      >
                        <q-tooltip>Load</q-tooltip>
                      </q-btn>
                      <q-btn
                        flat
                        dense
                        round
                        icon="delete"
                        color="negative"
                        size="sm"
                        @click.stop="deleteMindmap(mindmap.id)"
                      >
                        <q-tooltip>Delete</q-tooltip>
                      </q-btn>
                    </div>
                  </q-item-section>
                </q-item>
              </q-list>

              <div class="text-caption text-grey-7 q-mt-md">
                Mindmaps are saved in your browser's local storage and persist between sessions.
              </div>
            </q-tab-panel>

            <!-- D3 Parameters Tab -->
            <q-tab-panel name="params">
              <div class="text-h6 q-mb-md">Layout Controls</div>

              <!-- D3 Force Layout -->
              <div class="q-mb-lg">
                <div class="text-subtitle2 q-mb-sm">D3 Force Layout</div>
                <q-btn
                  label="D3 FORCE"
                  color="primary"
                  icon="scatter_plot"
                  class="full-width"
                  @click="runD3ForceOnce"
                  :disable="isSimulationRunning"
                  :loading="isSimulationRunning"
                >
                  <template v-slot:loading>
                    <q-spinner-dots />
                  </template>
                </q-btn>
                <div class="text-caption text-grey-7 q-mt-sm">
                  Organize connected nodes using force-directed layout
                </div>
              </div>

              <q-separator class="q-my-md" />

              <!-- Matter.js Collision Detection -->
              <div class="q-mb-lg">
                <div class="text-subtitle2 q-mb-md">Matter.js Collision Detection</div>

                <!-- Matter.js ON/OFF Toggle -->
                <div class="q-mb-md">
                  <q-toggle
                    v-model="matterEnabled"
                    label="Matter.js Collision Detection"
                    color="positive"
                    left-label
                    class="full-width"
                  />
                  <div class="text-caption text-grey-7 q-mt-xs">
                    When ON: Nodes push each other away while dragging
                  </div>
                </div>

                <!-- Resolve Overlaps Button (only visible when Matter.js is OFF) -->
                <div v-if="!matterEnabled" class="q-mb-md">
                  <q-btn
                    label="RESOLVE OVERLAPS"
                    color="secondary"
                    icon="auto_fix_high"
                    class="full-width"
                    @click="resolveOverlapsOnce"
                  />
                  <div class="text-caption text-grey-7 q-mt-sm">
                    Run physics simulation once to separate overlapping nodes
                  </div>
                </div>
              </div>

              <q-separator class="q-my-md" />

              <!-- Info Section -->
              <div class="text-caption text-grey-7">
                <div class="q-mb-sm"><strong>D3 FORCE:</strong> Organizes connected nodes using force-directed layout algorithm</div>
                <div class="q-mb-sm"><strong>Matter.js ON:</strong> Real-time collision detection while dragging nodes</div>
                <div><strong>RESOLVE OVERLAPS:</strong> One-time physics simulation to fix overlapping nodes</div>
              </div>

              <!-- Hidden sliders for future use (keep the params but don't show UI) -->
              <div style="display: none;">
                <div class="param-control">
                  <div class="param-label">Collision Radius (Density)</div>
                  <div class="param-value">{{ forceParams.collisionRadius }}px</div>
                  <q-slider
                    v-model="forceParams.collisionRadius"
                    :min="30"
                    :max="120"
                    :step="5"
                    color="primary"
                    label
                  />
                </div>

                <div class="param-control">
                  <div class="param-label">Alpha Decay (speed)</div>
                  <div class="param-value">{{ forceParams.alphaDecay }}</div>
                  <q-slider
                    v-model="forceParams.alphaDecay"
                    :min="0.01"
                    :max="0.2"
                    :step="0.01"
                    color="primary"
                    label
                  />
                </div>

                <div class="param-control">
                  <div class="param-label">Link Distance</div>
                  <div class="param-value">{{ forceParams.linkDistance }}px</div>
                  <q-slider
                    v-model="forceParams.linkDistance"
                    :min="50"
                    :max="300"
                    :step="10"
                    color="primary"
                    label
                  />
                </div>

                <div class="param-control">
                  <div class="param-label">Charge Strength (repulsion)</div>
                  <div class="param-value">{{ forceParams.chargeStrength }}</div>
                  <q-slider
                    v-model="forceParams.chargeStrength"
                    :min="-1000"
                    :max="-50"
                    :step="50"
                    color="primary"
                    label
                  />
                </div>

                <div class="param-control">
                  <div class="param-label">Position Strength</div>
                  <div class="param-value">{{ forceParams.positionStrength }}</div>
                  <q-slider
                    v-model="forceParams.positionStrength"
                    :min="0"
                    :max="0.5"
                    :step="0.05"
                    color="primary"
                    label
                  />
                </div>
              </div>
            </q-tab-panel>

            <!-- Instructions Tab -->
            <q-tab-panel name="instructions">
              <div class="text-h6 q-mb-md">How to Use</div>

              <q-list>
                <q-item>
                  <q-item-section avatar>
                    <q-icon color="primary" name="add_circle" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label><strong>Ctrl + Click</strong> on canvas</q-item-label>
                    <q-item-label caption>Create a new node</q-item-label>
                  </q-item-section>
                </q-item>

                <q-item>
                  <q-item-section avatar>
                    <q-icon color="primary" name="ads_click" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label><strong>Click</strong> on a node</q-item-label>
                    <q-item-label caption>Select it</q-item-label>
                  </q-item-section>
                </q-item>

                <q-item>
                  <q-item-section avatar>
                    <q-icon color="primary" name="keyboard" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label><strong>Ctrl + Arrow keys</strong></q-item-label>
                    <q-item-label caption>Create connected nodes (Up/Down/Left/Right)</q-item-label>
                  </q-item-section>
                </q-item>

                <q-item>
                  <q-item-section avatar>
                    <q-icon color="primary" name="open_with" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label><strong>Drag</strong> nodes</q-item-label>
                    <q-item-label caption>Move nodes freely</q-item-label>
                  </q-item-section>
                </q-item>

                <q-item>
                  <q-item-section avatar>
                    <q-icon color="primary" name="timeline" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label><strong>Drag from connection point</strong></q-item-label>
                    <q-item-label caption>Create reference connection (orange dashed)</q-item-label>
                  </q-item-section>
                </q-item>

                <q-item>
                  <q-item-section avatar>
                    <q-icon color="primary" name="account_tree" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label><strong>Shift + Drag connection point to node</strong></q-item-label>
                    <q-item-label caption>Create hierarchy (parent→child). Auto-reparents if child already has parent.</q-item-label>
                  </q-item-section>
                </q-item>

                <q-item>
                  <q-item-section avatar>
                    <q-icon color="primary" name="add_link" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label><strong>Alt + Drag connection to empty space</strong></q-item-label>
                    <q-item-label caption>Create new child node at drop position</q-item-label>
                  </q-item-section>
                </q-item>



                <q-item>
                  <q-item-section avatar>
                    <q-icon color="primary" name="delete" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label><strong>Delete / Backspace</strong></q-item-label>
                    <q-item-label caption>Delete selected nodes or connections</q-item-label>
                  </q-item-section>
                </q-item>

                <q-separator class="q-my-md" />

                <q-item-label header class="text-weight-bold">Connection Types</q-item-label>

                <q-item>
                  <q-item-section avatar>
                    <div style="width: 40px; height: 2px; background: #1976d2;"></div>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label><strong>Hierarchy (Blue Solid)</strong></q-item-label>
                    <q-item-label caption>Parent-child relationships (Ctrl+Arrow, Alt+Drag)</q-item-label>
                  </q-item-section>
                </q-item>

                <q-item>
                  <q-item-section avatar>
                    <div style="width: 40px; height: 2px; background: #ff9800; border-top: 2px dashed #ff9800;"></div>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label><strong>Reference (Orange Dashed)</strong></q-item-label>
                    <q-item-label caption>Cross-references between nodes (manual drag)</q-item-label>
                  </q-item-section>
                </q-item>

                <q-separator class="q-my-md" />

                <q-item>
                  <q-item-section avatar>
                    <q-icon color="primary" name="zoom_in" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label><strong>Double-click</strong> canvas</q-item-label>
                    <q-item-label caption>Zoom in (default Vue Flow behavior)</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>

              <q-separator class="q-my-md" />

              <div class="q-pa-sm bg-blue-1 rounded-borders">
                <div class="text-caption text-grey-8">
                  <q-icon name="info" color="primary" size="sm" />
                  All connections go from center to center with invisible handles
                </div>
              </div>

              <q-separator class="q-my-md" />

              <div class="q-pa-sm">
                <div class="text-subtitle2">Selected Node</div>
                <div class="text-h6 text-primary">{{ selectedNodeId || 'None' }}</div>
              </div>
            </q-tab-panel>
          </q-tab-panels>
        </div>
      </q-scroll-area>
    </q-drawer>

    <!-- Simulation running indicator -->
    <div v-if="isSimulationRunning" class="simulation-indicator">
      <q-spinner-dots color="primary" size="20px" />
      <span>Layout in progress... (nodes locked)</span>
    </div>

    <VueFlow
      v-model:nodes="nodes"
      v-model:edges="edges"
      :default-viewport="{ zoom: 1, x: 0, y: 0 }"
      :default-edge-options="defaultEdgeOptions"
      :nodes-draggable="!isSimulationRunning"
      :min-zoom="0.2"
      :max-zoom="4"
      :connection-line-type="ConnectionLineType.Straight"
      :disable-keyboard-a11y="true"
      class="vue-flow-container"
      @pane-click="onPaneClick"
      @node-click="onNodeClick"
      @node-drag="onNodeDrag"
      @node-drag-stop="onNodeDragStop"
      @connect="onConnect"
      @connect-start="onConnectStart"
      @connect-end="onConnectEnd"
    >
      <Background />
      <Controls />

      <!-- Custom node template using CustomNode component -->
      <template #node-custom="nodeProps">
        <CustomNode
          :id="nodeProps.id"
          :data="nodeProps.data"
          @update:data="(newData) => updateNodeData(nodeProps.id, newData)"
        />
      </template>
    </VueFlow>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { VueFlow, useVueFlow, ConnectionLineType } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import type { Node, Edge } from '@vue-flow/core';
import * as d3 from 'd3-force';
import { Notify } from 'quasar';
import { eventBus } from '../composables/useEventBus';
import CustomNode from '../components/CustomNode.vue';
import Matter from 'matter-js';

// Import Vue Flow styles
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';

// Nodes and edges - start with empty canvas
const nodes = ref<Node[]>([]);

const edges = ref<Edge[]>([]);

// Default edge options - use straight lines
const defaultEdgeOptions = {
  type: 'straight',
};

// UI state
const leftDrawerOpen = ref(true);
const activeTab = ref('tree'); // Default to Tree tab

// Selected node tracking
const selectedNodeId = ref<string | null>(null);

// Mindmap management state
const currentMindmapName = ref('Untitled Mindmap');
const currentMindmapId = ref<string | null>(null);

interface SavedMindmap {
  id: string;
  name: string;
  timestamp: number;
  nodeCount: number;
  nodes: Node[];
  edges: Edge[];
}

const savedMindmaps = ref<SavedMindmap[]>([]);

// Simulation state
const isSimulationRunning = ref(false);

// D3 Mode: 'off' | 'manual' | 'auto'
const d3Mode = ref<'off' | 'manual' | 'auto'>('off'); // Default to OFF (full manual control)

// Matter.js collision state
const matterEnabled = ref(true); // Matter.js collision detection ON by default
const isAltKeyPressed = ref(false); // Track Alt key for disabling collision while dragging

// Debug logging toggle (set to false to reduce console noise in production)
const MATTER_DEBUG_LOGGING = false;

// D3 Force parameters (adjustable)
const forceParams = ref({
  chargeStrength: -300,      // How strongly nodes repel each other
  collisionRadius: 60,       // Minimum distance between nodes (collision detection)
  positionStrength: 0.1,     // How strongly nodes stick to their intended position
  alphaDecay: 0.05,          // How quickly simulation cools down (higher = faster)
  linkDistance: 150,         // Desired distance between connected nodes
});

// Node counter for unique IDs
let nodeCounter = 2;

// Get Vue Flow instance
const { project, vueFlowRef, connectionStartHandle, getSelectedNodes, getSelectedEdges, addSelectedNodes, removeSelectedNodes } = useVueFlow();

// Track if we're currently dragging a connection
const isDraggingConnection = ref(false);

// Track if Shift key is pressed during connection drag
const isShiftPressed = ref(false);

// Track selected nodes in tree view (supports multiple selection)
const selectedTreeNodeIds = ref<string[]>([]);

// Computed: Find all root nodes (nodes with no parent)
const rootNodes = computed(() => {
  return nodes.value.filter(node => !node.data.parentId);
});

// Tree node interface for q-tree component
interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[] | undefined;
  childCount: number;
}

// Computed: Build tree data structure for q-tree component
const treeData = computed(() => {
  // Helper function to build tree recursively
  function buildTree(parentId: string | null): TreeNode[] {
    const children = nodes.value.filter(node => node.data.parentId === parentId);

    return children.map(node => {
      const nodeChildren = buildTree(node.id);
      const treeNode: TreeNode = {
        id: node.id,
        label: node.data.label || `Node ${node.id}`,
        childCount: nodeChildren.length,
      };

      // Only add children if there are any
      if (nodeChildren.length > 0) {
        treeNode.children = nodeChildren;
      }

      return treeNode;
    });
  }

  // Start with root nodes (nodes with no parent)
  return buildTree(null);
});

// D3 Force Simulation for collision avoidance
interface SimulationNode extends d3.SimulationNodeDatum {
  id: string;
}

interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
  source: string;
  target: string;
}

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

// Resolve overlaps once using Matter.js physics engine
function resolveOverlapsOnce() {
  console.log('[Matter.js] Running physics engine once to resolve overlaps...');
  runMatterEngineToResolveOverlaps();
}

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
const DEFAULT_NODE_WIDTH = 80;
const DEFAULT_NODE_HEIGHT = 40;

// Minimum spacing between nodes (in pixels)
const MIN_HORIZONTAL_GAP = 3;  // 3px horizontal spacing between nodes
const MIN_VERTICAL_GAP = 3;    // 3px vertical spacing between nodes

// Small epsilon value for floating point comparison (to handle floating point errors)
const EPSILON = 0.1;

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

// Matter.js engine and world (using shallowRef to avoid Vue reactivity issues)
// See: https://github.com/liabru/matter-js/issues/1001#issuecomment-998911435
let matterEngine: Matter.Engine | null = null;
let matterWorld: Matter.World | null = null;

// Map to track Matter.js bodies for each node
const nodeBodies = new Map<string, Matter.Body>();

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

  console.log('Matter.js engine initialized');
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

// Create a new node at the given position
// NOTE: Caller must add the node to nodes.value array AFTER calling this function
// so that the node renders in DOM and we can read its actual dimensions
function createNode(x: number, y: number, label?: string, parentId?: string): Node {
  const id = String(nodeCounter++);

  const newNode: Node = {
    id,
    type: 'custom',
    position: { x, y },  // VueFlow uses top-left
    data: {
      label: label || `Node ${id}`,  // Fallback label for display (will be removed later)
      // Custom fields for our mindmap
      parentId: parentId || null,  // For hierarchy - which node is the parent
      content: '',  // Rich text content (will be HTML from Tiptap later)
      title: label || `Node ${id}`,  // Node title (editable with Tiptap) - initialize with label
    },
  };

  return newNode;
}

// Create an edge between two nodes (always center to center, straight line)
function createEdge(sourceId: string, targetId: string, edgeType: 'hierarchy' | 'reference' = 'hierarchy'): Edge {
  return {
    id: `e${sourceId}-${targetId}`,
    source: sourceId,
    target: targetId,
    sourceHandle: 'center',
    targetHandle: 'center',
    type: 'straight',
    class: `edge-${edgeType}`,  // Add class for styling
    data: {
      // Custom field to distinguish edge types
      edgeType: edgeType,  // 'hierarchy' for parent-child, 'reference' for cross-references
    },
  };
}

// Check if making childId a child of parentId would create a circular reference
// (i.e., parentId is already a descendant of childId)
function wouldCreateCircularReference(parentId: string, childId: string): boolean {
  // Start from parentId and traverse up the hierarchy
  let currentId: string | null = parentId;
  const visited = new Set<string>();

  while (currentId) {
    // If we've reached the childId, it means childId is an ancestor of parentId
    if (currentId === childId) {
      return true;  // Circular reference detected!
    }

    // Prevent infinite loops
    if (visited.has(currentId)) {
      break;
    }
    visited.add(currentId);

    // Find the parent of currentId
    const currentNode = nodes.value.find(n => n.id === currentId);
    currentId = currentNode?.data?.parentId || null;
  }

  return false;  // No circular reference
}

// Remove old parent relationship (hierarchy edge and parentId)
function removeOldParentRelationship(childId: string): string | null {
  const childNode = nodes.value.find(n => n.id === childId);
  if (!childNode || !childNode.data.parentId) {
    return null;  // No parent to remove
  }

  const oldParentId = childNode.data.parentId;

  // Remove the hierarchy edge from old parent to child
  const edgeIndex = edges.value.findIndex(
    edge => edge.data?.edgeType === 'hierarchy' &&
            edge.source === oldParentId &&
            edge.target === childId
  );

  if (edgeIndex !== -1) {
    // Force reactivity by creating a new array instead of splicing
    edges.value = edges.value.filter((_, index) => index !== edgeIndex);
  }

  // Clear parentId
  childNode.data.parentId = null;

  return oldParentId;
}

// Handle pane click (deselect node or create node with Ctrl+Click)
function onPaneClick(mouseEvent: MouseEvent) {
  // Ctrl+Click to create a new node (but not if we're dragging a connection)
  if (mouseEvent.ctrlKey && !isDraggingConnection.value) {
    // Prevent event from bubbling/firing multiple times
    mouseEvent.stopPropagation();
    mouseEvent.preventDefault();

    // Get the bounding rect of the Vue Flow container
    const flowElement = vueFlowRef.value;
    if (!flowElement) return;

    const rect = flowElement.getBoundingClientRect();

    // Calculate position relative to the flow container
    const x = mouseEvent.clientX - rect.left;
    const y = mouseEvent.clientY - rect.top;

    // Convert to flow coordinates (this is where the mouse is)
    const mousePosition = project({ x, y });

    // Center the node on the mouse position using estimated dimensions
    // We'll adjust after DOM renders with actual dimensions
    const estimatedWidth = DEFAULT_NODE_WIDTH;
    const estimatedHeight = DEFAULT_NODE_HEIGHT;
    const topLeftX = mousePosition.x - estimatedWidth / 2;
    const topLeftY = mousePosition.y - estimatedHeight / 2;

    // Create a new node centered on the mouse position
    const newNode = createNode(topLeftX, topLeftY);
    nodes.value.push(newNode);

    // Wait for DOM to render, then read actual dimensions and adjust position
    void nextTick(() => {
      // Get actual dimensions from DOM
      const dimensions = getNodeDimensions(newNode.id);

      // Adjust position to center on mouse using ACTUAL dimensions
      const adjustedTopLeftX = mousePosition.x - dimensions.width / 2;
      const adjustedTopLeftY = mousePosition.y - dimensions.height / 2;

      // Update node position
      newNode.position.x = adjustedTopLeftX;
      newNode.position.y = adjustedTopLeftY;

      // Calculate center position using ACTUAL dimensions
      const centerX = mousePosition.x;  // Mouse is already at center
      const centerY = mousePosition.y;

      // console.log(`[DEBUG] Ctrl+Click createNode ${newNode.id}: actual dimensions = ${dimensions.width} x ${dimensions.height}, centered at mouse (${centerX}, ${centerY})`);

      // Push away any overlapping nodes using the ACTUAL dimensions
      pushNodesAwayFromPosition(centerX, centerY, undefined, dimensions.width, dimensions.height);

      // Create Matter.js body with actual dimensions at adjusted position
      createMatterBody(newNode);

      // Run simulation to avoid collisions (only in AUTO mode)
      if (d3Mode.value === 'auto') {
        runSimulation();
      }
    });
  } else {
    // Regular click - emit event to deselect all nodes
    eventBus.emit('canvas:pane-clicked', {});
  }
}

// Handle node click (select node) - emit event instead of directly updating state
function onNodeClick(event: { node: Node }) {
  // Emit event - tree will listen and update itself
  eventBus.emit('canvas:node-selected', { nodeId: event.node.id });
}

// Update node data (called from CustomNode component when title is edited)
function updateNodeData(nodeId: string, newData: { label: string; title: string; content: string; parentId: string | null }) {
  const node = nodes.value.find(n => n.id === nodeId);
  if (node) {
    node.data = newData;
  }
}

// Handle connection start (when starting to drag a connection)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function onConnectStart(connectionEvent: any) {
  isDraggingConnection.value = true;
  // Track if Shift key is pressed when starting the connection
  isShiftPressed.value = connectionEvent?.event?.shiftKey || false;
}

// Handle connection between nodes
function onConnect(params: { source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null }) {
  // Reset dragging flag
  isDraggingConnection.value = false;

  // IMPORTANT: Vue Flow reports connections backwards!
  // When you drag FROM node 2 TO node 3:
  // - params.source = 3 (the node you dropped on)
  // - params.target = 2 (the node you started from)
  // So we need to SWAP them to get the correct parent-child relationship
  const parentId = params.target;  // The node you dragged FROM (should be parent)
  const childId = params.source;   // The node you dragged TO (should be child)

  // Check if Shift key was pressed - this determines hierarchy vs reference
  if (isShiftPressed.value) {
    // SHIFT + DRAG = HIERARCHY CONNECTION

    // Check for circular reference
    if (wouldCreateCircularReference(parentId, childId)) {
      Notify.create({
        type: 'negative',
        message: 'Cannot create hierarchy: This would create a circular reference!',
        position: 'top',
        timeout: 3000,
      });
      isShiftPressed.value = false;
      return;
    }

    // Check if child already has a parent
    const childNode = nodes.value.find(n => n.id === childId);
    const oldParentId = childNode?.data?.parentId;

    if (oldParentId) {
      // REPARENTING: Remove old parent relationship
      removeOldParentRelationship(childId);

      // Update parentId to new parent
      if (childNode) {
        childNode.data.parentId = parentId;
      }

      // Create new hierarchy edge
      const newEdge = createEdge(parentId, childId, 'hierarchy');
      edges.value.push(newEdge);

      Notify.create({
        type: 'info',
        message: `Node ${childId} reconnected from Node ${oldParentId} to Node ${parentId}`,
        position: 'top',
        timeout: 3000,
      });
    } else {
      // NEW PARENT: Child has no parent yet

      // Update parentId
      if (childNode) {
        childNode.data.parentId = parentId;
      }

      // Create hierarchy edge
      const newEdge = createEdge(parentId, childId, 'hierarchy');
      edges.value.push(newEdge);

      Notify.create({
        type: 'positive',
        message: `Node ${childId} is now a child of Node ${parentId}`,
        position: 'top',
        timeout: 2000,
      });
    }

    isShiftPressed.value = false;
    return;
  }

  // NO SHIFT KEY = REFERENCE CONNECTION

  // Check if connection already exists (prevent duplicates)
  const connectionExists = edges.value.some(edge =>
    (edge.source === params.source && edge.target === params.target) ||
    (edge.source === params.target && edge.target === params.source)
  );

  if (connectionExists) {
    console.log('Connection already exists, skipping duplicate');
    return;
  }

  // Create a new reference edge
  const newEdge: Edge = {
    id: `e${params.source}-${params.target}-${Date.now()}`,
    source: params.source,
    target: params.target,
    sourceHandle: params.sourceHandle || null,
    targetHandle: params.targetHandle || null,
    type: 'straight',
    class: 'edge-reference',  // Add class for styling
    data: {
      edgeType: 'reference',  // Manual connections are references, not hierarchy
    },
  };

  edges.value.push(newEdge);
}



// Handle connection end (when dragging connection line ends)
function onConnectEnd(event?: MouseEvent) {
  // Always reset the dragging flag
  isDraggingConnection.value = false;

  if (!event) return;

  // Only create node if Alt is pressed
  if (!event.altKey) return;

  // Get the connection start handle info
  const startHandle = connectionStartHandle.value;
  if (!startHandle) return;

  // Check if the mouse is over a node (if so, don't create a new node)
  const target = event.target as HTMLElement;
  if (target.classList.contains('vue-flow__node') || target.closest('.vue-flow__node')) {
    return;
  }

  // Get the bounding rect of the Vue Flow container
  const flowElement = vueFlowRef.value;
  if (!flowElement) return;

  const rect = flowElement.getBoundingClientRect();

  // Calculate position relative to the flow container
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  // Convert to flow coordinates
  const position = project({ x, y });

  // Create a new node at the drop position with parent reference
  const newNode = createNode(position.x, position.y, undefined, startHandle.nodeId);
  nodes.value.push(newNode);

  // Create hierarchy edge from source node to new node
  const newEdge = createEdge(startHandle.nodeId, newNode.id, 'hierarchy');
  edges.value.push(newEdge);

  // Wait for DOM to render, then read actual dimensions and create Matter.js body
  void nextTick(() => {
    // Get actual dimensions from DOM
    const dimensions = getNodeDimensions(newNode.id);

    // Calculate center position using ACTUAL dimensions
    const centerX = position.x + dimensions.width / 2;
    const centerY = position.y + dimensions.height / 2;

    // console.log(`[DEBUG] Connection drop createNode ${newNode.id}: actual dimensions = ${dimensions.width} x ${dimensions.height}`);

    // Push away any overlapping nodes using the ACTUAL dimensions
    pushNodesAwayFromPosition(centerX, centerY, undefined, dimensions.width, dimensions.height);

    // Create Matter.js body with actual dimensions
    createMatterBody(newNode);

    // Run simulation to avoid collisions (only in AUTO mode)
    if (d3Mode.value === 'auto') {
      runSimulation();
    }
  });
}

// Handle node drag - push overlapping nodes away in real-time using Matter.js
function onNodeDrag(event: { node: Node }) {
  // Skip collision detection if Matter.js is disabled
  if (!matterEnabled.value) {
    return;
  }

  const draggedNode = event.node;

  // Get number of selected nodes
  const selectedNodes = getSelectedNodes.value;
  const multipleNodesSelected = selectedNodes.length > 1;

  // If multiple nodes are selected, update ALL their Matter.js body positions
  if (multipleNodesSelected) {
    selectedNodes.forEach(node => {
      updateMatterBodyPosition(node.id, node.position.x, node.position.y);
    });
    // console.log(`[DEBUG] Multiple nodes selected (${selectedNodes.length}) - updated all Matter.js bodies, skipping collision detection during drag`);
    return;
  }

  // Single node drag: update Matter.js body position
  updateMatterBodyPosition(draggedNode.id, draggedNode.position.x, draggedNode.position.y);

  // Skip collision detection if Alt key is pressed (manual override)
  if (isAltKeyPressed.value) {
    // console.log('[DEBUG] Alt key pressed - skipping collision detection for node', draggedNode.id);
    return;
  }

  // Get the Matter.js body to get its center position and dimensions
  const body = nodeBodies.get(draggedNode.id);
  if (body) {
    // Get actual body dimensions from Matter.js
    const bodyBounds = body.bounds;
    const bodyWidth = bodyBounds.max.x - bodyBounds.min.x;
    const bodyHeight = bodyBounds.max.y - bodyBounds.min.y;

    // Push away any nodes that overlap with the dragged node's current position (using center and actual dimensions)
    pushNodesAwayFromPosition(body.position.x, body.position.y, draggedNode.id, bodyWidth, bodyHeight);
  }
}

// Handle node drag stop - run Matter.js engine to resolve any overlaps
function onNodeDragStop() {
  // Skip if Matter.js is disabled
  if (!matterEnabled.value) {
    return;
  }

  // Get number of selected nodes
  const selectedNodes = getSelectedNodes.value;
  const multipleNodesSelected = selectedNodes.length > 1;

  // If Alt key was pressed OR multiple nodes were dragged, run Matter.js engine once to resolve overlaps
  if (isAltKeyPressed.value || multipleNodesSelected) {
    const reason = isAltKeyPressed.value ? 'Alt key' : `multiple nodes (${selectedNodes.length})`;
    console.log(`[DEBUG] Drag ended with ${reason} - running Matter.js engine to resolve overlaps`);
    runMatterEngineToResolveOverlaps();
  }

  // Run D3 simulation if in AUTO mode
  if (d3Mode.value === 'auto') {
    runSimulation();
  }
}

// Note: onModeChange and applyForceParams functions removed as they're no longer needed
// with the simplified UI (no mode selection, no parameter sliders)

// Keeping this for backward compatibility if needed in the future
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function applyForceParamsLegacy() {
  // Reinitialize simulation with new parameters
  if (simulation) {
    simulation.stop();
  }
  simulation = null;
  initSimulation();

  // Re-run simulation with current nodes (if not in OFF mode)
  if (d3Mode.value !== 'off') {
    runSimulation();
  }
}

// Handle Alt key press - disable collision detection while dragging
function onAltKeyDown(event: KeyboardEvent) {
  if (event.key === 'Alt') {
    isAltKeyPressed.value = true;
    console.log('[DEBUG] Alt key pressed - collision detection DISABLED while dragging');
  }
}

// Handle Alt key release - re-enable collision detection
function onAltKeyUp(event: KeyboardEvent) {
  if (event.key === 'Alt') {
    isAltKeyPressed.value = false;
    console.log('[DEBUG] Alt key released - collision detection ENABLED');
  }
}

// Handle keyboard shortcuts (Ctrl + Arrow keys and Delete)
function onKeyDown(event: KeyboardEvent) {
  // Handle Delete key - delete selected nodes and edges
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault();

    // Get selected nodes and edges
    const selectedNodes = getSelectedNodes.value;
    const selectedEdges = getSelectedEdges.value;

    // Delete selected edges
    if (selectedEdges.length > 0) {
      selectedEdges.forEach(edge => {
        // If it's a hierarchy edge, clear the child's parentId
        if (edge.data?.edgeType === 'hierarchy') {
          const childNode = nodes.value.find(n => n.id === edge.target);
          if (childNode) {
            childNode.data.parentId = null;
          }
        }
      });

      const edgeIds = selectedEdges.map(edge => edge.id);
      edges.value = edges.value.filter(edge => !edgeIds.includes(edge.id));
    }

    // Delete selected nodes (and their connected edges)
    if (selectedNodes.length > 0) {
      const nodeIds = selectedNodes.map(node => node.id);

      // Clear parentId for any children of deleted nodes
      nodes.value.forEach(node => {
        if (node.data.parentId && nodeIds.includes(node.data.parentId)) {
          node.data.parentId = null;
        }
      });

      // Remove nodes
      nodes.value = nodes.value.filter(node => !nodeIds.includes(node.id));

      // Remove edges connected to deleted nodes
      edges.value = edges.value.filter(edge =>
        !nodeIds.includes(edge.source) && !nodeIds.includes(edge.target)
      );

      // Clear selected node ID if it was deleted
      if (selectedNodeId.value && nodeIds.includes(selectedNodeId.value)) {
        selectedNodeId.value = null;
      }
    }

    return;
  }

  // Handle E key - start editing selected node
  if (event.key === 'e' || event.key === 'E') {
    // Only if a single node is selected
    if (selectedNodeId.value) {
      event.preventDefault();
      // Emit event to start editing
      eventBus.emit('node:edit-start', { nodeId: selectedNodeId.value });
    }
    return;
  }

  // Handle Ctrl + Arrow keys for creating connected nodes
  // Only handle if Ctrl is pressed and a node is selected
  if (!event.ctrlKey || !selectedNodeId.value) return;

  // Only handle arrow keys
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;

  event.preventDefault();

  // Find the selected node
  const selectedNode = nodes.value.find(n => n.id === selectedNodeId.value);
  if (!selectedNode) return;

  // Calculate new node position based on arrow key
  // Connection will always be center to center
  // Use linkDistance parameter for initial placement
  const offset = forceParams.value.linkDistance;
  let newX = selectedNode.position.x;
  let newY = selectedNode.position.y;

  switch (event.key) {
    case 'ArrowUp':
      newY -= offset;
      break;
    case 'ArrowDown':
      newY += offset;
      break;
    case 'ArrowLeft':
      newX -= offset;
      break;
    case 'ArrowRight':
      newX += offset;
      break;
  }

  // Create new node with parent reference
  const newNode = createNode(newX, newY, undefined, selectedNodeId.value);
  nodes.value.push(newNode);

  // Create hierarchy edge from selected node to new node (center to center)
  const newEdge = createEdge(selectedNodeId.value, newNode.id, 'hierarchy');
  edges.value.push(newEdge);

  // Wait for DOM to render, then read actual dimensions and create Matter.js body
  void nextTick(() => {
    // Get actual dimensions from DOM
    const dimensions = getNodeDimensions(newNode.id);

    // Calculate center position using ACTUAL dimensions
    const centerX = newX + dimensions.width / 2;
    const centerY = newY + dimensions.height / 2;

    console.log(`[DEBUG] Tab key createNode ${newNode.id}: actual dimensions = ${dimensions.width} x ${dimensions.height}`);

    // Push away any overlapping nodes using the ACTUAL dimensions
    pushNodesAwayFromPosition(centerX, centerY, undefined, dimensions.width, dimensions.height);

    // Create Matter.js body with actual dimensions
    createMatterBody(newNode);

    // Run simulation to avoid collisions (only in AUTO mode)
    if (d3Mode.value === 'auto') {
      runSimulation();
    }
  });
}

// Export data model as JSON
function exportJSON() {
  const dataModel = {
    nodes: nodes.value,
    edges: edges.value,
  };

  const jsonString = JSON.stringify(dataModel, null, 2);

  // Create a blob and download it
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `mindmap-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

// View JSON in console
function viewJSON() {
  const dataModel = {
    nodes: nodes.value,
    edges: edges.value,
  };

  console.log('=== Mindmap Data Model ===');
  console.log(JSON.stringify(dataModel, null, 2));
  console.log('=== Nodes ===');
  console.log(nodes.value);
  console.log('=== Edges ===');
  console.log(edges.value);
}

// LocalStorage keys
const MINDMAPS_LIST_KEY = 'vueflow-mindmaps-list';
const MINDMAP_PREFIX = 'vueflow-mindmap-';

// Load list of saved mindmaps from localStorage
function loadMindmapsList() {
  try {
    const listData = localStorage.getItem(MINDMAPS_LIST_KEY);
    if (listData) {
      const list = JSON.parse(listData);
      savedMindmaps.value = list.sort((a: SavedMindmap, b: SavedMindmap) => b.timestamp - a.timestamp);
    }
  } catch (error) {
    console.error('Error loading mindmaps list:', error);
  }
}

// Save list of mindmaps to localStorage
function saveMindmapsList() {
  try {
    localStorage.setItem(MINDMAPS_LIST_KEY, JSON.stringify(savedMindmaps.value));
  } catch (error) {
    console.error('Error saving mindmaps list:', error);
  }
}

// Create a new empty mindmap
function createNewMindmap() {
  // Clear current mindmap
  nodes.value = [];
  edges.value = [];
  selectedNodeId.value = null;

  // Generate new ID and name
  currentMindmapId.value = `mindmap-${Date.now()}`;
  currentMindmapName.value = 'Untitled Mindmap';

  Notify.create({
    type: 'info',
    message: 'New mindmap created',
    position: 'top',
    timeout: 2000,
  });
}

// Save current mindmap to localStorage
function saveCurrentMindmap() {
  try {
    if (!currentMindmapName.value.trim()) {
      Notify.create({
        type: 'warning',
        message: 'Please enter a name for the mindmap',
        position: 'top',
        timeout: 2000,
      });
      return;
    }

    // Generate ID if this is a new mindmap
    if (!currentMindmapId.value) {
      currentMindmapId.value = `mindmap-${Date.now()}`;
    }

    const mindmapData: SavedMindmap = {
      id: currentMindmapId.value,
      name: currentMindmapName.value,
      timestamp: Date.now(),
      nodeCount: nodes.value.length,
      nodes: nodes.value,
      edges: edges.value,
    };

    // Save the mindmap data
    localStorage.setItem(MINDMAP_PREFIX + currentMindmapId.value, JSON.stringify(mindmapData));

    // Update the list
    const existingIndex = savedMindmaps.value.findIndex(m => m.id === currentMindmapId.value);
    if (existingIndex >= 0) {
      savedMindmaps.value[existingIndex] = mindmapData;
    } else {
      savedMindmaps.value.push(mindmapData);
    }

    // Sort by timestamp (newest first)
    savedMindmaps.value.sort((a, b) => b.timestamp - a.timestamp);

    // Save the updated list
    saveMindmapsList();

    Notify.create({
      type: 'positive',
      message: `Mindmap "${currentMindmapName.value}" saved successfully!`,
      position: 'top',
      timeout: 2000,
    });
  } catch (error) {
    console.error('Error saving mindmap:', error);
    Notify.create({
      type: 'negative',
      message: 'Failed to save mindmap',
      position: 'top',
      timeout: 2000,
    });
  }
}

// Load a mindmap from localStorage
function loadMindmap(id: string) {
  try {
    const mindmapData = localStorage.getItem(MINDMAP_PREFIX + id);

    if (!mindmapData) {
      Notify.create({
        type: 'warning',
        message: 'Mindmap not found',
        position: 'top',
        timeout: 2000,
      });
      return;
    }

    const mindmap: SavedMindmap = JSON.parse(mindmapData);

    // Load the data
    nodes.value = mindmap.nodes;
    edges.value = mindmap.edges;
    currentMindmapId.value = mindmap.id;
    currentMindmapName.value = mindmap.name;

    // Update node counter to avoid ID conflicts
    const maxId = Math.max(...nodes.value.map(n => parseInt(n.id) || 0), 0);
    nodeCounter = maxId + 1;

    // Create Matter.js bodies for all loaded nodes after DOM renders
    if (matterEngine && matterWorld) {
      // Clear existing bodies
      nodeBodies.forEach((body) => {
        Matter.World.remove(matterWorld!, body);
      });
      nodeBodies.clear();

      // Wait for DOM to render, then create bodies with actual dimensions
      void nextTick(() => {
        nodes.value.forEach(node => {
          createMatterBody(node);
        });
        console.log(`Created Matter.js bodies for ${nodes.value.length} loaded nodes`);
      });
    }

    // Clear selection
    selectedNodeId.value = null;

    Notify.create({
      type: 'positive',
      message: `Mindmap "${mindmap.name}" loaded successfully!`,
      position: 'top',
      timeout: 2000,
    });
  } catch (error) {
    console.error('Error loading mindmap:', error);
    Notify.create({
      type: 'negative',
      message: 'Failed to load mindmap',
      position: 'top',
      timeout: 2000,
    });
  }
}

// Delete a mindmap from localStorage
function deleteMindmap(id: string) {
  try {
    // Remove from localStorage
    localStorage.removeItem(MINDMAP_PREFIX + id);

    // Remove from list
    savedMindmaps.value = savedMindmaps.value.filter(m => m.id !== id);

    // Save updated list
    saveMindmapsList();

    // If we deleted the current mindmap, create a new one
    if (currentMindmapId.value === id) {
      createNewMindmap();
    }

    Notify.create({
      type: 'info',
      message: 'Mindmap deleted successfully!',
      position: 'top',
      timeout: 2000,
    });
  } catch (error) {
    console.error('Error deleting mindmap:', error);
    Notify.create({
      type: 'negative',
      message: 'Failed to delete mindmap',
      position: 'top',
      timeout: 2000,
    });
  }
}

// Format date for display
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

// Handle tree node selection - emit event instead of directly manipulating canvas
function onTreeNodeSelected(nodeId: string | null) {
  // Emit event - canvas will listen and update itself
  eventBus.emit('tree:node-selected', { nodeId });
}

// ============================================================================
// EVENT BUS HANDLERS
// ============================================================================

// Handle tree node selection event - update canvas
function handleTreeNodeSelected({ nodeId }: { nodeId: string | null }) {
  if (!nodeId) {
    // Deselect all nodes in canvas
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    removeSelectedNodes(nodes.value as any);
    selectedNodeId.value = null; // Clear for keyboard shortcuts
    return;
  }

  // Find the node in the canvas
  const node = nodes.value.find(n => n.id === nodeId);
  if (node) {
    // Select this node in the canvas (this will deselect others)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addSelectedNodes([node as any]);
    selectedNodeId.value = nodeId; // Update for keyboard shortcuts
  }
}

// Handle canvas node selection event - update tree
function handleCanvasNodeSelected({ nodeId }: { nodeId: string }) {
  // Update tree selection to match canvas selection
  selectedTreeNodeIds.value = [nodeId];
  selectedNodeId.value = nodeId; // Update for keyboard shortcuts
}

// Handle node edit end event - update Matter.js body dimensions
function handleNodeEditEnd({ nodeId }: { nodeId: string }) {
  // Clear any pending debounced update
  if (titleUpdateDebounceTimer) {
    clearTimeout(titleUpdateDebounceTimer);
    titleUpdateDebounceTimer = null;
  }
  updateMatterBodyDimensions(nodeId);
}

// Debounce timer for real-time dimension updates while typing
let titleUpdateDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// Handle node title updated event - update dimensions in real-time while typing (debounced)
function handleNodeTitleUpdated({ nodeId }: { nodeId: string; title: string }) {
  // Clear previous timer
  if (titleUpdateDebounceTimer) {
    clearTimeout(titleUpdateDebounceTimer);
  }

  // Set new timer - update dimensions after 1 second of no typing
  titleUpdateDebounceTimer = setTimeout(() => {
    console.log(`[DEBUG] Real-time dimension update for node ${nodeId} while typing`);
    updateMatterBodyDimensions(nodeId);
    titleUpdateDebounceTimer = null;
  }, 1000); // 1 second debounce
}

// Handle canvas pane click event - deselect all
function handleCanvasPaneClicked() {
  // Deselect all nodes in canvas
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  removeSelectedNodes(nodes.value as any);
  // Clear tree selection
  selectedTreeNodeIds.value = [];
  selectedNodeId.value = null; // Clear for keyboard shortcuts
}

// Watch for canvas selection changes - sync to tree
// This watcher is still needed to handle multi-select and other Vue Flow selection changes
watch(getSelectedNodes, (selectedNodes) => {
  // Update tree selection to match canvas selection
  selectedTreeNodeIds.value = selectedNodes.map(node => node.id);
}, { deep: true });

// ============================================================================
// LIFECYCLE HOOKS
// ============================================================================

// Register event listeners and keyboard handler
onMounted(() => {
  // Register event bus listeners
  eventBus.on('tree:node-selected', handleTreeNodeSelected);
  eventBus.on('canvas:node-selected', handleCanvasNodeSelected);
  eventBus.on('canvas:pane-clicked', handleCanvasPaneClicked);
  eventBus.on('node:edit-end', handleNodeEditEnd);
  eventBus.on('node:title-updated', handleNodeTitleUpdated);

  // Register keyboard event listeners
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keydown', onAltKeyDown);
  window.addEventListener('keyup', onAltKeyUp);

  // Initialize D3 simulation
  initSimulation();

  // Initialize Matter.js physics engine
  initMatterEngine();

  // Load list of saved mindmaps
  loadMindmapsList();
});

// Clean up event listeners
onBeforeUnmount(() => {
  // Remove event bus listeners
  eventBus.off('tree:node-selected', handleTreeNodeSelected);
  eventBus.off('canvas:node-selected', handleCanvasNodeSelected);
  eventBus.off('canvas:pane-clicked', handleCanvasPaneClicked);
  eventBus.off('node:edit-end', handleNodeEditEnd);
  eventBus.off('node:title-updated', handleNodeTitleUpdated);

  // Clear any pending debounced update
  if (titleUpdateDebounceTimer) {
    clearTimeout(titleUpdateDebounceTimer);
    titleUpdateDebounceTimer = null;
  }

  // Remove keyboard event listeners
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keydown', onAltKeyDown);
  window.removeEventListener('keyup', onAltKeyUp);

  // Stop D3 simulation
  if (simulation) {
    simulation.stop();
  }

  // Clean up Matter.js engine
  if (matterEngine && matterWorld) {
    Matter.World.clear(matterWorld, false);
    Matter.Engine.clear(matterEngine);
    matterEngine = null;
    matterWorld = null;
    nodeBodies.clear();
  }
});
</script>

<style scoped>
.vueflow-test-page {
  position: relative;
  height: 100vh;
  width: 100%;
}

.vue-flow-container {
  height: 100vh;
  width: 100%;
}

/* Drawer styling */
.param-control {
  margin-bottom: 24px;
}

.mode-control {
  background: #f0f4ff;
  padding: 16px;
  border-radius: 8px;
  border: 2px solid #1976d2;
}

.mode-option {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mode-label {
  font-weight: 500;
  color: #333;
}

.mode-description {
  font-size: 12px;
  color: #666;
  font-style: italic;
}

.param-label {
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.param-value {
  font-size: 18px;
  font-weight: 600;
  color: #1976d2;
  margin-bottom: 8px;
}

.param-hint {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
  font-style: italic;
}

/* Selected node styling - subtle background change */
:deep(.vue-flow__node.selected) .custom-node {
  background: #e3f2fd;
  box-shadow: 0 0 0 2px #1976d2;
}

/* Center handle - invisible but functional */
:deep(.center-handle) {
  width: 1px;
  height: 1px;
  background: transparent;
  border: none;
  opacity: 0;
  pointer-events: all;
}

/* Optional: Show a small dot on hover for debugging */
.custom-node:hover :deep(.center-handle) {
  opacity: 0.5;
  width: 10px;
  height: 10px;
  background: #1976d2;
  border-radius: 50%;
}

/* Edge styling - hierarchy edges (solid blue lines) */
:deep(.vue-flow__edge.edge-hierarchy .vue-flow__edge-path) {
  stroke: #1976d2 !important;
  stroke-width: 2px !important;
}

/* Edge styling - reference edges (dashed orange lines) */
:deep(.vue-flow__edge.edge-reference .vue-flow__edge-path) {
  stroke: #ff9800 !important;
  stroke-width: 2px !important;
  stroke-dasharray: 5, 5 !important;
}

/* Edge styling - default (fallback) */
:deep(.vue-flow__edge-path) {
  stroke: #b1b1b7 !important;
  stroke-width: 2px !important;
}

/* Edge styling - selected */
:deep(.vue-flow__edge.selected .vue-flow__edge-path) {
  stroke-width: 3px !important;
}

/* Edge styling - make edges easier to interact with */
:deep(.vue-flow__edge) {
  cursor: pointer;
}



/* Simulation indicator */
.simulation-indicator {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  background: rgba(25, 118, 210, 0.95);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: pulse 2s ease-in-out infinite;
}



@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.85;
  }
}

/* Tree view selection styling - subtle background for selected nodes */
.tree-node-header {
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.tree-node-selected {
  background-color: #e3f2fd !important;
}

:deep(.q-tree__node-header:hover) {
  background-color: #f5f5f5;
}

/* Override Quasar's default selection styling */
:deep(.q-tree__node--selected .q-tree__node-header) {
  color: inherit !important;
}
</style>

