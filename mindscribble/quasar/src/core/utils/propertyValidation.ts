/**
 * Property Validation Utilities
 * Validate property names and ensure data integrity
 */

import { PROP, PROP_REVERSE } from '../constants/propertyNames'
import type { PropertyName } from '../constants/propertyNames'

/**
 * Validate that a property name is valid
 */
export function isValidPropertyName(propertyName: string): boolean {
  return propertyName in PROP_REVERSE
}

/**
 * Validate that a standard property name exists
 */
export function isValidStandardPropertyName(standardName: string): boolean {
  return standardName in PROP
}

/**
 * Get all valid property names
 */
export function getAllPropertyNames(): PropertyName[] {
  return Object.values(PROP)
}

/**
 * Get all standard property names
 */
export function getAllStandardPropertyNames(): string[] {
  return Object.keys(PROP)
}

/**
 * Validate an object's properties
 * Returns true if all properties are valid, false otherwise
 */
export function validateObjectProperties(obj: Record<string, unknown>): boolean {
  for (const key of Object.keys(obj)) {
    if (!isValidPropertyName(key)) {
      console.warn(`Invalid property name: ${key}`)
      return false
    }
  }
  return true
}

/**
 * Validate that required properties are present
 */
export function validateRequiredProperties(
  obj: Partial<Record<PropertyName, unknown>>,
  requiredProperties: PropertyName[]
): boolean {
  for (const prop of requiredProperties) {
    if (!(prop in obj)) {
      console.warn(`Missing required property: ${prop} (${PROP_REVERSE[prop]})`)
      return false
    }
  }
  return true
}

/**
 * Validate node structure
 */
export function validateNode(node: Partial<Record<PropertyName, unknown>>): boolean {
  const requiredNodeProps: PropertyName[] = [
    PROP.NODE_ID,
    PROP.NODE_TYPE,
    PROP.NODE_POSITION_X,
    PROP.NODE_POSITION_Y,
    PROP.NODE_TITLE,
    PROP.NODE_CONTENT,
    PROP.NODE_ORDER
  ]

  return validateRequiredProperties(node, requiredNodeProps)
}

/**
 * Validate edge structure
 */
export function validateEdge(edge: Partial<Record<PropertyName, unknown>>): boolean {
  const requiredEdgeProps: PropertyName[] = [
    PROP.EDGE_ID,
    PROP.EDGE_SOURCE,
    PROP.EDGE_TARGET,
    PROP.EDGE_TYPE
  ]

  return validateRequiredProperties(edge, requiredEdgeProps)
}

/**
 * Validate document structure
 */
export function validateDocument(document: Partial<Record<PropertyName, unknown>>): boolean {
  const requiredDocProps: PropertyName[] = [
    PROP.MAP_ID,
    PROP.MAP_NAME,
    PROP.MAP_VERSION,
    PROP.MAP_CREATED,
    PROP.MAP_MODIFIED
  ]

  return validateRequiredProperties(document, requiredDocProps)
}

/**
 * Check if a property name is a single-letter property
 */
export function isSingleLetterProperty(propertyName: PropertyName): boolean {
  return propertyName.length === 1
}

/**
 * Check if a property name is a multi-letter property
 */
export function isMultiLetterProperty(propertyName: PropertyName): boolean {
  return propertyName.length > 1
}

/**
 * Get property usage statistics
 */
export function getPropertyUsageStats(): {
  totalProperties: number
  singleLetterProperties: number
  multiLetterProperties: number
  singleLetterUsed: number
  singleLetterAvailable: number
  multiLetterUsed: number
  multiLetterAvailable: number
} {
  const allProps = getAllPropertyNames()
  const singleLetterProps = allProps.filter(isSingleLetterProperty)
  const multiLetterProps = allProps.filter(isMultiLetterProperty)

  return {
    totalProperties: allProps.length,
    singleLetterProperties: singleLetterProps.length,
    multiLetterProperties: multiLetterProps.length,
    singleLetterUsed: singleLetterProps.length,
    singleLetterAvailable: 26 - singleLetterProps.length,
    multiLetterUsed: multiLetterProps.length,
    multiLetterAvailable: 676 - multiLetterProps.length
  }
}

/**
 * Validate property type
 */
export function validatePropertyType(
  propertyName: PropertyName,
  value: unknown,
  expectedType: string
): boolean {
  const actualType = typeof value

  // Handle arrays
  if (expectedType === 'array' && Array.isArray(value)) {
    return true
  }

  // Handle objects
  if (expectedType === 'object' && actualType === 'object' && value !== null) {
    return true
  }

  // Handle basic types
  if (actualType === expectedType) {
    return true
  }

  console.warn(`Type mismatch for property ${propertyName}: expected ${expectedType}, got ${actualType}`)
  return false
}

/**
 * Get expected type for a property
 */
export function getExpectedPropertyType(propertyName: PropertyName): string {
  const propertyTypes: Partial<Record<PropertyName, string>> = {
    // Node properties
    [PROP.NODE_ID]: 'string',
    [PROP.NODE_PARENT_ID]: 'string',
    [PROP.NODE_TITLE]: 'string',
    [PROP.NODE_CONTENT]: 'string',
    [PROP.NODE_ORDER]: 'number',
    [PROP.NODE_TYPE]: 'string',
    [PROP.NODE_POSITION_X]: 'number',
    [PROP.NODE_POSITION_Y]: 'number',
    [PROP.NODE_CREATED]: 'string',
    [PROP.NODE_MODIFIED]: 'string',

    // Edge properties
    [PROP.EDGE_ID]: 'string',
    [PROP.EDGE_SOURCE]: 'string',
    [PROP.EDGE_TARGET]: 'string',
    [PROP.EDGE_TYPE]: 'string',

    // Map properties
    [PROP.MAP_ID]: 'string',
    [PROP.MAP_NAME]: 'string',
    [PROP.MAP_CREATED]: 'string',
    [PROP.MAP_MODIFIED]: 'string',
    [PROP.MAP_VERSION]: 'string',

    // Optional properties
    [PROP.NODE_COLOR]: 'string',
    [PROP.NODE_ICON]: 'string',
    [PROP.NODE_AI_GENERATED]: 'boolean',
    [PROP.NODE_AI_PROMPT]: 'string',
    [PROP.NODE_AI_SUGGESTIONS]: 'array',
    [PROP.MAP_DESCRIPTION]: 'string',
    [PROP.MAP_TAGS]: 'array',
    [PROP.MAP_SEARCHABLE_TEXT]: 'string',
    [PROP.MAP_EDGE_COUNT]: 'number',
    [PROP.MAP_MAX_DEPTH]: 'number',
    [PROP.MAP_NODE_COUNT]: 'number',
    [PROP.LAYOUT_ACTIVE_VIEW]: 'string',
    [PROP.LAYOUT_ORIENTATION]: 'string',
    [PROP.LAYOUT_LOD_ENABLED]: 'boolean',
    [PROP.LAYOUT_LOD_THRESHOLDS]: 'array',
    [PROP.LAYOUT_H_SPACING]: 'number',
    [PROP.LAYOUT_V_SPACING]: 'number',
    [PROP.MAP_CREATED_BY]: 'string',
    [PROP.NODE_CONTENT_TYPE]: 'string',
    [PROP.LINK_CONNECTION_TYPE]: 'string'
  }

  return propertyTypes[propertyName] || 'unknown'
}

/**
 * Validate property value against expected type
 */
export function validatePropertyValue(propertyName: PropertyName, value: unknown): boolean {
  const expectedType = getExpectedPropertyType(propertyName)
  return validatePropertyType(propertyName, value, expectedType)
}

/**
 * Validate all properties in an object
 */
export function validateAllPropertyValues(obj: Partial<Record<PropertyName, unknown>>): boolean {
  let isValid = true

  for (const [propertyName, value] of Object.entries(obj)) {
    if (!validatePropertyValue(propertyName as PropertyName, value)) {
      isValid = false
    }
  }

  return isValid
}
