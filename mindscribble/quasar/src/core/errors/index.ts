/**
 * Core error classes for MindScribble
 * Minimal error handling with provider-aware design
 */

export class MindScribbleError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MindScribbleError';
  }
}

/**
 * Storage-related errors (IndexedDB, quota, etc.)
 */
export class StorageError extends MindScribbleError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'STORAGE_ERROR', context);
    this.name = 'StorageError';
  }
}

/**
 * Network-related errors (sync, offline, etc.)
 */
export class NetworkError extends MindScribbleError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', context);
    this.name = 'NetworkError';
  }
}

/**
 * Authentication errors (Google OAuth, token expiry, etc.)
 */
export class AuthError extends MindScribbleError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'AUTH_ERROR', context);
    this.name = 'AuthError';
  }
}
