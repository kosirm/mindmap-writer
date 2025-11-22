# Menu System Troubleshooting Guide

## TypeScript Errors

### Error: "Module has no exported member 'updateContext'"

**Problem**: `updateContext` is not exported from `useCommands.ts`

**Solution**: Export it as a standalone function:

```typescript
// In useCommands.ts
export function updateContext(updates: Partial<CommandContext>) {
  commandContext.value = { ...commandContext.value, ...updates };
}
```

### Error: "This expression is not callable. Type '{}' has no call signatures"

**Problem**: Function types not defined in CommandContext interface

**Solution**: Add function signatures to `commands/types.ts`:

```typescript
export interface CommandContext {
  // ... existing properties
  myFunction?: () => void;
  myFunctionWithParams?: (param: string) => void;
}
```

### Error: "Cannot access 'X' before initialization"

**Problem**: Using a variable in a watcher before it's declared

**Solution**: Move the watcher after all variable declarations:

```typescript
// Declare variables first
const matterEnabled = ref(false);
const getSelectedNodes = computed(() => ...);

// Then add watchers
watch([() => getSelectedNodes.value.length, matterEnabled], () => {
  updateCommandContext();
});
```

### Error: "Property 'X' does not exist on type 'CommandContext'"

**Problem**: Using a property that's not in the interface

**Solution**: Add it to CommandContext with optional chaining:

```typescript
// In types.ts
export interface CommandContext {
  [key: string]: unknown;  // Allows any property
  // OR be explicit:
  myProperty?: boolean;
}
```

## Runtime Errors

### Error: "ReferenceError: Cannot access 'getSelectedNodes' before initialization"

**Problem**: Watcher is defined before the computed property

**Solution**: Move watcher to after all refs/computed are defined, or use it in `onMounted`:

```typescript
onMounted(() => {
  watch([() => getSelectedNodes.value.length, matterEnabled], () => {
    updateCommandContext();
  }, { flush: 'post' });
});
```

### Error: Commands not executing

**Checklist**:
1. ✅ Function added to context in `updateCommandContext()`?
2. ✅ Function type added to `CommandContext` interface?
3. ✅ Command checks for function: `if (context?.myFunction)`?
4. ✅ Context updated on mount: `updateCommandContext()` in `onMounted`?
5. ✅ Watcher set up to update context on state changes?

**Solution**: Follow all 5 steps above.

### Error: Conditional commands not appearing/disappearing

**Problem**: `when` condition not evaluating correctly

**Debug**:
```typescript
{
  when: (context) => {
    console.log('Context:', context);
    console.log('matterEnabled:', context?.matterEnabled);
    return context?.matterEnabled === false;
  },
}
```

**Solution**: Ensure context property is updated and watcher is firing.

## Performance Issues

### Issue: Dragging nodes is slow/laggy

**Causes**:
1. Watcher firing too often
2. Watching full reactive arrays instead of properties
3. Heavy operations in context update

**Solutions**:

1. **Use `flush: 'post'`**:
```typescript
watch([...], () => {
  updateCommandContext();
}, { flush: 'post' });  // Updates after DOM updates
```

2. **Watch specific properties, not full arrays**:
```typescript
// ❌ Bad - watches entire array
watch([getSelectedNodes, matterEnabled], ...)

// ✅ Good - only watches length
watch([() => getSelectedNodes.value.length, matterEnabled], ...)
```

3. **Debounce updates**:
```typescript
import { useDebounceFn } from '@vueuse/core';

const debouncedUpdate = useDebounceFn(() => {
  updateCommandContext();
}, 50);

watch([...], () => {
  debouncedUpdate();
});
```

4. **Minimize context updates**:
```typescript
// Only update what changed
function updateCommandContext() {
  updateContext({
    selectedNodeIds: getSelectedNodes.value.map(n => n.id),
    matterEnabled: matterEnabled.value,
    // Don't include functions that never change
  });
}
```

### Issue: UI freezes when clicking buttons

**Problem**: Synchronous heavy operations in command execution

**Solution**: Make operations async or use `nextTick`:

```typescript
execute: async (context) => {
  await nextTick();  // Let UI update first
  if (context?.heavyOperation) {
    await context.heavyOperation();
  }
},
```

## UI Issues

### Issue: Button not showing active state

**Problem**: `isCommandActive()` not implemented or CSS not applied

**Solution**:

1. **Add logic in ToolBar.vue**:
```typescript
function isCommandActive(commandId: string): boolean {
  if (commandId === 'mindmap.toggleCollisions') {
    const context = getContext();
    return context.matterEnabled === true;
  }
  return false;
}
```

2. **Add CSS class binding**:
```vue
<q-btn
  :class="['toolbar-button', { 'toolbar-button-active': isCommandActive(item.command) }]"
/>
```

3. **Add CSS styles**:
```scss
.toolbar-button-active {
  color: #1976d2 !important;
  background-color: rgba(25, 118, 210, 0.08) !important;
}
```

### Issue: Icons not displaying correctly

**Problem**: Icon name incorrect or not in Material Icons

**Solution**: Check icon name at https://fonts.google.com/icons

```typescript
// ✅ Correct
icon: 'scatter_plot'

// ❌ Wrong
icon: 'scatter-plot'  // Use underscore, not dash
```

### Issue: Tooltips not showing

**Problem**: Tooltip text not defined

**Solution**: Add tooltip to command definition:

```typescript
{
  id: 'my.command',
  label: 'My Command',
  tooltip: 'This is what the command does',  // Add this
  // ...
}
```

### Issue: View icons too large/small

**Problem**: Icon size not matching design

**Solution**: Adjust CSS in VueFlowTest.vue:

```scss
.view-icon {
  width: 14px;   // Adjust size
  height: 14px;
  font-size: 18px;  // Adjust icon size
  // ...
}
```

## ESLint Errors

### Error: "'any' is not allowed"

**Solution**: Use `unknown` instead:

```typescript
// ❌ Bad
[key: string]: any;

// ✅ Good
[key: string]: unknown;
```

### Error: "Async function has no await"

**Solution**: Remove `async` if not needed:

```typescript
// ❌ Bad
execute: async (context) => {
  context.myFunction();
},

// ✅ Good
execute: (context) => {
  context.myFunction();
},
```

### Error: "Variable is defined but never used"

**Solution**: Remove unused imports/variables or prefix with underscore:

```typescript
// If truly unused
// import { computed } from 'vue';  // Remove

// If needed for future
const _reserved = ref(null);  // Prefix with underscore
```

## Common Mistakes

### 1. Forgetting to register commands

**Problem**: Commands defined but not showing in UI

**Solution**: Ensure commands are exported and imported:

```typescript
// In mindmapCommands.ts
export const mindmapCommands: Command[] = [
  // ... commands
];

// In index.ts
export * from './mindmapCommands';

// In useMenuSystem.ts
import { allCommands } from '../commands';
registerCommands(allCommands);
```

### 2. Not updating context on mount

**Problem**: Commands disabled on initial load

**Solution**: Call `updateCommandContext()` in `onMounted`:

```typescript
onMounted(() => {
  // ... other initialization
  updateCommandContext();
});
```

### 3. Using wrong command ID

**Problem**: Command not executing when clicked

**Solution**: Ensure command ID matches exactly:

```typescript
// In command definition
{ id: 'mindmap.runLayout', ... }

// In menu config
{ command: 'mindmap.runLayout' }  // Must match exactly
```

### 4. Duplicate icons

**Problem**: Multiple commands with same icon

**Solution**: Use unique icons for each command:

```typescript
// ❌ Bad - both use same icon
{ id: 'mindmap.runLayout', icon: 'auto_fix_high' }
{ id: 'mindmap.resolveOverlaps', icon: 'auto_fix_high' }

// ✅ Good - unique icons
{ id: 'mindmap.runLayout', icon: 'scatter_plot' }
{ id: 'mindmap.resolveOverlaps', icon: 'auto_fix_high' }
```

## Quick Fixes

### Reset command system

If everything is broken, try this:

```typescript
// 1. Clear all commands
const { getAllCommands } = useCommands();
getAllCommands().forEach(cmd => unregisterCommand(cmd.id));

// 2. Re-register
registerCommands(allCommands);

// 3. Update context
updateCommandContext();
```

### Debug command execution

Add logging to see what's happening:

```typescript
execute: (context) => {
  console.log('Command executed:', context);
  if (context?.myFunction) {
    console.log('Calling myFunction');
    context.myFunction();
  } else {
    console.warn('myFunction not found in context');
  }
},
```

### Check command availability

```typescript
const { isCommandAvailable, getContext } = useCommands();
console.log('Command available?', isCommandAvailable('mindmap.runLayout'));
console.log('Current context:', getContext());
```

## Getting Help

If you're still stuck:

1. Check this troubleshooting guide
2. Review `menu-system-quick-start.md`
3. Look at working examples in `mindmapCommands.ts` and `fileCommands.ts`
4. Check TypeScript errors with `npx vue-tsc --noEmit`
5. Check ESLint errors with `npm run lint`
6. Add console.log statements to debug
7. Ask for help with specific error messages

## Summary

Most issues fall into these categories:
- ✅ TypeScript types not matching
- ✅ Context not updated properly
- ✅ Watchers defined in wrong order
- ✅ Performance issues from watching full arrays
- ✅ Missing function references in context

Follow this guide to quickly resolve issues! 🔧

