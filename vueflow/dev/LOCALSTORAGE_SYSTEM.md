# LocalStorage Multi-File System

**Status:** ✅ FULLY WORKING  
**Last Updated:** 2025-11-19  
**Feature:** Save/Load multiple named mindmaps to browser's localStorage

---

## Overview

The LocalStorage system allows users to save multiple named mindmaps in their browser's local storage. Each mindmap is stored separately with its own ID, and a master list tracks all saved mindmaps.

**Key Features:**
- ✅ **Multiple Mindmaps:** Save unlimited mindmaps with unique names
- ✅ **Create New:** Start fresh empty mindmaps
- ✅ **Save Current:** Save with custom name
- ✅ **Load Any:** Load any saved mindmap from the list
- ✅ **Delete:** Remove unwanted mindmaps
- ✅ **Auto-Sort:** Newest mindmaps appear first
- ✅ **Metadata:** Shows timestamp and node count for each mindmap
- ✅ **Active Indicator:** Highlights currently loaded mindmap

---

## Architecture

### Storage Structure

```
localStorage:
├── vueflow-mindmaps-list          # Master list of all mindmaps
│   └── [{ id, name, timestamp, nodeCount }, ...]
├── vueflow-mindmap-mindmap-123    # Individual mindmap data
│   └── { id, name, timestamp, nodeCount, nodes, edges }
├── vueflow-mindmap-mindmap-456
└── vueflow-mindmap-mindmap-789
```

### Data Model

**Master List Entry:**
```typescript
interface SavedMindmap {
  id: string;           // Unique ID (e.g., "mindmap-1732012345678")
  name: string;         // User-provided name
  timestamp: number;    // Unix timestamp (ms)
  nodeCount: number;    // Number of nodes (for display)
  nodes: Node[];        // Full node data
  edges: Edge[];        // Full edge data
}
```

**LocalStorage Keys:**
- `MINDMAPS_LIST_KEY = 'vueflow-mindmaps-list'` - Master list
- `MINDMAP_PREFIX = 'vueflow-mindmap-'` - Prefix for individual mindmaps

---

## How It Works

### 1. Create New Mindmap

```typescript
function createNewMindmap() {
  nodes.value = [];
  edges.value = [];
  selectedNodeId.value = null;
  currentMindmapId.value = `mindmap-${Date.now()}`;
  currentMindmapName.value = 'Untitled Mindmap';
}
```

**Flow:**
1. Clears canvas (nodes, edges, selection)
2. Generates new unique ID with timestamp
3. Sets default name "Untitled Mindmap"
4. User can rename before saving

---

### 2. Save Current Mindmap

```typescript
function saveCurrentMindmap() {
  // Validate name
  if (!currentMindmapName.value.trim()) return;
  
  // Generate ID if new
  if (!currentMindmapId.value) {
    currentMindmapId.value = `mindmap-${Date.now()}`;
  }
  
  // Create mindmap data
  const mindmapData = {
    id: currentMindmapId.value,
    name: currentMindmapName.value,
    timestamp: Date.now(),
    nodeCount: nodes.value.length,
    nodes: nodes.value,
    edges: edges.value,
  };
  
  // Save to localStorage
  localStorage.setItem(MINDMAP_PREFIX + id, JSON.stringify(mindmapData));
  
  // Update master list
  // ... (add or update entry)
  
  // Save updated list
  saveMindmapsList();
}
```

**Flow:**
1. Validates name is not empty
2. Generates ID if this is first save
3. Creates mindmap data object with all info
4. Saves to localStorage with prefixed key
5. Updates master list (add new or update existing)
6. Sorts list by timestamp (newest first)
7. Saves updated master list

---

### 3. Load Mindmap

```typescript
function loadMindmap(id: string) {
  // Get from localStorage
  const mindmapData = localStorage.getItem(MINDMAP_PREFIX + id);
  const mindmap = JSON.parse(mindmapData);
  
  // Load data
  nodes.value = mindmap.nodes;
  edges.value = mindmap.edges;
  currentMindmapId.value = mindmap.id;
  currentMindmapName.value = mindmap.name;
  
  // Update node counter
  const maxId = Math.max(...nodes.value.map(n => parseInt(n.id) || 0), 0);
  nodeCounter = maxId + 1;
  
  // Clear selection
  selectedNodeId.value = null;
}
```

**Flow:**
1. Retrieves mindmap data from localStorage
2. Parses JSON
3. Loads nodes and edges into canvas
4. Sets current mindmap ID and name
5. Updates node counter to avoid ID conflicts
6. Clears selection

---

### 4. Delete Mindmap

```typescript
function deleteMindmap(id: string) {
  // Remove from localStorage
  localStorage.removeItem(MINDMAP_PREFIX + id);
  
  // Remove from master list
  savedMindmaps.value = savedMindmaps.value.filter(m => m.id !== id);
  
  // Save updated list
  saveMindmapsList();
  
  // If deleted current mindmap, create new one
  if (currentMindmapId.value === id) {
    createNewMindmap();
  }
}
```

**Flow:**
1. Removes mindmap data from localStorage
2. Removes entry from master list
3. Saves updated master list
4. If deleted mindmap was currently loaded, creates new empty mindmap

---

## UI Components

### Current Mindmap Section

```vue
<q-input
  v-model="currentMindmapName"
  label="Current Mindmap Name"
  outlined
  dense
  :rules="[(val: string) => !!val || 'Name is required']"
/>

<q-btn label="New Mindmap" @click="createNewMindmap" />
<q-btn label="Save Current Mindmap" @click="saveCurrentMindmap" />
```

### Saved Mindmaps List

```vue
<q-list bordered separator>
  <q-item
    v-for="mindmap in savedMindmaps"
    :key="mindmap.id"
    :active="currentMindmapId === mindmap.id"
  >
    <q-item-section>
      <q-item-label>{{ mindmap.name }}</q-item-label>
      <q-item-label caption>
        {{ formatDate(mindmap.timestamp) }} • {{ mindmap.nodeCount }} nodes
      </q-item-label>
    </q-item-section>
    <q-item-section side>
      <q-btn icon="upload" @click="loadMindmap(mindmap.id)" />
      <q-btn icon="delete" @click="deleteMindmap(mindmap.id)" />
    </q-item-section>
  </q-item>
</q-list>
```

---

## Helper Functions

### formatDate()

Formats timestamps into human-readable relative time:

```typescript
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
```

**Examples:**
- `Just now` - Less than 1 minute ago
- `5m ago` - 5 minutes ago
- `2h ago` - 2 hours ago
- `3d ago` - 3 days ago
- `11/19/2025` - More than 7 days ago

---

## Usage

### For Users

1. **Create a new mindmap:**
   - Click "New Mindmap" button
   - Canvas clears, name resets to "Untitled Mindmap"

2. **Name your mindmap:**
   - Type a name in the "Current Mindmap Name" field
   - Name is required before saving

3. **Save your work:**
   - Click "Save Current Mindmap"
   - Mindmap appears in the list below

4. **Load a saved mindmap:**
   - Click the upload icon next to any mindmap in the list
   - Canvas loads with that mindmap's data

5. **Delete a mindmap:**
   - Click the delete icon next to any mindmap
   - Mindmap is removed from localStorage

### For Developers

**Initialize on mount:**
```typescript
onMounted(() => {
  loadMindmapsList();  // Load list of saved mindmaps
});
```

**State variables:**
```typescript
const currentMindmapName = ref('Untitled Mindmap');
const currentMindmapId = ref<string | null>(null);
const savedMindmaps = ref<SavedMindmap[]>([]);
```

---

## Best Practices

### 1. Always Validate Names

```typescript
if (!currentMindmapName.value.trim()) {
  Notify.create({
    type: 'warning',
    message: 'Please enter a name for the mindmap',
  });
  return;
}
```

### 2. Update Node Counter After Load

```typescript
// Prevent ID conflicts when creating new nodes
const maxId = Math.max(...nodes.value.map(n => parseInt(n.id) || 0), 0);
nodeCounter = maxId + 1;
```

### 3. Handle Deleted Current Mindmap

```typescript
// If we deleted the current mindmap, create a new one
if (currentMindmapId.value === id) {
  createNewMindmap();
}
```

### 4. Sort by Timestamp

```typescript
// Always show newest first
savedMindmaps.value.sort((a, b) => b.timestamp - a.timestamp);
```

### 5. Use Try-Catch for localStorage

```typescript
try {
  localStorage.setItem(key, value);
} catch (error) {
  console.error('Error saving to localStorage:', error);
  // Handle quota exceeded, etc.
}
```

---

## Limitations

### Browser Storage Limits

- **Typical Limit:** 5-10 MB per domain
- **Large Mindmaps:** May hit quota with many nodes
- **Solution:** Consider IndexedDB for larger datasets

### No Cloud Sync

- **Current:** Data only in browser's localStorage
- **Limitation:** Not synced across devices/browsers
- **Future:** Add cloud storage (Google Drive, Supabase)

### No Version History

- **Current:** Only latest version saved
- **Limitation:** Can't undo saves or view history
- **Future:** Add version history with timestamps

---

## Future Enhancements

### Planned Features

1. **Export/Import**
   - Export mindmap as JSON file
   - Import from JSON file
   - Share mindmaps between users

2. **Auto-Save**
   - Periodic auto-save (every 30 seconds)
   - Save on window close
   - Unsaved changes indicator

3. **Cloud Storage**
   - Save to Google Drive
   - Save to Supabase
   - Sync across devices

4. **Version History**
   - Track changes over time
   - Restore previous versions
   - Compare versions

5. **Search & Filter**
   - Search mindmaps by name
   - Filter by date, node count
   - Sort by various criteria

6. **Duplicate & Template**
   - Duplicate existing mindmap
   - Create templates
   - Share templates

---

## Related Documentation

- **Tiptap Integration:** `TIPTAP_INTEGRATION.md` - Node editing system
- **Event Bus:** `EVENT_BUS_ARCHITECTURE.md` - Event system
- **MVP Documentation:** `MVP_DOCUMENTATION.md` - Current features

---

**Last Updated:** 2025-11-19
**Author:** Milan Košir
**Status:** ✅ FULLY WORKING - Multi-file localStorage system complete


