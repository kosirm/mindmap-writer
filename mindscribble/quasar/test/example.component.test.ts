import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';

// Simple test component
const TestComponent = defineComponent({
  name: 'TestComponent',
  template: '<div class="test-component">Hello Vitest!</div>',
});

describe('Example Component Test', () => {
  it('should mount a Vue component', () => {
    const wrapper = mount(TestComponent);
    expect(wrapper.exists()).toBe(true);
  });

  it('should render component content', () => {
    const wrapper = mount(TestComponent);
    expect(wrapper.text()).toContain('Hello Vitest!');
  });

  it('should find elements by class', () => {
    const wrapper = mount(TestComponent);
    expect(wrapper.find('.test-component').exists()).toBe(true);
  });
});

