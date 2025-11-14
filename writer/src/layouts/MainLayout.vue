<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title>
          Mindmap Writer
        </q-toolbar-title>

        <div>Quasar v{{ $q.version }}</div>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
    >
      <q-tabs
        v-model="leftDrawerTab"
        dense
        class="text-grey"
        active-color="primary"
        indicator-color="primary"
        align="justify"
      >
        <q-tab name="navigation" label="Navigation" />
        <q-tab name="structure" label="Structure" />
      </q-tabs>

      <q-separator />

      <q-tab-panels v-model="leftDrawerTab" animated>
        <q-tab-panel name="navigation">
          <q-list>
            <q-item clickable to="/">
              <q-item-section avatar>
                <q-icon name="home" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Home</q-item-label>
              </q-item-section>
            </q-item>

            <q-item clickable to="/mindmap">
              <q-item-section avatar>
                <q-icon name="account_tree" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Mindmap</q-item-label>
              </q-item-section>
            </q-item>

            <q-separator />

            <q-item-label
              header
            >
              Saved Mindmaps
            </q-item-label>

            <q-item
              v-for="doc in savedDocuments"
              :key="doc.id"
              clickable
              @click="loadDocument(doc.id)"
            >
              <q-item-section avatar>
                <q-icon name="description" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ doc.name }}</q-item-label>
                <q-item-label caption>
                  {{ formatDate(doc.lastModified) }}
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn
                  flat
                  dense
                  round
                  icon="delete"
                  color="negative"
                  @click.stop="confirmDelete(doc.id, doc.name)"
                />
              </q-item-section>
            </q-item>

            <q-item v-if="savedDocuments.length === 0">
              <q-item-section>
                <q-item-label caption>
                  No saved mindmaps
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-tab-panel>

        <q-tab-panel name="structure">
          <div v-if="currentDocumentStructure">
            <!-- Tree header with expand/collapse toggle -->
            <div class="row items-center justify-end q-mb-sm q-px-sm">
              <q-btn
                flat
                dense
                round
                size="sm"
                :icon="treeExpanded ? 'unfold_less' : 'unfold_more'"
                @click="toggleTreeExpansion"
              >
                <q-tooltip>{{ treeExpanded ? 'Collapse All' : 'Expand All' }}</q-tooltip>
              </q-btn>
            </div>

            <q-tree
              ref="treeRef"
              :nodes="treeNodes"
              :selected="selectedNodeId"
              node-key="id"
              :default-expand-all="treeExpanded"
              dense
              @update:selected="onTreeNodeSelected"
            >
              <template #default-header="prop">
                <div
                  class="row items-center cursor-pointer tree-node-header"
                  :class="{ 'tree-node-selected': selectedNodeId === prop.node.id }"
                  :data-node-id="prop.node.id"
                  @click.stop="selectTreeNode(prop.node.id)"
                >
                  <div class="text-weight-bold" :class="selectedNodeId === prop.node.id ? 'text-primary' : ''">
                    {{ prop.node.label }}
                  </div>
                </div>
              </template>
            </q-tree>
          </div>
          <div v-else class="text-grey-6 q-pa-md">
            No document loaded
          </div>
        </q-tab-panel>
      </q-tab-panels>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useMindmapStore, type MindmapNode } from 'stores/mindmap';
import { useViewSync } from 'src/composables/useViewSync';

interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
}

const router = useRouter();
const $q = useQuasar();
const mindmapStore = useMindmapStore();
const viewSync = useViewSync('tree');

const leftDrawerOpen = ref(false);
const leftDrawerTab = ref('navigation');
const documentListVersion = ref(0);
const selectedNodeId = ref<string | null>(null);
const treeRef = ref();
const treeExpanded = ref(true);

const savedDocuments = computed(() => {
  // Force reactivity by using documentListVersion
  void documentListVersion.value;
  return mindmapStore.getDocumentList();
});

const currentDocumentStructure = computed(() => mindmapStore.currentDocument);

const treeNodes = computed(() => {
  const doc = currentDocumentStructure.value;
  if (!doc) return [];

  function convertToTreeNode(node: MindmapNode): TreeNode {
    const treeNode: TreeNode = {
      id: node.id,
      label: node.title || 'Untitled'
    };

    if (node.children && node.children.length > 0) {
      treeNode.children = node.children.map(convertToTreeNode);
    }

    return treeNode;
  }

  return [convertToTreeNode(doc)];
});

// Watch for document changes to switch to structure tab
watch(() => mindmapStore.documentId, (newId) => {
  if (newId && router.currentRoute.value.path === '/mindmap') {
    // Optionally switch to structure tab when a document is loaded
    // leftDrawerTab.value = 'structure';
  }
});

// Watch for document saves to refresh the document list
watch(() => mindmapStore.lastSaved, () => {
  // Refresh the document list whenever a document is saved
  documentListVersion.value++;
});

function toggleLeftDrawer () {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

function loadDocument(docId: string) {
  try {
    mindmapStore.loadFromLocalStorage(docId);
    // Navigate to mindmap page if not already there
    if (router.currentRoute.value.path !== '/mindmap') {
      void router.push('/mindmap');
    }
    $q.notify({
      type: 'positive',
      message: 'Document loaded successfully',
      position: 'top'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    $q.notify({
      type: 'negative',
      message: `Failed to load document: ${errorMessage}`,
      position: 'top'
    });
  }
}

function confirmDelete(docId: string, docName: string) {
  $q.dialog({
    title: 'Confirm Delete',
    message: `Are you sure you want to delete "${docName}"?`,
    cancel: true,
    persistent: true
  }).onOk(() => {
    try {
      mindmapStore.deleteDocument(docId);
      // Force refresh of the document list
      documentListVersion.value++;
      $q.notify({
        type: 'positive',
        message: 'Document deleted successfully',
        position: 'top'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      $q.notify({
        type: 'negative',
        message: `Failed to delete document: ${errorMessage}`,
        position: 'top'
      });
    }
  });
}

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return 'Today';
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return `${days} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// ============================================================================
// Tree View Controls
// ============================================================================

/**
 * Toggle expand/collapse all nodes in tree
 */
function toggleTreeExpansion() {
  treeExpanded.value = !treeExpanded.value;

  if (treeRef.value) {
    if (treeExpanded.value) {
      treeRef.value.expandAll();
    } else {
      treeRef.value.collapseAll();
    }
  }
}

// ============================================================================
// EVENT BUS - Tree View Sync
// ============================================================================

/**
 * Handle tree node selection - emit event to other views
 */
function selectTreeNode(nodeId: string) {
  selectedNodeId.value = nodeId;
  // Emit selection event to other views (mindmap, text editor)
  viewSync.selectNode(nodeId, true);
}

/**
 * Handle selection from q-tree component
 */
function onTreeNodeSelected(nodeId: string) {
  if (nodeId) {
    selectTreeNode(nodeId);
  }
}

/**
 * Listen to node selection from other views (mindmap, text editor)
 */
viewSync.onNodeSelected((event) => {
  // Ignore events from tree view itself
  if (event.source === 'tree') return;

  // Update selected node
  selectedNodeId.value = event.nodeId;

  // Scroll to node if needed
  if (event.scrollIntoView && treeRef.value) {
    // Use nextTick to ensure DOM is updated
    setTimeout(() => {
      // Find the tree node element by node ID
      const treeNodeElement = document.querySelector(`[data-node-id="${event.nodeId}"]`);
      if (treeNodeElement) {
        treeNodeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        // If we can't find by data attribute, try to find by the node structure
        // The q-tree component should have rendered the node
        console.log('Tree node element not found for scrolling:', event.nodeId);
      }
    }, 100);
  }
});

onMounted(() => {
  // Refresh document list when component mounts
  documentListVersion.value++;
});
</script>

<style scoped lang="scss">
.tree-node-header {
  padding: 2px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
}

.tree-node-selected {
  background-color: rgba(25, 118, 210, 0.12);

  &:hover {
    background-color: rgba(25, 118, 210, 0.18);
  }
}
</style>
