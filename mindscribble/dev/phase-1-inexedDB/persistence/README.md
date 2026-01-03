# Complete Persistence Implementation Guide

## 📋 Overview

This guide provides a step-by-step implementation plan for adding complete persistence to the Mindscribble app. When complete, users will see exactly the same state when they reload the app or switch devices:
- Same files open
- Same file tabs arrangement
- Same views arrangement within each file

## 🎯 Goals

1. **Remove default "Untitled 1" file** - No more empty file on startup
2. **Track open files** - Remember which files are open
3. **Persist layouts locally** - Save to IndexedDB for fast restore
4. **Sync to Google Drive** - Share layouts across devices

## 📚 Documentation Structure

### [00_OVERVIEW.md](./00_OVERVIEW.md)
High-level overview of the problem, current state, and implementation phases.

**Read this first** to understand the big picture.

### [01_PHASE_1_LOCAL_PERSISTENCE.md](./01_PHASE_1_LOCAL_PERSISTENCE.md)
**Phase 1: Local Persistence (IndexedDB + localStorage)**

Step-by-step instructions for:
1. Removing default file creation
2. Tracking open files
3. Restoring files and layouts on app reload

**Start here** for implementation.

### [02_PHASE_2_INDEXEDDB_SYNC.md](./02_PHASE_2_INDEXEDDB_SYNC.md)
**Phase 2: Sync Layouts to IndexedDB**

Step-by-step instructions for:
1. Adding parent layout to UIStateService
2. Syncing parent layout from localStorage to IndexedDB
3. Syncing child layouts from localStorage to IndexedDB

**Do this** after Phase 1 is complete and tested.

### [03_PHASE_3_GOOGLE_DRIVE_SYNC.md](./03_PHASE_3_GOOGLE_DRIVE_SYNC.md)
**Phase 3: Sync to Google Drive**

Step-by-step instructions for:
1. Adding parent layout to `.repository.json`
2. Adding child layouts to `.mindpad` files
3. Loading layouts from Google Drive

**Do this** after Phase 2 is complete and tested.

### [04_TESTING_CHECKLIST.md](./04_TESTING_CHECKLIST.md)
Comprehensive testing checklist for all phases:
- Phase 1 tests (local persistence)
- Phase 2 tests (IndexedDB sync)
- Phase 3 tests (Google Drive sync)
- Integration tests
- Edge cases
- Performance tests

**Use this** to verify each phase works correctly.

### [05_IMPLEMENTATION_NOTES.md](./05_IMPLEMENTATION_NOTES.md)
Technical notes and considerations:
- Architecture overview
- Design decisions
- Important considerations
- Performance tips
- Common pitfalls
- Future enhancements

**Read this** for deeper understanding and best practices.

### [06_QUICK_REFERENCE.md](./06_QUICK_REFERENCE.md)
Quick reference guide:
- File locations
- Key functions
- Data structures
- Console logs
- Debugging checklist
- Useful snippets

**Use this** as a cheat sheet during implementation.

## 🚀 Getting Started

### Prerequisites
- ✅ IndexedDB schema has `uiState` and `fileLayouts` tables
- ✅ `UIStateService` exists
- ✅ `restoreUIState()` is called in `boot/sync.ts`

### Implementation Order

1. **Read [00_OVERVIEW.md](./00_OVERVIEW.md)** to understand the problem and solution
2. **Follow [01_PHASE_1_LOCAL_PERSISTENCE.md](./01_PHASE_1_LOCAL_PERSISTENCE.md)** step by step
3. **Test Phase 1** using [04_TESTING_CHECKLIST.md](./04_TESTING_CHECKLIST.md)
4. **Follow [02_PHASE_2_INDEXEDDB_SYNC.md](./02_PHASE_2_INDEXEDDB_SYNC.md)** step by step
5. **Test Phase 2** using [04_TESTING_CHECKLIST.md](./04_TESTING_CHECKLIST.md)
6. **Follow [03_PHASE_3_GOOGLE_DRIVE_SYNC.md](./03_PHASE_3_GOOGLE_DRIVE_SYNC.md)** step by step
7. **Test Phase 3** using [04_TESTING_CHECKLIST.md](./04_TESTING_CHECKLIST.md)
8. **Run integration tests** from [04_TESTING_CHECKLIST.md](./04_TESTING_CHECKLIST.md)

### Estimated Time

- **Phase 1:** 2-3 hours (implementation + testing)
- **Phase 2:** 1-2 hours (implementation + testing)
- **Phase 3:** 2-3 hours (implementation + testing)
- **Total:** 5-8 hours

## 📊 Progress Tracking

### Phase 1: Local Persistence
- [ ] Step 1: Remove default file creation
- [ ] Step 2: Track open files when opened
- [ ] Step 3: Track when files are closed
- [ ] Step 4: Enhance restoreUIState()
- [ ] Step 5: Add event to events.ts
- [ ] Step 6: Listen to restore-ui-state event
- [ ] Step 7: Add helper functions
- [ ] Step 8: Import types
- [ ] ✅ Phase 1 Testing Complete

### Phase 2: IndexedDB Sync
- [ ] Step 1: Add parent layout to UIStateService
- [ ] Step 2: Update UIState interface
- [ ] Step 3: Sync parent layout to IndexedDB
- [ ] Step 4: Sync child layouts to IndexedDB
- [ ] Step 5: Update calls to saveChildLayoutToStorage
- [ ] Step 6: Verify IndexedDB schema
- [ ] Step 7: Test IndexedDB sync
- [ ] Step 8: Verify restoration still works
- [ ] ✅ Phase 2 Testing Complete

### Phase 3: Google Drive Sync
- [ ] Step 1: Update Repository interface
- [ ] Step 2: Sync parent layout to repository
- [ ] Step 3: Load parent layout from repository
- [ ] Step 4: Sync child layout to document
- [ ] Step 5: Load child layout from document (Drive)
- [ ] Step 6: Load child layout from document (Vault)
- [ ] Step 7: Identify where repository is saved
- [ ] Step 8: Test Google Drive sync
- [ ] Step 9: Handle layout translation (optional)
- [ ] ✅ Phase 3 Testing Complete

## 🐛 Troubleshooting

### Files not restoring?
See [06_QUICK_REFERENCE.md](./06_QUICK_REFERENCE.md) → Debugging Checklist

### Layouts not restoring?
See [06_QUICK_REFERENCE.md](./06_QUICK_REFERENCE.md) → Debugging Checklist

### Google Drive sync not working?
See [06_QUICK_REFERENCE.md](./06_QUICK_REFERENCE.md) → Debugging Checklist

### Need help?
1. Check console logs (see [06_QUICK_REFERENCE.md](./06_QUICK_REFERENCE.md))
2. Inspect IndexedDB (see [06_QUICK_REFERENCE.md](./06_QUICK_REFERENCE.md))
3. Review [05_IMPLEMENTATION_NOTES.md](./05_IMPLEMENTATION_NOTES.md) for common pitfalls

## 📝 Notes

- Each phase builds on the previous one
- Test thoroughly after each phase before moving to the next
- Keep [06_QUICK_REFERENCE.md](./06_QUICK_REFERENCE.md) open while implementing
- Refer to [05_IMPLEMENTATION_NOTES.md](./05_IMPLEMENTATION_NOTES.md) for design decisions

## 🎉 Success Criteria

After completing all phases, you should be able to:

1. ✅ Open the app with no default "Untitled 1" file
2. ✅ Open multiple files and arrange tabs
3. ✅ Arrange views within each file
4. ✅ Reload the app and see everything restored
5. ✅ Sync to Google Drive
6. ✅ Open on another device and see the same layout
7. ✅ Switch vaults and see different layouts

## 📞 Support

If you encounter issues:
1. Review the relevant phase document
2. Check the testing checklist
3. Consult the implementation notes
4. Use the quick reference guide

Good luck! 🚀

