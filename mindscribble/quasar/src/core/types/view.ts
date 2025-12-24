/**
 * View type definitions
 */

export type ViewType =
  | 'outline'
  | 'mindmap'
  | 'writer'
  | 'kanban'
  | 'timeline'
  | 'circle-pack'
  | 'sunburst'
  | 'treemap'
  | 'd3-mindmap'
  | 'd3-concept-map'
  | 'vue3-mindmap'

export interface ViewConfig {
  type: ViewType
  label: string
  icon: string
  description: string
  component: string // Component name
}

export const VIEW_CONFIGS: Record<ViewType, ViewConfig> = {
  outline: {
    type: 'outline',
    label: 'Outline',
    icon: 'format_list_bulleted',
    description: 'Tree view of your mindmap',
    component: 'OutlineView'
  },
  mindmap: {
    type: 'mindmap',
    label: 'Mindmap',
    icon: 'account_tree',
    description: 'Visual mindmap canvas',
    component: 'Vue3MindmapView'
  },
  writer: {
    type: 'writer',
    label: 'Writer',
    icon: 'edit_note',
    description: 'Full document writing view',
    component: 'WriterView'
  },
  kanban: {
    type: 'kanban',
    label: 'Kanban',
    icon: 'view_kanban',
    description: 'Kanban board view',
    component: 'KanbanView'
  },
  timeline: {
    type: 'timeline',
    label: 'Timeline',
    icon: 'timeline',
    description: 'Timeline view of nodes',
    component: 'TimelineView'
  },
  'circle-pack': {
    type: 'circle-pack',
    label: 'Circle Pack',
    icon: 'blur_circular',
    description: 'Circular hierarchy visualization',
    component: 'CirclePackView'
  },
  sunburst: {
    type: 'sunburst',
    label: 'Sunburst',
    icon: 'wb_sunny',
    description: 'Sunburst diagram',
    component: 'SunburstView'
  },
  treemap: {
    type: 'treemap',
    label: 'Treemap',
    icon: 'grid_view',
    description: 'Treemap visualization',
    component: 'TreemapView'
  },
  'd3-mindmap': {
    type: 'd3-mindmap',
    label: 'D3 Mind Map',
    icon: 'sym_o_graph_2',
    description: 'D3-based mind map visualization',
    component: 'D3MindmapView'
  },
  'd3-concept-map': {
    type: 'd3-concept-map',
    label: 'D3 Concept Map',
    icon: 'sym_o_browse_2',
    description: 'D3-based concept map visualization',
    component: 'D3ConceptMapView'
  },
  'vue3-mindmap': {
    type: 'vue3-mindmap',
    label: 'Vue3 Mindmap',
    icon: 'account_tree',
    description: 'Vue3-based mindmap visualization',
    component: 'Vue3MindmapView'
  }
}

