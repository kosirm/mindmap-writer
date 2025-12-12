<template>
  <q-item
    clickable
    class="command-item"
    :class="{ 'is-selected': isSelected }"
    @click="$emit('click')"
  >
    <!-- Icon -->
    <q-item-section avatar>
      <q-icon :name="command.icon || 'chevron_right'" size="sm" />
    </q-item-section>

    <!-- Label & Description -->
    <q-item-section>
      <q-item-label>
        <span v-if="highlight" v-html="highlightText(command.label)" />
        <span v-else>{{ command.label }}</span>
      </q-item-label>
      <q-item-label v-if="command.description" caption class="description">
        {{ command.description }}
      </q-item-label>
    </q-item-section>

    <!-- Category Badge -->
    <q-item-section side>
      <div class="side-content">
        <q-badge
          v-if="command.category"
          :label="command.category"
          color="grey-7"
          text-color="white"
          class="category-badge"
        />
        <kbd v-if="command.keybinding" class="keybinding">
          {{ formatKeybinding(command.keybinding) }}
        </kbd>
        <q-btn
          flat
          round
          dense
          size="sm"
          :icon="isStarred ? 'star' : 'star_border'"
          :color="isStarred ? 'amber' : 'grey'"
          class="star-btn"
          @click.stop="$emit('toggle-star')"
        />
      </div>
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import type { Command } from 'src/core/commands/types'

interface Props {
  command: Command
  isSelected?: boolean
  isStarred?: boolean
  highlight?: string
}

const props = withDefaults(defineProps<Props>(), {
  isSelected: false,
  isStarred: false,
  highlight: '',
})

defineEmits<{
  click: []
  'toggle-star': []
}>()

// Format keybinding for display
function formatKeybinding(kb: string): string {
  // Keep the keybinding as-is for better readability
  // e.g., "Ctrl+Shift+S" instead of "⌃⇧S"
  return kb
}

// Highlight matching text
function highlightText(text: string): string {
  if (!props.highlight) return text
  const regex = new RegExp(`(${escapeRegex(props.highlight)})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
</script>

<style lang="scss" scoped>
.command-item {
  border-radius: 4px;
  margin: 2px 8px;
  transition: background 0.1s ease;

  &.is-selected {
    background: rgba(25, 118, 210, 0.2); // Primary blue with opacity
    outline: 1px solid rgba(25, 118, 210, 0.4);
  }

  &:hover:not(.is-selected) {
    background: rgba(128, 128, 128, 0.1);
  }

  &:hover .star-btn {
    opacity: 1;
  }
}

.description {
  font-size: 11px;
  opacity: 0.7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}

.side-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-badge {
  font-size: 10px;
  text-transform: capitalize;
}

.keybinding {
  background: rgba(128, 128, 128, 0.15);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 11px;
  font-family: monospace;
  color: inherit;
}

.star-btn {
  opacity: 0.3;
  transition: opacity 0.1s ease;
}

:deep(mark) {
  background: rgba(255, 235, 59, 0.4);
  padding: 0 2px;
  border-radius: 2px;
}
</style>

