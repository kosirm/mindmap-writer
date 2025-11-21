/**
 * Command Registry Index
 * 
 * Central export point for all commands.
 * Import and register all commands here.
 */

export * from './types';
export { fileCommands } from './fileCommands';
export { editCommands } from './editCommands';
export { viewCommands } from './viewCommands';
export { mindmapCommands } from './mindmapCommands';
export { writerCommands } from './writerCommands';

import { fileCommands } from './fileCommands';
import { editCommands } from './editCommands';
import { viewCommands } from './viewCommands';
import { mindmapCommands } from './mindmapCommands';
import { writerCommands } from './writerCommands';

/**
 * All commands combined
 */
export const allCommands = [
  ...fileCommands,
  ...editCommands,
  ...viewCommands,
  ...mindmapCommands,
  ...writerCommands,
];

