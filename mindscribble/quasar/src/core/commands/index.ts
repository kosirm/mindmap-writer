/**
 * Command system for user actions
 * Every action in the app goes through commands for:
 * - Keyboard shortcuts
 * - Command palette (Ctrl+Shift+P)
 * - Undo/redo support
 */

import { ref, computed } from 'vue'

export interface Command {
  id: string
  label: string
  icon?: string
  keybinding?: string
  category?: string
  execute: () => void | Promise<void>
  canExecute?: () => boolean
}

// Command registry
const commands = ref<Map<string, Command>>(new Map())

// Register a new command
export function registerCommand(command: Command): void {
  commands.value.set(command.id, command)
}

// Unregister a command
export function unregisterCommand(commandId: string): void {
  commands.value.delete(commandId)
}

// Execute a command by ID
export async function executeCommand(commandId: string): Promise<void> {
  const command = commands.value.get(commandId)
  if (!command) {
    console.warn(`Command not found: ${commandId}`)
    return
  }

  if (command.canExecute && !command.canExecute()) {
    console.warn(`Command cannot execute: ${commandId}`)
    return
  }

  await command.execute()
}

// Get all commands
export function getAllCommands(): Command[] {
  return Array.from(commands.value.values())
}

// Get command by ID
export function getCommand(commandId: string): Command | undefined {
  return commands.value.get(commandId)
}

// Get commands by category
export function getCommandsByCategory(category: string): Command[] {
  return getAllCommands().filter((cmd) => cmd.category === category)
}

// Search commands by label
export function searchCommands(query: string): Command[] {
  const lowerQuery = query.toLowerCase()
  return getAllCommands().filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(lowerQuery) ||
      cmd.id.toLowerCase().includes(lowerQuery)
  )
}

// Composable for command system
export function useCommands() {
  return {
    commands: computed(() => getAllCommands()),
    registerCommand,
    unregisterCommand,
    executeCommand,
    getCommand,
    getCommandsByCategory,
    searchCommands
  }
}

