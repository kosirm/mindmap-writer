/**
 * Utility for mapping view types to Material icons and titles
 * Used for displaying icons in dockview tabs for different view types
 */

export function getViewIcon(viewType: string): string {
  const iconMap: Record<string, string> = {
    'mindmap-panel': 'sym_o_graph_1',    // Mind Map view (graph icon from Material Symbols)
    'outline-panel': 'sym_o_account_tree',            // Outline view (list icon)
    'writer-panel': 'sym_o_flowsheet',        // Writer view (edit note icon)
    'd3-mindmap-panel': 'sym_o_graph_1',      // D3 Mind Map view (alternative graph icon)
    'd3-concept-map-panel': 'sym_o_browse',   // D3 Concept Map view (alternative network icon)
    'vue3-mindmap-panel': 'sym_o_graph_1'    // Vue3 Mindmap view (graph icon)
  }

  return iconMap[viewType] || 'help_outline' // Default icon if view type not found
}

export function getViewTitle(viewType: string): string {
  const titleMap: Record<string, string> = {
    'mindmap-panel': 'Mind Map',
    'outline-panel': 'Outline',
    'writer-panel': 'Writer',
    'd3-mindmap-panel': 'D3 Mind Map',
    'd3-concept-map-panel': 'D3 Concept Map',
    'vue3-mindmap-panel': 'Vue3 Mindmap'
  }

  return titleMap[viewType] || viewType
}
