<template>
  <q-page class="mindmap-page">
    <!-- Right drawer for settings -->
    <q-drawer
      v-model="drawerOpen"
      side="right"
      bordered
      :width="300"
      overlay
      elevated
      class="settings-drawer"
    >
      <q-scroll-area class="fit">
        <q-btn
          flat
          dense
          round
          icon="close"
          class="absolute-top-right q-ma-sm"
          @click="drawerOpen = false"
        />

        <div class="q-pa-md q-pt-lg">
          <div class="text-h6 q-mb-md">Mindmap Settings</div>

          <q-separator class="q-mb-md" />

          <!-- Document Actions -->
          <div class="text-subtitle2 q-mb-sm">Document</div>

          <div class="q-mb-sm">
            <div class="text-caption q-mb-xs">{{ store.documentName }}</div>
            <div class="text-caption text-grey-7">{{ store.saveStatus }}</div>
          </div>

          <q-btn
            flat
            dense
            color="primary"
            icon="add"
            label="New"
            class="full-width q-mb-xs"
            @click="handleNewDocument"
          />

          <q-btn
            flat
            dense
            color="primary"
            icon="save"
            label="Save"
            class="full-width q-mb-xs"
            @click="handleSave"
          />

          <q-btn
            flat
            dense
            color="primary"
            icon="download"
            label="Export JSON"
            class="full-width q-mb-xs"
            @click="handleExport"
          />

          <q-btn
            flat
            dense
            color="primary"
            icon="upload"
            label="Import JSON"
            class="full-width q-mb-md"
            @click="handleImport"
          />

          <q-separator class="q-mb-md" />

          <div class="text-subtitle2 q-mb-sm">Orientation</div>
          <q-select
            v-model="config.orientation"
            :options="orientationOptions"
            outlined
            dense
            class="q-mb-md"
          />

          <div class="text-subtitle2 q-mb-sm">Branch ({{ config.branch }})</div>
          <q-slider
            v-model="config.branch"
            :min="1"
            :max="10"
            :step="1"
            label
            class="q-mb-md"
          />

          <div class="text-subtitle2 q-mb-sm">X Gap ({{ config.xGap }})</div>
          <q-slider
            v-model="config.xGap"
            :min="40"
            :max="200"
            :step="4"
            label
            class="q-mb-md"
          />

          <div class="text-subtitle2 q-mb-sm">Y Gap ({{ config.yGap }})</div>
          <q-slider
            v-model="config.yGap"
            :min="10"
            :max="50"
            :step="2"
            label
            class="q-mb-md"
          />

          <q-separator class="q-mb-md" />

          <div class="text-subtitle2 q-mb-sm">Features</div>

          <q-toggle
            v-model="config.zoom"
            label="Zoom"
            class="q-mb-sm"
          />

          <q-toggle
            v-model="config.drag"
            label="Drag"
            class="q-mb-sm"
          />

          <q-toggle
            v-model="config.edit"
            label="Edit"
            class="q-mb-sm"
          />

          <q-toggle
            v-model="config.keyboard"
            label="Keyboard Shortcuts"
            class="q-mb-sm"
          />

          <q-toggle
            v-model="config.ctm"
            label="Context Menu"
            class="q-mb-sm"
          />

          <q-toggle
            v-model="config.timetravel"
            label="Time Travel (Undo/Redo)"
            class="q-mb-sm"
          />

          <q-toggle
            v-model="config.sharpCorner"
            label="Sharp Corners"
            class="q-mb-sm"
          />

          <q-separator class="q-my-md" />

          <div class="text-subtitle2 q-mb-sm">Buttons</div>

          <q-toggle
            v-model="config.fitBtn"
            label="Fit Button"
            class="q-mb-sm"
          />

          <q-toggle
            v-model="config.centerBtn"
            label="Center Button"
            class="q-mb-sm"
          />

          <q-toggle
            v-model="config.downloadBtn"
            label="Download Button"
            class="q-mb-sm"
          />

          <q-toggle
            v-model="config.addNodeBtn"
            label="Add Node Button"
            class="q-mb-sm"
          />
        </div>
      </q-scroll-area>
    </q-drawer>

    <!-- Settings button (floating) -->
    <q-btn
      fab
      icon="settings"
      color="primary"
      class="settings-btn"
      @click="drawerOpen = !drawerOpen"
    />

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
              <mindmap
                :key="mindmapKey"
                v-model="mindmapData"
                :branch="config.branch"
                :x-gap="config.xGap"
                :y-gap="config.yGap"
                :zoom="config.zoom"
                :fit-btn="config.fitBtn"
                :center-btn="config.centerBtn"
                :download-btn="config.downloadBtn"
                :drag="config.drag"
                :edit="config.edit"
                :add-node-btn="config.addNodeBtn"
                :sharp-corner="config.sharpCorner"
                :ctm="config.ctm"
                :keyboard="config.keyboard"
                :timetravel="config.timetravel"
                :orientation="config.orientation"
              />
            </div>
          </div>
        </template>

        <!-- Text editor panel -->
        <template #after>
          <div class="panel-container">
            <div class="panel-header">
              <span class="panel-title">Text Editor</span>
              <div class="q-ml-auto row items-center q-gutter-xs">
                <!-- Mode toggle -->
                <q-btn-toggle
                  v-model="textEditorMode"
                  toggle-color="primary"
                  :options="[
                    { value: 'full', icon: 'description' },
                    { value: 'node', icon: 'article' }
                  ]"
                  size="sm"
                  dense
                  unelevated
                  class="text-editor-mode-toggle"
                >
                  <template #full>
                    <q-tooltip>Full Document - View all nodes</q-tooltip>
                  </template>
                  <template #node>
                    <q-tooltip>Node Content - Edit selected node only</q-tooltip>
                  </template>
                </q-btn-toggle>

                <q-btn
                  flat
                  dense
                  round
                  size="sm"
                  icon="fullscreen"
                  @click="viewMode = 'text'"
                >
                  <q-tooltip>Maximize Text Editor</q-tooltip>
                </q-btn>
              </div>
            </div>
            <tiptap-editor
              :model-value="store.currentDocument"
              :mode="textEditorMode"
              @update:model-value="handleTextEditorUpdate"
              @update:node-content="handleNodeContentUpdate"
              @update:mode="textEditorMode = $event"
            />
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
            <mindmap
              :key="mindmapKey"
              v-model="mindmapData"
              :branch="config.branch"
              :x-gap="config.xGap"
              :y-gap="config.yGap"
              :zoom="config.zoom"
              :fit-btn="config.fitBtn"
              :center-btn="config.centerBtn"
              :download-btn="config.downloadBtn"
              :drag="config.drag"
              :edit="config.edit"
              :add-node-btn="config.addNodeBtn"
              :sharp-corner="config.sharpCorner"
              :ctm="config.ctm"
              :keyboard="config.keyboard"
              :timetravel="config.timetravel"
              :orientation="config.orientation"
            />
          </div>
        </div>
      </div>

      <!-- Text editor only view -->
      <div v-else-if="viewMode === 'text'" class="full-view">
        <div class="panel-container">
          <div class="panel-header">
            <span class="panel-title">Text Editor</span>
            <div class="q-ml-auto row items-center q-gutter-xs">
              <!-- Mode toggle -->
              <q-btn-toggle
                v-model="textEditorMode"
                toggle-color="primary"
                :options="[
                  { value: 'full', icon: 'description' },
                  { value: 'node', icon: 'article' }
                ]"
                size="sm"
                dense
                unelevated
                class="text-editor-mode-toggle"
              >
                <template #full>
                  <q-tooltip>Full Document - View all nodes</q-tooltip>
                </template>
                <template #node>
                  <q-tooltip>Node Content - Edit selected node only</q-tooltip>
                </template>
              </q-btn-toggle>

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
          </div>
          <tiptap-editor
            :model-value="store.currentDocument"
            :mode="textEditorMode"
            @update:model-value="handleTextEditorUpdate"
            @update:node-content="handleNodeContentUpdate"
            @update:mode="textEditorMode = $event"
          />
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useQuasar, Notify } from 'quasar';
import Mindmap from 'components/Mindmap';
import TiptapEditor from 'components/TiptapEditor.vue';
import { useMindmapStore, type MindmapData, type MindmapNode } from 'stores/mindmap';
import { useViewSync } from 'src/composables/useViewSync';
import emitter from 'src/mitt';
import style from 'components/Mindmap/css';

// Store
const store = useMindmapStore();
const $q = useQuasar();
const viewSync = useViewSync('mindmap');

// Text editor mode
const textEditorMode = ref<'full' | 'node'>('full');

// Key to force mindmap re-render when data changes
const mindmapKey = ref(0);

// Orientation type
type Orientation = 'clockwise' | 'anticlockwise' | 'right-left' | 'left-right';

// Orientation options
const orientationOptions: Orientation[] = ['right-left', 'left-right', 'clockwise', 'anticlockwise'];

// Drawer state
const drawerOpen = ref(true);

// View mode: 'mindmap', 'text', or 'split'
type ViewMode = 'mindmap' | 'text' | 'split';
const viewMode = ref<ViewMode>('split');

// Splitter model (percentage for left panel)
const splitterModel = ref(50);

// Load view preferences from localStorage
const VIEW_MODE_KEY = 'mindmap-writer-view-mode';
const SPLITTER_KEY = 'mindmap-writer-splitter';

const savedViewMode = localStorage.getItem(VIEW_MODE_KEY);
if (savedViewMode && ['mindmap', 'text', 'split'].includes(savedViewMode)) {
  viewMode.value = savedViewMode as ViewMode;
}

const savedSplitter = localStorage.getItem(SPLITTER_KEY);
if (savedSplitter) {
  splitterModel.value = parseInt(savedSplitter, 10);
}

// Save view preferences to localStorage
watch(viewMode, (newMode) => {
  localStorage.setItem(VIEW_MODE_KEY, newMode);
});

watch(splitterModel, (newValue) => {
  localStorage.setItem(SPLITTER_KEY, newValue.toString());
});

// Mindmap configuration
const config = reactive<{
  orientation: Orientation;
  branch: number;
  xGap: number;
  yGap: number;
  zoom: boolean;
  drag: boolean;
  edit: boolean;
  keyboard: boolean;
  ctm: boolean;
  timetravel: boolean;
  sharpCorner: boolean;
  fitBtn: boolean;
  centerBtn: boolean;
  downloadBtn: boolean;
  addNodeBtn: boolean;
}>({
  orientation: 'right-left',
  branch: 4,
  xGap: 84,
  yGap: 18,
  zoom: true,
  drag: true,
  edit: true,
  keyboard: true,
  ctm: true,
  timetravel: true,
  sharpCorner: false,
  fitBtn: true,
  centerBtn: true,
  downloadBtn: true,
  addNodeBtn: true
});

// Initialize: Try to load last document from localStorage, or create new one
const LAST_DOCUMENT_KEY = 'mindmap-last-document-id';
const lastDocId = localStorage.getItem(LAST_DOCUMENT_KEY);

if (lastDocId) {
  try {
    store.loadFromLocalStorage(lastDocId);
    console.log('Loaded last document:', lastDocId);
  } catch {
    console.warn('Failed to load last document, creating new one');
    store.createNewDocument('Mindmap Writer Project');
  }
} else if (!store.hasDocument) {
  store.createNewDocument('Mindmap Writer Project');
}

// Watch for document changes (when loading from navigation)
watch(() => store.documentId, (newId: string | null, oldId: string | null | undefined) => {
  // Only increment key if documentId actually changed (not initial load)
  if (oldId !== undefined && newId !== oldId) {
    console.log('Document changed, forcing mindmap re-render');
    mindmapKey.value++;
  }
});

// Mindmap data - use computed from store to avoid circular updates
const mindmapData = computed<MindmapData[]>({
  get: () => {
    const legacy = store.legacyDocument ? [store.legacyDocument] : [{ name: 'Root' }];
    console.log('mindmapData getter:', legacy);
    return legacy;
  },
  set: (newData) => {
    console.log('mindmapData setter:', newData);
    if (newData && newData[0]) {
      store.updateDocumentFromLegacy(newData[0]);
    }
  }
});

// Save/Load/Export/Import functions
function handleSave() {
  try {
    store.save();
    // Remember this document as the last opened
    if (store.documentId) {
      localStorage.setItem(LAST_DOCUMENT_KEY, store.documentId);
    }
    Notify.create({
      type: 'positive',
      message: 'Mindmap saved successfully!',
      position: 'top'
    });
  } catch {
    Notify.create({
      type: 'negative',
      message: 'Failed to save mindmap',
      position: 'top'
    });
  }
}

function handleExport() {
  try {
    store.exportToJSON();
    Notify.create({
      type: 'positive',
      message: 'Mindmap exported successfully!',
      position: 'top'
    });
  } catch {
    Notify.create({
      type: 'negative',
      message: 'Failed to export mindmap',
      position: 'top'
    });
  }
}

function handleImport() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      try {
        await store.importFromJSON(file);
        // Auto-save the imported document
        store.save();
        if (store.documentId) {
          localStorage.setItem(LAST_DOCUMENT_KEY, store.documentId);
        }
        // Force mindmap to re-render with new data
        mindmapKey.value++;
        Notify.create({
          type: 'positive',
          message: 'Mindmap imported and saved successfully!',
          position: 'top'
        });
      } catch {
        Notify.create({
          type: 'negative',
          message: 'Failed to import mindmap',
          position: 'top'
        });
      }
    }
  };
  input.click();
}

function handleNewDocument() {
  $q.dialog({
    title: 'Create New Mindmap',
    message: 'Enter a name for the new mindmap:',
    prompt: {
      model: 'Untitled Mindmap',
      type: 'text'
    },
    cancel: true
  }).onOk((name: string) => {
    store.createNewDocument(name);
    // Auto-save the new document
    store.save();
    if (store.documentId) {
      localStorage.setItem(LAST_DOCUMENT_KEY, store.documentId);
    }
    // Force mindmap to re-render with new data
    mindmapKey.value++;
    Notify.create({
      type: 'positive',
      message: 'New mindmap created and saved!',
      position: 'top'
    });
  });
}

// Handle text editor updates (Full Document mode)
function handleTextEditorUpdate(updatedNode: MindmapNode) {
  // TODO: Implement proper sync logic
  // For now, just log the update
  console.log('Text editor updated:', updatedNode);
}

// Handle node content updates (Node Content mode)
function handleNodeContentUpdate(nodeId: string, content: string) {
  // Find the node and update its content
  const node = findNodeById(store.currentDocument, nodeId);
  if (node) {
    node.content = content;
    node.updatedAt = new Date();
    // Mark as dirty and auto-save
    store.save();
  }
}

// ============================================================================
// EVENT BUS - Mindmap View Sync
// ============================================================================

/**
 * Helper function to find node by path in the tree
 */
function findNodeByPath(node: MindmapNode | null, targetPath: string): MindmapNode | null {
  if (!node) return null;
  if (node.path === targetPath) return node;

  for (const child of node.children) {
    const found = findNodeByPath(child, targetPath);
    if (found) return found;
  }

  return null;
}

/**
 * Helper function to convert hierarchical mindmap ID (like "0-1-2") to node path (like "1-2-3")
 * The mindmap component uses 0-based indices, our paths use 1-based
 * Examples:
 *   "0" → "1" (root)
 *   "0-0" → "1-1" (first child)
 *   "0-1" → "1-2" (second child)
 *   "0-0-1" → "1-1-2" (second child of first child)
 */
function mindmapIdToPath(mindmapId: string): string {
  if (mindmapId === '0') return '1'; // Root node

  const parts = mindmapId.split('-');
  // Skip the root "0" and convert from 0-based to 1-based
  return '1-' + parts.slice(1).map(p => (parseInt(p) + 1).toString()).join('-');
}

/**
 * Helper function to convert node path to mindmap hierarchical ID
 * Examples:
 *   "1" → "0" (root)
 *   "1-1" → "0-0" (first child)
 *   "1-2" → "0-1" (second child)
 *   "1-1-2" → "0-0-1" (second child of first child)
 */
function pathToMindmapId(path: string): string {
  if (path === '1') return '0'; // Root node

  const parts = path.split('-');
  // Skip the root "1" and convert from 1-based to 0-based
  return '0-' + parts.slice(1).map(p => (parseInt(p) - 1).toString()).join('-');
}

/**
 * Listen to mindmap node selection events from the mindmap component
 */
emitter.on('node-selected-in-mindmap', (mindmapId: string) => {
  // Convert mindmap ID to path
  const path = mindmapIdToPath(mindmapId);

  // Find the node by path
  const node = findNodeByPath(store.currentDocument, path);

  if (node) {
    // Emit selection event to other views
    viewSync.selectNode(node.id, true);
  }
});

/**
 * Listen to node selection from other views (tree, text editor)
 */
viewSync.onNodeSelected((event) => {
  // Ignore events from mindmap itself
  if (event.source === 'mindmap') return;

  // Find the node by ID
  const node = findNodeById(store.currentDocument, event.nodeId);

  if (node) {
    // Convert path to mindmap ID and select in mindmap
    const mindmapId = pathToMindmapId(node.path);

    // Select the node in the mindmap using DOM query
    const mindmapElement = document.querySelector<SVGGElement>(`g[data-id='${mindmapId}']`);
    if (mindmapElement) {
      // Remove old selection using CSS module class
      const oldSelection = document.getElementsByClassName(style.selected)[0];
      if (oldSelection) {
        oldSelection.classList.remove(style.selected);
      }
      // Add new selection
      mindmapElement.classList.add(style.selected);

      // Note: We don't automatically pan to the node because:
      // 1. It can be disorienting when the node is already visible
      // 2. Users can manually pan/zoom if needed
      // 3. The selection highlight is sufficient visual feedback
    } else {
      console.warn('Mindmap element not found for ID:', mindmapId, 'path:', node.path);
    }
  }
});

/**
 * Listen to icon clicks in mindmap to switch to Node Content mode
 */
emitter.on<string>('icon-clicked', (mindmapId: string) => {
  // Convert mindmap ID to path
  const path = mindmapIdToPath(mindmapId);

  // Find the node by path
  const node = findNodeByPath(store.currentDocument, path);

  if (node) {
    // Select the node
    viewSync.selectNode(node.id, true);

    // Switch to Node Content mode
    textEditorMode.value = 'node';

    // If in mindmap-only view, switch to split view to show text editor
    if (viewMode.value === 'mindmap') {
      viewMode.value = 'split';
    }
  }
});

/**
 * Helper function to find node by UUID
 */
function findNodeById(node: MindmapNode | null, targetId: string): MindmapNode | null {
  if (!node) return null;
  if (node.id === targetId) return node;

  for (const child of node.children) {
    const found = findNodeById(child, targetId);
    if (found) return found;
  }

  return null;
}
</script>

<style lang="scss" scoped>
.mindmap-page {
  padding: 0;
  height: calc(100vh - 50px); // Subtract header height (Quasar default header is ~50px)
  width: 100%;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.split-view-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

.view-controls {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 1000;
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.split-view {
  flex: 1;
  min-height: 0;

  :deep(.q-splitter__panel) {
    overflow: hidden;
  }

  :deep(.q-splitter__before),
  :deep(.q-splitter__after) {
    overflow: hidden;
  }
}

.full-view {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;

  .panel-title {
    font-weight: 500;
    font-size: 14px;
    color: #424242;
  }
}

.mindmap-container {
  width: 100%;
  flex: 1;
  position: relative;
  overflow: hidden;
  min-height: 0;
  display: flex;
  flex-direction: column;

  // Ensure mindmap component fills the container
  :deep(> *) {
    flex: 1;
    min-height: 0;
  }
}

.settings-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
}

.settings-drawer {
  z-index: 2000;
}
</style>

