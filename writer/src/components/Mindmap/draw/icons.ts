import * as d3 from '../d3'
import type { Mdata } from '../interface'

/**
 * Icon definitions - mapping icon names to Unicode characters or SVG paths
 */
const ICON_MAP: Record<string, string> = {
  'content': '📝',  // Document/content icon
  'calendar': '📅', // Calendar icon
  'priority': '⭐', // Priority/star icon
  'flag': '🚩',     // Flag icon
  'check': '✓',     // Checkmark icon
  'warning': '⚠️',   // Warning icon
  'info': 'ℹ️',      // Info icon
  'link': '🔗',     // Link icon
}

const ICON_SIZE = 16
const ICON_MARGIN = 4
const ICON_TEXT_GAP = 10 // Gap between icons and text

/**
 * Position the icons container
 */
export function positionIconsContainer(
  gIconsContainer: d3.Selection<SVGGElement, Mdata, SVGGElement, unknown>
): void {
  gIconsContainer.attr('transform', (d: Mdata) => {
    if (d.icons.length === 0) return 'translate(0,0)'
    // Position icons container
    // For left nodes: icons go to the left of text (before text which ends at 0)
    // For right nodes: icons go to the right of text (after text which starts at 0)
    const x = d.left ? -(d.width + d.iconsWidth + ICON_TEXT_GAP) : (d.width + ICON_TEXT_GAP)
    return `translate(${x},0)`
  })
}

/**
 * Append icons group to node - now returns the container group
 */
export function appendIcons(
  gIconsContainer: d3.Selection<SVGGElement, Mdata, SVGGElement, unknown>
): d3.Selection<SVGGElement, Mdata, SVGGElement, unknown> {
  // Position the container
  positionIconsContainer(gIconsContainer)
  return gIconsContainer
}

/**
 * Update icons for a node
 */
export function attrIcons(
  gIcons: d3.Selection<SVGGElement, Mdata, SVGGElement, unknown>
): void {
  // Icons are positioned at 0,0 within their container
  // The container itself is positioned by appendIcons

  // Update icon elements
  gIcons.each(function(d: Mdata) {
    const iconGroup = d3.select(this)

    // Bind icon data - use :scope to only select direct children
    const icons = iconGroup
      .selectAll<SVGTextElement, string>(':scope > text.icon')
      .data(d.icons)

    // Enter: create new icons
    const iconsEnter = icons
      .enter()
      .append('text')
      .attr('class', 'icon')
      .attr('font-size', `${ICON_SIZE}px`)
      .attr('alignment-baseline', 'text-before-edge')
      .text((iconName: string) => ICON_MAP[iconName] || '❓')

    // Update: position all icons
    icons.merge(iconsEnter)
      .attr('x', (_iconName: string, i: number) => i * (ICON_SIZE + ICON_MARGIN))
      .attr('y', 0)

    // Exit: remove old icons
    icons.exit().remove()
  })
}

/**
 * Get icon by name
 */
export function getIcon(iconName: string): string {
  return ICON_MAP[iconName] || '❓'
}

/**
 * Calculate total width of icons
 */
export function calculateIconsWidth(icons: string[]): number {
  return icons.length > 0 ? icons.length * (ICON_SIZE + ICON_MARGIN) : 0
}

