<template>
  <div class="toolbar">
    <template v-for="(item, index) in items" :key="index">
      <!-- Separator between groups -->
      <q-separator
        v-if="index > 0 && item.group !== items[index - 1]?.group"
        vertical
        class="toolbar-separator"
      />
      
      <!-- Toolbar button -->
      <q-btn
        flat
        dense
        round
        :icon="getItemIcon(item)"
        :disable="!isCommandAvailable(item.command)"
        @click="executeCommand(item.command)"
        :class="['toolbar-button', { 'toolbar-button-active': isCommandActive(item.command) }]"
      >
        <q-tooltip>
          {{ getItemTooltip(item) }}
          <span v-if="getCommandKeybinding(item.command)" class="keybinding">
            ({{ getCommandKeybinding(item.command) }})
          </span>
        </q-tooltip>
      </q-btn>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useCommands } from '../../composables/useCommands';
import type { MenuItem } from '../../commands/types';

interface Props {
  items: MenuItem[];
}

const props = defineProps<Props>();

const { getCommand, isCommandAvailable, executeCommand: execCommand, getContext } = useCommands();

const items = computed(() => props.items);

function getItemIcon(item: MenuItem): string {
  if (item.icon) return item.icon;
  const command = getCommand(item.command);
  return command?.icon || 'help_outline';
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
  // Special case: collision toggle button is active when collisions are enabled
  if (commandId === 'mindmap.toggleCollisions') {
    const context = getContext();
    return context.matterEnabled === true;
  }
  return false;
}

async function executeCommand(commandId: string) {
  await execCommand(commandId);
}
</script>

<style scoped lang="scss">
.toolbar {
  display: flex;
  align-items: center;
  gap: 1px;
  padding: 0;
  background-color: transparent;
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

.toolbar-separator {
  height: 20px;
  margin: 0 6px;
  background-color: rgba(0, 0, 0, 0.08);
}

.keybinding {
  opacity: 0.7;
  font-size: 11px;
  margin-left: 4px;
}
</style>

