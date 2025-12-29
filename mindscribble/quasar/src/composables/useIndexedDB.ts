/**
 * Composable for IndexedDB operations with error handling
 */

import { db } from '../core/services/indexedDBService';
import { StorageError } from '../core/errors';
import type { MindscribbleDocument, MindscribbleNode } from '../core/types';

/**
 * Composable for IndexedDB operations with error handling
 */
export function useIndexedDB() {
  /**
   * Save document to IndexedDB
   */
  async function saveDocument(doc: MindscribbleDocument): Promise<void> {
    try {
      await db.documents.put(doc);
    } catch (error: unknown) {
      const err = error as Error;
      throw new StorageError('Failed to save document', {
        documentId: doc.metadata.id,
        error: err.message
      });
    }
  }

  /**
   * Load document from IndexedDB
   */
  async function loadDocument(documentId: string): Promise<MindscribbleDocument | undefined> {
    try {
      return await db.documents.get(documentId);
    } catch (error: unknown) {
      const err = error as Error;
      throw new StorageError('Failed to load document', {
        documentId,
        error: err.message
      });
    }
  }

  /**
   * Delete document from IndexedDB
   */
  async function deleteDocument(documentId: string): Promise<void> {
    try {
      await db.documents.delete(documentId);
    } catch (error: unknown) {
      const err = error as Error;
      throw new StorageError('Failed to delete document', {
        documentId,
        error: err.message
      });
    }
  }

  /**
   * Get all documents
   */
  async function getAllDocuments(): Promise<MindscribbleDocument[]> {
    try {
      return await db.documents.toArray();
    } catch (error: unknown) {
      const err = error as Error;
      throw new StorageError('Failed to load documents', {
        error: err.message
      });
    }
  }

  /**
   * Get nodes for a specific map
   */
  async function getNodesByMapId(mapId: string): Promise<MindscribbleNode[]> {
    try {
      return await db.nodes.where('mapId').equals(mapId).toArray();
    } catch (error: unknown) {
      const err = error as Error;
      throw new StorageError('Failed to load nodes', {
        mapId,
        error: err.message
      });
    }
  }

  return {
    saveDocument,
    loadDocument,
    deleteDocument,
    getAllDocuments,
    getNodesByMapId
  };
}
