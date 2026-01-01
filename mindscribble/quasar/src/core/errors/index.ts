/**
 * Core error classes for MindPad
 * Minimal error handling with provider-aware design
 */

export class MindPadError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MindPadError';
  }
}

/**
 * Storage-related errors (IndexedDB, quota, etc.)
 */
export class StorageError extends MindPadError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'STORAGE_ERROR', context);
    this.name = 'StorageError';
  }
}

/**
 * Network-related errors (sync, offline, etc.)
 */
export class NetworkError extends MindPadError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', context);
    this.name = 'NetworkError';
  }
}

/**
 * Authentication errors (Google OAuth, token expiry, etc.)
 */
export class AuthError extends MindPadError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'AUTH_ERROR', context);
    this.name = 'AuthError';
  }
}
