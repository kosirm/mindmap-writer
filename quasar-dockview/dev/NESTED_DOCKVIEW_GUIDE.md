# Nested Dockview Implementation Guide

## Architecture

**Nested Dockview** = Parent dockview contains file panels, each file panel contains a child dockview with view panels.

```
Parent Dockview (IndexPage)
├── File Panel 1 (Document 1)
│   └── Child Dockview
│       ├── Mindmap Panel
│       ├── Writer Panel
│       └── Outline Panel
├── File Panel 2 (Document 2)
│   └── Child Dockview
│       ├── Mindmap Panel
│       ├── Writer Panel
│       └── Outline Panel
└── ...
```

**Benefits:**
- Work on multiple files simultaneously
- Each file has independent view layout
- Views cannot escape to other files
- Per-file layout persistence

---

## Key Components

### 1. IndexPage.vue (Parent Dockview)
- Contains file panels
- Saves parent layout to `dockview-parent-layout`
- Exposes `addFile()` method

### 2. FilePanel.vue (Child Dockview Container)
- Contains view panels (Mindmap, Writer, Outline)
- Saves child layout to `dockview-file-{fileId}-layout`
- Provides API to FileControls via Vue inject/provide

### 3. FileControls.vue (Add View Button)
- Left header action for file panels
- Dropdown menu to add views
- Activates group on mousedown (ensures views added to correct group)
- Disables already-open views

### 4. GroupControls.vue (Float/Maximize Buttons)
- Right header action for view groups
- Float button (creates floating window)
- Maximize button (full-screen mode)
- Buttons hidden when panel is floating

### 5. View Panels (Mindmap, Writer, Outline)
- Simple wrappers around existing components
- Fill 100% width/height

---

## Critical Implementation Details

### 1. Component Registration (boot/dockview.ts)
```typescript
app.component('file-panel', FilePanel)
app.component('file-controls', FileControls)
app.component('mindmap-panel', MindmapPanel)
app.component('writer-panel', WriterPanel)
app.component('outline-panel', OutlinePanel)
app.component('group-controls', GroupControls)
```

### 2. CSS Height Fix (css/app.scss)
```scss
html, body, #q-app {
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.q-layout {
  height: 100vh;
}

.q-page-container {
  height: 100%;
}
```

### 3. CSS Positioning Fix (IndexPage.vue)
```scss
:deep(.dv-popover-anchor) {
  position: absolute !important;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  z-index: 1000;
  pointer-events: none;
}

.dv-grid-view {
  position: absolute !important;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
}
```

### 4. Vue Provide/Inject Pattern
FilePanel provides API, FileControls injects it:

```typescript
// FilePanel.vue
const filePanelApi = {
  addChildPanel: (type: string) => addChildPanel(type),
  getOpenChildPanelTypes: () => getOpenChildPanelTypes()
}
provide('filePanelApi', filePanelApi)

// FileControls.vue
const filePanelApi = inject<FilePanelApi>('filePanelApi', {
  addChildPanel: () => console.warn('filePanelApi not provided'),
  getOpenChildPanelTypes: () => []
})
```

### 5. Group Activation on Mousedown
```typescript
// FileControls.vue
function handleMouseDown() {
  if (props.params?.group?.activePanel?.api) {
    props.params.group.activePanel.api.setActive()
  }
}
```

### 6. Hide Buttons on Floating Panels
```typescript
// GroupControls.vue
const isFloating = ref(false)

watch(() => props.params, (params) => {
  if (params?.api) {
    isFloating.value = params.api.location?.type === 'floating'
    
    const locationDisposable = params.api.onDidLocationChange?.(() => {
      isFloating.value = params.api?.location?.type === 'floating'
    })
  }
})
```

---

## Layout Persistence

**Parent Layout:**
- Key: `dockview-parent-layout`
- Contains: File panel structure

**Child Layouts:**
- Key: `dockview-file-{fileId}-layout`
- Contains: View panel structure for specific file
- Each file has independent layout

---

## Testing Checklist

- [ ] Add multiple files
- [ ] Add/remove views in each file
- [ ] Close and reopen views (no duplicates)
- [ ] Click + button on inactive group (activates group first)
- [ ] Float panels (buttons disappear)
- [ ] Maximize panels
- [ ] Refresh page (layouts persist)
- [ ] Drag panels to reorder
- [ ] Resize panels

---

## Migration from Flat to Nested

1. Update boot file with new components
2. Replace IndexPage with parent dockview
3. Create FilePanel component
4. Create FileControls component
5. Update MainLayout (Add File button)
6. Add CSS height fixes to app.scss
7. Test thoroughly

---

See `TEST_PROJECT_SUMMARY.md` for complete working example.

