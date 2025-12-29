# .space.lock File: Synchronization Safety Mechanism

## 🔒 Purpose of Lock Files

The `.space.lock` file prevents **conflict races** during synchronization by implementing a simple locking mechanism. This is crucial for multi-device scenarios.

## 🚦 How Lock Files Work

### Basic Concept:
- **Lock file** indicates a repository is currently being synced
- **Prevents concurrent modifications** that could cause conflicts
- **Simple JSON format** for easy debugging

### Lock File Structure:

```json
{
    "lockId": "sync-12345",
    "repositoryId": "project-67890",
    "lockedBy": "device-macbook-pro",
    "lockedAt": 1703784000000,
    "operation": "full-sync",
    "status": "in-progress",
    "timeout": 1703784060000,  // Auto-release after 60 seconds
    "message": "Synchronizing with Google Drive"
}
```

## 🔄 Lock File Lifecycle

### 1. **Acquiring a Lock**
```
1. App starts sync operation
2. Check if `.space.lock` exists
3. If exists and not expired → wait or show conflict
4. If doesn't exist or expired → create new lock file
5. Proceed with sync operation
```

### 2. **Releasing a Lock**
```
1. Sync operation completes successfully
2. Delete `.space.lock` file
3. Update repository metadata
4. Notify other devices if needed
```

### 3. **Timeout Handling**
```
1. Lock file has expiration timestamp
2. If app crashes, lock auto-releases after timeout
3. Next sync can proceed normally
```

## 🛡️ Conflict Prevention Scenarios

### Scenario 1: **Two Devices Sync Simultaneously**
```
Device A: Starts sync → Creates .space.lock
Device B: Starts sync → Sees .space.lock → Waits
Device A: Finishes sync → Deletes .space.lock
Device B: Proceeds with sync
```

### Scenario 2: **App Crash During Sync**
```
Device: Starts sync → Creates .space.lock
Device: Crashes during sync
Timeout: 60 seconds pass
Next sync: Lock expired → Proceeds normally
```

### Scenario 3: **Manual Editing During Sync**
```
User: Opens file in external editor
App: Detects file change + active lock
App: Shows warning: "Sync in progress, changes may be lost"
App: Offers to queue changes for after sync
```

## 📝 Lock File Content Details

### Required Fields:
```json
{
    "lockId": "unique-identifier",      // UUID for this lock
    "repositoryId": "repo-123",        // Which repository is locked
    "lockedAt": 1703784000000,          // When lock was acquired
    "timeout": 1703784060000           // When lock expires (60s later)
}
```

### Optional Fields:
```json
{
    "lockedBy": "device-name",        // Which device holds the lock
    "operation": "full-sync",         // What operation is happening
    "status": "in-progress",          // Current status
    "message": "User-friendly message", // What's happening
    "progress": 0.75,                  // Progress percentage
    "filesProcessed": 42,              // Sync progress details
    "totalFiles": 120
}
```

## 🔧 Implementation Considerations

### Lock File Management:

```typescript
class SpaceLockManager {
    private static LOCK_TIMEOUT = 60 * 1000; // 60 seconds
    
    async acquireLock(repositoryId: string, operation: string): Promise<LockResult> {
        const lockFilePath = path.join(repositoryId, '.space.lock');
        
        // Check existing lock
        if (await this.isLocked(lockFilePath)) {
            return { success: false, error: 'repository_locked' };
        }
        
        // Create new lock
        const lockData = {
            lockId: generateUUID(),
            repositoryId,
            lockedAt: Date.now(),
            timeout: Date.now() + SpaceLockManager.LOCK_TIMEOUT,
            operation,
            lockedBy: getDeviceId()
        };
        
        await fs.writeFile(lockFilePath, JSON.stringify(lockData, null, 2));
        
        return { success: true, lock: lockData };
    }
    
    async releaseLock(repositoryId: string): Promise<void> {
        const lockFilePath = path.join(repositoryId, '.space.lock');
        await fs.unlink(lockFilePath).catch(() => {}); // Ignore if doesn't exist
    }
    
    async isLocked(lockFilePath: string): Promise<boolean> {
        try {
            const content = await fs.readFile(lockFilePath, 'utf-8');
            const lockData = JSON.parse(content);
            
            // Check if lock is expired
            if (Date.now() > lockData.timeout) {
                await this.releaseLock(lockData.repositoryId);
                return false;
            }
            
            return true;
        } catch (error) {
            return false; // No lock file or invalid
        }
    }
    
    async checkLockStatus(repositoryId: string): Promise<LockStatus> {
        const lockFilePath = path.join(repositoryId, '.space.lock');
        
        if (!(await fs.exists(lockFilePath))) {
            return { locked: false };
        }
        
        const content = await fs.readFile(lockFilePath, 'utf-8');
        const lockData = JSON.parse(content);
        
        return {
            locked: true,
            lockId: lockData.lockId,
            lockedBy: lockData.lockedBy,
            lockedAt: lockData.lockedAt,
            timeout: lockData.timeout,
            operation: lockData.operation,
            message: lockData.message,
            timeRemaining: Math.max(0, lockData.timeout - Date.now())
        };
    }
}
```

### UI Integration:

```vue
<!-- LockStatusIndicator.vue -->
<template>
    <div v-if="isLocked" class="lock-indicator">
        <q-icon name="lock" color="warning" />
        <span>Repository locked by {{ lockInfo.lockedBy }}</span>
        <span>{{ lockInfo.operation }} in progress</span>
        <q-linear-progress 
            :value="progress"
            color="warning"
        />
        <span>Time remaining: {{ formatTime(lockInfo.timeRemaining) }}</span>
    </div>
</template>
```

## 🎯 When to Use Lock Files

### Essential Use Cases:
1. **Full Repository Sync** - Prevents conflicts during major syncs
2. **Schema Migration** - Ensures atomic schema updates
3. **Conflict Resolution** - Locks during manual conflict handling
4. **Backup Operations** - Prevents changes during backup
5. **Import/Export** - Ensures data consistency

### Optional Use Cases:
1. **Individual File Edits** - Usually not needed for single files
2. **Read Operations** - Typically don't require locking
3. **Background Auto-save** - Short operations may skip locking

## ⚠️ Edge Cases and Solutions

### Problem: **Stale Lock Files**
**Solution**: Automatic timeout (60 seconds) + cleanup on app start

### Problem: **Network Partition**
**Solution**: Optimistic locking with conflict resolution fallback

### Problem: **User Force Quits App**
**Solution**: Timeout mechanism releases lock automatically

### Problem: **Multiple Apps Accessing Same Files**
**Solution**: File-level locking in addition to repository locking

## 📊 Lock File vs Other Approaches

| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| **Lock Files** | Simple, visible, debuggable | Manual cleanup needed | Most scenarios |
| **Database Locks** | Automatic, robust | Complex, hidden | Server apps |
| **Optimistic Concurrency** | No locking needed | Complex conflict resolution | Simple apps |
| **File System Locks** | OS-level, robust | Platform-specific | Advanced use |

## 🎯 Best Practices

### 1. **Always Set Timeout**
- Never create locks without expiration
- 60 seconds is good default for most operations
- Adjust timeout based on operation complexity

### 2. **Clean Up on App Start**
```typescript
// On app initialization
const lockFiles = await findLockFiles();
for (const lockFile of lockFiles) {
    if (await isLockExpired(lockFile)) {
        await fs.unlink(lockFile);
    }
}
```

### 3. **Provide User Feedback**
- Show lock status in UI
- Explain why operations are delayed
- Offer to queue changes

### 4. **Handle Timeouts Gracefully**
```typescript
// When acquiring lock fails
if (lockResult.error === 'repository_locked') {
    const lockStatus = await checkLockStatus(repositoryId);
    
    if (lockStatus.timeRemaining < 30000) {
        // Less than 30s remaining - wait
        showMessage('Waiting for sync to complete...');
        await delay(lockStatus.timeRemaining + 1000);
    } else {
        // Long wait - offer alternatives
        showConflictDialog(lockStatus);
    }
}
```

### 5. **Log Lock Activities**
```json
{
    "event": "lock_acquired",
    "lockId": "sync-12345",
    "repositoryId": "project-67890",
    "timestamp": 1703784000000,
    "operation": "full-sync"
}
```

## 🚀 Implementation Recommendation

**Use `.space.lock` files for:**
- ✅ Repository-level synchronization
- ✅ Schema migrations
- ✅ Conflict resolution operations
- ✅ Backup/restore processes

**Don't use for:**
- ❌ Individual file edits
- ❌ Read operations
- ❌ Short auto-save operations

The lock file provides a simple, visible, and effective way to prevent synchronization conflicts while maintaining good user experience.