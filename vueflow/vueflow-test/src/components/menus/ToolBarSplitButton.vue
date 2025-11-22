<template>
  <div class="toolbar-split-button">
    <!-- Main button showing current selection -->
    <q-btn
      flat
      dense
      round
      :icon="currentIcon"
      :disable="!isAnyCommandAvailable"
      :class="['toolbar-button', { 'toolbar-button-active': isCurrentCommandActive }]"
    >
      <q-tooltip>
        {{ currentTooltip }}
        <span v-if="currentKeybinding" class="keybinding">
          ({{ currentKeybinding }})
        </span>
      </q-tooltip>
      
      <!-- Dropdown menu -->
      <q-menu
        anchor="bottom middle"
        self="top middle"
        :offset="[0, 4]"
      >
        <q-list dense class="split-button-menu">
          <q-item
            v-for="(item, index) in items"
            :key="index"
            clickable
            v-close-popup
            :disable="!isCommandAvailable(item.command)"
            :active="isCommandActive(item.command)"
            @click="executeCommand(item.command)"
            class="split-button-item"
          >
            <q-item-section avatar>
              <q-icon :name="getItemIcon(item)" size="18px" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ getItemLabel(item) }}</q-item-label>
            </q-item-section>
            <q-item-section side v-if="getCommandKeybinding(item.command)">
              <q-item-label caption class="keybinding">
                {{ getCommandKeybinding(item.command) }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-btn>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useCommands } from '../../composables/useCommands';
import type { MenuItem, CommandContext } from '../../commands/types';

interface Props {
  items: MenuItem[];
  activeCommandGetter?: (context: CommandContext) => string; // Function to determine which command is currently active
}

const props = defineProps<Props>();

const { getCommand, isCommandAvailable, executeCommand: execCommand, getContext } = useCommands();

// Get the currently active command
const activeCommand = computed(() => {
  if (props.activeCommandGetter) {
    const context = getContext();
    return props.activeCommandGetter(context);
  }
  // Default: return first available command
  return props.items.find(item => isCommandAvailable(item.command))?.command || props.items[0]?.command || '';
});

// Current button properties based on active command
const currentIcon = computed(() => {
  const item = props.items.find(i => i.command === activeCommand.value);
  const fallback = props.items[0];
  if (!item && !fallback) return 'help_outline';
  return getItemIcon(item || fallback!);
});

const currentTooltip = computed(() => {
  const item = props.items.find(i => i.command === activeCommand.value);
  const fallback = props.items[0];
  if (!item && !fallback) return '';
  return getItemTooltip(item || fallback!);
});

const currentKeybinding = computed(() => {
  if (!activeCommand.value) return '';
  return getCommandKeybinding(activeCommand.value);
});

const isCurrentCommandActive = computed(() => {
  if (!activeCommand.value) return false;
  return isCommandActive(activeCommand.value);
});

const isAnyCommandAvailable = computed(() => {
  return props.items.some(item => isCommandAvailable(item.command));
});

// Helper functions
function getItemIcon(item: MenuItem): string {
  if (item.icon) return item.icon;
  const command = getCommand(item.command);
  return command?.icon || 'help_outline';
}

function getItemLabel(item: MenuItem): string {
  const command = getCommand(item.command);
  return command?.label || item.command;
}

function getItemTooltip(item: MenuItem): string {
  const command = getCommand(item.command);
  return command?.tooltip || command?.label || item.command;
}

function getCommandKeybinding(commandId: string): string {
  const command = getCommand(commandId);
  return command?.keybinding || '';
}

function isCommandActive(commandId: string): boolean {
  return commandId === activeCommand.value;
}

async function executeCommand(commandId: string) {
  await execCommand(commandId);
}
</script>

<style scoped lang="scss">
.toolbar-split-button {
  display: inline-flex;
  align-items: center;
}

.toolbar-button {
  width: 30px;
  height: 30px;
  color: rgba(0, 0, 0, 0.6);
  transition: all 0.2s ease;
}

.toolbar-button:hover {
  color: rgba(0, 0, 0, 0.87);
  background-color: rgba(0, 0, 0, 0.04);
}

.toolbar-button :deep(.q-icon) {
  font-size: 18px;
}

.toolbar-button-active {
  color: #1976d2 !important;
  background-color: rgba(25, 118, 210, 0.08) !important;
}

.toolbar-button-active:hover {
  color: #1976d2 !important;
  background-color: rgba(25, 118, 210, 0.12) !important;
}

.split-button-menu {
  min-width: 200px;
  padding: 4px 0;
}

.split-button-item {
  min-height: 36px;
  padding: 4px 12px;
}

.split-button-item.q-item--active {
  background-color: rgba(25, 118, 210, 0.08);
  color: #1976d2;
}

.keybinding {
  opacity: 0.7;
  font-size: 11px;
  margin-left: 4px;
}
</style>

