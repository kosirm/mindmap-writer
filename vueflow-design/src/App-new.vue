<template>
  <div class="app-container">
    <!-- Tab Navigation -->
    <div class="tab-bar">
      <button
        class="tab-button"
        :class="{ active: activeTab === 'mindmap' }"
        @click="activeTab = 'mindmap'"
      >
        <span class="tab-icon">🗺️</span>
        Mindmap View
      </button>
      <button
        class="tab-button disabled"
        :class="{ active: activeTab === 'concept' }"
        disabled
        title="Coming soon - Concept Map view is under development"
      >
        <span class="tab-icon">🔗</span>
        Concept Map View
        <span class="badge">Coming Soon</span>
      </button>
    </div>

    <!-- View Container -->
    <div class="view-container">
      <!-- Mindmap View (refactored with composables) -->
      <MindmapView v-if="activeTab === 'mindmap'" />

      <!-- Concept Map View (placeholder for future development) -->
      <div v-else-if="activeTab === 'concept'" class="placeholder-view">
        <div class="placeholder-content">
          <h1>🔗 Concept Map View</h1>
          <p>This view is under development.</p>
          <p>Concept maps will use nested nodes where children are positioned inside parent nodes.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import MindmapView from './views/MindmapView.vue'
// import ConceptMapView from './views/ConceptMapView.vue' // TODO: Uncomment when ready

// Active tab state
const activeTab = ref<'mindmap' | 'concept'>('mindmap')
</script>

<style scoped>
.app-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f8f9fa;
}

/* Tab Bar */
.tab-bar {
  display: flex;
  background: #ffffff;
  border-bottom: 2px solid #dee2e6;
  padding: 0;
  height: 50px;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  background: transparent;
  color: #495057;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 3px solid transparent;
  position: relative;
  top: 2px;
}

.tab-button:hover:not(.disabled) {
  background: #f8f9fa;
  color: #212529;
}

.tab-button.active {
  color: #4dabf7;
  background: white;
  border-bottom-color: #4dabf7;
}

.tab-button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tab-icon {
  font-size: 18px;
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  background: #ffd43b;
  color: #212529;
  font-size: 11px;
  font-weight: 600;
  border-radius: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-left: 4px;
}

/* View Container */
.view-container {
  flex: 1;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}

/* Placeholder View */
.placeholder-view {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.placeholder-content {
  text-align: center;
  color: white;
  padding: 40px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.placeholder-content h1 {
  font-size: 48px;
  margin: 0 0 20px 0;
  font-weight: 700;
}

.placeholder-content p {
  font-size: 18px;
  margin: 10px 0;
  opacity: 0.9;
}
</style>

<style>
/* Global styles (non-scoped) to ensure proper height propagation */
.view-container {
  height: 100%;
}
</style>

