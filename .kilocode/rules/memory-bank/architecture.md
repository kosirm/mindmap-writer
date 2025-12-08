# MindScribble Architecture

## System Architecture

MindScribble is a Vue 3 application built with Quasar framework, featuring a modular feature-based architecture designed to avoid the performance and maintainability issues encountered in the initial vueflow prototype.

## Technology Stack

### Frontend
- **Vue 3** (Composition API) - Reactive UI framework
- **Quasar 2** - Material Design component library with theming
- **VueFlow** - Canvas-based node editing with custom layout engine
- **Tiptap** - Rich text editor for node content
- **D3.js** - Force-directed graph visualization for master maps
- **TypeScript** - Type-safe development
- **Pinia** - Centralized state management

### Backend & Infrastructure
- **Supabase** - Authentication, database, and serverless functions
- **Google Drive API** - Secure, user-owned file storage
- **Stripe** - Subscription and payment processing
- **Supabase Edge Functions** - Serverless AI processing

### AI Integration
- **Supabase Edge Functions** - Server-side AI orchestration (replacing n8n)
- **DeepSeek/OpenAI** - Cost-effective LLM providers for mindmap operations
- **Structured JSON Operations** - Predictable AI responses for canvas manipulation
- **Rate Limiting & Usage Tracking** - Fair usage across subscription tiers

## Folder Structure

```
mindscribble/
├── src/
│   ├── features/              # Feature modules
│   │   ├── canvas/           # Mindmap canvas (VueFlow integration)
│   │   │   ├── components/
│   │   │   │   ├── ConceptMapView.vue
│   │   │   │   ├── MindmapView.vue
│   │   │   │   └── PlaceholderView.vue
│   │   │   ├── composables/
│   │   │   │   ├── mindmap/     # Mindmap-specific composables
│   │   │   │   └── conceptmap/  # Concept map-specific composables
│   │   │   └── index.ts
│   │   ├── writer/           # Writer panel (Full Document view)
│   │   ├── tree/             # Tree view
│   │   ├── keyboard/         # Keyboard navigation
│   │   ├── orientation/      # Layout orientation (clockwise/counterclockwise)
│   │   ├── ai/               # AI agent integration
│   │   └── subscription/     # Subscription & feature gating
│   ├── core/                 # Core infrastructure
│   │   ├── commands/         # Command system
│   │   │   ├── api.ts        # Command execution API
│   │   │   ├── index.ts      # Command registry
│   │   │   ├── types.ts      # Command type definitions
│   │   │   └── definitions/  # Command implementations
│   │   ├── events/           # Event bus
│   │   ├── stores/           # Global Pinia stores
│   │   │   ├── appStore.ts         # Global app state
│   │   │   ├── authStore.ts        # Authentication state
│   │   │   ├── commandStore.ts     # Command state
│   │   │   ├── contextStore.ts     # Command context
│   │   │   ├── documentStore.ts    # Document data (single source of truth)
│   │   │   ├── googleDriveStore.ts # Google Drive integration
│   │   │   ├── orientationStore.ts # Layout orientation
│   │   │   ├── panelStore.ts       # 3-panel layout state
│   │   │   └── index.ts
│   │   ├── types/            # Shared type definitions
│   │   │   ├── document.ts   # Document structure types
│   │   │   ├── edge.ts       # Edge types
│   │   │   ├── node.ts       # Node types
│   │   │   ├── panel.ts      # Panel types
│   │   │   ├── view.ts       # View types
│   │   │   ├── masterMap.ts  # Master map types
│   │   │   └── index.ts
│   │   └── api/              # API clients
│   ├── shared/               # Shared utilities
│   │   ├── components/       # Reusable components
│   │   ├── composables/      # Utility composables
│   │   └── utils/            # Helper functions
│   ├── layouts/              # App layouts
│   ├── pages/                # Route pages
│   ├── i18n/                 # Translations
│   ├── boot/                 # Boot files (Supabase, Google API, etc.)
│   ├── router/               # Routing
│   └── css/                  # Global styles
├── dev/                      # Documentation
│   ├── 01_ARCHITECTURE.md    # This file
│   ├── 02_AI_INTEGRATION.md  # AI integration guide
│   ├── 03_DATA_FORMAT.md     # JSON data format specification
│   └── UI.md                 # UI design specifications
└── quasar.config.ts          # Quasar configuration
```

## State Management

### Pinia Stores

1. **documentStore** - Single source of truth for document data
   - nodes: MindscribbleNode[]
   - edges: MindscribbleEdge[]
   - interMapLinks: InterMapLink[]
   - CRUD operations for nodes/edges
   - View switching logic
   - Document serialization

2. **appStore** - Global application state
   - UI state (drawers, dialogs, active context)
   - Online/offline status
   - Dark/light mode

3. **panelStore** - 3-panel layout state
   - Panel sizes and visibility
   - Active views per panel

4. **orientationStore** - Layout orientation
   - Current mode (clockwise/counterclockwise/left-right/right-left)
   - Layout calculations

5. **authStore** - Authentication state
   - User profile from Supabase
   - Google OAuth tokens

6. **googleDriveStore** - Google Drive integration
   - App folder management
   - File operations (save/load/list/search)

7. **commandStore** - Command system state
   - Command execution history
   - Context updates

8. **aiStore** - AI agent state
   - Processing status
   - Conversation history
   - AI suggestions

## Data Format

### Mindmap JSON Structure
```typescript
interface MindscribbleDocument {
  version: string;                 // Schema version "1.0"
  metadata: DocumentMetadata;
  nodes: MindscribbleNode[];
  edges: MindscribbleEdge[];
  interMapLinks: InterMapLink[];   // Links to other maps/nodes
  layout: LayoutSettings;
}
```

### Key Design Decisions

1. **Multi-View Node Data**: Each node stores view-specific data (mindmap, conceptMap, timeline, kanban) allowing different layouts per view while maintaining shared content.

2. **Event-Driven Architecture**: All state changes emit events via eventBus, allowing views to react to changes from other views without tight coupling.

3. **Command System**: All user actions go through commands for consistency, discoverability, and undo/redo support.

4. **AABB Collision Detection**: Simple rectangle overlap detection instead of physics engines for predictable, fast layout resolution.

5. **Bottom-Up Layout**: Layout engine processes from affected nodes upward through ancestor chain, dramatically reducing complexity for large mindmaps.

## Component Relationships

### View Components
- **MindmapView.vue**: VueFlow canvas with custom nodes, handles mindmap-specific interactions
- **ConceptMapView.vue**: VueFlow canvas with nested containers, handles concept map interactions
- **WriterView.vue**: Tiptap editor with hierarchical navigation
- **OutlineView.vue**: Tree component with keyboard navigation

### Shared Components
- **ThreePanelContainer.vue**: Resizable 3-panel layout
- **PanelManager.vue**: Panel toggle buttons
- **CommandPalette.vue**: VSCode-style command search
- **AIChat.vue**: AI conversation interface

## Critical Implementation Paths

### Node Creation Flow
1. User triggers create command (keyboard/menu/context menu)
2. Command executed via command system
3. documentStore.addNode() called
4. Node added to nodes array
5. Event emitted: 'store:node-created'
6. Views listen and update their VueFlow instances
7. Layout engine runs to position new node
8. Auto-save triggered

### View Switching Flow
1. User selects different view
2. documentStore.switchView() called
3. Current view positions saved to node.views[currentView]
4. New view positions loaded from node.views[newView]
5. Event emitted: 'store:view-changed'
6. Views update their active state and positions

### AI Operation Flow
1. User sends prompt via AI chat
2. aiStore.sendPrompt() calls n8n webhook
3. n8n processes prompt with LLM
4. Structured operations returned
5. aiStore.applyOperations() updates documentStore
6. Changes propagate to all views via events
7. Auto-save to Google Drive

## Performance Optimizations

1. **LOD System**: Progressive node disclosure based on zoom level
2. **Lazy Loading**: Tiptap editors created on-demand
3. **Debouncing**: Auto-save, search, layout recalculations
4. **Shallow Refs**: Heavy objects (D3 simulations, Tiptap instances)
5. **Memory Cleanup**: Event listeners, editors disposed on unmount
6. **IndexedDB Caching**: Offline support and fast loading

## Security & Privacy

### Data Ownership
- All mindmap data stored in user's Google Drive
- App only accesses files created by the app
- User can revoke access anytime
- No data stored on our servers

### Authentication
- Google OAuth via Supabase
- Row Level Security (RLS) in Supabase
- API rate limiting for AI operations

## Development Workflow

### Feature Development
1. Create feature folder under `src/features/`
2. Add components, composables, stores as needed
3. Register commands in command definitions
4. Add event bus events
5. Test in isolation
6. Integrate via event bus
7. Add to main layout

### Testing Strategy
1. Unit tests for composables and utilities
2. Component tests for individual components
3. Integration tests for feature interactions
4. Performance tests for large datasets
5. Memory leak detection

## Migration Strategy

### From VueFlow Prototype
- **Keep**: Event bus, command system, keyboard navigation, Tiptap integration
- **Change**: Monolithic components → feature modules, reactive refs → Pinia stores, physics engines → AABB layout
- **Add**: Supabase auth, Google Drive storage, subscription system, AI integration

This architecture provides the foundation for a scalable, maintainable mindmapping application with AI-powered features and user data ownership.