# Security Architecture

## 🔒 Overview

MindPad handles sensitive user data (thoughts, notes, ideas) that requires robust security and privacy protection. This document outlines the security architecture across all storage providers.

## 🎯 Security Principles

### 1. **Defense in Depth**
Multiple layers of security, not relying on a single mechanism

### 2. **Zero-Trust Architecture**
Never trust data from any source without validation

### 3. **Privacy by Design**
User privacy is built into the architecture, not added later

### 4. **Minimal Data Exposure**
Only expose what's absolutely necessary

### 5. **User Control**
Users should control their data and encryption keys

## 🔐 Encryption Strategy

### Three-Tier Approach:

```
┌─────────────────────────────────────────────────────────┐
│ Tier 1: Transport Security (HTTPS/TLS)                  │
│ ├─ All network communication encrypted                  │
│ └─ Prevents man-in-the-middle attacks                   │
├─────────────────────────────────────────────────────────┤
│ Tier 2: Provider-Side Encryption                        │
│ ├─ Google Drive: Encrypted at rest by Google           │
│ ├─ IndexedDB: Browser-level encryption (OS dependent)  │
│ └─ GitHub: Encrypted at rest by GitHub                  │
├─────────────────────────────────────────────────────────┤
│ Tier 3: Client-Side Encryption (Optional)               │
│ ├─ End-to-end encryption for sensitive data            │
│ ├─ User controls encryption keys                        │
│ └─ Provider cannot read encrypted content               │
└─────────────────────────────────────────────────────────┘
```

## 🔑 Client-Side Encryption (E2EE)

### Implementation Strategy:

```typescript
// Encryption configuration
interface EncryptionConfig {
  enabled: boolean;
  algorithm: 'AES-GCM-256'; // Web Crypto API standard
  keyDerivation: 'PBKDF2'; // Password-based key derivation
  iterations: 100000; // PBKDF2 iterations
  saltLength: 16; // bytes
  ivLength: 12; // bytes for AES-GCM
}

// Encrypted file structure
interface EncryptedFile {
  version: '1.0';
  algorithm: 'AES-GCM-256';
  encrypted: true;
  salt: string; // Base64 encoded
  iv: string; // Base64 encoded
  data: string; // Base64 encoded encrypted data
  authTag: string; // Base64 encoded authentication tag
  metadata: {
    // Unencrypted metadata for indexing
    id: string;
    timestamp: number;
    size: number; // Encrypted size
  };
}
```

### Encryption Flow:

```typescript
class EncryptionService {
  private key: CryptoKey | null = null;

  // Initialize encryption with user password
  async initialize(password: string, salt?: Uint8Array): Promise<void> {
    // Generate salt if not provided
    const actualSalt = salt || crypto.getRandomValues(new Uint8Array(16));

    // Derive key from password using PBKDF2
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    this.key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: actualSalt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Encrypt data
  async encrypt(data: Uint8Array): Promise<EncryptedFile> {
    if (!this.key) throw new Error('Encryption not initialized');

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.key,
      data
    );

    return {
      version: '1.0',
      algorithm: 'AES-GCM-256',
      encrypted: true,
      salt: base64Encode(this.salt),
      iv: base64Encode(iv),
      data: base64Encode(new Uint8Array(encrypted)),
      authTag: '', // Included in AES-GCM output
      metadata: {
        id: generateId(),
        timestamp: Date.now(),
        size: encrypted.byteLength
      }
    };
  }

  // Decrypt data
  async decrypt(encryptedFile: EncryptedFile): Promise<Uint8Array> {
    if (!this.key) throw new Error('Encryption not initialized');

    const iv = base64Decode(encryptedFile.iv);
    const data = base64Decode(encryptedFile.data);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.key,
      data
    );

    return new Uint8Array(decrypted);
  }
}
```

### Key Management:

```typescript
interface KeyManagement {
  // Option 1: Password-based (user remembers password)
  passwordBased: {
    password: string; // User-provided password
    salt: Uint8Array; // Stored in browser (not synced)
    hint?: string; // Optional password hint
  };

  // Option 2: Passphrase-based (12-word recovery phrase)
  passphraseBased: {
    words: string[]; // BIP39 mnemonic (12 words)
    salt: Uint8Array;
  };

  // Option 3: Device-based (stored in browser)
  deviceBased: {
    key: CryptoKey; // Stored in IndexedDB (non-extractable)
    backup: string; // Encrypted backup of key
  };
}
```

## 🔐 Authentication & Authorization

### Provider Authentication:

```typescript
interface AuthenticationStrategy {
  // Google Drive OAuth 2.0
  googleDrive: {
    type: 'OAuth2';
    scopes: ['drive.file', 'drive.appdata'];
    tokenStorage: 'secure'; // Encrypted in IndexedDB
    refreshToken: true;
    tokenExpiry: number;
  };

  // GitHub OAuth
  github: {
    type: 'OAuth2';
    scopes: ['repo', 'user'];
    tokenStorage: 'secure';
    refreshToken: true;
  };

  // Local File System (Electron)
  localFileSystem: {
    type: 'none'; // No authentication needed
    permissions: 'file-system-access-api';
  };
}
```

### Token Security:

```typescript
class SecureTokenStorage {
  // Store tokens encrypted in IndexedDB
  async storeToken(provider: string, token: string): Promise<void> {
    // Encrypt token with device key
    const encrypted = await this.encryptToken(token);

    await db.tokens.put({
      provider,
      token: encrypted,
      timestamp: Date.now(),
      expiresAt: Date.now() + 3600000 // 1 hour
    });
  }

  // Retrieve and decrypt token
  async getToken(provider: string): Promise<string | null> {
    const record = await db.tokens.get(provider);

    if (!record) return null;
    if (record.expiresAt < Date.now()) {
      // Token expired, refresh it
      return await this.refreshToken(provider);
    }

    return await this.decryptToken(record.token);
  }

  // Automatic token refresh
  private async refreshToken(provider: string): Promise<string> {
    // Provider-specific refresh logic
    const newToken = await providerManager
      .getProvider(provider)
      .refreshAccessToken();

    await this.storeToken(provider, newToken);
    return newToken;
  }
}
```

## 🛡️ Data Validation & Sanitization

### Input Validation:

```typescript
class DataValidator {
  // Validate document structure
  validateDocument(doc: unknown): doc is MindpadDocument {
    if (!doc || typeof doc !== 'object') return false;

    const d = doc as any;

    // Required fields
    if (!d.version || typeof d.version !== 'string') return false;
    if (!d.metadata || typeof d.metadata !== 'object') return false;
    if (!Array.isArray(d.nodes)) return false;
    if (!Array.isArray(d.edges)) return false;

    // Validate metadata
    if (!this.validateMetadata(d.metadata)) return false;

    // Validate nodes
    for (const node of d.nodes) {
      if (!this.validateNode(node)) return false;
    }

    // Validate edges
    for (const edge of d.edges) {
      if (!this.validateEdge(edge)) return false;
    }

    return true;
  }

  // Sanitize user input (prevent XSS)
  sanitizeText(text: string): string {
    // Remove potentially dangerous HTML/scripts
    return text
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // Validate file size limits
  validateFileSize(size: number, maxSize: number = 10 * 1024 * 1024): boolean {
    return size > 0 && size <= maxSize; // Max 10MB
  }

  // Validate node count (prevent DoS)
  validateNodeCount(count: number, maxNodes: number = 10000): boolean {
    return count >= 0 && count <= maxNodes;
  }
}
```

## 🔒 Content Security Policy (CSP)

### CSP Headers:

```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' https://www.googleapis.com https://accounts.google.com;
  frame-src https://accounts.google.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
">
```

### Rationale:
- **script-src**: Only allow scripts from our domain + Google APIs
- **connect-src**: Only allow API calls to our domain + Google
- **object-src 'none'**: Prevent Flash/Java exploits
- **frame-src**: Only allow Google OAuth frames

## 🚨 Security Monitoring & Logging

### Security Events to Log:

```typescript
interface SecurityEvent {
  type: 'auth' | 'encryption' | 'validation' | 'access';
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: number;
  userId?: string;
  provider?: string;
  action: string;
  details: Record<string, any>;
  ipAddress?: string; // If available
}

class SecurityLogger {
  async logEvent(event: SecurityEvent): Promise<void> {
    // Log to IndexedDB
    await db.securityLogs.add(event);

    // If critical, alert user
    if (event.severity === 'critical') {
      this.alertUser(event);
    }

    // Send to analytics (anonymized)
    if (event.severity === 'error' || event.severity === 'critical') {
      this.sendToAnalytics(this.anonymize(event));
    }
  }

  // Examples of security events
  logAuthFailure(provider: string, reason: string) {
    this.logEvent({
      type: 'auth',
      severity: 'warning',
      timestamp: Date.now(),
      provider,
      action: 'auth_failure',
      details: { reason }
    });
  }

  logEncryptionError(error: Error) {
    this.logEvent({
      type: 'encryption',
      severity: 'error',
      timestamp: Date.now(),
      action: 'encryption_failed',
      details: { error: error.message }
    });
  }

  logInvalidData(source: string, reason: string) {
    this.logEvent({
      type: 'validation',
      severity: 'warning',
      timestamp: Date.now(),
      action: 'invalid_data',
      details: { source, reason }
    });
  }
}
```

## 🔐 Privacy Considerations

### Data Minimization:

```typescript
interface PrivacySettings {
  // What data to collect
  analytics: {
    enabled: boolean;
    anonymized: true; // Always anonymize
    events: string[]; // Whitelist of events to track
  };

  // What data to sync
  sync: {
    encryptionEnabled: boolean;
    metadataOnly: boolean; // Sync only metadata, not content
    excludePatterns: string[]; // Files/folders to exclude
  };

  // What data to share
  sharing: {
    allowSharing: boolean;
    defaultPermission: 'view' | 'edit';
    requireAuthentication: boolean;
  };
}
```

### GDPR Compliance:

```typescript
class PrivacyCompliance {
  // Right to access
  async exportUserData(userId: string): Promise<Blob> {
    const data = await this.collectAllUserData(userId);
    return new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
  }

  // Right to erasure
  async deleteUserData(userId: string): Promise<void> {
    // Delete from IndexedDB
    await db.documents.where('userId').equals(userId).delete();
    await db.securityLogs.where('userId').equals(userId).delete();

    // Delete from providers
    for (const provider of this.providers) {
      await provider.deleteAllUserData(userId);
    }
  }

  // Right to data portability
  async exportToStandardFormat(userId: string): Promise<Blob> {
    // Export in standard JSON format
    const data = await this.collectAllUserData(userId);
    return this.convertToStandardFormat(data);
  }
}
```

## 🎯 Security Checklist

### Before Launch:
- [ ] All network communication over HTTPS
- [ ] OAuth tokens stored encrypted
- [ ] Input validation on all user data
- [ ] XSS prevention (sanitize all text)
- [ ] CSRF protection (if using cookies)
- [ ] Content Security Policy configured
- [ ] Rate limiting on API calls
- [ ] Error messages don't leak sensitive info
- [ ] Security logging implemented
- [ ] Privacy policy written
- [ ] GDPR compliance implemented

### Optional (Phase 2):
- [ ] Client-side encryption (E2EE)
- [ ] Two-factor authentication
- [ ] Session management
- [ ] Audit logging
- [ ] Penetration testing
- [ ] Security headers (HSTS, X-Frame-Options, etc.)

## 🚀 Implementation Priority

### Phase 1: Essential Security (MVP)
1. HTTPS everywhere
2. OAuth token encryption
3. Input validation
4. XSS prevention
5. CSP headers

### Phase 2: Enhanced Security
1. Client-side encryption (optional)
2. Security logging
3. Rate limiting
4. Error handling

### Phase 3: Advanced Security
1. Two-factor authentication
2. Audit logging
3. Penetration testing
4. Security monitoring

## 📚 Resources

- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [OAuth 2.0 Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)

