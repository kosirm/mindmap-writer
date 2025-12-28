/**
 * ID and Timestamp Generation Utilities
 * 
 * Uses nanoid for short, secure, URL-safe IDs
 * Uses numeric timestamps for efficient date storage
 * 
 * Benefits:
 * - 56% smaller IDs (12 chars vs 27 chars)
 * - 46% smaller dates (13 chars vs 24 chars)
 * - Faster generation and comparison
 * - URL-safe and collision-resistant
 */

import { nanoid } from 'nanoid'

/**
 * Generate a unique ID for nodes, edges, maps, links, etc.
 * 
 * Uses nanoid with 12 characters:
 * - Short: 12 chars vs 27 chars (56% reduction)
 * - Secure: Cryptographically strong randomness
 * - URL-safe: A-Za-z0-9_- characters only
 * - Collision-resistant: 1% probability after 1M IDs
 * 
 * @param size - Optional custom size (default: 12)
 * @returns A unique ID string
 * 
 * @example
 * const nodeId = generateId() // => "V1StGXR8_Z5j"
 * const edgeId = generateId() // => "3n4k5l6m7n8o"
 */
export function generateId(size: number = 12): string {
  return nanoid(size)
}

/**
 * Generate a timestamp for created/modified dates
 * 
 * Uses numeric timestamp instead of ISO string:
 * - Shorter: 13 chars vs 24 chars (46% reduction)
 * - Faster: No string parsing needed
 * - Sortable: Direct numeric comparison
 * - Standard: Works with all Date APIs
 * 
 * @returns Unix timestamp in milliseconds
 * 
 * @example
 * const created = generateTimestamp() // => 1735382445123
 * const date = new Date(created) // Convert back to Date
 */
export function generateTimestamp(): number {
  return Date.now()
}

/**
 * Convert timestamp back to Date object
 * 
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Date object
 * 
 * @example
 * const date = timestampToDate(1735382445123)
 * console.log(date.toISOString()) // => "2024-12-28T10:30:45.123Z"
 */
export function timestampToDate(timestamp: number): Date {
  return new Date(timestamp)
}

/**
 * Format timestamp as ISO string for display
 * 
 * @param timestamp - Unix timestamp in milliseconds
 * @returns ISO 8601 formatted string
 * 
 * @example
 * formatTimestamp(1735382445123) // => "2024-12-28T10:30:45.123Z"
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString()
}

/**
 * Format timestamp as human-readable string
 * 
 * @param timestamp - Unix timestamp in milliseconds
 * @param locale - Optional locale (default: user's locale)
 * @returns Formatted date string
 * 
 * @example
 * formatTimestampHuman(1735382445123) // => "12/28/2024, 10:30:45 AM"
 * formatTimestampHuman(1735382445123, 'en-GB') // => "28/12/2024, 10:30:45"
 */
export function formatTimestampHuman(timestamp: number, locale?: string): string {
  return new Date(timestamp).toLocaleString(locale)
}

/**
 * Check if a string is an old-format ID (for backward compatibility)
 * 
 * Old format: "node-1766839323403-8c08u65" (27 chars)
 * New format: "V1StGXR8_Z5j" (12 chars)
 * 
 * @param id - ID to check
 * @returns true if old format, false if new format
 * 
 * @example
 * isOldFormatId("node-1766839323403-8c08u65") // => true
 * isOldFormatId("V1StGXR8_Z5j") // => false
 */
export function isOldFormatId(id: string): boolean {
  // Old format starts with prefix like "node-", "edge-", "map-", etc.
  return /^(node|edge|map|link|view)-\d+-[a-z0-9]+$/i.test(id)
}

/**
 * Check if a value is a timestamp (number) or ISO string
 * 
 * @param value - Value to check
 * @returns 'timestamp' | 'iso-string' | 'unknown'
 * 
 * @example
 * getDateFormat(1735382445123) // => 'timestamp'
 * getDateFormat("2024-12-28T10:30:45.123Z") // => 'iso-string'
 * getDateFormat("invalid") // => 'unknown'
 */
export function getDateFormat(value: unknown): 'timestamp' | 'iso-string' | 'unknown' {
  if (typeof value === 'number' && value > 0) {
    return 'timestamp'
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    return 'iso-string'
  }
  return 'unknown'
}

/**
 * Normalize date to timestamp (handles both old and new formats)
 * 
 * @param value - Timestamp or ISO string
 * @returns Unix timestamp in milliseconds
 * 
 * @example
 * normalizeDate(1735382445123) // => 1735382445123
 * normalizeDate("2024-12-28T10:30:45.123Z") // => 1735382445123
 */
export function normalizeDate(value: number | string): number {
  if (typeof value === 'number') {
    return value
  }
  return new Date(value).getTime()
}

