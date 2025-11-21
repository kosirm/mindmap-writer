# Menu Components Guide

## Overview

Four reusable menu components have been created to provide a complete UI for the command system.

## Components

### 1. TopBarMenu.vue

**Purpose**: Text-based menu bar for the application header (File, Edit, View, etc.)

**Features**:
- Dropdown menus with command items
- Support for submenus (e.g., Export submenu)
- Icons and keyboard shortcuts displayed
- Automatic grouping with separators
- Commands are enabled/disabled based on context

**Usage**:
```vue
<TopBarMenu />
```

The component automatically reads from `topBarMenus` configuration.

### 2. ToolBar.vue

**Purpose**: Icon-based toolbar for view-specific actions

**Features**:
- Compact icon buttons
- Tooltips with command labels and shortcuts
- Automatic grouping with vertical separators
- Commands are enabled/disabled based on context
- Reusable for different views (Mindmap, Writer, etc.)

**Usage**:
```vue
<ToolBar :items="toolbarMenus.mindmap" />
<ToolBar :items="toolbarMenus.writer" />
```

**Props**:
- `items`: Array of MenuItem objects

### 3. ContextMenu.vue

**Purpose**: Right-click context menu

**Features**:
- Shows on right-click
- Filters items based on availability
- Icons and keyboard shortcuts displayed
- Automatic grouping with separators
- Empty state when no actions available

**Usage**:
```vue
<ContextMenu ref="contextMenuRef" :items="contextMenus.mindmap" />

<script setup>
const contextMenuRef = ref();

function onContextMenu(event: MouseEvent) {
  contextMenuRef.value?.show(event);
}
</script>
```

**Props**:
- `items`: Array of MenuItem objects

**Exposed Methods**:
- `show(event: MouseEvent)`: Show the context menu
- `hide()`: Hide the context menu

### 4. ViewSelector.vue

**Purpose**: Dropdown to switch between different view types

**Features**:
- Shows all registered views
- Current view highlighted with checkmark
- View icons and descriptions
- v-model support for two-way binding

**Usage**:
```vue
<ViewSelector v-model="currentView" />

<script setup>
const currentView = ref('mindmap');
</script>
```

**Props**:
- `modelValue`: Current view ID (string)

**Emits**:
- `update:modelValue`: Emitted when view changes

## Integration Steps

### Step 1: Register Commands

In your main app setup or a plugin:

```typescript
import { useCommands } from './composables/useCommands';
import { allCommands } from './commands';

const { registerCommands } = useCommands();
registerCommands(allCommands);
```

### Step 2: Register Views

```typescript
import { useViewRegistry } from './composables/useViewRegistry';

const { registerViews } = useViewRegistry();

registerViews([
  {
    id: 'mindmap',
    label: 'Mindmap',
    icon: 'account_tree',
    component: () => import('./components/MindmapView.vue'),
    supportsSelection: true,
    supportsEditing: true,
  },
  {
    id: 'writer',
    label: 'Writer',
    icon: 'edit_note',
    component: () => import('./components/WriterEditor.vue'),
    supportsSelection: true,
    supportsEditing: true,
  },
  // Add more views as needed
]);
```

### Step 3: Update Command Context

Update context when application state changes:

```typescript
import { useCommands } from './composables/useCommands';

const { updateContext } = useCommands();

// When selection changes
watch(selectedNodeIds, (ids) => {
  updateContext({ selectedNodeIds: ids });
});

// When active view changes
watch(activeView, (view) => {
  updateContext({ activeView: view });
});
```

### Step 4: Add Components to UI

```vue
<template>
  <q-layout>
    <q-header>
      <q-toolbar>
        <!-- App title -->
        <q-toolbar-title>Mindmap Writer</q-toolbar-title>
        
        <!-- Top bar menu -->
        <TopBarMenu />
      </q-toolbar>
    </q-header>
    
    <q-page-container>
      <!-- Mindmap panel -->
      <div class="mindmap-panel">
        <div class="panel-header">
          <ViewSelector v-model="leftView" />
          <ToolBar :items="toolbarMenus.mindmap" />
        </div>
        <div class="panel-content" @contextmenu.prevent="onMindmapContextMenu">
          <!-- Mindmap content -->
        </div>
      </div>
      
      <!-- Writer panel -->
      <div class="writer-panel">
        <div class="panel-header">
          <ViewSelector v-model="rightView" />
          <ToolBar :items="toolbarMenus.writer" />
        </div>
        <div class="panel-content">
          <!-- Writer content -->
        </div>
      </div>
    </q-page-container>
    
    <!-- Context menus -->
    <ContextMenu ref="mindmapContextMenuRef" :items="contextMenus.mindmap" />
    <ContextMenu ref="writerContextMenuRef" :items="contextMenus.writer" />
  </q-layout>
</template>
```

## Next Steps

1. Integrate components into VueFlowTest.vue
2. Connect existing functionality to commands
3. Implement keyboard shortcut handler
4. Test all menus and commands
5. Add more commands as needed

