# VueFlow & ThreePanelContainer Removal Checklist

## ✅ Prerequisites (30 min)

### Files to Edit

- [ ] `quasar/src/boot/dockview.ts` - Change MindmapPanel to use Vue3MindmapPanel
- [ ] `quasar/src/core/types/view.ts` - Change mindmap component to Vue3MindmapView
- [ ] `quasar/src/pages/components/FileControls.vue` - Remove 'concept-map-panel' from availableViews

### Test Prerequisites
- [ ] App starts
- [ ] New document opens with Vue3MindmapView
- [ ] + button dropdown doesn't show 'Concept Map'
- [ ] Commit changes

---

## 🔥 Aggressive Removal (2 hours)

### Type Definitions

- [ ] `quasar/src/core/types/view.ts` - Remove 'concept-map' from ViewType
- [ ] `quasar/src/core/types/view.ts` - Remove 'concept-map' from VIEW_CONFIGS

### Panel Registration

- [ ] `quasar/src/boot/dockview.ts` - Remove ConceptMapPanel import
- [ ] `quasar/src/boot/dockview.ts` - Remove ConceptMapPanel registration

### View Icons/Titles

- [ ] `quasar/src/shared/utils/viewIcons.ts` - Remove 'concept-map-panel' from getViewIcon
- [ ] `quasar/src/shared/utils/viewIcons.ts` - Remove 'concept-map-panel' from getViewTitle

### Delete Component Files

- [ ] Delete `quasar/src/features/canvas/components/MindmapView.vue`
- [ ] Delete `quasar/src/features/canvas/components/conceptmap/ConceptMapView.vue`
- [ ] Delete `quasar/src/features/canvas/components/conceptmap/` (entire directory)
- [ ] Delete `quasar/src/pages/components/MindmapPanel.vue`
- [ ] Delete `quasar/src/pages/components/ConceptMapPanel.vue`
- [ ] Delete `quasar/src/shared/components/ThreePanelContainer.vue`

### Clean Up References

- [ ] `quasar/src/layouts/MainLayout.vue` - Remove commented ThreePanelContainer import
- [ ] `quasar/src/pages/IndexPage.vue` - Update comments to reference DockviewLayout

### Delete Composables

- [ ] Search for VueFlow composables: `Get-ChildItem -Path "quasar\src\features\canvas\composables" -Recurse -Include *.ts | Select-String -Pattern "@vue-flow"`
- [ ] Delete found files (likely in mindmap/ or conceptmap/ directories)

### Uninstall Dependencies

- [ ] Run: `npm uninstall @vue-flow/core @vue-flow/background @vue-flow/minimap @vue-flow/controls`

### Search & Destroy

- [ ] Search VueFlow imports: `Get-ChildItem -Path "quasar\src" -Recurse -Include *.vue,*.ts,*.js | Select-String -Pattern "@vue-flow"`
- [ ] Search MindmapView refs: `Get-ChildItem -Path "quasar\src" -Recurse -Include *.vue,*.ts,*.js | Select-String -Pattern "MindmapView\.vue" | Where-Object { $_.Path -notlike "*Vue3MindmapView*" }`
- [ ] Search ConceptMapView refs: `Get-ChildItem -Path "quasar\src" -Recurse -Include *.vue,*.ts,*.js | Select-String -Pattern "ConceptMapView"`
- [ ] Search ThreePanelContainer refs: `Get-ChildItem -Path "quasar\src" -Recurse -Include *.vue,*.ts,*.js | Select-String -Pattern "ThreePanelContainer"`
- [ ] Remove all found references

---

## ✅ Testing (30 min)

### TypeScript Check

- [ ] Run: `npm run type-check`
- [ ] Fix any errors

### App Testing

- [ ] Run: `npm run dev`
- [ ] App starts without errors
- [ ] Create new document
- [ ] Default view is Vue3MindmapView
- [ ] Add nodes → works
- [ ] Edit nodes → works
- [ ] Delete nodes → works
- [ ] Switch to OutlineView → works
- [ ] Switch to WriterView → works
- [ ] Switch back to Mindmap → works
- [ ] Click + button → dropdown shows views
- [ ] 'Concept Map' NOT in dropdown
- [ ] 'Mind Map' works (Vue3MindmapView)
- [ ] No console errors

### Existing Documents

- [ ] Open existing document
- [ ] Verify loads correctly
- [ ] Verify data intact
- [ ] Make changes and save
- [ ] Reload and verify

### Production Build

- [ ] Run: `npm run build`
- [ ] Build succeeds
- [ ] No warnings
- [ ] Bundle size reduced

---

## 📝 Commit

- [ ] Review changes: `git status`
- [ ] Commit with message (see 002J-EXECUTION-STEPS.md)

---

## 🎉 Success Criteria

- [ ] No VueFlow dependencies in package.json
- [ ] No VueFlow imports in codebase
- [ ] No MindmapView.vue or ConceptMapView.vue
- [ ] No ThreePanelContainer.vue
- [ ] No 'concept-map' in types
- [ ] TypeScript check passes
- [ ] Build succeeds
- [ ] App runs without errors
- [ ] Default mindmap is Vue3MindmapView
- [ ] Dropdown doesn't show 'Concept Map'
- [ ] All views work correctly

---

## 📊 Progress Tracker

**Start Time**: ___________

**Prerequisites Complete**: ___________

**Removal Complete**: ___________

**Testing Complete**: ___________

**Committed**: ___________

**Total Time**: ___________

---

**Target**: 3 hours
**Actual**: ___________

