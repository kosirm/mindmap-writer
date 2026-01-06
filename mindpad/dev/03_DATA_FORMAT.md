# MindPad Data Format Specification

## Overview

The MindPad data format is designed to be:
- **VueFlow-compatible** - Direct mapping to VueFlow nodes/edges for rendering
- **AI-friendly** - Easy for LLMs to understand and manipulate
- **Search-optimized** - Flattened text for Google Drive full-text search
- **Version-controlled** - Schema version for future migrations

## Complete JSON Schema

```typescript
interface MindmapDocument {
  // Schema version for future migrations
  version: string; // "1.0"
  
  // Metadata
  metadata: DocumentMetadata;
  
  // VueFlow nodes
  nodes: MindmapNode[];
  
  // VueFlow edges
  edges: MindmapEdge[];
  
  // Layout settings
  layout: LayoutSettings;
}

interface DocumentMetadata {
  // Identifiers
  id: string; // Google Drive file ID
  name: string; // User-visible name (e.g., "Project Planning")
  description?: string; // Optional description
  
  // Timestamps
  created: string; // ISO 8601 timestamp
  modified: string; // ISO 8601 timestamp
  
  // Organization
  tags: string[]; // User tags for organization (e.g., ["work", "planning"])
  
  // AI context (helps AI understand the mindmap)
  aiContext?: {
    topic?: string; // Main topic (e.g., "Wedding Planning")
    purpose?: string; // Purpose (e.g., "brainstorming", "planning", "analysis")
    audience?: string; // Target audience (e.g., "team", "personal", "client")
    lastAIAction?: string; // Last AI operation performed
    conversationHistory?: Array<{
      role: 'user' | 'ai';
      content: string;
      timestamp: string;
    }>;
  };
  
  // Search optimization (flattened text for Google Drive search)
  searchableText: string; // All node titles + content concatenated
  
  // Statistics
  nodeCount: number;
  edgeCount: number;
  maxDepth: number; // Maximum depth of hierarchy
}

interface MindmapNode {
  // VueFlow required fields
  id: string; // Unique node ID (e.g., "1", "2", "3")
  type: 'custom' | 'lod-badge'; // Node type
  position: { x: number; y: number }; // Canvas position
  
  // Custom data
  data: NodeData;
}

interface NodeData {
  // Hierarchy
  parentId: string | null; // Parent node ID (null for root nodes)
  order: number; // Order among siblings (0, 1, 2, ...)
  
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
  
  // Visual (optional)
  color?: string; // Node background color
  icon?: string; // Icon name (Material Icons)
}

interface MindmapEdge {
  // VueFlow required fields
  id: string; // Unique edge ID (e.g., "1-2")
  source: string; // Source node ID
  target: string; // Target node ID
  sourceHandle: string; // 'center' or handle ID
  targetHandle: string; // 'center' or handle ID
  type: 'straight'; // Edge type
  class: 'edge-hierarchy' | 'edge-reference'; // CSS class
  
  // Custom data
  data: EdgeData;
}

interface EdgeData {
  edgeType: 'hierarchy' | 'reference'; // Hierarchy or reference connection
  label?: string; // Optional edge label
}

interface LayoutSettings {
  orientationMode: 'clockwise' | 'counterclockwise';
  lodEnabled: boolean;
  lodThresholds: number[]; // [10, 30, 50, 70, 90]
  horizontalSpacing: number; // Default: 50
  verticalSpacing: number; // Default: 20
}
```

## Example Mindmap Document

```json
{
  "version": "1.0",
  "metadata": {
    "id": "1a2b3c4d5e6f",
    "name": "Wedding Planning",
    "description": "Complete wedding planning mindmap",
    "created": "2024-01-15T10:00:00Z",
    "modified": "2024-01-20T15:30:00Z",
    "tags": ["personal", "planning", "wedding"],
    "aiContext": {
      "topic": "Wedding Planning",
      "purpose": "planning",
      "audience": "personal"
    },
    "searchableText": "Wedding Planning Venue Church Garden Hotel Budget Venue $5000 Catering $8000 Decorations $2000",
    "nodeCount": 7,
    "edgeCount": 6,
    "maxDepth": 2
  },
  "nodes": [
    {
      "id": "1",
      "type": "custom",
      "position": { "x": 400, "y": 300 },
      "data": {
        "parentId": null,
        "order": 0,
        "title": "Wedding Planning",
        "content": "<p>Main planning hub for our wedding</p>",
        "created": "2024-01-15T10:00:00Z",
        "modified": "2024-01-15T10:00:00Z"
      }
    },
    {
      "id": "2",
      "type": "custom",
      "position": { "x": 200, "y": 200 },
      "data": {
        "parentId": "1",
        "order": 0,
        "title": "Venue",
        "content": "<p>Options for wedding venue</p>",
        "created": "2024-01-15T10:05:00Z"
      }
    }
  ],
  "edges": [
    {
      "id": "1-2",
      "source": "1",
      "target": "2",
      "sourceHandle": "center",
      "targetHandle": "center",
      "type": "straight",
      "class": "edge-hierarchy",
      "data": {
        "edgeType": "hierarchy"
      }
    }
  ],
  "layout": {
    "orientationMode": "clockwise",
    "lodEnabled": true,
    "lodThresholds": [10, 30, 50, 70, 90],
    "horizontalSpacing": 50,
    "verticalSpacing": 20
  }
}
```

## Data Conversion

### VueFlow to Storage Format

When saving to Google Drive, the data is already in the correct format since we use VueFlow's native structure.

```typescript
// documentStore.ts
async function saveMindmap() {
  const mindmap: MindmapDocument = {
    version: '1.0',
    metadata: {
      id: currentMindmapId.value,
      name: currentMindmapName.value,
      description: currentMindmapDescription.value,
      created: currentMindmapCreated.value,
      modified: new Date().toISOString(),
      tags: currentMindmapTags.value,
      aiContext: aiStore.context,
      searchableText: generateSearchableText(nodes.value),
      nodeCount: nodes.value.length,
      edgeCount: edges.value.length,
      maxDepth: calculateMaxDepth(nodes.value)
    },
    nodes: nodes.value,
    edges: edges.value,
    layout: {
      orientationMode: orientationStore.mode,
      lodEnabled: canvasStore.lodEnabled,
      lodThresholds: canvasStore.lodThresholds,
      horizontalSpacing: canvasStore.horizontalSpacing,
      verticalSpacing: canvasStore.verticalSpacing
    }
  }

  await googleDriveStore.saveMindmap(mindmap)
}

// Generate searchable text for Google Drive search
function generateSearchableText(nodes: MindmapNode[]): string {
  return nodes
    .map(node => {
      const title = node.data.title || ''
      const content = stripHtml(node.data.content || '')
      return `${title} ${content}`
    })
    .join(' ')
    .trim()
}

// Strip HTML tags for search
function stripHtml(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}

// Calculate max depth
function calculateMaxDepth(nodes: MindmapNode[]): number {
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  let maxDepth = 0

  for (const node of nodes) {
    let depth = 0
    let current = node
    while (current.data.parentId) {
      depth++
      current = nodeMap.get(current.data.parentId)!
      if (!current) break
    }
    maxDepth = Math.max(maxDepth, depth)
  }

  return maxDepth
}
```

### Storage Format to VueFlow

When loading from Google Drive, we directly use the stored nodes/edges.

```typescript
// documentStore.ts
async function loadMindmap(fileId: string) {
  const mindmap = await googleDriveStore.loadMindmap(fileId)

  // Validate version
  if (mindmap.version !== '1.0') {
    throw new Error(`Unsupported mindmap version: ${mindmap.version}`)
  }

  // Load data
  nodes.value = mindmap.nodes
  edges.value = mindmap.edges
  currentMindmapId.value = mindmap.metadata.id
  currentMindmapName.value = mindmap.metadata.name
  currentMindmapDescription.value = mindmap.metadata.description
  currentMindmapCreated.value = mindmap.metadata.created
  currentMindmapTags.value = mindmap.metadata.tags

  // Load layout settings
  orientationStore.mode = mindmap.layout.orientationMode
  canvasStore.lodEnabled = mindmap.layout.lodEnabled
  canvasStore.lodThresholds = mindmap.layout.lodThresholds
  canvasStore.horizontalSpacing = mindmap.layout.horizontalSpacing
  canvasStore.verticalSpacing = mindmap.layout.verticalSpacing

  // Load AI context
  if (mindmap.metadata.aiContext) {
    aiStore.context = mindmap.metadata.aiContext
  }

  // Emit event
  eventBus.emit('document:loaded', { fileId })
}
```

## AI Agent Format

### Request Format (Frontend → n8n)

```typescript
interface AIRequest {
  prompt: string; // User's natural language prompt
  mindmap: MindmapDocument; // Current mindmap state
  selectedNodeId?: string; // Currently selected node (if any)
  context?: {
    recentActions?: string[]; // Recent user actions
    conversationHistory?: Array<{ role: 'user' | 'ai', content: string }>;
  };
}
```

### Response Format (n8n → Frontend)

```typescript
interface AIResponse {
  success: boolean;
  operations: AIOperation[]; // Operations to apply
  explanation: string; // Human-readable explanation
  suggestions?: string[]; // Additional suggestions
  error?: string; // Error message if failed
}

type AIOperation =
  | CreateNodeOperation
  | UpdateNodeOperation
  | DeleteNodeOperation
  | MoveNodeOperation
  | CreateEdgeOperation
  | DeleteEdgeOperation;

interface CreateNodeOperation {
  type: 'create';
  title: string;
  content: string;
  parentId: string | null;
  position: { x: number; y: number };
  aiGenerated: true;
  aiPrompt: string;
}

interface UpdateNodeOperation {
  type: 'update';
  nodeId: string;
  title?: string;
  content?: string;
}

interface DeleteNodeOperation {
  type: 'delete';
  nodeId: string;
}

interface MoveNodeOperation {
  type: 'move';
  nodeId: string;
  newParentId: string | null;
  position: { x: number; y: number };
}

interface CreateEdgeOperation {
  type: 'createEdge';
  source: string;
  target: string;
  edgeType: 'hierarchy' | 'reference';
}

interface DeleteEdgeOperation {
  type: 'deleteEdge';
  edgeId: string;
}
```

### Example AI Request/Response

**Request:**
```json
{
  "prompt": "Expand the 'Venue' node with typical wedding venue options",
  "mindmap": { /* full mindmap document */ },
  "selectedNodeId": "2"
}
```

**Response:**
```json
{
  "success": true,
  "operations": [
    {
      "type": "create",
      "title": "Church",
      "content": "<p>Traditional church ceremony</p>",
      "parentId": "2",
      "position": { "x": 100, "y": 150 },
      "aiGenerated": true,
      "aiPrompt": "Expand the 'Venue' node with typical wedding venue options"
    },
    {
      "type": "create",
      "title": "Garden",
      "content": "<p>Outdoor garden wedding</p>",
      "parentId": "2",
      "position": { "x": 100, "y": 200 },
      "aiGenerated": true,
      "aiPrompt": "Expand the 'Venue' node with typical wedding venue options"
    },
    {
      "type": "create",
      "title": "Hotel Ballroom",
      "content": "<p>Indoor hotel venue</p>",
      "parentId": "2",
      "position": { "x": 100, "y": 250 },
      "aiGenerated": true,
      "aiPrompt": "Expand the 'Venue' node with typical wedding venue options"
    }
  ],
  "explanation": "I've added three common wedding venue options: Church (traditional), Garden (outdoor), and Hotel Ballroom (indoor).",
  "suggestions": [
    "Would you like me to add cost estimates for each venue?",
    "Should I add pros and cons for each option?"
  ]
}
```

## Version Migration

When the schema version changes, we need migration functions:

```typescript
// migrations.ts
function migrateDocument(doc: any): MindmapDocument {
  const version = doc.version || '0.9' // Assume old version if missing

  switch (version) {
    case '0.9':
      return migrateFrom_0_9_to_1_0(doc)
    case '1.0':
      return doc // Current version
    default:
      throw new Error(`Unknown version: ${version}`)
  }
}

function migrateFrom_0_9_to_1_0(doc: any): MindmapDocument {
  // Example migration: add new fields
  return {
    version: '1.0',
    metadata: {
      ...doc.metadata,
      aiContext: undefined, // New field
      searchableText: generateSearchableText(doc.nodes), // New field
      nodeCount: doc.nodes.length, // New field
      edgeCount: doc.edges.length, // New field
      maxDepth: calculateMaxDepth(doc.nodes) // New field
    },
    nodes: doc.nodes.map((node: any) => ({
      ...node,
      data: {
        ...node.data,
        aiGenerated: false, // New field
        aiPrompt: undefined, // New field
        aiSuggestions: undefined // New field
      }
    })),
    edges: doc.edges,
    layout: doc.layout || {
      orientationMode: 'clockwise',
      lodEnabled: true,
      lodThresholds: [10, 30, 50, 70, 90],
      horizontalSpacing: 50,
      verticalSpacing: 20
    }
  }
}
```

## Summary

The MindPad data format is:
- ✅ **VueFlow-native** - No conversion needed for rendering
- ✅ **AI-friendly** - Clear structure for LLM manipulation
- ✅ **Search-optimized** - Flattened searchableText field
- ✅ **Versioned** - Migration support for future changes
- ✅ **Extensible** - Easy to add new fields without breaking existing data


