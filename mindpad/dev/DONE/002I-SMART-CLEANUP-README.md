# Smart Legacy Store Cleanup - README

**Date:** 2025-12-26  
**Status:** 📋 READY TO EXECUTE

---

## 🎯 Goal

Remove legacy stores (DocumentStore, MultiDocumentStore, StoreSynchronizer) and migration code from the codebase in a safe, incremental way that minimizes errors and keeps the app working throughout the process.

---

## 📚 Documentation Files

This cleanup is documented in 4 files:

1. **002I-SMART-CLEANUP-README.md** (this file)
   - Overview and getting started guide

2. **002I-SMART-CLEANUP-PLAN.md**
   - Detailed step-by-step plan with explanations
   - Time estimates for each phase
   - Testing instructions

3. **002I-SMART-CLEANUP-CHECKLIST.md**
   - Quick checklist format
   - Track progress as you go
   - Emergency rollback instructions

4. **002I-CLEANUP-PATTERNS.md**
   - Common code patterns to find and replace
   - Before/after examples
   - Quick reference for each file

---

## 🚀 Quick Start

### Step 1: Read the Plan
Open `002I-SMART-CLEANUP-PLAN.md` and read through it once to understand the overall approach.

### Step 2: Create Branches
```bash
git checkout -b backup-before-smart-cleanup
git checkout -b smart-cleanup-legacy-stores
```

### Step 3: Follow the Checklist
Open `002I-SMART-CLEANUP-CHECKLIST.md` and work through it step by step.

### Step 4: Use the Patterns Guide
Keep `002I-CLEANUP-PATTERNS.md` open as a reference while making changes.

---

## 🎨 Key Principles

### 1. One File at a Time
- Make changes to ONE file
- Test that file
- Commit that file
- Move to next file

### 2. Test After Every Change
- TypeScript compiles (no red squiggles)
- App starts without errors
- No console errors
- The specific feature works

### 3. Commit Frequently
- One commit per file
- Clear commit messages
- Easy to rollback if needed

### 4. Bottom-Up Approach
- Start with leaf components (views)
- Work up to core stores
- Delete legacy files last

---

## 📊 Progress Overview

**Total Work:**
- 14 files to update
- 4 files to delete
- ~2000+ lines to remove
- ~5 hours estimated time

**Phases:**
1. ⏱️ 5 min - Preparation
2. ⏱️ 30 min - Remove store mode toggle
3. ⏱️ 2 hours - Update view components (6 files)
4. ⏱️ 45 min - Update file operations (2 files)
5. ⏱️ 45 min - Update layout components (3 files)
6. ⏱️ 30 min - Clean up core stores (2 files)
7. ⏱️ 10 min - Delete legacy files (4 files)
8. ⏱️ 30 min - Final verification

---

## 🔍 What Gets Changed

### Imports to Remove
```typescript
import { useDocumentStore } from 'src/core/stores/documentStore'
import { useMultiDocumentStore } from 'src/core/stores/multiDocumentStore'
import { useStoreSynchronizer } from 'src/core/stores/storeSynchronizer'
import { useStoreMode } from 'src/composables/useStoreMode'
```

### Code Patterns to Remove
```typescript
// Store initialization
const documentStore = useDocumentStore()
const multiDocStore = useMultiDocumentStore()
const { isUnifiedMode, isDualWriteMode } = useStoreMode()

// Conditional logic
if (isUnifiedMode.value) {
  unifiedStore.doSomething()
} else {
  documentStore.doSomething()
}
```

### Replacement Pattern
```typescript
// Just use unified store directly
unifiedStore.doSomething()
```

---

## 🛠️ Tools You'll Need

### VS Code Extensions
- ESLint (for linting)
- Volar (for Vue)
- TypeScript Vue Plugin

### Terminal Commands
```bash
# Start dev server
npm run dev

# Check TypeScript
npm run type-check

# Search for patterns
grep -r "useDocumentStore" mindpad/quasar/src/
```

### Browser Tools
- Chrome DevTools Console (check for errors)
- Vue DevTools (inspect store state)

---

## ⚠️ Common Pitfalls

### 1. Forgetting the `?` Operator
```typescript
// ❌ Wrong - will crash if no active document
unifiedStore.activeDocument.nodes

// ✅ Right - safe access
unifiedStore.activeDocument?.nodes
```

### 2. Incomplete Conditional Removal
```typescript
// ❌ Wrong - missed one conditional
const nodes = unifiedStore.activeDocument?.nodes
if (isUnifiedMode.value) {  // ← Still here!
  doSomething()
}

// ✅ Right - all conditionals removed
const nodes = unifiedStore.activeDocument?.nodes
doSomething()
```

### 3. Skipping Tests
```typescript
// ❌ Wrong approach
// 1. Update 5 files
// 2. Test once
// 3. Find 20 errors
// 4. Get confused

// ✅ Right approach
// 1. Update 1 file
// 2. Test immediately
// 3. Find 0-2 errors
// 4. Fix and commit
// 5. Repeat
```

---

## 🆘 Emergency Procedures

### If You Get Stuck
1. Read the error message carefully
2. Check `002I-CLEANUP-PATTERNS.md` for the right pattern
3. Make sure you removed ALL conditionals
4. Check for typos in store method names

### If You Need to Rollback
```bash
# Rollback last commit
git reset --hard HEAD~1

# Rollback to specific commit
git log --oneline  # Find the commit hash
git reset --hard <commit-hash>

# Start over from scratch
git checkout backup-before-smart-cleanup
git branch -D smart-cleanup-legacy-stores
git checkout -b smart-cleanup-legacy-stores
```

---

## ✅ Success Criteria

You're done when:
- ✅ All 14 files updated
- ✅ All 4 legacy files deleted
- ✅ No TypeScript errors
- ✅ No console errors
- ✅ All views work (Outline, Writer, Mindmap)
- ✅ All operations work (create, edit, delete, move)
- ✅ File operations work (save, open, manage)
- ✅ Autosave works
- ✅ Multi-document support works

---

## 🎉 After Completion

1. Run final verification tests
2. Search for any remaining legacy references
3. Clean up localStorage
4. Update documentation
5. Create PR for review
6. Celebrate! 🎊

---

## 📞 Need Help?

If you encounter issues:
1. Check the error message
2. Review `002I-CLEANUP-PATTERNS.md`
3. Check if you missed a step in the checklist
4. Rollback and try again
5. Ask for help with specific error messages

---

## 🎯 Remember

**The key to success is:**
- 🐢 Go slow and steady
- 🧪 Test after every change
- 💾 Commit frequently
- 📖 Follow the checklist
- 🔄 Rollback if needed

**You've got this!** 💪

