/**
 * View type definitions
 */

export type ViewType =
  | 'outline'
  | 'mindmap'
  | 'concept-map'
  | 'writer'
  | 'circle-pack'
  | 'sunburst'
  | 'treemap'
  | 'timeline'

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
    component: 'MindmapView'
  },
  'concept-map': {
    type: 'concept-map',
    label: 'Concept Map',
    icon: 'hub',
    description: 'Free-form concept mapping',
    component: 'ConceptMapView'
  },
  writer: {
    type: 'writer',
    label: 'Writer',
    icon: 'edit_note',
    description: 'Full document writing view',
    component: 'WriterView'
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
  timeline: {
    type: 'timeline',
    label: 'Timeline',
    icon: 'timeline',
    description: 'Timeline view of nodes',
    component: 'TimelineView'
  }
}

