/**
 * Utility for mapping view types to Material icons and titles
 * Used for displaying icons in dockview tabs for different view types
 */

export function getViewIcon(viewType: string): string {
  const iconMap: Record<string, string> = {
    'mindmap-panel': 'account_tree',    // Mind Map view (tree structure icon)
    'outline-panel': 'list',            // Outline view (list icon)
    'writer-panel': 'edit_note',        // Writer view (edit note icon)
    'concept-map-panel': 'hub'          // Concept Map view (network/hub icon)
  }

  return iconMap[viewType] || 'help_outline' // Default icon if view type not found
}

export function getViewTitle(viewType: string): string {
  const titleMap: Record<string, string> = {
    'mindmap-panel': 'Mind Map',
    'outline-panel': 'Outline',
    'writer-panel': 'Writer',
    'concept-map-panel': 'Concept Map'
  }

  return titleMap[viewType] || viewType
}
