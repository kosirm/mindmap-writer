# File Management Manual Test Plan

## 🎯 Overview

This document outlines the manual testing plan for the new file management component and IndexedDB integration. The tests are designed to verify that all functionality works correctly before proceeding with automated testing.

## 🧪 Test Environment Setup

### Prerequisites
- Chrome browser with DevTools
- MindScribble application running in development mode
- Clean browser profile (no existing IndexedDB data)

### Test Setup Steps
1. Clear all existing IndexedDB data in Chrome DevTools
2. Start MindScribble application
3. Open Chrome DevTools → Application → IndexedDB
4. Verify MindScribbleDB appears and is initialized

## 📋 Test Cases

### Phase 1: IndexedDB Initialization Tests

**Test 1.1: IndexedDB Initialization on App Start**
- **Steps**: Start the application
- **Expected**: MindScribbleDB appears in Chrome DevTools IndexedDB section
- **Verification**: Check that database version is correct (v2)
- **Pass Criteria**: Database is visible and initialized

**Test 1.2: Default Vault Creation**
- **Steps**: Start application with no existing data
- **Expected**: Default vault "My Vault" is created automatically
- **Verification**: Check centralIndex and vaultMetadata tables
- **Pass Criteria**: Default vault exists with correct metadata

**Test 1.3: Database Schema Validation**
- **Steps**: Inspect IndexedDB structure in DevTools
- **Expected**: All tables exist (documents, nodes, settings, errorLogs, providerMetadata, repositories, centralIndex, vaultMetadata)
- **Verification**: Check table structure and indexes
- **Pass Criteria**: All required tables are present with correct structure

### Phase 2: Vault Management Tests

**Test 2.1: Create New Vault**
- **Steps**: Click "New Vault" button, enter name/description
- **Expected**: New vault is created and appears in vault list
- **Verification**: Check vaultMetadata table for new entry
- **Pass Criteria**: Vault is created with correct metadata and appears in UI

**Test 2.2: Open Existing Vault**
- **Steps**: Create multiple vaults, then open each one
- **Expected**: Selected vault becomes active, content is loaded
- **Verification**: Check active vault indicator and content
- **Pass Criteria**: Correct vault is opened and content is displayed

**Test 2.3: Delete Vault**
- **Steps**: Create vault, then delete it
- **Expected**: Vault is removed from list, cannot be opened
- **Verification**: Check vaultMetadata table (should not contain deleted vault)
- **Pass Criteria**: Vault is deleted and no longer accessible

**Test 2.4: Switch Between Vaults**
- **Steps**: Create multiple vaults, switch between them
- **Expected**: Only one vault is active at a time, content changes correctly
- **Verification**: Check active vault indicator and content
- **Pass Criteria**: Vault switching works correctly with proper content loading

### Phase 3: File/Folder Operations Tests

**Test 3.1: Create New File**
- **Steps**: Select folder, click "Add File", enter name
- **Expected**: New file is created in selected folder
- **Verification**: Check file appears in tree and in IndexedDB
- **Pass Criteria**: File is created with correct parent and metadata

**Test 3.2: Create New Folder**
- **Steps**: Select folder, click "Add Folder", enter name
- **Expected**: New folder is created in selected folder
- **Verification**: Check folder appears in tree and can contain items
- **Pass Criteria**: Folder is created and can have child items

**Test 3.3: Rename File/Folder**
- **Steps**: Right-click item, select "Rename", enter new name
- **Expected**: Item name is updated in UI and database
- **Verification**: Check name change persists after refresh
- **Pass Criteria**: Renaming works for both files and folders

**Test 3.4: Delete File/Folder**
- **Steps**: Right-click item, select "Delete", confirm
- **Expected**: Item is removed from tree and database
- **Verification**: Check item no longer exists in IndexedDB
- **Pass Criteria**: Deletion works correctly with confirmation

**Test 3.5: Move File/Folder**
- **Steps**: Drag item to new parent folder
- **Expected**: Item appears in new location with correct parent
- **Verification**: Check parent relationship in database
- **Pass Criteria**: Moving works with proper parent updates

### Phase 4: Drag-and-Drop Validation Tests

**Test 4.1: File into Folder (Valid)**
- **Steps**: Drag file onto folder
- **Expected**: File moves into folder, visual feedback shows valid drop
- **Verification**: Check file parent is updated correctly
- **Pass Criteria**: Valid drop operation works with proper feedback

**Test 4.2: File into File (Invalid)**
- **Steps**: Drag file onto another file
- **Expected**: Drop is rejected, visual feedback shows invalid operation
- **Verification**: Check file parent is unchanged
- **Pass Criteria**: Invalid drop is prevented with clear feedback

**Test 4.3: Folder into Folder (Valid)**
- **Steps**: Drag folder onto another folder
- **Expected**: Folder moves into target folder
- **Verification**: Check folder hierarchy is maintained
- **Pass Criteria**: Folder nesting works correctly

**Test 4.4: Vault Movement (Invalid)**
- **Steps**: Try to drag vault into folder
- **Expected**: Drop is rejected, vault remains at root level
- **Verification**: Check vault position is unchanged
- **Pass Criteria**: Vaults cannot be moved from root level

**Test 4.5: Circular Reference Prevention**
- **Steps**: Try to drag folder into its own subfolder
- **Expected**: Drop is rejected, visual feedback shows error
- **Verification**: Check folder hierarchy remains valid
- **Pass Criteria**: Circular references are prevented

### Phase 5: Integration Tests

**Test 5.1: File Open Integration**
- **Steps**: Create file, then open it
- **Expected**: File content loads into editor
- **Verification**: Check document store contains file content
- **Pass Criteria**: File opening integrates with document system

**Test 5.2: File Save Integration**
- **Steps**: Create document, save to vault
- **Expected**: Document is saved to IndexedDB
- **Verification**: Check document appears in documents table
- **Pass Criteria**: Document saving works with vault system

**Test 5.3: Command System Integration**
- **Steps**: Use command palette for vault operations
- **Expected**: Vault operations work via commands
- **Verification**: Check commands execute correctly
- **Pass Criteria**: Command system integrates with vault operations

**Test 5.4: Sync Manager Integration**
- **Steps**: Create file, check sync status
- **Expected**: Sync status is tracked correctly
- **Verification**: Check providerMetadata table
- **Pass Criteria**: Sync status is properly maintained

### Phase 6: Performance Tests

**Test 6.1: Large Vault Performance**
- **Steps**: Create vault with 100+ files/folders
- **Expected**: UI remains responsive, operations complete quickly
- **Verification**: Measure operation times
- **Pass Criteria**: Performance is acceptable (< 500ms for operations)

**Test 6.2: Memory Usage**
- **Steps**: Monitor memory usage during operations
- **Expected**: Memory usage stable, no leaks
- **Verification**: Check Chrome DevTools memory tab
- **Pass Criteria**: Memory usage remains stable

**Test 6.3: Database Query Performance**
- **Steps**: Perform complex queries on large dataset
- **Expected**: Queries complete quickly
- **Verification**: Measure query times
- **Pass Criteria**: Queries complete in < 100ms

### Phase 7: Error Handling Tests

**Test 7.1: IndexedDB Quota Exceeded**
- **Steps**: Fill IndexedDB to quota limit
- **Expected**: Graceful error handling, user notification
- **Verification**: Check error messages and app state
- **Pass Criteria**: App handles quota errors gracefully

**Test 7.2: Invalid Operations**
- **Steps**: Attempt invalid operations (delete root vault, etc.)
- **Expected**: Operations are prevented, errors shown
- **Verification**: Check app state remains valid
- **Pass Criteria**: Invalid operations are handled safely

**Test 7.3: Network Errors (Sync)**
- **Steps**: Simulate network errors during sync
- **Expected**: Sync fails gracefully, can retry
- **Verification**: Check sync status and error handling
- **Pass Criteria**: Sync errors are handled with retry capability

## 📊 Test Execution Plan

### Test Execution Order
1. **IndexedDB Initialization Tests** (Critical - must pass before proceeding)
2. **Vault Management Tests** (Core functionality)
3. **File/Folder Operations Tests** (Core functionality)
4. **Drag-and-Drop Validation Tests** (UX/Validation)
5. **Integration Tests** (System integration)
6. **Performance Tests** (Performance validation)
7. **Error Handling Tests** (Robustness validation)

### Test Prioritization
- **Critical Tests**: 1.1-1.3, 2.1-2.4, 3.1-3.5 (Must pass for basic functionality)
- **High Priority Tests**: 4.1-4.5, 5.1-5.4 (Must pass for good UX)
- **Medium Priority Tests**: 6.1-6.3 (Should pass for production readiness)
- **Low Priority Tests**: 7.1-7.3 (Should pass for robustness)

## ✅ Pass/Fail Criteria

### Overall Success Criteria
- **All Critical Tests Pass**: Required for basic functionality
- **90%+ High Priority Tests Pass**: Required for good user experience
- **80%+ Medium Priority Tests Pass**: Required for production readiness
- **70%+ Low Priority Tests Pass**: Required for robustness

### Individual Test Criteria
- **Pass**: Test executes as expected, all verification steps succeed
- **Fail**: Test does not execute as expected, or verification fails
- **Blocked**: Test cannot be executed due to dependencies
- **Skipped**: Test is not applicable in current configuration

## 📝 Test Documentation

### Test Case Template
```markdown
**Test ID**: [Unique identifier]
**Test Name**: [Descriptive name]
**Test Phase**: [Phase 1-7]
**Test Priority**: [Critical/High/Medium/Low]
**Test Type**: [Functional/Integration/Performance/Error]

**Prerequisites**:
- [List any prerequisites]

**Test Steps**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Results**:
- [Expected outcome 1]
- [Expected outcome 2]
- [Expected outcome 3]

**Verification**:
- [Verification method 1]
- [Verification method 2]
- [Verification method 3]

**Pass Criteria**:
- [Criteria 1]
- [Criteria 2]
- [Criteria 3]

**Actual Results**:
- [To be filled during testing]

**Status**: [Pass/Fail/Blocked/Skipped]
- **Notes**: [Any observations or issues]
```

### Test Execution Log

Create a test execution log to track progress:

```markdown
## Test Execution Log

### Phase 1: IndexedDB Initialization
- [ ] Test 1.1: IndexedDB Initialization on App Start
- [ ] Test 1.2: Default Vault Creation
- [ ] Test 1.3: Database Schema Validation

### Phase 2: Vault Management
- [ ] Test 2.1: Create New Vault
- [ ] Test 2.2: Open Existing Vault
- [ ] Test 2.3: Delete Vault
- [ ] Test 2.4: Switch Between Vaults

### Phase 3: File/Folder Operations
- [ ] Test 3.1: Create New File
- [ ] Test 3.2: Create New Folder
- [ ] Test 3.3: Rename File/Folder
- [ ] Test 3.4: Delete File/Folder
- [ ] Test 3.5: Move File/Folder

### Phase 4: Drag-and-Drop Validation
- [ ] Test 4.1: File into Folder (Valid)
- [ ] Test 4.2: File into File (Invalid)
- [ ] Test 4.3: Folder into Folder (Valid)
- [ ] Test 4.4: Vault Movement (Invalid)
- [ ] Test 4.5: Circular Reference Prevention

### Phase 5: Integration Tests
- [ ] Test 5.1: File Open Integration
- [ ] Test 5.2: File Save Integration
- [ ] Test 5.3: Command System Integration
- [ ] Test 5.4: Sync Manager Integration

### Phase 6: Performance Tests
- [ ] Test 6.1: Large Vault Performance
- [ ] Test 6.2: Memory Usage
- [ ] Test 6.3: Database Query Performance

### Phase 7: Error Handling Tests
- [ ] Test 7.1: IndexedDB Quota Exceeded
- [ ] Test 7.2: Invalid Operations
- [ ] Test 7.3: Network Errors (Sync)
```

## 🎯 Test Completion Criteria

### Minimum Viable Testing (Phase 1-3)
- All critical tests pass
- Basic functionality is verified
- Ready for initial user testing

### Production Ready Testing (Phase 1-5)
- All critical and high priority tests pass
- Integration is verified
- Ready for beta testing

### Full Testing (Phase 1-7)
- All tests pass or have acceptable workarounds
- Performance and error handling verified
- Ready for production release

## 🔮 Next Steps

1. **Execute Phase 1 Tests** (IndexedDB Initialization) - Critical for all other tests
2. **Execute Phase 2-3 Tests** (Core Functionality) - Verify basic operations work
3. **Execute Phase 4-5 Tests** (UX and Integration) - Verify complete user experience
4. **Execute Phase 6-7 Tests** (Performance and Robustness) - Final validation
5. **Document Results** - Record all test outcomes and issues
6. **Address Failures** - Fix any failed tests before proceeding

**Recommendation**: Start with Phase 1 tests immediately to ensure IndexedDB is working correctly, then proceed to core functionality testing.