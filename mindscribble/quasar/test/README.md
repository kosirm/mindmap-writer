# Mindpad Testing Guide

## Overview

This project uses **Vitest** with **Bun** for fast, modern testing. The setup is optimized for testing Vue 3 components, Pinia stores, and Quasar components.

## Quick Start

```bash
# Run all tests once
bun run test

# Run tests in watch mode (auto-rerun on file changes)
bun run test:watch

# Run tests with UI (browser-based test viewer)
bun run test:ui

# Run tests with coverage report
bun run test:coverage
```

## Test Structure

### Test Locations
- `test/` - General test files and setup
- `src/**/*.test.ts` - Co-located component/store tests

### Test Files
- `*.test.ts` - Unit tests
- `*.spec.ts` - Specification tests
- `vitest.setup.ts` - Global test configuration

## Writing Tests

### Store Tests (Pinia)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useMyStore } from 'stores/myStore';

describe('MyStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should initialize with default state', () => {
    const store = useMyStore();
    expect(store.someValue).toBe('default');
  });

  it('should update state correctly', () => {
    const store = useMyStore();
    store.updateValue('new value');
    expect(store.someValue).toBe('new value');
  });
});
```

### Component Tests (Vue)

```typescript
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MyComponent from 'components/MyComponent.vue';

describe('MyComponent', () => {
  it('should render correctly', () => {
    const wrapper = mount(MyComponent, {
      props: {
        title: 'Test Title'
      }
    });
    
    expect(wrapper.text()).toContain('Test Title');
  });

  it('should emit events', async () => {
    const wrapper = mount(MyComponent);
    await wrapper.find('button').trigger('click');
    
    expect(wrapper.emitted('click')).toBeTruthy();
  });
});
```

### Quasar Component Tests

```typescript
import { mount } from '@vue/test-utils';
import { QBtn } from 'quasar';

const wrapper = mount(MyComponent, {
  global: {
    components: {
      QBtn
    }
  }
});
```

## Testing Best Practices

### 1. Store Consolidation Testing
When testing the unified document store:

```typescript
describe('UnifiedDocumentStore', () => {
  it('should maintain single source of truth', () => {
    const store = useUnifiedDocumentStore();
    // Test document operations
  });

  it('should handle multi-document operations', () => {
    const store = useUnifiedDocumentStore();
    // Test file panel operations
  });
});
```

### 2. Async Testing

```typescript
it('should handle async operations', async () => {
  const store = useMyStore();
  await store.fetchData();
  expect(store.data).toBeDefined();
});
```

### 3. Mocking

```typescript
import { vi } from 'vitest';

// Mock a function
const mockFn = vi.fn();

// Mock a module
vi.mock('axios', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: {} }))
  }
}));
```

## Configuration

### vitest.config.ts
Main Vitest configuration with Quasar integration.

### test/vitest.setup.ts
Global test setup including:
- Quasar plugin configuration
- Global mocks (ResizeObserver, IntersectionObserver, etc.)
- Vue Test Utils configuration

## Coverage

Generate coverage reports:

```bash
bun run test:coverage
```

Coverage reports are generated in `coverage/` directory.

## Debugging Tests

### VS Code
Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest Tests",
  "runtimeExecutable": "bun",
  "runtimeArgs": ["run", "test"],
  "console": "integratedTerminal"
}
```

### Browser DevTools
Use the UI mode for debugging:

```bash
bun run test:ui
```

## Performance Tips

1. **Use `describe.concurrent`** for parallel test execution
2. **Mock heavy dependencies** (API calls, large computations)
3. **Use `beforeEach`** to reset state between tests
4. **Keep tests focused** - one assertion per test when possible

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Vue Test Utils](https://test-utils.vuejs.org/)
- [Pinia Testing](https://pinia.vuejs.org/cookbook/testing.html)
- [Bun Documentation](https://bun.sh/docs)

