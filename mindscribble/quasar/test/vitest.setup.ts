import { config } from '@vue/test-utils';
import { Quasar } from 'quasar';
import { vi } from 'vitest';

// Configure Vue Test Utils
config.global.plugins = [Quasar];

// Mock Quasar plugins if needed
config.global.mocks = {
  $q: {
    notify: vi.fn(),
    dialog: vi.fn(),
    loading: {
      show: vi.fn(),
      hide: vi.fn(),
    },
  },
};

// Setup global test utilities
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

