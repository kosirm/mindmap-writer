<template>
  <q-layout view="hHh LpR fff">
    <!-- Header -->
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn
          dense
          flat
          round
          icon="menu"
          @click="toggleLeftDrawer"
        >
          <q-tooltip>Toggle Left Panel</q-tooltip>
        </q-btn>

        <q-toolbar-title>
          <q-avatar size="32px">
            <q-icon name="account_tree" />
          </q-avatar>
          Mindmap Writer
        </q-toolbar-title>

        <q-btn
          dense
          flat
          round
          icon="menu"
          @click="toggleRightDrawer"
        >
          <q-tooltip>Toggle Right Panel</q-tooltip>
        </q-btn>
      </q-toolbar>
    </q-header>

    <!-- Left Drawer (Resizable) -->
    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      :width="leftDrawerWidth"
      :breakpoint="0"
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
                  ref="treeRef"
                  :nodes="treeData as any"
                  node-key="id"
                  :selected="selectedTreeNodeIds"
                  :expanded="expandedTreeNodeIds"
                  default-expand-all
                  no-connectors
                  @update:selected="onTreeNodeSelected"
                  @update:expanded="onTreeExpanded"
                >
                  <template v-slot:default-header="prop">
                    <div
                      class="row items-center tree-node-header"
                      :class="{ 'tree-node-selected': selectedTreeNodeIds.includes(prop.node.id) }"
                      :data-node-id="prop.node.id"
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

      <!-- Resizer for left drawer -->
      <div
        autofocus
        tabindex="0"
        v-touch-pan.preserveCursor.prevent.mouse.horizontal="resizeLeftDrawer"
        @keydown="resizeLeftDrawer"
        class="q-drawer__resizer"
      />
    </q-drawer>

    <!-- Right Drawer -->
    <q-drawer
      v-model="rightDrawerOpen"
      :width="rightDrawerWidth"
      :breakpoint="0"
      side="right"
      bordered
      class="bg-grey-1"
    >
      <q-scroll-area class="fit">
        <div class="q-pa-md">
          <div class="text-h6 q-mb-md">Right Panel</div>
          <div class="text-grey-7">
            Future features will be added here (e.g., properties panel, formatting tools, etc.)
          </div>
        </div>
      </q-scroll-area>

      <!-- Resizer for right drawer -->
      <div
        autofocus
        tabindex="0"
        v-touch-pan.preserveCursor.prevent.mouse.horizontal="resizeRightDrawer"
        @keydown="resizeRightDrawer"
        class="q-drawer__resizer q-drawer__resizer--right"
      />
    </q-drawer>

    <!-- Page Container -->
    <q-page-container>
      <q-page class="vueflow-test-page">
        <!-- Simulation running indicator -->
        <div v-if="isSimulationRunning" class="simulation-indicator">
          <q-spinner-dots color="primary" size="20px" />
          <span>Layout in progress... (nodes locked)</span>
        </div>

        <!-- Split view container -->
        <div class="split-view-container">
      <!-- Split view with resizable panels -->
      <q-splitter
        v-if="viewMode === 'split'"
        v-model="splitterModel"
        class="split-view"
      >
        <!-- Mindmap panel -->
        <template #before>
          <div class="panel-container">
            <div class="panel-header">
              <span class="panel-title">Mindmap View</span>
              <q-btn
                flat
                dense
                round
                size="sm"
                icon="fullscreen"
                @click="viewMode = 'mindmap'"
              >
                <q-tooltip>Maximize Mindmap</q-tooltip>
              </q-btn>
            </div>
            <div class="mindmap-container">
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

                <!-- Custom node template using CustomNode component -->
                <template #node-custom="nodeProps">
                  <CustomNode
                    :id="nodeProps.id"
                    :data="nodeProps.data"
                    @update:data="(newData) => updateNodeData(nodeProps.id, newData)"
                  />
                </template>
              </VueFlow>
            </div>
          </div>
        </template>

        <!-- Writer panel -->
        <template #after>
          <div class="panel-container">
            <div class="panel-header">
              <span class="panel-title">Writer</span>
              <q-btn
                flat
                dense
                round
                size="sm"
                icon="fullscreen"
                @click="viewMode = 'writer'"
              >
                <q-tooltip>Maximize Writer</q-tooltip>
              </q-btn>
            </div>
            <WriterEditor :nodes="nodesWithChildren" />
          </div>
        </template>
      </q-splitter>

      <!-- Mindmap only view -->
      <div v-else-if="viewMode === 'mindmap'" class="full-view">
        <div class="panel-container">
          <div class="panel-header">
            <span class="panel-title">Mindmap View</span>
            <q-btn
              flat
              dense
              round
              size="sm"
              icon="fullscreen_exit"
              @click="viewMode = 'split'"
            >
              <q-tooltip>Back to Split View</q-tooltip>
            </q-btn>
          </div>
          <div class="mindmap-container">
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

              <!-- Custom node template using CustomNode component -->
              <template #node-custom="nodeProps">
                <CustomNode
                  :id="nodeProps.id"
                  :data="nodeProps.data"
                  @update:data="(newData) => updateNodeData(nodeProps.id, newData)"
                />
              </template>
            </VueFlow>
          </div>
        </div>
      </div>

      <!-- Writer only view -->
      <div v-else-if="viewMode === 'writer'" class="full-view">
        <div class="panel-container">
          <div class="panel-header">
            <span class="panel-title">Writer</span>
            <q-btn
              flat
              dense
              round
              size="sm"
              icon="fullscreen_exit"
              @click="viewMode = 'split'"
            >
              <q-tooltip>Back to Split View</q-tooltip>
            </q-btn>
          </div>
          <WriterEditor :nodes="nodesWithChildren" />
        </div>
      </div>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { VueFlow, useVueFlow, ConnectionLineType } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import type { Node, Edge } from '@vue-flow/core';
import { Notify } from 'quasar';
import { eventBus } from '../composables/useEventBus';
import CustomNode from '../components/CustomNode.vue';
import WriterEditor from '../components/WriterEditor.vue';
import { useD3Force, type D3ForceParams } from '../composables/useD3Force';
import { useMatterCollision, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../composables/useMatterCollision';
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
const rightDrawerOpen = ref(false);
const activeTab = ref('tree'); // Default to Tree tab

// Drawer widths (for resizing)
const leftDrawerWidth = ref(350);
const rightDrawerWidth = ref(300);
let initialLeftDrawerWidth = 350;
let initialRightDrawerWidth = 300;

// View mode: 'split', 'mindmap', 'writer'
const viewMode = ref<'split' | 'mindmap' | 'writer'>('split');

// Splitter model (percentage for left panel)
const splitterModel = ref(50);

// Drawer toggle functions
function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

function toggleRightDrawer() {
  rightDrawerOpen.value = !rightDrawerOpen.value;
}

// Drawer resize functions
interface TouchPanEvent {
  evt?: Event;
  touch?: boolean;
  mouse?: boolean;
  position?: { top?: number; left?: number };
  direction?: 'left' | 'right' | 'up' | 'down';
  isFirst?: boolean;
  isFinal?: boolean;
  duration?: number;
  distance?: { x?: number; y?: number };
  offset?: { x?: number; y?: number };
  delta?: { x?: number; y?: number };
}

function resizeLeftDrawer(ev: KeyboardEvent | TouchPanEvent) {
  if ('code' in ev) {
    // Keyboard event
    if (ev.code === 'ArrowLeft') {
      leftDrawerWidth.value -= 1;
    } else if (ev.code === 'ArrowRight') {
      leftDrawerWidth.value += 1;
    }
  } else {
    // Touch pan event
    if (ev.isFirst === true) {
      initialLeftDrawerWidth = leftDrawerWidth.value;
    }
    leftDrawerWidth.value = initialLeftDrawerWidth + (ev.offset?.x ?? 0);
  }
  // Constrain width between 200px and 800px
  leftDrawerWidth.value = Math.max(200, Math.min(800, leftDrawerWidth.value));
}

function resizeRightDrawer(ev: KeyboardEvent | TouchPanEvent) {
  if ('code' in ev) {
    // Keyboard event
    if (ev.code === 'ArrowLeft') {
      rightDrawerWidth.value += 1;
    } else if (ev.code === 'ArrowRight') {
      rightDrawerWidth.value -= 1;
    }
  } else {
    // Touch pan event
    if (ev.isFirst === true) {
      initialRightDrawerWidth = rightDrawerWidth.value;
    }
    // For right drawer, we subtract the offset (dragging right decreases width)
    rightDrawerWidth.value = initialRightDrawerWidth - (ev.offset?.x ?? 0);
  }
  // Constrain width between 200px and 800px
  rightDrawerWidth.value = Math.max(200, Math.min(800, rightDrawerWidth.value));
}

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

// D3 Mode: 'off' | 'manual' | 'auto'
const d3Mode = ref<'off' | 'manual' | 'auto'>('off'); // Default to OFF (full manual control)

// Matter.js collision state
const matterEnabled = ref(true); // Matter.js collision detection ON by default
const isAltKeyPressed = ref(false); // Track Alt key for disabling collision while dragging

// D3 Force parameters (adjustable)
const forceParams = ref<D3ForceParams>({
  chargeStrength: -300,      // How strongly nodes repel each other
  collisionRadius: 60,       // Minimum distance between nodes (collision detection)
  positionStrength: 0.1,     // How strongly nodes stick to their intended position
  alphaDecay: 0.05,          // How quickly simulation cools down (higher = faster)
  linkDistance: 150,         // Desired distance between connected nodes
});

// Initialize Matter.js composable
const {
  matterEngine,
  matterWorld,
  nodeBodies,
  getNodeDimensions,
  initMatterEngine,
  createMatterBody,
  updateMatterBodyPosition,
  updateMatterBodyDimensions,
  runMatterEngineToResolveOverlaps,
  pushNodesAwayFromPosition,
  cleanup: cleanupMatter,
} = useMatterCollision(nodes, matterEnabled);

// Initialize D3 Force composable
const {
  isSimulationRunning,
  initSimulation,
  runSimulation,
  runD3ForceOnce,
  cleanup: cleanupD3,
} = useD3Force(
  nodes,
  edges,
  forceParams,
  matterEnabled,
  updateMatterBodyPosition,
  runMatterEngineToResolveOverlaps
);

// Resolve overlaps once using Matter.js physics engine
function resolveOverlapsOnce() {
  console.log('[Matter.js] Running physics engine once to resolve overlaps...');
  runMatterEngineToResolveOverlaps();
}

// Node counter for unique IDs
let nodeCounter = 1;

// Get Vue Flow instance
const { project, vueFlowRef, connectionStartHandle, getSelectedNodes, getSelectedEdges, addSelectedNodes, removeSelectedNodes, setCenter, getViewport } = useVueFlow();

// Track if we're currently dragging a connection
const isDraggingConnection = ref(false);

// Track if Shift key is pressed during connection drag
const isShiftPressed = ref(false);

// Track selected nodes in tree view (supports multiple selection)
const selectedTreeNodeIds = ref<string[]>([]);

// Track expanded nodes in tree view
const expandedTreeNodeIds = ref<string[]>([]);

// Reference to the q-tree component
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const treeRef = ref<any>(null);

// Track if tree selection change is programmatic (to prevent circular events)
const isTreeSelectionProgrammatic = ref(false);

// Computed: Find all root nodes (nodes with no parent)
const rootNodes = computed(() => {
  return nodes.value.filter(node => !node.data.parentId);
});

// Tree node interface for q-tree component
interface TreeNode {
  id: string;
  label: string;  // q-tree requires 'label' property for display
  children?: TreeNode[] | undefined;
  childCount: number;
}

// Helper function to strip HTML tags from text
function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

// Computed: Build tree data structure for q-tree component
const treeData = computed(() => {
  // Helper function to build tree recursively
  function buildTree(parentId: string | null): TreeNode[] {
    const children = nodes.value.filter(node => node.data.parentId === parentId);

    // Sort children by order
    children.sort((a, b) => (a.data.order || 0) - (b.data.order || 0));

    return children.map(node => {
      const nodeChildren = buildTree(node.id);
      const treeNode: TreeNode = {
        id: node.id,
        label: stripHtml(node.data.title || 'Untitled'),  // Strip HTML tags from title
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

// Computed: Build nodes with children array for Writer component
const nodesWithChildren = computed(() => {
  // Create a deep copy of nodes to avoid mutating the original
  const nodesCopy = nodes.value.map(node => ({
    ...node,
    data: {
      ...node.data,
      children: [] as Node[],
    },
  }));

  // Build a map for quick lookup
  const nodeMap = new Map<string, Node>();
  nodesCopy.forEach(node => nodeMap.set(node.id, node));

  // Populate children arrays
  nodesCopy.forEach(node => {
    if (node.data.parentId) {
      const parent = nodeMap.get(node.data.parentId);
      if (parent && parent.data.children) {
        parent.data.children.push(node);
      }
    }
  });

  // Sort children by order
  nodesCopy.forEach(node => {
    if (node.data.children && node.data.children.length > 0) {
      node.data.children.sort((a: Node, b: Node) => (a.data.order || 0) - (b.data.order || 0));
    }
  });

  return nodesCopy;
});

// Create a new node at the given position
// NOTE: Caller must add the node to nodes.value array AFTER calling this function
// so that the node renders in DOM and we can read its actual dimensions
function createNode(x: number, y: number, title?: string, parentId?: string): Node {
  const id = String(nodeCounter++);

  const newNode: Node = {
    id,
    type: 'custom',
    position: { x, y },  // VueFlow uses top-left
    data: {
      // Custom fields for our mindmap
      parentId: parentId || null,  // For hierarchy - which node is the parent
      content: '',  // Rich text content (will be HTML from Tiptap later)
      title: title || '',  // Node title (editable with Tiptap) - empty by default (common mindmap practice)
      order: 0,  // Order within parent (or among root nodes) - will be set correctly when added
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
function updateNodeData(nodeId: string, newData: { title: string; content: string; parentId: string | null }) {
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
  // Don't handle keyboard shortcuts if user is typing in an input/textarea/contenteditable
  // This prevents conflicts with Writer's Tiptap editors
  const target = event.target as HTMLElement;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
    return;
  }

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

  // Handle F2 key - start editing selected node
  if (event.key === 'F2') {
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
    // Initialize Matter.js engine if it doesn't exist yet
    if (!matterEngine || !matterWorld) {
      initMatterEngine();
    }

    if (matterEngine && matterWorld) {
      // Clear existing bodies
      nodeBodies.forEach((body) => {
        Matter.World.remove(matterWorld, body);
      });
      nodeBodies.clear();

      // Wait for DOM to render, then create bodies with actual dimensions
      void nextTick(() => {
        nodes.value.forEach(node => {
          createMatterBody(node);
        });
        console.log(`Created Matter.js bodies for ${nodes.value.length} loaded nodes`);

        // Run Matter.js collision resolution once to sync positions
        // This ensures collision detection works properly for loaded nodes
        runMatterEngineToResolveOverlaps();
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
  // If this is a programmatic change (from canvas or writer), don't emit event
  if (isTreeSelectionProgrammatic.value) {
    // Don't reset flag here - let the caller handle it with nextTick
    return;
  }

  // Emit event - canvas will listen and update itself
  eventBus.emit('tree:node-selected', { nodeId });
}

// Handle tree expansion changes
function onTreeExpanded(expanded: readonly string[]) {
  expandedTreeNodeIds.value = [...expanded];
}

// ============================================================================
// EVENT BUS HANDLERS
// ============================================================================

// Handle tree node selection event - update canvas and writer
function handleTreeNodeSelected({ nodeId }: { nodeId: string | null }) {
  if (!nodeId) {
    // Deselect all nodes in canvas
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    removeSelectedNodes(nodes.value as any);
    selectedNodeId.value = null; // Clear for keyboard shortcuts
    // Notify writer to clear selection
    eventBus.emit('writer:node-selected', { nodeId: null, scrollIntoView: false, source: 'tree' });
    return;
  }

  // Find the node in the canvas
  const node = nodes.value.find(n => n.id === nodeId);
  if (node) {
    // Select this node in the canvas (this will deselect others)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addSelectedNodes([node as any]);
    selectedNodeId.value = nodeId; // Update for keyboard shortcuts

    // Notify writer to select this node and scroll into view (tree selection should scroll writer)
    eventBus.emit('writer:node-selected', { nodeId, scrollIntoView: true, source: 'tree' });

    // Bring node into view in mindmap (tree selection should center canvas on node)
    bringNodeIntoView(nodeId);
  }
}

// Handle canvas node selection event - update tree and writer
function handleCanvasNodeSelected({ nodeId }: { nodeId: string }) {
  const node = nodes.value.find(n => n.id === nodeId);
  if (!node) return;

  // Check if node is already selected
  const alreadySelected = getSelectedNodes.value.some(n => n.id === nodeId);

  // Only call addSelectedNodes if not already selected (Vue Flow auto-selects on click)
  if (!alreadySelected) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addSelectedNodes([node as any]);
  }

  // Set flag to prevent tree from emitting event (avoid circular loop)
  isTreeSelectionProgrammatic.value = true;

  // Update tree selection to match canvas selection
  selectedTreeNodeIds.value = [nodeId];
  selectedNodeId.value = nodeId; // Update for keyboard shortcuts

  // Reset flag after Vue updates the tree (use nextTick to ensure proper timing)
  void nextTick(() => {
    isTreeSelectionProgrammatic.value = false;
  });

  // Notify writer to select this node and scroll into view (canvas selection should scroll writer)
  eventBus.emit('writer:node-selected', { nodeId, scrollIntoView: true, source: 'canvas' });

  // Scroll tree node into view (canvas selection should scroll tree)
  scrollTreeNodeIntoView(nodeId);

  // Do NOT move the canvas - the node is already visible since user clicked it
}

// Handle writer node selection event - update tree and canvas
function handleWriterNodeSelected({ nodeId, source }: { nodeId: string | null; source: 'writer' | 'canvas' | 'tree' }) {
  if (!nodeId) {
    // Deselect all
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    removeSelectedNodes(nodes.value as any);
    selectedTreeNodeIds.value = [];
    selectedNodeId.value = null;
    return;
  }

  const node = nodes.value.find(n => n.id === nodeId);
  if (node) {
    // Only update canvas and tree if source is 'writer' (not 'canvas' or 'tree')
    if (source === 'writer') {
      // Select in canvas
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      addSelectedNodes([node as any]);

      // Set flag to prevent tree from emitting event (avoid circular loop)
      isTreeSelectionProgrammatic.value = true;

      // Select in tree
      selectedTreeNodeIds.value = [nodeId];
      selectedNodeId.value = nodeId;

      // Reset flag after Vue updates the tree
      void nextTick(() => {
        isTreeSelectionProgrammatic.value = false;
      });

      // Bring node into view in mindmap (writer selection should scroll mindmap)
      bringNodeIntoView(nodeId);

      // Scroll tree node into view (writer selection should scroll tree)
      scrollTreeNodeIntoView(nodeId);
    } else {
      console.log('[DEBUG] Source is', source, '- writer will handle its own scrolling via event listener');
      // Writer component will handle scrolling itself via the event listener
    }
  }
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

// Handle node update event from Writer - update node data
function handleNodeUpdate({ nodeId, title, content }: { nodeId: string; title?: string; content?: string }) {
  const node = nodes.value.find(n => n.id === nodeId);
  if (!node) return;

  // Update the fields that were provided
  if (title !== undefined) {
    node.data.title = title;
    // Also trigger dimension update for Matter.js
    handleNodeTitleUpdated({ nodeId, title });
  }
  if (content !== undefined) {
    node.data.content = content;
  }
}

// Handle hierarchy change from Writer drag-and-drop
// This updates the node's parentId and creates/removes hierarchy edges
function updateNodeHierarchy(nodeId: string, newParentId: string | null) {
  const node = nodes.value.find(n => n.id === nodeId);
  if (!node) return;

  const oldParentId = node.data.parentId;

  // Check for circular reference if setting a new parent
  if (newParentId && wouldCreateCircularReference(newParentId, nodeId)) {
    Notify.create({
      type: 'negative',
      message: 'Cannot move node: This would create a circular reference!',
      position: 'top',
      timeout: 3000,
    });
    return false;
  }

  // Remove old hierarchy edge if exists
  if (oldParentId) {
    const edgeIndex = edges.value.findIndex(
      edge => edge.data?.edgeType === 'hierarchy' &&
              edge.source === oldParentId &&
              edge.target === nodeId
    );
    if (edgeIndex !== -1) {
      edges.value.splice(edgeIndex, 1);
    }
  }

  // Update parentId
  node.data.parentId = newParentId;

  // Create new hierarchy edge if new parent exists
  if (newParentId) {
    const newEdge = createEdge(newParentId, nodeId, 'hierarchy');
    edges.value.push(newEdge);
  }

  return true;
}

// Bring a node into view in the mindmap (VueFlow)
function bringNodeIntoView(nodeId: string) {
  console.log('[DEBUG] bringNodeIntoView called for nodeId:', nodeId);
  console.trace('[DEBUG] Stack trace:');

  const node = nodes.value.find(n => n.id === nodeId);
  if (!node) return;

  // Get current zoom level to preserve it
  const currentViewport = getViewport();

  console.log('[DEBUG] Calling setCenter with position:', node.position.x, node.position.y, 'zoom:', currentViewport.zoom);

  // Use setCenter to pan to the node while preserving zoom level
  void nextTick(() => {
    void setCenter(node.position.x, node.position.y, {
      duration: 300,
      zoom: currentViewport.zoom, // Explicitly preserve current zoom
    });
  });
}

// Helper function to get all ancestor node IDs for a given node
function getAncestorNodeIds(nodeId: string): string[] {
  const ancestors: string[] = [];
  let currentNode = nodes.value.find(n => n.id === nodeId);

  while (currentNode?.data?.parentId) {
    ancestors.push(currentNode.data.parentId);
    currentNode = nodes.value.find(n => n.id === currentNode!.data.parentId);
  }

  return ancestors;
}

// Scroll tree node into view in the tree panel
function scrollTreeNodeIntoView(nodeId: string) {
  // First, expand all ancestor nodes to make sure the target node is visible
  const ancestors = getAncestorNodeIds(nodeId);

  // Add all ancestors to the expanded list if they're not already there
  const newExpandedIds = new Set([...expandedTreeNodeIds.value, ...ancestors]);
  expandedTreeNodeIds.value = Array.from(newExpandedIds);

  // Wait for the tree to update and then scroll
  void nextTick(() => {
    // Give the tree a moment to render the expanded nodes
    setTimeout(() => {
      // Find the tree node element by looking for the node with matching id
      const treeElement = document.querySelector(`[data-node-id="${nodeId}"]`);
      if (treeElement) {
        treeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }, 100); // Small delay to ensure DOM is updated
  });
}

// Handle canvas pane click event - deselect all
function handleCanvasPaneClicked() {
  // Deselect all nodes in canvas
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  removeSelectedNodes(nodes.value as any);
  // Clear tree selection
  selectedTreeNodeIds.value = [];
  selectedNodeId.value = null; // Clear for keyboard shortcuts
  // Notify writer to clear selection
  eventBus.emit('writer:node-selected', { nodeId: null, scrollIntoView: false, source: 'canvas' });
}

// Watch for canvas selection changes - sync to tree and writer
// This watcher is still needed to handle multi-select and other Vue Flow selection changes
watch(getSelectedNodes, (selectedNodes) => {
  const selectedIds = selectedNodes.map(node => node.id);

  // Update tree selection to match canvas selection
  selectedTreeNodeIds.value = selectedIds;

  // Update writer selection to match canvas selection (support multi-select)
  if (selectedIds.length === 0) {
    // No selection - clear writer
    eventBus.emit('writer:node-selected', { nodeId: null, scrollIntoView: false, source: 'canvas' });
  } else if (selectedIds.length === 1) {
    // Single selection - use existing event (backward compatibility)
    const firstId = selectedIds[0];
    if (firstId) {
      eventBus.emit('writer:node-selected', { nodeId: firstId, scrollIntoView: false, source: 'canvas' });
    }
  } else {
    // Multiple selection - use new multi-select event
    eventBus.emit('writer:nodes-selected', { nodeIds: selectedIds });
  }
}, { deep: true });

// ============================================================================
// LIFECYCLE HOOKS
// ============================================================================

// Register event listeners and keyboard handler
onMounted(() => {
  // Register event bus listeners
  eventBus.on('tree:node-selected', handleTreeNodeSelected);
  eventBus.on('canvas:node-selected', handleCanvasNodeSelected);
  eventBus.on('writer:node-selected', handleWriterNodeSelected);
  eventBus.on('canvas:pane-clicked', handleCanvasPaneClicked);
  eventBus.on('node:edit-end', handleNodeEditEnd);
  eventBus.on('node:title-updated', handleNodeTitleUpdated);
  eventBus.on('node:update', handleNodeUpdate);
  eventBus.on('writer:hierarchy-changed', ({ nodeId, newParentId, newOrder }) => {
    updateNodeHierarchy(nodeId, newParentId);

    // Update the order field
    const node = nodes.value.find(n => n.id === nodeId);
    if (node) {
      node.data.order = newOrder;
    }
  });

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
  eventBus.off('writer:node-selected', handleWriterNodeSelected);
  eventBus.off('canvas:pane-clicked', handleCanvasPaneClicked);
  eventBus.off('node:edit-end', handleNodeEditEnd);
  eventBus.off('node:title-updated', handleNodeTitleUpdated);
  eventBus.off('node:update', handleNodeUpdate);
  // Note: Arrow function listeners can't be removed, but they'll be garbage collected

  // Clear any pending debounced update
  if (titleUpdateDebounceTimer) {
    clearTimeout(titleUpdateDebounceTimer);
    titleUpdateDebounceTimer = null;
  }

  // Remove keyboard event listeners
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keydown', onAltKeyDown);
  window.removeEventListener('keyup', onAltKeyUp);

  // Clean up D3 and Matter.js
  cleanupD3();
  cleanupMatter();
});
</script>

<style scoped>
.vueflow-test-page {
  position: relative;
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  /* Prevent text selection when shift-dragging in VueFlow */
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.vue-flow-container {
  height: 100%;
  width: 100%;
  flex: 1;
  /* Prevent text selection during shift-drag selection */
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

/* Drawer styling */
/* Allow text selection in left drawer */
:deep(.q-drawer) {
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
}

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

/* Prevent text selection in tree view */
:deep(.q-tree) {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

/* Split view styles */
.split-view-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.split-view {
  height: 100%;
}

.full-view {
  width: 100%;
  height: 100%;
}

.panel-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #ffffff;
  /* Allow text selection in Writer panel */
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  background-color: #fafafa;
  flex-shrink: 0;
}

.panel-title {
  font-weight: 600;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.87);
}

.mindmap-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.mindmap-container .vue-flow-container {
  width: 100%;
  height: 100%;
}

/* Drawer resizer styles */
.q-drawer__resizer {
  position: absolute;
  top: 0;
  bottom: 0;
  right: -2px;
  width: 4px;
  background-color: #ebe4e4;
  cursor: ew-resize;
  z-index: 1000;
}

.q-drawer__resizer:after {
  content: '';
  position: absolute;
  top: 50%;
  height: 30px;
  left: -5px;
  right: -5px;
  transform: translateY(-50%);
  background-color: inherit;
  border-radius: 4px;
}

/* Right drawer resizer (on the left side of right drawer) */
.q-drawer__resizer--right {
  left: -2px;
  right: auto;
}

/* Page styles */
.vueflow-test-page {
  height: calc(100vh - 50px);
}
</style>

