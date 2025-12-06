/**
 * Command Definitions Index
 *
 * Central export for all command definitions.
 * Import and register these at app startup.
 */

export { nodeCommands } from './nodeCommands'
export { viewCommands } from './viewCommands'
export { editCommands } from './editCommands'
export { paletteCommands } from './paletteCommands'

import { nodeCommands } from './nodeCommands'
import { viewCommands } from './viewCommands'
import { editCommands } from './editCommands'
import { paletteCommands } from './paletteCommands'
import type { Command } from '../types'

/**
 * All commands combined
 */
export const allCommands: Command[] = [
  ...nodeCommands,
  ...viewCommands,
  ...editCommands,
  ...paletteCommands,
]

/**
 * Register all commands with the command system
 */
export function registerAllCommands(
  registerFn: (commands: Command[]) => void
): void {
  registerFn(allCommands)
}

