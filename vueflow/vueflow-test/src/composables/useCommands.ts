/**
 * Command System Composable
 * 
 * Centralized command registry and execution system.
 * Provides a single source of truth for all application commands.
 */

import { ref } from 'vue';
import type { Command, CommandContext, KeyboardEventInfo } from '../commands/types';

// Global command registry
const commands = ref<Map<string, Command>>(new Map());

// Global command context (can be updated by different parts of the app)
const commandContext = ref<CommandContext>({});

/**
 * Update the global command context (exported for use outside composable)
 */
export function updateContext(updates: Partial<CommandContext>) {
  commandContext.value = { ...commandContext.value, ...updates };
}

/**
 * Main composable for command system
 */
export function useCommands() {
  /**
   * Register a command
   */
  function registerCommand(command: Command) {
    if (commands.value.has(command.id)) {
      console.warn(`Command ${command.id} is already registered. Overwriting.`);
    }
    commands.value.set(command.id, command);
  }

  /**
   * Register multiple commands at once
   */
  function registerCommands(commandList: Command[]) {
    commandList.forEach(cmd => registerCommand(cmd));
  }

  /**
   * Unregister a command
   */
  function unregisterCommand(commandId: string) {
    commands.value.delete(commandId);
  }

  /**
   * Get a command by ID
   */
  function getCommand(commandId: string): Command | undefined {
    return commands.value.get(commandId);
  }

  /**
   * Get all registered commands
   */
  function getAllCommands(): Command[] {
    return Array.from(commands.value.values());
  }

  /**
   * Get commands by category
   */
  function getCommandsByCategory(category: string): Command[] {
    return getAllCommands().filter(cmd => cmd.category === category);
  }

  /**
   * Check if a command is available (enabled) in the current context
   */
  function isCommandAvailable(commandId: string, context?: CommandContext): boolean {
    const command = getCommand(commandId);
    if (!command) return false;
    
    const ctx = context || commandContext.value;
    return command.when ? command.when(ctx) : true;
  }

  /**
   * Execute a command
   */
  async function executeCommand(commandId: string, context?: CommandContext): Promise<void> {
    const command = getCommand(commandId);
    if (!command) {
      console.error(`Command ${commandId} not found`);
      return;
    }

    const ctx = context || commandContext.value;
    
    // Check if command is available
    if (!isCommandAvailable(commandId, ctx)) {
      console.warn(`Command ${commandId} is not available in current context`);
      return;
    }

    try {
      await command.execute(ctx);
    } catch (error) {
      console.error(`Error executing command ${commandId}:`, error);
    }
  }

  /**
   * Update the global command context
   */
  function updateContext(updates: Partial<CommandContext>) {
    commandContext.value = { ...commandContext.value, ...updates };
  }

  /**
   * Get the current command context
   */
  function getContext(): CommandContext {
    return commandContext.value;
  }

  /**
   * Parse keybinding string to KeyboardEventInfo
   */
  function parseKeybinding(keybinding: string): KeyboardEventInfo {
    const parts = keybinding.toLowerCase().split('+');
    const key = parts[parts.length - 1] || '';

    return {
      key,
      ctrl: parts.includes('ctrl') || parts.includes('control'),
      shift: parts.includes('shift'),
      alt: parts.includes('alt'),
      meta: parts.includes('meta') || parts.includes('cmd'),
    };
  }

  /**
   * Check if keyboard event matches a keybinding
   */
  function matchesKeybinding(event: KeyboardEvent, keybinding: string): boolean {
    const parsed = parseKeybinding(keybinding);
    
    return (
      event.key.toLowerCase() === parsed.key &&
      event.ctrlKey === parsed.ctrl &&
      event.shiftKey === parsed.shift &&
      event.altKey === parsed.alt &&
      event.metaKey === parsed.meta
    );
  }

  /**
   * Find command by keybinding
   */
  function findCommandByKeybinding(event: KeyboardEvent): Command | undefined {
    return getAllCommands().find(cmd => 
      cmd.keybinding && matchesKeybinding(event, cmd.keybinding)
    );
  }

  return {
    // Registration
    registerCommand,
    registerCommands,
    unregisterCommand,
    
    // Query
    getCommand,
    getAllCommands,
    getCommandsByCategory,
    isCommandAvailable,
    
    // Execution
    executeCommand,
    
    // Context
    updateContext,
    getContext,
    
    // Keybindings
    parseKeybinding,
    matchesKeybinding,
    findCommandByKeybinding,
  };
}

