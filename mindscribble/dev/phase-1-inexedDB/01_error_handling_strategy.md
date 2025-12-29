# Error Handling Strategy

## 🎯 Overview

Robust error handling is critical for a reliable application. This document outlines comprehensive error handling strategies for MindScribble across all layers.

## 🏗️ Error Handling Architecture

### Error Hierarchy:

```typescript
// Base error class
class MindScribbleError extends Error {
  constructor(
    message: string,
    public code: string,
    public severity: 'info' | 'warning' | 'error' | 'critical',
    public recoverable: boolean = true,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'MindScribbleError';
  }
}

// Storage errors
class StorageError extends MindScribbleError {
  constructor(message: string, code: string, context?: Record<string, any>) {
    super(message, code, 'error', true, context);
    this.name = 'StorageError';
  }
}

class QuotaExceededError extends StorageError {
  constructor(quota: number, usage: number) {
    super(
      `Storage quota exceeded: ${usage}/${quota} bytes`,
      'QUOTA_EXCEEDED',
      { quota, usage }
    );
    this.name = 'QuotaExceededError';
  }
}

// Network errors
class NetworkError extends MindScribbleError {
  constructor(message: string, code: string, context?: Record<string, any>) {
    super(message, code, 'warning', true, context);
    this.name = 'NetworkError';
  }
}

class SyncError extends NetworkError {
  constructor(message: string, provider: string, context?: Record<string, any>) {
    super(message, 'SYNC_FAILED', { ...context, provider });
    this.name = 'SyncError';
  }
}

// Authentication errors
class AuthError extends MindScribbleError {
  constructor(message: string, code: string, provider: string) {
    super(message, code, 'error', true, { provider });
    this.name = 'AuthError';
  }
}

// Validation errors
class ValidationError extends MindScribbleError {
  constructor(message: string, field: string, value: any) {
    super(message, 'VALIDATION_FAILED', 'warning', true, { field, value });
    this.name = 'ValidationError';
  }
}

// Data corruption errors
class CorruptionError extends MindScribbleError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'DATA_CORRUPTED', 'critical', false, context);
    this.name = 'CorruptionError';
  }
}
```

## 🛡️ Error Handling Layers

### Layer 1: Try-Catch Blocks

```typescript
class DocumentService {
  async loadDocument(documentId: string): Promise<MindscribbleDocument> {
    try {
      // Attempt to load from IndexedDB
      const doc = await db.documents.get(documentId);
      
      if (!doc) {
        throw new StorageError(
          `Document not found: ${documentId}`,
          'DOCUMENT_NOT_FOUND',
          { documentId }
        );
      }

      // Validate document structure
      if (!this.validateDocument(doc)) {
        throw new ValidationError(
          'Invalid document structure',
          'document',
          doc
        );
      }

      return doc;
    } catch (error) {
      // Re-throw MindScribble errors
      if (error instanceof MindScribbleError) {
        throw error;
      }

      // Wrap unknown errors
      throw new StorageError(
        `Failed to load document: ${error.message}`,
        'LOAD_FAILED',
        { documentId, originalError: error }
      );
    }
  }
}
```

### Layer 2: Error Boundaries (Vue)

```vue
<!-- ErrorBoundary.vue -->
<template>
  <div v-if="error" class="error-boundary">
    <q-banner class="bg-negative text-white">
      <template v-slot:avatar>
        <q-icon name="error" color="white" />
      </template>
      <div class="text-h6">Something went wrong</div>
      <div class="text-body2">{{ error.message }}</div>
      <template v-slot:action>
        <q-btn flat label="Retry" @click="retry" />
        <q-btn flat label="Report" @click="report" />
      </template>
    </q-banner>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue';

const error = ref<Error | null>(null);

onErrorCaptured((err, instance, info) => {
  error.value = err;
  
  // Log error
  errorLogger.log(err, { component: instance?.$options.name, info });
  
  // Prevent error from propagating
  return false;
});

function retry() {
  error.value = null;
  // Trigger re-render
}

function report() {
  errorReporter.report(error.value!);
}
</script>
```

### Layer 3: Global Error Handler

```typescript
class GlobalErrorHandler {
  initialize(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, 'unhandledRejection');
      event.preventDefault();
    });

    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error, 'uncaughtError');
      event.preventDefault();
    });

    // Vue error handler
    app.config.errorHandler = (err, instance, info) => {
      this.handleError(err, 'vueError', { component: instance?.$options.name, info });
    };
  }

  private handleError(error: any, source: string, context?: Record<string, any>): void {
    // Convert to MindScribbleError if needed
    const mindscribbleError = this.normalizeError(error);

    // Log error
    errorLogger.log(mindscribbleError, { source, ...context });

    // Show user notification based on severity
    this.notifyUser(mindscribbleError);

    // Report to analytics (if critical)
    if (mindscribbleError.severity === 'critical') {
      errorReporter.report(mindscribbleError);
    }
  }

  private normalizeError(error: any): MindScribbleError {
    if (error instanceof MindScribbleError) {
      return error;
    }

    return new MindScribbleError(
      error.message || 'Unknown error',
      'UNKNOWN_ERROR',
      'error',
      true,
      { originalError: error }
    );
  }

  private notifyUser(error: MindScribbleError): void {
    const notifyConfig = {
      message: error.message,
      type: this.getSeverityType(error.severity),
      timeout: error.severity === 'critical' ? 0 : 5000,
      actions: error.recoverable ? [
        { label: 'Retry', handler: () => this.retry(error) }
      ] : []
    };

    Notify.create(notifyConfig);
  }

  private getSeverityType(severity: string): string {
    switch (severity) {
      case 'info': return 'info';
      case 'warning': return 'warning';
      case 'error': return 'negative';
      case 'critical': return 'negative';
      default: return 'warning';
    }
  }
}
```

## 🔄 Retry Strategies

### Exponential Backoff:

```typescript
class RetryStrategy {
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 10000,
      backoffMultiplier = 2,
      retryableErrors = [NetworkError, SyncError]
    } = options;

    let lastError: Error;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Check if error is retryable
        const isRetryable = retryableErrors.some(
          ErrorClass => error instanceof ErrorClass
        );

        if (!isRetryable || attempt === maxRetries) {
          throw error;
        }

        // Wait before retry
        await this.sleep(delay);

        // Increase delay for next attempt
        delay = Math.min(delay * backoffMultiplier, maxDelay);

        // Log retry attempt
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      }
    }

    throw lastError!;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: any[];
}
```

### Circuit Breaker:

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000, // 1 minute
    private resetTimeout: number = 30000 // 30 seconds
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      // Check if we should try again
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new NetworkError(
          'Circuit breaker is open',
          'CIRCUIT_OPEN',
          { failures: this.failures }
        );
      }
    }

    try {
      const result = await operation();

      // Success - reset circuit breaker
      if (this.state === 'half-open') {
        this.reset();
      }

      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'open';
      console.warn(`Circuit breaker opened after ${this.failures} failures`);
    }
  }

  private reset(): void {
    this.failures = 0;
    this.state = 'closed';
    console.log('Circuit breaker reset');
  }
}
```

## 📊 Error Logging

### Structured Logging:

```typescript
interface ErrorLog {
  id: string;
  timestamp: number;
  error: {
    name: string;
    message: string;
    code: string;
    severity: string;
    stack?: string;
  };
  context: {
    userId?: string;
    documentId?: string;
    provider?: string;
    source: string;
    userAgent: string;
    url: string;
  };
  metadata: Record<string, any>;
}

class ErrorLogger {
  async log(error: MindScribbleError, context: Record<string, any> = {}): Promise<void> {
    const log: ErrorLog = {
      id: generateId(),
      timestamp: Date.now(),
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        severity: error.severity,
        stack: error.stack
      },
      context: {
        ...context,
        userAgent: navigator.userAgent,
        url: window.location.href,
        source: context.source || 'unknown'
      },
      metadata: error.context || {}
    };

    // Store in IndexedDB
    await db.errorLogs.add(log);

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorLogger]', log);
    }

    // Prune old logs (keep last 100)
    await this.pruneOldLogs();
  }

  async getLogs(limit: number = 50): Promise<ErrorLog[]> {
    return await db.errorLogs
      .orderBy('timestamp')
      .reverse()
      .limit(limit)
      .toArray();
  }

  private async pruneOldLogs(): Promise<void> {
    const count = await db.errorLogs.count();

    if (count > 100) {
      const oldLogs = await db.errorLogs
        .orderBy('timestamp')
        .limit(count - 100)
        .toArray();

      const idsToDelete = oldLogs.map(log => log.id);
      await db.errorLogs.bulkDelete(idsToDelete);
    }
  }
}
```

## 📤 Error Reporting

### Anonymous Error Reporting:

```typescript
class ErrorReporter {
  private endpoint = 'https://api.mindscribble.app/errors';
  private enabled = true;

  async report(error: MindScribbleError): Promise<void> {
    if (!this.enabled) return;

    // Anonymize error data
    const report = this.anonymize(error);

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      });
    } catch (reportError) {
      // Failed to report error - log locally only
      console.error('Failed to report error:', reportError);
    }
  }

  private anonymize(error: MindScribbleError): any {
    return {
      name: error.name,
      message: error.message,
      code: error.code,
      severity: error.severity,
      stack: this.sanitizeStack(error.stack),
      context: {
        // Remove sensitive data
        browser: this.getBrowserInfo(),
        os: this.getOSInfo(),
        timestamp: Date.now()
      }
    };
  }

  private sanitizeStack(stack?: string): string | undefined {
    if (!stack) return undefined;

    // Remove file paths and line numbers
    return stack
      .split('\n')
      .map(line => line.replace(/\(.*?\)/g, '(...)'))
      .join('\n');
  }

  private getBrowserInfo(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    return 'Unknown';
  }

  private getOSInfo(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}
```

## 🚨 Specific Error Scenarios

### 1. Storage Quota Exceeded

```typescript
class QuotaHandler {
  async handleQuotaExceeded(): Promise<void> {
    // Show dialog to user
    const action = await this.showQuotaDialog();

    switch (action) {
      case 'sync':
        // Sync to cloud and clear local storage
        await this.syncAndClear();
        break;
      case 'delete':
        // Let user choose what to delete
        await this.showDeleteDialog();
        break;
      case 'upgrade':
        // Show upgrade options (future)
        await this.showUpgradeDialog();
        break;
    }
  }

  private async showQuotaDialog(): Promise<string> {
    return new Promise((resolve) => {
      Dialog.create({
        title: 'Storage Full',
        message: 'Your local storage is full. What would you like to do?',
        options: {
          type: 'radio',
          model: 'sync',
          items: [
            { label: 'Sync to cloud and clear local storage', value: 'sync' },
            { label: 'Delete old documents', value: 'delete' },
            { label: 'Learn about storage options', value: 'upgrade' }
          ]
        },
        cancel: false,
        persistent: true
      }).onOk((action) => resolve(action));
    });
  }

  private async syncAndClear(): Promise<void> {
    // Sync all documents to cloud
    await syncManager.syncAll();

    // Keep only recent documents locally
    const docs = await db.documents.toArray();
    const recentDocs = docs
      .sort((a, b) => b.metadata.modified - a.metadata.modified)
      .slice(0, 5);

    await db.documents.clear();
    await db.documents.bulkPut(recentDocs);

    Notify.create({
      type: 'positive',
      message: 'Storage cleared. Recent documents kept locally.'
    });
  }
}
```

### 2. Network Failures

```typescript
class NetworkErrorHandler {
  async handleNetworkError(error: NetworkError): Promise<void> {
    // Check if offline
    if (!navigator.onLine) {
      this.showOfflineNotification();
      return;
    }

    // Check if provider-specific issue
    if (error.context?.provider) {
      await this.handleProviderError(error);
      return;
    }

    // Generic network error
    this.showRetryNotification(error);
  }

  private showOfflineNotification(): void {
    Notify.create({
      type: 'warning',
      message: 'You are offline. Changes will sync when connection is restored.',
      timeout: 0,
      actions: [
        { label: 'Dismiss', color: 'white' }
      ]
    });
  }

  private async handleProviderError(error: NetworkError): Promise<void> {
    const provider = error.context?.provider;

    Dialog.create({
      title: `${provider} Connection Error`,
      message: `Failed to connect to ${provider}. Would you like to try a different provider?`,
      cancel: true,
      ok: { label: 'Switch Provider' }
    }).onOk(async () => {
      // Show provider selection dialog
      await this.showProviderSelection();
    });
  }

  private showRetryNotification(error: NetworkError): void {
    Notify.create({
      type: 'negative',
      message: error.message,
      timeout: 5000,
      actions: [
        { label: 'Retry', handler: () => this.retry(error) }
      ]
    });
  }
}
```

### 3. Authentication Failures

```typescript
class AuthErrorHandler {
  async handleAuthError(error: AuthError): Promise<void> {
    const provider = error.context?.provider;

    switch (error.code) {
      case 'TOKEN_EXPIRED':
        await this.refreshToken(provider);
        break;
      case 'INVALID_TOKEN':
        await this.reAuthenticate(provider);
        break;
      case 'PERMISSION_DENIED':
        await this.requestPermissions(provider);
        break;
      default:
        this.showAuthErrorDialog(error);
    }
  }

  private async refreshToken(provider: string): Promise<void> {
    try {
      await providerManager.getProvider(provider).refreshAccessToken();

      Notify.create({
        type: 'positive',
        message: 'Authentication refreshed'
      });
    } catch (error) {
      // Refresh failed - need to re-authenticate
      await this.reAuthenticate(provider);
    }
  }

  private async reAuthenticate(provider: string): Promise<void> {
    Dialog.create({
      title: 'Authentication Required',
      message: `Please sign in to ${provider} again`,
      cancel: false,
      persistent: true,
      ok: { label: 'Sign In' }
    }).onOk(async () => {
      await providerManager.getProvider(provider).authenticate();
    });
  }

  private async requestPermissions(provider: string): Promise<void> {
    Dialog.create({
      title: 'Additional Permissions Required',
      message: `${provider} needs additional permissions to sync your data`,
      cancel: true,
      ok: { label: 'Grant Permissions' }
    }).onOk(async () => {
      await providerManager.getProvider(provider).requestPermissions();
    });
  }
}
```

### 4. Data Corruption

```typescript
class CorruptionHandler {
  async handleCorruption(error: CorruptionError): Promise<void> {
    // This is critical - show detailed dialog
    const action = await this.showCorruptionDialog(error);

    switch (action) {
      case 'restore':
        await this.restoreFromBackup();
        break;
      case 'sync':
        await this.syncFromCloud();
        break;
      case 'export':
        await this.exportData();
        break;
      case 'reset':
        await this.resetApp();
        break;
    }
  }

  private async showCorruptionDialog(error: CorruptionError): Promise<string> {
    return new Promise((resolve) => {
      Dialog.create({
        title: 'Data Corruption Detected',
        message: `Some of your data appears to be corrupted: ${error.message}`,
        html: true,
        options: {
          type: 'radio',
          model: 'restore',
          items: [
            { label: 'Restore from backup', value: 'restore' },
            { label: 'Sync from cloud', value: 'sync' },
            { label: 'Export what we can recover', value: 'export' },
            { label: 'Reset app (last resort)', value: 'reset' }
          ]
        },
        cancel: false,
        persistent: true
      }).onOk((action) => resolve(action));
    });
  }

  private async restoreFromBackup(): Promise<void> {
    const backups = await db.backups.toArray();

    if (backups.length === 0) {
      Notify.create({
        type: 'negative',
        message: 'No backups available'
      });
      return;
    }

    // Show backup selection dialog
    // ... restore logic
  }

  private async syncFromCloud(): Promise<void> {
    // Clear local data and re-sync from cloud
    await db.documents.clear();
    await syncManager.syncAll();
  }

  private async exportData(): Promise<void> {
    // Export whatever data we can recover
    const docs = await db.documents.toArray();
    const validDocs = docs.filter(doc => this.validateDocument(doc));

    // Export to file
    const blob = new Blob([JSON.stringify(validDocs, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mindscribble-recovery-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private async resetApp(): Promise<void> {
    // Last resort - clear everything
    await db.delete();
    window.location.reload();
  }
}
```

## 🎯 Error Handling Best Practices

### 1. **Always Provide Context**
```typescript
// Bad
throw new Error('Failed to save');

// Good
throw new StorageError(
  'Failed to save document',
  'SAVE_FAILED',
  { documentId, reason: 'quota exceeded' }
);
```

### 2. **Make Errors Actionable**
```typescript
// Bad
Notify.create({ message: 'Error occurred' });

// Good
Notify.create({
  message: 'Failed to sync. Check your internet connection.',
  actions: [
    { label: 'Retry', handler: () => retry() },
    { label: 'Work Offline', handler: () => enableOfflineMode() }
  ]
});
```

### 3. **Log Everything**
```typescript
try {
  await operation();
} catch (error) {
  // Always log before handling
  errorLogger.log(error, { operation: 'save', documentId });

  // Then handle
  await errorHandler.handle(error);
}
```

### 4. **Fail Gracefully**
```typescript
// Bad - app crashes
const doc = await loadDocument(id);

// Good - fallback to empty document
const doc = await loadDocument(id).catch(() => createEmptyDocument());
```

### 5. **Test Error Scenarios**
```typescript
describe('Error Handling', () => {
  it('should handle quota exceeded', async () => {
    // Mock quota exceeded
    jest.spyOn(db.documents, 'put').mockRejectedValue(
      new QuotaExceededError(1000000, 1000001)
    );

    await expect(saveDocument(doc)).rejects.toThrow(QuotaExceededError);
  });
});
```

## 📚 Error Handling Checklist

- [ ] All async operations wrapped in try-catch
- [ ] Custom error classes for different error types
- [ ] Error boundaries in Vue components
- [ ] Global error handler configured
- [ ] Retry logic for transient failures
- [ ] Circuit breaker for repeated failures
- [ ] Structured error logging
- [ ] Anonymous error reporting
- [ ] User-friendly error messages
- [ ] Actionable error notifications
- [ ] Graceful degradation
- [ ] Error recovery strategies
- [ ] Error scenario testing

## 🚀 Implementation Priority

### Phase 1: Essential Error Handling
1. Custom error classes
2. Try-catch blocks
3. Global error handler
4. Basic error logging

### Phase 2: Advanced Error Handling
1. Retry strategies
2. Circuit breaker
3. Error boundaries
4. User notifications

### Phase 3: Error Monitoring
1. Structured logging
2. Error reporting
3. Analytics integration
4. Error dashboards

