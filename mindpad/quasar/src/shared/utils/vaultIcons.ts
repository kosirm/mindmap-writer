/**
 * Utility for vault-related Material Symbols icons
 * Centralized icon definitions for vault management UI components
 */

export function getVaultIcon(iconName: string): string {
  const iconMap: Record<string, string> = {
    'vault-management': 'sym_o_database',      // Vault management title icon
    'vault-toolbar': 'sym_o_database',         // Vault toolbar icon
    'active-vault': 'sym_o_storage',           // Active vault indicator
    'new-vault': 'sym_o_add_circle',           // New vault button
    'open-vault': 'sym_o_database',         // Open vault button
    'delete-vault': 'sym_o_delete',            // Delete vault button
    'add-file': 'sym_o_note_add',              // Add file button
    'add-folder': 'sym_o_create_new_folder',   // Add folder button
    'expand-all': 'sym_o_unfold_more',         // Expand all button
    'collapse-all': 'sym_o_unfold_less',       // Collapse all button
  }

  return iconMap[iconName] || 'sym_o_help_outline' // Default icon if not found
}
