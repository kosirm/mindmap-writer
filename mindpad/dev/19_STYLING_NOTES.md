left drawer search for 48px - replace in MainLayout.vue (3 occurrences)
mini-btn - width/height (MainLayout.vue)

dv-tabs-and-actions-container:
:deep([data-dockview-level="parent"]) {
  .dv-tabs-and-actions-container {
    background-color: var(--ms-drawer-bg) !important; // Use CSS variable for brand color consistency
    height: 38px !important; // THIS LINE ✏️
    min-height: 38px !important; // THIS LINE ✏️
  }

dv-tab:
.dv-tab {
    border: none !important;
    border-left: none !important; // Remove left border separator
    outline: none !important;
    box-shadow: none !important;
    height: 32px !important; // THIS LINE ✏️
