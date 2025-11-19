# Troubleshooting Guide

**Last Updated:** 2025-11-19

---

## Vue Reactivity Issues

### ❌ Computed Property Not Updating

**Symptom:** Computed property doesn't react to changes in reactive values

**Common Causes:**
1. Wrapping reactive value in function call
2. Not directly referencing the `.value`

**Solution:**
```typescript
// ❌ WRONG - Function call breaks reactivity
const isActive = computed(() => checkIfActive(id));

// ✅ CORRECT - Direct reference
const isActive = computed(() => activeId.value === id);
```

---

### ❌ Circular Dependency in Computed

**Symptom:** Computed property shows stale data or doesn't update

**Common Causes:**
1. Computed depends on ref that's set after computed runs
2. Computed checks multiple reactive values with timing issues

**Solution:**
```typescript
// ❌ WRONG - Circular dependency
const isEditing = computed(() => {
  return activeNodeId.value === props.id && localEditor.value !== null;
});

// ✅ CORRECT - Single dependency
const isEditing = computed(() => {
  return activeNodeId.value === props.id;
});
```

---

### ❌ Array Reactivity Not Working

**Symptom:** Changes to array don't trigger updates

**Common Causes:**
1. Using `splice()` instead of `filter()`
2. Mutating array directly

**Solution:**
```typescript
// ❌ WRONG - splice() doesn't trigger reactivity properly
const index = edges.value.findIndex(e => e.id === edgeId);
edges.value.splice(index, 1);

// ✅ CORRECT - filter() creates new array
edges.value = edges.value.filter(e => e.id !== edgeId);
```

---

## Event Handling Issues

### ❌ Keyboard Events Bubbling to Parent

**Symptom:** Typing in editor triggers parent component actions

**Common Causes:**
1. Not stopping event propagation
2. Events bubble up to Vue Flow or other parent handlers

**Solution:**
```vue
<!-- ✅ CORRECT - Stop propagation -->
<div 
  @keydown.stop
  @keyup.stop
  @keypress.stop
>
  <EditorContent :editor="editor" />
</div>
```

---

### ❌ ESLint Error: Promise in Void Context

**Symptom:** "Promise returned in function argument where a void return was expected"

**Common Causes:**
1. Using `async` function as event handler
2. Not handling Promise return value

**Solution:**
```typescript
// ❌ WRONG - async returns Promise
async function handleEvent() {
  await nextTick();
}
eventBus.on('event', handleEvent);  // ESLint error!

// ✅ CORRECT - Use void operator
function handleEvent() {
  void nextTick(() => {
    // ...
  });
}
eventBus.on('event', handleEvent);  // No error!
```

---

## Tiptap Issues

### ❌ Editor Not Showing

**Symptom:** Editor doesn't appear when trying to edit

**Common Causes:**
1. `activeNodeId` not set correctly
2. `isEditing` computed not updating
3. Editor destroyed immediately after creation

**Solution:**
1. Check `activeNodeId.value` is set to correct node ID
2. Verify `isEditing` computed only depends on `activeNodeId`
3. Make sure `destroyActiveEditor()` doesn't clear `activeNodeId`

---

### ❌ Editor Loses Focus Immediately

**Symptom:** Editor appears but loses focus right away

**Common Causes:**
1. Parent component stealing focus
2. Vue Flow intercepting events

**Solution:**
```typescript
// Use autofocus in editor config
const editor = new Editor({
  autofocus: 'end',  // Focus at end of content
  // ...
});
```

---

## Vue Flow Issues

### ❌ Double-Click Triggers Zoom Instead of Custom Action

**Symptom:** Double-clicking node zooms instead of editing

**Common Causes:**
1. Vue Flow intercepts double-click for zoom
2. Custom handler not preventing default

**Solution:**
Use keyboard shortcut instead of double-click:
```typescript
// ✅ CORRECT - Use E key
if (event.key === 'e' && selectedNodeId.value) {
  eventBus.emit('node:edit-start', { nodeId: selectedNodeId.value });
}
```

---

### ❌ Connection Preview Line Different from Final

**Symptom:** Preview line is curved but final connection is straight

**Common Causes:**
1. Different types for preview and final edges
2. Missing `connection-line-type` prop

**Solution:**
```vue
<VueFlow
  connection-line-type="straight"
  :default-edge-options="{ type: 'straight' }"
>
```

---

## LocalStorage Issues

### ❌ Data Not Persisting

**Symptom:** Saved mindmaps disappear after refresh

**Common Causes:**
1. Not saving master list after changes
2. Using wrong localStorage keys
3. Browser in private/incognito mode

**Solution:**
```typescript
// Always save master list after changes
function saveCurrentMindmap() {
  // ... save individual mindmap
  saveMindmapsList();  // Don't forget this!
}
```

---

### ❌ Node Counter Conflicts After Load

**Symptom:** New nodes have duplicate IDs after loading

**Common Causes:**
1. Not updating `nodeCounter` after load
2. Counter not accounting for loaded node IDs

**Solution:**
```typescript
// Update counter after loading
const maxId = Math.max(...nodes.value.map(n => parseInt(n.id) || 0), 0);
nodeCounter = maxId + 1;
```

---

## Styling Issues

### ❌ Library Styles Overriding Custom Styles

**Symptom:** Custom CSS not applying to library components

**Common Causes:**
1. Library styles have higher specificity
2. Not using `!important` when necessary

**Solution:**
```css
/* Use !important to override library styles */
.center-handle {
  background: transparent !important;
  opacity: 0 !important;
}
```

---

### ❌ HTML Content Has Unwanted Margins

**Symptom:** `v-html` content has default paragraph margins

**Common Causes:**
1. Browser default styles for `<p>` tags
2. Not using `:deep()` to style HTML content

**Solution:**
```css
/* Use :deep() to style v-html content */
.node-title :deep(p) {
  margin: 0;
  padding: 0;
}
```

---

## General Debugging Tips

### 1. Use Console Logs Strategically

```typescript
console.log('[Component] Event:', eventName, payload);
console.log('[Component] State:', { activeId, isEditing, hasEditor });
```

### 2. Check Event Bus Wildcard Listener

```typescript
// In dev mode, all events are logged
eventBus.on('*', (type, payload) => {
  console.log(`[Event Bus] ${String(type)}`, payload);
});
```

### 3. Verify Reactivity with Watchers

```typescript
watch(activeNodeId, (newValue) => {
  console.log('[Watch] activeNodeId changed:', newValue);
});
```

### 4. Check Vue DevTools

- Inspect component state
- Verify reactive values
- Check event timeline

---

**Need more help?** Check the detailed documentation:
- `TIPTAP_INTEGRATION.md` - Tiptap issues
- `EVENT_BUS_ARCHITECTURE.md` - Event issues
- `LESSONS_LEARNED.md` - Common mistakes
- `LOCALSTORAGE_SYSTEM.md` - Storage issues


