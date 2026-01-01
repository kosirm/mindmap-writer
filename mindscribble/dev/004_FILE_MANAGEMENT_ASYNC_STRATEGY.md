# Async/Worker Strategy for Google Drive File Operations

## 🎯 Core Principle: Never Block UI Thread

All Google Drive operations should be:
1. **Async by default** - Use Promises/async-await
2. **Offloaded when possible** - Use Web Workers for CPU-intensive tasks
3. **Progress-tracked** - Provide real-time feedback
4. **Cancellable** - Allow user to abort long operations

## 🔧 Implementation Strategy

### 1. Async Operations (All I/O Operations)

```typescript
// Current synchronous-style (problematic)
async function copyFile(fileId: string, newParentId: string): Promise<string> {
  const response = await gapi.client.drive.files.copy({
    fileId: fileId,
    parents: [newParentId]
  });
  return response.result.id;
}

// Better: Explicit async with progress
async function copyFileWithProgress(
  fileId: string, 
  newParentId: string,
  onProgress?: (progress: {current: number, total: number}) => void
): Promise<string> {
  // This is still async, but we can add progress tracking
  const response = await gapi.client.drive.files.copy({
    fileId: fileId,
    parents: [newParentId]
  });
  
  if (onProgress) {
    onProgress({current: 1, total: 1}); // Simple operation
  }
  
  return response.result.id;
}
```

### 2. Web Worker for CPU-Intensive Tasks

**Use Cases for Web Workers:**
- File compression/decompression
- Large JSON parsing
- Recursive folder structure analysis
- Batch operation preparation

```typescript
// worker/fileOperationsWorker.ts
self.onmessage = async (e) => {
  const { type, data } = e.data;
  
  switch (type) {
    case 'compress-files':
      const compressed = await compressFilesBatch(data.files);
      postMessage({ type: 'compress-result', data: compressed });
      break;
    
    case 'analyze-folder-structure':
      const structure = analyzeFolderHierarchy(data.folderData);
      postMessage({ type: 'structure-result', data: structure });
      break;
  }
};

// Main thread usage
const worker = new Worker('./fileOperationsWorker.ts');
worker.postMessage({
  type: 'compress-files',
  data: { files: largeFileList }
});

worker.onmessage = (e) => {
  if (e.data.type === 'compress-result') {
    // Handle compressed files
    worker.terminate(); // Clean up
  }
};
```

### 3. Service Worker for Background Operations

**Use Cases for Service Workers:**
- Periodic sync operations
- Background file indexing
- Offline operation queuing
- Long-running batch operations

```typescript
// service-worker.js
self.addEventListener('message', (event) => {
  if (event.data.type === 'background-sync') {
    event.waitUntil(
      syncVaultInBackground(event.data.vaultId)
        .then(() => {
          clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'sync-complete',
                vaultId: event.data.vaultId
              });
            });
          });
        })
    );
  }
});

async function syncVaultInBackground(vaultId: string) {
  // This runs in background, doesn't block UI
  const files = await listDriveFiles(vaultId);
  
  for (const file of files) {
    // Process each file with progress reporting
    await processFile(file);
    
    // Report progress to main thread
    postMessageToClients({
      type: 'sync-progress',
      current: index + 1,
      total: files.length,
      fileName: file.name
    });
  }
}
```

### 4. Operation Queue with Priority

```typescript
class OperationQueue {
  private queue: Array<() => Promise<void>> = [];
  private isProcessing = false;
  
  enqueue(operation: () => Promise<void>, priority: 'high' | 'normal' | 'low' = 'normal') {
    // Insert based on priority
    if (priority === 'high') {
      this.queue.unshift(operation);
    } else {
      this.queue.push(operation);
    }
    
    this.processNext();
  }
  
  private async processNext() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    const operation = this.queue.shift();
    
    try {
      await operation();
    } catch (error) {
      console.error('Operation failed:', error);
      // Could add retry logic here
    } finally {
      this.isProcessing = false;
      this.processNext();
    }
  }
  
  clear() {
    this.queue = [];
  }
}

// Usage
const fileOperationQueue = new OperationQueue();

// High priority (user-initiated)
fileOperationQueue.enqueue(
  () => copyFile(fileId, newParentId),
  'high'
);

// Low priority (background sync)
fileOperationQueue.enqueue(
  () => syncVault(vaultId),
  'low'
);
```

## 📊 Performance Optimization Techniques

### 1. Batching Operations
```typescript
// Instead of individual API calls
for (const file of files) {
  await gapi.client.drive.files.copy({ fileId: file.id, parents: [newParentId] });
}

// Use batch requests (where supported)
const batch = gapi.newBatch();
files.forEach(file => {
  batch.add(gapi.client.drive.files.copy({ 
    fileId: file.id, 
    parents: [newParentId] 
  }));
});

const results = await batch.execute();
```

### 2. Parallel Processing (with limits)
```typescript
async function copyMultipleFiles(fileIds: string[], newParentId: string, concurrency = 3) {
  const results = [];
  
  // Process in batches of 'concurrency'
  for (let i = 0; i < fileIds.length; i += concurrency) {
    const batch = fileIds.slice(i, i + concurrency);
    
    const batchResults = await Promise.all(
      batch.map(fileId => 
        gapi.client.drive.files.copy({ 
          fileId: fileId, 
          parents: [newParentId] 
        })
      )
    );
    
    results.push(...batchResults);
    
    // Small delay to avoid rate limiting
    if (i + concurrency < fileIds.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}
```

### 3. Progress Reporting Pattern
```typescript
interface ProgressCallback {
  (progress: {
    current: number;
    total: number;
    percentage: number;
    status: string;
    currentItem?: string;
    estimatedTimeRemaining?: number;
  }): void;
}

async function copyFolderRecursive(
  folderId: string,
  newParentId: string,
  onProgress?: ProgressCallback
): Promise<string> {
  const startTime = Date.now();
  
  // 1. Get folder contents
  const files = await listFolderContents(folderId);
  const totalItems = files.length;
  
  // 2. Create new folder
  const newFolder = await createFolder('Copy of ' + folderName, newParentId);
  
  // 3. Copy contents with progress
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      // Recursive folder copy
      await copyFolderRecursive(file.id, newFolder.id, (progress) => {
        // Adjust progress for nested operation
        const adjustedProgress = {
          ...progress,
          current: i + progress.current,
          total: totalItems,
          percentage: ((i + progress.current) / totalItems) * 100
        };
        onProgress?.(adjustedProgress);
      });
    } else {
      // File copy
      await copyFile(file.id, newFolder.id);
      
      // Report progress
      const elapsed = Date.now() - startTime;
      const avgTimePerItem = elapsed / (i + 1);
      const remainingItems = totalItems - (i + 1);
      const estimatedRemaining = remainingItems * avgTimePerItem;
      
      onProgress?.({
        current: i + 1,
        total: totalItems,
        percentage: ((i + 1) / totalItems) * 100,
        status: `Copying ${file.name}`,
        currentItem: file.name,
        estimatedTimeRemaining: estimatedRemaining
      });
    }
  }
  
  return newFolder.id;
}
```

## 🎨 UI Integration Patterns

### 1. Operation Status Component
```vue
<template>
  <q-dialog v-model="showOperationProgress" persistent>
    <q-card style="min-width: 400px">
      <q-card-section class="row items-center">
        <q-avatar icon="cloud_upload" color="primary" text-color="white" />
        <span class="q-ml-sm">{{ operationTitle }}</span>
      </q-card-section>
      
      <q-card-section>
        <q-linear-progress 
          :value="progress.percentage / 100"
          color="primary"
          size="20px"
          class="q-mb-sm"
        >
          <div class="absolute-full flex flex-center">
            <span class="text-white text-caption">
              {{ Math.round(progress.percentage) }}% - {{ progress.status }}
            </span>
          </div>
        </q-linear-progress>
        
        <div class="text-caption q-mt-sm">
          {{ progress.current }} of {{ progress.total }} items
          <span v-if="progress.currentItem">({{ progress.currentItem }})</span>
        </div>
        
        <div class="text-caption q-mt-xs" v-if="progress.estimatedTimeRemaining">
          Estimated time remaining: {{ formatTime(progress.estimatedTimeRemaining) }}
        </div>
      </q-card-section>
      
      <q-card-actions align="right">
        <q-btn 
          v-if="progress.status === 'running' && progress.cancellable"
          flat 
          label="Cancel" 
          color="negative" 
          @click="cancelOperation"
          :disable="!canCancel"
        />
        <q-btn 
          v-else
          flat 
          label="Background" 
          color="secondary" 
          @click="moveToBackground"
          v-if="!isBackground"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const showOperationProgress = ref(false);
const operationTitle = ref('');
const progress = ref({
  current: 0,
  total: 0,
  percentage: 0,
  status: 'Starting...',
  currentItem: '',
  estimatedTimeRemaining: 0
});
const canCancel = ref(true);
const isBackground = ref(false);

let cancelCallback: (() => void) | null = null;

function startOperation(title: string, cancelCb?: () => void) {
  operationTitle.value = title;
  showOperationProgress.value = true;
  canCancel.value = !!cancelCb;
  cancelCallback = cancelCb || null;
  isBackground.value = false;
  
  // Reset progress
  progress.value = {
    current: 0,
    total: 0,
    percentage: 0,
    status: 'Starting...',
    currentItem: '',
    estimatedTimeRemaining: 0
  };
}

function updateProgress(newProgress: Partial<typeof progress.value>) {
  progress.value = { ...progress.value, ...newProgress };
}

function completeOperation() {
  progress.value = { ...progress.value, 
    percentage: 100,
    status: 'Complete!'
  };
  setTimeout(() => {
    showOperationProgress.value = false;
  }, 1000);
}

function cancelOperation() {
  if (cancelCallback) {
    cancelCallback();
    cancelCallback = null;
    progress.value.status = 'Cancelling...';
    canCancel.value = false;
  }
}

function moveToBackground() {
  isBackground.value = true;
  showOperationProgress.value = false;
  // Operation continues in background
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms/1000)}s`;
  return `${Math.round(ms/60000)}m ${Math.round((ms%60000)/1000)}s`;
}

// Expose to parent component
defineExpose({
  startOperation,
  updateProgress,
  completeOperation
});
</script>
```

### 2. Background Operation Notifications
```vue
<template>
  <div class="background-operations">
    <q-banner 
      v-for="operation in backgroundOperations"
      :key="operation.id"
      dense
      class="bg-grey-2 q-mb-sm"
    >
      <template v-slot:avatar>
        <q-icon 
          :name="operation.icon"
          :color="operation.status === 'running' ? 'primary' : operation.status === 'completed' ? 'positive' : 'negative'"
        />
      </template>
      
      {{ operation.title }} - {{ operation.progress }}%
      
      <template v-slot:action>
        <q-btn 
          v-if="operation.status === 'running' && operation.cancellable"
          flat 
          dense 
          icon="close" 
          color="negative" 
          @click="cancelBackgroundOperation(operation.id)"
        />
        <q-btn 
          v-else
          flat 
          dense 
          icon="close" 
          @click="dismissOperation(operation.id)"
        />
      </template>
    </q-banner>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface BackgroundOperation {
  id: string;
  title: string;
  icon: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  cancellable: boolean;
  cancel?: () => void;
}

const backgroundOperations = ref<BackgroundOperation[]>([]);

function addBackgroundOperation(operation: Omit<BackgroundOperation, 'id'>) {
  const id = Date.now().toString();
  backgroundOperations.value.push({ ...operation, id });
  return id;
}

function updateBackgroundOperation(id: string, updates: Partial<BackgroundOperation>) {
  const index = backgroundOperations.value.findIndex(op => op.id === id);
  if (index !== -1) {
    backgroundOperations.value[index] = { 
      ...backgroundOperations.value[index], 
      ...updates 
    };
  }
}

function cancelBackgroundOperation(id: string) {
  const op = backgroundOperations.value.find(op => op.id === id);
  if (op && op.cancel) {
    op.cancel();
    updateBackgroundOperation(id, {
      status: 'cancelled',
      cancellable: false
    });
  }
}

function dismissOperation(id: string) {
  backgroundOperations.value = backgroundOperations.value.filter(op => op.id !== id);
}

// Auto-remove completed operations after delay
watch(backgroundOperations, (ops) => {
  ops.forEach(op => {
    if (['completed', 'failed', 'cancelled'].includes(op.status)) {
      setTimeout(() => {
        dismissOperation(op.id);
      }, 5000); // Auto-dismiss after 5 seconds
    }
  });
}, { deep: true });

defineExpose({
  addBackgroundOperation,
  updateBackgroundOperation,
  cancelBackgroundOperation
});
</script>

<style scoped>
.background-operations {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
  max-width: 300px;
}
</style>
```

## 🚀 Recommended Implementation Strategy

### 1. Immediate Actions
- ✅ Convert all existing operations to async/await pattern
- ✅ Add progress callbacks to all long-running operations
- ✅ Implement operation queue with priority system
- ✅ Create Web Worker for compression/CPU tasks

### 2. Short-term Enhancements
- ✅ Add Service Worker for background sync
- ✅ Implement cancellable operations
- ✅ Create UI progress components
- ✅ Add background operation notifications

### 3. Long-term Optimization
- ✅ Implement batch API requests
- ✅ Add intelligent retry logic
- ✅ Implement operation caching
- ✅ Add offline operation queuing

## 📋 Implementation Checklist

```markdown
- [ ] Convert all Google Drive operations to async/await
- [ ] Implement operation queue with priority system
- [ ] Create Web Worker for CPU-intensive tasks:
  - [ ] File compression/decompression
  - [ ] JSON parsing/validation
  - [ ] Batch operation preparation
- [ ] Implement Service Worker for background operations:
  - [ ] Periodic vault sync
  - [ ] Background indexing
  - [ ] Offline operation queuing
- [ ] Add progress tracking to all operations:
  - [ ] File copy/move operations
  - [ ] Folder recursive operations
  - [ ] Vault creation/deletion
- [ ] Implement cancellation support:
  - [ ] User-initiated cancellation
  - [ ] Error-based cancellation
  - [ ] Timeout-based cancellation
- [ ] Create UI components:
  - [ ] Operation progress dialog
  - [ ] Background operations panel
  - [ ] Operation history/log
- [ ] Add performance optimizations:
  - [ ] Batch API requests
  - [ ] Parallel processing with limits
  - [ ] Intelligent retry logic
```

## 🎯 Benefits of This Approach

1. **Responsive UI:** Never blocks main thread
2. **Better UX:** Real-time progress feedback
3. **User Control:** Cancel long operations
4. **Performance:** Optimal resource usage
5. **Reliability:** Robust error handling
6. **Scalability:** Handles large vaults efficiently

This async/worker strategy ensures that MindPad remains responsive even during complex file operations, providing a professional user experience while maintaining all the benefits of Google Drive integration.