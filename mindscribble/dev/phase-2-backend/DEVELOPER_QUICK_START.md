# Developer Quick Start Guide

## 🚀 Getting Started with Phase 2 Implementation

This guide helps you start implementing Phase 2 features immediately.

## 📁 Project Structure

```
mindpad/
├── src/
│   ├── services/
│   │   ├── storage/
│   │   │   ├── providers/          # Storage providers
│   │   │   │   ├── IndexedDBProvider.ts
│   │   │   │   ├── GoogleDriveProvider.ts
│   │   │   │   └── ProviderInterface.ts
│   │   │   ├── ProviderManager.ts  # Provider orchestration
│   │   │   └── SyncManager.ts      # Synchronization logic
│   │   ├── security/
│   │   │   ├── Encryption.ts       # Token encryption
│   │   │   └── Validation.ts       # Input validation
│   │   ├── errors/
│   │   │   ├── ErrorClasses.ts     # Custom error types
│   │   │   ├── ErrorHandler.ts     # Global error handler
│   │   │   └── ErrorLogger.ts      # Error logging
│   │   └── migration/
│   │       ├── MigrationDetector.ts
│   │       ├── MigrationExecutor.ts
│   │       └── MigrationRollback.ts
│   ├── stores/
│   │   ├── providerStore.ts        # Provider state
│   │   └── syncStore.ts            # Sync state
│   └── components/
│       ├── migration/
│       │   └── MigrationDialog.vue
│       └── sync/
│           └── SyncStatus.vue
└── dev/
    └── phase-2/                    # All planning docs
        ├── IMPLEMENTATION_ROADMAP.md
        ├── backend_architecture.md
        ├── security_architecture.md
        └── ...
```

## 🎯 Step 1: Set Up Error Handling (Day 1)

### Create Error Classes:

```typescript
// src/services/errors/ErrorClasses.ts
export class MindPadError extends Error {
  constructor(
    message: string,
    public code: string,
    public severity: 'info' | 'warning' | 'error' | 'critical',
    public recoverable: boolean = true,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'MindPadError';
  }
}

export class StorageError extends MindPadError {
  constructor(message: string, code: string, context?: Record<string, any>) {
    super(message, code, 'error', true, context);
    this.name = 'StorageError';
  }
}

// Add more error classes as needed
```

### Set Up Global Error Handler:

```typescript
// src/services/errors/ErrorHandler.ts
import { Notify } from 'quasar';

class GlobalErrorHandler {
  initialize() {
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason);
      event.preventDefault();
    });

    window.addEventListener('error', (event) => {
      this.handleError(event.error);
      event.preventDefault();
    });
  }

  handleError(error: any) {
    console.error('[GlobalErrorHandler]', error);
    
    Notify.create({
      type: 'negative',
      message: error.message || 'An error occurred',
      timeout: 5000
    });
  }
}

export const errorHandler = new GlobalErrorHandler();
```

### Initialize in main.ts:

```typescript
// src/main.ts
import { errorHandler } from './services/errors/ErrorHandler';

errorHandler.initialize();
```

## 🎯 Step 2: Create Provider Interface (Day 2-3)

### Define Provider Interface:

```typescript
// src/services/storage/providers/ProviderInterface.ts
export interface StorageProvider {
  readonly name: string;
  readonly capabilities: ProviderCapabilities;
  
  initialize(): Promise<void>;
  authenticate(): Promise<void>;
  isAuthenticated(): Promise<boolean>;
  
  // Repository operations
  listRepositories(): Promise<RepositoryMetadata[]>;
  getRepository(repositoryId: string): Promise<Repository>;
  saveRepository(repository: Repository): Promise<void>;
  deleteRepository(repositoryId: string): Promise<void>;
  
  // File operations
  getFile(repositoryId: string, fileId: string): Promise<MindpadDocument>;
  saveFile(repositoryId: string, file: MindpadDocument): Promise<void>;
  deleteFile(repositoryId: string, fileId: string): Promise<void>;
}

export interface ProviderCapabilities {
  maxFileSize: number;
  maxStorageSize: number;
  supportsVersioning: boolean;
  supportsSharing: boolean;
  requiresAuth: boolean;
}
```

### Create Provider Manager:

```typescript
// src/services/storage/ProviderManager.ts
export class ProviderManager {
  private providers = new Map<string, StorageProvider>();
  private activeProvider: string | null = null;

  registerProvider(provider: StorageProvider) {
    this.providers.set(provider.name, provider);
  }

  getProvider(name: string): StorageProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider ${name} not found`);
    }
    return provider;
  }

  setActiveProvider(name: string) {
    if (!this.providers.has(name)) {
      throw new Error(`Provider ${name} not registered`);
    }
    this.activeProvider = name;
  }

  getActiveProvider(): StorageProvider {
    if (!this.activeProvider) {
      throw new Error('No active provider set');
    }
    return this.getProvider(this.activeProvider);
  }
}

export const providerManager = new ProviderManager();
```

## 🎯 Step 3: Implement IndexedDB Provider (Day 4-5)

```typescript
// src/services/storage/providers/IndexedDBProvider.ts
export class IndexedDBProvider implements StorageProvider {
  readonly name = 'IndexedDB';
  readonly capabilities: ProviderCapabilities = {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxStorageSize: 1024 * 1024 * 1024, // 1GB
    supportsVersioning: false,
    supportsSharing: false,
    requiresAuth: false
  };

  async initialize(): Promise<void> {
    // Already initialized via Dexie
  }

  async authenticate(): Promise<void> {
    // No auth needed for IndexedDB
  }

  async isAuthenticated(): Promise<boolean> {
    return true;
  }

  async listRepositories(): Promise<RepositoryMetadata[]> {
    const repos = await db.repositories.toArray();
    return repos.map(repo => ({
      repositoryId: repo.repositoryId,
      name: repo.name,
      lastUpdated: repo.lastUpdated,
      version: repo.version
    }));
  }

  async getRepository(repositoryId: string): Promise<Repository> {
    const repo = await db.repositories.get(repositoryId);
    if (!repo) {
      throw new StorageError(
        `Repository not found: ${repositoryId}`,
        'REPOSITORY_NOT_FOUND',
        { repositoryId }
      );
    }
    return repo;
  }

  async saveRepository(repository: Repository): Promise<void> {
    await db.repositories.put(repository);
  }

  // Implement other methods...
}
```

## 🎯 Step 4: Register Providers (Day 6)

```typescript
// src/boot/providers.ts
import { boot } from 'quasar/wrappers';
import { providerManager } from 'src/services/storage/ProviderManager';
import { IndexedDBProvider } from 'src/services/storage/providers/IndexedDBProvider';
import { GoogleDriveProvider } from 'src/services/storage/providers/GoogleDriveProvider';

export default boot(async () => {
  // Register providers
  providerManager.registerProvider(new IndexedDBProvider());
  providerManager.registerProvider(new GoogleDriveProvider());

  // Set default provider
  providerManager.setActiveProvider('IndexedDB');
});
```

## 🎯 Step 5: Update Existing Code (Day 7-10)

### Before (Current Code):

```typescript
// Old way - direct IndexedDB access
async function loadDocument(id: string) {
  return await db.documents.get(id);
}
```

### After (New Provider System):

```typescript
// New way - through provider
async function loadDocument(id: string) {
  const provider = providerManager.getActiveProvider();
  const repos = await provider.listRepositories();
  
  // Find repository containing this document
  for (const repo of repos) {
    const repository = await provider.getRepository(repo.repositoryId);
    if (repository.files[id]) {
      return await provider.getFile(repo.repositoryId, id);
    }
  }
  
  throw new StorageError('Document not found', 'NOT_FOUND', { id });
}
```

## 📝 Daily Checklist

### Day 1: Error Handling
- [ ] Create error classes
- [ ] Set up global error handler
- [ ] Add error logging
- [ ] Test error notifications

### Day 2-3: Provider Interface
- [ ] Define StorageProvider interface
- [ ] Create ProviderManager
- [ ] Add provider registration
- [ ] Write unit tests

### Day 4-5: IndexedDB Provider
- [ ] Implement IndexedDBProvider
- [ ] Test all methods
- [ ] Handle errors properly
- [ ] Add logging

### Day 6: Provider Registration
- [ ] Create boot file
- [ ] Register providers
- [ ] Set default provider
- [ ] Test provider switching

### Day 7-10: Code Migration
- [ ] Identify all storage calls
- [ ] Update to use providers
- [ ] Test thoroughly
- [ ] Fix any issues

## 🧪 Testing Strategy

### Unit Tests:

```typescript
// tests/unit/providers/IndexedDBProvider.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { IndexedDBProvider } from 'src/services/storage/providers/IndexedDBProvider';

describe('IndexedDBProvider', () => {
  let provider: IndexedDBProvider;

  beforeEach(() => {
    provider = new IndexedDBProvider();
  });

  it('should initialize successfully', async () => {
    await expect(provider.initialize()).resolves.not.toThrow();
  });

  it('should list repositories', async () => {
    const repos = await provider.listRepositories();
    expect(Array.isArray(repos)).toBe(true);
  });

  // Add more tests...
});
```

## 🐛 Common Issues & Solutions

### Issue 1: "Provider not found"
**Solution**: Make sure provider is registered in boot file

### Issue 2: "No active provider set"
**Solution**: Call `providerManager.setActiveProvider('IndexedDB')`

### Issue 3: Storage quota exceeded
**Solution**: Implement quota checking and cleanup

### Issue 4: Sync conflicts
**Solution**: Implement conflict resolution dialog

## 📚 Next Steps

After completing the foundation:

1. **Week 2**: Implement Google Drive provider
2. **Week 3**: Add synchronization logic
3. **Week 4**: Build conflict resolution
4. **Week 5**: Create migration system
5. **Week 6**: Add mobile optimizations

## 🔗 Useful Links

- [Full Implementation Roadmap](./IMPLEMENTATION_ROADMAP.md)
- [Backend Architecture](./backend_architecture.md)
- [Security Architecture](../phase-3-security/security_architecture.md)
- [Error Handling Strategy](./error_handling_strategy.md)
- [Mobile Considerations](./mobile_considerations.md)

## 💡 Pro Tips

1. **Start small**: Get one provider working perfectly before adding more
2. **Test early**: Write tests as you go, not after
3. **Log everything**: You'll thank yourself when debugging
4. **Handle errors**: Every async operation should have error handling
5. **Ask for help**: Review the detailed docs when stuck

## 🎉 You're Ready!

Start with Day 1 and work through systematically. Don't rush - a solid foundation is critical for Phase 2 success!

**Questions?** Check the detailed planning documents in `mindpad/dev/phase-2/`

