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
              <div class="text-h6 q-mb-md">D3 Simulation Control</div>

              <!-- D3 Mode Selection -->
              <div class="param-control mode-control">
                <div class="text-subtitle2 q-mb-sm">Simulation Mode</div>
                <q-option-group
                  v-model="d3Mode"
                  :options="[
                    { label: 'OFF - Full Manual Control', value: 'off', description: 'Nodes can overlap, you control everything' },
                    { label: 'Manual - Run on Demand', value: 'manual', description: 'Click button to prevent overlaps' },
                    { label: 'AUTO - Always Active', value: 'auto', description: 'Automatic collision prevention' }
                  ]"
                  color="primary"
                  @update:model-value="onModeChange"
                >
                  <template v-slot:label="opt">
                    <div class="mode-option">
                      <div class="mode-label">{{ opt.label }}</div>
                      <div class="mode-description">{{ opt.description }}</div>
                    </div>
                  </template>
                </q-option-group>
              </div>

              <!-- Run Simulation Button (only in manual mode) -->
              <div v-if="d3Mode === 'manual'" class="q-mb-md">
                <q-btn
                  label="Run D3 Simulation Once"
                  color="primary"
                  icon="play_arrow"
                  class="full-width"
                  @click="runSimulation"
                  :disable="isSimulationRunning"
                />
              </div>

              <q-separator class="q-my-md" />

              <!-- Collision Radius (always active) -->
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
                <div class="param-hint">Minimum distance between nodes (lower = denser map)</div>
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
                <div class="param-hint">Higher = faster simulation (less smooth)</div>
              </div>

              <q-separator class="q-my-md" />

              <!-- Link Distance (always visible) -->
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
                <div class="param-hint">Desired distance between connected nodes</div>
              </div>

              <!-- Advanced Force Settings (only when simulation is active) -->
              <template v-if="d3Mode !== 'off'">
                <q-separator class="q-my-md" />
                <div class="text-subtitle2 q-mb-md text-grey-7">Advanced Force Settings</div>

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
                  <div class="param-hint">Higher = stronger repulsion between nodes</div>
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
                  <div class="param-hint">How strongly nodes stick to intended position</div>
                </div>

                <q-btn
                  label="Apply Parameters"
                  color="secondary"
                  outline
                  class="full-width q-mt-md"
                  @click="applyForceParams"
                  :disable="isSimulationRunning"
                />
              </template>
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
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { VueFlow, useVueFlow, ConnectionLineType } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import type { Node, Edge } from '@vue-flow/core';
import * as d3 from 'd3-force';
import { Notify } from 'quasar';
import { eventBus } from '../composables/useEventBus';
import CustomNode from '../components/CustomNode.vue';

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
  console.log('Simulation finished - nodes can be dragged again');
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

// Create a new node at the given position
function createNode(x: number, y: number, label?: string, parentId?: string): Node {
  const id = String(nodeCounter++);
  return {
    id,
    type: 'custom',
    position: { x, y },
    data: {
      label: label || `Node ${id}`,  // Fallback label for display (will be removed later)
      // Custom fields for our mindmap
      parentId: parentId || null,  // For hierarchy - which node is the parent
      content: '',  // Rich text content (will be HTML from Tiptap later)
      title: label || `Node ${id}`,  // Node title (editable with Tiptap) - initialize with label
    },
  };
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
    // Get the bounding rect of the Vue Flow container
    const flowElement = vueFlowRef.value;
    if (!flowElement) return;

    const rect = flowElement.getBoundingClientRect();

    // Calculate position relative to the flow container
    const x = mouseEvent.clientX - rect.left;
    const y = mouseEvent.clientY - rect.top;

    // Convert to flow coordinates
    const position = project({ x, y });

    // Create a new node at the clicked position
    const newNode = createNode(position.x, position.y);
    nodes.value.push(newNode);

    // Run simulation to avoid collisions (only in AUTO mode)
    if (d3Mode.value === 'auto') {
      runSimulation();
    }
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

  // Run simulation to avoid collisions (only in AUTO mode)
  if (d3Mode.value === 'auto') {
    runSimulation();
  }
}

// Handle node drag stop - run simulation to push other nodes (only in AUTO mode)
function onNodeDragStop() {
  if (d3Mode.value === 'auto') {
    runSimulation();
  }
}

// Handle mode change
function onModeChange(newMode: 'off' | 'manual' | 'auto') {
  console.log('D3 Mode changed to:', newMode);
  // No automatic action needed - simulation will run based on mode
}

// Apply force parameters and re-run simulation
function applyForceParams() {
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

  // Run simulation to avoid collisions (only in AUTO mode)
  if (d3Mode.value === 'auto') {
    runSimulation();
  }
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

  // Register keyboard event listener
  window.addEventListener('keydown', onKeyDown);

  // Initialize D3 simulation
  initSimulation();

  // Load list of saved mindmaps
  loadMindmapsList();
});

// Clean up event listeners
onBeforeUnmount(() => {
  // Remove event bus listeners
  eventBus.off('tree:node-selected', handleTreeNodeSelected);
  eventBus.off('canvas:node-selected', handleCanvasNodeSelected);
  eventBus.off('canvas:pane-clicked', handleCanvasPaneClicked);

  // Remove keyboard event listener
  window.removeEventListener('keydown', onKeyDown);

  // Stop D3 simulation
  if (simulation) {
    simulation.stop();
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

