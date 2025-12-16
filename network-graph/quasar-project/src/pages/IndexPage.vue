<template>
  <q-page class="q-pa-md">
    <div class="q-mb-md">
      <h4 class="q-mt-none">v-network-graph POC for MindScribble</h4>
      <p class="text-body1">
        Evaluating v-network-graph as replacement for VueFlow due to performance issues with 200+ nodes.
      </p>
    </div>

    <q-list bordered separator>
      <q-item-label header>POC Tests</q-item-label>

      <q-item clickable v-ripple :to="'/test1-basic'">
        <q-item-section avatar>
          <q-icon color="primary" name="check_circle" />
        </q-item-section>
        <q-item-section>
          <q-item-label>Test 1: Basic Rendering</q-item-label>
          <q-item-label caption>50 nodes - verify basic functionality</q-item-label>
        </q-item-section>
      </q-item>

      <q-item clickable v-ripple :to="'/test2-custom-nodes'">
        <q-item-section avatar>
          <q-icon color="primary" name="brush" />
        </q-item-section>
        <q-item-section>
          <q-item-label>Test 2: Custom SVG Nodes</q-item-label>
          <q-item-label caption>Styled like MindScribble nodes</q-item-label>
        </q-item-section>
      </q-item>

      <q-item clickable v-ripple :to="'/test3-drag-layout'">
        <q-item-section avatar>
          <q-icon color="primary" name="open_with" />
        </q-item-section>
        <q-item-section>
          <q-item-label>Test 3: Drag with Custom Layout</q-item-label>
          <q-item-label caption>Test node dragging with custom positioning</q-item-label>
        </q-item-section>
      </q-item>

      <q-item clickable v-ripple :to="'/test4-performance'">
        <q-item-section avatar>
          <q-icon color="orange" name="speed" />
        </q-item-section>
        <q-item-section>
          <q-item-label>Test 4: Performance (500 nodes)</q-item-label>
          <q-item-label caption>Measure FPS during drag operations</q-item-label>
        </q-item-section>
      </q-item>

      <q-item clickable v-ripple :to="'/test5-minimap'">
        <q-item-section avatar>
          <q-icon color="primary" name="map" />
        </q-item-section>
        <q-item-section>
          <q-item-label>Test 5: Custom Minimap</q-item-label>
          <q-item-label caption>Implement minimap using layers</q-item-label>
        </q-item-section>
      </q-item>

      <q-item clickable v-ripple :to="'/test6-zoom-controls'">
        <q-item-section avatar>
          <q-icon color="primary" name="zoom_in" />
        </q-item-section>
        <q-item-section>
          <q-item-label>Test 6: Zoom/Fit Controls</q-item-label>
          <q-item-label caption>Zoom controls and fit-to-content</q-item-label>
        </q-item-section>
      </q-item>

      <q-item clickable v-ripple :to="'/test7-context-menu'">
        <q-item-section avatar>
          <q-icon color="primary" name="menu" />
        </q-item-section>
        <q-item-section>
          <q-item-label>Test 7: Context Menu</q-item-label>
          <q-item-label caption>Right-click menu for nodes and canvas</q-item-label>
        </q-item-section>
      </q-item>

      <q-item clickable v-ripple :to="'/test8-collapse'">
        <q-item-section avatar>
          <q-icon color="primary" name="unfold_less" />
        </q-item-section>
        <q-item-section>
          <q-item-label>Test 8: Collapse/Expand</q-item-label>
          <q-item-label caption>Simulate collapse/expand functionality</q-item-label>
        </q-item-section>
      </q-item>

      <q-item clickable v-ripple :to="'/test9-stress'">
        <q-item-section avatar>
          <q-icon color="red" name="warning" />
        </q-item-section>
        <q-item-section>
          <q-item-label>Test 9: Stress Test (1000 nodes)</q-item-label>
          <q-item-label caption>Maximum stress test with drag performance</q-item-label>
        </q-item-section>
      </q-item>
    </q-list>
  </q-page>
</template>

<script setup lang="ts">
// Index page with navigation to all POC tests
</script>
