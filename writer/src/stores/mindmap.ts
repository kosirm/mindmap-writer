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
  title: string;           // Explicit title (empty string = use inferred title from content)
  inferredTitle?: string;  // Cached inferred title (computed from content)
  content: string;         // Full paragraph text
  inferredCharCount?: number; // Optional: per-node character count for inferred title

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
 * Infer title from content (first N characters, rounded to word boundary)
 * Now preserves HTML formatting in the returned title
 * @param content - The content (HTML string from Tiptap)
 * @param targetCharCount - Target character count based on plain text length (default: 20)
 * @returns Inferred title as HTML string with formatting preserved
 */
export function inferTitle(content: string, targetCharCount: number = 20): string {
  if (!content || !content.trim()) return '';

  // Parse HTML to get both plain text and DOM structure
  const tmp = document.createElement('div');
  tmp.innerHTML = content;
  const plainText = tmp.textContent || '';
  const trimmedPlainText = plainText.trim();

  // If content is shorter than target, return all content (as HTML)
  if (trimmedPlainText.length <= targetCharCount) {
    // Stop at first paragraph break for single-line titles
    const firstParagraphEnd = content.indexOf('</p>');
    if (firstParagraphEnd > 0) {
      // Extract first paragraph only
      const firstParagraph = content.substring(0, firstParagraphEnd + 4); // Include </p>
      return firstParagraph;
    }
    return content;
  }

  // Check if the character at targetCharCount is a word boundary
  const charAtTarget = trimmedPlainText.charAt(targetCharCount);
  const wordBoundaryChars = [' ', ',', '.', '!', '?', ';', ':', '\n'];

  let targetPlainTextLength = targetCharCount;

  if (!wordBoundaryChars.includes(charAtTarget)) {
    // The target position is in the middle of a word, find the last word boundary
    const textUpToTarget = trimmedPlainText.substring(0, targetCharCount);
    const lastSpace = Math.max(
      textUpToTarget.lastIndexOf(' '),
      textUpToTarget.lastIndexOf(','),
      textUpToTarget.lastIndexOf('.'),
      textUpToTarget.lastIndexOf('!'),
      textUpToTarget.lastIndexOf('?'),
      textUpToTarget.lastIndexOf(';'),
      textUpToTarget.lastIndexOf(':')
    );

    if (lastSpace > 0) {
      targetPlainTextLength = lastSpace;
    }
  }

  // Now extract HTML up to targetPlainTextLength characters of plain text
  return extractHtmlUpToLength(content, targetPlainTextLength);
}

/**
 * Extract HTML content up to a specific plain text character count
 * Preserves all HTML formatting (bold, italic, etc.)
 * @param html - The HTML content
 * @param targetLength - Target plain text character count
 * @returns HTML string truncated to target length
 */
function extractHtmlUpToLength(html: string, targetLength: number): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;

  let charCount = 0;
  let result = '';

  // Walk through the DOM tree and extract HTML up to targetLength characters
  function walkNode(node: Node): boolean {
    if (charCount >= targetLength) return false; // Stop walking

    if (node.nodeType === Node.TEXT_NODE) {
      // Text node - count characters
      const text = node.textContent || '';
      const remainingChars = targetLength - charCount;

      if (text.length <= remainingChars) {
        // Include all text
        result += text;
        charCount += text.length;
        return true; // Continue
      } else {
        // Truncate text
        result += text.substring(0, remainingChars);
        charCount = targetLength;
        return false; // Stop
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Element node - preserve tags
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();

      // Stop at paragraph boundaries
      if (tagName === 'p' && result.length > 0) {
        return false; // Stop at second paragraph
      }

      result += `<${tagName}>`;

      // Walk children
      for (let i = 0; i < node.childNodes.length; i++) {
        const childNode = node.childNodes[i];
        if (childNode && !walkNode(childNode)) {
          break; // Stop if child says stop
        }
      }

      result += `</${tagName}>`;
      return charCount < targetLength; // Continue if not done
    }

    return true; // Continue by default
  }

  // Walk all child nodes
  for (let i = 0; i < tmp.childNodes.length; i++) {
    const childNode = tmp.childNodes[i];
    if (childNode && !walkNode(childNode)) {
      break;
    }
  }

  return result.trim();
}

/**
 * Strip HTML tags from text
 * @param html - HTML string
 * @returns Plain text
 */
export function stripHtmlTags(html: string): string {
  if (!html) return '';

  // Create a temporary div element
  const tmp = document.createElement('div');
  tmp.innerHTML = html;

  // Get text content (this automatically strips all HTML tags)
  const text = tmp.textContent || tmp.innerText || '';

  // Clean up and return
  return text.trim();
}

/**
 * Clean HTML tags from node title and content (recursively)
 * @param node - The mindmap node to clean
 */
function cleanNodeHtml(node: MindmapNode): void {
  // Clean title if it contains HTML tags
  if (node.title && (node.title.includes('<') || node.title.includes('>'))) {
    node.title = stripHtmlTags(node.title);
  }

  // Clean content if it contains HTML tags
  if (node.content && (node.content.includes('<') || node.content.includes('>'))) {
    node.content = stripHtmlTags(node.content);
  }

  // Recursively clean children
  if (node.children && node.children.length > 0) {
    node.children.forEach(child => cleanNodeHtml(child));
  }
}

/**
 * Normalize HTML title to ensure consistent rendering
 * Ensures all titles have proper <p> tags with margin: 0; padding: 0;
 * @param html - HTML string
 * @returns Normalized HTML string
 */
function normalizeTitleHtml(html: string): string {
  if (!html || html.trim() === '') return '<p style="margin: 0; padding: 0;"></p>';

  // If it's plain text (no HTML tags), wrap it in a <p> tag
  if (!html.includes('<')) {
    return `<p style="margin: 0; padding: 0;">${html}</p>`;
  }

  // If it already has <p> tags, ensure they have the correct inline styles
  const tmp = document.createElement('div');
  tmp.innerHTML = html;

  // Find all <p> tags and add inline styles
  const paragraphs = tmp.querySelectorAll('p');
  paragraphs.forEach(p => {
    p.setAttribute('style', 'margin: 0; padding: 0;');
  });

  return tmp.innerHTML;
}

/**
 * Get display title for a node (explicit or inferred)
 * @param node - The mindmap node
 * @param defaultCharCount - Default character count for inference (default: 20)
 * @returns Display title string (normalized HTML)
 */
export function getDisplayTitle(node: MindmapNode, defaultCharCount: number = 20): string {
  let title: string;

  // If node has explicit title, use it
  if (node.title && node.title.trim() !== '') {
    title = node.title;
  } else if (node.inferredTitle) {
    // Otherwise, use cached inferred title if available
    title = node.inferredTitle;
  } else {
    // Fallback: calculate on the fly (shouldn't happen if updateInferredTitles is called)
    const charCount = node.inferredCharCount || defaultCharCount;
    title = inferTitle(node.content, charCount);
  }

  // Normalize the HTML to ensure consistent rendering
  return normalizeTitleHtml(title);
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
    // Initialize content as empty - user must explicitly add content in Content Editor
    // This prevents the content icon from appearing on newly created nodes
    content: '',
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
  // Get display title (explicit or inferred)
  const displayTitle = getDisplayTitle(node);

  // Auto-add 'content' icon if node has actual text content
  const icons = [...node.icons];

  // Only check for content icon if content exists and is not empty
  if (node.content && node.content.trim() !== '') {
    // Check if content has actual text (not just empty HTML tags like <p></p> or <p><br></p>)
    const tmp = document.createElement('div');
    tmp.innerHTML = node.content;
    const textContent = tmp.textContent || '';

    // Only add icon if there's actual text content (not just whitespace)
    if (textContent.trim() !== '') {
      if (!icons.includes('content')) {
        icons.push('content');
      }
    }
  }

  const legacy: MindmapData = {
    name: displayTitle,
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
   * Version counter to force reactivity when nested properties change
   */
  const documentVersion = ref(0);

  /**
   * Legacy format for vue3-mindmap component (computed from currentDocument)
   */
  const legacyDocument = computed<MindmapData | null>(() => {
    // Access documentVersion to make this computed depend on it
    const version = documentVersion.value;

    console.log('[Store] legacyDocument computed called', {
      version,
      hasCurrentDoc: !!currentDocument.value,
      timestamp: new Date().toISOString()
    });

    if (!currentDocument.value) return null;
    const legacy = convertNodeToLegacy(currentDocument.value);

    console.log('[Store] legacyDocument computed result', {
      rootName: legacy.name,
      hasChildren: !!legacy.children
    });

    return legacy;
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
    // Check if the title actually changed (user edited it in mindmap)
    // If node has empty title (inferred mode), only update if user explicitly set a title
    const currentDisplayTitle = getDisplayTitle(node);
    const titleChanged = legacy.name !== currentDisplayTitle;

    if (titleChanged) {
      // User edited the title in mindmap - set it as explicit title
      node.title = legacy.name;
      node.updatedAt = new Date();
    }
    // If title didn't change, don't update it (preserve inferred mode)

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
   * Update inferred titles for a node and all its children recursively
   */
  function updateInferredTitles(node: MindmapNode): void {
    // Update inferred title for this node
    if (node.title === '' || !node.title) {
      const charCount = node.inferredCharCount || 20;
      node.inferredTitle = inferTitle(node.content, charCount);
    } else {
      // If node has explicit title, clear inferred title
      delete node.inferredTitle;
    }

    // Recursively update children
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => updateInferredTitles(child));
    }
  }

  /**
   * Update the current document data (extended format)
   */
  function updateDocument(data: MindmapNode): void {
    console.log('[Store] updateDocument called', {
      dataId: data.id,
      dataPath: data.path,
      dataTitle: data.title,
      dataContent: data.content
    });

    // Update inferred titles for all nodes
    updateInferredTitles(data);

    currentDocument.value = data;

    // Increment version to force reactivity for nested property changes
    documentVersion.value++;

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

      // Clean HTML tags from old data
      cleanNodeHtml(restoredData);

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

      // Clean HTML tags from imported data
      cleanNodeHtml(restoredData);

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

