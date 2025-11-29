# MindScribble Architecture

## Overview

MindScribble is a professional mindmap application built with Vue 3, Quasar, and VueFlow. This document outlines the architecture designed to avoid the performance and maintainability issues encountered in the vueflow prototype.

## Core Principles

1. **Feature-based modular structure** - Code organized by feature, not by layer
2. **Strict separation of concerns** - Clear boundaries between features
3. **Memory-conscious design** - Lazy loading, cleanup, shallow refs
4. **Performance-first** - Debouncing, memoization, virtual scrolling
5. **Composable-driven** - Small, focused, testable composables
6. **Pinia stores** for shared state - Not reactive refs in components
7. **Event bus** for cross-component communication
8. **Command system** for all user actions
9. **AI-first data format** - JSON structure optimized for AI agent integration
10. **User data ownership** - Mindmaps stored in user's Google Drive, not our servers

## Technology Stack

### Frontend
- **Vue 3** (Composition API) - UI framework
- **Quasar 2** - UI components with light/dark mode
- **Pinia** - State management
- **VueFlow** - Canvas rendering (layout engine from vueflow-design)
- **Tiptap** - Rich text editing
- **D3-Force** - Additional visualizations (circle pack, sunburst, treemap)
- **mitt** - Event bus
- **vue-i18n** - Internationalization
- **TypeScript** - Type safety

### Backend & Services
- **Supabase** - User authentication, profiles, subscription management
- **Google Drive API** - Mindmap file storage (user's drive)
- **Google OAuth** - User authentication via Google account
- **n8n** - AI agent workflow automation
- **Stripe** - Payment processing for subscriptions

### AI Integration
- **n8n Agent** - AI workflow orchestration
- **OpenAI/Claude** - LLM for mindmap generation and analysis
- **Custom AI Operations** - Structured JSON operations for mindmap manipulation

## Folder Structure

```
mindscribble/
├── src/
│   ├── features/              # Feature modules
│   │   ├── canvas/           # Mindmap canvas (VueFlow integration)
│   │   ├── writer/           # Writer panel (Full Document view)
│   │   ├── tree/             # Tree view
│   │   ├── keyboard/         # Keyboard navigation
│   │   ├── orientation/      # Layout orientation (clockwise/counterclockwise)
│   │   ├── persistence/      # Google Drive operations
│   │   ├── ai/               # AI agent integration
│   │   └── subscription/     # Subscription & feature gating
│   ├── core/                 # Core infrastructure
│   │   ├── commands/         # Command system
│   │   ├── events/           # Event bus
│   │   ├── stores/           # Global stores
│   │   ├── types/            # Shared types
│   │   └── api/              # API clients (Supabase, Google Drive, n8n)
│   ├── shared/               # Shared utilities
│   │   ├── components/       # Reusable components
│   │   ├── composables/      # Utility composables
│   │   └── utils/            # Helper functions
│   ├── layouts/              # App layouts
│   ├── pages/                # Route pages
│   ├── i18n/                 # Translations
│   ├── boot/                 # Boot files (Supabase, Google API, etc.)
│   └── router/               # Routing
└── dev/                      # Documentation
    ├── ARCHITECTURE.md       # This file
    ├── DATA_FORMAT.md        # JSON data format specification
    └── AI_INTEGRATION.md     # AI agent integration guide
```

## State Management

### Pinia Stores

1. **appStore** - Global app state
   - View mode (split/mindmap/writer)
   - Active context (canvas/writer/tree)
   - UI state (drawers, dialogs)
   - Online/offline status

2. **documentStore** - Document data (single source of truth)
   - nodes: Node[] (VueFlow format)
   - edges: Edge[] (VueFlow format)
   - Document metadata (id, name, created, modified, tags)
   - Current mindmap ID (Google Drive file ID)
   - CRUD operations
   - Export/import functions

3. **canvasStore** - Canvas-specific state
   - Selected node IDs
   - Viewport (position, zoom)
   - Visual settings (LOD, spacing, etc.)
   - Layout engine state

4. **orientationStore** - Layout orientation
   - Mode (clockwise/counterclockwise)
   - Layout calculations
   - Node ordering

5. **keyboardStore** - Keyboard state
   - Pressed keys
   - Active context
   - Navigation mode

6. **settingsStore** - User preferences
   - Theme (light/dark)
   - Locale
   - User settings
   - Editor preferences

7. **authStore** - Authentication state
   - User profile (from Supabase)
   - Google OAuth tokens
   - Login/logout functions

8. **subscriptionStore** - Subscription management
   - Subscription tier (free/pro/enterprise)
   - Subscription status (active/cancelled/expired)
   - Feature flags
   - Feature gate checks

9. **googleDriveStore** - Google Drive integration
   - App folder ID
   - Mindmap file list
   - Sync status
   - Search results

10. **aiStore** - AI agent state
    - AI processing status
    - Conversation history
    - AI suggestions
    - Last AI operations

## Data Format

### Mindmap JSON Structure

The mindmap data format is designed to be:
- **VueFlow-compatible** - Direct mapping to VueFlow nodes/edges
- **AI-friendly** - Easy for LLMs to understand and manipulate
- **Search-optimized** - Flattened text for Google Drive search
- **Version-controlled** - Schema version for future migrations

```typescript
interface MindmapDocument {
  // Schema version for future migrations
  version: string; // "1.0"

  // Metadata
  metadata: {
    id: string; // Google Drive file ID
    name: string; // User-visible name
    description?: string; // Optional description
    created: string; // ISO 8601 timestamp
    modified: string; // ISO 8601 timestamp
    tags: string[]; // User tags for organization

    // AI context (helps AI understand the mindmap)
    aiContext?: {
      topic?: string; // Main topic
      purpose?: string; // Purpose (planning, brainstorming, etc.)
      audience?: string; // Target audience
      lastAIAction?: string; // Last AI operation performed
    };

    // Search optimization (flattened text for Google Drive search)
    searchableText: string; // All node titles + content concatenated
  };

  // VueFlow nodes
  nodes: Node[]; // VueFlow Node type

  // VueFlow edges
  edges: Edge[]; // VueFlow Edge type

  // Layout settings
  layout: {
    orientationMode: 'clockwise' | 'counterclockwise';
    lodEnabled: boolean;
    lodThresholds: number[];
    horizontalSpacing: number;
    verticalSpacing: number;
  };
}

// VueFlow Node with our custom data
interface Node {
  id: string; // Unique node ID
  type: 'custom' | 'lod-badge'; // Node type
  position: { x: number; y: number }; // Canvas position

  data: {
    // Hierarchy
    parentId: string | null; // Parent node ID (null for root nodes)
    order: number; // Order among siblings

    // Content
    title: string; // Node title (can be empty for inferred titles)
    content: string; // Rich text HTML content (from Tiptap)

    // Metadata
    created?: string; // ISO 8601 timestamp
    modified?: string; // ISO 8601 timestamp

    // AI metadata
    aiGenerated?: boolean; // Was this node created by AI?
    aiPrompt?: string; // Prompt that generated this node
    aiSuggestions?: string[]; // AI suggestions for this node

    // Layout (for vueflow-design layout engine)
    collapsed?: boolean; // For child nodes: children hidden
    collapsedLeft?: boolean; // For root nodes: left children hidden
    collapsedRight?: boolean; // For root nodes: right children hidden
    isDirty?: boolean; // Needs position recalculation
    lastCalculatedZoom?: number; // Last zoom level calculated
  };
}

// VueFlow Edge with our custom data
interface Edge {
  id: string; // Unique edge ID
  source: string; // Source node ID
  target: string; // Target node ID
  sourceHandle: string; // 'center' or handle ID
  targetHandle: string; // 'center' or handle ID
  type: 'straight'; // Edge type
  class: 'edge-hierarchy' | 'edge-reference'; // CSS class

  data: {
    edgeType: 'hierarchy' | 'reference'; // Hierarchy or reference connection
  };
}
```

### Data Flow

```
User Action
    ↓
Command System
    ↓
Pinia Store (documentStore)
    ↓
Event Bus (notify other features)
    ↓
Google Drive API (auto-save)
    ↓
Supabase (update metadata)
```

## Communication Patterns

### Event Bus (Cross-Feature)

All cross-feature communication uses the event bus:

```typescript
// Canvas → Writer
eventBus.emit('canvas:node-selected', { nodeId })

// Writer → Canvas
eventBus.emit('writer:hierarchy-changed', { nodeId, newParentId })

// Tree → Canvas
eventBus.emit('tree:node-selected', { nodeId })

// AI → Canvas
eventBus.emit('ai:operations-applied', { operations, nodeIds })

// Google Drive → App
eventBus.emit('drive:sync-complete', { fileId, status })
```

### Command System (User Actions)

All user actions go through the command system:

```typescript
registerCommand({
  id: 'file.save',
  label: 'Save',
  icon: 'save',
  keybinding: 'Ctrl+S',
  execute: async () => {
    await googleDriveStore.saveMindmap()
  },
  canExecute: () => authStore.isAuthenticated
})

registerCommand({
  id: 'ai.expand-node',
  label: 'AI: Expand Node',
  icon: 'auto_awesome',
  keybinding: 'Ctrl+Shift+E',
  execute: async () => {
    await aiStore.expandNode(canvasStore.selectedNodeIds[0])
  },
  canExecute: () => {
    return subscriptionStore.isEnterprise &&
           canvasStore.selectedNodeIds.length === 1
  }
})
```

## Backend Integration

### Supabase

**Purpose:** User authentication, profiles, subscription management

**Schema:**
```sql
-- User profiles
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT,
  google_id TEXT,
  display_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free', -- 'free', 'pro', 'enterprise'
  subscription_status TEXT DEFAULT 'active', -- 'active', 'cancelled', 'expired'
  subscription_expires_at TIMESTAMP,
  stripe_customer_id TEXT,
  google_drive_folder_id TEXT, -- App folder in user's Google Drive
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Mindmap metadata (lightweight, for quick listing)
CREATE TABLE mindmap_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  google_drive_file_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  tags TEXT[],
  node_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  modified_at TIMESTAMP DEFAULT NOW(),
  last_opened_at TIMESTAMP,
  is_deleted BOOLEAN DEFAULT false
);

-- AI usage tracking (for rate limiting)
CREATE TABLE ai_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL, -- 'create', 'expand', 'analyze', etc.
  tokens_used INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Feature flags (for A/B testing)
CREATE TABLE feature_flags (
  user_id UUID REFERENCES profiles(id),
  feature_name TEXT,
  enabled BOOLEAN DEFAULT false,
  PRIMARY KEY (user_id, feature_name)
);
```

### Google Drive API

**Purpose:** Store mindmap JSON files in user's Google Drive

**Why Google Drive?**
- ✅ User owns their data (not stored on our servers)
- ✅ No storage costs for us
- ✅ Built-in backup and sync
- ✅ Familiar to users
- ✅ Powerful search capabilities
- ✅ Easy sharing (future feature)

**Operations:**
- Create app folder in user's Drive (on first login)
- Save mindmap as JSON file
- Load mindmap from file ID
- List all mindmaps in app folder
- Search mindmaps (full-text search)
- Delete mindmap file
- Update file metadata (name, description)
- Generate thumbnail (PNG preview)

**File Structure:**
```
Google Drive
└── MindScribble/                    # App folder (created on first login)
    ├── My Project Plan.json         # Mindmap file
    ├── Meeting Notes.json
    └── Brainstorming Session.json
```

**Search Capabilities:**

Google Drive API provides powerful search that works with JSON files:

```typescript
// 1. Search by filename (FREE tier)
const query = "name contains 'project'"

// 2. Full-text search inside JSON (PRO tier)
const query = "fullText contains 'budget planning'"

// 3. Search by tags (stored in file description)
const query = "description contains '#work'"

// 4. Search by date
const query = "modifiedTime > '2024-01-01'"

// 5. Combined search (most powerful)
const query = `
  '${APP_FOLDER_ID}' in parents and
  fullText contains 'meeting' and
  modifiedTime > '2024-01-01' and
  trashed = false
`

// 6. Search operators
const query = "fullText contains 'project' and fullText contains 'budget'"
```

**Implementation:**

```typescript
// composables/useGoogleDrive.ts
export function useGoogleDrive() {
  const authStore = useAuthStore()
  const googleDriveStore = useGoogleDriveStore()

  // Initialize Google API client
  async function initGoogleAPI() {
    await gapi.load('client:auth2', async () => {
      await gapi.client.init({
        apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
        clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        scope: 'https://www.googleapis.com/auth/drive.file'
      })
    })
  }

  // Create app folder
  async function createAppFolder(): Promise<string> {
    const response = await gapi.client.drive.files.create({
      resource: {
        name: 'MindScribble',
        mimeType: 'application/vnd.google-apps.folder'
      },
      fields: 'id'
    })
    return response.result.id
  }

  // Save mindmap
  async function saveMindmap(mindmap: MindmapDocument): Promise<string> {
    const metadata = {
      name: `${mindmap.metadata.name}.json`,
      mimeType: 'application/json',
      parents: [googleDriveStore.appFolderId]
    }

    const boundary = '-------314159265358979323846'
    const delimiter = "\r\n--" + boundary + "\r\n"
    const close_delim = "\r\n--" + boundary + "--"

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(mindmap) +
      close_delim

    const response = await gapi.client.request({
      path: '/upload/drive/v3/files',
      method: 'POST',
      params: { uploadType: 'multipart' },
      headers: {
        'Content-Type': 'multipart/related; boundary="' + boundary + '"'
      },
      body: multipartRequestBody
    })

    return response.result.id
  }

  // Load mindmap
  async function loadMindmap(fileId: string): Promise<MindmapDocument> {
    const response = await gapi.client.drive.files.get({
      fileId: fileId,
      alt: 'media'
    })
    return response.result as MindmapDocument
  }

  // List mindmaps
  async function listMindmaps(): Promise<Array<{ id: string, name: string, modifiedTime: string }>> {
    const response = await gapi.client.drive.files.list({
      q: `'${googleDriveStore.appFolderId}' in parents and trashed = false`,
      fields: 'files(id, name, modifiedTime, description)',
      orderBy: 'modifiedTime desc'
    })
    return response.result.files
  }

  // Search mindmaps (full-text)
  async function searchMindmaps(query: string): Promise<Array<{ id: string, name: string }>> {
    const searchQuery = `
      '${googleDriveStore.appFolderId}' in parents and
      fullText contains '${query}' and
      trashed = false
    `

    const response = await gapi.client.drive.files.list({
      q: searchQuery,
      fields: 'files(id, name, modifiedTime)',
      orderBy: 'modifiedTime desc'
    })
    return response.result.files
  }

  return {
    initGoogleAPI,
    createAppFolder,
    saveMindmap,
    loadMindmap,
    listMindmaps,
    searchMindmaps
  }
}
```

**Thumbnail Generation (Future Feature):**

```typescript
// Generate PNG thumbnail for visual preview
async function generateThumbnail(mindmap: MindmapDocument): Promise<Blob> {
  // Use html2canvas or similar to capture canvas
  const canvas = document.querySelector('.vue-flow')
  const blob = await html2canvas(canvas).then(canvas => {
    return new Promise(resolve => canvas.toBlob(resolve))
  })
  return blob
}

// Upload thumbnail as separate file
async function uploadThumbnail(mindmapFileId: string, thumbnail: Blob) {
  // Upload as PNG with reference to mindmap file
  // Store in file description or properties
}
```

### n8n AI Agent

**Purpose:** AI-powered mindmap operations

**Workflow:**
1. User sends prompt via AI chat
2. Frontend calls n8n webhook with: `{ prompt, mindmap, selectedNodeId }`
3. n8n agent:
   - Parses user intent
   - Loads current mindmap context
   - Calls LLM (OpenAI/Claude) with system prompt
   - LLM returns structured operations
   - n8n formats response
4. Frontend receives: `{ success, operations[], explanation }`
5. Frontend applies operations to mindmap
6. Auto-save to Google Drive

**Operation Types:**
```typescript
type AIOperation =
  | { type: 'create', title: string, content: string, parentId: string | null, position: { x: number, y: number } }
  | { type: 'update', nodeId: string, title?: string, content?: string }
  | { type: 'delete', nodeId: string }
  | { type: 'move', nodeId: string, newParentId: string | null, position: { x: number, y: number } }
  | { type: 'createEdge', source: string, target: string, edgeType: 'hierarchy' | 'reference' }
  | { type: 'deleteEdge', edgeId: string };
```

## Data Synchronization & Offline Support

### Auto-Save Strategy

```typescript
// Auto-save after 2 seconds of inactivity
const debouncedSave = useDebounceFn(async () => {
  if (!documentStore.isDirty) return

  try {
    await googleDriveStore.saveMindmap(documentStore.currentMindmap)
    documentStore.isDirty = false

    // Update Supabase metadata
    await supabase
      .from('mindmap_metadata')
      .update({
        modified_at: new Date().toISOString(),
        node_count: documentStore.nodes.length
      })
      .eq('google_drive_file_id', documentStore.currentMindmapId)

    $q.notify({ type: 'positive', message: 'Saved', timeout: 1000 })
  } catch (error) {
    // Save to IndexedDB if offline
    await indexedDB.set(documentStore.currentMindmapId, documentStore.currentMindmap)
    $q.notify({ type: 'warning', message: 'Saved locally (offline)', timeout: 2000 })
  }
}, 2000)

// Watch for changes
watch(() => documentStore.nodes, () => {
  documentStore.isDirty = true
  debouncedSave()
}, { deep: true })
```

### Offline Support

```typescript
// composables/useOfflineSync.ts
export function useOfflineSync() {
  const isOnline = ref(navigator.onLine)
  const pendingSyncs = ref<string[]>([])

  // Listen for online/offline events
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  async function handleOnline() {
    isOnline.value = true

    // Sync pending changes
    for (const fileId of pendingSyncs.value) {
      const mindmap = await indexedDB.get(fileId)
      if (mindmap) {
        try {
          await googleDriveStore.saveMindmap(mindmap)
          await indexedDB.delete(fileId)
          pendingSyncs.value = pendingSyncs.value.filter(id => id !== fileId)
        } catch (error) {
          console.error('Sync failed:', error)
        }
      }
    }

    if (pendingSyncs.value.length === 0) {
      $q.notify({ type: 'positive', message: 'All changes synced', timeout: 2000 })
    }
  }

  function handleOffline() {
    isOnline.value = false
    $q.notify({ type: 'warning', message: 'You are offline', timeout: 3000 })
  }

  return { isOnline, pendingSyncs }
}
```

### Conflict Resolution

```typescript
// If local version is newer than remote, ask user
async function resolveConflict(localMindmap: MindmapDocument, remoteMindmap: MindmapDocument) {
  const localModified = new Date(localMindmap.metadata.modified)
  const remoteModified = new Date(remoteMindmap.metadata.modified)

  if (localModified > remoteModified) {
    // Local is newer
    const choice = await $q.dialog({
      title: 'Conflict Detected',
      message: 'Your local version is newer than the remote version. Which version do you want to keep?',
      options: {
        type: 'radio',
        model: 'local',
        items: [
          { label: 'Keep local version', value: 'local' },
          { label: 'Use remote version', value: 'remote' },
          { label: 'View both and decide', value: 'compare' }
        ]
      },
      cancel: true
    })

    if (choice === 'local') {
      await googleDriveStore.saveMindmap(localMindmap)
    } else if (choice === 'remote') {
      documentStore.loadMindmap(remoteMindmap)
    } else {
      // Show comparison view
      router.push({ name: 'conflict-resolution', params: { fileId: localMindmap.metadata.id } })
    }
  }
}
```

## Memory Management

### Critical Strategies

1. **Shallow Refs for Heavy Objects**
   ```typescript
   const d3Simulation = shallowRef<d3.Simulation | null>(null)
   const matterEngine = shallowRef<Matter.Engine | null>(null)
   ```

2. **Cleanup Composables**
   ```typescript
   const { registerCleanup } = useCleanup()
   registerCleanup(() => editor.destroy())
   registerCleanup(() => simulation.stop())
   ```

3. **Lazy Loading**
   ```typescript
   // Only create Tiptap editor when needed
   eventBus.on('node:edit-start', ({ nodeId }) => {
     if (!editors.has(nodeId)) {
       editors.set(nodeId, createEditor(nodeId))
     }
   })
   ```

4. **Debouncing**
   ```typescript
   const debouncedSave = useDebounceFn(() => {
     googleDriveStore.saveMindmap()
   }, 2000) // Auto-save after 2 seconds of inactivity

   const debouncedTreeRebuild = useDebounceFn(() => {
     rebuildTree()
   }, 300)
   ```

5. **Limited Watcher Depth**
   ```typescript
   // Watch specific properties, not deep objects
   watch(() => nodes.value.length, () => { ... })
   watch(() => documentStore.currentMindmapId, () => { ... })
   ```

6. **IndexedDB Caching**
   ```typescript
   // Cache recent mindmaps for offline access
   const cache = useIndexedDB('mindmaps')
   await cache.set(fileId, mindmapData)
   ```

## Subscription & Feature Gating

### Subscription Tiers

#### FREE Tier
- ✅ **Unlimited mindmaps** (stored in user's Google Drive)
- ✅ Basic mindmap editing
- ✅ Google Drive storage
- ✅ Basic search (filename only)
- ✅ Export to JSON
- ❌ No advanced features

#### PRO Tier ($7/month or $60/year)
- ✅ Everything in FREE
- ✅ **Full-text search** across all mindmaps
- ✅ **Export to PDF/PNG/SVG**
- ✅ Advanced keyboard shortcuts
- ✅ Custom themes
- ✅ Collaboration (share links)
- ✅ Version history
- ✅ Priority support

#### ENTERPRISE Tier ($25-40/month)
- ✅ Everything in PRO
- ✅ **AI-powered mindmap generation** 🤖
- ✅ **AI expansion & detailing**
- ✅ **AI analysis & insights**
- ✅ **AI reorganization**
- ✅ **AI suggestions**
- ✅ **Unlimited AI requests** (or 1000/month)
- ✅ Team workspaces
- ✅ Advanced analytics
- ✅ White-label option

### Feature Gate Implementation

```typescript
// composables/useFeatureGuard.ts
export function useFeatureGuard() {
  const subscriptionStore = useSubscriptionStore()
  const $q = useQuasar()

  function requireFeature(
    featureName: string,
    requiredTier: 'pro' | 'enterprise'
  ): boolean {
    const hasAccess = requiredTier === 'pro'
      ? subscriptionStore.isPro
      : subscriptionStore.isEnterprise

    if (!hasAccess) {
      $q.notify({
        type: 'warning',
        message: `This feature requires ${requiredTier.toUpperCase()} subscription`,
        actions: [
          { label: 'Upgrade', color: 'white', handler: () => {
            router.push('/pricing')
          }}
        ]
      })
      return false
    }

    return true
  }

  return { requireFeature }
}

// Usage in components
function exportToPDF() {
  if (!requireFeature('Export to PDF', 'pro')) return
  // Proceed with export
}

function expandWithAI() {
  if (!requireFeature('AI Expansion', 'enterprise')) return
  // Proceed with AI operation
}
```

### Payment Integration (Stripe)

```typescript
// Create checkout session
async function createCheckoutSession(tier: 'pro' | 'enterprise') {
  const { data } = await supabase.functions.invoke('create-checkout-session', {
    body: { tier, userId: authStore.user.id }
  })

  // Redirect to Stripe Checkout
  window.location.href = data.url
}

// Stripe webhook updates Supabase profile
// (Handled by Supabase Edge Function)
```

## Layout Algorithm

### Nested Rectangle Layout (from vueflow-design)

See `vueflow-design/DOC/NESTED_LAYOUT.md` for detailed documentation.

**Key Points:**
- Each node has an invisible bounding rectangle
- Children are contained within parent's rectangle
- Sibling rectangles cannot overlap
- Uses AABB collision detection (fast and simple)
- No physics simulation needed
- LOD (Level of Detail) system for 1000+ nodes
- 400x performance improvement with lazy calculation

**Integration:**
- Copy layout engine from `vueflow-design/src/layout.ts`
- Copy LOD system from `vueflow-design/src/App.vue`
- Copy components: `CustomNode.vue`, `LodBadgeNode.vue`
- Create composable: `useMindmapLayout.ts`

## Performance Optimizations

1. **LOD System** - Progressive node disclosure based on zoom (from vueflow-design)
2. **Lazy Calculation** - Only calculate positions for visible nodes
3. **Virtual Scrolling** - For large node lists in Writer panel
4. **Memoization** - For expensive computations (tree building, etc.)
5. **Debouncing** - For auto-save, search, tree rebuild
6. **Throttling** - For drag operations, zoom changes
7. **Lazy Loading** - For Tiptap editors (create on-demand)
8. **Shallow Refs** - For heavy objects (D3, Matter.js, Tiptap)
9. **Cleanup** - On component unmount (editors, simulations, listeners)
10. **IndexedDB Caching** - Cache recent mindmaps for offline access
11. **Web Workers** - For heavy computations (layout, search)
12. **Performance Monitoring** - In dev mode (Vue DevTools, memory profiling)

## Component Responsibilities

### MindmapPage.vue (Orchestrator)
- Layout structure
- Event bus registration
- Command context updates
- Keyboard delegation
- **NO business logic**

### MindmapCanvas.vue
- VueFlow setup
- Node/edge rendering
- Viewport management
- Delegates to composables

### WriterPanel.vue
- Writer UI structure
- Delegates to WriterEditor

### TreePanel.vue
- Tree rendering
- Selection handling

## AI Integration

### AI Use Cases

1. **Creation & Generation**
   - Create mindmap from scratch
   - Create from document/transcript/URL
   - Create from template (SWOT, project kickoff, etc.)

2. **Expansion & Detailing**
   - Expand specific node with details
   - Expand with context (e.g., "typical wedding costs")
   - Expand entire mindmap to N levels deep

3. **Analysis & Insights**
   - Analyze structure and suggest improvements
   - Find gaps in mindmap
   - Compare with other mindmaps

4. **Reorganization & Optimization**
   - Restructure by priority/timeline/category
   - Simplify complex mindmaps
   - Balance branch depths

5. **Content Enhancement**
   - Improve writing quality
   - Add descriptions to nodes
   - Translate mindmap

6. **Smart Suggestions**
   - Proactive suggestions while editing
   - Auto-complete node titles
   - Related topics from other mindmaps

7. **Task Management**
   - Extract action items
   - Add realistic deadlines
   - Export to task manager

8. **Collaboration**
   - Summarize for sharing
   - Generate presentation outline
   - Create executive summary

### AI Agent Architecture

```
User Input (Chat/Command)
    ↓
MindScribble Frontend
    ↓
n8n Webhook
    ↓
n8n Agent Workflow
    ├─ Parse user intent
    ├─ Load current mindmap
    ├─ Call LLM (OpenAI/Claude)
    ├─ Generate operations
    └─ Return structured response
    ↓
MindScribble Frontend
    ↓
Apply operations to mindmap
    ↓
Auto-save to Google Drive
```

### AI Context Tracking

```typescript
interface AIContext {
  lastPrompt: string
  lastAction: string
  lastModifiedNodes: string[]
  conversationHistory: Array<{ role: 'user' | 'ai', content: string }>
  operationHistory: Array<{ operations: AIOperation[], timestamp: string }>
}
```

## Migration from vueflow Prototype

### What to Keep
- ✅ Event bus architecture (mitt)
- ✅ Command system
- ✅ Keyboard navigation logic
- ✅ Writer panel functionality
- ✅ Tree view logic
- ✅ Tiptap integration
- ✅ Orientation system (clockwise/counterclockwise)
- ✅ Composables (13 existing composables)
- ✅ Menu system
- ✅ Settings dialog

### What to Change
- ❌ Monolithic VueFlowTest.vue (4345 lines) → Split into feature modules
- ❌ Reactive refs in components → Pinia stores
- ❌ Physics engines (Matter.js, Planck.js) → AABB layout from vueflow-design
- ❌ Deep watchers → Specific property watchers
- ❌ No cleanup → Proper cleanup composables
- ❌ No debouncing → Debounce expensive operations
- ❌ localStorage → Google Drive API

### What to Add
- ➕ Supabase authentication
- ➕ Google Drive integration
- ➕ Subscription management
- ➕ Feature gating
- ➕ AI agent integration
- ➕ Light/dark mode
- ➕ Internationalization (i18n)
- ➕ Performance monitoring
- ➕ Memory leak detection
- ➕ Virtual scrolling
- ➕ Lazy loading
- ➕ IndexedDB caching
- ➕ Offline support
- ➕ Auto-save
- ➕ Search (Google Drive full-text search)

## Development Workflow

1. **Feature Development**
   - Create feature folder
   - Add components, composables, stores
   - Register commands
   - Add event bus events
   - Test in isolation

2. **Integration**
   - Connect via event bus
   - Update command context
   - Test cross-feature communication

3. **Performance Testing**
   - Profile with Vue DevTools
   - Monitor memory usage
   - Test with large datasets
   - Optimize bottlenecks

## Testing Strategy

1. **Unit Tests** - Composables and utilities
2. **Component Tests** - Individual components
3. **Integration Tests** - Feature interactions
4. **Performance Tests** - Large datasets
5. **Memory Tests** - Leak detection

## Implementation Phases

### Phase 1: Core App (No Backend) - 2 weeks
**Goal:** Build functional mindmap editor with local storage

- [ ] Initialize Quasar project
- [ ] Setup Pinia stores (documentStore, canvasStore, appStore)
- [ ] Integrate VueFlow
- [ ] Integrate layout engine from vueflow-design
- [ ] Migrate canvas features from vueflow
- [ ] Migrate writer panel from vueflow
- [ ] Migrate tree view from vueflow
- [ ] Migrate keyboard navigation from vueflow
- [ ] Migrate Tiptap integration from vueflow
- [ ] Setup event bus and command system
- [ ] Add light/dark mode
- [ ] Add i18n support
- [ ] Test with 100, 500, 1000 nodes

### Phase 2: Backend Integration - 1 week
**Goal:** Connect to Supabase and Google Drive

- [ ] Setup Supabase project
- [ ] Implement authentication (Google OAuth)
- [ ] Create database schema
- [ ] Setup Google Drive API
- [ ] Implement Google Drive composable
- [ ] Migrate from localStorage to Google Drive
- [ ] Add auto-save functionality
- [ ] Add search functionality (Google Drive API)
- [ ] Test sync and offline support

### Phase 3: Subscription System - 1 week
**Goal:** Implement freemium model with feature gating

- [ ] Create subscription store
- [ ] Implement feature guard composable
- [ ] Add pricing page
- [ ] Integrate Stripe
- [ ] Setup Stripe webhooks (Supabase Edge Function)
- [ ] Implement feature gates in UI
- [ ] Add upgrade prompts
- [ ] Test subscription flows

### Phase 4: AI Integration - 2 weeks
**Goal:** Add AI-powered features

- [ ] Setup n8n instance
- [ ] Create n8n agent workflow
- [ ] Implement AI store
- [ ] Create AI chat component
- [ ] Implement AI operations (create, expand, analyze)
- [ ] Add AI suggestions panel
- [ ] Add undo AI actions
- [ ] Test AI features with various prompts
- [ ] Add rate limiting for AI usage

### Phase 5: Polish & Launch - 1 week
**Goal:** Final testing and deployment

- [ ] Performance optimization
- [ ] Memory leak detection and fixes
- [ ] Cross-browser testing
- [ ] Mobile responsiveness
- [ ] Documentation (user guide)
- [ ] Deploy to production
- [ ] Setup monitoring (Sentry, analytics)
- [ ] Launch! 🚀

**Total Estimate:** 7-8 weeks

## Security & Privacy

### Data Privacy

**Core Principle:** User owns their data

- ✅ Mindmap files stored in **user's Google Drive** (not our servers)
- ✅ We only store user metadata in Supabase (email, subscription tier)
- ✅ No access to user's mindmap content on our backend
- ✅ User can delete their account and keep all mindmaps
- ✅ User can revoke app access anytime via Google Account settings

### Google Drive Permissions

**Scope:** `https://www.googleapis.com/auth/drive.file`

This scope only allows access to:
- Files created by our app
- Files explicitly opened by the user

We **cannot** access:
- Other files in user's Google Drive
- User's personal documents
- Shared files from other users

### Authentication Flow

```typescript
// 1. User clicks "Sign in with Google"
async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: 'https://www.googleapis.com/auth/drive.file',
      redirectTo: `${window.location.origin}/auth/callback`
    }
  })
}

// 2. Supabase handles OAuth flow
// 3. User grants permissions
// 4. Redirect to callback URL
// 5. Store tokens in Supabase

// 6. Initialize Google API with tokens
async function initGoogleAPI() {
  const session = await supabase.auth.getSession()
  const googleToken = session.data.session.provider_token

  gapi.client.setToken({
    access_token: googleToken
  })
}
```

### API Security

```typescript
// Supabase Row Level Security (RLS)
-- Users can only access their own data
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can only access their own mindmap metadata
CREATE POLICY "Users can view own mindmaps"
  ON mindmap_metadata FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mindmaps"
  ON mindmap_metadata FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Rate Limiting

```typescript
// AI usage rate limiting (prevent abuse)
async function checkAIRateLimit(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('ai_usage')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  const subscriptionTier = authStore.user.subscription_tier
  const limits = {
    free: 0, // No AI access
    pro: 0, // No AI access
    enterprise: 1000 // 1000 requests per day
  }

  return data.length < limits[subscriptionTier]
}
```

### Environment Variables

```bash
# .env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_GOOGLE_API_KEY=your-google-api-key
VITE_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/ai-agent
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

**Important:** Never commit `.env` to version control!

## Next Immediate Steps

1. ✅ Create vueflow-design test project
2. ✅ Validate nested layout algorithm with LOD system
3. ✅ Document architecture with backend integration
4. [ ] Create DATA_FORMAT.md with detailed JSON schema
5. [ ] Create AI_INTEGRATION.md with n8n workflow details
6. [ ] Initialize MindScribble Quasar project
7. [ ] Setup project structure (folders, stores, composables)
8. [ ] Setup Supabase project and database schema
9. [ ] Setup Google Cloud project and OAuth credentials
10. [ ] Begin Phase 1 implementation

---

## Summary

MindScribble is a feature-rich mindmap application that combines:
- **VueFlow** for canvas rendering
- **AABB nested layout** from vueflow-design (with LOD system)
- **Supabase** for authentication and user profiles
- **Google Drive** for mindmap storage (user owns data)
- **n8n AI agent** for AI-powered features
- **Stripe** for subscription management
- **Feature-based modular architecture** for maintainability

The app follows a **freemium model** with three tiers:
- **FREE:** Unlimited mindmaps, basic editing
- **PRO:** Full-text search, export, collaboration
- **ENTERPRISE:** AI-powered features

All mindmap data is stored in the **user's Google Drive**, ensuring data ownership and privacy. The app is designed to be **AI-first** with structured JSON format optimized for LLM manipulation.

