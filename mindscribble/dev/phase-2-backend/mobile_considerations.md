# Mobile Considerations

## 🎯 Overview

Mobile browsers have unique constraints and capabilities that require special consideration for MindPad. This document covers mobile-specific challenges and solutions.

## 📱 Mobile Browser Landscape

### Platform Differences:

| Feature                | iOS Safari   | Android Chrome | Android Firefox |
| ---------------------- | ------------ | -------------- | --------------- |
| **IndexedDB**          | ✅ Limited   | ✅ Full        | ✅ Full         |
| **Storage Quota**      | ~50MB        | ~1GB           | ~1GB            |
| **Persistent Storage** | ❌ No        | ✅ Yes         | ✅ Yes          |
| **Background Sync**    | ❌ No        | ✅ Yes         | ✅ Yes          |
| **Service Workers**    | ⚠️ Limited | ✅ Full        | ✅ Full         |
| **File System Access** | ❌ No        | ⚠️ Limited   | ⚠️ Limited    |
| **PWA Support**        | ⚠️ Limited | ✅ Full        | ✅ Full         |

## 🚨 Critical iOS Limitations

### 1. **Storage Eviction**
**Problem**: iOS Safari can evict IndexedDB data without warning when storage is low.

**Solution**:
```typescript
class iOSStorageManager {
  async requestPersistentStorage(): Promise<boolean> {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      try {
        const isPersisted = await navigator.storage.persist();
        console.log(`Persistent storage: ${isPersisted}`);
        return isPersisted;
      } catch (error) {
        console.error('Failed to request persistent storage:', error);
        return false;
      }
    }
    return false;
  }

  async checkStorageQuota(): Promise<StorageEstimate> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      return await navigator.storage.estimate();
    }
    return { usage: 0, quota: 0 };
  }

  async warnUserIfLowStorage(): Promise<void> {
    const estimate = await this.checkStorageQuota();
    const usagePercent = (estimate.usage! / estimate.quota!) * 100;

    if (usagePercent > 80) {
      // Show warning to user
      this.showStorageWarning(usagePercent);
    }
  }

  private showStorageWarning(usagePercent: number): void {
    // Show Quasar notification
    Notify.create({
      type: 'warning',
      message: `Storage ${usagePercent.toFixed(0)}% full. Consider syncing to cloud.`,
      actions: [
        { label: 'Sync Now', color: 'white', handler: () => this.syncToCloud() }
      ]
    });
  }
}
```

### 2. **50MB Storage Limit**
**Problem**: iOS Safari has a ~50MB limit for IndexedDB (varies by iOS version).

**Solution**:
```typescript
interface StorageStrategy {
  // Tier 1: Essential data (always in IndexedDB)
  essential: {
    activeDocument: MindpadDocument;
    recentDocuments: MindpadDocument[]; // Last 5
    userPreferences: UserPreferences;
  };

  // Tier 2: Cached data (can be evicted)
  cached: {
    allDocuments: MindpadDocument[];
    thumbnails: Map<string, Blob>;
  };

  // Tier 3: Cloud-only (not stored locally on iOS)
  cloudOnly: {
    archivedDocuments: MindpadDocument[];
    largeAttachments: Blob[];
  };
}

class MobileStorageStrategy {
  private isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  async saveDocument(doc: MindpadDocument): Promise<void> {
    if (this.isIOS) {
      // On iOS, be aggressive about cloud sync
      await this.syncToCloudImmediately(doc);
      
      // Only keep essential documents locally
      await this.pruneLocalStorage();
    } else {
      // On Android, can store more locally
      await db.documents.put(doc);
    }
  }

  private async pruneLocalStorage(): Promise<void> {
    const estimate = await navigator.storage.estimate();
    const usagePercent = (estimate.usage! / estimate.quota!) * 100;

    if (usagePercent > 70) {
      // Keep only recent documents
      const allDocs = await db.documents.toArray();
      const recentDocs = allDocs
        .sort((a, b) => b.metadata.modified - a.metadata.modified)
        .slice(0, 5);

      // Clear all documents
      await db.documents.clear();

      // Re-add only recent ones
      await db.documents.bulkPut(recentDocs);
    }
  }
}
```

### 3. **No Background Sync**
**Problem**: iOS doesn't support Background Sync API.

**Solution**:
```typescript
class MobileSyncManager {
  private isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  async scheduleSync(): Promise<void> {
    if (this.isIOS) {
      // On iOS, sync immediately when app is active
      await this.syncNow();
    } else {
      // On Android, can use Background Sync
      if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-documents');
      } else {
        // Fallback to immediate sync
        await this.syncNow();
      }
    }
  }

  // Sync when app becomes visible (iOS workaround)
  setupVisibilitySync(): void {
    if (this.isIOS) {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.syncNow();
        }
      });
    }
  }
}
```

## 📲 Progressive Web App (PWA) Considerations

### Install Prompt:

```typescript
class PWAManager {
  private deferredPrompt: any = null;

  setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent default install prompt
      e.preventDefault();
      
      // Save for later
      this.deferredPrompt = e;
      
      // Show custom install button
      this.showInstallButton();
    });
  }

  async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) {
      return false;
    }

    // Show install prompt
    this.deferredPrompt.prompt();

    // Wait for user choice
    const { outcome } = await this.deferredPrompt.userChoice;

    // Clear prompt
    this.deferredPrompt = null;

    return outcome === 'accepted';
  }

  private showInstallButton(): void {
    // Show Quasar banner
    Notify.create({
      message: 'Install MindPad for offline access',
      color: 'primary',
      position: 'bottom',
      timeout: 0,
      actions: [
        { label: 'Install', color: 'white', handler: () => this.promptInstall() },
        { label: 'Dismiss', color: 'white' }
      ]
    });
  }
}
```

## 🎨 Mobile UI/UX Considerations

### 1. **Touch Interactions**

```typescript
class MobileTouchHandler {
  private touchStartX = 0;
  private touchStartY = 0;
  private isSwiping = false;

  setupTouchHandlers(element: HTMLElement): void {
    element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    element.addEventListener('touchend', this.handleTouchEnd.bind(this));
  }

  private handleTouchStart(e: TouchEvent): void {
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
  }

  private handleTouchMove(e: TouchEvent): void {
    if (!this.isSwiping) {
      const deltaX = Math.abs(e.touches[0].clientX - this.touchStartX);
      const deltaY = Math.abs(e.touches[0].clientY - this.touchStartY);

      // Detect horizontal swipe
      if (deltaX > 50 && deltaX > deltaY) {
        this.isSwiping = true;
        e.preventDefault(); // Prevent scroll
      }
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    if (this.isSwiping) {
      const deltaX = e.changedTouches[0].clientX - this.touchStartX;

      if (deltaX > 100) {
        // Swipe right - go back
        this.navigateBack();
      } else if (deltaX < -100) {
        // Swipe left - go forward
        this.navigateForward();
      }
    }

    this.isSwiping = false;
  }
}
```

### 2. **Viewport Management**

```typescript
class MobileViewportManager {
  setupViewport(): void {
    // Prevent zoom on input focus (iOS)
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content',
        'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
      );
    }

    // Handle safe area insets (iPhone notch)
    this.handleSafeAreaInsets();

    // Handle keyboard appearance
    this.handleKeyboard();
  }

  private handleSafeAreaInsets(): void {
    // Add CSS variables for safe area
    const root = document.documentElement;
    root.style.setProperty('--safe-area-inset-top', 'env(safe-area-inset-top)');
    root.style.setProperty('--safe-area-inset-bottom', 'env(safe-area-inset-bottom)');
    root.style.setProperty('--safe-area-inset-left', 'env(safe-area-inset-left)');
    root.style.setProperty('--safe-area-inset-right', 'env(safe-area-inset-right)');
  }

  private handleKeyboard(): void {
    // Detect keyboard appearance (iOS)
    window.visualViewport?.addEventListener('resize', () => {
      const keyboardHeight = window.innerHeight - window.visualViewport!.height;

      if (keyboardHeight > 0) {
        // Keyboard is visible
        document.body.style.paddingBottom = `${keyboardHeight}px`;
      } else {
        // Keyboard is hidden
        document.body.style.paddingBottom = '0';
      }
    });
  }
}
```

### 3. **Performance Optimization**

```typescript
class MobilePerformanceOptimizer {
  optimizeForMobile(): void {
    // Reduce animation complexity on mobile
    if (this.isMobile()) {
      this.disableExpensiveAnimations();
      this.reduceRenderQuality();
      this.enableVirtualScrolling();
    }
  }

  private isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  private disableExpensiveAnimations(): void {
    // Disable complex CSS animations
    document.body.classList.add('reduced-motion');
  }

  private reduceRenderQuality(): void {
    // For mindmap canvas, reduce quality on mobile
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = false; // Faster rendering
      }
    }
  }

  private enableVirtualScrolling(): void {
    // Use virtual scrolling for large lists
    // (Quasar QVirtualScroll component)
  }
}
```

## 🔋 Battery & Network Optimization

### 1. **Battery-Aware Sync**

```typescript
class BatteryAwareSync {
  private batteryManager: any = null;

  async initialize(): Promise<void> {
    if ('getBattery' in navigator) {
      this.batteryManager = await (navigator as any).getBattery();
      this.setupBatteryListeners();
    }
  }

  private setupBatteryListeners(): void {
    this.batteryManager.addEventListener('levelchange', () => {
      this.adjustSyncStrategy();
    });

    this.batteryManager.addEventListener('chargingchange', () => {
      this.adjustSyncStrategy();
    });
  }

  private adjustSyncStrategy(): void {
    const level = this.batteryManager.level;
    const charging = this.batteryManager.charging;

    if (charging) {
      // Aggressive sync when charging
      this.setSyncInterval(60000); // 1 minute
    } else if (level < 0.2) {
      // Conservative sync when low battery
      this.setSyncInterval(600000); // 10 minutes
    } else {
      // Normal sync
      this.setSyncInterval(300000); // 5 minutes
    }
  }

  private setSyncInterval(ms: number): void {
    // Update sync manager interval
    syncManager.setInterval(ms);
  }
}
```

### 2. **Network-Aware Sync**

```typescript
class NetworkAwareSync {
  private connection: any = null;

  initialize(): void {
    this.connection = (navigator as any).connection ||
                      (navigator as any).mozConnection ||
                      (navigator as any).webkitConnection;

    if (this.connection) {
      this.connection.addEventListener('change', () => {
        this.adjustSyncStrategy();
      });
    }

    // Also listen to online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  private adjustSyncStrategy(): void {
    const effectiveType = this.connection?.effectiveType;

    switch (effectiveType) {
      case 'slow-2g':
      case '2g':
        // Very slow connection - minimal sync
        this.setDataSaver(true);
        this.setSyncQuality('minimal');
        break;
      case '3g':
        // Moderate connection - reduced sync
        this.setDataSaver(true);
        this.setSyncQuality('reduced');
        break;
      case '4g':
      case '5g':
        // Fast connection - full sync
        this.setDataSaver(false);
        this.setSyncQuality('full');
        break;
    }
  }

  private setDataSaver(enabled: boolean): void {
    // Enable/disable data saver mode
    appStore.setDataSaver(enabled);
  }

  private setSyncQuality(quality: 'minimal' | 'reduced' | 'full'): void {
    switch (quality) {
      case 'minimal':
        // Only sync metadata, no content
        syncManager.setSyncMode('metadata-only');
        break;
      case 'reduced':
        // Sync essential content only
        syncManager.setSyncMode('essential');
        break;
      case 'full':
        // Sync everything
        syncManager.setSyncMode('full');
        break;
    }
  }

  private handleOnline(): void {
    // App came online - sync immediately
    syncManager.syncNow();
  }

  private handleOffline(): void {
    // App went offline - queue changes
    syncManager.enableOfflineMode();
  }
}
```

## 📱 Mobile-Specific Features

### 1. **Share API**

```typescript
class MobileShareManager {
  async shareDocument(doc: MindpadDocument): Promise<boolean> {
    if (!('share' in navigator)) {
      // Fallback to copy link
      return this.copyLink(doc);
    }

    try {
      await navigator.share({
        title: doc.metadata.name,
        text: doc.metadata.description,
        url: `https://mindpad.app/doc/${doc.metadata.id}`
      });
      return true;
    } catch (error) {
      console.error('Share failed:', error);
      return false;
    }
  }

  async shareFile(doc: MindpadDocument): Promise<boolean> {
    if (!('share' in navigator) || !('canShare' in navigator)) {
      return false;
    }

    // Export document as file
    const blob = new Blob([JSON.stringify(doc, null, 2)], {
      type: 'application/json'
    });
    const file = new File([blob], `${doc.metadata.name}.json`, {
      type: 'application/json'
    });

    if ((navigator as any).canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: doc.metadata.name
        });
        return true;
      } catch (error) {
        console.error('File share failed:', error);
        return false;
      }
    }

    return false;
  }

  private copyLink(doc: MindpadDocument): boolean {
    const url = `https://mindpad.app/doc/${doc.metadata.id}`;
    navigator.clipboard.writeText(url);

    Notify.create({
      message: 'Link copied to clipboard',
      type: 'positive'
    });

    return true;
  }
}
```

### 2. **Haptic Feedback**

```typescript
class HapticFeedback {
  vibrate(pattern: number | number[]): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }

  // Light tap (button press)
  light(): void {
    this.vibrate(10);
  }

  // Medium tap (selection)
  medium(): void {
    this.vibrate(20);
  }

  // Heavy tap (error/warning)
  heavy(): void {
    this.vibrate(50);
  }

  // Success pattern
  success(): void {
    this.vibrate([10, 50, 10]);
  }

  // Error pattern
  error(): void {
    this.vibrate([50, 100, 50]);
  }
}
```

## 🎯 Mobile Testing Strategy

### Device Testing Matrix:

| Device | OS | Browser | Priority |
|--------|----|---------| ---------|
| iPhone 14 | iOS 17 | Safari | High |
| iPhone SE | iOS 16 | Safari | High |
| Samsung Galaxy S23 | Android 13 | Chrome | High |
| Google Pixel 7 | Android 14 | Chrome | Medium |
| iPad Pro | iOS 17 | Safari | Medium |
| OnePlus 10 | Android 12 | Chrome | Low |

### Testing Checklist:

- [ ] Storage quota handling
- [ ] Offline functionality
- [ ] Touch gestures
- [ ] Keyboard appearance
- [ ] Safe area insets
- [ ] PWA installation
- [ ] Background sync (Android)
- [ ] Battery optimization
- [ ] Network switching
- [ ] Share API
- [ ] Haptic feedback
- [ ] Performance (60fps)
- [ ] Memory usage
- [ ] Data usage

## 🚀 Mobile Optimization Roadmap

### Phase 1: Core Mobile Support
- [ ] Detect mobile browsers
- [ ] Implement storage quota management
- [ ] Add iOS-specific workarounds
- [ ] Optimize touch interactions
- [ ] Handle viewport properly

### Phase 2: PWA Features
- [ ] Add PWA manifest
- [ ] Implement service worker
- [ ] Add install prompt
- [ ] Enable offline mode
- [ ] Add background sync (Android)

### Phase 3: Mobile-Specific Features
- [ ] Implement Share API
- [ ] Add haptic feedback
- [ ] Battery-aware sync
- [ ] Network-aware sync
- [ ] Mobile-optimized UI

### Phase 4: Performance Optimization
- [ ] Reduce bundle size
- [ ] Lazy load components
- [ ] Optimize animations
- [ ] Virtual scrolling
- [ ] Image optimization

## 📚 Resources

- [iOS Safari Limits](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)
- [PWA Best Practices](https://web.dev/pwa-checklist/)
- [Mobile Performance](https://web.dev/mobile-performance/)
- [Touch Events](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events)
- [Network Information API](https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API)

