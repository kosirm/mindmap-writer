# Current Context

## Work Focus
- **Phase**: Early development and prototyping
- **Current Priority**: Building core mindmap functionality with multi-view support
- **Architecture**: Feature-based modular structure with Pinia stores and event bus

## Recent Changes (Last 4 Sessions)
1. **Session 1 (2025-12-04)**: Initial project setup with working Mindmap View, 3-panel layout system, dark/light mode
2. **Session 2 (2025-12-04)**: Fixed ConceptMap parent node resize issues, implemented one-way binding for VueFlow control
3. **Session 3 (2025-12-05)**: Fixed orientation transitions for 360° layouts, implemented bottom-up AABB optimization, added dev tools for bounding box visualization
4. **Session 4 (2025-12-05)**: Added reference edges (hold C + drag), edge type settings, improved concept map styling and parent resize logic

## Current State
- ✅ Basic mindmap editing (create, drag, delete nodes)
- ✅ 3-panel layout (mindmap, outline placeholder, writer placeholder)
- ✅ Orientation system (4 modes: clockwise, anticlockwise, left-right, right-left)
- ✅ AABB collision detection with LOD system
- ✅ Reference edges between nodes
- ✅ Dev tools for debugging
- ✅ Dark/light mode toggle
- ✅ Command system foundation

## Next Steps
1. **Complete Multi-View Integration**: Connect outline and writer views to document store
2. **Data Persistence**: Implement Google Drive storage and offline support
3. **AI Integration**: Connect n8n workflow for AI-powered operations
4. **Keyboard Navigation**: Implement rapid keyboard shortcuts for node operations
5. **Inter-Map Linking**: Build master map visualization and cross-map references
6. **Subscription System**: Implement freemium tiers with feature gating

## Technical Debt
- Outline and writer views are placeholders
- No data persistence yet (localStorage planned next)
- AI integration not connected
- Performance testing needed for 1000+ nodes
- Mobile UI not implemented

## Key Decisions Made
- Feature-based architecture (not monolithic)
- VueFlow for canvas rendering with custom layout engine
- Pinia stores for state management
- Event bus for cross-component communication
- Command system for all user actions
- AABB collision detection (not physics engines)
- User data stored in Google Drive (not our servers)