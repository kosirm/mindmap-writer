# Architectural Decisions - Session 2025-12-09

This document summarizes the key architectural decisions made during the session covering layout engine upgrades, rapid tools, toolbars, and settings system.

## 1. VueFlow Layout Engine Upgrades (08_VUEFLOW_LAYOUT.md)

### Core Decisions
- **AABB Toggleable**: Both mindmap and concept map will have optional AABB (Axis-Aligned Bounding Box) collision resolution
- **Parent Resizing Always On**: Concept map parent containers always resize to fit children, but AABB resolution is optional
- **Bottom-Up Processing**: All layout operations use bottom-up AABB resolution for efficiency (ancestor chain + siblings only)
- **Orientation Fixed**: Mindmap supports multiple orientations (clockwise, counterclockwise, left-right, right-left, free); concept map has no orientation

### Implementation Strategy
- **Mindmap**: AABB on/off toggle, LoD (Level of Detail) support, dynamic node sizing based on content
- **Concept Map**: Parent resize always active, AABB toggleable, separated functions for containment vs. overlap resolution
- **Triggers**: Layout runs on node create, move, title edit, and other relevant operations
- **Performance**: Bottom-up processing limits scope to affected nodes only

## 2. Rapid Tools Integration (12_RAPID_TOOLS.md)

### Core Decisions
- **Integrated with Command System**: Rapid Tools are implemented as commands, not separate from keyboard manager
- **Unified Command Source**: All interactions (toolbar, context menu, command palette, keyboard) use same command definitions
- **Rapid Mode**: Optional mode that enables advanced keyboard combinations for power users
- **Cross-View Consistency**: Keyboard shortcuts work across mindmap, concept map, writer, and other views

### Implementation Strategy
- **Command Enhancement**: Extended command definitions with `rapidKey`, `context`, and UI metadata
- **Keyboard Manager**: Handles rapid mode toggle and routes combinations to commands
- **State Management**: Rapid tools state (selection, navigation) managed in dedicated store
- **Layout Integration**: Commands trigger AABB/layout when needed for affected nodes

## 3. Toolbar and Context Menu System (14_TOOLBARS.md)

### Core Decisions
- **Command-Based**: Toolbars and context menus are arrays of command IDs with view-specific configurations
- **Grouping Support**: Commands can be organized in groups with dropdown menus
- **View-Specific**: Each view (mindmap, conceptmap, writer) has its own toolbar configuration
- **User Customization**: Foundation laid for user-configurable toolbars (future feature)

### Implementation Strategy
- **Configuration Files**: View-specific config files define toolbar layouts
- **Component System**: Reusable toolbar components with group dropdowns
- **Context Menus**: Dynamic building based on current selection and view context
- **Icon Consistency**: Commands maintain same icons/labels across all UI surfaces

## 4. Settings System (15_SETTINGS.md)

### Core Decisions
- **Dual Storage**: Settings saved to localStorage for performance, optionally synced to Google Drive
- **Two-Tab Panel**: Settings tab for app preferences, shortcuts tab for keyboard customization
- **Auto-Sync**: Changes automatically sync to Google Drive when enabled
- **Store Integration**: Settings managed through dedicated Pinia store

### Implementation Strategy
- **Settings Store**: Centralized store with reactive settings and auto-save
- **Google Drive Sync**: Background sync service for cross-device settings (_mindpad_settings.json)
- **Settings Panel**: Modal with tabbed interface, accessible via menu/command/keyboard
- **Keyboard Manager**: Editable shortcuts with conflict detection

## Cross-Cutting Architectural Principles

### Unified Command System
All user interactions flow through the command system:
- **Consistency**: Same commands accessible via toolbar, context menu, palette, keyboard
- **Discoverability**: Users can learn shortcuts from toolbars, access commands from keyboard
- **State Management**: Commands handle undo/redo, integrate with stores
- **Extensibility**: New features added as commands automatically appear everywhere

### View-Specific Configuration
Each major component configurable per view:
- **Toolbars**: Different commands for different views
- **Context Menus**: Context-aware command availability
- **Settings**: View-specific preferences (AABB toggles, etc.)
- **Keyboard**: View-aware command routing

### Performance Optimizations
- **Bottom-Up Processing**: Layout operations limited to affected node trees
- **Lazy Evaluation**: Settings loaded on demand, synced in background
- **Debounced Operations**: Auto-save and sync operations debounced
- **Selective Updates**: Only affected nodes updated in layout operations

### User Experience Focus
- **Progressive Enhancement**: Start with developer defaults, add customization later
- **Cross-Device Sync**: Settings follow users across devices via Google Drive
- **Keyboard-First**: Rapid tools for power users, mouse support for accessibility
- **Visual Consistency**: Material Design with consistent iconography

## Implementation Priority

1. **Layout Engine** - Foundation for visual consistency
2. **Command System Integration** - Unify all user interactions
3. **Toolbar System** - Provide visual command access
4. **Settings Panel** - User customization foundation
5. **Rapid Tools** - Advanced keyboard workflows
6. **Google Drive Sync** - Cross-device continuity

This architecture provides a solid foundation for MindPad's evolution into a professional, customizable mindmapping application with excellent user experience and performance.