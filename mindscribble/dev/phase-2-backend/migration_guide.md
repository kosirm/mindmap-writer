# Data Migration Guide

## 🎯 Overview

This guide covers migrating from the current MindScribble architecture to the new provider-based system with repository files and optional binary format.

## 📊 Current State Analysis

### Current Architecture:
```
IndexedDB (Primary Storage)
├─ documents: Map<documentId, MindscribbleDocument>
├─ metadata: Document metadata
└─ syncState: Last sync timestamps

Google Drive (Cloud Sync)
├─ Individual .json files per document
├─ No central repository file
└─ Full file sync on every change
```

### Target Architecture:
```
IndexedDB (Primary Storage)
├─ documents: Map<documentId, MindscribbleDocument>
├─ repositories: Map<repositoryId, Repository>
└─ syncState: Enhanced sync tracking

Provider System (Multi-Backend)
├─ Repository file (.space or .repository.json)
├─ Individual document files (.ms or .json)
└─ Efficient partial sync
```

## 🔄 Migration Strategy

### Three-Phase Approach:

```
Phase 1: Backward Compatible
├─ New code works with old data
├─ No user action required
└─ Gradual migration in background

Phase 2: Dual Format Support
├─ Support both old and new formats
├─ Automatic conversion on save
└─ User can opt-in to new format

Phase 3: Full Migration
├─ All data in new format
├─ Old format deprecated
└─ Migration complete notification
```

## 📋 Migration Checklist

### Pre-Migration:
- [ ] Backup all user data
- [ ] Test migration on sample data
- [ ] Prepare rollback strategy
- [ ] Create migration progress UI
- [ ] Write migration logs

### During Migration:
- [ ] Show progress indicator
- [ ] Allow cancellation
- [ ] Handle errors gracefully
- [ ] Preserve all user data
- [ ] Validate migrated data

### Post-Migration:
- [ ] Verify data integrity
- [ ] Clean up old data (optional)
- [ ] Update user preferences
- [ ] Show success notification
- [ ] Collect feedback

## 🔧 Implementation

### Step 1: Detect Current Version

```typescript
interface MigrationStatus {
  currentVersion: string;
  targetVersion: string;
  needsMigration: boolean;
  migrationSteps: MigrationStep[];
  estimatedTime: number; // seconds
  dataSize: number; // bytes
}

class MigrationDetector {
  async detectMigrationNeeds(): Promise<MigrationStatus> {
    const currentVersion = await this.getCurrentVersion();
    const targetVersion = '2.0.0'; // New architecture version

    const steps: MigrationStep[] = [];

    // Check if repository structure exists
    const hasRepositories = await this.hasRepositoryStructure();
    if (!hasRepositories) {
      steps.push({
        id: 'create-repositories',
        name: 'Create repository structure',
        description: 'Convert documents to repository-based structure',
        estimatedTime: 30
      });
    }

    // Check if using old Google Drive format
    const hasOldGoogleDrive = await this.hasOldGoogleDriveFormat();
    if (hasOldGoogleDrive) {
      steps.push({
        id: 'migrate-google-drive',
        name: 'Migrate Google Drive files',
        description: 'Create repository file and reorganize Drive files',
        estimatedTime: 60
      });
    }

    // Check if using old ID format
    const hasOldIds = await this.hasOldIdFormat();
    if (hasOldIds) {
      steps.push({
        id: 'update-ids',
        name: 'Update ID format',
        description: 'Convert Date.now() IDs to nanoid format',
        estimatedTime: 20
      });
    }

    return {
      currentVersion,
      targetVersion,
      needsMigration: steps.length > 0,
      migrationSteps: steps,
      estimatedTime: steps.reduce((sum, s) => sum + s.estimatedTime, 0),
      dataSize: await this.calculateDataSize()
    };
  }

  private async getCurrentVersion(): Promise<string> {
    const version = await db.metadata.get('version');
    return version?.value || '1.0.0';
  }

  private async hasRepositoryStructure(): Promise<boolean> {
    const count = await db.repositories.count();
    return count > 0;
  }

  private async hasOldGoogleDriveFormat(): Promise<boolean> {
    // Check if Google Drive files exist without repository file
    const driveStore = useGoogleDriveStore();
    if (!driveStore.isAuthenticated) return false;

    const files = await driveStore.listFiles();
    const hasRepositoryFile = files.some(f => 
      f.name === '.space' || f.name === '.repository.json'
    );

    return files.length > 0 && !hasRepositoryFile;
  }

  private async hasOldIdFormat(): Promise<boolean> {
    const docs = await db.documents.toArray();
    
    // Check if any document has old ID format (doc-timestamp-number)
    return docs.some(doc => 
      /^doc-\d+-\d+$/.test(doc.metadata.id)
    );
  }
}
```

### Step 2: Create Migration Plan

```typescript
interface MigrationPlan {
  steps: MigrationStep[];
  totalSteps: number;
  currentStep: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  errors: MigrationError[];
  startTime?: number;
  endTime?: number;
}

interface MigrationStep {
  id: string;
  name: string;
  description: string;
  estimatedTime: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  progress: number; // 0-100
  error?: string;
}

class MigrationPlanner {
  async createPlan(): Promise<MigrationPlan> {
    const status = await new MigrationDetector().detectMigrationNeeds();

    return {
      steps: status.migrationSteps.map(step => ({
        ...step,
        status: 'pending',
        progress: 0
      })),
      totalSteps: status.migrationSteps.length,
      currentStep: 0,
      status: 'pending',
      errors: []
    };
  }
}
```

### Step 3: Execute Migration

```typescript
class MigrationExecutor {
  private plan: MigrationPlan;
  private onProgress?: (plan: MigrationPlan) => void;

  constructor(plan: MigrationPlan, onProgress?: (plan: MigrationPlan) => void) {
    this.plan = plan;
    this.onProgress = onProgress;
  }

  async execute(): Promise<MigrationResult> {
    this.plan.status = 'running';
    this.plan.startTime = Date.now();

    try {
      for (let i = 0; i < this.plan.steps.length; i++) {
        const step = this.plan.steps[i];
        this.plan.currentStep = i;

        await this.executeStep(step);

        if (step.status === 'failed') {
          this.plan.status = 'failed';
          break;
        }
      }

      if (this.plan.status === 'running') {
        this.plan.status = 'completed';
      }
    } catch (error) {
      this.plan.status = 'failed';
      this.plan.errors.push({
        step: this.plan.currentStep,
        message: error.message,
        timestamp: Date.now()
      });
    } finally {
      this.plan.endTime = Date.now();
    }

    return {
      success: this.plan.status === 'completed',
      plan: this.plan,
      duration: this.plan.endTime - this.plan.startTime
    };
  }

  private async executeStep(step: MigrationStep): Promise<void> {
    step.status = 'running';
    this.notifyProgress();

    try {
      switch (step.id) {
        case 'create-repositories':
          await this.createRepositories(step);
          break;
        case 'migrate-google-drive':
          await this.migrateGoogleDrive(step);
          break;
        case 'update-ids':
          await this.updateIds(step);
          break;
        default:
          throw new Error(`Unknown migration step: ${step.id}`);
      }

      step.status = 'completed';
      step.progress = 100;
    } catch (error) {
      step.status = 'failed';
      step.error = error.message;
      this.plan.errors.push({
        step: step.id,
        message: error.message,
        timestamp: Date.now()
      });
    }

    this.notifyProgress();
  }

  // Migration Step 1: Create Repository Structure
  private async createRepositories(step: MigrationStep): Promise<void> {
    const documents = await db.documents.toArray();

    // Group documents by their intended repository
    // For now, create one repository per document (can be optimized later)
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];

      // Create repository for this document
      const repository: Repository = {
        repositoryId: generateId(),
        name: doc.metadata.name,
        version: '1.0',
        lastUpdated: Date.now(),
        files: {
          [doc.metadata.id]: {
            id: doc.metadata.id,
            path: `${doc.metadata.name}.ms`,
            name: doc.metadata.name,
            type: 'mindmap',
            timestamp: doc.metadata.modified,
            size: this.estimateDocumentSize(doc)
          }
        },
        folders: {},
        deletedFiles: [],
        deletedFolders: []
      };

      // Save repository to IndexedDB
      await db.repositories.put(repository);

      // Update progress
      step.progress = Math.round(((i + 1) / documents.length) * 100);
      this.notifyProgress();
    }
  }

  // Migration Step 2: Migrate Google Drive Files
  private async migrateGoogleDrive(step: MigrationStep): Promise<void> {
    const driveStore = useGoogleDriveStore();

    if (!driveStore.isAuthenticated) {
      step.status = 'skipped';
      return;
    }

    // Get all existing Drive files
    const files = await driveStore.listFiles();

    // Create repository file
    const repositories = await db.repositories.toArray();

    for (let i = 0; i < repositories.length; i++) {
      const repo = repositories[i];

      // Upload repository file to Drive
      await driveStore.uploadRepositoryFile(repo);

      // Update progress
      step.progress = Math.round(((i + 1) / repositories.length) * 100);
      this.notifyProgress();
    }
  }

  // Migration Step 3: Update ID Format
  private async updateIds(step: MigrationStep): Promise<void> {
    const documents = await db.documents.toArray();
    const idMapping = new Map<string, string>();

    // Phase 1: Generate new IDs and create mapping
    for (const doc of documents) {
      if (/^doc-\d+-\d+$/.test(doc.metadata.id)) {
        const newId = generateId();
        idMapping.set(doc.metadata.id, newId);
      }
    }

    // Phase 2: Update documents with new IDs
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const oldId = doc.metadata.id;
      const newId = idMapping.get(oldId);

      if (newId) {
        // Update document ID
        doc.metadata.id = newId;

        // Update node IDs
        for (const node of doc.nodes) {
          if (/^node-\d+-[a-z0-9]+$/.test(node.id)) {
            node.id = generateId();
          }
        }

        // Update edge IDs (based on node IDs)
        for (const edge of doc.edges) {
          edge.id = `edge-${edge.source}-${edge.target}`;
        }

        // Save updated document
        await db.documents.delete(oldId);
        await db.documents.put(doc);
      }

      // Update progress
      step.progress = Math.round(((i + 1) / documents.length) * 100);
      this.notifyProgress();
    }
  }

  private estimateDocumentSize(doc: MindscribbleDocument): number {
    return JSON.stringify(doc).length;
  }

  private notifyProgress(): void {
    if (this.onProgress) {
      this.onProgress(this.plan);
    }
  }
}
```

### Step 4: Rollback Strategy

```typescript
class MigrationRollback {
  private backups: Map<string, any> = new Map();

  // Create backup before migration
  async createBackup(): Promise<string> {
    const backupId = generateId();

    // Backup all documents
    const documents = await db.documents.toArray();

    // Backup all repositories
    const repositories = await db.repositories.toArray();

    // Backup metadata
    const metadata = await db.metadata.toArray();

    const backup = {
      id: backupId,
      timestamp: Date.now(),
      version: await this.getCurrentVersion(),
      data: {
        documents,
        repositories,
        metadata
      }
    };

    // Store backup in IndexedDB
    await db.backups.put(backup);

    // Also export to file for safety
    await this.exportBackupToFile(backup);

    return backupId;
  }

  // Restore from backup
  async restore(backupId: string): Promise<void> {
    const backup = await db.backups.get(backupId);

    if (!backup) {
      throw new Error(`Backup ${backupId} not found`);
    }

    // Clear current data
    await db.documents.clear();
    await db.repositories.clear();
    await db.metadata.clear();

    // Restore from backup
    await db.documents.bulkPut(backup.data.documents);
    await db.repositories.bulkPut(backup.data.repositories);
    await db.metadata.bulkPut(backup.data.metadata);
  }

  // Export backup to downloadable file
  private async exportBackupToFile(backup: any): Promise<void> {
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mindscribble-backup-${backup.timestamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
```

## 🎨 User Interface

### Migration Dialog:

```vue
<template>
  <q-dialog v-model="showMigration" persistent>
    <q-card style="min-width: 500px">
      <q-card-section>
        <div class="text-h6">Data Migration Required</div>
        <div class="text-caption">
          MindScribble needs to update your data to the new format
        </div>
      </q-card-section>

      <q-card-section>
        <q-linear-progress
          :value="progress / 100"
          color="primary"
          class="q-mb-md"
        />

        <div class="text-body2 q-mb-md">
          Step {{ currentStep + 1 }} of {{ totalSteps }}:
          {{ currentStepName }}
        </div>

        <q-list dense>
          <q-item
            v-for="(step, index) in steps"
            :key="step.id"
            :class="getStepClass(step)"
          >
            <q-item-section avatar>
              <q-icon
                :name="getStepIcon(step)"
                :color="getStepColor(step)"
              />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ step.name }}</q-item-label>
              <q-item-label caption>{{ step.description }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-badge :color="getStepColor(step)">
                {{ step.status }}
              </q-badge>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          v-if="status === 'pending'"
          flat
          label="Cancel"
          @click="cancel"
        />
        <q-btn
          v-if="status === 'pending'"
          color="primary"
          label="Start Migration"
          @click="startMigration"
        />
        <q-btn
          v-if="status === 'failed'"
          flat
          label="Rollback"
          @click="rollback"
        />
        <q-btn
          v-if="status === 'completed'"
          color="primary"
          label="Continue"
          @click="complete"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const showMigration = ref(true);
const status = ref<'pending' | 'running' | 'completed' | 'failed'>('pending');
const steps = ref<MigrationStep[]>([]);
const currentStep = ref(0);
const progress = ref(0);

const totalSteps = computed(() => steps.value.length);
const currentStepName = computed(() =>
  steps.value[currentStep.value]?.name || ''
);

async function startMigration() {
  status.value = 'running';

  const planner = new MigrationPlanner();
  const plan = await planner.createPlan();

  const executor = new MigrationExecutor(plan, (updatedPlan) => {
    steps.value = updatedPlan.steps;
    currentStep.value = updatedPlan.currentStep;
    progress.value = calculateOverallProgress(updatedPlan);
  });

  const result = await executor.execute();

  if (result.success) {
    status.value = 'completed';
  } else {
    status.value = 'failed';
  }
}

function calculateOverallProgress(plan: MigrationPlan): number {
  const totalProgress = plan.steps.reduce((sum, step) => sum + step.progress, 0);
  return Math.round(totalProgress / plan.steps.length);
}

function getStepIcon(step: MigrationStep): string {
  switch (step.status) {
    case 'completed': return 'check_circle';
    case 'running': return 'hourglass_empty';
    case 'failed': return 'error';
    default: return 'radio_button_unchecked';
  }
}

function getStepColor(step: MigrationStep): string {
  switch (step.status) {
    case 'completed': return 'positive';
    case 'running': return 'primary';
    case 'failed': return 'negative';
    default: return 'grey';
  }
}

async function rollback() {
  const rollback = new MigrationRollback();
  await rollback.restore(lastBackupId);
  showMigration.value = false;
}

function complete() {
  showMigration.value = false;
}
</script>
```

## 📚 Testing Strategy

### Migration Tests:

```typescript
describe('Migration', () => {
  it('should detect migration needs', async () => {
    const detector = new MigrationDetector();
    const status = await detector.detectMigrationNeeds();

    expect(status.needsMigration).toBe(true);
    expect(status.migrationSteps.length).toBeGreaterThan(0);
  });

  it('should create migration plan', async () => {
    const planner = new MigrationPlanner();
    const plan = await planner.createPlan();

    expect(plan.steps.length).toBeGreaterThan(0);
    expect(plan.status).toBe('pending');
  });

  it('should execute migration successfully', async () => {
    const plan = await new MigrationPlanner().createPlan();
    const executor = new MigrationExecutor(plan);

    const result = await executor.execute();

    expect(result.success).toBe(true);
    expect(plan.status).toBe('completed');
  });

  it('should rollback on failure', async () => {
    const rollback = new MigrationRollback();
    const backupId = await rollback.createBackup();

    // Simulate migration failure
    // ...

    await rollback.restore(backupId);

    // Verify data restored
    const documents = await db.documents.toArray();
    expect(documents.length).toBeGreaterThan(0);
  });
});
```

## 🎯 Best Practices

1. **Always create backup before migration**
2. **Show clear progress to user**
3. **Allow cancellation if possible**
4. **Provide rollback option**
5. **Validate data after migration**
6. **Log all migration steps**
7. **Test on sample data first**
8. **Handle errors gracefully**
9. **Don't delete old data immediately**
10. **Provide export option**

## 📋 Post-Migration Cleanup

```typescript
class MigrationCleanup {
  // Clean up old data after successful migration
  async cleanup(daysToKeep: number = 30): Promise<void> {
    const cutoffDate = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

    // Delete old backups
    await db.backups
      .where('timestamp')
      .below(cutoffDate)
      .delete();

    // Delete old migration logs
    await db.migrationLogs
      .where('timestamp')
      .below(cutoffDate)
      .delete();
  }
}
```

