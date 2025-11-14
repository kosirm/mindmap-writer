import { defineStore, acceptHMRUpdate } from 'pinia';
import { ref, computed } from 'vue';

/**
 * Extended data structure for mindmap nodes
 * This is our single source of truth
 */
export interface MindmapNode {
  // Core identity
  id: string;              // UUID
  path: string;            // Hierarchical path (e.g., "1", "1-1", "1-2-3")

  // Content
  title: string;           // First N words (auto-extracted from content)
  content: string;         // Full paragraph text

  // Hierarchy
  parentId: string | null; // Reference to parent node
  order: number;           // Position among siblings (0-based)
  children: MindmapNode[]; // Child nodes

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Icons displayed before the title (e.g., 'content', 'calendar', 'priority')
  icons: string[];

  // Metadata (extensible for future features)
  metadata: {
    color?: string | undefined;        // Node color
    collapsed?: boolean | undefined;   // Is node collapsed
    left?: boolean | undefined;        // For mindmap layout (left/right side)
    // Future: tags, custom dates, etc.
  };
}

/**
 * Legacy data structure for vue3-mindmap compatibility
 * Used for rendering in the mindmap component
 */
export interface MindmapData {
  name: string;
  children?: Array<MindmapData> | undefined;
  left?: boolean | undefined;
  collapse?: boolean | undefined;
  icons?: string[] | undefined;
}

/**
 * Document metadata
 */
export interface DocumentMetadata {
  id: string;
  name: string;
  createdAt: Date;
  lastModified: Date;
}

/**
 * Storage provider types
 */
export type StorageProvider = 'local' | 'google-drive';

/**
 * Orientation modes for mindmap layout
 */
export type Orientation = 'left-right' | 'right-left' | 'clockwise' | 'anticlockwise';

// ============================================================================
// CONVERSION UTILITIES
// ============================================================================

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract title from content (first N words)
 * TODO: Will be used when implementing title auto-extraction from content
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function extractTitle(content: string, wordCount: number = 3): string {
  if (!content.trim()) return 'Untitled';

  const words = content.trim().split(/\s+/);
  const titleWords = words.slice(0, wordCount);
  const title = titleWords.join(' ');

  // Add ellipsis if there are more words
  return words.length > wordCount ? `${title}...` : title;
}

/**
 * Convert legacy MindmapData to extended MindmapNode structure
 */
function convertLegacyToNode(
  legacy: MindmapData,
  parentId: string | null = null,
  path: string = '1',
  order: number = 0
): MindmapNode {
  const id = generateId();
  const now = new Date();

  const node: MindmapNode = {
    id,
    path,
    title: legacy.name,
    content: legacy.name, // Legacy format doesn't have separate content
    parentId,
    order,
    children: [],
    icons: legacy.icons || [],
    createdAt: now,
    updatedAt: now,
    metadata: {
      collapsed: legacy.collapse,
      left: legacy.left
    }
  };

  // Convert children recursively
  if (legacy.children && legacy.children.length > 0) {
    node.children = legacy.children.map((child, index) =>
      convertLegacyToNode(child, id, `${path}-${index + 1}`, index)
    );
  }

  return node;
}

/**
 * Convert extended MindmapNode to legacy MindmapData structure
 * Used for rendering in vue3-mindmap component
 */
function convertNodeToLegacy(node: MindmapNode): MindmapData {
  // Auto-add 'content' icon if node has content different from title
  const icons = [...node.icons];
  if (node.content && node.content.trim() !== '' && node.content !== node.title) {
    if (!icons.includes('content')) {
      icons.push('content');
    }
  }

  const legacy: MindmapData = {
    name: node.title,
    left: node.metadata.left,
    collapse: node.metadata.collapsed,
    icons: icons.length > 0 ? icons : undefined
  };

  if (node.children.length > 0) {
    legacy.children = node.children.map(child => convertNodeToLegacy(child));
  }

  return legacy;
}

/**
 * Update node paths recursively after hierarchy changes
 * TODO: Will be used when implementing drag-drop reordering
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function updateNodePaths(node: MindmapNode, newPath: string): void {
  node.path = newPath;
  node.children.forEach((child, index) => {
    updateNodePaths(child, `${newPath}-${index + 1}`);
  });
}

/**
 * Mindmap store for managing document state and persistence
 */
export const useMindmapStore = defineStore('mindmap', () => {
  // ============================================================================
  // STATE
  // ============================================================================

  /**
   * Current document data (extended structure - single source of truth)
   */
  const currentDocument = ref<MindmapNode | null>(null);

  /**
   * Legacy format for vue3-mindmap component (computed from currentDocument)
   */
  const legacyDocument = computed<MindmapData | null>(() => {
    if (!currentDocument.value) return null;
    return convertNodeToLegacy(currentDocument.value);
  });

  /**
   * Current document metadata
   */
  const documentMetadata = ref<DocumentMetadata | null>(null);

  /**
   * Document ID (for localStorage or Google Drive file ID)
   */
  const documentId = ref<string | null>(null);

  /**
   * Document name
   */
  const documentName = ref<string>('Untitled Mindmap');

  /**
   * Has unsaved changes
   */
  const isDirty = ref<boolean>(false);

  /**
   * Last saved timestamp
   */
  const lastSaved = ref<Date | null>(null);

  /**
   * Auto-save enabled
   */
  const autoSaveEnabled = ref<boolean>(true);

  /**
   * Storage provider
   */
  const storageProvider = ref<StorageProvider>('local');

  /**
   * Mindmap orientation
   */
  const orientation = ref<Orientation>('right-left');

  /**
   * Auto-save timer ID
   */
  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

  // ============================================================================
  // GETTERS
  // ============================================================================

  /**
   * Check if a document is loaded
   */
  const hasDocument = computed(() => currentDocument.value !== null);

  /**
   * Get save status text
   */
  const saveStatus = computed(() => {
    if (!hasDocument.value) return 'No document';
    if (isDirty.value) return 'Unsaved changes';
    if (lastSaved.value) {
      const now = new Date();
      const diff = now.getTime() - lastSaved.value.getTime();
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);

      if (seconds < 60) return `Saved ${seconds}s ago`;
      if (minutes < 60) return `Saved ${minutes}m ago`;
      return `Saved at ${lastSaved.value.toLocaleTimeString()}`;
    }
    return 'Not saved';
  });

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Create a new empty document
   */
  function createNewDocument(name: string = 'Untitled Mindmap'): void {
    const now = new Date();
    const id = generateId();

    const newDoc: MindmapNode = {
      id,
      path: '1',
      title: 'Root',
      content: 'Root',
      parentId: null,
      order: 0,
      children: [],
      icons: [],
      createdAt: now,
      updatedAt: now,
      metadata: {}
    };

    currentDocument.value = newDoc;
    documentName.value = name;
    documentId.value = null;
    documentMetadata.value = {
      id: generateId(),
      name,
      createdAt: now,
      lastModified: now
    };
    isDirty.value = true;
    lastSaved.value = null;

    console.log('Created new document:', name);
  }

  /**
   * Update the current document data from legacy format
   * Called when mindmap component emits changes
   */
  function updateDocumentFromLegacy(data: MindmapData): void {
    // Convert legacy format to extended structure
    // Preserve existing IDs and timestamps if possible
    if (currentDocument.value) {
      // Update existing document structure
      updateNodeFromLegacy(currentDocument.value, data);
    } else {
      // Create new document from legacy data
      currentDocument.value = convertLegacyToNode(data);
    }

    isDirty.value = true;

    if (documentMetadata.value) {
      documentMetadata.value.lastModified = new Date();
    }

    // Trigger auto-save
    if (autoSaveEnabled.value) {
      scheduleAutoSave();
    }
  }

  /**
   * Update existing node structure from legacy data
   * Preserves IDs and timestamps
   */
  function updateNodeFromLegacy(node: MindmapNode, legacy: MindmapData): void {
    // Update title and content
    node.title = legacy.name;
    node.content = legacy.name; // In legacy format, name is the content
    node.updatedAt = new Date();

    // Update icons (filter out auto-added 'content' icon)
    node.icons = (legacy.icons || []).filter(icon => icon !== 'content');

    // Update metadata
    node.metadata.collapsed = legacy.collapse;
    node.metadata.left = legacy.left;

    // Update children
    if (legacy.children) {
      // Match existing children or create new ones
      const newChildren: MindmapNode[] = [];

      legacy.children.forEach((legacyChild, index) => {
        // Try to find existing child by order
        const existingChild = node.children[index];

        if (existingChild) {
          // Update existing child
          updateNodeFromLegacy(existingChild, legacyChild);
          existingChild.order = index;
          existingChild.path = `${node.path}-${index + 1}`;
          newChildren.push(existingChild);
        } else {
          // Create new child
          const newChild = convertLegacyToNode(
            legacyChild,
            node.id,
            `${node.path}-${index + 1}`,
            index
          );
          newChildren.push(newChild);
        }
      });

      node.children = newChildren;
    } else {
      node.children = [];
    }
  }

  /**
   * Update the current document data (extended format)
   */
  function updateDocument(data: MindmapNode): void {
    currentDocument.value = data;
    isDirty.value = true;

    if (documentMetadata.value) {
      documentMetadata.value.lastModified = new Date();
    }

    // Trigger auto-save
    if (autoSaveEnabled.value) {
      scheduleAutoSave();
    }
  }

  /**
   * Save document to localStorage
   */
  function saveToLocalStorage(): void {
    if (!currentDocument.value || !documentMetadata.value) {
      console.warn('No document to save');
      return;
    }

    try {
      const storageKey = documentId.value || `mindmap-${documentMetadata.value.id}`;

      const dataToSave = {
        version: '1.0', // Version for future compatibility
        metadata: documentMetadata.value,
        data: currentDocument.value,
        orientation: orientation.value
      };

      localStorage.setItem(storageKey, JSON.stringify(dataToSave, null, 2));

      // Save document list
      saveDocumentList(storageKey, documentName.value);

      documentId.value = storageKey;
      isDirty.value = false;
      lastSaved.value = new Date();

      console.log('Saved to localStorage:', storageKey);
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      throw error;
    }
  }

  /**
   * Load document from localStorage
   */
  function loadFromLocalStorage(storageKey: string): void {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) {
        throw new Error('Document not found');
      }

      const parsed = JSON.parse(stored);

      // Restore dates from JSON strings
      const restoredData = restoreDatesInNode(parsed.data);

      currentDocument.value = restoredData;
      documentMetadata.value = {
        ...parsed.metadata,
        createdAt: new Date(parsed.metadata.createdAt),
        lastModified: new Date(parsed.metadata.lastModified)
      };
      documentName.value = parsed.metadata.name;
      documentId.value = storageKey;
      orientation.value = parsed.orientation || 'right-left';
      isDirty.value = false;
      lastSaved.value = new Date(parsed.metadata.lastModified);

      console.log('Loaded from localStorage:', storageKey);
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      throw error;
    }
  }

  /**
   * Restore Date objects from JSON strings recursively
   */
  function restoreDatesInNode(node: MindmapNode): MindmapNode {
    return {
      ...node,
      createdAt: new Date(node.createdAt),
      updatedAt: new Date(node.updatedAt),
      children: node.children.map(child => restoreDatesInNode(child))
    };
  }

  /**
   * Get list of all saved documents
   */
  function getDocumentList(): Array<{ id: string; name: string; lastModified: Date }> {
    try {
      const listJson = localStorage.getItem('mindmap-document-list');
      if (!listJson) return [];

      const list = JSON.parse(listJson) as Array<{ id: string; name: string; lastModified: string }>;
      return list.map((item) => ({
        ...item,
        lastModified: new Date(item.lastModified)
      }));
    } catch (error) {
      console.error('Failed to get document list:', error);
      return [];
    }
  }

  /**
   * Save document to the document list
   */
  function saveDocumentList(id: string, name: string): void {
    try {
      const list = getDocumentList();
      const existingIndex = list.findIndex(item => item.id === id);

      const docInfo = {
        id,
        name,
        lastModified: new Date()
      };

      if (existingIndex >= 0) {
        list[existingIndex] = docInfo;
      } else {
        list.push(docInfo);
      }

      localStorage.setItem('mindmap-document-list', JSON.stringify(list));
    } catch (error) {
      console.error('Failed to save document list:', error);
    }
  }

  /**
   * Delete document from localStorage
   */
  function deleteDocument(storageKey: string): void {
    try {
      localStorage.removeItem(storageKey);

      // Remove from document list
      const list = getDocumentList();
      const filtered = list.filter(item => item.id !== storageKey);
      localStorage.setItem('mindmap-document-list', JSON.stringify(filtered));

      console.log('Deleted document:', storageKey);
    } catch (error) {
      console.error('Failed to delete document:', error);
      throw error;
    }
  }

  /**
   * Schedule auto-save (debounced)
   */
  function scheduleAutoSave(): void {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    autoSaveTimer = setTimeout(() => {
      if (isDirty.value && autoSaveEnabled.value) {
        saveToLocalStorage();
      }
    }, 5000); // 5 seconds after last change
  }

  /**
   * Manual save
   */
  function save(): void {
    if (storageProvider.value === 'local') {
      saveToLocalStorage();
    } else {
      // TODO: Implement Google Drive save
      console.warn('Google Drive save not yet implemented');
    }
  }

  /**
   * Export document as JSON file
   */
  function exportToJSON(): void {
    if (!currentDocument.value || !documentMetadata.value) {
      console.warn('No document to export');
      return;
    }

    const dataToExport = {
      version: '1.0', // Version for future compatibility
      metadata: documentMetadata.value,
      data: currentDocument.value,
      orientation: orientation.value
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${documentName.value}.json`;
    link.click();
    URL.revokeObjectURL(url);

    console.log('Exported document as JSON');
  }

  /**
   * Import document from JSON file
   */
  async function importFromJSON(file: File): Promise<void> {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      // Restore dates from JSON strings
      const restoredData = restoreDatesInNode(parsed.data);

      currentDocument.value = restoredData;
      documentMetadata.value = {
        ...parsed.metadata,
        id: generateId(), // Generate new ID for imported document
        createdAt: new Date(),
        lastModified: new Date()
      };
      documentName.value = parsed.metadata.name || file.name.replace('.json', '');
      documentId.value = null; // Will be assigned on first save
      orientation.value = parsed.orientation || 'right-left';
      isDirty.value = true;
      lastSaved.value = null;

      console.log('Imported document from JSON:', file.name);
    } catch (error) {
      console.error('Failed to import JSON:', error);
      throw error;
    }
  }

  /**
   * Set orientation
   */
  function setOrientation(newOrientation: Orientation): void {
    orientation.value = newOrientation;
    isDirty.value = true;
  }

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // State
    currentDocument,
    legacyDocument, // Computed legacy format for vue3-mindmap
    documentMetadata,
    documentId,
    documentName,
    isDirty,
    lastSaved,
    autoSaveEnabled,
    storageProvider,
    orientation,

    // Getters
    hasDocument,
    saveStatus,

    // Actions
    createNewDocument,
    updateDocument,
    updateDocumentFromLegacy,
    saveToLocalStorage,
    loadFromLocalStorage,
    getDocumentList,
    deleteDocument,
    save,
    exportToJSON,
    importFromJSON,
    setOrientation
  };
});

// Enable HMR
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useMindmapStore, import.meta.hot));
}

