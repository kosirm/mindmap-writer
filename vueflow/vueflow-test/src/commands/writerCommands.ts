/**
 * Writer Commands
 * 
 * Commands specific to writer view operations: formatting, navigation, etc.
 */

import type { Command } from './types';

export const writerCommands: Command[] = [
  {
    id: 'writer.bold',
    label: 'Bold',
    icon: 'format_bold',
    category: 'writer',
    keybinding: 'Ctrl+B',
    tooltip: 'Toggle bold formatting',
    showInPalette: true,
    execute: () => {
      // TODO: Implement bold
      console.log('Toggle bold...');
    },
  },
  
  {
    id: 'writer.italic',
    label: 'Italic',
    icon: 'format_italic',
    category: 'writer',
    keybinding: 'Ctrl+I',
    tooltip: 'Toggle italic formatting',
    showInPalette: true,
    execute: () => {
      // TODO: Implement italic
      console.log('Toggle italic...');
    },
  },
  
  {
    id: 'writer.underline',
    label: 'Underline',
    icon: 'format_underlined',
    category: 'writer',
    keybinding: 'Ctrl+U',
    tooltip: 'Toggle underline formatting',
    showInPalette: true,
    execute: () => {
      // TODO: Implement underline
      console.log('Toggle underline...');
    },
  },
  
  {
    id: 'writer.strikethrough',
    label: 'Strikethrough',
    icon: 'strikethrough_s',
    category: 'writer',
    tooltip: 'Toggle strikethrough formatting',
    showInPalette: true,
    execute: () => {
      // TODO: Implement strikethrough
      console.log('Toggle strikethrough...');
    },
  },
  
  {
    id: 'writer.code',
    label: 'Code',
    icon: 'code',
    category: 'writer',
    keybinding: 'Ctrl+`',
    tooltip: 'Toggle code formatting',
    showInPalette: true,
    execute: () => {
      // TODO: Implement code
      console.log('Toggle code...');
    },
  },
  
  {
    id: 'writer.link',
    label: 'Insert Link',
    icon: 'insert_link',
    category: 'writer',
    keybinding: 'Ctrl+K',
    tooltip: 'Insert or edit link',
    showInPalette: true,
    execute: () => {
      // TODO: Implement link
      console.log('Insert link...');
    },
  },
  
  {
    id: 'writer.bulletList',
    label: 'Bullet List',
    icon: 'format_list_bulleted',
    category: 'writer',
    tooltip: 'Toggle bullet list',
    showInPalette: true,
    execute: () => {
      // TODO: Implement bullet list
      console.log('Toggle bullet list...');
    },
  },
  
  {
    id: 'writer.numberedList',
    label: 'Numbered List',
    icon: 'format_list_numbered',
    category: 'writer',
    tooltip: 'Toggle numbered list',
    showInPalette: true,
    execute: () => {
      // TODO: Implement numbered list
      console.log('Toggle numbered list...');
    },
  },
  
  {
    id: 'writer.increaseIndent',
    label: 'Increase Indent',
    icon: 'format_indent_increase',
    category: 'writer',
    keybinding: 'Tab',
    tooltip: 'Increase indentation',
    showInPalette: true,
    execute: () => {
      // TODO: Implement increase indent
      console.log('Increase indent...');
    },
  },
  
  {
    id: 'writer.decreaseIndent',
    label: 'Decrease Indent',
    icon: 'format_indent_decrease',
    category: 'writer',
    keybinding: 'Shift+Tab',
    tooltip: 'Decrease indentation',
    showInPalette: true,
    execute: () => {
      // TODO: Implement decrease indent
      console.log('Decrease indent...');
    },
  },
  
  {
    id: 'writer.clearFormatting',
    label: 'Clear Formatting',
    icon: 'format_clear',
    category: 'writer',
    tooltip: 'Remove all formatting',
    showInPalette: true,
    execute: () => {
      // TODO: Implement clear formatting
      console.log('Clear formatting...');
    },
  },
];

