import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

describe('Example Store Test', () => {
  beforeEach(() => {
    // Create a fresh pinia instance for each test
    setActivePinia(createPinia());
  });

  it('should demonstrate basic test setup', () => {
    expect(true).toBe(true);
  });

  it('should have access to Pinia', () => {
    const pinia = createPinia();
    expect(pinia).toBeDefined();
  });
});

