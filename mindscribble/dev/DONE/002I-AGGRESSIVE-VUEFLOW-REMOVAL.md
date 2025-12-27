# Aggressive VueFlow & Legacy Code Removal Plan

## 🔥 Philosophy: Rip It Out!

**No gradual migration. No deprecation warnings. No legacy support.**

Just remove all VueFlow views and ThreePanelContainer completely.

## Prerequisites (30 minutes)

### Step 1: Change Default View to Vue3 Mindmap

**File**: `quasar/src/core/types/view.ts`

Find the VIEW_CONFIGS and update the 'mindmap' entry:

```typescript
// BEFORE
mindmap: {
  type: 'mindmap',
  label: 'Mindmap',
  icon: 'account_tree',
  description: 'Visual mindmap canvas',
  component: 'MindmapView'  // VueFlow version
},

// AFTER
mindmap: {
  type: 'mindmap',
  label: 'Mindmap',
  icon: 'account_tree',
  description: 'Visual mindmap canvas',
  component: 'Vue3MindmapView'  // Vue3 version
},
```

**File**: `quasar/src/boot/dockview.ts`

Update the panel registration:

```typescript
// BEFORE
const MindmapPanel = defineAsyncComponent(() =>
  import('src/pages/components/MindmapPanel.vue')  // VueFlow wrapper
)

// AFTER
const MindmapPanel = defineAsyncComponent(() =>
  import('src/pages/components/Vue3MindmapPanel.vue')  // Vue3 wrapper
)
```

### Step 2: Remove VueFlow Views from Dropdown

**Find the view selector dropdown** - likely in one of these files:
- `quasar/src/pages/components/FilePanel.vue`
- `quasar/src/pages/components/GroupControls.vue`
- `quasar/src/layouts/DockviewLayout.vue`

**Remove these view types from the dropdown**:
- 'mindmap' (old VueFlow version - now points to Vue3)
- 'concept-map' (VueFlow ConceptMapView)

**OR** - if easier, just remove them from VIEW_CONFIGS entirely (we'll do this in the next step anyway).

## Aggressive Removal (2 hours)

### Phase 1: Remove View Type Definitions

**File**: `quasar/src/core/types/view.ts`

```typescript
// REMOVE 'concept-map' from ViewType
export type ViewType =
  | 'outline'
  | 'mindmap'           // Now points to Vue3MindmapView
  // | 'concept-map'    // ❌ DELETE THIS LINE
  | 'writer'
  | 'kanban'
  | 'timeline'
  | 'circle-pack'
  | 'sunburst'
  | 'treemap'
  | 'd3-mindmap'
  | 'd3-concept-map'
  | 'vue3-mindmap'

// REMOVE 'concept-map' from VIEW_CONFIGS
export const VIEW_CONFIGS: Record<ViewType, ViewConfig> = {
  // ... other views
  // 'concept-map': { ... },  // ❌ DELETE THIS ENTIRE ENTRY
  // ... other views
}
```

### Phase 2: Remove VueFlow Component Files

**Delete these files**:

```bash
# VueFlow view components
rm quasar/src/features/canvas/components/MindmapView.vue
rm quasar/src/features/canvas/components/conceptmap/ConceptMapView.vue
rm -rf quasar/src/features/canvas/components/conceptmap/

# Old panel wrappers
rm quasar/src/pages/components/MindmapPanel.vue
rm quasar/src/pages/components/ConceptMapPanel.vue

# ThreePanelContainer
rm quasar/src/shared/components/ThreePanelContainer.vue
```

### Phase 3: Remove VueFlow Composables

**Find and delete all VueFlow-related composables**:

```bash
# Search for composables that import VueFlow
Get-ChildItem -Path "quasar\src\features\canvas\composables" -Recurse -Include *.ts | Select-String -Pattern "@vue-flow"

# Delete the files found (likely in these directories):
rm -rf quasar/src/features/canvas/composables/mindmap/
rm -rf quasar/src/features/canvas/composables/conceptmap/
```

**Specific files to check and remove**:
- Any file importing from `@vue-flow/core`
- Any file with "mindmap" or "conceptmap" in the name that's VueFlow-related
- Check `quasar/src/features/canvas/composables/` directory

### Phase 4: Remove Panel Registrations

**File**: `quasar/src/boot/dockview.ts`

```typescript
// REMOVE these lines:
const ConceptMapPanel = defineAsyncComponent(() =>
  import('src/pages/components/ConceptMapPanel.vue')
)

app.component('concept-map-panel', ConceptMapPanel)
```

### Phase 5: Clean Up ThreePanelContainer References

**File**: `quasar/src/layouts/MainLayout.vue` (line 229)

```typescript
// REMOVE this commented line:
// import ThreePanelContainer from 'src/shared/components/ThreePanelContainer.vue'
```

**File**: `quasar/src/pages/IndexPage.vue`

```vue
<!-- BEFORE -->
<template>
  <div>
    <!-- Empty page - content is rendered in ThreePanelContainer via layout -->
  </div>
</template>

<script setup lang="ts">
// The actual content is handled by MainLayout's ThreePanelContainer
</script>

<!-- AFTER -->
<template>
  <div>
    <!-- Empty page - content is rendered in DockviewLayout via layout -->
  </div>
</template>

<script setup lang="ts">
// The actual content is handled by MainLayout's DockviewLayout
</script>
```

### Phase 6: Update ThreePanelContainer View Mappings

**File**: `quasar/src/shared/components/ThreePanelContainer.vue`

**Wait - we're deleting this file!** But first, check if any code references the `viewComponents` mapping.

If ThreePanelContainer is already deleted, skip this step.

### Phase 7: Uninstall VueFlow Dependencies

```bash
npm uninstall @vue-flow/core @vue-flow/background @vue-flow/minimap @vue-flow/controls
```

### Phase 8: Search and Destroy Remaining References

**Search for any remaining VueFlow imports**:

```bash
Get-ChildItem -Path "quasar\src" -Recurse -Include *.vue,*.ts,*.js | Select-String -Pattern "@vue-flow"
```

**Search for MindmapView references**:

```bash
Get-ChildItem -Path "quasar\src" -Recurse -Include *.vue,*.ts,*.js | Select-String -Pattern "MindmapView" | Where-Object { $_.Path -notlike "*Vue3MindmapView*" }
```

**Search for ConceptMapView references**:

```bash
Get-ChildItem -Path "quasar\src" -Recurse -Include *.vue,*.ts,*.js | Select-String -Pattern "ConceptMapView"
```

**Search for ThreePanelContainer references**:

```bash
Get-ChildItem -Path "quasar\src" -Recurse -Include *.vue,*.ts,*.js | Select-String -Pattern "ThreePanelContainer"
```

**Delete or update any files found!**

## Testing & Verification (30 minutes)

### Step 1: Fix TypeScript Errors

```bash
npm run type-check
```

**Fix any errors** related to:
- Missing imports
- Undefined types
- Missing components

### Step 2: Test the App

```bash
npm run dev
```

**Test**:
1. ✅ App starts without errors
2. ✅ Create new document → opens with Vue3MindmapView
3. ✅ Add nodes → works correctly
4. ✅ Switch to OutlineView → works
5. ✅ Switch to WriterView → works
6. ✅ Switch back to Mindmap → works
7. ✅ No console errors

### Step 3: Test View Dropdown

**Open the view selector dropdown** (+ button in dockview):

1. ✅ 'Mindmap' option exists (points to Vue3MindmapView)
2. ✅ 'Concept Map' option is GONE
3. ✅ All other views work correctly

### Step 4: Build for Production

```bash
npm run build
```

**Verify**:
- ✅ Build succeeds
- ✅ No warnings about missing modules
- ✅ Bundle size reduced (VueFlow removed)

## Commit Strategy

### Commit 1: Prerequisites

```bash
git add quasar/src/core/types/view.ts
git add quasar/src/boot/dockview.ts
git commit -m "feat: Switch default mindmap to Vue3MindmapView

- Update VIEW_CONFIGS to use Vue3MindmapView for 'mindmap' type
- Update panel registration to use Vue3MindmapPanel
- Prepare for VueFlow removal"
```

### Commit 2: Aggressive Removal

```bash
git add -A
git commit -m "refactor: Remove VueFlow views and ThreePanelContainer

BREAKING CHANGE: Removed VueFlow-based views and legacy layout

Removed:
- MindmapView (VueFlow) - replaced by Vue3MindmapView
- ConceptMapView (VueFlow) - no replacement
- ThreePanelContainer - replaced by DockviewLayout
- All VueFlow composables and related code
- VueFlow dependencies (@vue-flow/*)

The default mindmap view is now Vue3MindmapView.
All layouts now use DockviewLayout."
```

## Rollback Plan

If something breaks:

```bash
# Rollback the commits
git reset --hard HEAD~2

# Or rollback just the removal
git reset --hard HEAD~1
```

## Expected Issues & Solutions

### Issue 1: TypeScript Errors

**Problem**: Missing type definitions for removed views

**Solution**: Remove the types from `view.ts` and any other type files

### Issue 2: Import Errors

**Problem**: Files still importing removed components

**Solution**: Search and remove all imports:

```bash
Get-ChildItem -Path "quasar\src" -Recurse -Include *.vue,*.ts,*.js | Select-String -Pattern "from.*MindmapView"
```

### Issue 3: Runtime Errors

**Problem**: Code trying to use removed views

**Solution**: Check browser console, find the reference, remove it

### Issue 4: View Dropdown Shows Removed Views

**Problem**: Dropdown still shows 'Concept Map'

**Solution**: The dropdown likely uses VIEW_CONFIGS - removing from there should fix it

### Issue 5: Existing Documents Reference Old Views

**Problem**: Saved documents have layout with 'concept-map' view type

**Solution**:
- Option 1: Add migration logic to convert 'concept-map' → 'vue3-mindmap'
- Option 2: Just ignore - let users recreate their layouts

## Success Criteria

- ✅ No VueFlow dependencies in package.json
- ✅ No VueFlow imports in codebase
- ✅ No MindmapView.vue or ConceptMapView.vue files
- ✅ No ThreePanelContainer.vue file
- ✅ TypeScript check passes
- ✅ Build succeeds
- ✅ App runs without errors
- ✅ Default mindmap is Vue3MindmapView
- ✅ View dropdown doesn't show removed views
- ✅ All remaining views work correctly

## Timeline

**Total Time**: ~3 hours

- **30 min**: Prerequisites (change default view, update dropdown)
- **2 hours**: Aggressive removal (delete files, clean up references)
- **30 min**: Testing & verification

## Files to Delete - Complete List

```
quasar/src/features/canvas/components/MindmapView.vue
quasar/src/features/canvas/components/conceptmap/ConceptMapView.vue
quasar/src/features/canvas/components/conceptmap/ (entire directory)
quasar/src/pages/components/MindmapPanel.vue
quasar/src/pages/components/ConceptMapPanel.vue
quasar/src/shared/components/ThreePanelContainer.vue
quasar/src/features/canvas/composables/mindmap/ (if VueFlow-related)
quasar/src/features/canvas/composables/conceptmap/ (if exists)
```

## Files to Update - Complete List

```
quasar/src/core/types/view.ts (remove 'concept-map' type and config)
quasar/src/boot/dockview.ts (update MindmapPanel, remove ConceptMapPanel)
quasar/src/layouts/MainLayout.vue (remove commented ThreePanelContainer import)
quasar/src/pages/IndexPage.vue (update comments)
package.json (remove VueFlow dependencies)
```

## Next Steps After Removal

1. ✅ Test thoroughly with real documents
2. ✅ Update documentation
3. ✅ Notify team/users of breaking changes
4. ✅ Continue with store consolidation migration

---

**Ready to execute?** Let's do this! 🔥

