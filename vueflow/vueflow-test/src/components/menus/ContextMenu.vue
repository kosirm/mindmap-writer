<template>
  <q-menu
    ref="menuRef"
    touch-position
    context-menu
    @before-show="onBeforeShow"
  >
    <q-list dense style="min-width: 200px">
      <template v-for="(item, index) in visibleItems" :key="index">
        <!-- Separator between groups -->
        <q-separator
          v-if="index > 0 && item.group !== visibleItems[index - 1]?.group"
          :key="`sep-${index}`"
        />
        
        <!-- Menu item -->
        <q-item
          clickable
          v-close-popup
          :disable="!isCommandAvailable(item.command)"
          @click="executeCommand(item.command)"
        >
          <q-item-section v-if="getItemIcon(item)" avatar>
            <q-icon :name="getItemIcon(item)" size="18px" />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ getItemLabel(item) }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-item-label caption>{{ getCommandKeybinding(item.command) }}</q-item-label>
          </q-item-section>
        </q-item>
      </template>
      
      <!-- Empty state -->
      <q-item v-if="visibleItems.length === 0" disable>
        <q-item-section>
          <q-item-label class="text-grey-6">No actions available</q-item-label>
        </q-item-section>
      </q-item>
    </q-list>
  </q-menu>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useCommands } from '../../composables/useCommands';
import type { MenuItem } from '../../commands/types';

interface Props {
  items: MenuItem[];
}

const props = defineProps<Props>();

const { getCommand, isCommandAvailable, executeCommand: execCommand } = useCommands();

const menuRef = ref();

// Filter items based on availability
const visibleItems = computed(() => {
  return props.items.filter(item => {
    // Check if command exists
    const command = getCommand(item.command);
    if (!command) return false;
    
    // If item has a when condition, check it
    if (typeof item.when === 'function') {
      return item.when();
    }
    
    // Otherwise, show the item (it will be disabled if command is not available)
    return true;
  });
});

function getItemLabel(item: MenuItem): string {
  if (item.label) return item.label;
  const command = getCommand(item.command);
  return command?.label || item.command;
}

function getItemIcon(item: MenuItem): string | undefined {
  if (item.icon) return item.icon;
  const command = getCommand(item.command);
  return command?.icon;
}

function getCommandKeybinding(commandId: string): string {
  const command = getCommand(commandId);
  return command?.keybinding || '';
}

async function executeCommand(commandId: string) {
  await execCommand(commandId);
}

function onBeforeShow() {
  // This is called before the menu is shown
  // Can be used to update context or perform other actions
}

// Expose show method for parent components
function show(event: MouseEvent) {
  menuRef.value?.show(event);
}

function hide() {
  menuRef.value?.hide();
}

defineExpose({
  show,
  hide,
});
</script>

<style scoped lang="scss">
// Context menu styles are handled by Quasar
</style>

