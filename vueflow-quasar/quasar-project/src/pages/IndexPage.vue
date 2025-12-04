<template>
  <q-page class="mindmap-page">
    <q-tabs v-model="activeTab" dense class="text-grey bg-grey-2" active-color="primary" indicator-color="primary" align="left">
      <q-tab name="mindmap" label="Mindmap View" icon="account_tree" />
      <q-tab name="concept" label="Concept Map" icon="hub" />
    </q-tabs>

    <q-separator />

    <q-tab-panels v-model="activeTab" animated class="tab-panels" keep-alive>
      <q-tab-panel name="mindmap" class="q-pa-none mindmap-panel">
        <MindmapView ref="mindmapRef" />
      </q-tab-panel>

      <q-tab-panel name="concept" class="q-pa-none concept-panel">
        <ConceptMapView
          ref="conceptMapRef"
          :nodes="sharedNodes"
          :edges="sharedEdges"
          @nodes-changed="onConceptNodesChanged"
          @create-edge="onCreateEdge"
          @remove-edge="onRemoveEdge"
          @add-node="onAddNode"
          @delete-nodes="onDeleteNodes"
          @update-node="onUpdateNode"
        />
      </q-tab-panel>
    </q-tab-panels>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Edge } from '@vue-flow/core'
import MindmapView from 'src/components/mindmap/MindmapView.vue'
import ConceptMapView from 'src/components/conceptmap/ConceptMapView.vue'
import type { NodeData } from 'src/components/mindmap/types'

const activeTab = ref('mindmap')
const mindmapRef = ref<InstanceType<typeof MindmapView> | null>(null)
const conceptMapRef = ref<InstanceType<typeof ConceptMapView> | null>(null)

// Shared state between views - nodes and edges are the same, just different positions
const sharedNodes = computed<NodeData[]>(() => mindmapRef.value?.nodes ?? [])
const sharedEdges = computed<Edge[]>(() => mindmapRef.value?.edges ?? [])

// When switching tabs, sync positions
watch(activeTab, (newTab, oldTab) => {
  console.log('Tab switched from', oldTab, 'to', newTab)
  if (newTab === 'concept' && mindmapRef.value) {
    // Save mindmap positions before switching
    for (const node of mindmapRef.value.nodes) {
      node.mindmapPosition = { x: node.x, y: node.y }
    }
    // Initialize concept map layout if needed
    if (conceptMapRef.value) {
      void conceptMapRef.value.initializeLayout()
    }
  } else if (newTab === 'mindmap' && mindmapRef.value) {
    // Initialize mindmap layout for any nodes that don't have mindmap positions
    // (e.g., nodes created in concept map view)
    const layoutChanged = mindmapRef.value.initializeMindmapLayout?.()

    // Restore mindmap positions for nodes that have them
    for (const node of sharedNodes.value) {
      if (node.mindmapPosition) {
        node.x = node.mindmapPosition.x
        node.y = node.mindmapPosition.y
      }
    }

    // Update edge handles to use correct left/right connection points
    // This is needed because edges created in concept map use top/bottom handles
    mindmapRef.value.updateAllEdgeHandles?.()

    // Sync to VueFlow and resolve any overlaps if layout changed
    mindmapRef.value.syncToVueFlow()
    if (layoutChanged) {
      mindmapRef.value.resolveAllOverlaps?.()
    }
  }
})

function onConceptNodesChanged() {
  console.log('Concept map nodes changed')
  // Node positions are already updated via two-way binding
}

function onCreateEdge(source: string, target: string) {
  console.log('Creating edge from', source, 'to', target)
  if (!sharedEdges.value) return

  const edgeId = `edge-${source}-${target}`
  // Check if edge already exists
  if (!sharedEdges.value.some(e => e.id === edgeId)) {
    sharedEdges.value.push({
      id: edgeId,
      source,
      target,
      type: 'smoothstep'
    })
  }
}

function onRemoveEdge(source: string, target: string) {
  console.log('Removing edge from', source, 'to', target)
  if (!sharedEdges.value) return

  const edgeIndex = sharedEdges.value.findIndex(e => e.source === source && e.target === target)
  if (edgeIndex >= 0) {
    sharedEdges.value.splice(edgeIndex, 1)
  }
}

function onAddNode(node: NodeData) {
  console.log('Adding node', node.id)
  if (!sharedNodes.value) return
  sharedNodes.value.push(node)
}

function onDeleteNodes(nodeIds: string[]) {
  console.log('Deleting nodes', nodeIds)
  if (!sharedNodes.value) return

  for (let i = sharedNodes.value.length - 1; i >= 0; i--) {
    const node = sharedNodes.value[i]
    if (node && nodeIds.includes(node.id)) {
      sharedNodes.value.splice(i, 1)
    }
  }
}

function onUpdateNode(nodeId: string, updates: Partial<NodeData>) {
  console.log('Updating node', nodeId, updates)
  if (!sharedNodes.value) return

  const node = sharedNodes.value.find(n => n.id === nodeId)
  if (node) {
    Object.assign(node, updates)
  }
}

/**
 * Generate test data and initialize layout for the current view
 * This is called from MainLayout when "Generate Test Data" is clicked
 */
async function generateTestData() {
  console.log('generateTestData called, activeTab:', activeTab.value)

  // Always generate in mindmap first (it's the source of truth)
  mindmapRef.value?.generateNodeTree?.()

  // If we're in concept map view, initialize concept map layout
  if (activeTab.value === 'concept' && conceptMapRef.value) {
    // Wait a tick for nodes to be created
    await new Promise(resolve => setTimeout(resolve, 50))
    void conceptMapRef.value.initializeLayout()
  }
}

// Expose refs so parent (MainLayout) can access them
defineExpose({
  mindmapRef,
  conceptMapRef,
  activeTab,
  generateTestData
})
</script>

<style lang="scss" scoped>
.mindmap-page {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.tab-panels {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

// Override Quasar's q-tab-panels and q-tab-panel to fill available space
:deep(.q-tab-panels) {
  flex: 1;
  display: flex;
  flex-direction: column;
}

:deep(.q-panel) {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.mindmap-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.concept-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
</style>
