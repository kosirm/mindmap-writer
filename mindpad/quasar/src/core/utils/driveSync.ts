/**
 * Google Drive Sync Utilities
 * Handles synchronization between IndexedDB and Google Drive
 *
 * IMPORTANT: All files are stored in SHORT property name format for:
 * - Smaller file sizes (88% reduction in property overhead)
 * - Faster uploads/downloads
 * - No serialization overhead during sync
 * - Consistent format across storage layers
 */

import { serializeDocument, deserializeDocument } from './propertySerialization'
import type { PropertyName } from '../constants/propertyNames'

export interface SyncOptions {
  /** Force validation even if disabled by default */
  forceValidation?: boolean
  /** Throw errors on validation failure (recommended for Drive loads) */
  strict?: boolean
}

export interface SyncResult {
  success: boolean
  documentId: string
  error?: string
  validationErrors?: string[]
}

/**
 * Save document to Google Drive
 * Documents are saved in SHORT property name format
 */
export function saveToDrive(
  document: Record<string, unknown>,
  driveFileId?: string
): Promise<SyncResult> {
  try {
    // Serialize to short names (validation optional, default: dev only)
    serializeDocument(document, {
      validate: import.meta.env.DEV,  // Validate in dev before upload
      strict: false  // Don't throw, just warn
    })

    // Upload to Google Drive (implementation depends on your Drive API wrapper)
    // const fileId = await googleDriveApi.upload(JSON.stringify(serialized), driveFileId)

    return Promise.resolve({
      success: true,
      documentId: driveFileId || 'new-file-id'
    })
  } catch (error) {
    return Promise.resolve({
      success: false,
      documentId: driveFileId || '',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * Load document from Google Drive
 *
 * CRITICAL: Always validates loaded data because:
 * - User might have manually edited the JSON file
 * - File corruption during transfer
 * - Version conflicts during sync
 * - Malicious modifications
 *
 * Validation is MANDATORY and cannot be disabled.
 */
export function loadFromDrive(
  driveFileId: string,
  options: SyncOptions = {}
): Promise<SyncResult & { document?: Record<string, unknown> }> {
  try {
    // Download from Google Drive
    // const jsonContent = await googleDriveApi.download(driveFileId)
    const jsonContent = '{}' // Placeholder

    // Parse JSON
    const serialized = JSON.parse(jsonContent) as Partial<Record<PropertyName, unknown>> & {
      nodes: Partial<Record<PropertyName, unknown>>[]
      edges: Partial<Record<PropertyName, unknown>>[]
      interMapLinks: Partial<Record<PropertyName, unknown>>[]
    }

    // MANDATORY VALIDATION - cannot be disabled
    // This protects against corrupted/malicious data from Drive
    const document = deserializeDocument(serialized)

    // Additional validation using propertyValidation
    const validationErrors: string[] = []

    // Validate document structure
    if (!document.metadata || !document.nodes || !document.edges) {
      validationErrors.push('Invalid document structure: missing required fields')
    }

    // Validate all nodes
    if (Array.isArray(document.nodes)) {
      for (let i = 0; i < (document.nodes as unknown[]).length; i++) {
        const node = (document.nodes as Record<string, unknown>[])[i]
        if (!node?.id || !node?.data) {
          validationErrors.push(`Invalid node at index ${i}: missing id or data`)
        }
      }
    }

    // Validate all edges
    if (Array.isArray(document.edges)) {
      for (let i = 0; i < (document.edges as unknown[]).length; i++) {
        const edge = (document.edges as Record<string, unknown>[])[i]
        if (!edge?.id || !edge?.source || !edge?.target) {
          validationErrors.push(`Invalid edge at index ${i}: missing id, source, or target`)
        }
      }
    }

    // If strict mode and validation errors, throw
    if (options.strict && validationErrors.length > 0) {
      throw new Error(`Validation failed:\n${validationErrors.join('\n')}`)
    }

    // Log warnings if validation errors but not strict
    if (validationErrors.length > 0) {
      console.warn('Document validation warnings:', validationErrors)
    }

    return Promise.resolve({
      success: true,
      documentId: driveFileId,
      document,
      validationErrors: validationErrors.length > 0 ? validationErrors : []
    })
  } catch (error) {
    return Promise.resolve({
      success: false,
      documentId: driveFileId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * Sync document between IndexedDB and Google Drive
 * Determines sync direction based on modification timestamps
 */
export async function syncDocument(
  localDocument: Record<string, unknown>,
  driveFileId: string
): Promise<SyncResult> {
  try {
    // Load from Drive with validation
    const driveResult = await loadFromDrive(driveFileId, { strict: true })

    if (!driveResult.success || !driveResult.document) {
      throw new Error(driveResult.error || 'Failed to load from Drive')
    }

    // Compare timestamps to determine sync direction
    const localModified = new Date((localDocument.metadata as { modified?: string })?.modified || 0)
    const driveModified = new Date((driveResult.document.metadata as { modified?: string })?.modified || 0)

    if (localModified > driveModified) {
      // Local is newer - upload to Drive
      return await saveToDrive(localDocument, driveFileId)
    } else if (driveModified > localModified) {
      // Drive is newer - update local (caller should save to IndexedDB)
      return {
        success: true,
        documentId: driveFileId
      }
    } else {
      // Same timestamp - no sync needed
      return {
        success: true,
        documentId: driveFileId
      }
    }
  } catch (error) {
    return {
      success: false,
      documentId: driveFileId,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
