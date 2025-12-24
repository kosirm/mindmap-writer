# Aggressive VueFlow Removal - Step-by-Step Execution

## 🎯 Goal
Remove all VueFlow views and ThreePanelContainer in ~3 hours.

## ✅ Prerequisites (30 minutes)

### Step 1: Change Default Mindmap to Vue3MindmapView

**File 1**: `quasar/src/boot/dockview.ts` (line 15-16)

```typescript
// CHANGE THIS:
const MindmapPanel = defineAsyncComponent(() =>
  import('src/pages/components/MindmapPanel.vue')  // ❌ Old VueFlow wrapper
)

// TO THIS:
const MindmapPanel = defineAsyncComponent(() =>
  import('src/pages/components/Vue3MindmapPanel.vue')  // ✅ Vue3 wrapper
)
```

**File 2**: `quasar/src/core/types/view.ts` (line 35-41)

```typescript
// CHANGE THIS:
mindmap: {
  type: 'mindmap',
  label: 'Mindmap',
  icon: 'account_tree',
  description: 'Visual mindmap canvas',
  component: 'MindmapView'  // ❌ Old VueFlow component
},

// TO THIS:
mindmap: {
  type: 'mindmap',
  label: 'Mindmap',
  icon: 'account_tree',
  description: 'Visual mindmap canvas',
  component: 'Vue3MindmapView'  // ✅ Vue3 component
},
```

### Step 2: Remove VueFlow Views from Dropdown

**File**: `quasar/src/pages/components/FileControls.vue` (line 42-50)

```typescript
// CHANGE THIS:
const availableViews = [
  'mindmap-panel',           // ✅ Keep (now points to Vue3)
  'd3-mindmap-panel',        // ✅ Keep
  'vue3-mindmap-panel',      // ✅ Keep
  'writer-panel',            // ✅ Keep
  'outline-panel',           // ✅ Keep
  'concept-map-panel',       // ❌ REMOVE THIS LINE
  'd3-concept-map-panel'     // ✅ Keep
]

// TO THIS:
const availableViews = [
  'mindmap-panel',           // Now points to Vue3MindmapView
  'd3-mindmap-panel',
  'vue3-mindmap-panel',
  'writer-panel',
  'outline-panel',
  'd3-concept-map-panel'
]
```

### Step 3: Test Prerequisites

```bash
npm run dev
```

**Verify**:
1. ✅ App starts
2. ✅ Create new document → opens with Vue3MindmapView (not old VueFlow)
3. ✅ Click + button → 'Concept Map' is NOT in the list
4. ✅ 'Mind Map' option still exists and works

**If all good, commit**:

```bash
git add quasar/src/boot/dockview.ts quasar/src/core/types/view.ts quasar/src/pages/components/FileControls.vue
git commit -m "feat: Switch default mindmap to Vue3MindmapView and remove ConceptMap from dropdown"
```

---

## 🔥 Aggressive Removal (2 hours)

### Step 4: Remove View Type Definition

**File**: `quasar/src/core/types/view.ts`

**Line 1-24**: Remove 'concept-map' from ViewType

```typescript
// CHANGE THIS:
export type ViewType =
  | 'outline'
  | 'mindmap'
  | 'concept-map'    // ❌ DELETE THIS LINE
  | 'writer'
  // ... rest

// TO THIS:
export type ViewType =
  | 'outline'
  | 'mindmap'
  | 'writer'
  // ... rest
```

**Line 42-48**: Remove 'concept-map' from VIEW_CONFIGS

```typescript
// DELETE THIS ENTIRE BLOCK:
'concept-map': {
  type: 'concept-map',
  label: 'Concept Map',
  icon: 'hub',
  description: 'Free-form concept mapping',
  component: 'ConceptMapView'
},
```

### Step 5: Remove Panel Registration

**File**: `quasar/src/boot/dockview.ts`

**Line 27-29**: Remove ConceptMapPanel import

```typescript
// DELETE THESE LINES:
const ConceptMapPanel = defineAsyncComponent(() =>
  import('src/pages/components/ConceptMapPanel.vue')
)
```

**Line 48**: Remove ConceptMapPanel registration

```typescript
// DELETE THIS LINE:
app.component('concept-map-panel', ConceptMapPanel)
```

### Step 6: Remove View Icon/Title Mappings

**File**: `quasar/src/shared/utils/viewIcons.ts`

**Remove from getViewIcon** (around line 5-15):

```typescript
// DELETE THIS LINE:
'concept-map-panel': 'hub',
```

**Remove from getViewTitle** (around line 20-30):

```typescript
// DELETE THIS LINE:
'concept-map-panel': 'Concept Map',
```

### Step 7: Delete VueFlow Component Files

```bash
# Delete VueFlow view components
rm quasar/src/features/canvas/components/MindmapView.vue
rm quasar/src/features/canvas/components/conceptmap/ConceptMapView.vue

# Delete entire conceptmap directory
rm -r quasar/src/features/canvas/components/conceptmap/

# Delete old panel wrappers
rm quasar/src/pages/components/MindmapPanel.vue
rm quasar/src/pages/components/ConceptMapPanel.vue
```

### Step 8: Delete ThreePanelContainer

```bash
rm quasar/src/shared/components/ThreePanelContainer.vue
```

### Step 9: Clean Up ThreePanelContainer References

**File**: `quasar/src/layouts/MainLayout.vue` (line 229)

```typescript
// DELETE THIS LINE:
// import ThreePanelContainer from 'src/shared/components/ThreePanelContainer.vue'
```

**File**: `quasar/src/pages/IndexPage.vue`

```vue
<!-- CHANGE THIS: -->
<template>
  <div>
    <!-- Empty page - content is rendered in ThreePanelContainer via layout -->
  </div>
</template>

<script setup lang="ts">
// The actual content is handled by MainLayout's ThreePanelContainer
</script>

<!-- TO THIS: -->
<template>
  <div>
    <!-- Empty page - content is rendered in DockviewLayout via layout -->
  </div>
</template>

<script setup lang="ts">
// The actual content is handled by MainLayout's DockviewLayout
</script>
```

### Step 10: Find and Delete VueFlow Composables

**Search for VueFlow-related composables**:

```bash
Get-ChildItem -Path "quasar\src\features\canvas\composables" -Recurse -Include *.ts | Select-String -Pattern "@vue-flow"
```

**Likely files to delete** (check each one):
- Any file in `quasar/src/features/canvas/composables/mindmap/` that imports VueFlow
- Any file in `quasar/src/features/canvas/composables/conceptmap/` (entire directory)

**Delete the files found**:

```bash
# Example (adjust based on what you find):
rm quasar/src/features/canvas/composables/mindmap/useMindmapVueFlow.ts
rm -r quasar/src/features/canvas/composables/conceptmap/
```

### Step 11: Uninstall VueFlow Dependencies

```bash
npm uninstall @vue-flow/core @vue-flow/background @vue-flow/minimap @vue-flow/controls
```

### Step 12: Search and Destroy Remaining References

**Search for VueFlow imports**:

```bash
Get-ChildItem -Path "quasar\src" -Recurse -Include *.vue,*.ts,*.js | Select-String -Pattern "@vue-flow"
```

**Search for MindmapView references** (excluding Vue3MindmapView):

```bash
Get-ChildItem -Path "quasar\src" -Recurse -Include *.vue,*.ts,*.js | Select-String -Pattern "MindmapView\.vue" | Where-Object { $_.Path -notlike "*Vue3MindmapView*" }
```

**Search for ConceptMapView references**:

```bash
Get-ChildItem -Path "quasar\src" -Recurse -Include *.vue,*.ts,*.js | Select-String -Pattern "ConceptMapView"
```

**Search for ThreePanelContainer references**:

```bash
Get-ChildItem -Path "quasar\src" -Recurse -Include *.vue,*.ts,*.js | Select-String -Pattern "ThreePanelContainer"
```

**For each file found**:
- Open the file
- Remove the import/reference
- Save the file

---

## ✅ Testing & Verification (30 minutes)

### Step 13: Fix TypeScript Errors

```bash
npm run type-check
```

**Common errors and fixes**:

1. **Error**: `Type 'concept-map' is not assignable to type ViewType`
   - **Fix**: Remove 'concept-map' from any type annotations

2. **Error**: `Cannot find module 'MindmapView.vue'`
   - **Fix**: Remove the import statement

3. **Error**: `Property 'concept-map' does not exist on type...`
   - **Fix**: Remove references to 'concept-map' view type

### Step 14: Test the App

```bash
npm run dev
```

**Test Checklist**:

1. ✅ App starts without errors
2. ✅ Create new document
3. ✅ Default view is Vue3MindmapView (not old VueFlow)
4. ✅ Add nodes → works
5. ✅ Edit nodes → works
6. ✅ Delete nodes → works
7. ✅ Switch to OutlineView → works
8. ✅ Switch to WriterView → works
9. ✅ Switch back to Mindmap → works
10. ✅ Click + button → dropdown shows available views
11. ✅ 'Concept Map' is NOT in dropdown
12. ✅ 'Mind Map' works (opens Vue3MindmapView)
13. ✅ No console errors

### Step 15: Test Existing Documents

**If you have existing documents**:

1. ✅ Open existing document
2. ✅ Verify it loads correctly
3. ✅ Verify all data is intact
4. ✅ Make changes and save
5. ✅ Reload and verify changes persisted

### Step 16: Build for Production

```bash
npm run build
```

**Verify**:
- ✅ Build succeeds
- ✅ No warnings about missing modules
- ✅ Bundle size reduced (VueFlow removed)

---

## 📝 Commit

```bash
git add -A
git status  # Review what's being committed

git commit -m "refactor: Remove VueFlow views and ThreePanelContainer

BREAKING CHANGE: Removed VueFlow-based views and legacy layout

Removed:
- MindmapView (VueFlow) - replaced by Vue3MindmapView
- ConceptMapView (VueFlow) - no replacement
- ThreePanelContainer - replaced by DockviewLayout
- All VueFlow composables and related code
- VueFlow dependencies (@vue-flow/*)
- 'concept-map' view type from type definitions

Changes:
- Default 'mindmap' view now uses Vue3MindmapView
- Removed 'concept-map-panel' from view dropdown
- Updated all references to use DockviewLayout

The application now uses Vue3MindmapView as the default mindmap
visualization and DockviewLayout for all layouts."
```

---

## 🎉 Success Criteria

- ✅ No VueFlow dependencies in package.json
- ✅ No VueFlow imports in codebase
- ✅ No MindmapView.vue or ConceptMapView.vue files
- ✅ No ThreePanelContainer.vue file
- ✅ No 'concept-map' in ViewType or VIEW_CONFIGS
- ✅ TypeScript check passes
- ✅ Build succeeds
- ✅ App runs without errors
- ✅ Default mindmap is Vue3MindmapView
- ✅ View dropdown doesn't show 'Concept Map'
- ✅ All remaining views work correctly

---

## 🚨 Troubleshooting

### Issue: TypeScript errors after removal

**Solution**: Run the search commands in Step 12 to find all remaining references

### Issue: App crashes on startup

**Solution**: Check browser console for error, likely a missing import

### Issue: View dropdown is empty

**Solution**: Check FileControls.vue - make sure availableViews array is correct

### Issue: Existing documents won't load

**Solution**: Check if documents reference 'concept-map' view type - may need migration logic

---

## 📊 Estimated Time

- **Prerequisites**: 30 minutes
- **Removal**: 2 hours
- **Testing**: 30 minutes
- **Total**: ~3 hours

---

## 🎯 Ready to Execute?

Start with **Step 1** and work through sequentially!

Good luck! 🔥

