<template>
  <q-dialog
    v-model="isOpen"
    position="top"
    seamless
    @hide="onHide"
  >
    <q-card class="command-palette" :class="{ 'dark-mode': isDark }">
      <!-- Search Input -->
      <q-card-section class="q-pa-sm">
        <q-input
          ref="searchInput"
          v-model="searchQuery"
          dense
          outlined
          placeholder="Type a command or search..."
          autofocus
          @keydown.up.prevent="navigateUp"
          @keydown.down.prevent="navigateDown"
          @keydown.enter.prevent="onEnter"
          @keydown.escape.prevent="onEscape"
        >
          <template #prepend>
            <q-icon name="search" />
          </template>
          <template #append>
            <kbd class="shortcut-badge">Ctrl+Shift+P</kbd>
          </template>
        </q-input>
      </q-card-section>

      <!-- Results List -->
      <q-card-section class="q-pa-none results-section">
        <!-- Starred Commands -->
        <div v-if="!searchQuery && starredCommands.length > 0" class="command-group">
          <div class="group-label">
            <q-icon name="star" size="xs" class="q-mr-xs" />
            Starred
          </div>
          <q-list dense>
            <CommandItem
              v-for="(cmd, i) in starredCommands"
              :key="cmd.id"
              :command="cmd"
              :is-selected="selectedIndex === i"
              :is-starred="true"
              @click="executeAndClose(cmd.id)"
              @toggle-star="toggleStar(cmd.id)"
            />
          </q-list>
        </div>

        <!-- Recent Commands -->
        <div v-if="!searchQuery && recentCommands.length > 0" class="command-group">
          <div class="group-label">
            <q-icon name="history" size="xs" class="q-mr-xs" />
            Recent
          </div>
          <q-list dense>
            <CommandItem
              v-for="(cmd, i) in recentCommands"
              :key="cmd.id"
              :command="cmd"
              :is-selected="selectedIndex === starredCommands.length + i"
              :is-starred="isStarred(cmd.id)"
              @click="executeAndClose(cmd.id)"
              @toggle-star="toggleStar(cmd.id)"
            />
          </q-list>
        </div>

        <!-- Search Results / All Commands -->
        <div class="command-group">
          <div v-if="searchQuery" class="group-label">
            Results ({{ filteredCommands.length }})
          </div>
          <div v-else-if="!starredCommands.length && !recentCommands.length" class="group-label">
            All Commands
          </div>
          <q-list dense>
            <CommandItem
              v-for="(cmd, i) in displayedCommands"
              :key="cmd.id"
              :command="cmd"
              :is-selected="searchQuery ? selectedIndex === i : selectedIndex === getDisplayIndex(i)"
              :is-starred="isStarred(cmd.id)"
              :highlight="searchQuery"
              @click="executeAndClose(cmd.id)"
              @toggle-star="toggleStar(cmd.id)"
            />
          </q-list>
        </div>

        <!-- No Results -->
        <div v-if="searchQuery && filteredCommands.length === 0" class="no-results">
          <q-icon name="search_off" size="md" class="q-mb-sm" />
          <div>No commands found for "{{ searchQuery }}"</div>
        </div>
      </q-card-section>

      <!-- Footer -->
      <q-card-section class="q-pa-xs footer">
        <div class="footer-hints">
          <span><kbd>↑↓</kbd> Navigate</span>
          <span><kbd>Enter</kbd> Execute</span>
          <span><kbd>Esc</kbd> Close</span>
          <span><kbd>Ctrl+Enter</kbd> Star</span>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { Dark } from 'quasar'
import { useAppStore } from 'src/core/stores'
import {
  searchCommands,
  executeCommand,
  isCommandAvailable,
  toggleStarred,
  isStarred,
  getStarredCommands,
  getRecentCommands,
} from 'src/core/commands'
import CommandItem from './CommandItem.vue'

// Store
const appStore = useAppStore()

// State
const searchQuery = ref('')
const selectedIndex = ref(0)
const searchInput = ref<HTMLInputElement | null>(null)

// Computed
const isOpen = computed({
  get: () => appStore.commandPaletteOpen,
  set: (val) => val ? appStore.openCommandPalette() : appStore.closeCommandPalette()
})

const isDark = computed(() => Dark.isActive)

const starredCommands = computed(() =>
  getStarredCommands().filter(cmd => isCommandAvailable(cmd.id))
)

const recentCommands = computed(() =>
  getRecentCommands()
    .filter(cmd => isCommandAvailable(cmd.id))
    .filter(cmd => !isStarred(cmd.id)) // Don't show in recent if starred
    .slice(0, 5)
)

const filteredCommands = computed(() =>
  searchCommands(searchQuery.value).filter(cmd => isCommandAvailable(cmd.id))
)

const displayedCommands = computed(() => {
  if (searchQuery.value) {
    return filteredCommands.value.slice(0, 20) // Limit results
  }
  // When no search, show remaining commands not in starred/recent
  const shown = new Set([
    ...starredCommands.value.map(c => c.id),
    ...recentCommands.value.map(c => c.id)
  ])
  return filteredCommands.value.filter(c => !shown.has(c.id)).slice(0, 10)
})

const totalItems = computed(() => {
  // When searching, only displayedCommands are shown
  if (searchQuery.value) {
    return displayedCommands.value.length
  }
  // Otherwise, all three sections
  return starredCommands.value.length + recentCommands.value.length + displayedCommands.value.length
})

// Calculate display index offset (only used when not searching)
function getDisplayIndex(i: number): number {
  return starredCommands.value.length + recentCommands.value.length + i
}

// Watch for dialog open to reset state
watch(isOpen, (open) => {
  if (open) {
    searchQuery.value = ''
    selectedIndex.value = 0
    void nextTick(() => {
      searchInput.value?.focus()
    })
  }
})

// Reset selection when search changes
watch(searchQuery, () => {
  selectedIndex.value = 0
})

// Get command at current selection index
function getSelectedCommand() {
  // When searching, directly index into displayedCommands
  if (searchQuery.value) {
    return displayedCommands.value[selectedIndex.value]
  }

  // Otherwise, navigate through starred -> recent -> displayed
  const starred = starredCommands.value
  const recent = recentCommands.value
  const displayed = displayedCommands.value

  if (selectedIndex.value < starred.length) {
    return starred[selectedIndex.value]
  }
  const recentIdx = selectedIndex.value - starred.length
  if (recentIdx < recent.length) {
    return recent[recentIdx]
  }
  const displayIdx = selectedIndex.value - starred.length - recent.length
  return displayed[displayIdx]
}

// Keyboard navigation
function navigateUp() {
  console.log('[CommandPalette] navigateUp called, current:', selectedIndex.value, 'total:', totalItems.value)
  selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
  console.log('[CommandPalette] navigateUp result:', selectedIndex.value)
}

function navigateDown() {
  console.log('[CommandPalette] navigateDown called, current:', selectedIndex.value, 'total:', totalItems.value)
  selectedIndex.value = Math.min(selectedIndex.value + 1, totalItems.value - 1)
  console.log('[CommandPalette] navigateDown result:', selectedIndex.value)
}

function onEnter(event: KeyboardEvent) {
  if (event.ctrlKey) {
    const cmd = getSelectedCommand()
    if (cmd) toggleStar(cmd.id)
  } else {
    const cmd = getSelectedCommand()
    if (cmd) void executeAndClose(cmd.id)
  }
}

function onEscape() {
  isOpen.value = false
}

// Execute command and close palette
async function executeAndClose(commandId: string) {
  isOpen.value = false
  await executeCommand(commandId)
}

// Toggle star
function toggleStar(commandId: string) {
  toggleStarred(commandId)
}

// Handle dialog hide
function onHide() {
  searchQuery.value = ''
  selectedIndex.value = 0
}
</script>

<style lang="scss" scoped>
.command-palette {
  width: 600px;
  max-width: 90vw;
  margin-top: 60px;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);

  &.dark-mode {
    background: #1e1e1e;
    border: 1px solid #333;
  }
}

.results-section {
  max-height: 400px;
  overflow-y: auto;
}

.command-group {
  &:not(:last-child) {
    border-bottom: 1px solid rgba(128, 128, 128, 0.2);
    padding-bottom: 8px;
    margin-bottom: 8px;
  }
}

.group-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: #888;
  padding: 4px 16px;
  display: flex;
  align-items: center;
}

.no-results {
  padding: 32px;
  text-align: center;
  color: #888;
}

.shortcut-badge {
  background: rgba(128, 128, 128, 0.2);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 11px;
  font-family: monospace;
}

.footer {
  border-top: 1px solid rgba(128, 128, 128, 0.2);
  background: rgba(128, 128, 128, 0.05);
}

.footer-hints {
  display: flex;
  gap: 16px;
  justify-content: center;
  font-size: 11px;
  color: #888;

  kbd {
    background: rgba(128, 128, 128, 0.2);
    border-radius: 3px;
    padding: 1px 4px;
    font-family: monospace;
  }
}
</style>

