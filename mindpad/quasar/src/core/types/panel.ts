/**
 * Panel type definitions
 */

import type { ViewType } from './view'

export type PanelPosition = 'left' | 'center' | 'right'

export interface PanelState {
  position: PanelPosition
  viewType: ViewType
  isCollapsed: boolean
  width: number // percentage or pixels
  minWidth: number
}

export interface PanelConfig {
  left: PanelState
  center: PanelState
  right: PanelState
}

export const DEFAULT_PANEL_CONFIG: PanelConfig = {
  left: {
    position: 'left',
    viewType: 'outline',
    isCollapsed: false,
    width: 250,
    minWidth: 200
  },
  center: {
    position: 'center',
    viewType: 'mindmap',
    isCollapsed: false,
    width: 0, // flex: 1
    minWidth: 400
  },
  right: {
    position: 'right',
    viewType: 'writer',
    isCollapsed: false,
    width: 350,
    minWidth: 250
  }
}

