<template>
  <div class="top-bar-menu">
    <q-btn-dropdown
      v-for="(items, menuName) in menus"
      :key="menuName"
      flat
      dense
      no-caps
      :label="capitalize(menuName)"
      class="menu-button"
    >
      <q-list dense>
        <template v-for="(item, index) in items" :key="index">
          <!-- Separator between groups -->
          <q-separator
            v-if="index > 0 && item.group !== items[index - 1]?.group"
            :key="`sep-${index}`"
          />
          
          <!-- Menu item with submenu -->
          <q-item
            v-if="item.submenu"
            clickable
            v-close-popup
          >
            <q-item-section>
              <q-item-label>{{ getItemLabel(item) }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon name="chevron_right" />
            </q-item-section>
            
            <q-menu anchor="top end" self="top start">
              <q-list dense>
                <q-item
                  v-for="(subItem, subIndex) in item.submenu"
                  :key="subIndex"
                  clickable
                  v-close-popup
                  :disable="!isCommandAvailable(subItem.command)"
                  @click="executeCommand(subItem.command)"
                >
                  <q-item-section v-if="getCommandIcon(subItem.command)" avatar>
                    <q-icon :name="getCommandIcon(subItem.command)" size="18px" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ getItemLabel(subItem) }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-item-label caption>{{ getCommandKeybinding(subItem.command) }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-item>
          
          <!-- Regular menu item -->
          <q-item
            v-else
            clickable
            v-close-popup
            :disable="!isCommandAvailable(item.command)"
            @click="executeCommand(item.command)"
          >
            <q-item-section v-if="getCommandIcon(item.command)" avatar>
              <q-icon :name="getCommandIcon(item.command)" size="18px" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ getItemLabel(item) }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-item-label caption>{{ getCommandKeybinding(item.command) }}</q-item-label>
            </q-item-section>
          </q-item>
        </template>
      </q-list>
    </q-btn-dropdown>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useCommands } from '../../composables/useCommands';
import { topBarMenus } from '../../config/menus';
import type { MenuItem } from '../../commands/types';

const { getCommand, isCommandAvailable, executeCommand: execCommand } = useCommands();

const menus = computed(() => topBarMenus);

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getItemLabel(item: MenuItem): string {
  if (item.label) return item.label;
  const command = getCommand(item.command);
  return command?.label || item.command;
}

function getCommandIcon(commandId: string): string | undefined {
  const command = getCommand(commandId);
  return command?.icon;
}

function getCommandKeybinding(commandId: string): string {
  const command = getCommand(commandId);
  return command?.keybinding || '';
}

async function executeCommand(commandId: string) {
  await execCommand(commandId);
}
</script>

<style scoped lang="scss">
.top-bar-menu {
  display: flex;
  gap: 4px;
}

.menu-button {
  font-size: 14px;
  padding: 4px 12px;
  min-height: 32px;
}

.menu-button :deep(.q-btn__content) {
  font-weight: 400;
}
</style>

